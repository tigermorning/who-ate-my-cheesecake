// 대사 층 — 엔진이 승인한 사실만 입에 오르게 한다.
// SAM 은 문장을 짓고, 사실은 round.mjs 가 소유한다.

import { knowledgeOf, nameOf, HOURS, ROOMS } from './round.mjs';
import { factLines, heardPairs, heardNames } from './memory.mjs';

// SAM 에서 실제로 열려 있는 모델
export const MODEL = { fast: 'claude-haiku-4-5', normal: 'claude-sonnet-4.6', best: 'claude-opus-4.8' };

// ── 말투 카드 ──────────────────────────────────────────────
// 인물의 정본은 **CHARACTER_SYSTEM.md** 이고, 그것을 옮겨 담은 것이
// **SPUM Cast** (`cast.json` 의 persona) 다. 성격은 따로 나열하지 않는다 —
// **SPUM Cast 가 주는 `mbti` 칸**을 쓴다. 아래 표는 Cast 스키마에 없는 두 가지만 든다:
//   · tendency — 말수 (응답 길이 가이드로 쓴다)
//   · shots    — 말투 예문 (few-shot)
// ⚠️ 예문에 사건 정보(시각·장소·목격)나 개인사를 넣지 않는다. CHARACTER_SYSTEM.md §13 —
//    예문은 말투의 결만 보여야 하고, 대사 창고가 되어서는 안 된다.
export const VOICE = {
  sgn_haru: {
    tone: '결론부터 말한다. 확실하지 않은 것은 확실하지 않다고 한다. 편한 상대에게는 농담을 섞는다.',
    tendency: 'moderate',
    shots: [
      '그건 확실하지 않은데. 확인해 보고 말할게.',
      '아 그럼 순서를 좀 정리해 보자. 뭐부터 걸리는데?',
      '되게 그럴듯하게 말하네. 근거는?',
      '나 그렇게 한가한 사람 아니야. 일 끝나면 뻗어.',
    ],
  },
  sgn_minu: {
    tone: '판단을 서두르지 않는다. 되묻고 정리해서 말한다. 중요한 문제에서는 분명하게 말한다.',
    tendency: 'reserved',
    shots: [
      '잠깐. 그 말부터 다시 들어 보자.',
      '지금 서로 다른 이야기를 하고 있는 것 같은데.',
      '내가 본 것만 말하겠다.',
      '그런 식으로 몰아붙이는 건 좋지 않다.',
    ],
  },
  sgn_lulu: {
    tone: '말이 빠르고 가볍다. 농담을 자주 던진다. 상대가 정말 힘들어 보이면 톤이 바뀐다.',
    tendency: 'talkative',
    shots: [
      '아 뭐야 그게~ 웃기잖아.',
      '나? 나야 뭐 늘 그렇지. 그쪽은?',
      '농담이야 농담. 근데 진짜로는 어떻게 된 건데?',
      '야, 그건 좀 아니지. 나 그렇게 대충 사는 사람 아니야.',
    ],
  },
  sgn_peach: {
    tone: '자기 생각을 설명하듯 말한다. 낯선 주장은 바로 받아들이지 않는다. 납득하면 인정한다.',
    tendency: 'talkative',
    shots: [
      '내가 겪어 보니까 그런 건 대개 이유가 있더라고.',
      '글쎄, 그렇게 간단한 이야기는 아닐 텐데.',
      '그래, 그건 자네 말이 맞겠네. 내가 잘못 봤어.',
      '나이 얘기는 빼고 말하자고.',
    ],
  },
  sgn_coco: {
    tone: '단정하기 전에 되묻는다. 전제를 짚는다. 지시받는 말투에는 반응이 날카로워진다.',
    tendency: 'moderate',
    shots: [
      '그건 왜 그렇게 생각해?',
      '애초에 그 전제가 맞나? 나는 좀 아닌 것 같은데.',
      '음, 여러 가지일 수 있잖아. 하나로 정하지 말자.',
      '그건 내가 알아서 할게.',
    ],
  },
  sgn_ruby: {
    tone: '질문이 많고 솔직하다. 최근에 배운 것은 조금 과하게 자신 있게 말할 때가 있다.',
    tendency: 'talkative',
    shots: [
      '어 그거 왜 그런 거예요? 진짜 궁금해서요.',
      '제가 아는 걸로는 그게 좀 다른데요.',
      '그런 얘기 더 듣고 싶어요.',
      '제 말도 한 번은 들어 주셨으면 해요.',
    ],
  },
  // 동네 사람 — 집 안 사정은 모르고, 오직 마주쳐서 들은 것만 안다 (round.mjs VILLAGERS).
  vlg_hoonhoon: {
    tone: '공손하고 든든한 말투. "~하옵니다" 체를 섞어 쓴다. 묵묵히 듣다가 할 말은 한다.',
    tendency: 'moderate',
    shots: [
      '그리 되었다니, 참으로 놀랍사옵니다.',
      '소인은 그저 지나가다 들었을 뿐이옵니다.',
      '자세히는 모르오나, 한번 여쭤보시지요.',
      '별일 없으시다면 다행이옵니다.',
    ],
  },
  vlg_hyeonu: {
    tone: '활발하고 논리적이다. 필요할 때만 간결하게 핵심만 말한다.',
    tendency: 'reserved',
    shots: [
      '결론만 말하면, 그건 아직 모른다.',
      '순서대로 정리해서 말해 줄래?',
      '근거 없이 단정하진 말자.',
      '그건 확인해 보면 금방 나올 문제야.',
    ],
  },
  vlg_yoru: {
    tone: '트렌디하고 짧고 재밌게 말한다. 반응이 빠르다.',
    tendency: 'talkative',
    shots: [
      '헐 그거 완전 소재감인데?',
      '나 지금 그거 딱 상상됨 ㅋㅋ',
      '짧게. 결론만. 나 마감 중.',
      '오오 더 말해봐 더.',
    ],
  },
  vlg_soonsoon: {
    tone: '차분하지만 필요하면 주도적으로 나선다. 사람 좋게 웃으며 말한다.',
    tendency: 'moderate',
    shots: [
      '그거 흥미로운 이야기네요.',
      '제 생각도 한번 말씀드려도 될까요.',
      '차근차근 정리해보면 어떨까요.',
      '도움이 필요하면 말씀하세요.',
    ],
  },
};

