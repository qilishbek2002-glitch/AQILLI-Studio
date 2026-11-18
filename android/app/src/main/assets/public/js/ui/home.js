import { h, icon } from './dom.js';
import { coverHtml } from './covers.js';
import { getCovers } from '../core/store.js';
import { availableFormats } from '../core/plan.js';
import { isUnlocked } from '../core/license.js';
import { listProjects } from '../core/store.js';

function posterCard(m) {
  const open = isUnlocked(m);
  const formats = availableFormats(m);
  const card = h(
    'a',
    {
      class: `poster${open ? '' : ' locked'}`,
      href: open ? `#m-${m.id}` : '#sozlamalar',
      'aria-label': `${m.title}: ${m.subtitle}`,
    },
    h('div', { class: 'art', html: coverHtml(m, getCovers()) }),
    h(
      'div',
      { class: 'body' },
      h('h3', {}, m.title),
      h('p', {}, m.subtitle),
      h(
        'div',
        { class: 'meta' },
        formats.includes('long') ? h('span', { class: 'pill' }, 'Long') : null,
        formats.includes('short') ? h('span', { class: 'pill' }, 'Shorts') : null,
        h('span', { class: 'pill' }, m.silent ? 'Ovozsiz' : 'Ovozli')
      )
    )
  );
  if (!open) card.append(h('span', { class: 'ribbon lock' }, icon('lock', 14), 'Pullik'));
  else if (m.badge) card.append(h('span', { class: 'ribbon' }, m.badge));
  return card;
}

export function homeView(app) {
  const projects = listProjects().slice(0, 4);
  const byId = Object.fromEntries(app.modules.map((m) => [m.id, m]));

  const recent = projects.length
    ? h(
        'div',
        { class: 'mini-list' },
        projects.map((p) =>
          h(
            'a',
            { class: 'mini', href: `#p-${p.id}`, style: { textDecoration: 'none', color: 'inherit' } },
            h('span', { class: 'muted small' }, byId[p.moduleId]?.title || p.moduleId),
            h('span', { class: 't' }, p.data?.sarlavha || p.topic || 'Nomsiz loyiha'),
            h('span', { class: 'muted small' }, new Date(p.updatedAt).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }))
          )
        )
      )
    : h('div', { class: 'empty' }, h('strong', {}, 'Hali loyiha yo\'q'), h('span', {}, 'Yuqoridan bo\'lim tanlang, birinchi loyihangiz shu yerda ko\'rinadi.'));

  return h(
    'div',
    {},
    h('div', { class: 'page-head' }, h('h1', {}, 'Qaysi video yasaymiz?'), h('p', {}, 'Bo\'limni tanlang, mavzu va davomiylikni yozing. Buyruq, rasm promptlari va ovoz matnini dastur tayyorlaydi.')),
    h('div', { class: 'posters' }, app.modules.map(posterCard)),
    h('div', { class: 'section-title' }, h('h2', {}, 'So\'nggi loyihalar'), projects.length ? h('a', { href: '#projects', class: 'btn small ghost' }, 'Hammasi') : null),
    recent
  );
}
