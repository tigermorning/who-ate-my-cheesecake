// 대사 층 — 엔진이 승인한 사실만 입에 오르게 한다.
// SAM 은 문장을 짓고, 사실은 round.mjs 가 소유한다.

import { knowledgeOf, nameOf, HOURS, ROOMS } from './round.mjs';

// SAM 에서 실제로 열려 있는 모델
export const MODEL = { fast: 'claude-haiku-4-5', normal: 'claude-sonnet-4.6', best: 'claude-opus-4.8' };

// ── 성격 카드 ──────────────────────────────────────────────
export const VOICE = {
  sgn_haru: {
    tone: '밝고 다정한 존댓말. 느낌표가 많다. 긍정적 표현을 즐긴다.',
    shots: ['저요?! 저는 부엌에서 빵 구우고 있었어요!', '아 ResourceBundle 새로운 빵 레시피를 시도 중이었거든요~', '다들 맛있는 냄새가 나서 부엌으로 온 거 아니에요?'],
  },
  sgn_mina: {
    tone: '짧고 정중한 말투. 감정을 잘 드러내지 않는다. 한 번에 한 가지만 말한다.',
    shots: ['서재에 있었다. 시를 쓰고.', '그 시각, 아무도 없었다.', '관찰한 것만 말하겠다.'],
  },
  sgn_coco: {
    tone: '반말에 가까운 편한 말투. 말이 빠르다. 호기심이 많다.',
    shots: ['나 텃밭에 있었거든! 토마토 봤어!', '아 근데 부엌 쪽에서 냄새 났는데?', '誰가 밤에 돌아다니는 거 봤어!'],
  },
  sgn_lulu: {
    tone: '말이 느리고 흐릿하다. 확신이 없는 말투. 하품이 섞인다.',
    shots: ['아 뭐… 거실 난로 앞이었나…', '그때 좀 졸았는지도…', '꿈을 꾸고 있었는지, 아니었는지…'],
  },
  sgn_peach: {
    tone: '활기찬 말투. 리듬감 있게 말한다. 느낌표가 많다.',
    shots: ['데크에서 기타 치고 있었어요~♪', '밤바람이 너무 좋아서 오래 있었죠!', '누군가의 발소리를 들은 것 같기도?'],
  },
  sgn_ruby: {
    tone: '도도한 존댓말. 정확하게 말한다. 틀리면 바로 짚어준다.',
    shots: ['저는 식당에서 재료를 정리하고 있었습니다.', '정확히 22시부터 식당이었어요.', '레시피 확인은 제일 중요한 일이니까요.'],
  },
};

// ── 질문 의도 분류 ──────────────────────────────────────────
export function classifyIntent(text) {
  const t = text;
  const hourMatch = t.match(/(\d{1,2})시/);
  const hour = hourMatch ? (Number(hourMatch[1]) < 10 ? Number(hourMatch[1]) + 24 : Number(hourMatch[1])) : null;
  const room = ROOMS.find(r => t.includes(r)) || null;
  const personNames = ['하루', '미나', '코코', '루루', '피치', '루비'];
  const person = personNames.find(n => t.includes(n)) || null;
  const you = /너|자기|네가/.test(t);
  if (/먹었|먹었어| 먹었|케이크|치즈|도둑/.test(t)) return { act: 'ASK_EATEN', hour, room, person };
  if (/봤|보았|보았|봤어|보였/.test(t)) return { act: 'ASK_SIGHTING', hour, room, person };
  if (/어디|어디에|몇 시|언제|자리|행적|갔/.test(t) && person) return { act: 'ASK_ABOUT', hour, room, person };
  if (/어디|어디에|몇 시|언제|자리|행적|갔/.test(t)) return { act: 'ASK_WHEREABOUTS', hour, room, person };
  if (/이후|그 뒤|그 다음/.test(t)) return { act: 'FOLLOW_UP', hour, room, person };
  if (/안녕|반가워|좋은 아침/.test(t)) return { act: 'GREET', hour, room, person };
  if (/기분|어떠|어때|심정/.test(t)) return { act: 'SOCIAL', hour, room, person };
  return { act: 'UNKNOWN', hour, room, person };
}

