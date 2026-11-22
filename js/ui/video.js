// "Video" paneli: tayyorlash, ko'rib chiqish, yozib olish va saqlash.
import { h, clear, icon, toast } from './dom.js';
import { downloadBlob } from './dom.js';
import { prepare, canRender } from '../video/build.js';
import { createPlayer, recordVideo, pickMime } from '../video/engine.js';
import { rendererOf } from '../core/slots.js';
import { saveProject } from '../core/store.js';
import { fmtDuration } from '../core/util.js';

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function videoPanel(m, p) {
  p.vid = p.vid || {};
  const root = h('div', { class: 'block video-panel' });
  if (!canRender(m)) {
    root.append(h('h2', {}, 'Video'), h('div', { class: 'msg info' }, icon('info', 18), h('span', {}, 'Bu bo\'lim uchun video yig\'ish qismi keyingi yangilanishda qo\'shiladi.')));
    return root;
  }
  const r = rendererOf(m);
  const status = h('div', { class: 'msgs' });
  const stage = h('div', { class: 'stage' });
  const result = h('div');
  let player = null, ctrl = null, recording = null;

  const q = h('select', { 'aria-label': 'Sifat', onchange: (e) => { p.vid.quality = e.target.value; saveProject(p); } },
    [['1080', 'Full HD (1080p)'], ['720', 'HD (720p, tezroq va yengil)']].map(([v, l]) => h('option', { value: v, selected: (p.vid.quality || '1080') === v }, l)));
  const subs = h('input', { type: 'checkbox', checked: p.vid.subs !== false, onchange: (e) => { p.vid.subs = e.target.checked; saveProject(p); } });
  const think = h('input', { type: 'range', min: 30, max: 85, step: 5, value: p.vid.thinkPct ?? 60, 'aria-label': 'Fikrlash ulushi', onchange: (e) => { p.vid.thinkPct = +e.target.value; saveProject(p); thinkLbl.textContent = `${e.target.value}%`; } });
  const thinkLbl = h('span', { class: 'muted small' }, `${p.vid.thinkPct ?? 60}%`);

  const prepBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => doPrepare(true) }, icon('play', 18), 'Ko\'rib chiqish');
  const recBtn = h('button', { class: 'btn', type: 'button', onclick: () => doRecord() }, icon('film', 18), 'Videoni yaratish');

  async function doPrepare(show) {
    clear(status);
    prepBtn.disabled = recBtn.disabled = true;
    const note = h('div', { class: 'msg info' }, icon('info', 18), h('span', {}, 'Rasmlar tayyorlanmoqda…'));
    status.append(note);
    try {
      const res = await prepare(m, p, { quality: p.vid.quality || '1080', subs: p.vid.subs !== false, onProgress: (i, n) => { note.lastChild.textContent = `Rasmlar tayyorlanmoqda… ${i}/${n}`; } });
      clear(status);
      if (res.missing.length) status.append(h('div', { class: 'msg warn' }, icon('warn', 18), h('span', {}, `Yuklanmagan (${res.missing.length}): ${res.missing.slice(0, 6).join(', ')}${res.missing.length > 6 ? '…' : ''}. Videoda o'rniga bo'sh joy chiqadi.`)));
      if (show) showPlayer(res.tl);
      return res.tl;
    } catch (e) {
      clear(status);
      status.append(h('div', { class: 'msg err' }, icon('warn', 18), h('span', {}, e.message || String(e))));
      return null;
    } finally {
      prepBtn.disabled = recBtn.disabled = false;
    }
  }

  function showPlayer(tl) {
    player?.destroy();
    clear(stage);
    const canvas = h('canvas', { class: 'preview', 'aria-label': 'Video ko\'rinishi' });
    const playBtn = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Boshlash/to\'xtatish' });
    const seek = h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Vaqt' });
    const time = h('span', { class: 'muted small' }, `0:00 / ${mmss(tl.duration)}`);
    player = createPlayer(canvas, tl);
    const setIcon = () => { clear(playBtn); playBtn.append(icon(player.playing ? 'pause' : 'play', 16)); };
    player.onTick = (t) => { seek.value = Math.round((t / tl.duration) * 1000); time.textContent = `${mmss(t)} / ${mmss(tl.duration)}`; };
    player.onEnd = setIcon;
    playBtn.onclick = () => { if (player.playing) player.pause(); else player.play(); setIcon(); };
    seek.oninput = () => { const was = player.playing; player.pause(); player.draw((seek.value / 1000) * tl.duration); time.textContent = `${mmss(player.time)} / ${mmss(tl.duration)}`; if (was) { player.play(); } setIcon(); };
    player.draw(Math.min(tl.duration * 0.25, 14));
    setIcon();
    stage.append(canvas, h('div', { class: 'player-bar' }, playBtn, seek, time));
    const stop = () => { player?.destroy(); window.removeEventListener('hashchange', stop); };
    window.addEventListener('hashchange', stop);
  }

  async function doRecord() {
    if (!pickMime()) { toast('Bu qurilmada videoni yozib bo\'lmaydi.', 'err'); return; }
    player?.pause();
    const tl = await doPrepare(false);
    if (!tl) return;
    clear(result);
    const ac = new AbortController();
    const bar = h('i', { style: { width: '0%' } });
    const lbl = h('span', {}, `Yozilmoqda… 0%, taxminan ${fmtDuration(tl.duration / 60)} ketadi`);
    const cancel = h('button', { class: 'btn small danger', type: 'button', onclick: () => ac.abort() }, 'Bekor qilish');
    result.append(h('div', { class: 'rec' }, h('div', { class: 'prog' }, h('div', { class: 'bar' }, bar), lbl), h('div', { class: 'hint' }, icon('info', 16), h('span', {}, 'Video haqiqiy tezlikda yozib olinadi. Shu oynani yopmang va boshqa oynaga o\'tmang, aks holda video qotib qoladi.')), cancel));
    prepBtn.disabled = recBtn.disabled = true;
    try {
      const out = await recordVideo(tl, { fps: 30, bitrate: (p.vid.quality === '720' ? 5 : 9) * 1e6, signal: ac.signal, onProgress: (v) => { bar.style.width = `${Math.round(v * 100)}%`; lbl.textContent = `Yozilmoqda… ${Math.round(v * 100)}%`; } });
      clear(result);
      const url = URL.createObjectURL(out.blob);
      const name = `${m.id}-${(p.data?.sarlavha || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'video'}.${out.ext}`;
      result.append(
        h('div', { class: 'rec' },
          h('div', { class: 'msg ok' }, icon('check', 18), h('span', {}, `Video tayyor (${(out.blob.size / 1048576).toFixed(1)} MB, ${out.ext.toUpperCase()}).`)),
          h('video', { class: 'preview', controls: true, src: url, playsinline: '' }),
          h('div', { class: 'send-row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => downloadBlob(name, out.blob).catch((e) => toast(e.message || 'Saqlab bo\'lmadi', 'err')) }, icon('download', 18), 'Videoni saqlash'))
        )
      );
    } catch (e) {
      clear(result);
      if (e.name === 'AbortError') toast('Yozish bekor qilindi');
      else result.append(h('div', { class: 'msg err' }, icon('warn', 18), h('span', {}, e.message || 'Yozishda xato')));
    } finally {
      prepBtn.disabled = recBtn.disabled = false;
    }
  }

  root.append(
    h('h2', {}, 'Video'),
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', {}, 'Sifat'), q),
      r === 'stickman' ? h('label', { class: 'switch' }, subs, h('span', { class: 'track' }), h('span', {}, 'Subtitr (matn pastda)')) : null,
      r === 'quiz' ? h('div', { class: 'field' }, h('label', {}, 'Fikrlash vaqti ulushi'), h('div', { class: 'send-row' }, think, thinkLbl)) : null
    ),
    h('div', { class: 'send-row' }, prepBtn, recBtn),
    status, stage, result
  );
  return root;
}
