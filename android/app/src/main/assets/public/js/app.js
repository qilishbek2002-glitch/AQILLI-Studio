// Kirish nuqtasi: mavzu qo'llash, modullarni yuklash, sahifalar o'rtasida yo'naltirish.
import { h, clear } from './ui/dom.js';
import { shell } from './ui/shell.js';
import { homeView } from './ui/home.js';
import { wizardView } from './ui/wizard.js';
import { projectsView } from './ui/projects.js';
import { settingsView } from './ui/settings.js';
import { loadRegistry } from './core/modules.js';
import { getSettings, getProject, newProject } from './core/store.js';
import { isUnlocked } from './core/license.js';

const app = { settings: getSettings(), modules: [] };
const root = document.getElementById('app');

export function applyTheme(settings = getSettings()) {
  const el = document.documentElement;
  let theme = settings.theme;
  if (theme === 'auto') theme = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  el.dataset.theme = theme;
  el.dataset.accent = settings.accent;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#eaf0ff' : '#11142b');
  app.settings = settings;
}

async function reloadModules() {
  app.modules = await loadRegistry();
}

function mount(active, view) {
  clear(root);
  root.append(shell(active, view));
  window.scrollTo(0, 0);
  document.getElementById('main')?.focus?.();
}

function notFound(text) {
  return h('div', { class: 'empty' }, h('strong', {}, text), h('a', { class: 'btn primary', href: '#home' }, 'Bosh sahifaga qaytish'));
}

function route() {
  const hash = (location.hash || '#home').replace(/^#\/?/, '') || 'home';
  app.settings = getSettings();
  document.title = 'Aqilli Studio';

  if (hash.startsWith('m-')) {
    const m = app.modules.find((x) => x.id === hash.slice(2));
    if (!m) return mount('home', notFound('Bunday bo\'lim topilmadi'));
    if (!isUnlocked(m)) {
      location.hash = '#sozlamalar';
      return;
    }
    const p = newProject(m.id);
    p.language = app.settings.language;
    return mount('home', wizardView(app, m, p));
  }
  if (hash.startsWith('p-')) {
    const p = getProject(hash.slice(2));
    const m = p && app.modules.find((x) => x.id === p.moduleId);
    if (!p || !m) return mount('projects', notFound('Loyiha yoki uning bo\'limi topilmadi'));
    return mount('projects', wizardView(app, m, p));
  }
  if (hash === 'projects') return mount('projects', projectsView(app, route));
  if (hash === 'sozlamalar') return mount('settings', settingsView(app, { applyTheme, reloadModules }));
  return mount('home', homeView(app));
}

async function start() {
  applyTheme(app.settings);
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => getSettings().theme === 'auto' && applyTheme());
  try {
    await reloadModules();
  } catch (e) {
    root.append(h('div', { class: 'main' }, h('div', { class: 'empty' }, h('strong', {}, 'Bo\'limlarni yuklab bo\'lmadi'), h('span', {}, e.message), h('span', { class: 'muted' }, 'Dasturni "node tools/serve.mjs" orqali oching yoki "node tools/bundle.mjs" ni bir marta ishga tushiring.'))));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
}

start();
