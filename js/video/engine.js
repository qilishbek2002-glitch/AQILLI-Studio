// Vaqt chizig'ini ijro etish (ko'rib chiqish) va videoga yozib olish (MediaRecorder).
import { audioContext } from './assets.js';

export function pickMime() {
  const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of list) {
    try { if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext: m.startsWith('video/mp4') ? 'mp4' : 'webm' }; } catch { /* keyingisi */ }
  }
  return null;
}

// tl: { W, H, duration, draw(g, t), audio: [{buf, at}] }
export function createPlayer(canvas, tl) {
  canvas.width = tl.W; canvas.height = tl.H;
  const g = canvas.getContext('2d');
  let t = 0, playing = false, raf = 0, t0 = 0, base = 0, nodes = [], onTick = null, onEnd = null;

  const draw = (at) => { t = Math.max(0, Math.min(tl.duration, at)); g.save(); tl.draw(g, t); g.restore(); };

  function stopAudio() {
    nodes.forEach((n) => { try { n.stop(); } catch { /* tugagan */ } });
    nodes = [];
  }

  function startAudio(ctx, dest, from) {
    const now = ctx.currentTime + 0.08;
    for (const a of tl.audio || []) {
      const end = a.at + a.buf.duration;
      if (end <= from) continue;
      const src = ctx.createBufferSource();
      src.buffer = a.buf;
      src.connect(dest);
      const when = a.at - from;
      if (when >= 0) src.start(now + when);
      else src.start(now, -when);
      nodes.push(src);
    }
  }

  function loop() {
    const el = (performance.now() - t0) / 1000;
    draw(base + el);
    onTick?.(t);
    if (base + el >= tl.duration) { playing = false; stopAudio(); onEnd?.(); return; }
    raf = requestAnimationFrame(loop);
  }

  return {
    draw,
    get time() { return t; },
    get playing() { return playing; },
    set onTick(f) { onTick = f; },
    set onEnd(f) { onEnd = f; },
    play() {
      if (playing) return;
      const ctx = audioContext();
      ctx.resume?.();
      if (t >= tl.duration - 0.05) t = 0;
      base = t; t0 = performance.now(); playing = true;
      startAudio(ctx, ctx.destination, base);
      raf = requestAnimationFrame(loop);
    },
    pause() { playing = false; cancelAnimationFrame(raf); stopAudio(); },
    destroy() { playing = false; cancelAnimationFrame(raf); stopAudio(); },
  };
}

// Videoni haqiqiy vaqtda yozadi. Natija: {blob, ext}
export function recordVideo(tl, { fps = 30, bitrate = 8_000_000, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const pm = pickMime();
    if (!pm) { reject(new Error('Bu qurilma videoni yozishni qo\'llamaydi (MediaRecorder yo\'q).')); return; }
    const canvas = document.createElement('canvas');
    canvas.width = tl.W; canvas.height = tl.H;
    const g = canvas.getContext('2d');
    const stream = canvas.captureStream(fps);
    const ctx = audioContext();
    ctx.resume?.();
    let dest = null;
    if (tl.audio?.length) {
      dest = ctx.createMediaStreamDestination();
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: pm.mime, videoBitsPerSecond: bitrate });
    } catch (e) {
      reject(e); return;
    }
    const chunks = [];
    rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
    rec.onerror = (e) => reject(e.error || new Error('Yozishda xato'));
    rec.onstop = () => { nodes.forEach((n) => { try { n.stop(); } catch { /* tugagan */ } }); resolve({ blob: new Blob(chunks, { type: pm.mime.split(';')[0] }), ext: pm.ext }); };

    const nodes = [];
    if (dest) {
      const now = ctx.currentTime + 0.15;
      for (const a of tl.audio) {
        const src = ctx.createBufferSource();
        src.buffer = a.buf; src.connect(dest); src.start(now + a.at);
        nodes.push(src);
      }
    }
    // birinchi kadrni chizib, keyin yozishni boshlaymiz
    tl.draw(g, 0);
    rec.start(1000);
    const t0 = performance.now() + 150;
    const step = () => {
      if (signal?.aborted) { rec.stop(); reject(new DOMException('Bekor qilindi', 'AbortError')); return; }
      const t = Math.max(0, (performance.now() - t0) / 1000);
      g.save(); tl.draw(g, Math.min(t, tl.duration)); g.restore();
      onProgress?.(Math.min(1, t / tl.duration));
      if (t >= tl.duration + 0.25) { rec.stop(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
