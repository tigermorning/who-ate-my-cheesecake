// check-characters.mjs
// SPUM Studio에서 캐릭터 외형을 확인하고 스크린샷을 찍는다.
//   node spum/check-characters.mjs

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const STUDIO_URL = 'https://spum.soonsoon.ai/studio/?section=character';
const SCREENSHOT_DIR = path.join(DIR, 'screenshots');

// 캐릭터 ID 목록
const TARGET_IDS = ['sgn_haru', 'sgn_mina', 'sgn_coco', 'sgn_lulu', 'sgn_peach', 'sgn_ruby'];

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('[check] 브라우저 실행...');
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('[check] SPUM Studio 접속...');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 로그인 확인
  const loggedIn = await page.evaluate(async () => {
    try { const r = await fetch('/api/me'); const j = await r.json(); return !!j.user; }
    catch { return false; }
  });
  if (!loggedIn) {
    console.log('[check] ❌ 로그인 안 됨. 브라우저에서 로그인 후 스크립트를 다시 실행하세요.');
    await context.close();
    return;
  }
  console.log('[check] 로그인 확인됨');

  // localStorage에서 캐릭터 목록 확인
  const chars = await page.evaluate(() => {
    const key = 'sv_studio_characters_v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.values(data).map(c => ({
      id: c.id,
      name: c.characterName || c.name,
      rawId: c.id.split('_').slice(1, -1).join('_'), // CHAR_sgn_haru_xxx → sgn_haru
      equipment: c.appearance?.equipment || {},
      colors: c.appearance?.colors || {},
    }));
  });

  console.log(`[check] 총 ${chars.length}개 캐릭터:`);
  for (const c of chars) {
    const eq = Object.entries(c.equipment).map(([k, v]) => `${k}:${v}`).join(', ');
    console.log(`  ${c.name} (${c.id}): [${eq}]`);
  }

  // 캐릭터 에디터에서 각 캐릭터 스크린샷
  // SPUM Studio 캐릭터 에디터: 좌측 목록에서 캐릭터 클릭 → 중앙 미리보기
  const charList = page.locator('.character-list, [class*="characterList"], [class*="char-list"]');

  // 전체 캐릭터 목록 스크린샷
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-all-characters.png'), fullPage: false });
  console.log('[check] 전체 화면 스크린샷 저장');

  // 각 타겟 캐릭터를 목록에서 클릭
  for (const targetId of TARGET_IDS) {
    const found = chars.find(c => c.rawId === targetId || c.id.includes(targetId));
    if (!found) {
      console.log(`[check] ⚠️  ${targetId} 없음`);
      continue;
    }

    // 캐릭터 이름으로 목록 항목 클릭 시도
    const listItem = page.locator(`text="${found.name}"`).first();
    if (await listItem.count() > 0) {
      await listItem.click();
      await page.waitForTimeout(1500);
      const shotPath = path.join(SCREENSHOT_DIR, `${targetId}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`[check] ✅ ${found.name} 스크린샷 → ${shotPath}`);
    } else {
      console.log(`[check] ⚠️  ${found.name} 목록에서 못 찾음`);
    }
  }

  // 캐릭터 상세 정보 출력
  console.log('\n[check] 캐릭터 상세:');
  for (const c of chars.filter(c => TARGET_IDS.some(t => c.id.includes(t)))) {
    console.log(`\n--- ${c.name} (${c.id}) ---`);
    console.log('  equipment:', JSON.stringify(c.equipment, null, 2));
    console.log('  colors:', JSON.stringify(c.colors, null, 2));
  }

  console.log('\n[check] 완료. 브라우저를 닫는다...');
  await page.waitForTimeout(2000);
  await context.close();
}

main().catch(e => {
  console.error('[check] 오류:', e.message);
  process.exit(1);
});
