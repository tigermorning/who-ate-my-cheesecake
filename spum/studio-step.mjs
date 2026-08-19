// Studio 를 한 걸음씩 몬다. 브라우저는 닫지 않는다.
//   node spum/studio-step.mjs <step> [--close]
// step: new | dump | theme | generate | slice | classify | save
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const STEP = process.argv[2] || 'dump';
const SHOTS = path.join(DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

// 이미 떠 있는 크롬에 붙는다. 스크립트가 끝나도 창은 살아 있다.
//   먼저 한 번만: chrome.exe --remote-debugging-port=9222 --user-data-dir=%TEMP%\spum-cdp-profile
const CDP = process.env.SPUM_CDP || 'http://127.0.0.1:9222';
let browser = null, ctx = null;
try {
  browser = await chromium.connectOverCDP(CDP);
  ctx = browser.contexts()[0];
  console.log('붙었다:', CDP);
} catch (e) {
  console.log('CDP 에 못 붙었다(' + e.message.slice(0, 60) + '). 새 창을 띄운다');
  ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1500, height: 950 } });
}
const pages = ctx.pages();
let page = pages.find(p => p.url().includes('spum.soonsoon.ai/studio')) || pages[0] || await ctx.newPage();
if (!page.url().includes('spum.soonsoon.ai/studio')) {
  await page.goto('https://spum.soonsoon.ai/studio/?section=object', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
}
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

const dump = async (f, tag) => {
  const r = await f.evaluate(() => {
    const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const t = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return {
      btns: [...new Set([...document.querySelectorAll('button')].filter(vis).map(t).filter(Boolean))].slice(0, 60),
      dlg: [...document.querySelectorAll('dialog[open],.modal,[role=dialog]')].filter(vis).map(t).slice(0, 4),
    };
  });
  console.log(`[${tag}] 버튼:`, r.btns.join(' | '));
  if (r.dlg.length) console.log(`[${tag}] 창:`, r.dlg.join(' /// ').slice(0, 600));
};

// React 가 물고 있는 입력칸은 네이티브 setter 로 넣고 이벤트를 쏴야 먹는다
const setVal = async (f, sel, val) => f.evaluate(([s, v]) => {
  const el = document.querySelector(s); if (!el) return 'no:' + s;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement : (el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement);
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok:' + s;
}, [sel, val]);

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

if (STEP === 'theme') {
  const f = ed();
  console.log(await setVal(f, '#resourceThemeNameInput', 'Who Ate My Cheesecake? · 집'));
  console.log(await setVal(f, '#resourcePresetSelect', 'forest'));   // 프리셋 먼저 — 나중에 바꾸면 프롬프트가 지워진다
  await page.waitForTimeout(1500);
  console.log(await setVal(f, '#resourcePromptInput', PROMPT));
  console.log(await setVal(f, '#resourceConceptInput', '밝고 아늑한 단층집과 마당. 부엌·욕실·거실·식당·서재와 데크·운동장·텃밭·헛간.'));
  await page.waitForTimeout(800);
  const now = await f.evaluate(() => ({
    name: document.querySelector('#resourceThemeNameInput')?.value,
    preset: document.querySelector('#resourcePresetSelect')?.value,
    prompt: (document.querySelector('#resourcePromptInput')?.value || '').slice(0, 70),
  }));
  console.log('상태:', JSON.stringify(now, null, 0));
  await page.screenshot({ path: path.join(SHOTS, '11-theme-filled.png') });
} else if (STEP === 'generate') {
  const f = ed();
  const t0 = Date.now();
  await f.getByRole('button', { name: /Generate/i }).first().click();
  console.log('Generate 눌렀다.');
  for (let i = 0; i < 48; i++) {
    await page.waitForTimeout(10000);
    const st = await f.evaluate(() => ({
      noRes: /아직 생성된 레퍼런스 이미지가 없습니다|No results/.test(document.body.innerText),
      err: (document.body.innerText.match(/(실패|error|failed)[^\n]{0,60}/i) || [''])[0],
    }));
    if (st.err) console.log('  ⚠', st.err);
    if (!st.noRes) { console.log(`${Math.round((Date.now() - t0) / 1000)}초 만에 결과가 붙었다`); break; }
    if (i % 3 === 0) console.log(`  …${Math.round((Date.now() - t0) / 1000)}초`);
  }
  await page.screenshot({ path: path.join(SHOTS, '12-generated.png') });
} else if (STEP === 'build') {
  // 한 세션에서 끝까지 간다. 중간에 브라우저를 닫으면 생성이 끊긴다.
  const f = ed();
  await setVal(f, '#resourceThemeNameInput', 'Who Ate My Cheesecake? · 집');
  await setVal(f, '#resourcePromptInput', PROMPT);
  await setVal(f, '#resourceConceptInput', '밝고 아늑한 단층집과 마당. 부엌·욕실·거실·식당·서재와 데크·운동장·텃밭·헛간.');
  await page.waitForTimeout(1200);
  await f.getByRole('button', { name: /Generate/i }).first().click();
  console.log('Generate 눌렀다. 이미지를 기다린다…');
  const t0 = Date.now();
  let ok = false;
  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(9000);
    let st;
    try {
      st = await ed().evaluate(() => {
        const txt = document.body.innerText;
        const thumbs = [...document.querySelectorAll('img')].filter(im => im.naturalWidth > 200).length;
        return { none: /아직 생성된 레퍼런스 이미지가 없습니다|No results/.test(txt),
                 busy: /진행중|Stop/.test(txt), thumbs };
      });
    } catch (e) { console.log('  (프레임이 갈렸다 — 다시 잡는다)'); continue; }
    if (!st.none && st.thumbs > 0) { ok = true; console.log(`${Math.round((Date.now()-t0)/1000)}초 만에 이미지가 붙었다 (${st.thumbs}장)`); break; }
    if (i % 4 === 0) console.log(`  …${Math.round((Date.now()-t0)/1000)}초 none=${st.none} busy=${st.busy} thumbs=${st.thumbs}`);
  }
  await page.screenshot({ path: path.join(SHOTS, '12-generated.png') });
  if (!ok) console.log('이미지가 안 왔다. 여기서 멈춘다.');
  else {
    const picked = await ed().evaluate(() => {
      const im = [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 200).pop();
      if (!im) return 'none';
      (im.closest('button,[role=button],li,div[class*=card]') || im).click();
      return im.src.slice(0, 50);
    });
    console.log('레퍼런스 선택:', picked);
    await page.waitForTimeout(2500);
    await ed().getByRole('button', { name: /Slice/i }).first().click();
    await page.waitForTimeout(12000);
    await page.screenshot({ path: path.join(SHOTS, '14-sliced.png') });
    console.log('Slice 완료. Classify 간다');
    await ed().getByRole('button', { name: /Classify/i }).first().click();
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(9000);
      let n = '0';
      try { n = await ed().evaluate(() => (document.body.innerText.match(/(\d+)\s*tiles/) || [0, '0'])[1]); } catch { continue; }
      if (i % 3 === 0) console.log('  타일', n);
      if (Number(n) > 0) { console.log('분류 끝. 타일', n); break; }
    }
    await page.screenshot({ path: path.join(SHOTS, '15-classified.png') });
  }
} else if (STEP === 'wait') {
  const f = ed();
  const t0 = Date.now();
  for (let i = 0; i < 90; i++) {
    const st = await f.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /Generate|Stop/.test(b.textContent || ''));
      const status = (document.querySelector('.status, [class*=status]')?.textContent || '').slice(-90);
      return {
        running: /Stop/.test(btn?.textContent || ''),
        busy: /진행중/.test(document.body.innerText),
        pick: /레퍼런스 이미지를 먼저 선택/.test(document.body.innerText),
        status,
      };
    });
    if (!st.running && !st.busy) { console.log(`${Math.round((Date.now() - t0) / 1000)}초 만에 끝났다. ${st.status}`); break; }
    if (i % 4 === 0) console.log(`  …${Math.round((Date.now() - t0) / 1000)}초 (running=${st.running} busy=${st.busy})`);
    await page.waitForTimeout(10000);
  }
  await page.screenshot({ path: path.join(SHOTS, '13-ready.png') });
} else if (STEP === 'slice') {
  const f = ed();
  // 생성된 레퍼런스를 고르고 자른다
  const picked = await f.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => i.width > 40 && i.height > 40);
    const cand = imgs[imgs.length - 1];
    if (cand) { cand.click(); return cand.src.slice(0, 40); }
    return 'no-image';
  });
  console.log('레퍼런스 선택:', picked);
  await page.waitForTimeout(2000);
  await f.getByRole('button', { name: /Slice/i }).first().click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(SHOTS, '14-sliced.png') });
  await f.getByRole('button', { name: /Classify/i }).first().click();
  console.log('Classify 눌렀다');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(8000);
    const n = await f.evaluate(() => (document.body.innerText.match(/(\d+) tiles/) || [0, '0'])[1]);
    console.log('  타일', n);
    if (Number(n) > 0) break;
  }
  await page.screenshot({ path: path.join(SHOTS, '15-classified.png') });
} else if (STEP === 'new') {
  await page.getByRole('button', { name: /New SMO/i }).first().click();
  await page.waitForTimeout(2500);
  await dump(page, 'main');
  await page.screenshot({ path: path.join(SHOTS, '10-newsmo.png') });
} else {
  await dump(page, 'main');
  await dump(ed(), 'editor');
  await page.screenshot({ path: path.join(SHOTS, '10-studio.png') });
}
console.log('스크린샷:', SHOTS);
// 붙어 쓴 창은 건드리지 않는다.
// ⚠️ CDP 로 붙었을 때 browser.close() 를 부르면 크롬이 통째로 닫힌다. 부르지 마라.
if (browser) { console.log('창은 그대로 둔다'); process.exit(0); }
else if (process.argv.includes('--close')) await ctx.close();
else { console.log('열어 둔다'); await new Promise(() => {}); }
