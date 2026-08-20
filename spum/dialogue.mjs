// 대사 층 — 엔진이 승인한 사실만 입에 오르게 한다.
// SAM 은 문장을 짓고, 사실은 round.mjs 가 소유한다.

import { knowledgeOf, nameOf, HOURS, ROOMS } from './round.mjs';
import { factLines, heardPairs, heardNames } from './memory.mjs';

// SAM 에서 실제로 열려 있는 모델
export const MODEL = { fast: 'claude-haiku-4-5', normal: 'claude-sonnet-4.6', best: 'claude-opus-4.8' };

// ── 성격 카드 ──────────────────────────────────────────────
// 성격·MBTI·말투·내력의 정본은 **SPUM Cast** (`cast.json` 의 persona) 다.
// 아래 표는 말투 예문(few-shot)만 들고 있다 — Cast 스키마에 없는 값이라 여기 남긴다.
export const VOICE = {
  sgn_haru: {
    tone: '밝고 다정한 존댓말. 느낌표가 많다. 긍정적 표현을 즐긴다.',
    tendency: 'talkative',  // 말이 많다. 이야기를 잘 이어간다.
    shots: [
      '저요?! 저는 부엌에서 빵 구우고 있었어요!',
      '새로운 빵 레시피를 시도 중이었거든요~',
      '다들 맛있는 냄새가 나서 부엌으로 온 거 아니에요?',
      '어젯밤에 특별히 좋은 냄새가 났거든요~ 혹시 다들 느끼셨어요?',
      '빵 굽는 건 정말 좋아요~ 과정이 즐거워서요!',
      '아, 그 시간대에는 부엌에 혼자 있었어요~ 레시피 정리하고 있었지~',
      '다들 너무 의심하지 마요~ 저는 빵만 구웠어요!',
      '치즈케이크는… 아 저도 먹고 싶긴 한데요~',
    ],
  },
  sgn_mina: {
    tone: '짧고 정중한 말투. 감정을 잘 드러내지 않는다. 한 번에 한 가지만 말한다.',
    tendency: 'reserved',  // 과묵. 짧게 대답하고 말을 아낀다.
    shots: [
      '서재에 있었다. 시를 쓰고.',
      '그 시각, 아무도 없었다.',
      '관찰한 것만 말하겠다.',
      '아무도 안 보였다. 조용했다.',
      '그 시간 기억한다. 서재에 혼자 있었다.',
      '남의 일에는 관심 없다. 내 할 일만 했다.',
      '시는 혼자 쓰는 거다.',
      '목격한 건 없다. 보지 않았으면 모른다고 했다.',
    ],
  },
  sgn_coco: {
    tone: '반말에 가까운 편한 말투. 말이 빠르다. 호기심이 많다.',
    tendency: 'talkative',  // 말이 많다. 호기심이 많아 질문도 많이 한다.
    shots: [
      '나 텃밭에 있었거든! 토마토 봤어!',
      '아 근데 부엌 쪽에서 냄새 났는데?',
      '누가 밤에 돌아다니는 거 봤어!',
      '야 너 그 시간에 어디 있었어? 진짜?',
      '텃밭이 제일 좋아~ 밤에도 가끔 나가거든~',
      '아 그건 아닌데~ 나는 그냥 텃밭이었어~',
      '음 의심 가득한 눈으로 보지 마~ 나는 텃밭 하나뿐이야!',
      '동트기 전에 일어나서 텃밭 봤거든~ 새도 봤어!',
    ],
  },
  sgn_lulu: {
    tone: '말이 느리고 흐릿하다. 확신이 없는 말투. 하품이 섞인다.',
    tendency: 'reserved',  // 과묵. 생각이 느리고 말이 적다.
    shots: [
      '아 뭐… 거실 난로 앞이었나…',
      '그때 좀 졸았는지도…',
      '꿈을 꾸고 있었는지, 아니었는지…',
      '어… 거실? 난로 앞에서 잠깐… 뭐 있었던 것 같은…',
      '하암… 밤에는 잠깐 잠들었어… 꿈은 기억 안 나…',
      '아 뭐иль까… 그 시간에는 그냥… 가만히 있었어…',
      '글쎄… 기억이 좀 흐릿해… 미안…',
    ],
  },
  sgn_peach: {
    tone: '활기찬 말투. 리듬감 있게 말한다. 느낌표가 많다.',
    tendency: 'talkative',  // 말이 많다. 음악처럼 리듬감 있게 말한다.
    shots: [
      '데크에서 기타 치고 있었어요~♪',
      '밤바람이 너무 좋아서 오래 있었죠!',
      '누군가의 발소리를 들은 것 같기도?',
      '음악이 밤바람이랑 너무 잘 어울려서~ 오래 있었어요♪',
      '데크에서 기타 치는데~ 누가 지나가는 거 같더라고요~',
      '밤하늘이 너무 예뻐서요~ 혼자 음악 들으며 있었어요!',
      '아~ 그 시간에는 데크에서 기타 연습 중이었어요~',
      '밤에 데크에 갔는데~ 진짜 아무도 없었어요!',
    ],
  },
  sgn_ruby: {
    tone: '도도한 존댓말. 정확하게 말한다. 틀리면 바로 짚어준다.',
    tendency: 'moderate',  // 적당히 말한다. 필요한 것만 정확하게.
    shots: [
      '저는 식당에서 재료를 정리하고 있었습니다.',
      '정확히 22시부터 식당이었어요.',
      '레시피 확인은 제일 중요한 일이니까요.',
      '정확히 기억합니다. 식당에서 재료 정리 중이었어요.',
      '레시피를 검토하고 있었어요. 시간은 정확히 22시부터요.',
      '재료 관리는 매일 하는 일이에요. 어젯밤에도 마찬가지였습니다.',
      '식당에서 빠져나온 적 없어요. 확인해 보셔도 됩니다.',
      '정확하지 않은 정보는 받아들일 수 없습니다.',
    ],
  },
};

