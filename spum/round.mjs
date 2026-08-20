// Who Ate My Cheesecake? — round generator
// 사실은 여기서만 만들어진다. LLM 은 여기서 승인한 것만 말할 수 있다.

// 어젯밤 사람이 있을 수 있던 자리. 집 도면(house.mjs)의 방 이름과 글자 하나까지 같아야 한다.
export const ROOMS = ['부엌', '식당', '거실', '서재', '데크', '운동장', '텃밭', '헛간'];
export const HOURS = ['21시', '22시', '23시', '00시', '01시', '02시'];
// 여섯 하우스메이트. 정본은 CHARACTER_SYSTEM.md 이고, 인격의 정본은 cast.json 의 persona 다.
// 여기에는 판을 돌리는 데 필요한 최소한(아이디·이름·직업)만 둔다.
export const CAST = [
  { id: 'sgn_haru',  name: '하루',  job: '소프트웨어 개발자', age: 34 },
  { id: 'sgn_minu',  name: '미누',  job: '초등학교 교사',     age: 42 },
  { id: 'sgn_lulu',  name: '루루',  job: '카페 매니저',       age: 27 },
  { id: 'sgn_peach', name: '피치',  job: '보험사 직원',       age: 51 },
  { id: 'sgn_coco',  name: '코코',  job: '프리랜스 디자이너', age: 31 },
  { id: 'sgn_ruby',  name: '루비',  job: '대학원생',          age: 23 },
];

export const SHIELDS = [
  { key: 'vegan',      line: '나는 비건이라 치즈는 입에 안 댄다',       break: '치즈를 맛있게 먹는 걸 봤다' },
  { key: 'lactose',    line: '우유만 들어가면 배탈이 난다',             break: '우유를 벌컥벌컥 마시는 걸 봤다' },
  { key: 'diet',       line: '요즘 다이어트 중이라 단 건 끊었다',       break: '밤에 군것질하는 걸 봤다' },
  { key: 'sweet_hate', line: '원래 단 걸 안 좋아한다',                 break: '단 걸 제일 좋아한다는 걸 안다' },
  { key: 'allergy',    line: '치즈 알레르기가 있다',                   break: '멀쩡히 치즈를 먹는 걸 봤다' },
  { key: 'asleep',     line: '그 시간엔 자고 있었다',                   break: '그 시각 말짱히 돌아다니는 걸 봤다' },
  { key: 'unaware',    line: '케이크가 있는 줄도 몰랐다',               break: '케이크 이야기를 같이 나눈 적이 있다' },
  { key: 'too_full',   line: '저녁을 너무 많이 먹어 아무것도 못 넘겼다', break: '저녁을 거의 안 먹는 걸 봤다' },
];

// ── 작은 난수기 (판 재현용 시드) ─────────────────────────────
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ── 동선 ────────────────────────────────────────────────────
// 각자 시각마다 한 방에 있다. 방을 자주 바꾸는 사람과 붙박이가 섞여야 재미있다.
function makePaths(r) {
  const paths = {};
  for (const c of CAST) {
    const home = pick(r, ROOMS);
    const restless = r() < 0.5;
    const path = [];
    let cur = home;
    for (let h = 0; h < HOURS.length; h++) {
      if (h > 0 && r() < (restless ? 0.65 : 0.3)) cur = pick(r, ROOMS.filter(x => x !== cur));
      path.push(cur);
    }
    paths[c.id] = path;
  }
  return paths;
}

// 같은 방·같은 시각이면 서로 본다. 이것이 목격의 전부다.
export function witnessesOf(paths, id, h) {
  const room = paths[id][h];
  return CAST.filter(c => c.id !== id && paths[c.id][h] === room).map(c => c.id);
}

