// memory.mjs — NPC 의 사건 기억과 입소문
//
// 사실의 주인은 여전히 round.mjs 다. 여기는 「누가 무엇을 언제부터 알게 됐는가」만 다룬다.
// 기억은 세 갈래로 늘어난다:
//   ① 판이 시작될 때 심어지는 것 — 자기 자리, 자기가 본 것, 남의 사정
//   ② 마주쳐서 전해 듣는 것 — 출처가 붙는다 (`루비한테 들었는데…`)
//   ③ 플레이어가 물어서 생기는 것 — "누가 무엇을 캐고 다닌다"

import { knowledgeOf, nameOf } from './round.mjs';

export const CAP = 48;              // 한 사람이 들고 다니는 기억의 상한
let seq = 0;

// ── 기억 한 조각을 가리키는 열쇠 ────────────────────────────
// 같은 내용은 출처만 늘리고 조각을 새로 만들지 않는다.
export function keyOf(e) {
  switch (e.k) {
    case 'own':     return `own|${e.hour}|${e.room}`;
    case 'lie':     return `lie|${e.hour}|${e.room}`;
    case 'seen':    return `seen|${e.hour}|${e.room}|${e.who}`;
    case 'planted': return `seen|${e.hour}|${e.room}|${e.who}`;   // 심어진 목격도 모양은 목격이다
    case 'place':   return `place|${e.hour}|${e.room}|${e.who}`;  // 남의 자리에 대한 전언
    case 'clue':    return `clue|${e.about}|${e.text}`;
    case 'asked':   return `asked|${e.who}|${e.topic}`;
    default:        return `${e.k}|${e.hour || ''}|${e.room || ''}|${e.who || ''}|${e.text || ''}`;
  }
}

// 동네 사람용 — 그날 밤 집에 없었으니 심어 줄 씨앗이 없다. 오직 마주쳐서 전해 듣는 것만 쌓인다.
export function createBlankMemory(id) {
  return { id, items: [], byKey: new Map() };
}

export function createMemory(round, id) {
  const mem = { id, items: [], byKey: new Map() };
  const k = knowledgeOf(round, id);
  k.own.forEach(o => remember(mem, { k: 'own', hour: o.hour, room: o.room, who: id }));
  k.seen.forEach(s => remember(mem, { k: 'seen', hour: s.hour, room: s.room, who: s.who }));
  k.knows.forEach(c => remember(mem, { k: 'clue', about: c.about, text: c.text }));
  if (k.planted) remember(mem, { k: 'planted', hour: k.planted.hour, room: k.planted.room, who: k.planted.who });
  if (k.alibiLie) remember(mem, { k: 'lie', hour: k.alibiLie.hour, room: k.alibiLie.room, who: id });
  mem.items.forEach(e => { e.seeded = true; });
  return mem;
}

// 새 조각이면 그 조각을, 이미 아는 것이면 null 을 준다 (출처만 합친다).
export function remember(mem, e) {
  const key = keyOf(e);
  const had = mem.byKey.get(key);
  if (had) {
    (e.from || []).forEach(f => { if (!had.from.includes(f)) had.from.push(f); });
    return null;
  }
  const item = { ...e, from: [...(e.from || [])], at: seq++ };
  mem.byKey.set(key, item);
  mem.items.push(item);
  if (mem.items.length > CAP) {                 // 넘치면 씨앗이 아닌 것부터 오래된 순으로 버린다
    const victim = mem.items.find(x => !x.seeded) || mem.items[0];
    mem.items.splice(mem.items.indexOf(victim), 1);
    mem.byKey.delete(keyOf(victim));
  }
  return item;
}

// ── 남에게 옮길 수 있는 것 ──────────────────────────────────
// 범인은 범행 시각 자기 자리를 절대 흘리지 않는다. 대신 준비한 거짓말을 민다.
export function shareables(round, mem) {
  const isCulprit = round.culprit === mem.id;
  const theftHour = round.hours[round.theftHour];
  return mem.items.filter(e => {
    if (isCulprit && e.k === 'own' && e.hour === theftHour) return false;
    if (!isCulprit && e.k === 'lie') return false;
    return ['own', 'seen', 'planted', 'place', 'clue', 'asked', 'lie'].includes(e.k);
  });
}

// 내 조각을 남의 기억에 넣을 모양으로 바꾼다. 출처가 붙는다.
export function toHeard(round, e, fromId) {
  const from = [nameOf(round, fromId)];
  switch (e.k) {
    case 'own':
    case 'lie':     return { k: 'place', hour: e.hour, room: e.room, who: fromId, from };
    case 'seen':
    case 'planted': return { k: 'place', hour: e.hour, room: e.room, who: e.who, from };
    case 'place':   return { k: 'place', hour: e.hour, room: e.room, who: e.who, from };
    case 'clue':    return { k: 'clue', about: e.about, text: e.text, from };
    case 'asked':   return { k: 'asked', who: e.who, topic: e.topic, from };
    default:        return null;
  }
}

// ── 한 번의 귓속말 ──────────────────────────────────────────
// A 가 B 에게 B 가 모르는 것 하나를 넘긴다. 넘길 게 없으면 null.
export function gossipOnce(round, memFrom, memTo, rand = Math.random) {
  const pool = shareables(round, memFrom)
    .map(src => ({ src, e: toHeard(round, src, memFrom.id) }))
    .filter(x => x.e)
    .filter(({ e }) => {
      const had = memTo.byKey.get(keyOf(e));
      if (!had) return true;
      return !had.from.includes(e.from[0]);       // 이미 아는 것이라도 출처가 새로우면 값이 있다
    })
    .filter(({ e }) => !(e.k === 'place' && e.who === memTo.id))   // 본인 얘기를 본인에게 옮기지 않는다
    .filter(({ e }) => !(e.k === 'clue' && e.about === memTo.id))
    .filter(({ e }) => !(e.k === 'asked' && e.who === memTo.id));
  if (!pool.length) return null;
  const { src, e: entry } = pool[Math.floor(rand() * pool.length)];
  const added = remember(memTo, entry);
  return { fromId: memFrom.id, toId: memTo.id, entry, src, fresh: !!added, text: describe(round, entry) };
}

