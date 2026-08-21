// 로컬 개발 서버 — 게임을 띄우고 SAM 을 대신 불러 준다.
// 키는 .env 에만 있고, 브라우저로는 절대 내려가지 않는다.
//   node spum/serve.mjs   →  http://127.0.0.1:8790

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── .env 읽기 (의존성 없이) ──────────────────────────────────
function loadEnv() {
  const out = {};
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}
const env = { ...loadEnv(), ...process.env };
const STUDIO_EXPORT_JS = String.raw`
(() => {
  const PORT = PORT_HERE;
  const L = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
  const maps = L('sv_studio_maps_v1'), smo = L('sv_studio_smo_v1');
  if (!maps.length) return console.error('[SPUM→게임] 이 탭에 맵이 없다');

  window.SPUM_EXPORT = async (want) => {
    const map = want
      ? maps.find(m => m.id === want || m.name === want)
      : maps.slice().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0];
    if (!map) return console.error('[SPUM→게임] 그런 맵이 없다:', want);
    console.log('[SPUM→게임] 내보낼 맵:', map.name, map.width + 'x' + map.height, map.id);

    const theme = smo.find(o => o.id === map.mapThemeId);
    const byTileId = new Map(((theme && theme.mapTheme && theme.mapTheme.tiles) || []).map(t => [String(t.id), t]));
    const ts = map.tilesets.find(t => t.themeId === map.mapThemeId) || map.tilesets.find(t => t.source === 'map-theme');
    if (!ts) return console.error('[SPUM→게임] map-theme 타일셋이 없다');
    const props = ts.tileProperties || {};
    const back = map.layers.find(l => l.type === 'back').data;
    const used = [...new Set(back.filter(Boolean).map(String))];

    // 타일 그림은 12장씩 끊어 받는다 (한꺼번에 받으면 ERR_INSUFFICIENT_RESOURCES)
    const img = new Map();
    for (let i = 0; i < used.length; i += 12) {
      await Promise.all(used.slice(i, i + 12).map(async pid => {
        const p = props[pid]; if (!p) return;
        const t = byTileId.get(String(p.smoTileId)); if (!t) return;
        const src = t.imageDataUrl || (t.assetId ? '/api/studio/assets/' + encodeURIComponent(t.assetId) : '');
        if (!src) return;
        const b = await fetch(src).then(r => r.ok ? r.blob() : null).catch(() => null);
        if (b) { try { img.set(pid, await createImageBitmap(b)); } catch (e) {} }
      }));
      if (i % 240 === 0) console.log('[SPUM→게임] 타일 ' + Math.min(used.length, i + 12) + '/' + used.length);
    }

    const TS = map.tileSize || 32, COLS = 32;
    const ids = used.filter(id => img.has(id));
    const sheet = document.createElement('canvas');
    sheet.width = COLS * TS; sheet.height = Math.max(1, Math.ceil(ids.length / COLS)) * TS;
    const g = sheet.getContext('2d'); g.imageSmoothingEnabled = false;
    const newProps = {};
    ids.forEach((id, i) => {
      const cx = i % COLS, cy = Math.floor(i / COLS);
      g.drawImage(img.get(id), cx * TS, cy * TS, TS, TS);
      newProps[id] = Object.assign({}, props[id], { sourceCell: { column: cx + 1, row: cy + 1 }, sourceCells: [{ column: cx + 1, row: cy + 1 }] });
    });

    const out = JSON.parse(JSON.stringify(map));
    out.tilesets = [Object.assign({}, ts, { tileProperties: newProps, columns: COLS })];
    out.meta = Object.assign({}, out.meta, { themeSheet: 'supermarket-theme.png', themeTiles: ids.length, fromStudio: true, pulledAt: new Date().toISOString() });

    const r = await fetch('http://127.0.0.1:' + PORT + '/api/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { 'supermarket-map.json': out, 'supermarket-theme.png': sheet.toDataURL('image/png') } }),
    }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }));
    console.log('[SPUM→게임] 결과:', r, '· 타일 ' + ids.length + '/' + used.length + ' · 시트 ' + sheet.width + 'x' + sheet.height);
    // ⚠️ Studio 원본은 그림이 캔버스 전체를 안 채울 수 있다(CLAUDE.md §3-9) — 받은 뒤
    // back 레이어의 실제 그려진 bbox 를 확인하고, 캔버스보다 작으면 그 bbox 로 잘라내라.
    if (r.ok) console.log('[SPUM→게임] 끝났다. 게임 탭을 새로고침해라. (그림이 칸 전체를 안 채웠으면 크롭 필요 — CLAUDE.md §3-9)');
    return r;
  };

  console.log('[SPUM→게임] 이 탭의 맵:');
  maps.slice().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
      .forEach(m => console.log('   ' + m.name + '  (' + m.width + 'x' + m.height + ')  ' + m.id + '  ' + m.savedAt));
  console.log('[SPUM→게임] 가장 최근 맵을 보낸다. 다른 걸 보내려면  SPUM_EXPORT("맵이름")');
  window.SPUM_EXPORT();
})();
`;

