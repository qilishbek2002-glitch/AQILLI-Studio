// Umumiy qobiq: chap panel (kompyuter) va pastki panel (telefon).
import { h, icon } from './dom.js';
import { APP_VERSION } from '../core/version.js';

const NAV = [
  { id: 'home', label: 'Bosh sahifa', href: '#home', icon: 'home' },
  { id: 'projects', label: 'Loyihalarim', href: '#projects', icon: 'folder' },
  { id: 'settings', label: 'Sozlamalar', href: '#sozlamalar', icon: 'gear' },
];

export function brandMark() {
  return h('span', { class: 'mark', html: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>' });
}

export function shell(active, content) {
  const rail = h(
    'aside',
    { class: 'rail', 'aria-label': 'Asosiy menyu' },
    h('div', { class: 'brand' }, brandMark(), 'Aqilli Studio'),
    NAV.map((n) =>
      h('a', { class: 'nav-btn', href: n.href, 'aria-current': n.id === active ? 'page' : null }, icon(n.icon, 20), n.label)
    ),
    h('div', { class: 'spacer' }),
    h('div', { class: 'ver' }, `Versiya ${APP_VERSION}`)
  );
  const topbar = h('header', { class: 'topbar' }, brandMark(), 'Aqilli Studio');
  const tabbar = h(
    'nav',
    { class: 'tabbar', 'aria-label': 'Menyu' },
    NAV.map((n) => h('a', { href: n.href, 'aria-current': n.id === active ? 'page' : null }, icon(n.icon, 22), n.label))
  );
  return h('div', { class: 'shell' }, rail, h('div', {}, topbar, h('main', { class: 'main', id: 'main' }, content)), tabbar);
}
