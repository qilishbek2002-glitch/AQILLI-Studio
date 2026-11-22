// Umumiy qobiq: chap panel (kompyuter) va pastki panel (telefon).
import { h, icon } from './dom.js';
import { APP_VERSION } from '../core/version.js';

const NAV = [
  { id: 'home', label: 'Bosh sahifa', href: '#home', icon: 'home' },
  { id: 'projects', label: 'Loyihalarim', href: '#projects', icon: 'folder' },
  { id: 'settings', label: 'Sozlamalar', href: '#sozlamalar', icon: 'gear' },
];

export const LOGO_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5dffa8"/><stop offset="1" stop-color="#12b85c"/></linearGradient></defs>
<rect x="5" y="9" width="54" height="46" rx="13" fill="#0b0e24" transform="translate(3 3)"/>
<rect x="5" y="9" width="54" height="46" rx="13" fill="url(#lg1)" stroke="#0b0e24" stroke-width="4"/>
<path d="M12 9v46M52 9v46" stroke="#0b0e24" stroke-opacity=".28" stroke-width="3" stroke-dasharray="5 6"/>
<path d="M26 21v22l19-11z" fill="#0b0e24"/>
<path d="M51 3l2.4 6 6 2.4-6 2.4L51 20l-2.4-6.2-6-2.4 6-2.4z" fill="#ffd23f" stroke="#0b0e24" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

export function brandMark() {
  return h('span', { class: 'mark', html: LOGO_SVG });
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