const PORT = Number(env.PORT || 8790);
// 키 이름이 여러 개다 — 있는 것을 순서대로 쓴다
// 키 이름이 여러 개다 — 있는 것을 순서대로 쓴다. 시작할 때 한 번 시험해 보고,
// 거부되면 로그인 다리로 넘어간다(앞자리만 적힌 키는 여기서 걸러진다).
let SAM_KEY = env.SAM_API_KEY || env.SPUM_KEY || env.MASTER_KEY || env.SAC_KEY || '';
const SAM_BASE = (env.SAM_BASE_URL || 'https://sam.soonsoon.ai/openai/v1').replace(/\/$/, '');


// ── 로그인 다리 ─────────────────────────────────────────────
// SAM 키가 없을 때는, 로그인된 SPUM 탭이 대신 SAM 을 불러 준다.
// 게임 → 이 서버(대기열) → 다리 탭(spum.soonsoon.ai) → SAM → 되돌아온다.
const jobs = new Map();          // id → {req, resolve}
let jobSeq = 1;

// ── 공개 배포용 남용 방지 — IP당 분당 SAM 요청 수를 제한한다 ──
const RATE_LIMIT = { windowMs: 60_000, max: 20 };
const rateBuckets = new Map();   // ip → timestamp[]
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
}
function isRateLimited(ip) {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  hits.push(now);
  rateBuckets.set(ip, hits);
  return hits.length > RATE_LIMIT.max;
}
const BRIDGE_JS = `(() => {
  if (window.__sgnBridge) return '이미 돌고 있다';
  window.__sgnBridge = true;
  const BASE = 'http://127.0.0.1:PORT_HERE';
  const loop = async () => {
    while (window.__sgnBridge) {
      try {
        const j = await (await fetch(BASE + '/api/bridge/pull')).json();
        if (j && j.id) {
          const r = await fetch('/api/sam/v1/generate', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(j.req) });
          const raw = await r.text();
          let text = '';
          raw.split('\\n').forEach(line => {
            if (!line.startsWith('data:')) return;
            try { const d = JSON.parse(line.slice(5).trim()); if (d.text) text += d.text; } catch {}
          });
          if (!text) { try { const d = JSON.parse(raw); text = d.choices?.[0]?.message?.content || d.output?.content || ''; } catch {} }
          await fetch(BASE + '/api/bridge/push', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: j.id, text, status: r.status }) });
          continue;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 700));
    }
  };
  loop();
  return '다리 연결됨';
})()`;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const SPUM_CDN = 'https://spum.soonsoon.ai';

const readBody = req => new Promise(res => { let b = ''; req.on('data', c => b += c); req.on('end', () => res(b)); });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');


  // 다리: 일감 가져가기
  if (url.pathname === '/api/bridge/pull') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const next = [...jobs.entries()].find(([, v]) => !v.taken);
    if (!next) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{}'); }
    next[1].taken = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ id: next[0], req: next[1].req }));
  }
  // 다리: 결과 돌려주기
  if (url.pathname === '/api/bridge/push' && req.method === 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const body = JSON.parse(await readBody(req) || '{}');
    const job = jobs.get(body.id);
    if (job) { jobs.delete(body.id); job.resolve(body.text || ''); }
    res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  // 다리 스크립트 — 로그인된 SPUM 탭에 붙여 넣으면 된다
  if (url.pathname === '/bridge.js') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(BRIDGE_JS.replace('PORT_HERE', String(PORT)));
  }

  // SPUM 런타임은 모델 자리에 **품질 등급 이름**을 보낸다 (`aiConfig.qualityMode`).
