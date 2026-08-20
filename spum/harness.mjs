// SAM Character / Dialogue Harness
// CHARACTER_SYSTEM.md · DIALOGUE_SYSTEM.md §25(검증 기준)의 6개 항목을 코드로 확인한다.
//
//   node spum/harness.mjs           구조 검사만. SAM 호출 0회 — 몇 번을 돌려도 공짜다.
//   node spum/harness.mjs --live    위에 더해 SAM 실호출 4회(haiku, 60토큰)로 대화 하나를 찍어 본다.
//
// 구조 검사가 보는 것: buildMessages()가 프롬프트에 무엇을 실었는가, violations()가
// 지어낸 사실을 실제로 잡아내는가, memory.mjs가 출처를 잃지 않는가 — 전부 SAM 없이도
// 코드 경로로 확인 가능한 것들이다. SAM 이 실제로 그 지침을 따르는지는 --live 로만 잡을 수 있다.

import fs from 'node:fs';
import {
  makeRound, knowledgeOf, nameOf, CAST, HOURS, ROOMS,
} from './round.mjs';
import {
  createMemory, remember, gossipOnce, noteAsked, keyOf, CAP, heardCount, factLines,
} from './memory.mjs';
import {
  buildMessages, classifyIntent, violations, personaLines, relationLine, playerCardLines, MODEL,
} from './dialogue.mjs';

const cast = JSON.parse(fs.readFileSync(new URL('./cast.json', import.meta.url)));
const premise = JSON.parse(fs.readFileSync(new URL('./premise.json', import.meta.url)));
const persona = {}; cast.forEach(c => { persona[c.id] = c.persona; });

const round = makeRound(42, null);   // 고정 시드 — 결과가 매번 같아야 검사가 재현된다
const NPC = CAST[1].id;              // sgn_minu — reserved 성향, 짧은 응답이라 위반이 잘 드러난다
const OTHER = CAST.find(c => c.id !== NPC).id;
const playerCard = { id: OTHER, name: nameOf(round, OTHER), age: 23, occupation: '대학원생' };

const report = { 'SPEECH ACT': [], CONTEXT: [], CHARACTER: [], KNOWLEDGE: [], MEMORY: [], 'OPEN CONVERSATION': [] };
function check(cat, name, ok, detail = '') { report[cat].push({ name, ok, detail }); }

// ── 1. SPEECH ACT — 화행에 맞게 반응하는가? ─────────────────
// DIALOGUE_SYSTEM.md §5.2·5.3 표에 나온 분류와 구어체 변형이 실제로 그렇게 분류되는지 확인한다.
{
  const table = [
    ['먹었어?', 'ASK_EATEN'], ['혹시 케이크 먹었어?', 'ASK_EATEN'], ['치즈 훔친 거 아니야?', 'ASK_EATEN'],
    ['너 거기서 봤어?', 'ASK_SIGHTING'], ['누구 봤어', 'ASK_SIGHTING'],
    ['미누 어디 있었어?', 'ASK_ABOUT'],
    ['어디 있었어?', 'ASK_WHEREABOUTS'],
    ['그 이후엔?', 'FOLLOW_UP'], ['그 다음엔 뭐 했어', 'FOLLOW_UP'],
    ['안녕', 'GREET'],
    ['기분 어때?', 'SOCIAL'],
    ['오늘 날씨 진짜 좋다', 'UNKNOWN'],
  ];
  for (const [text, want] of table) {
    const got = classifyIntent(text).act;
    check('SPEECH ACT', `"${text}" → ${want}`, got === want, `실제: ${got}`);
  }
  // 화행마다 buildMessages()가 서로 다른 지침(actHint)을 싣는지 — UNKNOWN 도 "자연스럽게 받아라"로 빠지지 않고 도와준다
  const acts = ['ASK_EATEN', 'ASK_SIGHTING', 'ASK_ABOUT', 'ASK_WHEREABOUTS', 'FOLLOW_UP', 'GREET', 'SOCIAL', 'UNKNOWN'];
  const mem0 = createMemory(round, NPC);
  const hints = acts.map(act => {
    const sys = buildMessages({ round, id: NPC, world: premise.world, userText: 'x', intent: { act }, mem: mem0, persona: persona[NPC], playerCard })[0].content;
    return sys.split('[대답하는 법]')[1]?.split('\n')[1] || '';
  });
  check('SPEECH ACT', '화행 8종이 서로 다른 지침을 싣는다', new Set(hints).size === acts.length, hints.join(' | '));
}

