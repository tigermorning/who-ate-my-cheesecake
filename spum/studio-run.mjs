// 로그인을 기다렸다가 맵 테마를 끝까지 만든다. 크롬은 절대 닫지 않는다.
//   node spum/studio-run.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const SHOTS = 'spum/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const shot = n => page.screenshot({ path: path.join(SHOTS, n) }).catch(() => {});

const b = await chromium.connectOverCDP(process.env.SPUM_CDP || 'http://127.0.0.1:9222');
const ctx = b.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const setVal = (f, sel, val) => f.evaluate(([s, v]) => {
  const el = document.querySelector(s); if (!el) return 'no:' + s;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement : (el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement);
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok';
}, [sel, val]);

// ── 1. 로그인을 기다린다 ────────────────────────────────────
console.log('로그인을 기다린다 (최대 20분)…');
let user = null;
for (let i = 0; i < 240; i++) {
  const me = await page.evaluate(() => fetch('/api/me').then(r => r.json()).catch(() => ({}))).catch(() => ({}));
  if (me && me.user) { user = me.user; break; }
  if (i % 12 === 0) console.log(`  …${i * 5}초`);
  await page.waitForTimeout(5000);
}
if (!user) { console.log('로그인이 안 됐다. 여기서 멈춘다.'); process.exit(2); }
console.log('로그인 확인:', JSON.stringify(user).slice(0, 80));

await page.goto('https://spum.soonsoon.ai/studio/?section=object', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(9000);

// ── 2. 안내 창을 닫는다 ─────────────────────────────────────
for (const name of [/건너뛰기/, /확인/, /^×$/]) {
  const btn = page.getByRole('button', { name }).first();
  if (await btn.count().catch(() => 0)) { await btn.click().catch(() => {}); await page.waitForTimeout(700); }
}
await shot('20-logged-in.png');

// ── 3. 테마 SMO 를 찾거나 만든다 ────────────────────────────
const NAME = 'Who Ate My Cheesecake? · 집';
let found = await page.evaluate((n) => {
  const cards = [...document.querySelectorAll('[class*=card],li,button')];
  const hit = cards.find(c => (c.textContent || '').includes('Who Ate My'));
  if (hit) { hit.click(); return true; }
  return false;
}, NAME);
if (!found) {
  console.log('테마가 없다 — New SMO 로 만든다');
  await page.getByRole('button', { name: /New SMO/i }).first().click().catch(async () => {
    await page.locator('button:has-text("+")').first().click();
  });
  await page.waitForTimeout(3500);
}
await page.waitForTimeout(2500);
await shot('21-theme-open.png');

// ── 4. 채우고 생성한다 ──────────────────────────────────────
const PROMPT = [
  'top-down 3/4 view tileset sheet for a bright cozy family house and garden, 16x16 grid of square tiles,',
  'each cell one seamless tile, warm sunny daylight, soft shadows, painterly pixel art, high detail,',
  'floors: honey oak plank floor, wide light wood floor, cream stone kitchen floor, pale blue bathroom tile,',
  'patterned wool rugs in warm red and cool blue, green lawn grass, flowering grass, grey stone path, dark garden soil,',
  'walls: cream plaster wall top and front face with oak trim, stone footing, white picket fence, window with blue glass, wooden door,',
  'furniture: tall steel refrigerator, stove with pots, kitchen counter with sink, kitchen island, long dining table,',
  'wooden chairs, stone fireplace with fire, long cream sofa, corner sofa, armchair, coffee table, tall bookshelf full of books,',
  'writing desk, bathtub, toilet, potted plants, floor lamp, wooden cabinet, raised vegetable beds, watering can,',
  'deck boards with parasol table, weight bench and dumbbells, wooden shed crates and baskets,',
  'no text, no characters, no borders between tiles',
].join(' ');
console.log(await setVal(ed(), '#resourceThemeNameInput', NAME).catch(e => 'name 실패'));
console.log(await setVal(ed(), '#resourcePromptInput', PROMPT).catch(e => 'prompt 실패'));
await page.waitForTimeout(1200);
await ed().getByRole('button', { name: /Generate/i }).first().click();
console.log('Generate 눌렀다. 기다린다…');

const t0 = Date.now();
let ok = false;
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(9000);
  let st;
  try {
    st = await ed().evaluate(() => ({
      none: /아직 생성된 레퍼런스 이미지가 없습니다|No results/.test(document.body.innerText),
      busy: /진행중|Stop/.test(document.body.innerText),
      thumbs: [...document.querySelectorAll('img')].filter(im => im.naturalWidth > 200).length,
    }));
  } catch { console.log('  (프레임이 갈렸다)'); continue; }
  if (!st.none && st.thumbs > 0) { ok = true; console.log(`${Math.round((Date.now() - t0) / 1000)}초 만에 이미지가 붙었다 (${st.thumbs}장)`); break; }
  if (i % 4 === 0) console.log(`  …${Math.round((Date.now() - t0) / 1000)}초 none=${st.none} busy=${st.busy}`);
}
await shot('22-generated.png');
if (!ok) { console.log('이미지가 안 왔다.'); process.exit(3); }

// ── 5. 자르고 분류한다 ──────────────────────────────────────
console.log('레퍼런스 선택:', await ed().evaluate(() => {
  const im = [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 200).pop();
  if (!im) return 'none';
  (im.closest('button,[role=button],li,div[class*=card]') || im).click();
  return im.src.slice(0, 46);
}));
await page.waitForTimeout(2500);
await ed().getByRole('button', { name: /Slice/i }).first().click();
await page.waitForTimeout(14000);
await shot('23-sliced.png');
console.log('Slice 완료. Classify 간다');
await ed().getByRole('button', { name: /Classify/i }).first().click();
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(9000);
  let n = '0';
  try { n = await ed().evaluate(() => (document.body.innerText.match(/(\d+)\s*tiles/) || [0, '0'])[1]); } catch { continue; }
  if (i % 3 === 0) console.log('  타일', n);
  if (Number(n) > 0) { console.log('분류 끝. 타일', n); break; }
}
await shot('24-classified.png');
console.log('끝. 창은 그대로 둔다');
process.exit(0);