// 실측: `{"model":"medium"}` → SAM 이 `Unknown model: 'medium'` 로 404.
// 비어 있는 경우도 마찬가지다. 여기서 등급을 실제 SAM 모델로 옮긴다.
const SAM_MODEL = env.SAM_MODEL || 'claude-haiku-4-5';
const SAM_TIER = {
  '': SAM_MODEL,
  low: 'claude-haiku-4-5', fast: 'claude-haiku-4-5', economy: 'claude-haiku-4-5',
  medium: 'claude-sonnet-4.6', balanced: 'claude-sonnet-4.6', normal: 'claude-sonnet-4.6',
  high: 'claude-opus-4.8', best: 'claude-opus-4.8', quality: 'claude-opus-4.8',
};
function normalizeSamBody(raw) {
  let o;
  try { o = JSON.parse(raw); } catch { return raw; }
  if (!o || typeof o !== 'object') return raw;
  const asked = typeof o.model === 'string' ? o.model.trim() : '';
  if (!asked) o.model = SAM_MODEL;
  else if (SAM_TIER[asked.toLowerCase()]) o.model = SAM_TIER[asked.toLowerCase()];
  // /generate 모양(prompt)으로 오면 chat 모양(messages)으로 바꾼다
  if (!Array.isArray(o.messages) || !o.messages.length) {
    const prompt = o.prompt || o.input || o.text;
    if (typeof prompt === 'string' && prompt) {
      o.messages = [];
      if (typeof o.system === 'string' && o.system) o.messages.push({ role: 'system', content: o.system });
      o.messages.push({ role: 'user', content: prompt });
      delete o.prompt; delete o.input; delete o.text; delete o.system;
    }
  }
  if (!o.max_tokens && !o.max_completion_tokens) o.max_tokens = 512;
  return JSON.stringify(o);
}

