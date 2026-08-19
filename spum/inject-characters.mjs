// inject-characters.mjs
// SPUM Studio에 캐릭터 6종을 주입한다.
//   node spum/inject-characters.mjs
//
// 절차:
//  1. Chrome 프로필 복사본으로 브라우저 실행
//  2. SPUM Studio 접속 (로그인 필요 시 수동 로그인 대기)
//  3. cast.json 읽어서 sv_studio_characters_v1 에 주입
//  4. spum:studio-storage-write 이벤트 발생 → 서버 저장

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const STUDIO_URL = 'https://spum.soonsoon.ai/studio/?section=character';

// ── cast.json 로드 ─────────────────────────────────────────
const castRaw = JSON.parse(fs.readFileSync(path.join(DIR, 'cast.json'), 'utf8'));

// ── SPUM Studio 캐릭터 형식으로 변환 ───────────────────────
// CLAUDE.md §3-1: sv_studio_characters_v1 에 쓴 뒤 이벤트 발생
function makeStudioCharacter(c) {
  const charId = `CHAR_${c.id}_${Date.now().toString(36)}`;
  return {
    id: charId,
    characterName: c.name,
    name: c.name,
    tags: c.tags || [],
    persona: c.persona || {},
    appearance: {
      equipment: c.appearance?.equipment || {},
      colors: c.appearance?.colors || {},
      maskEnabled: c.appearance?.maskEnabled ?? true,
    },
    scale: c.scale || 1.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── 메인 ────────────────────────────────────────────────────
async function main() {
  console.log('[inject] 브라우저 실행...');
  console.log('[inject] 프로필:', PROFILE);

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();

  // SPUM Studio 접속
  console.log('[inject] SPUM Studio 접속:', STUDIO_URL);
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 로그인 확인 — 쿠키/세션 여부
  const loginCheck = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/me');
      const j = await r.json();
      return j.user ? 'logged_in' : 'not_logged_in';
    } catch { return 'unknown'; }
  });

  if (loginCheck !== 'logged_in') {
    console.log('[inject] ⚠️  로그인 안 됨. 30초 대기...');
    // 최대 30초 동안 로그인 대기 (1초마다 체크)
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const check = await page.evaluate(async () => {
        try { const r = await fetch('/api/me'); const j = await r.json(); return !!j.user; }
        catch { return false; }
      });
      if (check) { console.log('[inject] 로그인 확인'); break; }
    }
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }

  console.log('[inject] 로그인 확인됨. 캐릭터 주입 시작...');

  // 기존 캐릭터 백업
  const existing = await page.evaluate(() => {
    return localStorage.getItem('sv_studio_characters_v1') || '{}';
  });
  const backupPath = path.join(DIR, 'characters-backup.json');
  fs.writeFileSync(backupPath, existing);
  console.log('[inject] 기존 캐릭터 백업:', backupPath);

  // 캐릭터 주입
  const characters = {};
  for (const c of castRaw) {
    const sc = makeStudioCharacter(c);
    characters[sc.id] = sc;
    console.log(`[inject]   + ${c.name} (${sc.id})`);
  }

  const result = await page.evaluate((chars) => {
    const key = 'sv_studio_characters_v1';
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    // 기존 캐릭터에 추가 (덮어쓰기)
    const merged = { ...existing, ...chars };
    localStorage.setItem(key, JSON.stringify(merged));
    // 이벤트 발생 — CLAUDE.md §3-1
    window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key } }));
    return { count: Object.keys(merged).length, newCount: Object.keys(chars).length };
  }, characters);

  console.log(`[inject] 주입 완료: 기존 ${result.count - result.newCount}개 + 새 ${result.newCount}개 = ${result.count}개`);

  // 서버 저장 시도
  console.log('[inject] 서버 저장 시도...');
  const saved = await page.evaluate(async () => {
    if (window.spumStudioData?.saveServerSnapshot) {
      await window.spumStudioData.saveServerSnapshot('manual');
      return true;
    }
    return false;
  });

  if (saved) {
    console.log('[inject] ✅ 서버 저장 완료');
  } else {
    console.log('[inject] ⚠️  서버 저장 실패 — 수동 저장이 필요할 수 있다');
  }

  // 확인: localStorage 에 제대로 들어갔는지
  const verify = await page.evaluate(() => {
    const key = 'sv_studio_characters_v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.values(data).map(c => ({
      id: c.id,
      name: c.characterName || c.name,
      hasEquipment: !!c.appearance?.equipment,
      equipmentKeys: Object.keys(c.appearance?.equipment || {}),
    }));
  });

  console.log('[inject] 확인:');
  for (const v of verify) {
    console.log(`  ${v.name}: equipment [${v.equipmentKeys.join(', ')}]`);
  }

  console.log('[inject] 확인 완료. 3초 후 브라우저 닫힘...');
  await page.waitForTimeout(3000);

  await context.close();
  console.log('[inject] 완료');
}

main().catch(e => {
  console.error('[inject] 오류:', e.message);
  process.exit(1);
});
