// test-spum-render2.mjs
// SPUM Studio 캐릭터 표시 확인 + Cast Export 탐색
//   node spum/test-spum-render2.mjs

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');

async function main() {
  console.log('[test2] 브라우저 실행...');
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('[test2] SPUM Studio 접속...');
  await page.goto('https://spum.soonsoon.ai/studio/?section=character', {
    waitUntil: 'networkidle', timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // 로그인 확인
  const loggedIn = await page.evaluate(async () => {
    try { const r = await fetch('/api/me'); const j = await r.json(); return !!j.user; }
    catch { return false; }
  });
  console.log('[test2] 로그인:', loggedIn ? 'OK' : 'FAIL');
  if (!loggedIn) { await context.close(); return; }

  // localStorage 확인
  const localData = await page.evaluate(() => {
    const key = 'sv_studio_characters_v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.values(data).map(c => c.characterName || c.name);
  });
  console.log('[test2] localStorage 캐릭터:', localData);

  // spumStudioData 확인
  const studioApi = await page.evaluate(() => {
    const api = window.spumStudioData;
    if (!api) return null;
    return {
      methods: Object.keys(api).filter(k => typeof api[k] === 'function'),
      hasExport: typeof api.export === 'function',
      hasImport: typeof api.import === 'function',
      hasSaveServer: typeof api.saveServerSnapshot === 'function',
    };
  });
  console.log('[test2] spumStudioData API:', JSON.stringify(studioApi, null, 2));

  // spumStudioData.export()로 전체 데이터 확인
  const exportedData = await page.evaluate(() => {
    if (!window.spumStudioData?.export) return null;
    const data = window.spumStudioData.export();
    // 캐릭터 키 확인
    const keys = Object.keys(data);
    const charKey = keys.find(k => k.includes('character'));
    const charData = charKey ? data[charKey] : null;
    const charCount = charData ? Object.keys(JSON.parse(typeof charData === 'string' ? charData : JSON.stringify(charData))).length : 0;
    return {
      topKeys: keys,
      charKey,
      charCount,
    };
  });
  console.log('[test2] export 데이터:', JSON.stringify(exportedData, null, 2));

  // 페이지 새로고침 후 캐릭터 확인
  console.log('[test2] 페이지 새로고침...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // 다시 확인
  const afterReload = await page.evaluate(() => {
    const bodyText = document.body?.innerText || '';
    const hasNoCharacters = bodyText.includes('캐릭터가 없습니다');
    const charRows = document.querySelectorAll('.spum-resource-list__row:not(.spum-resource-list__row--create)');
    return {
      hasNoCharacters,
      charRowCount: charRows.length,
      charRowTexts: [...charRows].map(r => r.textContent?.trim().substring(0, 50)),
      bodySnippet: bodyText.substring(0, 600),
    };
  });
  console.log('[test2] 새로고침 후:', JSON.stringify(afterReload, null, 2));

  // 캐릭터가 있다면 첫 번째 클릭
  if (afterReload.charRowCount > 0) {
    console.log('[test2] 첫 번째 캐릭터 클릭...');
    const firstRow = page.locator('.spum-resource-list__row:not(.spum-resource-list__row--create)').first();
    await firstRow.click();
    await page.waitForTimeout(2000);

    // 캐릭터 에디터 정보
    const editorInfo = await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';
      // Export 버튼 찾기
      const exportBtns = [];
      document.querySelectorAll('button, [role="button"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && (text.includes('Export') || text.includes('export') || text.includes('추출') ||
                     text.includes('Generate') || text.includes('generate') || text.includes('Sprite'))) {
          exportBtns.push({ text: text.substring(0, 50), tag: el.tagName, class: el.className?.substring(0, 50) });
        }
      });
      return {
        exportBtns,
        bodySnippet: bodyText.substring(0, 800),
      };
    });
    console.log('[test2] 편집기:', JSON.stringify(editorInfo, null, 2));
  }

  await page.waitForTimeout(2000);
  await context.close();
  console.log('[test2] 완료');
}

main().catch(e => {
  console.error('[test2] 오류:', e.message);
  process.exit(1);
});
