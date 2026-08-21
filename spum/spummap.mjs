// 게임이 읽는 것은 SPUM 맵 하나다.
//
//   supermarket-map.json    SPUM Studio "Cozy Supermarket" 월드에서 뽑은 맵 —
//                           tilesets[] 에 map-theme 으로 등록된 타일, 레이어는 packed 타일 ID 의 평탄 배열
//   supermarket-theme.png   그 테마의 타일 시트 (16열, 한 칸 32px)
//
// Studio 원본은 40×30 칸인데 실제로 그려진 칸은 가운데 16×16 뿐이었다(CLAUDE.md §3-9) —
// 그래서 이 파일은 그 16×16 을 그대로 잘라낸 버전이다. 원본(안 자른 40×30)은 참고용으로
// 이 이름으로만 남아 있었을 뿐, 이제는 이 파일 자체가 정본이다.

export async function loadSpumMap(base = './') {
  const map = await (await fetch(base + 'supermarket-map.json')).json();
  const theme = map.tilesets.find(t => t.source === 'map-theme');
  if (!theme) throw new Error('맵에 map-theme 타일셋이 없다');

  const sheet = new Image();
  sheet.src = base + (map.meta?.themeSheet || 'supermarket-theme.png');
  await sheet.decode();

  const W = map.width, H = map.height, TS = map.tileSize;
  const layer = t => map.layers.find(l => l.type === t)?.data || new Array(W * H).fill(0);
  const back = layer('back'), front = layer('front'), obstacle = layer('obstacle');

  // 방 이름은 objects[] 의 사각형 주석에서 온다 (SPUM 에서 objects 는 주석 자리다).
  // Studio 에서 만든 맵은 이 주석이 1×1 점으로만 남는 일이 많다 — 그러면 방이 한 칸밖에 안 된다.
  // 그래서 **걸을 수 있는 칸을 가장 가까운 이름표에 나눠 준다** (다중 시작점 너비우선).
  const rooms = new Array(W * H).fill(null);
  const zones = [];
  (map.objects || []).filter(o => o.tags?.includes('room')).forEach(o => {
    const r = o.rect;
    zones.push({ name: o.name, x: r.col, y: r.row });
    for (let j = 0; j < r.height; j++) for (let i = 0; i < r.width; i++) {
      const x = r.col + i, y = r.row + j;
      if (x >= 0 && y >= 0 && x < W && y < H) rooms[y * W + x] = o.name;
    }
  });
  {
    const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !obstacle[y * W + x];
    let q = [];
    zones.forEach(z => {
      // 이름표가 막힌 칸에 찍혀 있으면 가장 가까운 빈 칸에서 퍼뜨린다
      let seed = free(z.x, z.y) ? [z.x, z.y] : null;
      for (let r = 1; !seed && r <= 6; r++)
        for (let dy = -r; dy <= r && !seed; dy++) for (let dx = -r; dx <= r && !seed; dx++)
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(z.x + dx, z.y + dy)) seed = [z.x + dx, z.y + dy];
      if (seed) { rooms[seed[1] * W + seed[0]] = z.name; q.push([seed[0], seed[1], z.name]); }
    });
    for (let head = 0; head < q.length; head++) {
      const [x, y, name] = q[head];
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy;
        if (!free(nx, ny) || rooms[ny * W + nx]) continue;
        rooms[ny * W + nx] = name; q.push([nx, ny, name]);
      }
    }
  }

  // 막힌 칸(가구·벽) 바로 아래 걸을 수 있는 바닥에 옅은 반타원 그림자를 깐다.
  // 벽처럼 두 칸 이상 이어진 자리는 건너뛴다 — 벽 그림자는 오히려 얼룩져 보인다.
  function drawContactShadows(g) {
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
      if (!obstacle[y * W + x]) continue;
      const sy = y + 1;
      if (obstacle[sy * W + x]) continue;          // 아래도 막혀 있으면(벽) 스킵
      const cx = x * TS + TS / 2, topY = sy * TS;
      const rx = TS * 0.5, ry = TS * 0.22;
      const grad = g.createRadialGradient(cx, topY + ry * 0.7, 1, cx, topY + ry * 0.7, rx);
      grad.addColorStop(0, 'rgba(24,17,10,0.30)');
      grad.addColorStop(1, 'rgba(24,17,10,0)');
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(cx, topY + ry * 0.7, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
  }

  const spawns = map.spawnPoints || [];
  const tagged = tag => spawns.filter(s => s.tags?.includes(tag));

  // packed 타일 ID → 시트에서 잘라낼 자리
  const cellOf = id => {
    if (!id) return null;
    const p = theme.tileProperties[String(id)];
    if (p?.sourceCell) return { cx: p.sourceCell.column - 1, cy: p.sourceCell.row - 1 };
    const i = id - theme.tileIdBase;                    // 속성이 없으면 번호로 계산한다
    return i >= 0 ? { cx: i % theme.columns, cy: Math.floor(i / theme.columns) } : null;
  };

  const api = {
    map, theme, sheet, W, H, TS,
    back, front, obstacle,
    tileAt: (x, y) => back[y * W + x],
    propsOf: (x, y) => theme.tileProperties[String(back[y * W + x])] || null,
    roomAt: (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : rooms[y * W + x],
    walkable: (x, y) => x >= 0 && y >= 0 && x < W && y < H && !obstacle[y * W + x],
    labels: tagged('label').length ? tagged('label').map(s => ({ name: s.name, x: s.x, y: s.y })) : zones,
    zones,
    landmarks: tagged('landmark').map(s => ({ name: s.name, x: s.x, y: s.y, desc: s.description || '' })),
    actors: Object.fromEntries(tagged('actor').map(s => [s.name, { x: s.x, y: s.y, room: s.tags.find(t => t !== 'actor') }])),

    // 집 한 채를 한 번만 그려 둔다 — 타일 시트에서 그대로 오려 붙인다.
    // back  = 바닥·벽·가구 (캐릭터보다 아래)
    // front = 나무 우듬지·차양 (캐릭터보다 **위**) — 깊이감이 여기서 나온다
    bakeLayer(which) {
      const data = which === 'front' ? front : back;
      const cv = document.createElement('canvas');
      cv.width = W * TS; cv.height = H * TS;
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = cellOf(data[y * W + x]); if (!c) continue;
        g.drawImage(sheet, c.cx * TS, c.cy * TS, TS, TS, x * TS, y * TS, TS, TS);
      }
      // 가구는 SPUM 이 접지 그림자 없이 굽는다 — 평면으로 붕 떠 보이는 가장 큰 원인이다.
      // 새 타일을 더 만들지 않고, 막힌 칸(obstacle) 바로 아래 바닥에 옅은 그림자를 얹어
      // "가구가 바닥에 닿아 있다"는 느낌만 되살린다.
      if (which === 'back') drawContactShadows(g);
      return cv;
    },
    bake() { return api.bakeLayer('back'); },
    bakeFront() { return api.bakeLayer('front'); },
  };
  return api;
}