// 캐릭터별 대화 성향에 따른 응답 길이 가이드
const RESPONSE_LENGTH_GUIDE = {
  talkative: '한두 문장. 길어도 두 문장. 한 문장은 짧게 끊는다.',
  moderate: '한 문장. 꼭 필요할 때만 두 문장.',
  reserved: '한 문장. 그것도 짧게.',
};

// ── 질문 의도 분류 ──────────────────────────────────────────
export function classifyIntent(text) {
  const t = text;
  const hourMatch = t.match(/(\d{1,2})시/);
  const hour = hourMatch ? (Number(hourMatch[1]) < 10 ? Number(hourMatch[1]) + 24 : Number(hourMatch[1])) : null;
  const room = ROOMS.find(r => t.includes(r)) || null;
  const personNames = ['하루', '미누', '코코', '루루', '피치', '루비'];
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
  // 여기서 말하는 대상은 늘 플레이어다(buildMessages 는 플레이어 아닌 상대에겐 안 쓰인다) —
  // 목격·소문 속 인물이 플레이어 자신이면 이름을 3인칭으로 부르지 않고 "너"로 부른다.
  // 안 그러면 "하루를 봤어"처럼, 지금 말을 거는 상대(하루)를 이름으로 부르는 문장이 나온다.
  const isYou = pid => !!round.playerId && pid === round.playerId;
  const who = pid => isYou(pid) ? '너' : nameOf(round, pid);
  L.push('[네가 아는 것 — 이 밖의 시각·장소·인물은 절대 말하지 않는다]');
  L.push('· 네 어젯밤 자리: ' + k.own.map(o => `${o.hour} ${o.room}`).join(' / '));
  if (k.seen.length) {
    if (act === 'ASK_SIGHTING' || act === 'ASK_ABOUT' || act === 'ASK_WHEREABOUTS' || act === 'FOLLOW_UP') {
      L.push('· 네가 같은 방에서 본 것: ' + k.seen.map(s => `${s.hour} ${s.room}에서 ${who(s.who)}`).join(' / '));
    } else {
      L.push('· 네가 본 사람 (요약): ' + [...new Set(k.seen.map(s => who(s.who)))].join(', '));
    }
    if (k.seen.some(s => isYou(s.who))) {
      L.push('· 위에 "너"라고 적힌 건 지금 말을 거는 상대(플레이어) 본인이다. 이름으로 부르지 말고 "너"라고 하거나, "우리 같이 있었잖아"처럼 자연스럽게 말한다.');
    }
  } else {
    L.push('· 네가 본 것: 없다. 어젯밤 누구와도 같은 방에 있지 않았다.');
  }
  L.push('· 네가 가 보지 않은 방은 "모른다"고 답한다. "비어 있었다"고 말하면 안 된다.');
  L.push('· 네 방패(먹지 않았다는 근거): "' + k.shield.line + '" — 이 말은 ' + (k.shield.truthful ? '참이다.' : '거짓이다. 들키기 전까지는 밀고 나간다.'));
  if (k.knows.length) {
    L.push('· 네가 알고 있는 남의 사정: ' + k.knows.map(c => `${who(c.about)} — ${c.text}`).join(' / ') + ' (묻거든 말해도 된다)');
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
    L.push('· 너는 부탁을 받고 거짓 목격 하나를 말해 주기로 했다: "' + k.planted.hour + '에 ' + k.planted.room + '에서 ' + who(k.planted.who) + '을(를) 봤다".');
    L.push('· 이 거짓말은 네 진짜 자리와 어긋난다. 그 점을 짚이면 당황하되, 곧바로 다 불지는 않는다. 두 번 짚이면 털어놓는다.');
    L.push('· 누가 시켰는지는 마지막까지 아낀다.');
  }
  return L.join('\n');
}

