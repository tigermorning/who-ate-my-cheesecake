// 캐스트 6종을 다시 넣는다. 기존 캐릭터를 틀로 삼아 schemaVersion 2 를 물려받는다.
// (repair-characters.mjs 와 같은 방식. 다만 이미 떠 있는 크롬에 붙어 쓴다.)
import { chromium } from 'playwright';
import fs from 'node:fs';

const cast = JSON.parse(fs.readFileSync(new URL('./cast.json', import.meta.url), 'utf8'));
const SAM_MODEL = 'claude-sonnet-4.6';

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();

const r = await page.evaluate(async ({ cast, SAM_MODEL }) => {
  const KEY = 'sv_studio_characters_v1';
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!Array.isArray(list)) return { err: '저장소가 배열이 아니다' };
  const tmplSrc = list.find(c => c.schemaVersion === 2) || list[0];
  if (!tmplSrc) return { err: '틀로 쓸 캐릭터가 없다' };

  const before = list.map(c => c.name);
  for (const c of cast) {
    const t = JSON.parse(JSON.stringify(tmplSrc));
    t.id = c.id;
    t.name = c.name;
    t.tags = c.tags || [];
    t.persona = {
      ...t.persona,
      gender: c.persona?.gender ?? t.persona.gender,
      personality: c.persona?.personality ?? [],
      traits: c.persona?.traits ?? [],
      mbti: c.persona?.mbti ?? '',
      speechStyle: c.persona?.speechStyle ?? '',
      background: c.persona?.background ?? '',
      occupation: c.persona?.occupation ?? t.persona.occupation,
    };
    t.appearance = { ...t.appearance, ...(c.appearance || {}) };
    t.aiConfig = { ...t.aiConfig, model: SAM_MODEL, extraPrompt: c.persona?.speechStyle || '',
                   role: { title: c.persona?.occupation || '', goal: '' } };
    t.talkConfig = { model: SAM_MODEL, systemPrompt: '' };
    if (t.memory) t.memory = Array.isArray(t.memory) ? [] : {};
    t.meta = { ...(t.meta || {}), updatedAt: new Date().toISOString() };
    const i = list.findIndex(x => x.id === c.id);
    if (i >= 0) list[i] = t; else list.push(t);
  }
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key: KEY } }));
  let saved = 'no';
  try { await window.spumStudioData.saveServerSnapshot('manual'); saved = 'ok'; } catch (e) { saved = e.message; }
  return { before, after: list.map(c => c.name), 저장: saved, 형태: Array.isArray(list) ? '배열' : '객체' };
}, { cast, SAM_MODEL });

console.log(JSON.stringify(r, null, 1));
process.exit(0);