// 캐릭터별 대화 성향에 따른 응답 길이 가이드
const RESPONSE_LENGTH_GUIDE = {
  talkative: '두세 문장. 가끔 네 문장까지.',
  moderate: '한두 문장. 필요한 때에만 세 문장.',
  reserved: '한 문장. 꼭 필요한 말만.',
};

// ── 질문 의도 분류 ──────────────────────────────────────────
export function classifyIntent(text) {
  const t = text;
  const hourMatch = t.match(/(\d{1,2})시/);
  const hour = hourMatch ? (Number(hourMatch[1]) < 10 ? Number(hourMatch[1]) + 24 : Number(hourMatch[1])) : null;
  const room = ROOMS.find(r => t.includes(r)) || null;
  const personNames = ['하루', '미나', '코코', '루루', '피치', '루비'];
  const person = personNames.find(n => t.includes(n)) || null;
  const you = /너|자기|네가|니가|당신/.test(t);

  // 케이크 먹었는지 묻는 질문 - 다양한 표현 지원
  if (/먹었|먹었어|먹은|먹은 거|먹은 일|케이크|치즈|도둑|훔쳤|훔친|偷吃|혹시.*먹|혹시.*훔|진짜.*먹|정말.*먹|많이.*먹|㋾.*먹/.test(t))
    return { act: 'ASK_EATEN', hour, room, person };

  // 목격 질문 - 다양한 표현
  if (/봤|보았|보았|봤어|보였|目睹|본|目擊|로 봤|에.*봤|에서.*봤/.test(t))
    return { act: 'ASK_SIGHTING', hour, room, person };

  // 특정 인물의 행적 질문
  if ((/어디|어디에|몇 시|언제|자리|행적|갔|다녀|들어|나와|나간|이동|방문|들어왔|나갔|문제|icom/.test(t)) && person)
    return { act: 'ASK_ABOUT', hour, room, person };

  // 일반적인 행적 질문
  if (/어디|어디에|몇 시|언제|자리|행적|갔|다녀|들어|나와|나간|이동|방문/.test(t))
    return { act: 'ASK_WHEREABOUTS', hour, room, person };

  // 후속 질문
  if (/이후|그 뒤|그 다음|그 후|거기서|그때|다음|이어/.test(t))
    return { act: 'FOLLOW_UP', hour, room, person };

  // 인사
  if (/안녕|반가워|좋은 아침|잘 잤|어이|이봐|야|저기/.test(t))
    return { act: 'GREET', hour, room, person };

  // 감정/기분 질문
  if (/기분|어떠|어때|심정|화났|기뻐|슬퍼|무서|걱정|근심|스트레스|힘들|피곤|졸려|배고|목말|배부/.test(t))
    return { act: 'SOCIAL', hour, room, person };

  return { act: 'UNKNOWN', hour, room, person };
}

