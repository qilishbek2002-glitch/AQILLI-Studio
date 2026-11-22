// Canvas chizish yordamchilari. Hamma sahna funksiyalari vaqt t (soniya) bo'yicha "toza" chiziladi.
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeBack = (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const prog = (t, a, d) => clamp((t - a) / d);

export const FONT = '"Segoe UI", "Trebuchet MS", Arial, sans-serif';

export function fmtVal(v) {
  if (typeof v !== 'number') return String(v ?? '');
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return v.toLocaleString('en-US', { maximumFractionDigits: d }).replace(/,/g, ' ');
}

export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function text(g, s, x, y, { size = 40, weight = 800, color = '#fff', align = 'left', base = 'alphabetic', max = 0, stroke = 0, strokeColor = '#000' } = {}) {
  let sz = size;
  g.font = `${weight} ${sz}px ${FONT}`;
  if (max) {
    const w = g.measureText(s).width;
    if (w > max) { sz = Math.max(10, sz * (max / w)); g.font = `${weight} ${sz}px ${FONT}`; }
  }
  g.textAlign = align;
  g.textBaseline = base;
  if (stroke) { g.lineWidth = stroke; g.strokeStyle = strokeColor; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = color;
  g.fillText(s, x, y);
  return sz;
}

export function wrapLines(g, s, maxW, font) {
  g.font = font;
  const words = String(s).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function paragraph(g, s, x, y, maxW, { size = 34, weight = 700, color = '#fff', align = 'left', lh = 1.3, maxLines = 6 } = {}) {
  const font = `${weight} ${size}px ${FONT}`;
  const lines = wrapLines(g, s, maxW, font).slice(0, maxLines);
  g.font = font; g.textAlign = align; g.textBaseline = 'top'; g.fillStyle = color;
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
  return lines.length * size * lh;
}

export const dims = (img) => [img.width || img.videoWidth || 1, img.height || img.videoHeight || 1];

export function drawCover(g, img, x, y, w, h, { zoom = 1, cx = 0.5, cy = 0.5 } = {}) {
  const [iw, ih] = dims(img);
  const s = Math.max(w / iw, h / ih) * zoom;
  const sw = w / s, sh = h / s;
  const sx = clamp(cx * iw - sw / 2, 0, Math.max(0, iw - sw));
  const sy = clamp(cy * ih - sh / 2, 0, Math.max(0, ih - sh));
  g.drawImage(img, sx, sy, Math.min(sw, iw), Math.min(sh, ih), x, y, w, h);
}

export function drawContain(g, img, x, y, w, h) {
  const [iw, ih] = dims(img);
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return [x + (w - dw) / 2, y + (h - dh) / 2, dw, dh];
}

// Katta rasmdan (to'r) bitta katakni chizish. Chiziqlar ko'rinmasin deb chekkadan biroz kesadi.
export function drawCell(g, img, cols, rows, c, r, x, y, w, h, inset = 0.02) {
  const [iw, ih] = dims(img);
  const cw = iw / cols, ch = ih / rows;
  const sx = c * cw + cw * inset, sy = r * ch + ch * inset;
  const sw = cw * (1 - inset * 2), sh = ch * (1 - inset * 2);
  const k = Math.max(w / sw, h / sh);
  const vw = w / k, vh = h / k;
  g.drawImage(img, sx + (sw - vw) / 2, sy + (sh - vh) / 2, vw, vh, x, y, w, h);
}

export function background(g, W, H, c1 = '#10163a', c2 = '#1b1040') {
  const gr = g.createLinearGradient(0, 0, W * 0.3, H);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 2;
  const step = Math.round(Math.min(W, H) / 12);
  g.beginPath();
  for (let x = 0; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
  for (let y = 0; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();
}

export function placeholder(g, x, y, w, h, label = '?') {
  g.save();
  rrect(g, x, y, w, h, Math.min(w, h) * 0.08);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
  g.setLineDash([12, 10]); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.stroke();
  g.setLineDash([]);
  text(g, label, x + w / 2, y + h / 2, { size: Math.min(w, h) * 0.3, align: 'center', base: 'middle', color: 'rgba(255,255,255,0.45)', max: w * 0.8 });
  g.restore();
}

export function titleCard(g, W, H, title, sub, accent, a = 1) {
  g.save();
  g.globalAlpha = a;
  const pad = W * 0.08;
  const size = Math.min(W, H) * (W > H ? 0.085 : 0.075);
  const bh = paragraph(g, title, W / 2, H * 0.36, W - pad * 2, { size, weight: 900, align: 'center', lh: 1.15, maxLines: 4 });
  g.fillStyle = accent; rrect(g, W / 2 - W * 0.06, H * 0.36 + bh + size * 0.35, W * 0.12, size * 0.14, size * 0.07); g.fill();
  if (sub) paragraph(g, sub, W / 2, H * 0.36 + bh + size * 0.85, W - pad * 2.4, { size: size * 0.42, weight: 600, align: 'center', color: 'rgba(255,255,255,0.8)', maxLines: 4 });
  g.restore();
}

export function badge(g, s, x, y, { size = 40, bg = '#ff4d5e', color = '#fff', padX = 0.6 } = {}) {
  g.font = `900 ${size}px ${FONT}`;
  const w = g.measureText(s).width + size * padX * 2;
  const h = size * 1.5;
  rrect(g, x, y, w, h, h / 2);
  g.fillStyle = bg; g.fill();
  text(g, s, x + w / 2, y + h / 2 + size * 0.04, { size, weight: 900, color, align: 'center', base: 'middle' });
  return w;
}

export function checkMark(g, cx, cy, r, color = '#1fe27a') {
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  g.strokeStyle = '#06140c'; g.lineWidth = r * 0.28; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(cx - r * 0.45, cy + r * 0.02); g.lineTo(cx - r * 0.1, cy + r * 0.38); g.lineTo(cx + r * 0.5, cy - r * 0.34); g.stroke();
  g.restore();
}

// Video matnlari (til bo'yicha)
const TXT = {
  uz: { height: 'Balandlik', win: 'G\'olib', draw: 'Durang', comment: 'Qaysi biri yoqdi? Izohda yozing!', find: 'Asl nusxani top!', correct: 'To\'g\'ri javob', rank: 'o\'rin', human: 'Inson' },
  qq: { height: 'Biyiklik', win: 'Jeńimpaz', draw: 'Teń', comment: 'Qaysısı unadı? Pikirde jazıń!', find: 'Haqıyqıy nusqanı tabıń!', correct: 'Durıs juwap', rank: 'orın', human: 'Adam' },
  ru: { height: 'Высота', win: 'Победитель', draw: 'Ничья', comment: 'Что понравилось? Пишите в комментариях!', find: 'Найди оригинал!', correct: 'Правильный ответ', rank: 'место', human: 'Человек' },
  en: { height: 'Height', win: 'Winner', draw: 'Draw', comment: 'Which one is your favorite? Comment below!', find: 'Find the original!', correct: 'Correct answer', rank: 'place', human: 'Human' },
};
export const tr = (lang) => TXT[lang] || TXT.uz;
