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

  // ── SAM 대리 호출. 키는 서버에서만 붙인다 ──────────────────
  if (url.pathname === '/api/sam/generate' && req.method === 'POST') {
    const body = await readBody(req);
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
      res.writeHead(up.status, { 'Content-Type': up.headers.get('content-type') || 'application/json' });
      return res.end(text);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  // ── 키가 붙어 있는지만 알려 준다. 값은 주지 않는다 ─────────
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ sam: SAM_KEY ? 'ready' : (jobs ? 'bridge' : 'missing'), base: SAM_BASE }));
  }

  // ── 정적 파일 ─────────────────────────────────────────────
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
          res.writeHead(200, { 'Content-Type': MIME[path.extname(p2)] || 'application/octet-stream' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
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
