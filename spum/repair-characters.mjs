// repair-characters.mjs
// SPUM Studio 캐릭터 저장소를 복구하고 캐스트 6종을 제대로 주입한다.
//   node spum/repair-characters.mjs          → 브라우저를 열어둔 채 끝난다 (눈으로 확인용)
//   node spum/repair-characters.mjs --close  → 확인 후 브라우저를 닫는다
//
// 왜 필요한가 (inject-characters.mjs 의 결함 2가지):
//  ① sv_studio_characters_v1 은 "배열"인데 {...existing, ...chars} 로 병합해서
//     객체(map)로 바뀌었다 → Studio 가 못 읽어서 "캐릭터가 없습니다" 가 떴다.
//  ② 주입한 캐릭터가 schemaVersion 2 스키마를 안 지켰다 (animation/profiles/aiConfig/
//     talkConfig/runtime/memory/meta 없음) → [Animator] No animation for state: IDLE 의 원인.
//
// 절차는 CLAUDE.md §3-1 그대로: 백업 → 로컬 쓰기 → 이벤트 → 서버 저장 → 새로고침.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// SPUM Studio 의 모델 칸. 비워 두면 런타임이 등급 이름을 SAM 에 그대로 보낸다.
const SAM_MODEL = 'claude-sonnet-4.6';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const STUDIO_URL = 'https://spum.soonsoon.ai/studio/?section=character';
const KEY = 'sv_studio_characters_v1';
const CLOSE_AT_END = process.argv.includes('--close');

const cast = JSON.parse(fs.readFileSync(path.join(DIR, 'cast.json'), 'utf8'));
// 주입 직전에 뜬 원본 배열 (캐릭터 5종, schemaVersion 2)
const pristine = JSON.parse(fs.readFileSync(path.join(DIR, 'characters-backup.json'), 'utf8'));
if (!Array.isArray(pristine)) throw new Error('characters-backup.json 이 배열이 아니다 — 복구 기준이 없다');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

// ── 템플릿: 원본 캐릭터 하나를 통째로 복제해 스키마를 그대로 물려받는다 ──
const template = pristine.find(c => c.animation?.idle) || pristine[0];
const clone = o => JSON.parse(JSON.stringify(o));

function buildCharacter(c) {
  const t = clone(template);
  const now = new Date().toISOString();

  t.id = `CHAR_${c.id}`;              // 결정론적 ID — 다시 돌려도 중복이 안 생긴다
  t.name = c.name;
  t.tags = c.tags || [];
  t.version = '1.0.0';
  t.history = [{ at: now, by: t.createdBy, byName: t.createdByName, action: 'create' }];

  // persona — 템플릿 모양을 유지한 채 cast.json 값으로 덮는다
  t.persona = {
    ...t.persona,
    gender: c.persona?.gender ?? t.persona.gender,
    personality: c.persona?.personality ?? [],
    speechStyle: c.persona?.speechStyle ?? '',
    background: c.persona?.background ?? '',
    occupation: c.persona?.occupation ?? t.persona.occupation,
    mbti: c.persona?.mbti ?? t.persona.mbti,
    traits: c.persona?.traits ?? [],
    traits: [],
  };

  // appearance — cast.json 이 정본. 템플릿의 낡은 장비/색은 버린다
  t.appearance = {
    ...t.appearance,
    equipment: { ...(c.appearance?.equipment || {}) },
    colors: { ...(c.appearance?.colors || {}) },
    maskEnabled: c.appearance?.maskEnabled ?? true,
  };

  // animation 은 템플릿 것을 그대로 쓴다 (legacy 바디용 idle/move/rest/sleep 세트)
  // → 이게 있어야 [Animator] No animation for state: IDLE 이 안 뜬다

  t.aiConfig = {
    ...t.aiConfig,
    model: SAM_MODEL,
    enabled: true,
    decisionMode: 'local_fsm',
    extraPrompt: c.persona?.speechStyle || '',
    role: { title: c.persona?.occupation || '', goal: '' },
    state: { ...t.aiConfig.state, currentSituation: '', updatedAt: '' },
  };
  // 모델 자리를 비워 두면 런타임이 등급 이름(`medium`)을 보내고 SAM 이 404 를 준다.
  t.talkConfig = { model: SAM_MODEL, systemPrompt: '' };   // 대화 자체는 SAM 직접 호출로 간다 (CLAUDE.md ⛔3)

  // 남의 기억을 물려받으면 안 된다 — 전부 비운다
  t.runtime = { ...t.runtime, mood: 'happy', energy: 100, activity: 'idle', lastThought: '' };
  t.memory = { ...t.memory, summary: '', engram: '', recent: [], creatorMessages: [], relationships: {} };
  t.profiles = clone(t.profiles);
  t.profiles.village = { ...t.profiles.village, role: 'Villager', schedule: [] };

  t.meta = { createdAt: now, updatedAt: now };
  return t;
}

