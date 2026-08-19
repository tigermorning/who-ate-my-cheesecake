// check-play.mjs
// play.html 을 실제 브라우저로 열어 SPUM 런타임이 캐릭터를 그리는지 검증한다.
//   node spum/check-play.mjs          → 브라우저를 열어둔다
//   node spum/check-play.mjs --close  → 검증 후 닫는다
//
// Studio 창과 프로필이 겹치면 크롬이 잠기므로 전용 프로필을 쓴다.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-play-profile');
const URL_ = process.env.PLAY_URL || 'http://127.0.0.1:8790/';
const CLOSE_AT_END = process.argv.includes('--close');
const WAIT_MS = Number(process.env.WAIT_MS || 20000);

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();

  const logs = [], errors = [], failed = [];
  page.on('console', m => {
    const t = m.text();
    logs.push(`${m.type()}: ${t}`);
    if (m.type() === 'error') errors.push(t);
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('crash', () => errors.push('⚠️ 페이지 크래시'));
  page.on('requestfailed', r => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 110)}`));
  page.on('response', r => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`); });

  console.log('[play] 접속:', URL_);
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // 캐릭터 고르기 창이 뜨면 하나 고른다 (기본: 첫 번째)
  const pickName = process.env.PICK || '';
  try {
    await page.waitForSelector('#dlg[open] .sel button', { timeout: 15000 });
    const btns = page.locator('#dlg[open] .sel button');
    const cnt = await btns.count();
    let idx = 0;
    if (pickName) {
      for (let i = 0; i < cnt; i++) {
        if ((await btns.nth(i).textContent() || '').includes(pickName)) { idx = i; break; }
      }
    }
    const label = (await btns.nth(idx).textContent() || '').trim();
    await btns.nth(idx).click();
    console.log(`[play] 캐릭터 선택: ${label} (총 ${cnt}종)`);
  } catch { console.log('[play] ⚠️ 캐릭터 고르기 창이 안 떴다'); }

  console.log(`[play] ${WAIT_MS / 1000}초 대기하며 런타임이 뜨는지 본다...`);
  await page.waitForTimeout(WAIT_MS);

  // ── 캔버스가 실제로 뭔가 그렸는지 픽셀로 확인 ──
  const canvasInfo = await page.evaluate(() => {
    const out = {};
    for (const id of ['bg', 'scene', 'overlay']) {
      const cv = document.getElementById(id);
      if (!cv) { out[id] = { exists: false }; continue; }
      let painted = null, distinct = null;
      try {
        const g = cv.getContext('2d');
        if (g) {
          const d = g.getImageData(0, 0, cv.width, cv.height).data;
          let n = 0; const seen = new Set();
          for (let i = 0; i < d.length; i += 4 * 37) {          // 성기게 표본
            if (d[i + 3] !== 0) { n++; seen.add(`${d[i]},${d[i+1]},${d[i+2]}`); }
          }
          painted = n; distinct = seen.size;
        } else painted = 'ctx2d 아님(webgl일 수 있다)';
      } catch (e) { painted = '읽기 실패: ' + e.message; }
      out[id] = { exists: true, w: cv.width, h: cv.height, painted, distinct };
    }
    return out;
  });
  console.log('[play] 캔버스:', JSON.stringify(canvasInfo, null, 1));

  const spumLogs = logs.filter(l => l.includes('[SPUM]'));
  console.log(`[play] SPUM 로그 ${spumLogs.length}줄:`);
  for (const l of spumLogs.slice(0, 15)) console.log('   ', l.slice(0, 160));

  const uniqErr = [...new Set(errors)];
  console.log(`[play] 콘솔 오류 ${uniqErr.length}종:`);
  for (const e of uniqErr.slice(0, 15)) console.log('   ✗', e.slice(0, 160));

  const uniqFail = [...new Set(failed)];
  console.log(`[play] 실패한 요청 ${uniqFail.length}종:`);
  for (const f of uniqFail.slice(0, 15)) console.log('   ✗', f);

  const animMiss = logs.filter(l => l.includes('No animation for state')).length;
  console.log(`[play] "No animation for state" 발생: ${animMiss}회`);

  const shots = path.join(DIR, 'screenshots');
  fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, '02-play.png') });
  console.log('[play] 스크린샷: screenshots/02-play.png');

  if (CLOSE_AT_END) { await context.close(); console.log('[play] 닫았다.'); }
  else { console.log('[play] 브라우저는 열어둔다 — 직접 조작해 봐라.'); await new Promise(() => {}); }
}

main().catch(e => { console.error('[play] 오류:', e.stack || e.message); process.exit(1); });
