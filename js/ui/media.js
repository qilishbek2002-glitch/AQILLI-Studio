// "Rasmlar" paneli: har bir katakchaga rasm/audio yuklash, ommaviy va ZIP yuklash, almashtirish.
import { h, clear, icon, toast } from './dom.js';
import { buildSlotGroups } from '../core/slots.js';
import { putMedia, getMedia, deleteMedia, listMedia } from '../core/media.js';
import { readZip, naturalSort, mimeOf } from '../core/zip.js';
import { chromaKey } from '../video/assets.js';
import { saveProject } from '../core/store.js';

async function makeThumb(blob, chroma) {
  const bm = await createImageBitmap(blob, { resizeWidth: 360, resizeQuality: 'medium' }).catch(() => createImageBitmap(blob));
  const src = chroma ? chromaKey(bm) : bm;
  const c = document.createElement('canvas');
  const k = Math.min(1, 360 / Math.max(src.width, src.height));
  c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL(chroma ? 'image/png' : 'image/jpeg', 0.82);
}

const typeOk = (kind, f) => {
  const t = f.type || mimeOf(f.name);
  return kind === 'audio' ? t.startsWith('audio/') : t.startsWith('image/');
};

export function mediaPanel(m, p) {
  const root = h('div', { class: 'media' });
  let groups = buildSlotGroups(m, p);
  let present = new Set();
  const thumbs = new Map();
  const audioUrls = new Map();
  p.vid = p.vid || {};
  p.vid.correct = p.vid.correct || {};

  async function put(slot, file) {
    if (!typeOk(slot.kind, file)) { toast(`${file.name}: ${slot.kind === 'audio' ? 'audio' : 'rasm'} fayli kerak`, 'err'); return false; }
    const ok = await putMedia(p.id, slot.id, file);
    present.add(slot.id); thumbs.delete(slot.id);
    if (audioUrls.has(slot.id)) { URL.revokeObjectURL(audioUrls.get(slot.id)); audioUrls.delete(slot.id); }
    if (!ok && !put.warned) { put.warned = true; toast('Brauzer xotirasi yopiq: fayllar faqat shu oynada ochiq turguncha saqlanadi.', 'err', 6000); }
    return true;
  }

  async function bulk(group, files, overwrite) {
    let list = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        try { list.push(...(await readZip(f))); } catch (e) { toast(e.message, 'err'); }
      } else list.push(f);
    }
    const kind = group.slots[0]?.kind || 'image';
    list = naturalSort(list.filter((f) => typeOk(kind, f)));
    if (!list.length) { toast(kind === 'audio' ? 'Audio fayl topilmadi' : 'Rasm topilmadi', 'err'); return; }
    const targets = overwrite ? group.slots : group.slots.filter((s) => !present.has(s.id));
    if (!targets.length) { toast('Hamma katak to\'ldirilgan. Ustiga yozish uchun belgini yoqing.', 'err'); return; }
    let n = 0;
    for (let i = 0; i < Math.min(list.length, targets.length); i++) if (await put(targets[i], list[i])) n++;
    toast(`${n} ta fayl joylandi${list.length > targets.length ? `, ${list.length - targets.length} tasi ortib qoldi` : ''}`);
    draw();
  }

  async function swap(a, b) {
    const [x, y] = await Promise.all([getMedia(p.id, a.id), getMedia(p.id, b.id)]);
    for (const [s, v] of [[a, y], [b, x]]) {
      if (v) { await putMedia(p.id, s.id, v); present.add(s.id); } else { await deleteMedia(p.id, s.id); present.delete(s.id); }
      thumbs.delete(s.id);
    }
    draw();
  }

  function card(group, slot, idx) {
    const has = present.has(slot.id);
    const inputId = `m-${p.id}-${slot.id}`;
    const input = h('input', { type: 'file', id: inputId, class: 'sr-only', accept: slot.kind === 'audio' ? 'audio/*' : 'image/*', onchange: async (e) => {
      const f = e.target.files?.[0]; e.target.value = '';
      if (f && (await put(slot, f))) draw();
    } });
    let view;
    if (!has) view = h('div', { class: 'slot-empty' }, icon(slot.kind === 'audio' ? 'mic' : 'image', 28), h('span', {}, slot.optional ? 'ixtiyoriy' : 'kerak'));
    else if (slot.kind === 'audio') {
      view = h('div', { class: 'slot-audio' });
      (async () => {
        const blob = await getMedia(p.id, slot.id);
        if (!blob) return;
        if (!audioUrls.has(slot.id)) audioUrls.set(slot.id, URL.createObjectURL(blob));
        view.append(h('audio', { controls: true, src: audioUrls.get(slot.id), preload: 'metadata' }));
      })();
    } else {
      const im = h('img', { alt: slot.label, class: `slot-img${slot.chroma ? ' checker' : ''}` });
      view = h('div', { class: 'slot-view' }, im);
      (async () => {
        if (!thumbs.has(slot.id)) {
          const blob = await getMedia(p.id, slot.id);
          if (!blob) return;
          try { thumbs.set(slot.id, await makeThumb(blob, slot.chroma)); } catch { thumbs.set(slot.id, ''); }
        }
        if (thumbs.get(slot.id)) im.src = thumbs.get(slot.id);
        else view.replaceChildren(h('div', { class: 'slot-empty' }, 'Rasm ochilmadi'));
      })();
    }
    const prev = group.slots[idx - 1], next = group.slots[idx + 1];
    const pickN = slot.pick ? (() => {
      const no = +slot.id.split('-')[1];
      return h('label', { class: 'slot-pick' }, 'Asl katak №', h('input', { type: 'number', min: 1, max: 99, value: p.vid.correct[no] || 1, onchange: (e) => { p.vid.correct[no] = Math.max(1, +e.target.value || 1); saveProject(p); } }));
    })() : null;
    const el = h('div', { class: `slot${has ? ' has' : ''}`, dataset: { slot: slot.id } },
      h('div', { class: 'slot-head' }, h('strong', {}, slot.label), slot.sub ? h('span', { class: 'muted small' }, slot.sub) : null),
      view,
      pickN,
      h('div', { class: 'slot-actions' },
        input,
        h('label', { class: 'btn small', for: inputId }, has ? 'Almashtirish' : 'Tanlash'),
        has && prev ? h('button', { class: 'btn small ghost', type: 'button', title: 'Oldingi katak bilan almashtirish', 'aria-label': 'Oldingisi bilan almashtirish', onclick: () => swap(slot, prev) }, '◀') : null,
        has && next ? h('button', { class: 'btn small ghost', type: 'button', title: 'Keyingi katak bilan almashtirish', 'aria-label': 'Keyingisi bilan almashtirish', onclick: () => swap(slot, next) }, '▶') : null,
        has ? h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'O\'chirish', onclick: async () => { await deleteMedia(p.id, slot.id); present.delete(slot.id); thumbs.delete(slot.id); draw(); } }, icon('trash', 14)) : null
      )
    );
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', async (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('over'); const f = e.dataTransfer?.files?.[0]; if (f && (await put(slot, f))) draw(); });
    return el;
  }

  function groupBlock(group) {
    const kind = group.slots[0]?.kind || 'image';
    const done = group.slots.filter((s) => present.has(s.id)).length;
    const over = h('input', { type: 'checkbox', id: `ov-${group.id}` });
    const fid = `bulk-${p.id}-${group.id}`, zid = `zip-${p.id}-${group.id}`;
    const filesIn = h('input', { type: 'file', id: fid, class: 'sr-only', multiple: true, accept: kind === 'audio' ? 'audio/*' : 'image/*', onchange: (e) => { const f = [...e.target.files]; e.target.value = ''; bulk(group, f, over.checked); } });
    const zipIn = h('input', { type: 'file', id: zid, class: 'sr-only', accept: '.zip,application/zip', onchange: (e) => { const f = [...e.target.files]; e.target.value = ''; bulk(group, f, over.checked); } });
    const zone = h('div', { class: 'dropzone' },
      h('div', { class: 'send-row' },
        filesIn, h('label', { class: 'btn primary small', for: fid }, icon('plus', 16), kind === 'audio' ? 'Audiolarni tanlash (ko\'p)' : 'Rasmlarni tanlash (ko\'p)'),
        zipIn, h('label', { class: 'btn small', for: zid }, 'ZIP yuklash'),
        h('label', { class: 'switch small-switch' }, over, h('span', { class: 'track' }), h('span', {}, 'Bor fayllar ustiga yozish'))
      ),
      h('span', { class: 'muted small' }, 'Fayllarni shu yerga sudrab tashlasangiz ham bo\'ladi. Ular fayl nomi tartibida (1, 2, 3 … 10) katakchalarga joylanadi.')
    );
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); bulk(group, [...(e.dataTransfer?.files || [])], over.checked); });
    return h('div', { class: 'block media-group' },
      h('div', { class: 'block-head' }, h('h3', {}, group.title), h('span', { class: 'pill' }, `${done}/${group.slots.length}`)),
      group.hint ? h('div', { class: 'hint' }, icon('info', 16), h('span', {}, group.hint)) : null,
      zone,
      h('div', { class: 'slot-grid' }, group.slots.map((s, i) => card(group, s, i)))
    );
  }

  function draw() {
    groups = buildSlotGroups(m, p);
    const req = groups.flatMap((g) => g.slots).filter((s) => !s.optional);
    const have = req.filter((s) => present.has(s.id)).length;
    clear(root);
    root.append(
      h('div', { class: 'media-top' }, h('h2', {}, 'Rasmlar va ovoz'),
        req.length ? h('div', { class: 'prog' }, h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round((have / req.length) * 100)}%` } })), h('span', {}, `${have} / ${req.length} majburiy fayl yuklandi`)) : null),
      ...groups.map(groupBlock)
    );
  }

  (async () => { present = await listMedia(p.id); draw(); })();
  draw();
  return root;
}