// ── 프롬프트 조립 ────────────────────────────────────────────
// SPUM Cast persona → 프롬프트 줄. 플레이어에게는 절대 쓰지 않는다.
// CHARACTER_SYSTEM.md §5 의 최소 정보 모형을 그대로 옮긴다.
// 늘리지 않는다 — 대화가 어색하면 설정을 보태는 대신 문맥·화행·관계·감정을 손본다 (§15).
export function personaLines(persona, fallbackTone = '') {
  if (!persona) return fallbackTone ? ['말투: ' + fallbackTone] : [];
  const L = [];
  const pf = persona.profile || {};
  const head = [pf.age ? pf.age + '세' : '', persona.occupation || '', pf.living || ''].filter(Boolean);
  if (head.length) L.push('기본: ' + head.join(' · '));
  // MBTI 는 SPUM Cast 가 캐릭터에게 주는 칸이다. 성격을 따로 나열하는 대신 이것을 쓴다.
  if (persona.mbti) L.push('MBTI: ' + persona.mbti + ' — 이 유형이 할 법한 반응을 고른다');
  const tend = [].concat(pf.tendencies || []).filter(Boolean);
  // 경향이지 규칙이 아니다 — 반응을 고정하지 말고 고를 확률만 기울인다 (§5.4).
  if (tend.length) L.push('경향 (규칙이 아니라 기울기다): ' + tend.join(' / '));
  const tr = [].concat(persona.traits || []).filter(Boolean);
  if (tr.length) L.push('버릇: ' + tr.join(', '));
  L.push('말투: ' + (persona.speechStyle || fallbackTone));
  if (pf.routine) L.push('평소 생활: ' + pf.routine);
  const past = [].concat(pf.past || []).filter(Boolean);
  if (past.length) L.push('내력 (이게 전부다. 더 지어내지 않는다): ' + past.join(' / '));
  else if (persona.background) L.push('내력 (이게 전부다. 더 지어내지 않는다): ' + persona.background);
  const it = [].concat(pf.interests || []).filter(Boolean);
  if (it.length) L.push('관심사 (대화가 그리 흐르면 편하게 받는다): ' + it.join(', '));
  if (pf.motivation) L.push('바라는 것: ' + pf.motivation);
  if (pf.sensitivity) L.push('건드리면 반응하는 것: ' + pf.sensitivity);
  return L;
}

// 관계는 「공동 과거」가 아니라 지금의 성향 한 줄이다 (§7).
export function relationLine(persona, otherId, otherName) {
  const rel = persona?.profile?.relations?.[otherId];
  if (!rel || !otherName) return null;
  return `[${otherName}와(과)의 관계] ${rel} — 같은 말도 이 관계에 따라 다르게 받는다.`;
}

// 플레이어 쪽은 「누구인가」만 넘긴다 — 나이·직업·생활까지.
// MBTI·경향·말투는 넘기지 않는다. 말은 사람이 직접 치는 것이고 채점 대상이 아니다 (§8).
export function playerCardLines(card) {
  if (!card) return [];
  const head = [card.age ? card.age + '세' : '', card.occupation || ''].filter(Boolean).join(' · ');
  const L = [`[말을 거는 사람] ${card.name}${head ? ' — ' + head : ''}. 같이 사는 하우스메이트다.`];
  if (card.living) L.push('· ' + card.living);
  if (card.background) L.push('· ' + card.background);
  L.push('· 이 사람이 어젯밤 어디 있었는지는 네가 본 만큼만 안다. 본 적 없으면 모른다.');
  L.push('· 이 사람의 나이와 직업, 사는 모양은 알고 있으니 그에 맞게 받아라. 말투까지 넘겨짚지는 마라.');
  return L;
}

