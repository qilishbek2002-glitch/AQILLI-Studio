import { h, icon, toast } from './dom.js';
import { LOGO_SVG } from './shell.js';
import { coverHtml, fitImage } from './covers.js';
import { getCovers, setCover } from '../core/store.js';
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
  const art = card.querySelector('.art');
  const fid = `hc-${m.id}`;
  const pick = h('input', { type: 'file', accept: 'image/*', id: fid, class: 'sr-only', onclick: (e) => e.stopPropagation(), onchange: async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const url = await fitImage(f);
      setCover(m.id, url);
      art.innerHTML = coverHtml(m, getCovers());
      toast(`"${m.title}" rasmi almashtirildi`);
    } catch (err) { toast(err.message, 'err'); }
  } });
  const change = h('label', { class: 'cover-edit', for: fid, title: 'Muqova rasmini almashtirish', onclick: (e) => e.stopPropagation() }, icon('image', 16), 'Rasm');
  card.append(pick, change);
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
    h('section', { class: 'hero' },
      h('div', { class: 'hero-logo', html: LOGO_SVG }),
      h('div', { class: 'hero-text' },
        h('h1', {}, 'Qaysi video yasaymiz?'),
        h('p', {}, 'Bo\'lim → mavzu → AI buyrug\'i → rasmlar → tayyor video. Hammasi bir joyda.'),
        h('div', { class: 'hero-steps' }, ['1 Mavzu', '2 AI javobi', '3 Rasmlar', '4 Video'].map((x) => h('span', { class: 'pill' }, x)))
      )
    ),
    h('div', { class: 'posters' }, app.modules.map(posterCard)),
    h('div', { class: 'section-title' }, h('h2', {}, 'So\'nggi loyihalar'), projects.length ? h('a', { href: '#projects', class: 'btn small ghost' }, 'Hammasi') : null),
    recent
  );
}