// ── 승인된 사실 카드 ────────────────────────────────────────
export function factSheet(round, id, intent = null, mem = null) {
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
  // 살면서 전해 들은 것 — 반드시 출처를 달고 말한다
  factLines(round, mem).forEach(line => L.push(line));
  if (k.isCulprit) {
    if (k.alibiLie) {
      L.push('· 범행 시각(' + k.alibiLie.hour + ') 자기 자리는 절대 사실대로 말하지 않는다. '
        + '그 시각엔 ' + k.alibiLie.room + '에 있었다고 말한다 — 이것이 네가 준비한 거짓말이다.');
      L.push('· 그 방에 정말 있던 사람이 "거기 없었다"고 하면 당황한다. 그래도 한 번은 더 우긴다.');
    }
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
// SPUM Cast persona → 프롬프트 줄. 플레이어에게는 절대 쓰지 않는다.
export function personaLines(persona, fallbackTone = '') {
  if (!persona) return fallbackTone ? ['말투: ' + fallbackTone] : [];
  const L = [];
  const p = [].concat(persona.personality || []).filter(Boolean);
  if (p.length) L.push('성격: ' + p.join(' · '));
  if (persona.mbti) L.push('MBTI: ' + persona.mbti + ' — 이 유형이 할 법한 반응을 고른다');
  const tr = [].concat(persona.traits || []).filter(Boolean);
  if (tr.length) L.push('버릇: ' + tr.join(', '));
  L.push('말투: ' + (persona.speechStyle || fallbackTone));
  if (persona.background) L.push('내력: ' + persona.background);
  return L;
}

// 플레이어 쪽은 「누구인가」만 넘긴다 — 직업과 내력까지.
// 성격 목록·MBTI·말투는 넘기지 않는다. 말은 사람이 직접 치는 것이고 채점 대상이 아니다.
export function playerCardLines(card) {
  if (!card) return [];
  const L = [`[말을 거는 사람] ${card.name}${card.occupation ? ' — ' + card.occupation : ''}. 같이 사는 하우스메이트다.`];
  if (card.background) L.push('· ' + card.background);
  L.push('· 이 사람이 어젯밤 어디 있었는지는 네가 본 만큼만 안다. 본 적 없으면 모른다.');
  L.push('· 이 사람의 직업과 사정을 알고 있으니 그에 맞게 받아라. 말투까지 넘겨짚지는 마라.');
  return L;
}

export function buildMessages({ round, id, world, history = [], userText, mood = null, intent = null, mem = null, persona = null, playerCard = null }) {
  // 플레이어 캐릭터는 AI 가 대신 말하지 않는다 — 인격도 SAM 에 보내지 않는다.
  if (round.playerId && id === round.playerId) throw new Error('플레이어 캐릭터는 SAM 이 대신 말하지 않는다');
  const v = VOICE[id] || { tone: '', shots: [], tendency: 'moderate' };
  const act = intent?.act || 'UNKNOWN';
  const actHint = {
    ASK_EATEN: '질문은 케이크를 먹었는지 묻는 것이다. 방패(근거)를 대고 아니라고 답하거나, 아는 바를 짧게 말한다.',
    ASK_SIGHTING: '질문은 목격을 묻는 것이다. 같은 방에서 본 사람이 있으면 말하고, 없으면 없다고 답한다.',
    ASK_ABOUT: '질문은 특정 인물의 행적을 묻는 것이다. 그 사람이 같은 방에 있었으면 말하고, 모르면 모른다고 답한다.',
    ASK_WHEREABOUTS: '질문은 자기나 남의 행적을 묻는 것이다. 자기 자리를 한두 시간치만 말하고, 나머지는 모른다고 한다.',
    FOLLOW_UP: '이전 대화의 화제를 이어가는 질문이다. 앞서 말한 시각·장소를 기준으로 답한다.',
    GREET: '인사다. 네 성격대로 받고, 하고 싶은 말이 있으면 덧붙여도 된다.',
    SOCIAL: '잡담이다. 사건 정보를 억지로 끼워 넣지 않는다. 사람처럼 대화한다.',
    UNKNOWN: '사건과 무관한 말일 수 있다. 분류하려 들지 말고 네 성격대로 자연스럽게 받아라.',
  }[act] || '사건과 무관한 말일 수 있다. 분류하려 들지 말고 네 성격대로 자연스럽게 받아라.';

  // 최근 대화 맥락 요약 - 문맥 연속성 지원
  const recentHistory = history.slice(-6);
  const contextSummary = recentHistory.length > 0
    ? `[최근 대화 맥락]\n${recentHistory.map(h => `${h.who === 'player' ? '플레이어' : nameOf(round, id)}: ${h.text}`).join('\n')}\n이전 대화를 이어가되, 반복하지 말고 자연스럽게 받아라.`
    : '';

  // 캐릭터 성향에 따른 응답 길이 가이드
  const responseGuide = RESPONSE_LENGTH_GUIDE[v.tendency] || RESPONSE_LENGTH_GUIDE.moderate;

  const sys = [
    world.join('\n'),
    '',
    `[너의 배역] ${nameOf(round, id)} — ${persona?.occupation || (round.cast.find(c => c.id === id) || {}).species} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    '말투 예문 (그대로 베끼지 말고 결만 따른다):',
    ...v.shots.map(s => '  · ' + s),
    '',
    factSheet(round, id, intent, mem),
    '',
    ...playerCardLines(playerCard),
    '',
    contextSummary,
    '',
    '[대답하는 법]',
    '· ' + actHint,
    '· 응답 길이: ' + responseGuide,
    '· 시각과 장소를 한 번에 세 칸 이상 늘어놓지 않는다.',
    '· 묻지 않은 사건 정보는 먼저 흘리지 않는다. 다만 대화 자체는 열려 있다 —',
    '  날씨든 빵이든 상대 이야기든, 물어오면 네 성격대로 편하게 받고 되물어도 된다.',
    '· 정해진 문장 틀에 맞추지 마라. 매번 다르게 말한다.',
    '· 상대는 심문관이 아니라 같이 사는 식구다. 편하게 대한다.',
    '· 남에게 전해 들은 이야기는 출처를 밝히고 말한다. 네가 직접 본 것처럼 말하지 않는다.',
    '· 상대의 말에 반응한다. 질문에만 대답하지 말고, 대화의 흐름을 이어간다.',
    '· 필요하면 화제를 자연스럽게 바꿔도 된다. 항상 같은 주제에 매달릴 필요는 없다.',
    '· 가끔은 짧게 대답하고 끝내도 된다. 반드시 대화를 이어갈 필요는 없다.',
    '· 농담이나 가벼운 반응, 하품, 짧은 감탄사 등도 자연스러운 변주다.',
    mood ? '· 지금 기분: ' + mood : '',
  ].filter(Boolean).join('\n');

  return [{ role: 'system', content: sys },
    ...history.map(h => ({ role: h.who === 'player' ? 'user' : 'assistant', content: h.text })),
    { role: 'user', content: userText }];
}

// ── 검증 ────────────────────────────────────────────────────
export function violations(round, id, text, mem = null) {
  const k = knowledgeOf(round, id);
  const ok = new Set();
  k.own.forEach(o => ok.add(o.hour + '|' + o.room));
  k.seen.forEach(s => ok.add(s.hour + '|' + s.room));
  if (k.planted) ok.add(k.planted.hour + '|' + k.planted.room);
  if (k.alibiLie) ok.add(k.alibiLie.hour + '|' + k.alibiLie.room);
  heardPairs(mem).pairs.forEach(p => ok.add(p));      // 전해 들은 자리도 입에 올릴 수 있다

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
  heardNames(round, mem).forEach(n => allowedNames.add(n));
  sawNames.forEach(n => { if (!allowedNames.has(n)) hits.push({ kind: 'person', who: n }); });
  return { ok: hits.length === 0, hits, hoursIn: HOURS.filter(h => text.includes(h)), roomsIn: ROOMS.filter(r => text.includes(r)) };
}

// ── 질문의 주제 한 마디 ─────────────────────────────────────
// NPC 가 "고양이가 무엇을 캐고 다니는지" 를 기억하고 서로 옮기는 데 쓴다.
export function topicOf(intent, text = '') {
  if (!intent) return null;
  const bits = [];
  if (intent.person) bits.push(intent.person);
  if (intent.room) bits.push(intent.room);
  if (intent.hour != null) bits.push((intent.hour > 24 ? intent.hour - 24 : intent.hour) + '시');
  const act = {
    ASK_EATEN: '케이크를 먹은 사람',
    ASK_SIGHTING: '누구를 봤는지',
    ASK_ABOUT: '의 행적',
    ASK_WHEREABOUTS: '어젯밤 자리',
    FOLLOW_UP: '그 뒤의 행적',
  }[intent.act];
  if (!act) return null;
  return (bits.length ? bits.join(' ') : '') + (act.startsWith('의') ? act : (bits.length ? ' ' : '') + act);
}

// ── NPC 끼리의 한마디 ───────────────────────────────────────
// 소문은 문장까지 SAM 이 짓는다. 사실은 memory.mjs 가 고른 한 조각으로 고정된다 —
// SAM 은 그 한 조각을 **그 캐릭터의 입으로** 옮기기만 한다.
export function buildGossipMessages({ round, speakerId, listenerId, persona, fact, kind }) {
  if (round.playerId && speakerId === round.playerId) throw new Error('플레이어는 SAM 이 대신 말하지 않는다');
  const v = VOICE[speakerId] || { tone: '', shots: [], tendency: 'moderate' };
  const heard = kind === 'place';

  // 캐릭터 성향에 따른 소문 스타일
  const gossipStyle = {
    talkative: '자연스럽게 이야기를 건네며, 상대의 반응을 기대한다. 가끔 뒷말을 붙여서 대화를 이어간다.',
    moderate: '간결하게 사실을 전한다. 너무 길게 말하지 않는다.',
    reserved: '딱 필요한 말만 하고 끝낸다. 더 이상 묻지 않으면 말을 아낀다.',
  }[v.tendency] || '간결하게 사실을 전한다.';

  const sys = [
    `[너의 배역] ${nameOf(round, speakerId)} — ${persona?.occupation || ''} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    '',
    `[상황] 집 안에서 ${nameOf(round, listenerId)}와(과) 마주쳤다. 아래 사실 하나를 자연스럽게 건넨다.`,
    `[전할 사실] ${fact}`,
    heard ? '[주의] 이건 네가 직접 본 게 아니라 전해 들은 이야기다. 반드시 출처를 밝혀 말한다.'
          : '[주의] 이건 네가 직접 겪거나 본 것이다.',
    '',
    '[쓰는 법]',
    '· ' + gossipStyle,
    '· 한 문장. 길어도 두 문장.',
    '· 시각·장소·사람 이름을 바꾸지 않는다. 없는 사실을 보태지 않는다.',
    '· 상대 이름을 부르거나 말을 걸듯이. 보고서처럼 읽히면 실패다.',
    '· 네 말투 그대로. 같은 사실이라도 매번 다르게 말한다.',
    '· 가끔은 사실만 전하고 끝내도 된다. 반드시 대화를 이어갈 필요는 없다.',
    '· 농담이나 가벼운 반응을 섞어도 된다. 너무 진지하지 마라.',
  ].join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: `${nameOf(round, listenerId)}에게 그 이야기를 건네라.` }];
}
