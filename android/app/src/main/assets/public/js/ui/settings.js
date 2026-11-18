import { h, clear, icon, toast, confirmDialog } from './dom.js';
import { getSettings, saveSettings, clearAll, removeInstalledModule, getCovers, setCover, removeCover } from '../core/store.js';
import { coverHtml, fitImage } from './covers.js';
import { LANGUAGES } from '../core/prompt.js';
import { AI_SITES } from '../core/handoff.js';
import { checkForUpdates, installModuleFromText } from '../core/updates.js';
import { loadRegistry } from '../core/modules.js';
import { activate, cachedLicense } from '../core/license.js';
import { APP_VERSION } from '../core/version.js';

const ACCENTS = [
  ['green', '#1fe27a', 'Yashil'],
  ['red', '#ff4d5e', 'Qizil'],
  ['blue', '#3b8cff', 'Ko\'k'],
  ['purple', '#9a6bff', 'Binafsha'],
  ['orange', '#ff9a2e', 'To\'q sariq'],
  ['pink', '#ff4fa3', 'Pushti'],
];

function card(title, sub, ...body) {
  return h('section', { class: 'step' }, h('div', {}, h('h2', {}, title), sub ? h('div', { class: 'muted small' }, sub) : null), ...body);
}

export function settingsView(app, { applyTheme, reloadModules }) {
  const s = getSettings();

  // ---- ko'rinish ----
  const themeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mavzu' });
  const swatches = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Asosiy rang' });
  const drawLook = () => {
    const cur = getSettings();
    clear(themeSeg);
    [['dark', 'Tungi'], ['light', 'Kunduzgi'], ['auto', 'Avto']].forEach(([id, label]) =>
      themeSeg.append(h('button', { type: 'button', 'aria-pressed': cur.theme === id ? 'true' : 'false', onclick: () => { applyTheme(saveSettings({ theme: id })); drawLook(); } }, label))
    );
    clear(swatches);
    ACCENTS.forEach(([id, color, label]) =>
      swatches.append(
        h('button', { class: 'swatch', type: 'button', style: { background: color }, 'aria-label': label, 'aria-pressed': cur.accent === id ? 'true' : 'false', title: label, onclick: () => { applyTheme(saveSettings({ accent: id })); drawLook(); } }, cur.accent === id ? icon('check', 20) : null)
      )
    );
  };
  drawLook();

  // ---- til va AI ----
  const langSel = h('select', { id: 's-lang', onchange: (e) => { saveSettings({ language: e.target.value }); toast('Saqlandi'); } }, Object.entries(LANGUAGES).map(([k, v]) => h('option', { value: k, selected: s.language === k }, v.label)));
  const aiSel = h('select', { id: 's-ai', onchange: (e) => { saveSettings({ ai: e.target.value }); app.settings = getSettings(); toast('Saqlandi'); } }, Object.entries(AI_SITES).map(([k, v]) => h('option', { value: k, selected: s.ai === k }, v.label)));
  const prefill = h('input', { type: 'checkbox', checked: s.prefill, onchange: (e) => { saveSettings({ prefill: e.target.checked }); app.settings = getSettings(); } });

  // ---- modullar ----
  const modList = h('div');
  const status = h('div', { class: 'msgs' });
  const drawMods = () => {
    clear(modList);
    app.modules.forEach((m) => {
      const src = m._source === 'builtin' ? 'o\'rnatilgan' : m._source === 'update' ? `yangilangan (asl ${m._builtinVersion})` : 'qo\'shilgan';
      modList.append(
        h(
          'div',
          { class: 'mod-row' },
          h('div', {}, h('strong', {}, m.title), h('div', { class: 'muted small' }, `versiya ${m.version}, ${src}`)),
          m._source !== 'builtin'
            ? h('button', { class: 'btn small', type: 'button', onclick: async () => { removeInstalledModule(m.id); await reloadModules(); drawMods(); toast('Asl holatga qaytarildi'); } }, 'Qaytarish')
            : null
        )
      );
    });
  };
  drawMods();

  const urlInput = h('input', { type: 'url', id: 's-url', value: s.updateUrl, placeholder: 'https://.../index.json', onchange: (e) => saveSettings({ updateUrl: e.target.value.trim() }) });
  const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
    clear(status);
    saveSettings({ updateUrl: urlInput.value.trim() });
    checkBtn.disabled = true;
    try {
      const r = await checkForUpdates(urlInput.value.trim(), app.modules);
      await reloadModules();
      drawMods();
      if (r.updated.length) status.append(h('div', { class: 'msg ok' }, icon('check', 18), h('span', {}, `Yangilandi: ${r.updated.map((u) => `${u.id} ${u.from} → ${u.to}`).join(', ')}`)));
      else status.append(h('div', { class: 'msg info' }, icon('info', 18), h('span', {}, 'Hamma bo\'limlar eng yangi versiyada.')));
      r.skipped.forEach((x) => status.append(h('div', { class: 'msg warn' }, icon('warn', 18), h('span', {}, `${x.id}: ${x.reason}`))));
      r.failed.forEach((x) => status.append(h('div', { class: 'msg err' }, icon('warn', 18), h('span', {}, `${x.id}: ${x.reason}`))));
    } catch (e) {
      status.append(h('div', { class: 'msg err' }, icon('warn', 18), h('span', {}, e.message)));
    }
    checkBtn.disabled = false;
  } }, icon('refresh', 18), 'Yangilanishni tekshirish');

  const fileInput = h('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Modul fayli', onchange: async (e) => {
    clear(status);
    const f = e.target.files?.[0];
    if (!f) return;
    const r = installModuleFromText(await f.text());
    if (r.ok) {
      await reloadModules();
      drawMods();
      status.append(h('div', { class: 'msg ok' }, icon('check', 18), h('span', {}, `"${r.module.title}" moduli qo'shildi (versiya ${r.module.version}).`)));
    } else {
      r.errors.forEach((x) => status.append(h('div', { class: 'msg err' }, icon('warn', 18), h('span', {}, x))));
    }
    e.target.value = '';
  } });

  // ---- bo'lim rasmlari ----
  const coverList = h('div');
  const drawCovers = () => {
    clear(coverList);
    const custom = getCovers();
    app.modules.forEach((m) => {
      const input = h('input', { type: 'file', accept: 'image/*', id: `cov-${m.id}`, class: 'sr-only', onchange: async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        try {
          const url = await fitImage(f);
          if (setCover(m.id, url)) toast(`"${m.title}" rasmi almashtirildi`);
          else toast('Rasm saqlanmadi: xotira to\'lgan. Boshqa rasmlarni asl holatga qaytaring.', 'err');
        } catch (err) {
          toast(err.message, 'err');
        }
        drawCovers();
      } });
      coverList.append(
        h('div', { class: 'mod-row' },
          h('div', { class: 'cover-row' }, h('div', { class: 'cover-thumb', html: coverHtml(m, custom) }), h('div', {}, h('strong', {}, m.title), h('div', { class: 'muted small' }, custom[m.id] ? 'Sizning rasmingiz' : 'Standart rasm'))),
          h('div', { class: 'send-row' },
            input,
            h('label', { class: 'btn small', for: `cov-${m.id}` }, icon('plus', 16), 'Rasm tanlash'),
            custom[m.id] ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => { removeCover(m.id); drawCovers(); toast('Standart rasm qaytarildi'); } }, 'Qaytarish') : null
          )
        )
      );
    });
  };
  drawCovers();

  // ---- tarif ----
  const lic = cachedLicense();
  const keyInput = h('input', { type: 'text', id: 's-key', value: s.licenseKey, placeholder: 'Botdan olingan kalit', autocomplete: 'off' });
  const keyMsg = h('div', { class: 'msgs' });
  if (lic) keyMsg.append(h('div', { class: 'msg ok' }, icon('check', 18), h('span', {}, `Faol tarif: ${lic.plan || 'pro'}${lic.expires ? `, ${lic.expires} gacha` : ''}`)));
  const licUrl = h('input', { type: 'url', id: 's-lic', value: s.licenseUrl, placeholder: 'https://.../activate', onchange: (e) => saveSettings({ licenseUrl: e.target.value.trim() }) });
  const keyBtn = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
    clear(keyMsg);
    saveSettings({ licenseUrl: licUrl.value.trim() });
    const r = await activate(keyInput.value.trim());
    keyMsg.append(h('div', { class: `msg ${r.ok ? 'ok' : 'err'}` }, icon(r.ok ? 'check' : 'warn', 18), h('span', {}, r.ok ? 'Kalit qabul qilindi.' : r.error)));
  } }, 'Faollashtirish');

  const dev = h('input', { type: 'checkbox', checked: s.devMode, onchange: (e) => { saveSettings({ devMode: e.target.checked }); toast(e.target.checked ? 'Dasturchi rejimi yoqildi: hamma bo\'lim ochiq' : 'Dasturchi rejimi o\'chirildi'); } });

  return h(
    'div',
    {},
    h('div', { class: 'page-head' }, h('h1', {}, 'Sozlamalar')),
    h(
      'div',
      { class: 'settings' },
      card('Ko\'rinish', 'Mavzu va asosiy rang darhol almashadi', h('div', { class: 'stack' }, h('div', { class: 'field' }, h('span', { class: 'label' }, 'Mavzu'), themeSeg), h('div', { class: 'field' }, h('span', { class: 'label' }, 'Asosiy rang'), swatches))),
      card('Til va AI', null, h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { for: 's-lang' }, 'Matn tili (standart)'), langSel), h('div', { class: 'field' }, h('label', { for: 's-ai' }, 'Asosiy AI'), aiSel)), h('label', { class: 'switch' }, prefill, h('span', { class: 'track' }), h('span', {}, 'Saytni ochganda buyruqni manzil orqali ham uzatishga urinish (ChatGPT, Claude)'))),
      card('Bo\'limlar va yangilanish', 'Yangi bo\'lim va promptlar APK tarqatmasdan yetib keladi', h('div', { class: 'field' }, h('label', { for: 's-url' }, 'Yangilanish manzili'), urlInput), h('div', { class: 'send-row' }, checkBtn), h('div', { class: 'field' }, h('label', {}, 'Modul faylini qo\'shish (.json)'), fileInput), status, modList),
      card('Bo\'lim rasmlari', 'Kartochkadagi rasmni o\'zingiznikiga almashtiring (16:10 nisbatda kesiladi)', coverList),
      card('Tarif', 'Pullik bo\'limlar bot orqali olingan kalit bilan ochiladi', h('div', { class: 'field' }, h('label', { for: 's-key' }, 'Kalit'), keyInput), h('div', { class: 'field' }, h('label', { for: 's-lic' }, 'Tekshiruv serveri manzili'), licUrl), h('div', { class: 'send-row' }, keyBtn), keyMsg, h('label', { class: 'switch' }, dev, h('span', { class: 'track' }), h('span', {}, 'Dasturchi rejimi (hamma bo\'lim ochiq)'))),
      card('Ma\'lumotlar', `Versiya ${APP_VERSION}`, h('div', { class: 'send-row' }, h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmDialog('Hamma loyiha va sozlamalar o\'chiriladi. Qaytarib bo\'lmaydi.', { yes: 'Hammasini o\'chirish' })) { clearAll(); location.hash = '#home'; location.reload(); } } }, icon('trash', 18), 'Hamma ma\'lumotni o\'chirish')))
    )
  );
}
