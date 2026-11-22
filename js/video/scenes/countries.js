// Countries VS: ikki davlat bayrog'i, har kategoriyada g'olibga +1 ball.
import { clamp, easeOut, easeBack, prog, text, rrect, background, fmtVal, titleCard, checkMark, FONT } from '../helpers.js';

export function build(c) {
  const { items: cats, W, H, plan, accent, data, T } = c;
  const sides = data.tomonlar || [{ nom: 'A' }, { nom: 'B' }];
  const A = sides[0] || { nom: 'A' }, B = sides[1] || { nom: 'B' };
  const n = cats.length;
  const D = plan.secondsPerItem || 12, I = plan.introSeconds || 8, O = plan.outroSeconds || 8;
  const duration = I + n * D + O;
  const t0 = (i) => I + i * D;
  const win = cats.map((k) => {
    const a = Number(k.qiymat_a), b = Number(k.qiymat_b);
    if (!(a === a) || !(b === b) || a === b) return 0;
    const big = k.kattasi_yaxshi !== false;
    return (a > b) === big ? 1 : 2;
  });
  const scoreAt = (t) => {
    let a = 0, b = 0;
    win.forEach((w, i) => { if (t - t0(i) > 1.6) { if (w === 1) a++; else if (w === 2) b++; } });
    return [a, b];
  };
  const final = scoreAt(1e9);
  const green = '#1fe27a';
  const land = W > H;

  function flagBox(g, im, label, x, y, w, h, glow) {
    g.save();
    g.shadowColor = glow ? green : 'rgba(0,0,0,.5)'; g.shadowBlur = glow ? 50 : 24;
    rrect(g, x, y, w, h, 14); g.fillStyle = '#2a2f55'; g.fill();
    g.restore();
    g.save(); rrect(g, x, y, w, h, 14); g.clip();
    if (im) {
      const s = Math.max(w / im.width, h / im.height);
      g.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s);
    } else text(g, label, x + w / 2, y + h / 2, { size: h * 0.3, align: 'center', base: 'middle', max: w * 0.9 });
    g.restore();
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.85)'; rrect(g, x, y, w, h, 14); g.stroke();
  }

  function draw(g, t) {
    background(g, W, H, '#0e1330', '#1a0f3d');
    const fw = land ? W * 0.15 : W * 0.34, fh = fw * 0.66;
    const fy = H * 0.04;
    const fxa = W * 0.5 - (land ? W * 0.22 : W * 0.04) - fw, fxb = W * 0.5 + (land ? W * 0.22 : W * 0.04);
    const [sa, sb] = scoreAt(t);
    const endT = I + n * D;
    const showWin = t > endT;
    const wa = showWin && final[0] > final[1], wb = showWin && final[1] > final[0];
    const pop = easeBack(prog(t, 0, 0.8));
    g.save(); g.globalAlpha = easeOut(prog(t, 0, 0.5));
    flagBox(g, c.sideImg?.a, A.nom, fxa, fy, fw, fh, wa);
    flagBox(g, c.sideImg?.b, B.nom, fxb, fy, fw, fh, wb);
    const ns = Math.min(W, H) * (land ? 0.04 : 0.036);
    text(g, A.nom, fxa + fw / 2, fy + fh + ns * 1.1, { size: ns, align: 'center', weight: 900, max: fw * 1.2 });
    text(g, B.nom, fxb + fw / 2, fy + fh + ns * 1.1, { size: ns, align: 'center', weight: 900, max: fw * 1.2 });
    g.restore();
    // markaz: VS va hisob
    const cs = Math.min(W, H) * (land ? 0.1 : 0.09);
    g.save(); g.translate(W / 2, fy + fh / 2); g.scale(pop, pop);
    text(g, `${sa} : ${sb}`, 0, -cs * 0.1, { size: cs, align: 'center', base: 'middle', weight: 900, color: accent, stroke: cs * 0.1 });
    text(g, 'VS', 0, cs * 0.8, { size: cs * 0.45, align: 'center', base: 'middle', weight: 900, color: '#fff' });
    g.restore();

    // jadval (ko'p kategoriyada landshaftda ikki ustun)
    const ty = fy + fh + ns * 1.9, avail = H - ty - H * 0.025;
    const colsN = land && n > 8 ? 2 : 1;
    const perCol = Math.ceil(n / colsN);
    const rh = Math.min(H * 0.085, avail / Math.max(perCol, 1));
    const totalW = W * (land ? 0.94 : 0.94), gap = W * 0.02;
    const rowW = (totalW - gap * (colsN - 1)) / colsN, rx0 = (W - totalW) / 2;
    for (let i = 0; i < n; i++) {
      const lt = t - t0(i);
      if (lt < 0) continue;
      const col = Math.floor(i / perCol), rowI = i % perCol;
      const rx = rx0 + col * (rowW + gap);
      const y = ty + rowI * rh, a = easeOut(prog(lt, 0, 0.5));
      g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 30);
      rrect(g, rx, y + rh * 0.06, rowW, rh * 0.88, rh * 0.25);
      g.fillStyle = win[i] === 0 && lt > 1.6 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.1)'; g.fill();
      const fs = rh * 0.42;
      text(g, cats[i].nom, rx + rowW / 2, y + rh / 2, { size: fs, align: 'center', base: 'middle', weight: 800, color: 'rgba(255,255,255,.9)', max: rowW * 0.3 });
      const showV = prog(lt, 0.3, 0.4);
      g.globalAlpha = a * showV;
      const u = cats[i].birlik ? ` ${cats[i].birlik}` : '';
      text(g, `${fmtVal(Number(cats[i].qiymat_a))}${u}`, rx + rowW * 0.27, y + rh / 2, { size: fs, align: 'center', base: 'middle', weight: 900, color: win[i] === 1 && lt > 1.6 ? green : '#fff', max: rowW * 0.24 });
      text(g, `${fmtVal(Number(cats[i].qiymat_b))}${u}`, rx + rowW * 0.73, y + rh / 2, { size: fs, align: 'center', base: 'middle', weight: 900, color: win[i] === 2 && lt > 1.6 ? green : '#fff', max: rowW * 0.24 });
      const ck = easeBack(prog(lt, 1.0, 0.5));
      if (ck > 0 && win[i]) checkMark(g, win[i] === 1 ? rx + rowW * 0.07 : rx + rowW * 0.93, y + rh / 2, rh * 0.3 * ck, green);
      g.restore();
    }

    if (t < I) {
      g.fillStyle = `rgba(8,10,28,${0.55 * (1 - prog(t, I - 1, 1))})`; g.fillRect(0, 0, W, H);
      titleCard(g, W, H, data.sarlavha || `${A.nom} vs ${B.nom}`, '', accent, 1 - prog(t, I - 0.8, 0.8));
    } else if (showWin) {
      const a = easeOut(prog(t, endT + 0.4, 0.8));
      g.fillStyle = `rgba(8,10,28,${0.95 * a})`; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = a;
      const draw0 = final[0] === final[1];
      const wi = draw0 ? null : final[0] > final[1] ? c.sideImg?.a : c.sideImg?.b;
      const wn = draw0 ? T.draw : final[0] > final[1] ? A.nom : B.nom;
      const bw = land ? W * 0.26 : W * 0.7;
      if (!draw0) flagBox(g, wi, wn, W / 2 - bw / 2, H * 0.12, bw, bw * 0.66, true);
      const by = draw0 ? H * 0.3 : H * 0.12 + bw * 0.66;
      const ms = Math.min(W, H);
      if (!draw0) text(g, T.win, W / 2, by + H * 0.09, { size: ms * 0.05, align: 'center', weight: 800, color: 'rgba(255,255,255,.8)' });
      text(g, draw0 ? T.draw : wn, W / 2, by + H * (draw0 ? 0.12 : 0.2), { size: ms * 0.11, align: 'center', weight: 900, color: green, max: W * 0.9, stroke: 8 });
      text(g, `${final[0]} : ${final[1]}`, W / 2, by + H * (draw0 ? 0.3 : 0.32), { size: ms * 0.08, align: 'center', weight: 900 });
      g.restore();
    }
  }
  return { W, H, duration, draw, audio: [] };
}
