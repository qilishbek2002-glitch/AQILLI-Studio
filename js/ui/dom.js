// Kichik DOM yordamchilari: element yasash, toast, ikonkalar.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (['value', 'checked', 'disabled', 'selected', 'readOnly', 'htmlFor', 'type', 'min', 'max', 'step', 'rows', 'placeholder', 'accept'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function toast(message, kind = 'ok', ms = 3600) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const t = h('div', { class: `toast ${kind}`, role: 'status' }, message);
  host.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 250);
  }, ms);
}

const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  download: '<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="M14.5 6 8.5 12l6 6"/>',
  trash: '<path d="M5 7h14"/><path d="M9.5 7V5h5v2"/><path d="M7 7l.8 12h8.4L17 7"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  send: '<path d="M4 12 20 4l-4.5 16-3.5-6.5z"/><path d="M12 13.5 20 4"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.5 4.5v4h-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  pause: '<path d="M8 5.5v13M16 5.5v13"/>',
  film: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8 5v14M16 5v14M3.5 9.5H8M3.5 14.5H8M16 9.5h4.5M16 14.5h4.5"/>',
  sparkle: '<path d="M12 3.5 14 10l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>',
};

export function icon(name, size = 20) {
  return h('span', {
    class: 'ico',
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`,
  });
}

// Artifact kabi yopiq muhitda yuklab olish bloklanadi: u yerda matn dialogda ko'rsatiladi va nusxalanadi.
export function download(filename, text, mime = 'text/plain') {
  if (typeof window !== 'undefined' && window.__AQS_EMBEDDED__) {
    textDialog(filename, text);
    return;
  }
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (cap?.isNativePlatform?.()) {
    nativeSave(filename, text).catch(() => textDialog(filename, text));
    return;
  }
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Android ilovada: faylni keshga yozib, tizimning "Ulashish" oynasi orqali saqlash/yuborish.
async function nativeSave(filename, text) {
  const { Filesystem, Share } = window.Capacitor.Plugins;
  if (!Filesystem || !Share) throw new Error("plagin yo'q");
  const safe = filename.replace(/[^\w.\-]+/g, '_');
  const r = await Filesystem.writeFile({ path: safe, data: text, directory: 'CACHE', encoding: 'utf8' });
  await Share.share({ title: filename, url: r.uri, dialogTitle: 'Faylni saqlash yoki yuborish' });
}

// Katta fayl (video) saqlash: kompyuterda yuklab olinadi, Android'da "Ulashish" oynasi orqali.
export async function downloadBlob(filename, blob) {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (cap?.isNativePlatform?.()) {
    const { Filesystem, Share } = cap.Plugins;
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
    const safe = filename.replace(/[^\w.\-]+/g, '_');
    const w = await Filesystem.writeFile({ path: safe, data: b64, directory: 'CACHE' });
    await Share.share({ title: filename, url: w.uri, dialogTitle: 'Videoni saqlash yoki yuborish' });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function openDialog(title, body, actions) {
  const prev = document.activeElement;
  const overlay = h('div', { class: 'overlay' });
  const close = (result) => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    prev?.focus?.();
    return result;
  };
  const onKey = (e) => {
    if (e.key === 'Escape') actions.cancel?.();
  };
  const box = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('h2', {}, title), body, h('div', { class: 'send-row dialog-actions' }, actions.buttons(close)));
  overlay.append(box);
  overlay.addEventListener('mousedown', (e) => e.target === overlay && actions.cancel?.());
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  (box.querySelector('[data-autofocus]') || box.querySelector('button'))?.focus();
  return close;
}

// window.confirm() ba'zi muhitlarda ishlamaydi, shuning uchun o'zimizniki.
export function confirmDialog(message, { yes = "Ha, o'chirish", no = 'Bekor qilish', danger = true } = {}) {
  return new Promise((resolve) => {
    openDialog('Tasdiqlang', h('p', { class: 'muted' }, message), {
      cancel: () => { document.querySelector('.overlay')?.remove(); resolve(false); },
      buttons: (close) => [
        h('button', { class: `btn${danger ? ' danger' : ' primary'}`, type: 'button', onclick: () => { close(); resolve(true); } }, yes),
        h('button', { class: 'btn ghost', type: 'button', 'data-autofocus': '', onclick: () => { close(); resolve(false); } }, no),
      ],
    });
  });
}

export function textDialog(title, text) {
  const ta = h('textarea', { class: 'mono', readOnly: true, rows: '12', 'aria-label': title });
  ta.value = text;
  openDialog(title, h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Bu muhitda fayl yuklab olinmaydi. Matnni nusxalab, o\'zingizning faylingizga saqlang.'), ta), {
    cancel: () => document.querySelector('.overlay')?.remove(),
    buttons: (close) => [
      h('button', { class: 'btn primary', type: 'button', 'data-autofocus': '', onclick: async () => {
        try { await navigator.clipboard.writeText(text); toast('Nusxalandi'); } catch { ta.select(); toast('Matn belgilandi, nusxalang', 'err'); }
      } }, 'Nusxalash'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Yopish'),
    ],
  });
  ta.select();
}
