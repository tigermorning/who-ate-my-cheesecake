import { makeRound, knowledgeOf, witnessesOf, HOURS, CAST } from './round.mjs';
const N = 4000;
let fail = 0; const bad = [];
const culpritCount = {}, accCount = {}, shieldTruth = { t: 0, f: 0 };
for (let i = 1; i <= N; i++) {
  const R = makeRound(i);
  const err = [];
  // 1. 범행 순간 범인은 부엌에 혼자였다
  if (R.paths[R.culprit][R.theftHour] !== '부엌') err.push('범인이 부엌에 없다');
  if (witnessesOf(R.paths, R.culprit, R.theftHour).length) err.push('범행에 목격자가 있다');
  // 2. 공범은 범인이 아니다
  if (R.accomplice && R.accomplice === R.culprit) err.push('공범이 범인과 같다');
  // 3. 심어진 목격은 반드시 거짓이고, 반드시 깨질 수 있다
  if (R.planted) {
    const h = R.planted.hour, a = R.accomplice;
    if (R.paths[a][h] === R.paths[R.culprit][h]) err.push('심은 목격이 사실이다');
    const honest = witnessesOf(R.paths, a, h).filter(w => w !== R.culprit && w !== a);
    if (!honest.length) err.push('심은 목격을 깰 목격자가 없다');
  }
  // 4. 거짓 방패는 전부 실마리를 남긴다
  for (const c of CAST) {
    const sh = R.shields[c.id];
    sh.truthful ? shieldTruth.t++ : shieldTruth.f++;
    if (!sh.truthful && !R.shieldClues.find(cl => cl.about === c.id)) err.push('거짓 방패에 실마리가 없다: ' + c.name);
  }
  // 5. 아무도 자기 자신을 목격하지 않는다
  for (const c of CAST) {
    const k = knowledgeOf(R, c.id);
    if (k.seen.some(s => s.who === c.id)) err.push('자기를 목격했다: ' + c.name);
    if (k.seen.some(s => R.paths[s.who][HOURS.indexOf(s.hour)] !== s.room)) err.push('목격이 실제 동선과 어긋난다');
  }
  culpritCount[R.culprit] = (culpritCount[R.culprit] || 0) + 1;
  if (R.accomplice) accCount[R.accomplice] = (accCount[R.accomplice] || 0) + 1;
  if (err.length) { fail++; if (bad.length < 3) bad.push({ seed: i, err }); }
}
console.log(`판 ${N} · 실패 ${fail}`);
if (bad.length) console.log(JSON.stringify(bad, null, 1));
const pct = o => Object.entries(o).map(([k, v]) => k.replace('sgn_', '') + ' ' + (v / N * 100).toFixed(1) + '%').join(' · ');
console.log('범인 분포:', pct(culpritCount));
console.log('공범 분포:', pct(accCount), '| 포섭 발생', (Object.values(accCount).reduce((a, b) => a + b, 0) / N * 100).toFixed(1) + '%');
console.log('방패 참/거짓:', shieldTruth.t, '/', shieldTruth.f);
