// check-step5.mjs
// Step 5 검증 — NPC 기억이 늘어나는지, 소문이 오가는지, 엿듣기가 증언판에 오르는지.
//   node spum/check-step5.mjs          → 브라우저를 열어둔다
//   node spum/check-step5.mjs --close  → 검증 후 닫는다
// ⚠️ Windows node 로 돌려야 프로필이 맞는다.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA || '/tmp', 'spum-play-profile');
const URL_ = process.env.PLAY_URL || 'http://127.0.0.1:8790/spum/play.html';
const CLOSE_AT_END = process.argv.includes('--close');
const WAIT_MS = Number(process.env.WAIT_MS || 40000);

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false, viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();
  const errors = [], failed = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' @ ' + (m.location()?.url || '').slice(0, 90)); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 100)}`));
  page.on('response', r => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 100)}`); });

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#dlg[open] .sel button', { timeout: 15000 });
  const label = (await page.locator('#dlg[open] .sel button').first().textContent() || '').trim();
  await page.locator('#dlg[open] .sel button').first().click();
  console.log('[step5] 캐릭터 선택:', label);

  // 소문이 나는 자리로 플레이어를 옮겨 가며 본다 — 엿듣기는 가까워야 걸린다
  const follow = () => page.evaluate(() => {
    const g = window.__wamc; if (!g) return null;
    const ids = Object.keys(g.npcState);
    let best = null, bd = 1e9;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = g.npcState[ids[i]], b = g.npcState[ids[j]];
      const d = Math.hypot(a.gx - b.gx, a.gy - b.gy);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) g.warp(best.gx, best.gy);
    return bd;
  });

  // 시각을 몇 번 넘겨 NPC 를 같은 방으로 모은다 — 소문은 마주쳐야 난다
  const snaps = [];
  for (let round = 0; round < 6; round++) {
    await page.click('#btnNextHour').catch(() => {});
    for (let k = 0; k < 5; k++) { await follow(); await page.waitForTimeout(WAIT_MS / 30); }
    snaps.push(await page.evaluate(() => ({
      gossip: document.querySelector('#pillGossip')?.textContent,
      time: document.querySelector('#pillTime')?.textContent,
      roster: [...document.querySelectorAll('#roster .who span')].map(e => e.textContent),
    })));
  }
  const last = snaps[snaps.length - 1];
  console.log('[step5] 시각:', last.time, '|', last.gossip);
  console.log('[step5] 기억 추이:');
  snaps.forEach((s, i) => console.log(`   ${i}) ${s.gossip} — ` + s.roster.map(r => r.split('·').slice(-1)[0].trim()).join(' | ')));

  // 플레이어는 손으로 친다 — NPC 는 SAM 으로 답한다
  await page.locator('#roster .who').first().click();
  const asks = ['어젯밤 어디 있었어?', '너 혹시 치즈케이크 먹었어?', '요즘 잘 지내? 빵은 잘 구워지고?'];
  for (const q of asks) {
    const before = await page.locator('.msg.npc').count();
    await page.fill('#say', q);
    await page.click('#send');
    await page.waitForFunction(n => document.querySelectorAll('.msg.npc').length > n, before, { timeout: 45000 }).catch(() => {});
    const last = await page.locator('.msg.npc').last().textContent();
    console.log(`[step5] 나: ${q}`);
    console.log(`[step5]  → ${(last || '(무응답)').trim().slice(0, 120)}`);
  }

  // 엿들은 줄이 대화창에 떴는가
  const heard = await page.evaluate(() => [...document.querySelectorAll('.msg.sys')].map(e => e.textContent));
  console.log(`[step5] 엿들은 줄 ${heard.length}개`);
  heard.slice(-5).forEach(h => console.log('   ·', h.slice(0, 90)));

  // 증언판에 전언이 올라갔는가
  const board = await page.evaluate(() => {
    const tds = [...document.querySelectorAll('#board td')];
    const filled = tds.filter(td => td.title);
    return { total: tds.length, filled: filled.length, sample: filled.slice(0, 6).map(td => td.title.replace(/\n/g, ' / ').slice(0, 70)) };
  });
  console.log(`[step5] 증언판 ${board.filled}/${board.total} 칸에 기록`);
  console.log('[step5] #board 속:', await page.evaluate(() => (document.querySelector('#board')?.innerHTML || '(없음)').slice(0, 160)));
  board.sample.forEach(b => console.log('   ·', b));

  console.log(`[step5] 콘솔 오류 ${[...new Set(errors)].length}종`);
  [...new Set(errors)].slice(0, 8).forEach(e => console.log('   ✗', e.slice(0, 140)));
  console.log(`[step5] 실패한 요청 ${[...new Set(failed)].length}종`);
  [...new Set(failed)].slice(0, 8).forEach(f => console.log('   ✗', f));

  const shots = path.join(DIR, 'screenshots');
  fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, '03-step5.png'), fullPage: true });
  await page.locator('#stage').screenshot({ path: path.join(shots, '04-map.png') });
  console.log('[step5] 스크린샷: screenshots/03-step5.png');

  if (CLOSE_AT_END) { await context.close(); console.log('[step5] 닫았다.'); }
  else { console.log('[step5] 브라우저는 열어둔다.'); await new Promise(() => {}); }
}
main().catch(e => { console.error('[step5] 오류:', e.stack || e.message); process.exit(1); });
