// Asl nusxani top: ko'p o'zgartirilgan nusxalar to'ri, 5 soniya hisoblagich, keyin haqiqiysi ko'rsatiladi.
import { clamp, lerp, easeOut, easeInOut, easeBack, prog, text, rrect, background, titleCard, drawContain, placeholder, checkMark, dims, tr } from '../helpers.js';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Bitta katakda asl rasmni qisman o'zgartirib chizadi
function variant(g, im, x, y, w, h, k, seed, diff) {
  const r = rng(seed * 131 + k * 17 + 7);
  const mag = clamp(1.25 - diff * 0.2, 0.25, 1.1);
  const kind = Math.floor(r() * 7);
  const sign = r() < 0.5 ? -1 : 1;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#e9ecf1'; g.fillRect(x, y, w, h);
  const pad = w * 0.06;
  let dx = 0, dy = 0, sc = 1, rot = 0, flip = false, filt = 'none';
  if (kind === 0) filt = `hue-rotate(${sign * (18 + 50 * mag)}deg)`;
  else if (kind === 1) sc = 1 - 0.14 * mag;
  else if (kind === 2) { dx = sign * w * 0.07 * mag; dy = -sign * h * 0.05 * mag; }
  else if (kind === 3) filt = `brightness(${1 + sign * 0.28 * mag})`;
  else if (kind === 4) flip = true;
  else if (kind === 5) filt = `saturate(${1 - 0.7 * mag})`;
  else rot = sign * 0.14 * mag;
  g.filter = filt;
  g.translate(x + w / 2 + dx, y + h / 2 + dy);
  g.rotate(rot); g.scale(flip ? -sc : sc, sc);
  drawContain(g, im, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2);
  g.restore();
}

