import { h, icon, toast, download, confirmDialog } from './dom.js';
import { listProjects, deleteProject } from '../core/store.js';

export function projectsView(app, rerender) {
  const byId = Object.fromEntries(app.modules.map((m) => [m.id, m]));
  const projects = listProjects();

  const list = projects.length
    ? h(
        'div',
        { class: 'mini-list' },
        projects.map((p) => {
          const m = byId[p.moduleId];
          return h(
            'div',
            { class: 'mini' },
            h('span', { class: 'muted small' }, m?.title || p.moduleId),
            h('a', { class: 't', href: `#p-${p.id}`, style: { color: 'inherit', textDecoration: 'none' } }, p.data?.sarlavha || p.topic || 'Nomsiz loyiha'),
            h('span', { class: 'muted small' }, new Date(p.updatedAt).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }), p.data ? ', javob qabul qilingan' : ', javob kutilmoqda'),
            h(
              'div',
              { class: 'send-row', style: { marginTop: '8px' } },
              h('a', { class: 'btn small primary', href: `#p-${p.id}` }, 'Ochish'),
              h('button', { class: 'btn small', type: 'button', 'aria-label': 'Yuklab olish', onclick: () => download(`${p.moduleId}-loyiha.json`, JSON.stringify(p, null, 2), 'application/json') }, icon('download', 16)),
              h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'O\'chirish', onclick: async () => { if (await confirmDialog('Bu loyiha o\'chiriladi. Qaytarib bo\'lmaydi.')) { deleteProject(p.id); toast('Loyiha o\'chirildi'); rerender(); } } }, icon('trash', 16))
            )
          );
        })
      )
    : h('div', { class: 'empty' }, h('strong', {}, 'Hali loyiha yo\'q'), h('span', {}, 'Bosh sahifadan bo\'lim tanlab, mavzu yozing. Loyiha avtomatik saqlanadi.'), h('a', { class: 'btn primary', href: '#home' }, 'Bo\'lim tanlash'));

  return h('div', {}, h('div', { class: 'page-head' }, h('h1', {}, 'Loyihalarim'), h('p', {}, 'Boshlagan ishlaringiz shu qurilmada saqlanadi.')), list);
}