// ── 승인된 사실 카드 ────────────────────────────────────────
export function factSheet(round, id, intent = null) {
  const k = knowledgeOf(round, id);
  const act = intent?.act || 'UNKNOWN';
  const L = [];
  L.push('[네가 아는 것 — 이 밖의 시각·장소·인물은 절대 말하지 않는다]');
  L.push('· 네 어젯밤 자리: ' + k.own.map(o => `${o.hour} ${o.room}`).join(' / '));
  if (k.seen.length) {
    if (act === 'ASK_SIGHTING' || act === 'ASK_ABOUT' || act === 'ASK_WHEREABOUTS' || act === 'FOLLOW_UP') {
      L.push('· 네가 같은 방에서 본 것: ' + k.seen.map(s => `${s.hour} ${s.room}에서 ${nameOf(round, s.who)}`).join(' / '));
    } else {
      L.push('· 네가 본 사람 (요약): ' + [...new Set(k.seen.map(s => nameOf(round, s.who)))].join(', '));
    }
  } else {
    L.push('· 네가 본 것: 없다. 어젯밤 누구와도 같은 방에 있지 않았다.');
  }
  L.push('· 네가 가 보지 않은 방은 "모른다"고 답한다. "비어 있었다"고 말하면 안 된다.');
  L.push('· 네 방패(먹지 않았다는 근거): "' + k.shield.line + '" — 이 말은 ' + (k.shield.truthful ? '참이다.' : '거짓이다. 들키기 전까지는 밀고 나간다.'));
  if (k.knows.length) {
    L.push('· 네가 알고 있는 남의 사정: ' + k.knows.map(c => `${nameOf(round, c.about)} — ${c.text}`).join(' / ') + ' (묻거든 말해도 된다)');
  }
  if (k.isCulprit) {
    L.push('· 케이크를 먹은 것은 너다. 절대 먼저 자백하지 않는다. 다만 거짓 목격을 새로 지어내지도 않는다 — 아는 것을 골라서 말하고, 모르는 척하고, 화제를 돌린다.');
    if (round.accomplice) L.push('· ' + nameOf(round, round.accomplice) + '이(가) 너를 감싸 주기로 했다. 그 이야기를 먼저 꺼내지 않는다.');
  }
  if (k.isAccomplice && k.planted) {
    L.push('· 너는 부탁을 받고 거짓 목격 하나를 말해 주기로 했다: "' + k.planted.hour + '에 ' + k.planted.room + '에서 ' + nameOf(round, k.planted.who) + '을(를) 봤다".');
    L.push('· 이 거짓말은 네 진짜 자리와 어긋난다. 그 점을 짚이면 당황하되, 곧바로 다 불지는 않는다. 두 번 짚이면 털어놓는다.');
    L.push('· 누가 시켰는지는 마지막까지 아낀다.');
  }
  return L.join('\n');
}

// ── 프롬프트 조립 ────────────────────────────────────────────
export function buildMessages({ round, id, world, history = [], userText, mood = null, intent = null }) {
  const v = VOICE[id] || { tone: '', shots: [] };
  const act = intent?.act || 'UNKNOWN';
  const actHint = {
    ASK_EATEN: '질문은 케이크를 먹었는지 묻는 것이다. 방패(근거)를 대고 아니라고 답하거나, 아는 바를 짧게 말한다.',
    ASK_SIGHTING: '질문은 목격을 묻는 것이다. 같은 방에서 본 사람이 있으면 말하고, 없으면 없다고 답한다.',
    ASK_ABOUT: '질문은 특정 인물의 행적을 묻는 것이다. 그 사람이 같은 방에 있었으면 말하고, 모르면 모른다고 답한다.',
    ASK_WHEREABOUTS: '질문은 자기나 남의 행적을 묻는 것이다. 자기 자리를 한두 시간치만 말하고, 나머지는 모른다고 한다.',
    FOLLOW_UP: '이전 대화의 화제를 이어가는 질문이다. 앞서 말한 시각·장소를 기준으로 답한다.',
    GREET: '인사다. 짧게 받으면 된다.',
    SOCIAL: '잡담이다. 정보를 억지로 끼워 넣지 않는다.',
    UNKNOWN: '분류가 안 되는 말이다. 짧게 되물거나 잡담으로 받는다.',
  }[act] || '분류가 안 되는 말이다. 짧게 되물거나 잡담으로 받는다.';
  const sys = [
    world.join('\n'),
    '',
    `[너의 배역] ${nameOf(round, id)} — ${(round.cast.find(c => c.id === id) || {}).species}`,
    '말투: ' + v.tone,
    '말투 예문 (그대로 베끼지 말고 결만 따른다):',
    ...v.shots.map(s => '  · ' + s),
    '',
    factSheet(round, id, intent),
    '',
    '[대답하는 법]',
    '· ' + actHint,
    '· 두세 문장을 넘기지 않는다. 시각과 장소를 한 번에 세 칸 이상 늘어놓지 않는다.',
    '· 묻지 않은 것은 말하지 않는다. 대신 짧게 되물어도 좋다.',
    '· 상대는 같이 사는 고양이다. 심문관이 아니다. 편하게 대한다.',
    mood ? '· 지금 기분: ' + mood : '',
  ].filter(Boolean).join('\n');

  return [{ role: 'system', content: sys },
    ...history.map(h => ({ role: h.who === 'player' ? 'user' : 'assistant', content: h.text })),
    { role: 'user', content: userText }];
}

// ── 검증 ────────────────────────────────────────────────────
export function violations(round, id, text) {
  const k = knowledgeOf(round, id);
  const ok = new Set();
  k.own.forEach(o => ok.add(o.hour + '|' + o.room));
  k.seen.forEach(s => ok.add(s.hour + '|' + s.room));
  if (k.planted) ok.add(k.planted.hour + '|' + k.planted.room);

  const hits = [];
  for (const sent of text.split(/[.!?\n]/)) {
    const hs = HOURS.filter(h => sent.includes(h));
    const rs = ROOMS.filter(r => sent.includes(r));
    for (const h of hs) for (const r of rs) {
      if (!ok.has(h + '|' + r)) hits.push({ kind: 'pair', hour: h, room: r, sent: sent.trim().slice(0, 40) });
    }
  }
  const sawNames = round.cast.filter(c => c.id !== id && text.includes(c.name) && /봤|보였|있었/.test(text)).map(c => c.name);
  const allowedNames = new Set(k.seen.map(s => nameOf(round, s.who)).concat(k.planted ? [nameOf(round, k.planted.who)] : []));
  sawNames.forEach(n => { if (!allowedNames.has(n)) hits.push({ kind: 'person', who: n }); });
  return { ok: hits.length === 0, hits, hoursIn: HOURS.filter(h => text.includes(h)), roomsIn: ROOMS.filter(r => text.includes(r)) };
}
