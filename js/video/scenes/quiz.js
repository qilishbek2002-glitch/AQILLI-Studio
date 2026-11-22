// Quiz: savol rasmi + A/B/C/D, hisoblagich, keyin dalilga yaqinlashib qizil doira.
import { wrapLines, clamp, lerp, easeOut, easeInOut, easeBack, prog, text, rrect, background, titleCard, drawCover, paragraph, placeholder, checkMark, dims, FONT } from '../helpers.js';

const LET = ['A', 'B', 'C', 'D'];

function coverMap(img, x, y, w, h, zoom, cx, cy) {
  const [iw, ih] = dims(img);
  const s = Math.max(w / iw, h / ih) * zoom;
  const sw = w / s, sh = h / s;
  const sx = clamp(cx * iw - sw / 2, 0, Math.max(0, iw - sw));
  const sy = clamp(cy * ih - sh / 2, 0, Math.max(0, ih - sh));
  return { s, sx, sy };
}

export function build(c) {
  const { items: qs, img, aud, W, H, plan, accent, data, keys } = c;
  const n = qs.length;
  const D0 = plan.secondsPerItem || 26;
  const think = clamp((c.thinkPct ?? 60) / 100, 0.3, 0.85);
  const audio = [];
  const intA = aud[keys.audio?.[0]];
  const outA = aud[keys.audio?.[n + 1]];
  const I = Math.max(plan.introSeconds || 8, intA ? intA.duration + 0.6 : 0);
  const O = Math.max(plan.outroSeconds || 8, outA ? outA.duration + 0.6 : 0);
  if (intA) audio.push({ buf: intA, at: 0.2 });
  const spans = [];
  let at = I;
  qs.forEach((q, i) => {
    const qa = aud[keys.audio?.[i + 1]];
    const d = qa ? Math.max(8, qa.duration + 1.2) : D0;
    spans.push({ s: at, d, think: d * think, qa });
    if (qa) audio.push({ buf: qa, at: at + 0.2 });
    at += d;
  });
  if (outA) audio.push({ buf: outA, at: at + 0.2 });
  const duration = at + O;
  const land = W > H;

  function draw(g, t) {
    background(g, W, H, '#0d1230', '#1d0f3a');
    if (t < I) {
      titleCard(g, W, H, data.sarlavha || 'Quiz', data.kirish || '', accent, 1 - prog(t, I - 0.6, 0.6));
      return;
    }
    if (t >= at) {
      titleCard(g, W, H, data.xulosa || c.T.comment, '', accent, easeOut(prog(t, at, 0.6)));
      return;
    }
    let i = spans.findIndex((sp) => t < sp.s + sp.d);
    if (i < 0) i = n - 1;
    const sp = spans[i], q = qs[i];
    const lt = t - sp.s;
    const reveal = lt >= sp.think;
    const rt = lt - sp.think;

    // savol matni
    const topH = H * (land ? 0.17 : 0.14);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, 0, W, topH);
    text(g, `${i + 1}/${n}`, W * 0.03, topH / 2, { size: topH * 0.36, base: 'middle', weight: 900, color: accent });
    paragraph(g, q.savol || '', W * 0.11, topH * 0.2, W * 0.86, { size: topH * 0.3, weight: 800, maxLines: 2, lh: 1.15 });

    const pad = W * 0.025;
    const ix = pad, iy = topH + pad;
    const iw = land ? W * 0.62 : W - pad * 2;
    const ih = land ? H - iy - pad : H * 0.44;
    const scene = img[keys.main[i]];
    const ans = img[keys.ans?.[i]] || scene;
    const cur = reveal ? ans : scene;
    g.save();
    rrect(g, ix, iy, iw, ih, 22); g.clip();
    if (cur) {
      let zoom = 1, cx = 0.5, cy = 0.5;
      const pt = q.dalil_markaz || { x: 0.5, y: 0.5 };
      if (reveal) {
        const e = easeInOut(prog(rt, 0.3, 1.2));
        zoom = lerp(1, 2.3, e); cx = lerp(0.5, pt.x, e); cy = lerp(0.5, pt.y, e);
      } else zoom = 1 + lt * 0.006;
      drawCover(g, cur, ix, iy, iw, ih, { zoom, cx, cy });
      if (reveal && rt > 1.3) {
        const m = coverMap(cur, ix, iy, iw, ih, zoom, cx, cy);
        const [w0, h0] = dims(cur);
        const px = ix + (pt.x * w0 - m.sx) * m.s, py = iy + (pt.y * h0 - m.sy) * m.s;
        const r = Math.min(iw, ih) * 0.11 * (1 + 0.06 * Math.sin(rt * 6)) * easeBack(prog(rt, 1.3, 0.5));
        g.strokeStyle = '#ff2b3d'; g.lineWidth = Math.max(6, ih * 0.012);
        g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.stroke();
      }
    } else placeholder(g, ix, iy, iw, ih, 'Rasm yo\'q');
    // hisoblagich
    if (!reveal) {
      const rem = Math.ceil(sp.think - lt);
      const r = ih * 0.075, cxr = ix + iw - r * 1.6, cyr = iy + r * 1.6;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(cxr, cyr, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = accent; g.lineWidth = r * 0.18; g.beginPath(); g.arc(cxr, cyr, r * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lt / sp.think)); g.stroke();
      text(g, String(Math.max(rem, 0)), cxr, cyr, { size: r * 1.1, align: 'center', base: 'middle', weight: 900 });
    } else if (q.dalil_nom && rt > 1.3) {
      const a = easeOut(prog(rt, 1.5, 0.5));
      g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(ix, iy + ih - ih * 0.13, iw, ih * 0.13);
      text(g, q.dalil_nom, ix + iw / 2, iy + ih - ih * 0.065, { size: ih * 0.07, align: 'center', base: 'middle', weight: 900, color: '#ffd84d', max: iw * 0.9 });
      g.globalAlpha = 1;
    }
    g.restore();

    // variantlar
    const ox = land ? ix + iw + pad : pad;
    const oy = land ? iy : iy + ih + pad;
    const ow = land ? W - ox - pad : W - pad * 2;
    const oh = land ? ih : H - oy - pad;
    const rh = (oh - pad * 3) / 4;
    const correct = LET.indexOf(String(q.togri || '').toUpperCase());
    (q.variantlar || []).slice(0, 4).forEach((v, k) => {
      const y = oy + k * (rh + pad);
      const ok = reveal && k === correct;
      const dim = reveal && !ok;
      g.save();
      g.globalAlpha = dim ? 0.35 : 1;
      rrect(g, ox, y, ow, rh, rh * 0.22);
      g.fillStyle = ok ? '#1fe27a' : 'rgba(255,255,255,.12)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = ok ? '#b9ffd8' : 'rgba(255,255,255,.35)'; g.stroke();
      const cr = rh * 0.32;
      g.beginPath(); g.arc(ox + rh * 0.55, y + rh / 2, cr, 0, Math.PI * 2); g.fillStyle = ok ? '#06140c' : accent; g.fill();
      text(g, LET[k], ox + rh * 0.55, y + rh / 2, { size: cr * 1.2, align: 'center', base: 'middle', weight: 900, color: ok ? '#1fe27a' : '#0b0b12' });
      const fz = Math.min(rh * 0.3, 44);
      const nl = Math.min(2, wrapLines(g, v, ow - rh * 1.2, `800 ${fz}px sans-serif`).length);
      paragraph(g, v, ox + rh * 1.0, y + (rh - nl * fz * 1.15) / 2, ow - rh * 1.2, { size: fz, weight: 800, color: ok ? '#06140c' : '#fff', maxLines: 2, lh: 1.15 });
      g.restore();
    });
    if (reveal && q.izoh && rt > 2.2) {
      const a = easeOut(prog(rt, 2.2, 0.6));
      g.save(); g.globalAlpha = a;
      const bh = H * 0.1;
      rrect(g, pad, H - bh - pad * 0.6, W - pad * 2, bh, 16); g.fillStyle = 'rgba(0,0,0,.72)'; g.fill();
      paragraph(g, q.izoh, W / 2, H - bh - pad * 0.6 + bh * 0.14, W - pad * 4, { size: Math.min(bh * 0.3, 34), weight: 700, align: 'center', maxLines: 2, lh: 1.15 });
      g.restore();
    }
  }
  return { W, H, duration, draw, audio };
}
