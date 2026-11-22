// Stikman: sahna rasmi + audio, harakat effektlari va subtitr.
import { clamp, lerp, easeOut, easeInOut, prog, text, background, paragraph, drawCover, placeholder, rrect, FONT } from '../helpers.js';

export function build(c) {
  const { items: scenes, img, aud, W, H, plan, keys } = c;
  const n = scenes.length;
  const audio = [];
  const spans = [];
  let at = 0;
  scenes.forEach((s, i) => {
    const a = aud[keys.audio?.[i]];
    const d = a ? a.duration + 0.5 : Math.max(2, Number(s.soniya) || plan.secondsPerItem || 6);
    spans.push({ s: at, d });
    if (a) audio.push({ buf: a, at: at + 0.1 });
    at += d;
  });
  const duration = Math.max(at, 1);

  function drawScene(g, i, lt, d, alpha) {
    const s = scenes[i], im = img[keys.main[i]];
    const p = clamp(lt / d);
    let zoom = 1, cx = 0.5, cy = 0.5, sh = 0;
    const eff = String(s.effekt || 'zoom_in').toLowerCase();
    if (eff === 'zoom_in') zoom = 1 + 0.18 * p;
    else if (eff === 'zoom_out') zoom = 1.18 - 0.18 * p;
    else if (eff === 'pan_left') { zoom = 1.2; cx = lerp(0.62, 0.38, p); }
    else if (eff === 'pan_right') { zoom = 1.2; cx = lerp(0.38, 0.62, p); }
    else if (eff === 'shake') { zoom = 1.08; sh = 1; }
    g.save();
    g.globalAlpha = alpha;
    if (sh) g.translate(Math.sin(lt * 38) * W * 0.004, Math.cos(lt * 31) * H * 0.004);
    if (im) drawCover(g, im, 0, 0, W, H, { zoom, cx, cy });
    else placeholder(g, W * 0.05, H * 0.05, W * 0.9, H * 0.9, `${i + 1}`);
    g.restore();
    if (c.subs && s.matn) {
      g.save(); g.globalAlpha = alpha;
      const size = Math.min(W, H) * (W > H ? 0.05 : 0.048);
      const lines = Math.min(3, Math.ceil((s.matn.length * size * 0.52) / (W * 0.86)));
      const bh = size * 1.3 * lines + size * 0.7;
      const y = H - bh - H * 0.05;
      rrect(g, W * 0.06, y, W * 0.88, bh, size * 0.4); g.fillStyle = 'rgba(0,0,0,.62)'; g.fill();
      paragraph(g, s.matn, W / 2, y + size * 0.35, W * 0.82, { size, weight: 800, align: 'center', lh: 1.3, maxLines: 3 });
      g.restore();
    }
  }

  function draw(g, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    let i = spans.findIndex((sp) => t < sp.s + sp.d);
    if (i < 0) i = n - 1;
    const sp = spans[i];
    const lt = t - sp.s;
    if (i > 0 && lt < 0.35) drawScene(g, i - 1, spans[i - 1].d + lt, spans[i - 1].d, 1);
    drawScene(g, i, lt, sp.d, i > 0 ? clamp(lt / 0.35) : 1);
  }
  return { W, H, duration, draw, audio };
}