// ── 2. CONTEXT — 대화의 맥락을 유지하는가? ─────────────────
{
  const mem0 = createMemory(round, NPC);
  const history = Array.from({ length: 9 }, (_, i) => ({ who: i % 2 ? 'npc' : 'player', text: `발화${i}` }));
  const msgs = buildMessages({ round, id: NPC, world: premise.world, history, userText: '마지막 질문', intent: classifyIntent('마지막'), mem: mem0, persona: persona[NPC], playerCard });
  const sys = msgs[0].content;
  const summaryLines = (sys.split('[최근 대화 맥락]')[1] || '').split('이전 대화를')[0].trim().split('\n').filter(Boolean);
  check('CONTEXT', '요약은 최근 6턴만 (9턴 중)', summaryLines.length === 6, `실제 ${summaryLines.length}줄`);
  check('CONTEXT', '실제 메시지 배열엔 history 전량이 들어간다', msgs.length === history.length + 2, `실제 ${msgs.length}개`);
  check('CONTEXT', '마지막 발화가 요약 끝에 남는다', summaryLines.at(-1).includes('발화8'), summaryLines.at(-1));

  // 화제 전환·복귀는 SAM 이 만드는 것이지 코드가 강제하는 게 아니다 — 지침 문구 존재만 확인
  check('CONTEXT', '화제를 자유롭게 바꿔도 된다는 지침이 있다', sys.includes('화제를 자연스럽게 바꿔도 된다'));
}

// ── 3. CHARACTER — 성격·욕구·관계의 경향을 유지하는가? ─────
{
  const mem0 = createMemory(round, NPC);
  const sys = buildMessages({ round, id: NPC, world: premise.world, userText: 'x', intent: classifyIntent('x'), mem: mem0, persona: persona[NPC], playerCard })[0].content;
  const p = persona[NPC];
  check('CHARACTER', 'MBTI 가 실린다', sys.includes('MBTI: ' + p.mbti));
  check('CHARACTER', '경향이 실린다 (규칙이 아니라 기울기라는 문구와 함께)', sys.includes('경향 (규칙이 아니라 기울기다)'));
  check('CHARACTER', '동기가 실린다', sys.includes(p.profile.motivation));
  check('CHARACTER', '민감한 부분이 실린다', sys.includes(p.profile.sensitivity));
  check('CHARACTER', '상대와의 관계 한 줄이 실린다', sys.includes(relationLine(p, OTHER, playerCard.name)));

  // 플레이어 표현의 자유(§8) — 카드에는 나이·직업·생활만, MBTI·경향은 아예 만들지 않는다.
  // "말투"는 "말투까지 넘겨짚지는 마라"는 지침 문구에 정상적으로 등장하므로 검사 대상에서 뺀다.
  const pcLines = playerCardLines({ name: '테스트', age: 20, occupation: '직업', living: '생활', background: '내력' }).join('\n');
  check('CHARACTER', '플레이어 카드는 MBTI/경향을 안 만든다', !/MBTI|경향/.test(pcLines), pcLines);

  // 플레이어 캐릭터는 SAM 이 절대 대신 말하지 않는다 (§8, §20) — 방어 코드가 실제로 막는지
  const rp = makeRound(1, NPC);   // NPC 를 플레이어로 지정
  let threw = false;
  try { buildMessages({ round: rp, id: NPC, world: premise.world, userText: 'x', persona: persona[NPC] }); } catch { threw = true; }
  check('CHARACTER', '플레이어 캐릭터를 SAM 이 대신 말하려 하면 예외를 던진다', threw);
}

// ── 4. KNOWLEDGE — 아는 것과 모르는 것을 구분하는가? 출처를 보존하는가? ─
{
  const k = knowledgeOf(round, NPC);
  const [okHour, okRoom] = [k.own[0].hour, k.own[0].room];
  check('KNOWLEDGE', '실제 자기 자리는 위반으로 안 잡힌다', violations(round, NPC, `${okHour}엔 ${okRoom}에 있었다`).ok);

  const badPair = HOURS.flatMap(h => ROOMS.map(r => [h, r]))
    .find(([h, r]) => !k.own.some(o => o.hour === h && o.room === r) && !k.seen.some(s => s.hour === h && s.room === r));
  const v = violations(round, NPC, `${badPair[0]}엔 ${badPair[1]}에 있었다`);
  check('KNOWLEDGE', '가 보지 않은 시각·장소 조합은 위반으로 잡힌다', !v.ok && v.hits.length > 0, JSON.stringify(v.hits));

  const stranger = CAST.find(c => c.id !== NPC && !k.seen.some(s => s.who === c.id)).name;
  const vp = violations(round, NPC, `${stranger} 봤어`);
  check('KNOWLEDGE', '본 적 없는 사람을 봤다고 하면 위반으로 잡힌다', !vp.ok && vp.hits.some(h => h.kind === 'person'));

  const sys = buildMessages({ round, id: NPC, world: premise.world, userText: 'x', intent: classifyIntent('x'), mem: createMemory(round, NPC), persona: persona[NPC], playerCard })[0].content;
  check('KNOWLEDGE', '안 가본 방은 "모른다"지 "비었다"가 아니라는 지침이 있다', sys.includes('"모른다"고 답한다'));
}