// ── SAM 대리 호출. 키는 서버에서만 붙인다 ──────────────────
  // SPUM 런타임은 /api/sam/v1/generate 를 사용한다
  if (url.pathname.startsWith('/api/sam/') && req.method !== 'POST') {
    // 런타임이 POST 가 아닌 방법으로 부르면 여기서 잡아 로그를 남긴다 — 조용한 404 를 막는다
    console.log('[SAM] 이상한 호출:', req.method, url.pathname);
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', 'Allow': 'POST' });
    return res.end(JSON.stringify({ error: 'POST 로만 받는다', method: req.method, path: url.pathname }));
  }
  if ((url.pathname === '/api/sam/generate' || url.pathname === '/api/sam/v1/generate') && req.method === 'POST') {
    if (isRateLimited(clientIp(req))) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '요청이 너무 잦다. 1분 뒤 다시.' }));
    }
    const raw = await readBody(req);
    console.log('[SAM] 요청:', url.pathname, String(raw).slice(0, 200));
    const body = normalizeSamBody(raw);
    if (!SAM_KEY) {
      // 키가 없으면 로그인된 SPUM 탭(다리)에게 부탁한다
      const id = 'j' + (jobSeq++);
      const text = await new Promise(resolve => {
        jobs.set(id, { req: JSON.parse(body), resolve, taken: false });
        setTimeout(() => { if (jobs.has(id)) { jobs.delete(id); resolve(''); } }, 45000);
      });
      res.writeHead(text ? 200 : 504, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(text
        ? { choices: [{ message: { content: text } }], via: 'bridge' }
        : { error: '다리가 응답하지 않는다. 로그인된 SPUM 탭에서 다리를 켜라.' }));
    }
    try {
      const up = await fetch(SAM_BASE + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SAM_KEY, Authorization: 'Bearer ' + SAM_KEY },
        body,
      });
      const text = await up.text();
      if (up.status >= 400) console.log('[SAM] 상류 오류', up.status, text.slice(0, 200));
      res.writeHead(up.status, { 'Content-Type': up.headers.get('content-type') || 'application/json' });
      return res.end(text);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  // 아이콘은 없다. 404 로그를 남기지 않는다.
  // ── Studio 탭에 붙여 넣는 내보내기 스크립트 ────────────────
  // 사용자 브라우저의 localStorage 가 원본이라, 그 탭에서 직접 실행해야 한다.
  //   fetch("http://127.0.0.1:8790/studio-export.js").then(r=>r.text()).then(eval)
  if (url.pathname === '/studio-export.js') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(STUDIO_EXPORT_JS.replace(/PORT_HERE/g, String(PORT)));
  }

  // ── Studio → 게임: 맵을 받아 spum/ 에 쓴다 ────────────────
  // 로그인된 Studio 탭이 타일 그림을 시트로 합쳐 여기로 보낸다.
  if (url.pathname === '/api/import' && req.method === 'POST') {
    // 배포 환경(Render)에서는 막는다 — 로그인 없이 spum/ 파일을 쓸 수 있는 통로라
    // 로컬 개발(Studio → 게임 반입)에서만 연다.
    if (env.RENDER) { res.writeHead(404); return res.end(); }
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      const wrote = [];
      for (const [name, value] of Object.entries(body.files || {})) {
        if (!/^[\w.-]+$/.test(name)) continue;                       // 경로 탈출 금지
        const dest = path.join(ROOT, 'spum', name);
        const data = typeof value === 'string' && value.startsWith('data:')
          ? Buffer.from(value.split(',')[1], 'base64')
          : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
        fs.writeFileSync(dest, data);
        wrote.push(name + ' ' + data.length + 'B');
      }
      console.log('[import]', wrote.join(' · '));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, wrote }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
  }

  if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

  // ── 키가 붙어 있는지만 알려 준다. 값은 주지 않는다 ─────────
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ sam: SAM_KEY ? 'ready' : (jobs ? 'bridge' : 'missing'), base: SAM_BASE }));
  }

  // ── SPUM CDN 프록시 — CORS 없이 SPUM 모듈 로드 ─────────────
  // SPUM 캐릭터 프리뷰는 SPKG 경로를 문서 기준 상대경로('../assets/…')로 푼다.
  // 그래서 /assets/ 로 떨어진다 — CDN 의 같은 자리로 넘겨 준다.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/spum-cdn/')) {
    const cdnPath = url.pathname.startsWith('/assets/')
      ? url.pathname
      : url.pathname.replace('/spum-cdn/', '/');
    const cdnUrl = SPUM_CDN + cdnPath;
    try {
      const up = await fetch(cdnUrl, { redirect: 'follow' });
      const data = await up.arrayBuffer();
      const ext = path.extname(cdnPath).toLowerCase();
      const ct = MIME[ext] || 'application/javascript';
      res.writeHead(up.status, {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      });
      return res.end(Buffer.from(data));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      return res.end('CDN proxy error: ' + (e.message || e));
    }
  }

  // ── 안 잡힌 /api/ 요청은 로그로 남긴다 (404 원인 추적용) ───
  if (url.pathname.startsWith('/api/')) {
    console.log(`[404] ${req.method} ${url.pathname}`);
  }

  // ── 정적 파일 ─────────────────────────────────────────────
  // 어디서 부르든 읽을 수 있게 열어 둔다. 로그인된 SPUM 탭이 여기서
  // smo.json · supermarket-map.json 을 가져가 Studio 에 올린다.
  res.setHeader('Access-Control-Allow-Origin', '*');
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (url.pathname === '/') p = path.join(ROOT, 'spum', 'play.html');
  if (!p.startsWith(ROOT) || /(^|[\\/])\.env/.test(p)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(p, (err, data) => {
    if (err) {
      // ROOT에서 못 찾으면 spum/ 하위에서 찾기 ( 페이지가 / 에서 서빙되므로 )
      const p2 = path.join(ROOT, 'spum', decodeURIComponent(url.pathname));
      if (p2.startsWith(ROOT) && !(/(^|[\\/])\.env/.test(p2))) {
        fs.readFile(p2, (err2, data2) => {
          if (err2) { res.writeHead(404); return res.end('not found'); }
          res.writeHead(200, { 'Content-Type': MIME[path.extname(p2)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404); return res.end('not found');
    }
    // no-store — 맵/도면을 다시 구운 뒤에도 브라우저가 옛 판을 붙들고 있으면
    // "아직도 벽을 통과한다"로 보인다. 개발용 서버라 캐시할 이유가 없다.
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

async function probeKey() {
  if (!SAM_KEY) return '없음 — 로그인 다리로 돈다';
  try {
    const r = await fetch(SAM_BASE + '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': SAM_KEY, Authorization: 'Bearer ' + SAM_KEY },
      body: JSON.stringify({ model: 'claude-haiku-4-5', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
    });
    if (r.status === 401) { SAM_KEY = ''; return '거부됨(401) — 앞자리만 적힌 키일 수 있다. 로그인 다리로 돈다'; }
    return '쓸 수 있다';
  } catch { return '확인 실패 — 로그인 다리로 돈다'; }
}

// 0.0.0.0 으로 열어야 WSL 밖(윈도우 크롬)에서도 붙는다.
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Who Ate My Cheesecake? — http://127.0.0.1:${PORT}`);
  console.log('SAM 키: ' + await probeKey());
  console.log('다리를 켜려면 로그인된 SPUM 탭 콘솔에 붙여 넣어라: fetch("http://127.0.0.1:' + PORT + '/bridge.js").then(r=>r.text()).then(eval)');
});