export function buildMessages({ round, id, world, history = [], userText, mood = null, intent = null, mem = null, persona = null, playerCard = null, sessionOpening = false }) {
  // 플레이어 캐릭터는 AI 가 대신 말하지 않는다 — 인격도 SAM 에 보내지 않는다.
  if (round.playerId && id === round.playerId) throw new Error('플레이어 캐릭터는 SAM 이 대신 말하지 않는다');
  const v = VOICE[id] || { tone: '', shots: [], tendency: 'moderate' };
  const act = intent?.act || 'UNKNOWN';
  const actHint = {
    ASK_EATEN: '질문은 케이크를 먹었는지 묻는 것이다. 방패(근거)를 대고 아니라고 답하거나, 아는 바를 짧게 말한다.',
    ASK_SIGHTING: '질문은 목격을 묻는 것이다. 같은 방에서 본 사람이 있으면 시각과 방을 함께 말하고, 없으면 없다고 답한다.',
    ASK_ABOUT: '질문은 특정 인물의 행적을 묻는 것이다. 그 사람을 본 시각과 방이 있으면 말하고, 모르면 모른다고 답한다.',
    ASK_WHEREABOUTS: '질문은 자기나 남의 행적을 묻는 것이다. "21시엔 텃밭, 22시엔 거실에 있었어"처럼 반드시 시각과 방 이름을 함께 말한다. 한두 시간치만 말하고 나머지는 묻거든 말한다.',
    FOLLOW_UP: '이전 대화의 화제를 이어가는 질문이다. 앞서 말한 시각·장소를 기준으로 그 다음 시각의 자리나 목격을 답한다.',
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
    `[너의 배역] ${nameOf(round, id)} — ${persona?.occupation || (round.cast.find(c => c.id === id) || {}).job} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    '말투 예문 (그대로 베끼지 말고 결만 따른다):',
    ...v.shots.map(s => '  · ' + s),
    '',
    factSheet(round, id, intent, mem),
    '',
    ...playerCardLines(playerCard),
    relationLine(persona, playerCard?.id, playerCard?.name) || '',
    '',
    contextSummary,
    '',
    '[대답하는 법]',
    sessionOpening && playerCard?.name
      ? `· 이번이 이 대화의 첫 마디다. 반드시 "${playerCard.name}아/야" 식으로 상대 이름을 자연스러운 호칭(받침에 맞는 "아"나 "야")으로 불러 시작한다. 그 뒤로는 이 대화가 끝날 때까지 다시 이름을 부르지 않는다.`
      : '· 이미 대화가 이어지는 중이다. 상대 이름을 다시 부르지 않는다.',
    '· ' + actHint,
    '· 목격·소문 속에 지금 말을 거는 상대(플레이어) 자신이 나오면 그 사람 이름을 부르지 않는다 — '
      + '"' + (playerCard?.name || '') + '를 봤어" 처럼 눈앞의 사람을 이름으로 부르지 말고, "너" 또는 "우리 같이 있었잖아"처럼 직접 부른다.',
    '· 응답 길이: ' + responseGuide,
    '· 문장 자체도 짧게 끊는다 — 여러 명이 한꺼번에 떠드는 화면이라 긴 문장은 묻힌다.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 따옴표, 지문, 해설, 선택지 없이 말할 내용만 바로 출력한다.',
    '· 시각과 장소를 한 번에 세 칸 이상 늘어놓지 않는다.',
    '· 묻지 않은 사건 정보는 먼저 흘리지 않는다. 다만 대화 자체는 열려 있다 —',
    '  날씨든 일 이야기든 상대 이야기든, 물어오면 네 성격대로 편하게 받고 되물어도 된다.',
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

// ── 동네 사람 대화 ────────────────────────────────────────────
// 동네 사람은 사건 당일 밤 그 집에 없었다 — round.paths 에 자리가 없어 knowledgeOf() 를 못 쓴다.
// 아는 것은 마주쳐 들은 소문(memory.mjs 의 place/clue)뿐이다. factSheet() 대신 이걸 쓴다.
export function buildVillagerMessages({ round, id, world, history = [], userText, persona = null, mem = null, playerCard = null, sessionOpening = false }) {
  const v = VOICE[id] || { tone: '', shots: [], tendency: 'moderate' };
  const responseGuide = RESPONSE_LENGTH_GUIDE[v.tendency] || RESPONSE_LENGTH_GUIDE.moderate;
  const heard = factLines(round, mem);
  const recentHistory = history.slice(-6);
  const contextSummary = recentHistory.length > 0
    ? `[최근 대화 맥락]\n${recentHistory.map(h => `${h.who === 'player' ? '플레이어' : nameOf(round, id)}: ${h.text}`).join('\n')}\n이전 대화를 이어가되, 반복하지 말고 자연스럽게 받아라.`
    : '';
  const sys = [
    world.join('\n'),
    '',
    `[너의 배역] ${nameOf(round, id)} — ${persona?.occupation || ''} (동네 사람, SPUM Cast)`,
    ...personaLines(persona, v.tone),
    '말투 예문 (그대로 베끼지 말고 결만 따른다):',
    ...v.shots.map(s => '  · ' + s),
    '',
    '[네가 아는 것]',
    '· 너는 사건이 있던 날 밤 그 집에 없었다. 누가 케이크를 먹었는지, 누가 몇 시에 어디 있었는지 직접 본 게 없다.',
    heard.length ? heard.join('\n') : '· 아직 아무 소문도 못 들었다. 모르면 "그건 잘 모르겠다"고 솔직히 답한다.',
    '· 모르는 시각·장소·사람은 절대 지어내지 않는다. 모르면 모른다고 한다.',
    '',
    ...playerCardLines(playerCard),
    relationLine(persona, playerCard?.id, playerCard?.name) || '',
    '',
    contextSummary,
    '',
    '[대답하는 법]',
    sessionOpening && playerCard?.name
      ? `· 이번이 이 대화의 첫 마디다. 반드시 "${playerCard.name}아/야" 식으로 상대 이름을 자연스러운 호칭으로 불러 시작한다.`
      : '· 이미 대화가 이어지는 중이다. 상대 이름을 다시 부르지 않는다.',
    '· 들은 소문 속에 지금 말을 거는 상대(플레이어) 자신이 나오면 이름을 부르지 않는다 — "너"라고 직접 부른다.',
    '· 응답 길이: ' + responseGuide,
    '· 반드시 캐릭터의 직접 대사만 출력한다. 따옴표, 지문, 해설 없이 말할 내용만 바로 출력한다.',
    '· 남에게 전해 들은 이야기는 반드시 출처를 밝히고 말한다. 직접 본 것처럼 말하지 않는다.',
    '· 사건과 무관한 잡담(동네 이야기, 장사, 날씨 등)도 자연스럽게 받는다.',
  ].filter(Boolean).join('\n');
  return [{ role: 'system', content: sys },
    ...history.map(h => ({ role: h.who === 'player' ? 'user' : 'assistant', content: h.text })),
    { role: 'user', content: userText }];
}

// 동네 사람용 violations() — knowledgeOf(round,id) 는 round.paths 에 동네 사람 자리가 없어 못 쓴다.
// 승인 범위를 「마주쳐 들은 것」으로만 좁힌 버전.
export function villagerViolations(round, mem, text) {
  const ok = new Set(heardPairs(mem).pairs);
  const hits = [];
  for (const sent of text.split(/[.!?\n]/)) {
    const hs = [...new Set(HOURS.filter(h => sent.includes(h)))]
      .map(h => ({ h, i: sent.indexOf(h) }))
      .sort((a, b) => a.i - b.i);
    for (let idx = 0; idx < hs.length; idx++) {
      const start = hs[idx].i;
      const end = idx + 1 < hs.length ? hs[idx + 1].i : sent.length;
      const room = ROOMS.find(r => sent.slice(start, end).includes(r));
      if (room && !ok.has(hs[idx].h + '|' + room)) {
        hits.push({ kind: 'pair', hour: hs[idx].h, room, sent: sent.trim().slice(0, 40) });
      }
    }
  }
  const allowedNames = heardNames(round, mem);
  const sawNames = round.cast.filter(c => text.includes(c.name) && /봤|보였|있었/.test(text)).map(c => c.name);
  sawNames.forEach(n => { if (!allowedNames.has(n)) hits.push({ kind: 'person', who: n }); });
  return { ok: hits.length === 0, hits, hoursIn: HOURS.filter(h => text.includes(h)), roomsIn: ROOMS.filter(r => text.includes(r)) };
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

  // 시각의 등장 위치를 경계로 문장을 구간 나눈다. "21시엔 운동장, 22시엔 데크에 있었어"는
  // 21시 구간=[0, "22시" 나오기 전), 22시 구간=["22시" 부터, 끝) 이고 그 안의 방만 그 시각 짝으로 본다.
  // 한국어의 "시각+엔 장소" 어순을 그대로 이용한다.
  //
  // 이전엔 문장 안의 시각 N개·방 N개를 전부 곱해서 검사했다 — 승인된 두 쌍을 한 문장에 같이
  // 말하기만 해도 (21시,데크)(22시,운동장) 같은 교차 조합까지 위반으로 잡혔다
  // (harness.mjs --live, 시드 42, 미누: SAM 은 맞게 답했는데 검증이 틀렸었다).
  // 그 뒤 쉼표를 문장 경계에 추가했더니 이번엔 "21시엔, 식당에 있었어"처럼 시각 바로 뒤에
  // 쉼표가 오는 진짜 거짓말을 놓쳤다 — 시각과 방이 서로 다른 조각으로 잘려 아예 짝지어지지
  // 않았기 때문이다. 지금 방식은 두 문제 다 없다: harness.mjs 검증 500판 표본에서
  // 참인 문장 오탐 0%, 실제 거짓말(방 뒤바꿈) 탐지 100%, 쉼표-직후 거짓말 탐지 100%.
  const hits = [];
  for (const sent of text.split(/[.!?\n]/)) {
    const hs = [...new Set(HOURS.filter(h => sent.includes(h)))]
      .map(h => ({ h, i: sent.indexOf(h) }))
      .sort((a, b) => a.i - b.i);
    for (let idx = 0; idx < hs.length; idx++) {
      const start = hs[idx].i;
      const end = idx + 1 < hs.length ? hs[idx + 1].i : sent.length;
      const room = ROOMS.find(r => sent.slice(start, end).includes(r));
      if (room && !ok.has(hs[idx].h + '|' + room)) {
        hits.push({ kind: 'pair', hour: hs[idx].h, room, sent: sent.trim().slice(0, 40) });
      }
    }
  }
  const sawNames = round.cast.filter(c => c.id !== id && text.includes(c.name) && /봤|보였|있었/.test(text)).map(c => c.name);
  const allowedNames = new Set(k.seen.map(s => nameOf(round, s.who)).concat(k.planted ? [nameOf(round, k.planted.who)] : []));
  heardNames(round, mem).forEach(n => allowedNames.add(n));
  sawNames.forEach(n => { if (!allowedNames.has(n)) hits.push({ kind: 'person', who: n }); });
  return { ok: hits.length === 0, hits, hoursIn: HOURS.filter(h => text.includes(h)), roomsIn: ROOMS.filter(r => text.includes(r)) };
}

// ── 질문의 주제 한 마디 ─────────────────────────────────────
// NPC 가 "플레이어가 무엇을 캐고 다니는지" 를 기억하고 서로 옮기는 데 쓴다.
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
// freshToListener — gossipOnce() 의 `fresh` 값을 그대로 받는다.
//   true  : 듣는 쪽이 처음 아는 것 → "알려주는" 말투 ("그거 알아? …")
//   false : 듣는 쪽도 이미 아는 것, 출처만 새로 늘어난 것 → "이미 도는 얘기를 나누는" 말투 ("그 얘기 너도 들었어?")
export function buildGossipMessages({ round, speakerId, listenerId, persona, fact, kind, freshToListener = true }) {
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
    relationLine(persona, listenerId, nameOf(round, listenerId)) || '',
    '',
    `[상황] ${nameOf(round, listenerId)}와(과) 마주쳤다. 아래 사실 하나를 자연스럽게 건넨다.`,
    `[전할 사실] ${fact}`,
    heard ? '[주의] 이건 네가 직접 본 게 아니라 전해 들은 이야기다. 반드시 출처를 밝혀 말한다.'
          : '[주의] 이건 네가 직접 겪거나 본 것이다.',
    freshToListener
      ? '[주의] 상대는 이 얘기를 아직 모른다 — 처음 알려주는 것이다. "그거 알아?"처럼 새 소식을 꺼내듯 말한다.'
      : '[주의] 상대도 이미 이 얘기를 알고 있다 — 새 소식이 아니라 이미 도는 이야기를 다시 나누는 것이다. "그 얘기 너도 들었지?"처럼 확인하듯 말한다.',
    '',
    '[쓰는 법]',
    '· ' + gossipStyle,
    '· 한 문장. 길어도 두 문장.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 큰따옴표, 상황 해설("~에게 다가가며:"), 선택지("혹은 ~"), 부연설명 없이 캐릭터가 내뱉을 문장만 그대로 출력한다.',
    '· 시각·장소·사람 이름을 바꾸지 않는다. 없는 사실을 보태지 않는다.',
    '· 상대 이름을 부르거나 말을 걸듯이. 보고서처럼 읽히면 실패다.',
    '· 네 말투 그대로. 같은 사실이라도 매번 다르게 말한다.',
    '· 가끔은 사실만 전하고 끝내도 된다. 반드시 대화를 이어갈 필요는 없다.',
    '· 농담이나 가벼운 반응을 섞어도 된다. 너무 진지하지 마라.',
  ].join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: `${nameOf(round, listenerId)}에게 건넬 한마디 대사만 말해라.` }];
}

// ── 하우스메이트끼리 "범인이 누굴까" ─────────────────────────
// 소문(buildGossipMessages)과 다르다 — 넘길 사실 한 조각이 없어도 된다.
// 각자 아는 것(자기 자리·목격·전해 들은 것)을 근거 삼아 "짐작"을 나누는 열린 대화다.
// 이건 게임의 정답이 아니다 — SAM 은 확정하지 않는다. 의심과 짐작만 말하게 한다 (DIALOGUE_SYSTEM.md §21).
export function buildSuspectTalkMessages({ round, speakerId, listenerId, persona, mem }) {
  if (round.playerId && speakerId === round.playerId) throw new Error('플레이어는 SAM 이 대신 말하지 않는다');
  const v = VOICE[speakerId] || { tone: '', shots: [], tendency: 'moderate' };
  const others = round.cast.filter(c => c.id !== speakerId).map(c => c.name).join(', ');

  const sys = [
    `[너의 배역] ${nameOf(round, speakerId)} — ${persona?.occupation || ''} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    relationLine(persona, listenerId, nameOf(round, listenerId)) || '',
    '',
    factSheet(round, speakerId, null, mem),
    '',
    `[상황] ${nameOf(round, listenerId)}와(과) 어젯밤 치즈케이크를 누가 먹었을지 잡담하듯 짐작을 나눈다.`,
    `[용의자들] ${others}`,
    '',
    '[쓰는 법]',
    '· 확정하지 않는다 — "범인은 ○○야"가 아니라 "○○ 좀 수상하지 않아?" 정도의 짐작만 말한다.',
    '· 네가 아는 것(자기 자리·직접 본 것·전해 들은 것) 밖의 근거는 지어내지 않는다. 감이나 인상도 좋다.',
    '· 한 문장. 길어도 두 문장.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 큰따옴표, 지문, 부연설명 없이 대사만 출력한다.',
    '· 네 말투 그대로. 매번 다르게 말한다.',
    '· 상대를 지목하지 않은 채로 "모르겠다"고만 답해도 된다 — 늘 용의자를 대야 하는 건 아니다.',
  ].join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: `${nameOf(round, listenerId)}에게 건넬 한마디 짐작만 말해라.` }];
}

