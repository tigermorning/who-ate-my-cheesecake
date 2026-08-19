// 서버에 무엇이 있는지, 비상 백업이 있는지 확인만 한다. 절대 쓰지 않는다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(async () => {
  const out = {};
  try { out.비상백업 = (await window.spumStudioData.listEmergencyBackups()).map(x => typeof x === 'string' ? x : (x.key || x.id || JSON.stringify(x).slice(0, 60))); }
  catch (e) { out.비상백업 = '실패 ' + e.message; }
  out.로컬백업키 = Object.keys(localStorage).filter(k => /emergency|backup/i.test(k));
  // 서버 스냅샷을 읽기만 한다
  for (const url of ['/api/studio/snapshot', '/api/snapshot', '/api/studio/state']) {
    try {
      const res = await fetch(url);
      if (res.ok) { const j = await res.json(); out.서버 = { url, keys: Object.keys(j).slice(0, 12), rev: j.rev ?? j.revision }; break; }
      out['시도_' + url] = res.status;
    } catch (e) { out['시도_' + url] = String(e).slice(0, 40); }
  }
  out.동기화상태 = localStorage.getItem('spum_studio_server_sync_v1');
  return out;
});
console.log(JSON.stringify(r, null, 1).slice(0, 1500));
process.exit(0);