// ── 5. MEMORY — 중요한 결과를 기억하는가? 없는 기억을 만들어내지 않는가? ─
{
  const memA = createMemory(round, NPC);
  const k = knowledgeOf(round, NPC);
  const expectedSeeds = k.own.length + k.seen.length + k.knows.length + (k.planted ? 1 : 0) + (k.alibiLie ? 1 : 0);
  check('MEMORY', '판 시작 시 씨앗 기억이 정확히 심긴다', memA.items.length === expectedSeeds, `기대 ${expectedSeeds} 실제 ${memA.items.length}`);
  check('MEMORY', '씨앗은 전부 seeded 표시가 있다', memA.items.every(e => e.seeded));

  // 같은 사실을 두 번 넣으면 조각이 늘지 않고 출처만 합쳐진다 — "없는 기억을 만들어내지 않는다"의 핵심
  const before = memA.items.length;
  const dup = remember(memA, { k: 'place', hour: HOURS[0], room: ROOMS[0], who: OTHER, from: ['제3자'] });
  check('MEMORY', '새 사실은 조각이 늘어난다', memA.items.length === before + 1);
  const dup2 = remember(memA, { k: 'place', hour: HOURS[0], room: ROOMS[0], who: OTHER, from: ['다른사람'] });
  check('MEMORY', '같은 사실 재입력은 조각을 안 늘리고 출처만 더한다', memA.items.length === before + 1 && dup2 === null);
  const merged = memA.byKey.get(keyOf({ k: 'place', hour: HOURS[0], room: ROOMS[0], who: OTHER }));
  check('MEMORY', '출처가 둘 다 남는다 (제3자·다른사람)', merged.from.includes('제3자') && merged.from.includes('다른사람'), merged.from.join(','));

  // 상한(CAP) — 넘치면 씨앗 아닌 것부터 버려지고, 씨앗은 보호된다
  const memB = createMemory(round, CAST[2].id);
  const seedCount = memB.items.length;
  for (let i = 0; i < CAP + 10; i++) remember(memB, { k: 'clue', about: OTHER, text: `가짜사실${i}` });
  check('MEMORY', `CAP(${CAP})을 넘기지 않는다`, memB.items.length <= CAP, `실제 ${memB.items.length}`);
  check('MEMORY', '씨앗 기억은 상한에도 살아남는다', memB.items.filter(e => e.seeded).length === seedCount);

  // 소문 — 옮겨진 기억이 출처를 잃지 않는지 (§12·§13·§17)
  const memC = createMemory(round, NPC), memD = createMemory(round, CAST[3].id);
  let gossiped = null;
  for (let i = 0; i < 20 && !gossiped; i++) gossiped = gossipOnce(round, memC, memD, () => 0);
  if (gossiped) {
    check('MEMORY', '옮겨진 기억은 원래 화자를 출처로 남긴다', gossiped.entry.from?.[0] === nameOf(round, NPC), JSON.stringify(gossiped.entry.from));
    check('MEMORY', '전해 들은 것은 place/clue/asked 종류로만 바뀐다 (직접 목격으로 둔갑 안 함)', ['place', 'clue', 'asked'].includes(gossiped.entry.k), gossiped.entry.k);
  } else {
    check('MEMORY', '옮길 수 있는 사실이 없어 소문 검사를 건너뜀', true, '이 시드에서는 공유 가능한 사실이 아직 없다');
  }

  // 플레이어의 질문 자체도 흔적을 남긴다 (§18)
  const memE = createMemory(round, NPC);
  noteAsked(round, memE, '루비 행적');
  const lines = factLines(round, memE);
  check('MEMORY', '플레이어가 물은 것도 기억되고 프롬프트에 실린다', lines.some(l => l.includes('루비 행적')));
}

