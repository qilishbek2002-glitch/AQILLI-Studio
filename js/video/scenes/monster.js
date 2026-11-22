// Monster: maxluqlar kattaligi bo'yicha qatorlanadi, kamera har biriga yaqinlashadi.
import { clamp, lerp, easeInOut, easeOut, easeBack, prog, text, rrect, background, badge, fmtVal, titleCard, drawContain, tr, placeholder, FONT } from '../helpers.js';

function human(g, x, gy, hpx) {
  const u = hpx / 7;
  g.save();
  g.strokeStyle = '#cfe0ff'; g.fillStyle = '#cfe0ff'; g.lineWidth = Math.max(2, u * 0.35); g.lineCap = 'round';
  g.beginPath(); g.arc(x, gy - hpx + u * 0.9, u * 0.9, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  g.moveTo(x, gy - hpx + u * 1.8); g.lineTo(x, gy - u * 3.2);
  g.moveTo(x - u * 1.3, gy - hpx + u * 3); g.lineTo(x + u * 1.3, gy - hpx + u * 3);
  g.moveTo(x, gy - u * 3.2); g.lineTo(x - u * 1, gy); g.moveTo(x, gy - u * 3.2); g.lineTo(x + u * 1, gy);
  g.stroke();
  g.restore();
}

export function build(c) {
  const { items, img, W, H, plan, accent, lang } = c;
  const T = tr(lang);
  const n = items.length;
  const D = plan.secondsPerItem || 8, I = plan.introSeconds || 6, O = plan.outroSeconds || 5;
  const hs = items.map((it) => Math.max(0.01, Number(it.balandlik) || 1));
  const imgs = items.map((_, i) => img[c.keys.main[i]]);
  const reals = items.map((_, i) => img[c.keys.real?.[i]]);
  const asp = imgs.map((im) => (im ? im.width / im.height : 0.7));
  const cx = [];
  items.forEach((_, i) => {
    const w = hs[i] * asp[i];
    if (i === 0) cx.push(0);
    else {
      const pw = hs[i - 1] * asp[i - 1];
      cx.push(cx[i - 1] + pw / 2 + w / 2 + Math.max(hs[i], hs[i - 1]) * 0.12);
    }
  });
  const humanX = cx[0] - (hs[0] * asp[0]) / 2 - Math.max(0.6, hs[0] * 0.3);
  const cam = (k) => {
    if (k >= n) {
      const span = cx[n - 1] + (hs[n - 1] * asp[n - 1]) / 2 - (humanX - 0.3);
      const vh = Math.max(hs[n - 1] * 1.35, span * (H / W) * 1.1);
      return { x: (cx[n - 1] + (hs[n - 1] * asp[n - 1]) / 2 + humanX - 0.3) / 2, vh };
    }
    const vh = Math.max(hs[k] * 1.5, 3);
    return { x: cx[k] - (hs[k] * asp[k]) * 0.15, vh };
  };
  const t0 = (k) => I + k * D;
  const duration = I + n * D + O;
  const gy = H * 0.84, top = H * 0.16;

  function camAt(t) {
    if (t < I) return cam(0);
    const k = Math.min(n, Math.floor((t - I) / D));
    const lt = (t - I - k * D) / (k >= n ? O : D);
    const a = k === 0 ? cam(0) : cam(k - 1);
    const b = cam(k);
    const e = easeInOut(clamp(lt / 0.4));
    return { x: lerp(a.x, b.x, e), vh: Math.exp(lerp(Math.log(a.vh), Math.log(b.vh), e)) };
  }

  function draw(g, t) {
    background(g, W, H, '#0e1330', '#241046');
    const cm = camAt(t);
    const sc = (gy - top) / cm.vh;
    const X = (x) => W / 2 + (x - cm.x) * sc;
    // yer
    const gr = g.createLinearGradient(0, gy, 0, H);
    gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, gy - 2, W, 4);

    // inson masshtabi
    if (1.75 * sc > 6) human(g, X(humanX), gy, 1.75 * sc);
    if (1.75 * sc > 26) text(g, `${T.human} 1.75 m`, X(humanX), gy - 1.75 * sc - H * 0.015, { size: H * 0.026, align: 'center', color: 'rgba(255,255,255,0.75)', weight: 700 });

    const cur = t < I ? -1 : Math.min(n - 1, Math.floor((t - I) / D));
    for (let i = 0; i < n; i++) {
      if (i > cur && t < t0(i)) continue;
      const a = easeBack(prog(t, t0(i), 0.7));
      const op = easeOut(prog(t, t0(i), 0.4));
      const hp = hs[i] * sc * (0.75 + 0.25 * a);
      const wp = hp * asp[i];
      g.save();
      g.globalAlpha = op;
      if (imgs[i]) g.drawImage(imgs[i], X(cx[i]) - wp / 2, gy - hp, wp, hp);
      else placeholder(g, X(cx[i]) - wp / 2, gy - hp, wp, hp, String(i + 1));
      g.restore();
    }

    if (cur >= 0 && t < I + n * D) {
      const i = cur;
      const lt = t - t0(i);
      const a = easeOut(prog(lt, 0.2, 0.5));
      // balandlik chizig'i
      const ty = gy - hs[i] * sc;
      g.save();
      g.globalAlpha = a * 0.9;
      g.setLineDash([16, 12]); g.strokeStyle = accent; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, ty); g.lineTo(W, ty); g.stroke();
      g.restore();
      // yuqori chap: o'rin
      g.save(); g.globalAlpha = a;
      const bs = Math.min(W, H) * 0.05;
      badge(g, `${i + 1} / ${n}`, W * 0.035, H * 0.04, { size: bs, bg: accent, color: '#0b0b12' });
      // pastki: nom va o'lcham
      const val = hs[i] * easeOut(prog(lt, 0.3, 1.1));
      const ns = Math.min(W, H) * (W > H ? 0.085 : 0.075);
      text(g, items[i].nom, W / 2, H * 0.935, { size: ns, align: 'center', weight: 900, stroke: ns * 0.18, max: W * 0.9 });
      const pill = `${T.height}: ${fmtVal(val)} m`;
      g.font = `800 ${ns * 0.5}px ${FONT}`;
      const pw = g.measureText(pill).width + ns * 0.8;
      rrect(g, W / 2 - pw / 2, H * 0.935 - ns * 1.9, pw, ns * 0.85, ns * 0.42); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
      text(g, pill, W / 2, H * 0.935 - ns * 1.47, { size: ns * 0.5, weight: 800, align: 'center', base: 'middle', color: '#fff' });
      // haqiqiy rasm kartochkasi
      if (reals[i]) {
        const cw = W > H ? W * 0.24 : W * 0.5, ch = cw * 0.75;
        const rx = W - cw - W * 0.035, ry = H * 0.04 + (1 - easeBack(prog(lt, 0.3, 0.7))) * -ch;
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24;
        rrect(g, rx - 8, ry - 8, cw + 16, ch + 16, 18); g.fillStyle = '#fff'; g.fill();
        g.restore();
        g.save(); rrect(g, rx, ry, cw, ch, 12); g.clip();
        const [iw, ih] = [reals[i].width, reals[i].height];
        const s = Math.max(cw / iw, ch / ih);
        g.drawImage(reals[i], rx + (cw - iw * s) / 2, ry + (ch - ih * s) / 2, iw * s, ih * s);
        g.restore();
      }
      g.restore();
    }
    // kirish va yakun
    if (t < I) {
      g.fillStyle = `rgba(8,10,28,${0.72 * (1 - easeInOut(prog(t, I - 1.2, 1.2)))})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, c.data.sarlavha || '', '', accent, 1 - prog(t, I - 0.8, 0.8));
    } else if (t > I + n * D) {
      const a = easeOut(prog(t, I + n * D + 0.3, 0.8));
      g.fillStyle = `rgba(8,10,28,${0.55 * a})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, T.comment, '', accent, a);
    }
  }
  return { W, H, duration, draw, audio: [] };
}