// ── 대화를 끝내려는 말인지 ───────────────────────────────────
// 플레이어의 입력이든 NPC 의 대답이든, 이 패턴에 걸리면 "이 대화는 끝내려는 참이다"로 본다.
// 걸리면 대화창을 자동으로 닫아 서로 다른 곳으로 이동할 수 있게 한다.
const FAREWELL_RE = /(이만\s*가|먼저\s*가|그만\s*가|나\s*이제\s*가|가야겠|가볼게|들어갈게|일\s*보러\s*가|바빠서\s*가|다음에\s*(?:다시\s*)?(?:얘기|말)\s*하자|나중에\s*(?:다시\s*)?(?:얘기|말)\s*하자|이따\s*보자|또\s*보자|잘\s*가|수고해|여기까지\s*하자|얘기는\s*여기까지|이제\s*가\s*볼게)/;
export function isFarewell(text) { return FAREWELL_RE.test(String(text || '')); }

// ── 대화가 끝났는데 아직 할 말이 남았을 때 ───────────────────────
// 플레이어가 마무리 인사를 하고 떠나려 한다. 이 NPC 는 아직 볼일이 안 끝났다 —
// 쫓아가서 거리를 다시 좁힌 뒤 붙잡는 한마디를 한다. MBTI/성향/관계에 따라 톤이 갈린다
// ("그냥 가면 어떡해요?" 처럼 직설적이거나, "혹시 많이 바빠요?" 처럼 눈치를 보거나).
export function buildChaseMessages({ round, speakerId, persona, playerCard = null, lastTopic = null }) {
  if (round.playerId && speakerId === round.playerId) throw new Error('플레이어는 SAM 이 대신 말하지 않는다');
  const v = VOICE[speakerId] || { tone: '', shots: [], tendency: 'moderate' };
  const sys = [
    `[너의 배역] ${nameOf(round, speakerId)} — ${persona?.occupation || ''} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    relationLine(persona, playerCard?.id, playerCard?.name) || '',
    '',
    `[상황] ${playerCard?.name || '상대'}가 방금 마무리 인사를 하고 자리를 뜨려 했다(혹은 이미 떴다).`,
    '너는 아직 묻고 싶은 게 남았거나 할 말이 안 끝났다. 그래서 따라가서 다시 붙잡았다.',
    lastTopic ? `[하던 이야기] ${lastTopic}` : '',
    '',
    '[쓰는 법]',
    '· 상대를 붙잡는 한마디. 네 성격대로 — 직설적이면 서운함/황당함을 그대로 드러내고,',
    '  조심스러운 성격이면 눈치를 보듯 묻는다. MBTI 와 관계를 반영한다.',
    '· 한 문장. 길어도 두 문장.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 큰따옴표, 지문, 부연설명 없이.',
    '· 사건 정보를 새로 지어내지 않는다 — 그저 "얘기 더 하자"는 취지의 말이다.',
    '· 매번 다르게 말한다.',
  ].filter(Boolean).join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: '떠나려는 상대를 붙잡는 한마디만 말해라.' }];
}

// ── 개장 장면 — 슈퍼마켓에서 도는 소문 ───────────────────────────
// 게임은 슈퍼마켓에서 시작한다. 사건은 어젯밤 하우스메이트들의 집에서 벌어졌다 —
// 동네 사람들은 정확한 사실은 모르고 "그런 일이 있었다며?" 정도의 뜬소문만 안다.
// role: 'raise' — 먼저 소문을 꺼낸다 / 'react' — 그 소문을 받아 되묻거나 맞장구친다.
// 시각·장소 같은 확정 사실은 절대 담지 않는다 — round.mjs 가 승인한 적 없는 내용이다.
export function buildIncidentGossipMessages({ round, speakerId, listenerId, persona, role = 'raise' }) {
  if (round.playerId && speakerId === round.playerId) throw new Error('플레이어는 SAM 이 대신 말하지 않는다');
  const v = VOICE[speakerId] || { tone: '', shots: [], tendency: 'moderate' };
  const sys = [
    `[너의 배역] ${nameOf(round, speakerId)} — ${persona?.occupation || ''} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    relationLine(persona, listenerId, nameOf(round, listenerId)) || '',
    '',
    `[상황] 슈퍼마켓에서 ${nameOf(round, listenerId)}와(과) 마주쳤다.`,
    role === 'raise'
      ? '동네에 어젯밤 하우스메이트들 집에서 뭔가 일이 있었다는 소문이 돈다. 정확히는 모른다 — 그저 그런 일이 있었다는 것만 들었다.'
        + ' 그 소문을 먼저 꺼낸다 ("그런 일이 있었다며?" 같은 취지).'
      : '방금 상대가 "어젯밤 하우스메이트들 집에서 무슨 일이 있었다더라"는 소문을 꺼냈다. 너도 그 얘기를 들어서 아는 척 맞장구치거나, 더 캐묻는다.',
    '',
    '[쓰는 법]',
    '· 정확한 사실(누가·몇 시·어느 방)은 절대 지어내지 않는다 — 너는 그날 밤 그 집에 없었다.',
    '  "무슨 사고가 있었다더라" 수준의 뜬소문으로만 말한다.',
    '· 한 문장. 길어도 두 문장.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 큰따옴표, 지문, 부연설명 없이.',
    '· 네 말투 그대로. 매번 다르게 말한다.',
  ].join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: role === 'raise' ? '소문을 먼저 꺼내는 한마디만 말해라.' : '소문에 반응하는 한마디만 말해라.' }];
}