// 플레이어가 뭘 묻고 다니는지도 기억에 남는다.
export function noteAsked(round, mem, topic) {
  if (!topic) return null;
  return remember(mem, { k: 'asked', who: '__player', topic });
}

// ── 말로 옮기기 ─────────────────────────────────────────────
// 플레이어는 여섯 중 하나다. 이름은 판마다 달라지니 round 에서 꺼내 쓴다.
export const playerName = round => (round.playerId ? nameOf(round, round.playerId) : '누군가');

export function describe(round, e, speakerId = null) {
  const who = e.who === '__player' ? playerName(round) : (e.who ? nameOf(round, e.who) : '');
  switch (e.k) {
    case 'own':     return `${e.hour}엔 ${e.room}에 있었다`;
    case 'lie':     return `${e.hour}엔 ${e.room}에 있었다`;
    case 'seen':    return `${e.hour}에 ${e.room}에서 ${who}를 봤다`;
    case 'planted': return `${e.hour}에 ${e.room}에서 ${who}를 봤다`;
    case 'place':   return `${who}가 ${e.hour}에 ${e.room}에 있었다더라`;
    case 'clue':    return `${nameOf(round, e.about)} — ${e.text}`;
    case 'asked':   return `${who}가 "${e.topic}"를 캐고 다닌다`;
    default:        return e.text || '';
  }
}

// 소문 말풍선 한 줄 — 말하는 사람의 입으로 쓴다.
// 직접 본 것과 전해 들은 것은 문장부터 다르다. 이 구분이 게임의 뼈대다.
export function gossipLine(round, g) {
  const e = g.src || g.entry;
  const who = e.who === '__player' ? playerName(round) : (e.who ? nameOf(round, e.who) : '');
  switch (e.k) {
    case 'own':
    case 'lie':     return `나 ${e.hour}엔 ${e.room}에 있었어.`;
    case 'seen':
    case 'planted': return `${e.hour}에 ${e.room}에서 ${who} 봤어.`;
    case 'place':   return e.from[0] === who
                      ? `${who}는 ${e.hour}엔 ${e.room}에 있었대.`
                      : `${e.from[0]} 말로는, ${who}가 ${e.hour}에 ${e.room}에 있었대.`;
    case 'clue':    return (e.from.length ? `${e.from[0]} 말로는, ` : '')
                           + `${nameOf(round, e.about)} 말이야 — ${e.text}.`;
    case 'asked':   return `${playerName(round)}가 ${e.topic} 캐고 다니더라.`;
    default:        return describe(round, e);
  }
}

// ── 프롬프트에 얹을 줄 ──────────────────────────────────────
// 전해 들은 것은 반드시 출처를 밝히게 한다. 이게 「자연스러운 정보 공유」의 핵심이다.
export function factLines(round, mem) {
  if (!mem) return [];
  const L = [];
  const heardPlaces = mem.items.filter(e => e.k === 'place');
  const heardClues = mem.items.filter(e => e.k === 'clue' && e.from.length);
  const asked = mem.items.filter(e => e.k === 'asked');
  if (heardPlaces.length) {
    L.push('· 남에게 전해 들은 자리 (말할 때 반드시 "누구한테 들었는데"를 붙인다):');
    heardPlaces.slice(-6).forEach(e => {
      const subject = nameOf(round, e.who);
      L.push(e.from.length === 1 && e.from[0] === subject
        ? `   - ${subject} 본인이 ${e.hour}엔 ${e.room}에 있었다고 했다`
        : `   - ${e.from.join('·')} 말로는, ${subject}가 ${e.hour}에 ${e.room}에 있었다고 한다`);
    });
    L.push('   ※ 전해 들은 것은 네가 본 것이 아니다. "봤다"고 말하면 안 된다.');
  }
  if (heardClues.length) {
    L.push('· 전해 들은 남의 사정: ' + heardClues.slice(-4)
      .map(e => `${nameOf(round, e.about)} — ${e.text} (${e.from.join('·')}한테 들음)`).join(' / '));
  }
  if (asked.length) {
    L.push('· 집 안에 도는 이야기: ' + playerName(round) + '가 ' + [...new Set(asked.map(e => `"${e.topic}"`))].slice(-3).join(', ')
      + ' 를(을) 캐고 다닌다. 물어보면 그런 얘기를 들었다고 해도 된다.');
  }
  return L;
}

// ── 검증에 쓸 화이트리스트 ──────────────────────────────────
// 전해 들은 시각·장소·사람도 입에 올릴 수 있어야 한다. 단 출처를 달아야 한다.
export function heardPairs(mem) {
  const pairs = new Set(), names = new Set();
  if (!mem) return { pairs, names };
  mem.items.forEach(e => {
    if (e.k === 'place' || e.k === 'lie') { pairs.add(e.hour + '|' + e.room); }
  });
  return { pairs, names };
}

export function heardNames(round, mem) {
  const out = new Set();
  if (!mem) return out;
  mem.items.forEach(e => { if (e.k === 'place' && e.who && e.who !== '__player') out.add(nameOf(round, e.who)); });
  return out;
}

export const memorySize = mem => (mem ? mem.items.length : 0);
export const heardCount = mem => (mem ? mem.items.filter(e => e.from && e.from.length).length : 0);
