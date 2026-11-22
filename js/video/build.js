// Loyiha ma'lumoti + yuklangan rasmlar → video vaqt chizig'i.
import { sortedItems, getItems } from '../core/outputs.js';
import { resolveOptions } from '../core/prompt.js';
import { buildSlotGroups, allSlots, rendererOf, gridOf } from '../core/slots.js';
import { loadAssets, flagImage } from './assets.js';
import { tr } from './helpers.js';
import * as monster from './scenes/monster.js';
import * as comparison from './scenes/comparison.js';
import * as countries from './scenes/countries.js';
import * as quiz from './scenes/quiz.js';
import * as findOriginal from './scenes/find-original.js';
import * as stickman from './scenes/stickman.js';

const SCENES = { monster, comparison, 'countries-vs': countries, quiz, 'find-original': findOriginal, stickman };

export function canRender(m) {
  return !!SCENES[rendererOf(m)];
}

export function videoSize(p, quality) {
  const long = p.format !== 'short';
  const q = quality === '720' ? 720 : 1080;
  const a = Math.round((q * 16) / 9 / 2) * 2;
  return long ? { W: a, H: q } : { W: q, H: a };
}

export async function prepare(m, p, { quality = '1080', subs = true, onProgress } = {}) {
  const r = rendererOf(m);
  const scene = SCENES[r];
  if (!scene) throw new Error('Bu bo\'lim uchun video qismi hali yo\'q.');
  const groups = buildSlotGroups(m, p);
  const slots = allSlots(groups);
  const { img, aud } = await loadAssets(p.id, slots, onProgress);
  const keys = {};
  groups.forEach((g) => { keys[g.id] = g.slots.map((s) => s.id); });
  const missing = slots.filter((s) => !s.optional && !img[s.id] && !aud[s.id]).map((s) => s.label);
  const { opt, ids } = resolveOptions(m, p.options);
  const items = sortedItems(m, p.data);
  const { W, H } = videoSize(p, quality);
  const plan = m.plan[p.format] || m.plan.long;
  const ctx = {
    m, p, data: p.data, items, img, aud, keys, W, H, plan, opt, ids,
    accent: m.accent || '#1fe27a', lang: p.language || 'uz', T: tr(p.language || 'uz'),
    grid: gridOf(m, p.options), correct: p.vid?.correct || {}, subs, thinkPct: p.vid?.thinkPct ?? 60,
    flags: {}, sideImg: {},
  };
  if (r === 'comparison' && ids.shablon === 'pillars') {
    for (const it of items) { const k = String(it.kod || '').toLowerCase(); if (k && !(k in ctx.flags)) ctx.flags[k] = await flagImage(k); }
  }
  if (r === 'countries-vs') {
    const sides = p.data.tomonlar || [];
    ctx.sideImg.a = img['flag-a'] || (await flagImage(sides[0]?.kod));
    ctx.sideImg.b = img['flag-b'] || (await flagImage(sides[1]?.kod));
  }
  const tl = scene.build(ctx);
  return { tl, missing, items: getItems(m, p.data).length };
}
