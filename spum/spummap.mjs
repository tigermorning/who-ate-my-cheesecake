// 게임이 읽는 것은 SPUM 맵 하나다.
//
//   house-map.json    SPUM Studio 맵 — tilesets[] 에 map-theme 으로 등록된 타일,
//                     레이어는 packed 타일 ID 의 평탄 배열
//   house-theme.png   그 테마의 타일 시트 (16열, 한 칸 32px)
//
// 도면(house.mjs)은 이 두 개를 만들 때만 쓰인다. 화면은 도면을 모른다.

export async function loadSpumMap(base = './') {
  const map = await (await fetch(base + 'house-map.json')).json();
  const theme = map.tilesets.find(t => t.source === 'map-theme');
  if (!theme) throw new Error('맵에 map-theme 타일셋이 없다');

  const sheet = new Image();
  sheet.src = base + (map.meta?.themeSheet || 'house-theme.png');
  await sheet.decode();

  const W = map.width, H = map.height, TS = map.tileSize;
  const layer = t => map.layers.find(l => l.type === t)?.data || new Array(W * H).fill(0);
  const back = layer('back'), front = layer('front'), obstacle = layer('obstacle');

  // 방 이름은 objects[] 의 사각형 주석에서 온다 (SPUM 에서 objects 는 주석 자리다)
  const rooms = new Array(W * H).fill(null);
  (map.objects || []).filter(o => o.tags?.includes('room')).forEach(o => {
    const r = o.rect;
    for (let j = 0; j < r.height; j++) for (let i = 0; i < r.width; i++) {
      const x = r.col + i, y = r.row + j;
      if (x >= 0 && y >= 0 && x < W && y < H) rooms[y * W + x] = o.name;
    }
  });

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
    labels: tagged('label').map(s => ({ name: s.name, x: s.x, y: s.y })),
    landmarks: tagged('landmark').map(s => ({ name: s.name, x: s.x, y: s.y })),
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
      return cv;
    },
    bake() { return api.bakeLayer('back'); },
    bakeFront() { return api.bakeLayer('front'); },
  };
  return api;
}
