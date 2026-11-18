// Modullar ro'yxati: o'rnatilgan (modules/ papkasi yoki builtin.js) + yangilangan/qo'shilgan (localStorage).
// Modul = ma'lumot (manifest + prompt matni). Masofadan keladigan modullar kod ishga tushira olmaydi.
import { slugOk } from './util.js';
import { checkTemplate } from './template.js';
import { cmpVer, parseVer, APP_VERSION } from './version.js';
import { getInstalledModules } from './store.js';

export function validateManifest(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['Modul fayli obyekt bo\'lishi kerak'];
  if (!slugOk(m.id)) errs.push('"id" kichik harf, raqam va "-" dan iborat bo\'lishi kerak');
  if (!m.title || typeof m.title !== 'string') errs.push('"title" yo\'q');
  if (!parseVer(m.version)) errs.push('"version" "1.0.0" ko\'rinishida bo\'lishi kerak');
  if (!m.plan || typeof m.plan !== 'object') errs.push('"plan" yo\'q');
  else {
    const fmts = Object.keys(m.plan).filter((k) => k === 'long' || k === 'short');
    if (!fmts.length) errs.push('"plan" ichida "long" yoki "short" bo\'lishi kerak');
    for (const f of fmts) {
      if (!(m.plan[f].secondsPerItem > 0)) errs.push(`plan.${f}.secondsPerItem musbat son bo'lishi kerak`);
    }
  }
  if (!m.schema || m.schema.type !== 'object') errs.push('"schema" yo\'q yoki obyekt emas');
  if (!m.dataPath || typeof m.dataPath !== 'string') errs.push('"dataPath" yo\'q');
  if (!m.table?.columns?.length) errs.push('"table.columns" yo\'q');
  if (typeof m.prompt !== 'string' || m.prompt.length < 20) errs.push('"prompt" matni yo\'q');
  else {
    const e = checkTemplate(m.prompt);
    if (e) errs.push(`prompt: ${e}`);
  }
  const tpls = [];
  if (m.voice?.template) tpls.push(['voice.template', m.voice.template]);
  const collect = (cfg, label) => (cfg?.variants || []).forEach((v, i) => tpls.push([`${label}.variants[${i}]`, v.template || '']));
  if (m.images) {
    collect(m.images, 'images');
    Object.entries(m.images.byOption?.configs || {}).forEach(([k, c]) => collect(c, `images.byOption.${k}`));
  }
  for (const [label, t] of tpls) {
    const e = checkTemplate(t);
    if (e) errs.push(`${label}: ${e}`);
  }
  if (m.minApp && cmpVer(APP_VERSION, m.minApp) < 0) {
    errs.push(`Bu modul dasturning ${m.minApp} versiyasini talab qiladi (sizda ${APP_VERSION}). Dasturni yangilang.`);
  }
  return errs;
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
}

async function loadBuiltin() {
  try {
    const ids = await fetchJson('modules/index.json');
    const list = [];
    for (const id of ids) {
      const manifest = await fetchJson(`modules/${id}/manifest.json`);
      manifest.prompt = await fetchText(`modules/${id}/prompt.txt`);
      list.push(manifest);
    }
    return list;
  } catch (e) {
    // file:// yoki tarmoqsiz: oldindan yig'ilgan to'plam
    if (typeof window !== 'undefined' && Array.isArray(window.__BUILTIN_MODULES__)) {
      return window.__BUILTIN_MODULES__;
    }
    throw e;
  }
}

// Qaytaradi: [{...manifest, _source:'builtin'|'update'|'custom', _builtinVersion}]
export async function loadRegistry() {
  const builtin = await loadBuiltin();
  const installed = getInstalledModules();
  const byId = new Map();
  for (const b of builtin) byId.set(b.id, { ...b, _source: 'builtin', _builtinVersion: b.version });
  for (const m of Object.values(installed)) {
    const base = byId.get(m.id);
    if (!base) {
      byId.set(m.id, { ...m, _source: 'custom' });
    } else if (cmpVer(m.version, base.version) > 0 && validateManifest(m).length === 0) {
      byId.set(m.id, { ...m, _source: 'update', _builtinVersion: base.version });
    }
  }
  return [...byId.values()].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
}