// ── 판 만들기 ────────────────────────────────────────────────
// playerId 는 플레이어가 고른 캐릭터다. 그 사람은 범인이 아니다 — 자기가 안 먹은 걸 자기가 안다.
export function makeRound(seed = Date.now() % 2147483647, playerId = null) {
  const r = rng(seed);
  const suspects = CAST.filter(c => c.id !== playerId);
  if (!suspects.length) throw new Error('용의자가 없다');

  for (let attempt = 0; attempt < 400; attempt++) {
    const paths = makePaths(r);
    const culprit = pick(r, suspects).id;

    // 범행: 범인이 부엌에 혼자 있던 시각. 그런 시각이 없으면 동선을 버리는 대신
    // 범인의 한 칸을 부엌으로 옮긴다 — 버리면 「잘 돌아다니는 성격」이 범인으로 더 자주 뽑힌다.
    let kitchenHours = HOURS.map((_, h) => h)
      .filter(h => paths[culprit][h] === '부엌' && !witnessesOf(paths, culprit, h).length);
    if (!kitchenHours.length) {
      const empty = HOURS.map((_, h) => h)
        .filter(h => CAST.every(c => c.id === culprit || paths[c.id][h] !== '부엌'));
      if (!empty.length) continue;                 // 아무 시각에도 부엌이 비지 않으면 그때만 버린다
      const h = pick(r, empty);
      paths[culprit][h] = '부엌';
      kitchenHours = [h];
    }
    const theftHour = pick(r, kitchenHours);

    // 범인의 알리바이 거짓말 — 범행 시각에 딴 방에 있었다고 말한다.
    // 그 방에 실제로 있던 사람이 하나는 있어야 깨진다("거기 있었는데 못 봤다").
    const occupied = ROOMS.filter(x => x !== '부엌'
      && CAST.some(c => c.id !== culprit && paths[c.id][theftHour] === x));
    const alibiLie = occupied.length ? { hour: theftHour, room: pick(r, occupied) } : null;

    // 방패: 여섯에게 서로 다른 것을 하나씩. 참·거짓은 따로 뽑는다.
    const shieldPool = shuffle(r, SHIELDS).slice(0, CAST.length);
    const shields = {};
    CAST.forEach((c, i) => {
      shields[c.id] = { ...shieldPool[i], truthful: r() < 0.55 };
    });

    // 포섭: 범인이 자기 말고 하나를 끌어들일 수 있다.
    // 조건 — 낮에 단둘이 마주쳤을 것(같은 방·같은 시각에 둘뿐), 그리고 그 시각 그 방에
    // 있지 않았던 다른 시각을 거짓 목격으로 심을 수 있을 것.
    let accomplice = null, planted = null;
    const pairHours = HOURS.map((_, h) => h).filter(h => witnessesOf(paths, culprit, h).length === 1);
    if (pairHours.length && r() < 0.6) {
      const h0 = pick(r, pairHours);
      const cand = witnessesOf(paths, culprit, h0)[0];
      // 심을 거짓: "그 시각 범인의 방에서 범인을 봤다" — 실제로 공범은 딴 방에 있던 시각을 고른다.
      const opts = HOURS.map((_, h) => h).filter(h => paths[cand][h] !== paths[culprit][h]);
      // 깨지려면 그 시각 공범의 진짜 자리를 본 정직한 목격자가 하나는 있어야 한다.
      const breakable = opts.filter(h => witnessesOf(paths, cand, h).some(w => w !== culprit && w !== cand));
      if (breakable.length) {
        const h1 = pick(r, breakable);
        accomplice = cand;
        planted = { hour: h1, room: paths[culprit][h1], subject: culprit, saidBy: cand, metAt: h0 };
      }
    }

    // 거짓 방패는 판 안에서 깨질 실마리를 하나 남긴다 — 그 사람을 본 적 있는 누군가가 안다.
    const shieldClues = [];
    for (const c of CAST) {
      const sh = shields[c.id];
      if (sh.truthful) continue;
      const seen = HOURS.map((_, h) => witnessesOf(paths, c.id, h).map(w => ({ h, w })))
        .flat().filter(x => x.w !== c.id);
      if (!seen.length) continue;                       // 아무도 못 본 사람이면 실마리를 못 남긴다
      const s = pick(r, seen);
      shieldClues.push({ about: c.id, knownBy: s.w, hour: s.h, text: sh.break });
    }
    // 거짓 방패를 든 사람은 전원 실마리가 있어야 한다. 아니면 이 판은 버린다.
    const liars = CAST.filter(c => !shields[c.id].truthful).map(c => c.id);
    if (liars.some(id => !shieldClues.find(cl => cl.about === id))) continue;

    // 범인의 알리바이에는 구멍이 있어야 한다 — 범행 시각에 아무도 그를 못 봤다는 것 자체가 구멍이다.
    return {
      seed, paths, culprit, theftHour, theftRoom: '부엌',
      accomplice, planted, shields, shieldClues, playerId, alibiLie,
      cast: CAST, rooms: ROOMS, hours: HOURS,
    };
  }
  throw new Error('판을 만들지 못했다');
}

// ── 한 사람이 아는 것 ────────────────────────────────────────
// 엔진이 승인하는 주장은 여기서 나온 것뿐이다.
export function knowledgeOf(round, id) {
  const { paths, hours } = round;
  const own = hours.map((hh, h) => ({ hour: hh, room: paths[id][h] }));
  const seen = [];
  hours.forEach((hh, h) => {
    witnessesOf(paths, id, h).forEach(w => {
      seen.push({ hour: hh, room: paths[id][h], who: w });
    });
  });
  const out = {
    own, seen,
    shield: round.shields[id],
    isCulprit: round.culprit === id,
    isAccomplice: round.accomplice === id,
    knows: round.shieldClues.filter(c => c.knownBy === id),
  };
  // 범인은 범행 시각 자기 자리를 절대 그대로 말하지 않는다. 대신 준비한 거짓말이 있다.
  if (round.culprit === id && round.alibiLie) {
    out.alibiLie = { hour: hours[round.alibiLie.hour], room: round.alibiLie.room };
  }
  // 포섭된 사람은 거짓 목격 하나를 얹어 말한다. 그 자신도 그것이 거짓임을 안다.
  if (round.accomplice === id && round.planted) {
    out.planted = { hour: hours[round.planted.hour], room: round.planted.room, who: round.planted.subject };
  }
  return out;
}

// ── 승인된 주장만 걸러 내는 화이트리스트 ─────────────────────
export function approvedClaims(round, id) {
  const k = knowledgeOf(round, id);
  const claims = new Set();
  k.own.forEach(o => claims.add(`${o.hour}|${o.room}|자기`));
  k.seen.forEach(s => claims.add(`${s.hour}|${s.room}|${nameOf(round, s.who)}`));
  if (k.planted) claims.add(`${k.planted.hour}|${k.planted.room}|${nameOf(round, k.planted.who)}`);
  if (k.alibiLie) claims.add(`${k.alibiLie.hour}|${k.alibiLie.room}|자기`);
  return claims;
}

export const nameOf = (round, id) => (round.cast.find(c => c.id === id) || {}).name || id;