// ── 6. OPEN CONVERSATION — 예측 못한 대화에서도 동문서답 없이 계속되는가? ─
{
  const wild = ['', '???', '음...', 'ㅋㅋㅋㅋ', 'hello there', '치즈케이크 좋아하는 나라가 어디야', '아 몰라 그냥', '넌 꿈이 뭐야'];
  let crashed = 0;
  for (const t of wild) {
    try { classifyIntent(t); } catch { crashed++; }
  }
  check('OPEN CONVERSATION', '예측 못한 입력에도 화행 분류가 죽지 않는다', crashed === 0, `${crashed}건 죽음`);

  // "케이크"·"치즈" 같은 사건 키워드가 안 섞인, 정말로 분류 안 되는 문장을 골라야 UNKNOWN 을 실제로 탄다
  const unknownText = '음악 듣는 거 좋아해?';
  check('OPEN CONVERSATION', '(전제 확인) 이 문장은 실제로 UNKNOWN 으로 분류된다', classifyIntent(unknownText).act === 'UNKNOWN', classifyIntent(unknownText).act);
  const mem0 = createMemory(round, NPC);
  const sys = buildMessages({ round, id: NPC, world: premise.world, userText: unknownText, intent: classifyIntent(unknownText), mem: mem0, persona: persona[NPC], playerCard })[0].content;
  check('OPEN CONVERSATION', 'UNKNOWN 화행도 "네 성격대로 자연스럽게 받아라"로 안내한다', sys.includes('분류하려 들지 말고 네 성격대로 자연스럽게 받아라'));
  check('OPEN CONVERSATION', '질문 없이도 대화를 이어갈 수 있다는 지침이 있다', sys.includes('반드시 대화를 이어갈 필요는 없다'));

  // 대화가 아주 길어져도(50턴) 죽지 않는다
  const longHistory = Array.from({ length: 50 }, (_, i) => ({ who: i % 2 ? 'npc' : 'player', text: `말${i}` }));
  let longOk = true;
  try { buildMessages({ round, id: NPC, world: premise.world, history: longHistory, userText: '마지막', intent: classifyIntent('마지막'), mem: mem0, persona: persona[NPC], playerCard }); }
  catch { longOk = false; }
  check('OPEN CONVERSATION', '50턴짜리 긴 대화에도 프롬프트 조립이 죽지 않는다', longOk);
}

// ── 리포트 ──────────────────────────────────────────────────
let totalPass = 0, totalFail = 0;
for (const [cat, items] of Object.entries(report)) {
  const p = items.filter(i => i.ok).length;
  totalPass += p; totalFail += items.length - p;
  console.log(`\n${cat}  ${p}/${items.length}`);
  for (const it of items) {
    console.log(`  ${it.ok ? '✓' : '✗'} ${it.name}${it.ok ? '' : '  — ' + it.detail}`);
  }
}
console.log(`\n합계 ${totalPass}/${totalPass + totalFail}${totalFail ? `  (실패 ${totalFail})` : ''}`);
console.log('SAM 호출: 0회 (구조 검사만)');

// ── --live: 최소 실호출 4회로 실제 SAM 응답을 검증한다 ──────
async function liveProbe() {
  const BASE = 'http://127.0.0.1:8790';
  const health = await fetch(BASE + '/api/health').then(r => r.json()).catch(() => null);
  if (!health || (health.sam !== 'ready' && health.sam !== 'bridge')) {
    console.log('\n[live] SAM 준비 안 됨 (' + (health?.sam || '서버 없음') + ') — node spum/serve.mjs 를 먼저 띄워라. 스킵.');
    return;
  }
  console.log(`\n[live] SAM 실호출 4회 · 모델 ${MODEL.fast} · ${nameOf(round, NPC)} 와의 대화 하나로 6개 기준을 훑는다`);
  const mem = createMemory(round, NPC);
  const script = [
    '어젯밤 어디 있었어?',          // SPEECH ACT: ASK_WHEREABOUTS
    '그 이후엔?',                   // CONTEXT: FOLLOW_UP — 직전 시각을 이어야 한다
    '오늘 잠은 잘 잤어?',           // OPEN CONVERSATION: 예측 밖 잡담
    '거긴 누구 있었어?',            // KNOWLEDGE: 본 사람만 말해야 한다
  ];
  const history = [];
  for (const userText of script) {
    const intent = classifyIntent(userText);
    const msgs = buildMessages({ round, id: NPC, world: premise.world, history, userText, intent, mem, persona: persona[NPC], playerCard });
    const r = await fetch(BASE + '/api/sam/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL.fast, messages: msgs, temperature: 0.7, max_tokens: 60 }),
    });
    const j = await r.json().catch(() => ({}));
    const text = String(j.choices?.[0]?.message?.content || '').trim() || '(빈 응답)';
    const v = violations(round, NPC, text, mem);
    console.log(`\n  플레이어: ${userText}`);
    console.log(`  ${nameOf(round, NPC)}: ${text}`);
    console.log(`  KNOWLEDGE 검증: ${v.ok ? '✓ 승인된 사실 안에서만 말함' : '✗ 위반 — ' + JSON.stringify(v.hits)}`);
    history.push({ who: 'player', text: userText }, { who: 'npc', text });
  }
  console.log('\n[live] CHARACTER(말투가 미누답게 짧고 담담한가)와 CONTEXT(2턴이 1턴을 실제로 이었는가)는');
  console.log('       위 전사를 눈으로 확인해라 — 이 판단만은 SAM 을 한 번 더 불러 채점하지 않는다(토큰 절약).');
}

if (process.argv.includes('--live')) await liveProbe();