async function main() {
  console.log('[repair] 프로필:', PROFILE);
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();

  page.on('console', m => { if (m.type() === 'error') console.log('  [브라우저 오류]', m.text().slice(0, 160)); });
  page.on('crash', () => console.log('  ⚠️ [페이지 크래시]'));
  page.on('close', () => console.log('  [페이지 닫힘]'));

  console.log('[repair] Studio 접속...');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const loggedIn = await page.evaluate(async () => {
    try { const r = await fetch('/api/me'); const j = await r.json(); return !!j.user; } catch { return false; }
  });
  console.log('[repair] 로그인:', loggedIn ? '됨' : '안 됨');
  if (!loggedIn) {
    console.log('[repair] ❌ 세션 만료다. 브라우저에서 ACCOUNT → 다시 로그인 후 재실행해라. (CLAUDE.md ⛔2)');
    if (CLOSE_AT_END) await context.close();
    return;
  }

  // ── ① 현재 상태 백업 ──
  const before = await page.evaluate(k => localStorage.getItem(k) || 'null', KEY);
  const backupPath = path.join(DIR, `characters-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, before, 'utf8');
  const beforeParsed = JSON.parse(before);
  console.log(`[repair] 복구 전: ${Array.isArray(beforeParsed) ? '배열' : typeof beforeParsed} / 항목 ${Object.keys(beforeParsed || {}).length}개 → 백업 ${path.basename(backupPath)}`);

  // ── ② 올바른 배열 재구성 ──
  const rebuilt = [...clone(pristine), ...cast.map(buildCharacter)];
  console.log(`[repair] 재구성: 원본 ${pristine.length}종 + 캐스트 ${cast.length}종 = ${rebuilt.length}종`);
  for (const c of rebuilt.slice(pristine.length)) {
    console.log(`  + ${c.name} (${c.id}) idle=${c.animation?.idle || '없음'} helmet=${c.appearance.equipment.helmet}`);
  }

  // ── ③ 로컬 쓰기 → 이벤트 → 서버 저장 (CLAUDE.md §3-1) ──
  const wrote = await page.evaluate(async ({ key, arr }) => {
    localStorage.setItem(key, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key } }));
    let saved = 'no-api';
    try {
      if (window.spumStudioData?.saveServerSnapshot) {
        await window.spumStudioData.saveServerSnapshot('manual');
        saved = 'ok';
      }
    } catch (e) { saved = 'fail: ' + e.message; }
    return { len: JSON.parse(localStorage.getItem(key)).length, saved };
  }, { key: KEY, arr: rebuilt });
  console.log(`[repair] 로컬 쓰기 완료: ${wrote.len}종 / 서버 저장: ${wrote.saved}`);

  // ── ④ 새로고침해야 앱이 읽는다 ──
  console.log('[repair] 새로고침...');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  // ── ⑤ 검증: localStorage + 실제 화면 ──
  const after = await page.evaluate(k => {
    const raw = JSON.parse(localStorage.getItem(k) || 'null');
    return { isArray: Array.isArray(raw), len: Array.isArray(raw) ? raw.length : Object.keys(raw || {}).length };
  }, KEY);
  console.log(`[repair] 저장소 확인: ${after.isArray ? '배열 ✅' : '객체 ❌'} / ${after.len}종`);

  const emptyMsg = await page.getByText('캐릭터가 없습니다').count().catch(() => 0);
  console.log(`[repair] 화면 "캐릭터가 없습니다": ${emptyMsg > 0 ? '아직 뜬다 ❌' : '사라졌다 ✅'}`);

  const shots = path.join(DIR, 'screenshots');
  fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, '01-after-repair.png') });
  console.log('[repair] 스크린샷: screenshots/01-after-repair.png');

  const visible = [];
  for (const c of cast) {
    const n = await page.getByText(c.name, { exact: true }).count().catch(() => 0);
    if (n > 0) visible.push(c.name);
  }
  console.log(`[repair] 화면에 보이는 캐스트: ${visible.length}/${cast.length} ${visible.join(', ')}`);

  if (CLOSE_AT_END) {
    console.log('[repair] --close 지정됨. 브라우저를 닫는다.');
    await context.close();
  } else {
    console.log('[repair] ✅ 끝. 브라우저는 열어둔다 — 눈으로 확인해라. 닫으려면 창을 직접 닫아라.');
    await new Promise(() => {});   // 프로세스를 살려둬야 브라우저가 안 닫힌다
  }
}

main().catch(e => { console.error('[repair] 오류:', e.stack || e.message); process.exit(1); });
