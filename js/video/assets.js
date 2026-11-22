// Saqlangan rasm/audio fayllarni video uchun tayyorlaydi (bitmap, yashil fonni olib tashlash, audio dekod).
import { getMedia } from '../core/media.js';

async function toBitmap(blob, maxDim) {
  const probe = await createImageBitmap(blob);
  const k = Math.min(1, maxDim / Math.max(probe.width, probe.height));
  if (k >= 1) return probe;
  const out = await createImageBitmap(blob, { resizeWidth: Math.round(probe.width * k), resizeHeight: Math.round(probe.height * k), resizeQuality: 'high' });
  probe.close?.();
  return out;
}

// Yashil (#00FF00) fonni shaffof qiladi, chetidagi yashil tusni yo'qotadi va ortiqcha bo'sh joyni qirqadi.
export function chromaKey(bitmap) {
  const w = bitmap.width, h = bitmap.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bitmap, 0, 0);
  const im = g.getImageData(0, 0, w, h);
  const d = im.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const gn = gg - Math.max(r, b);
    let a = 1;
    if (gn > 70) a = 0;
    else if (gn > 25) a = 1 - (gn - 25) / 45;
    if (gn > 8) d[i + 1] = Math.min(gg, Math.max(r, b) + 4); // yashil tusni kamaytirish
    d[i + 3] = Math.round(d[i + 3] * a);
    if (d[i + 3] > 24) {
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  g.putImageData(im, 0, 0);
  if (x1 < 0) return c;
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

const flagCache = new Map();
export async function flagImage(code) {
  const k = String(code || '').toLowerCase();
  if (!/^[a-z]{2}$/.test(k)) return null;
  if (flagCache.has(k)) return flagCache.get(k);
  let img = null;
  try {
    const r = await fetch(`https://flagcdn.com/w640/${k}.png`);
    if (r.ok) img = await createImageBitmap(await r.blob());
  } catch {
    img = null;
  }
  flagCache.set(k, img);
  return img;
}

let actx = null;
export function audioContext() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}

// slots: [{id, kind, chroma}] -> { img: {id: bitmap/canvas}, aud: {id: AudioBuffer}, missing: [ids] }
export async function loadAssets(pid, slots, onProgress) {
  const img = {};
  const aud = {};
  let n = 0;
  for (const s of slots) {
    const blob = await getMedia(pid, s.id);
    if (blob) {
      try {
        if (s.kind === 'audio') {
          const buf = await blob.arrayBuffer();
          aud[s.id] = await audioContext().decodeAudioData(buf.slice(0));
        } else {
          const bm = await toBitmap(blob, s.chroma ? 900 : 2200);
          img[s.id] = s.chroma ? chromaKey(bm) : bm;
        }
      } catch {
        /* buzilgan fayl: o'tkazib yuboriladi, videoda joy to'ldiruvchi chiqadi */
      }
    }
    onProgress?.(++n, slots.length);
  }
  return { img, aud };
}
