// localStorage ustiga sozlamalar, loyihalar va o'rnatilgan modullar saqlash.
// Brauzerda localStorage bloklangan bo'lsa ham dastur xotirada ishlayveradi.
import { uid } from './util.js';

const PREFIX = 'aqs.';
const mem = new Map();

function read(key) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? null : JSON.parse(v);
  } catch {
    return mem.has(key) ? JSON.parse(mem.get(key)) : null;
  }
}

function write(key, value) {
  const s = JSON.stringify(value);
  try {
    localStorage.setItem(PREFIX + key, s);
    return true;
  } catch {
    mem.set(key, s); // brauzer xotirasi yopiq yoki to'lgan: shu seans davomida xotirada qoladi
    return false;
  }
}

export const DEFAULT_SETTINGS = {
  theme: 'dark', // dark | light | auto
  accent: 'green',
  language: 'uz',
  ai: 'gemini',
  prefill: true,
  updateUrl: '',
  licenseUrl: '',
  licenseKey: '',
  devMode: false,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(read('settings') || {}) };
}

export function saveSettings(patch) {
  const s = { ...getSettings(), ...patch };
  write('settings', s);
  return s;
}

// ---- loyihalar ----
export function listProjects() {
  return (read('projects') || []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id) {
  return (read('projects') || []).find((p) => p.id === id) || null;
}

export function saveProject(p) {
  const all = read('projects') || [];
  p.updatedAt = Date.now();
  const i = all.findIndex((x) => x.id === p.id);
  if (i === -1) all.push(p);
  else all[i] = p;
  write('projects', all.slice(-100));
  return p;
}

export function deleteProject(id) {
  write('projects', (read('projects') || []).filter((p) => p.id !== id));
}

export function newProject(moduleId) {
  return {
    id: uid(),
    moduleId,
    moduleVersion: '',
    topic: '',
    minutes: 4,
    format: 'long',
    language: 'uz',
    options: {},
    raw: '',
    data: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ---- o'rnatilgan / yangilangan modullar ----
export function getInstalledModules() {
  return read('modules') || {};
}

export function saveInstalledModule(mod) {
  const all = getInstalledModules();
  all[mod.id] = mod;
  write('modules', all);
}

export function removeInstalledModule(id) {
  const all = getInstalledModules();
  delete all[id];
  write('modules', all);
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* e'tibor bermaymiz */
  }
  mem.clear();
}

// ---- bo'lim rasmlari (foydalanuvchi o'zi tanlagan, kichraytirilgan data URL) ----
export function getCovers() {
  return read('covers') || {};
}

export function setCover(id, dataUrl) {
  const all = getCovers();
  all[id] = dataUrl;
  return write('covers', all); // false bo'lsa rasm faqat shu seansda ko'rinadi
}

export function removeCover(id) {
  const all = getCovers();
  delete all[id];
  write('covers', all);
}
