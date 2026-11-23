// Monster: bulutli osmon, chapda o'lchov shkalasi, maxluqlar yonma-yon, kattalashgan sari kamera uzoqlashadi.
import { clamp, lerp, easeInOut, easeOut, easeBack, prog, text, rrect, fmtVal, titleCard, tr, placeholder, FONT } from '../helpers.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const DARK = '#262626';

function rngOf(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Bulutli kulrang osmonni bir marta chizib qo'yamiz
function sky(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#7b7b7b'); gr.addColorStop(0.6, '#a9a9a9'); gr.addColorStop(1, '#c4c4c4');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const r = rngOf(7);
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H * 0.95, rad = (40 + r() * 150) * (W / 1920);
    const light = r() < 0.7;
    const rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, light ? 'rgba(245,245,245,0.38)' : 'rgba(70,70,70,0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(x, y); g.scale(1.9, 0.62); g.translate(-x, -y);
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}

// Inson siluet (masshtab uchun), maxluqlar bilan bir xil quyuq rangda
function humanSil(g, cx, gy, hp) {
  const u = hp / 10;
  g.save();
  g.fillStyle = '#1c1c1c';
  g.beginPath(); g.ellipse(cx, gy - hp + u * 0.62, u * 0.5, u * 0.62, 0, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(cx - u * 0.2, gy - hp + u * 1.2); g.lineTo(cx + u * 0.2, gy - hp + u * 1.2);
  g.lineTo(cx + u * 1.5, gy - hp + u * 1.75); g.lineTo(cx + u * 1.75, gy - hp + u * 4.6);
  g.lineTo(cx + u * 1.35, gy - hp + u * 4.7); g.lineTo(cx + u * 1.15, gy - hp + u * 2.5);
  g.lineTo(cx + u * 0.95, gy - hp + u * 5.3); g.lineTo(cx + u * 0.95, gy - u * 0.2); g.lineTo(cx + u * 0.9, gy);
  g.lineTo(cx + u * 0.1, gy); g.lineTo(cx, gy - u * 4.4); g.lineTo(cx - u * 0.1, gy); g.lineTo(cx - u * 0.9, gy);
  g.lineTo(cx - u * 0.95, gy - u * 0.2); g.lineTo(cx - u * 0.95, gy - hp + u * 5.3); g.lineTo(cx - u * 1.15, gy - hp + u * 2.5);
  g.lineTo(cx - u * 1.35, gy - hp + u * 4.7); g.lineTo(cx - u * 1.75, gy - hp + u * 4.6); g.lineTo(cx - u * 1.5, gy - hp + u * 1.75);
  g.closePath(); g.fill();
  g.restore();
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  let best = p, bd = 1e9;
  for (const m of [1, 2, 5, 10]) { const v = p * m, d = Math.abs(Math.log(v / raw)); if (d < bd) { bd = d; best = v; } }
  return best;
}

export function build(c) {
  const { items, img, W, H, plan, accent, lang } = c;
  const T = tr(lang);
  const n = items.length;
  const D = plan.secondsPerItem || 8, I = plan.introSeconds || 6, O = plan.outroSeconds || 5;
  const withHuman = c.human !== false;
  const hs = items.map((it) => Math.max(0.01, Number(it.balandlik) || 1));
  const imgs = items.map((_, i) => img[c.keys.main[i]]);
  const reals = items.map((_, i) => img[c.keys.real?.[i]]);
  const asp = imgs.map((im) => (im ? im.width / im.height : 0.55));

  // dunyo koordinatalari (metr): o'ng chetda inson, maxluqlar chapga qarab joylashadi
  const wh = 1.75 * 0.34;
  let edge = withHuman ? -wh - 0.35 : 0; // keyingi maxluqning o'ng cheti
  const cx = [], left = [];
  items.forEach((_, i) => {
    const w = hs[i] * asp[i];
    const gap = Math.max(0.1 * hs[i], 0.12);
    const right = i === 0 && !withHuman ? 0 : edge;
    const l = right - w;
    cx.push((l + right) / 2); left.push(l);
    edge = l - gap;
  });
  const t0 = (k) => I + k * D;
  const duration = I + n * D + O;

  // maket
  const panelW = W * 0.14, gy = H * 0.83, top = H * 0.035;
  const plotH = gy - top, anchor = W - W * 0.03, plotWAvail = anchor - panelW - W * 0.03;
  const vhFor = (k) => {
    const kk = Math.max(0, Math.min(n - 1, k));
    let mh = withHuman ? 1.75 : 0, lw = withHuman ? -wh : 0;
    for (let i = 0; i <= kk; i++) { mh = Math.max(mh, hs[i]); lw = Math.min(lw, left[i]); }
    return Math.max(mh * 1.12, 1.2, -lw * (plotH / plotWAvail) * 1.04);
  };
  const vhAt = (t) => {
    const k = t < I ? 0 : Math.min(n - 1, Math.floor((t - I) / D));
    const prev = k === 0 ? vhFor(0) : vhFor(k - 1);
    const e = t < I ? 1 : easeInOut(prog(t, t0(k), 1.0));
    return Math.exp(lerp(Math.log(prev), Math.log(vhFor(k)), e));
  };

  let skyImg = null;

  function ruler(g, vh) {
    const sc = plotH / vh;
    const step = niceStep(vh / 5);
    // ko'rinadigan chiziqlar
    g.save();
    g.beginPath(); g.rect(panelW, 0, W - panelW, gy); g.clip();
    const half = step / 2;
    for (let v = half; v <= vh * 1.001; v += half) {
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      const y = gy - v * sc;
      g.strokeStyle = major ? 'rgba(20,20,20,0.8)' : 'rgba(20,20,20,0.75)';
      g.lineWidth = major ? Math.max(2, H * 0.002) : Math.max(2, H * 0.003);
      g.setLineDash(major ? [] : [2, H * 0.008]);
      g.beginPath(); g.moveTo(panelW, y); g.lineTo(W, y); g.stroke();
    }
    g.restore();
    g.setLineDash([]);
    // yorliqlar (chap qora panelda)
    for (let v = half; v <= vh * 1.001; v += half) {
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      const y = gy - v * sc;
      if (y < H * 0.02) continue;
      const lbl = `${fmtVal(Math.round(v * 1000) / 1000)} M`;
      const fs = major ? H * 0.056 : H * 0.021;
      g.font = `${major ? 700 : 600} ${fs}px ${SERIF}`;
      g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = major ? '#e8e8e8' : '#cfcfcf';
      g.fillText(lbl, panelW - W * 0.065, y, panelW - W * 0.08);
      g.strokeStyle = major ? '#e8e8e8' : '#cfcfcf'; g.lineWidth = major ? H * 0.004 : H * 0.0025;
      g.setLineDash(major ? [] : [2, 5]);
      g.beginPath(); g.moveTo(panelW - W * 0.058, y); g.lineTo(panelW, y); g.stroke();
      g.setLineDash([]);
    }
  }

  function draw(g, t) {
    if (!skyImg) skyImg = sky(W, H);
    g.drawImage(skyImg, 0, 0);
    const vh = vhAt(t);
    const sc = plotH / vh;
    ruler(g, vh);
    // yer va chap panel
    g.fillStyle = DARK;
    g.fillRect(0, 0, panelW, H);
    g.beginPath(); g.moveTo(panelW, gy + 2);
    const r = rngOf(3);
    for (let x = panelW; x <= W + 20; x += 24) g.lineTo(x, gy - r() * H * 0.004 + 2);
    g.lineTo(W, H); g.lineTo(panelW, H); g.closePath(); g.fill();
    // ruler yorliqlari panel ustidan qayta chiziladi (panel ularni yopmasin)
    ruler(g, vh);
    g.fillStyle = DARK; g.fillRect(0, gy + 2, panelW, H - gy);

    const X = (x) => anchor + x * sc;
    g.save();
    g.beginPath(); g.rect(panelW, 0, W - panelW, H); g.clip();
    if (withHuman) humanSil(g, X(-wh / 2), gy + 1, 1.75 * sc);
    const cur = t < I ? -1 : Math.min(n - 1, Math.floor((t - I) / D));
    for (let i = 0; i < n; i++) {
      if (t < t0(i)) continue;
      const a = easeBack(prog(t, t0(i), 0.7));
      const op = easeOut(prog(t, t0(i), 0.35));
      const hp = hs[i] * sc * (0.8 + 0.2 * a), wp = hp * asp[i];
      g.save();
      g.globalAlpha = op;
      if (imgs[i]) g.drawImage(imgs[i], X(cx[i]) - wp / 2, gy + 1 - hp, wp, hp);
      else placeholder(g, X(cx[i]) - wp / 2, gy + 1 - hp, wp, hp, String(i + 1));
      g.restore();
    }
    // joriy maxluq tagida chiziq
    if (cur >= 0 && t < I + n * D) {
      const wpx = Math.max(10, hs[cur] * asp[cur] * sc);
      g.fillStyle = accent; g.globalAlpha = easeOut(prog(t - t0(cur), 0.2, 0.4));
      g.fillRect(X(cx[cur]) - wpx / 2, gy + H * 0.012, wpx, Math.max(4, H * 0.007));
      g.globalAlpha = 1;
    }
    g.restore();

    if (cur >= 0 && t < I + n * D) {
      const lt = t - t0(cur);
      const a = easeOut(prog(lt, 0.2, 0.5));
      g.save(); g.globalAlpha = a;
      const ns = Math.min(W, H) * (W > H ? 0.06 : 0.055);
      const px = panelW + (W - panelW) / 2;
      text(g, items[cur].nom, px, H * 0.915, { size: ns, align: 'center', base: 'middle', weight: 800, color: '#f2f2f2', max: (W - panelW) * 0.55 });
      const val = hs[cur] * easeOut(prog(lt, 0.3, 1.1));
      text(g, `${fmtVal(val)} M`, W - W * 0.04, H * 0.915, { size: ns * 0.85, align: 'right', base: 'middle', weight: 700, color: accent, max: (W - panelW) * 0.2 });
      text(g, `${cur + 1} / ${n}`, panelW + W * 0.02, H * 0.915, { size: ns * 0.7, align: 'left', base: 'middle', weight: 700, color: 'rgba(255,255,255,.6)' });
      // haqiqiy rasm kartochkasi
      if (reals[cur]) {
        const cw = W > H ? (W - panelW) * 0.26 : (W - panelW) * 0.5, ch = cw * 0.75;
        const rx = W - cw - W * 0.025, ry = H * 0.035 - (1 - easeBack(prog(lt, 0.3, 0.7))) * (ch + 40);
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24;
        rrect(g, rx - 7, ry - 7, cw + 14, ch + 14, 14); g.fillStyle = '#f4f4f4'; g.fill();
        g.restore();
        g.save(); rrect(g, rx, ry, cw, ch, 8); g.clip();
        const im = reals[cur];
        const s = Math.max(cw / im.width, ch / im.height);
        g.drawImage(im, rx + (cw - im.width * s) / 2, ry + (ch - im.height * s) / 2, im.width * s, im.height * s);
        g.restore();
      }
      g.restore();
    }
    if (t < I) {
      g.fillStyle = `rgba(14,14,14,${0.72 * (1 - easeInOut(prog(t, I - 1.2, 1.2)))})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, c.data.sarlavha || '', '', '#e8e8e8', 1 - prog(t, I - 0.8, 0.8));
    } else if (t > I + n * D) {
      const a = easeOut(prog(t, I + n * D + 0.3, 0.8));
      g.fillStyle = `rgba(14,14,14,${0.6 * a})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, T.comment, '', '#e8e8e8', a);
    }
  }
  return { W, H, duration, draw, audio: [] };
}