export function build(c) {
  const { items: rounds, img, W, H, plan, accent, data, T, keys } = c;
  const n = rounds.length;
  const { cols, rows } = c.grid;
  const cells = cols * rows;
  const D = plan.secondsPerItem || 14, I = plan.introSeconds || 5, O = plan.outroSeconds || 5;
  const duration = I + n * D + O;
  const think = Math.min(D * 0.55, 8);
  const land = W > H;
  const ai = c.ids.variantlar === 'ai';
  const correctIdx = (i) => (ai ? clamp(((c.correct?.[i] || 1) - 1) | 0, 0, cells - 1) : (i * 7 + 3) % cells);

  function draw(g, t) {
    background(g, W, H, '#10163a', '#1b1040');
    if (t < I) { titleCard(g, W, H, data.sarlavha || T.find, '', accent, 1 - prog(t, I - 0.6, 0.6)); return; }
    if (t >= I + n * D) { titleCard(g, W, H, T.comment, '', accent, easeOut(prog(t, I + n * D, 0.6))); return; }
    const i = Math.min(n - 1, Math.floor((t - I) / D));
    const lt = t - I - i * D;
    const reveal = lt >= think;
    const rt = lt - think;
    const S = land ? H * 0.86 : W * 0.94;
    const gx = land ? W * 0.04 : (W - S) / 2, gy = land ? (H - S) / 2 : H * 0.12;
    const cw = S / cols, ch = S / rows;
    g.save();
    rrect(g, gx - 8, gy - 8, S + 16, S + 16, 18); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.rect(gx, gy, S, S); g.clip();
    const grid = img[keys.grid?.[i]];
    const orig = img[keys.main[i]];
    const cidx = correctIdx(i);
    if (ai && grid) {
      const s = Math.max(S / grid.width, S / grid.height);
      g.drawImage(grid, gx + (S - grid.width * s) / 2, gy + (S - grid.height * s) / 2, grid.width * s, grid.height * s);
    } else if (orig) {
      for (let k = 0; k < cells; k++) {
        const x = gx + (k % cols) * cw, y = gy + Math.floor(k / cols) * ch;
        if (k === cidx) { g.save(); g.beginPath(); g.rect(x + 1, y + 1, cw - 2, ch - 2); g.clip(); g.fillStyle = '#e9ecf1'; g.fillRect(x, y, cw, ch); drawContain(g, orig, x + cw * 0.06, y + ch * 0.06, cw * 0.88, ch * 0.88); g.restore(); }
        else variant(g, orig, x + 1, y + 1, cw - 2, ch - 2, k, i + 1, Number(rounds[i].qiyinlik) || 2);
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(x, y, cw, ch);
      }
    } else placeholder(g, gx, gy, S, S, 'Rasm yo\'q');
    if (reveal) {
      const a = easeOut(prog(rt, 0, 0.5));
      g.fillStyle = `rgba(0,0,0,${0.62 * a})`;
      for (let k = 0; k < cells; k++) if (k !== cidx) g.fillRect(gx + (k % cols) * cw, gy + Math.floor(k / cols) * ch, cw, ch);
    }
    g.restore();
    if (reveal) {
      const x = gx + (cidx % cols) * cw, y = gy + Math.floor(cidx / cols) * ch;
      const pulse = 1 + 0.04 * Math.sin(rt * 8);
      g.strokeStyle = '#1fe27a'; g.lineWidth = Math.max(8, cw * 0.07);
      rrect(g, x - cw * (pulse - 1) / 2, y - ch * (pulse - 1) / 2, cw * pulse, ch * pulse, 10); g.stroke();
    }
    // yon panel
    const px = land ? gx + S + W * 0.04 : W * 0.04;
    const pw = land ? W - px - W * 0.04 : W * 0.92;
    const py = land ? H * 0.12 : gy + S + H * 0.03;
    text(g, `${i + 1}/${n}`, px, py, { size: Math.min(W, H) * 0.05, weight: 900, color: accent, base: 'middle' });
    text(g, T.find, land ? px : px + pw, land ? py + H * 0.09 : py, { size: Math.min(W, H) * (land ? 0.055 : 0.045), weight: 900, align: land ? 'left' : 'right', base: 'middle', max: pw * (land ? 1 : 0.8) });
    if (!reveal) {
      const rem = Math.max(0, Math.ceil(think - lt));
      const r = Math.min(pw, H) * (land ? 0.2 : 0.09);
      const cx = land ? px + pw / 2 : W / 2, cy = land ? H * 0.5 : py + H * 0.12;
      g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = accent; g.lineWidth = r * 0.16; g.beginPath(); g.arc(cx, cy, r * 0.88, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lt / think)); g.stroke();
      text(g, String(rem), cx, cy, { size: r * 1.1, align: 'center', base: 'middle', weight: 900 });
    } else {
      const a = easeBack(prog(rt, 0.2, 0.6));
      const cx = land ? px + pw / 2 : W / 2;
      const bw = land ? pw * 0.9 : W * 0.4, bh = land ? bw : bw;
      const cy = land ? H * 0.5 : py + H * 0.03 + bh / 2;
      g.save(); g.translate(cx, cy); g.scale(a, a);
      rrect(g, -bw / 2, -bh / 2, bw, bh, 20); g.fillStyle = '#e9ecf1'; g.fill();
      if (orig) drawContain(g, orig, -bw / 2 + bw * 0.06, -bh / 2 + bh * 0.06, bw * 0.88, bh * 0.88);
      g.lineWidth = 8; g.strokeStyle = '#1fe27a'; rrect(g, -bw / 2, -bh / 2, bw, bh, 20); g.stroke();
      checkMark(g, bw / 2 - bw * 0.04, -bh / 2 + bw * 0.04, bw * 0.1);
      g.restore();
      text(g, rounds[i].nom || '', cx, cy + bh / 2 + Math.min(W, H) * 0.06, { size: Math.min(W, H) * 0.05, align: 'center', weight: 900, color: '#1fe27a', max: pw });
    }
  }
  return { W, H, duration, draw, audio: [] };
}
