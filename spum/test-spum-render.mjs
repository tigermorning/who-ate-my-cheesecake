// test-spum-render.mjs
// SPUM 런타임이 캐릭터를 제대로 렌더링하는지 테스트
//   node spum/test-spum-render.mjs

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');

async function main() {
  console.log('[render] 브라우저 실행...');
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1200, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();

  // SPUM Studio 캐릭터 페이지 접속
  console.log('[render] SPUM Studio 접속...');
  await page.goto('https://spum.soonsoon.ai/studio/?section=character', {
    waitUntil: 'networkidle', timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // 로그인 확인
  const loggedIn = await page.evaluate(async () => {
    try { const r = await fetch('/api/me'); const j = await r.json(); return !!j.user; }
    catch { return false; }
  });
  console.log('[render] 로그인:', loggedIn ? 'OK' : 'FAIL');
  if (!loggedIn) { await context.close(); return; }

  // localStorage에서 캐릭터 확인
  const charCount = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('sv_studio_characters_v1') || '{}');
    return Object.keys(data).length;
  });
  console.log(`[render] 캐릭터 수: ${charCount}`);

  // 캐릭터 에디터 UI 구조 확인
  const uiInfo = await page.evaluate(() => {
    // 캐릭터 목록 찾기
    const allElements = document.querySelectorAll('*');
    const classNames = new Set();
    for (const el of allElements) {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(c => {
          if (c.toLowerCase().includes('char') || c.toLowerCase().includes('list') ||
              c.toLowerCase().includes('cast') || c.toLowerCase().includes('editor')) {
            classNames.add(c);
          }
        });
      }
    }

    // 캐릭터 관련 텍스트를 가진 버튼/링크
    const buttons = [];
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      const text = el.textContent?.trim().substring(0, 50);
      if (text && (text.includes('캐릭터') || text.includes('Cast') || text.includes('Export') ||
                   text.includes('캐스트') || text.includes('export') || text.includes('캐릭터만들기'))) {
        buttons.push({ tag: el.tagName, text, class: el.className?.substring(0, 50) });
      }
    });

    // 모든 nav/menu 아이템
    const navItems = [];
    document.querySelectorAll('nav a, .nav a, [class*="menu"] a, [class*="sidebar"] a').forEach(el => {
      navItems.push({ text: el.textContent?.trim().substring(0, 30), href: el.href });
    });

    return {
      relevantClasses: [...classNames].slice(0, 20),
      buttons: buttons.slice(0, 10),
      navItems: navItems.slice(0, 20),
      title: document.title,
      bodyText: document.body?.innerText?.substring(0, 500),
    };
  });

  console.log('[render] 페이지:', uiInfo.title);
  console.log('[render] 관련 클래스:', uiInfo.relevantClasses);
  console.log('[render] 버튼:', JSON.stringify(uiInfo.buttons, null, 2));
  console.log('[render] 네비게이션:', JSON.stringify(uiInfo.navItems, null, 2));
  console.log('[render] 본문 미리보기:', uiInfo.bodyText?.substring(0, 300));

  // 캐릭터 목록이 보이는지 확인
  const charListInfo = await page.evaluate(() => {
    // 캐릭터 이름이 포함된 요소 찾기
    const nameElements = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent?.trim();
      if (text === '하루' || text === '미나' || text === '코코' || text === '루루' || text === '피치' || text === '루비') {
        const parent = walker.currentNode.parentElement;
        nameElements.push({
          text,
          tag: parent?.tagName,
          class: parent?.className?.substring(0, 50),
          parentTag: parent?.parentElement?.tagName,
          parentClass: parent?.parentElement?.className?.substring(0, 50),
        });
      }
    }
    return nameElements;
  });

  console.log('[render] 캐릭터 이름 요소:', JSON.stringify(charListInfo, null, 2));

  await page.waitForTimeout(2000);
  await context.close();
  console.log('[render] 완료');
}

main().catch(e => {
  console.error('[render] 오류:', e.message);
  process.exit(1);
});
