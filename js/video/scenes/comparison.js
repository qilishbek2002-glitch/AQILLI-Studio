// Comparison: 4 shablon — bars (reyting ustunlari), cards (rasmli kartalar), pairs (juftliklar), pillars (ustunlar + bayroq).
import { clamp, lerp, easeOut, easeInOut, easeBack, prog, text, rrect, background, fmtVal, titleCard, drawCell, placeholder, badge, FONT, paragraph } from '../helpers.js';

export function build(c) {
  const { items, img, W, H, plan, accent, data } = c;
  const tpl = c.ids.shablon || 'cards';
  const n = items.length;
  const D = plan.secondsPerItem || 10, I = plan.introSeconds || 6, O = plan.outroSeconds || 4;
  const duration = I + n * D + O;
  const vals = items.map((it) => Number(it.qiymat) || 0);
  const maxV = Math.max(...vals, 1e-9);
  const unit = data.birlik || '';
  const t0 = (i) => I + i * D;
  const pairs = tpl === 'pairs';

  function cell(i, second, g, x, y, w, h) {
    const slot = img[c.keys.main[Math.floor(i / 4)]];
    const j = i % 4;
    if (!slot) return placeholder(g, x, y, w, h, String(i + 1));
    if (pairs) drawCell(g, slot, 4, 2, j, second ? 1 : 0, x, y, w, h);
    else drawCell(g, slot, 2, 2, j % 2, Math.floor(j / 2), x, y, w, h);
  }
  const flag = (i) => c.flags?.[String(items[i].kod || '').toLowerCase()];

  function header(g, a = 1) {
    g.save(); g.globalAlpha = a;
    text(g, data.sarlavha || '', W / 2, H * 0.075, { size: Math.min(W, H) * (W > H ? 0.05 : 0.045), align: 'center', base: 'middle', weight: 900, max: W * 0.92 });
    g.restore();
  }

  function intro(g, t) {
    if (t < I) {
      g.fillStyle = `rgba(8,10,28,${0.6 * (1 - prog(t, I - 1, 1))})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, data.sarlavha || '', unit ? `(${unit})` : '', accent, 1 - prog(t, I - 0.8, 0.8));
    }
  }
  function outro(g, t) {
    if (t > I + n * D) {
      const a = easeOut(prog(t, I + n * D + 0.2, 0.8));
      g.fillStyle = `rgba(8,10,28,${0.6 * a})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, c.T.comment, '', accent, a);
    }
  }

  const drawers = {
    bars(g, t) {
      background(g, W, H);
      header(g);
      const top = H * 0.15, availH = H * 0.8;
      const rh = Math.min(H * 0.105, availH / n);
      const rank = (i) => n - 1 - i;
      const left = W * 0.04, iconS = rh * 0.9, barX = left + rh * 0.9 + iconS + rh * 0.25, barMax = W - barX - W * 0.16;
      for (let i = 0; i < n; i++) {
        const lt = t - t0(i);
        if (lt < 0) continue;
        const y = top + rank(i) * rh;
        const a = easeOut(prog(lt, 0, 0.5));
        g.save(); g.globalAlpha = a; g.translate((1 - a) * -W * 0.1, 0);
        text(g, String(rank(i) + 1), left + rh * 0.4, y + rh / 2, { size: rh * 0.55, align: 'center', base: 'middle', weight: 900, color: 'rgba(255,255,255,0.6)' });
        cell(i, false, g, left + rh * 0.9, y + (rh - iconS) / 2, iconS, iconS);
        const len = Math.max(rh * 0.5, (vals[i] / maxV) * barMax * easeOut(prog(lt, 0.2, 1.4)));
        const bh = rh * 0.78;
        rrect(g, barX, y + (rh - bh) / 2, len, bh, bh * 0.25);
        const hue = 160 - (rank(i) / Math.max(1, n - 1)) * 160;
        g.fillStyle = `hsl(${hue + 150}, 80%, 55%)`; g.fill();
        text(g, items[i].nom, barX + rh * 0.25, y + rh / 2, { size: rh * 0.42, base: 'middle', weight: 800, color: '#0b0b12', max: Math.max(10, len - rh * 0.4) });
        text(g, fmtVal(vals[i] * easeOut(prog(lt, 0.2, 1.4))), barX + len + rh * 0.2, y + rh / 2, { size: rh * 0.48, base: 'middle', weight: 900 });
        g.restore();
      }
      intro(g, t); outro(g, t);
    },

    cards(g, t) { slideShow(g, t, false); },
    pairs(g, t) { slideShow(g, t, true); },

    pillars(g, t) {
      background(g, W, H);
      header(g);
      const gy = H * 0.8, top = H * 0.2, mh = gy - top - H * 0.16;
      const pad = W * 0.04, slot = (W - pad * 2) / n, pw = Math.min(slot * 0.62, H * 0.22);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(pad / 2, gy, W - pad, 4);
      for (let i = 0; i < n; i++) {
        const lt = t - t0(i);
        if (lt < 0) continue;
        const x = pad + slot * i + slot / 2;
        const grow = easeOut(prog(lt, 0, 1.6));
        const ph = Math.max(6, (vals[i] / maxV) * mh * grow);
        rrect(g, x - pw / 2, gy - ph, pw, ph, pw * 0.12);
        const gr = g.createLinearGradient(0, gy - ph, 0, gy); gr.addColorStop(0, accent); gr.addColorStop(1, 'rgba(255,255,255,0.15)');
        g.fillStyle = gr; g.fill();
        const iw = Math.min(slot * 0.95, pw * 1.45);
        const a = easeOut(prog(lt, 0.9, 0.6));
        g.save(); g.globalAlpha = a;
        cell(i, false, g, x - iw / 2, gy - ph - iw - 8, iw, iw);
        text(g, fmtVal(vals[i] * grow), x, gy - ph - iw - 20, { size: Math.min(slot * 0.28, H * 0.04), align: 'center', weight: 900, max: slot * 0.98 });
        const fl = flag(i);
        const fw = Math.min(slot * 0.7, pw * 1.1), fh = fw * 0.66;
        if (fl) { g.save(); rrect(g, x - fw / 2, gy + H * 0.02, fw, fh, 6); g.clip(); g.drawImage(fl, x - fw / 2, gy + H * 0.02, fw, fh); g.restore(); }
        else if (items[i].kod) text(g, String(items[i].kod).toUpperCase(), x, gy + H * 0.02 + fh / 2, { size: fh * 0.6, align: 'center', base: 'middle', weight: 900, color: 'rgba(255,255,255,0.6)' });
        if (slot < H * 0.1) {
          g.save(); g.translate(x + H * 0.008, gy + H * 0.02 + fh + H * 0.012); g.rotate(Math.PI / 2.6);
          text(g, items[i].nom, 0, 0, { size: Math.min(slot * 0.5, H * 0.028), weight: 700, max: H * 0.16 });
          g.restore();
        } else text(g, items[i].nom, x, gy + H * 0.02 + fh + H * 0.03, { size: Math.min(slot * 0.2, H * 0.03), align: 'center', weight: 700, max: slot * 0.98 });
        g.restore();
      }
      intro(g, t); outro(g, t);
    },
  };

  function slideShow(g, t, two) {
    background(g, W, H);
    header(g);
    const idx = t < I ? 0 : Math.min(n - 1, Math.floor((t - I) / D));
    for (const i of [idx - 1, idx]) {
      if (i < 0) continue;
      const lt = t - t0(i);
      let off = 0;
      if (i === idx) off = (1 - easeInOut(prog(lt, 0, 0.7))) * W;
      else off = -easeInOut(prog(t - t0(idx), 0, 0.7)) * W;
      if (i === 0 && t < I) off = 0;
      g.save();
      g.translate(off, 0);
      const rank = n - i;
      const cy = H * 0.12;
      const land = W > H;
      badge(g, `#${rank}`, W / 2 - (land ? W * 0.05 : W * 0.12), cy, { size: Math.min(W, H) * 0.07, bg: accent, color: '#0b0b12' });
      text(g, items[i].nom + (two ? '' : ''), W / 2, H * 0.3, { size: Math.min(W, H) * (land ? 0.075 : 0.065), align: 'center', base: 'middle', weight: 900, max: W * 0.9 });
      const ah = H * 0.4, ay = H * 0.38;
      if (two) {
        const aw = Math.min(W * 0.36, ah * 1.15);
        g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 26;
        const ax = W / 2 - aw - W * 0.05;
        rrect(g, ax, ay, aw, ah, 24); g.clip();
        cell(i, false, g, ax, ay, aw, ah);
        g.restore();
        g.save(); rrect(g, W / 2 + W * 0.05, ay, aw, ah, 24); g.clip(); cell(i, true, g, W / 2 + W * 0.05, ay, aw, ah); g.restore();
        text(g, '→', W / 2, ay + ah / 2, { size: Math.min(W, H) * 0.12, align: 'center', base: 'middle', weight: 900, color: accent });
        if (items[i].ikkinchi_nom) text(g, items[i].ikkinchi_nom, W / 2 + W * 0.05 + aw / 2, ay + ah + H * 0.04, { size: Math.min(W, H) * 0.04, align: 'center', base: 'middle', weight: 700, max: aw });
      } else {
        const aw = Math.min(W * 0.5, ah * 1.3);
        g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 26;
        rrect(g, W / 2 - aw / 2, ay, aw, ah, 24); g.fillStyle = '#222'; g.fill(); g.restore();
        g.save(); rrect(g, W / 2 - aw / 2, ay, aw, ah, 24); g.clip(); cell(i, false, g, W / 2 - aw / 2, ay, aw, ah); g.restore();
      }
      const val = vals[i] * easeOut(prog(lt, 0.5, 1.2));
      const vs = Math.min(W, H) * 0.07;
      text(g, `${fmtVal(val)}${unit ? ' ' + unit : ''}`, W / 2, H * 0.9, { size: vs, align: 'center', base: 'middle', weight: 900, color: accent, max: W * 0.9, stroke: vs * 0.12 });
      g.restore();
    }
    intro(g, t); outro(g, t);
  }

  return { W, H, duration, draw: (g, t) => (drawers[tpl] || drawers.cards)(g, t), audio: [] };
}