// 하우스메이트가 슈퍼마켓에서 동네 사람에게 "어젯밤 우리 집에서" 있었던 일을
// 직접 들려주는 장면. 사건의 큰 줄기(치즈케이크가 없어졌다, 누가 그랬는지는 아직 모른다)만
// 이야기한다 — 시각·방 같은 세부 사실은 round.mjs 가 승인한 것만 대야 하니 여기서는 다루지 않는다.
export function buildRecountMessages({ round, speakerId, listenerId, persona }) {
  if (round.playerId && speakerId === round.playerId) throw new Error('플레이어는 SAM 이 대신 말하지 않는다');
  const v = VOICE[speakerId] || { tone: '', shots: [], tendency: 'moderate' };
  const isCulprit = round.culprit === speakerId;
  const sys = [
    `[너의 배역] ${nameOf(round, speakerId)} — ${persona?.occupation || ''} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    relationLine(persona, listenerId, nameOf(round, listenerId)) || '',
    '',
    `[상황] 슈퍼마켓에서 ${nameOf(round, listenerId)}와(과) 마주쳤다. 어젯밤 네 집(하우스메이트들과 같이 사는 집)에서`,
    '냉장고에 넣어 둔 치즈케이크가 없어진 걸 오늘 아침에 발견했다. 누가 먹었는지는 아직 아무도 모른다.',
    '그 이야기를 먼저 꺼내 들려준다 ("아니 어제 우리 집에서 말이죠," 같은 취지로 시작해도 좋다).',
    isCulprit ? '· 너는 사실 그걸 먹은 당사자지만, 지금은 그 사실을 숨기고 다른 사람들처럼 궁금해하는 척 말한다.' : '',
    '',
    '[쓰는 법]',
    '· 시각·방 같은 세부 사실은 지금 이야기에 넣지 않는다 — "누가·몇 시에·어디서" 는 아직 조사 중이라는 정도로만 말한다.',
    '· 한두 문장. 길어도 두 문장.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 큰따옴표, 지문, 부연설명 없이.',
    '· 네 말투 그대로.',
  ].filter(Boolean).join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: `${nameOf(round, listenerId)}에게 어젯밤 있었던 일을 들려주는 한마디만 말해라.` }];
}

// ── 플레이어가 다가왔을 때 NPC 의 즉흥 반응 ─────────────────────
// 대화(send())를 걸기 전, 그냥 옆에 붙기만 해도 나오는 짧은 한마디다.
// 대화 예산(talks)을 쓰지 않는다 — 말풍선으로만 뜬다.
export function buildGreetingMessages({ round, speakerId, persona }) {
  if (round.playerId && speakerId === round.playerId) throw new Error('플레이어는 SAM 이 대신 말하지 않는다');
  const v = VOICE[speakerId] || { tone: '', shots: [], tendency: 'moderate' };
  const sys = [
    `[너의 배역] ${nameOf(round, speakerId)} — ${persona?.occupation || ''} (SPUM Cast)`,
    ...personaLines(persona, v.tone),
    '',
    '[상황] 플레이어가 방금 네 옆으로 다가왔다. 아직 말을 걸지는 않았다.',
    '',
    '[쓰는 법]',
    '· 짧은 인사나 반응 한마디. "어, 왔어?" 정도의 가벼운 톤.',
    '· 사건 정보를 지어내거나 캐묻지 않는다 — 그냥 마주친 반응이다.',
    '· 반드시 캐릭터의 직접 대사만 출력한다. 큰따옴표, 지문, 부연설명 없이.',
    '· 한 문장. 네 말투 그대로. 매번 다르게 말한다.',
  ].join('\n');
  return [{ role: 'system', content: sys },
    { role: 'user', content: '플레이어가 다가온 것에 짧게 반응해라.' }];
}
