// Har bir bo'lim uchun yuklanadigan rasm/audio "katakchalari". Bo'lim manifestidagi video.renderer bo'yicha.
import { sortedItems, getItems } from './outputs.js';
import { resolveOptions } from './prompt.js';

export function rendererOf(m) {
  return m.video?.renderer || m.id;
}

export function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
}

const pad = (n) => String(n).padStart(2, '0');

export function gridOf(m, opts) {
  const { ids } = resolveOptions(m, opts);
  const mt = /^(\d+)x(\d+)$/.exec(ids.tor || '5x5');
  return { cols: +(mt?.[1] || 5), rows: +(mt?.[2] || 5) };
}

export function buildSlotGroups(m, p) {
  const data = p.data;
  if (!data) return [];
  const r = rendererOf(m);
  const { ids } = resolveOptions(m, p.options);
  const items = sortedItems(m, data);
  const G = [];

  if (r === 'monster') {
    G.push({
      id: 'main', title: 'Maxluq rasmlari (yashil fonda)', hint: 'Kichikdan kattaga tartibda. Dastur yashil fonni o\'zi shaffof qiladi.',
      slots: items.map((it, i) => ({ id: `c-${pad(i + 1)}`, label: `${i + 1}. ${it.nom}`, sub: `${Math.round(Number(it.balandlik) * 100) / 100 || '?'} m`, kind: 'image', chroma: true })),
    });
    G.push({
      id: 'real', title: 'Haqiqiy rasmlar (ixtiyoriy)', hint: 'Videoda maxluq yonida kartochka bo\'lib chiqadi. Yuklamasangiz ham bo\'ladi.', optional: true,
      slots: items.map((it, i) => ({ id: `r-${pad(i + 1)}`, label: `${i + 1}. ${it.nom}`, kind: 'image', optional: true })),
    });
  } else if (r === 'comparison') {
    const pairs = ids.shablon === 'pairs';
    const groups = Math.ceil(items.length / 4);
    G.push({
      id: 'main', title: pairs ? 'Juftliklar rasmlari (4 ustunli)' : 'To\'rtlik rasmlar (2×2)', hint: 'AI bergan har bir rasmni butunligicha yuklang, dastur o\'zi to\'rt qismga ajratadi.',
      slots: Array.from({ length: groups }, (_, g) => ({ id: `g-${pad(g + 1)}`, label: `Rasm ${g + 1}`, sub: `${g * 4 + 1}–${Math.min(items.length, g * 4 + 4)}-obyektlar`, kind: 'image', grid: pairs ? { cols: 4, rows: 2 } : { cols: 2, rows: 2 } })),
    });
  } else if (r === 'countries-vs') {
    const t = data.tomonlar || [];
    G.push({
      id: 'main', title: 'Bayroqlar (ixtiyoriy)', hint: 'Yuklamasangiz, dastur bayroqni internetdan davlat kodi bo\'yicha o\'zi oladi.', optional: true,
      slots: [
        { id: 'flag-a', label: t[0]?.nom || 'Birinchi davlat', kind: 'image', optional: true },
        { id: 'flag-b', label: t[1]?.nom || 'Ikkinchi davlat', kind: 'image', optional: true },
      ],
    });
  } else if (r === 'quiz') {
    const qs = getItems(m, data);
    G.push({ id: 'main', title: 'Savol rasmlari', slots: qs.map((q, i) => ({ id: `q-${pad(i + 1)}-s`, label: `${i + 1}. Savol rasmi`, sub: q.savol, kind: 'image' })) });
    G.push({ id: 'ans', title: 'Javob rasmlari (dalil bilan)', hint: 'Yuklamasangiz, savol rasmining o\'zi yaqinlashtirilib ko\'rsatiladi.', optional: true, slots: qs.map((q, i) => ({ id: `q-${pad(i + 1)}-a`, label: `${i + 1}. Javob rasmi`, sub: q.dalil_nom, kind: 'image', optional: true })) });
    G.push({
      id: 'audio', title: 'Ovoz (ixtiyoriy)', hint: 'ElevenLabs yoki Google AI da tayyorlangan audiolar. Har savol uchun alohida fayl.', optional: true,
      slots: [{ id: 'a-intro', label: 'Kirish', kind: 'audio', optional: true }, ...qs.map((q, i) => ({ id: `q-${pad(i + 1)}-v`, label: `${i + 1}. Savol ovozi`, kind: 'audio', optional: true })), { id: 'a-outro', label: 'Xulosa', kind: 'audio', optional: true }],
    });
  } else if (r === 'find-original') {
    const rounds = getItems(m, data);
    G.push({ id: 'main', title: 'Asl rasmlar', slots: rounds.map((it, i) => ({ id: `o-${pad(i + 1)}`, label: `${i + 1}. ${it.nom}`, kind: 'image' })) });
    if (ids.variantlar === 'ai') {
      G.push({ id: 'grid', title: 'AI yasagan to\'r rasmlar', hint: 'Har raund uchun bitta to\'r rasm. Asl nusxa qaysi katakda ekanini quyida belgilang.', slots: rounds.map((it, i) => ({ id: `v-${pad(i + 1)}`, label: `${i + 1}. ${it.nom}`, kind: 'image', pick: true })) });
    }
  } else if (r === 'stickman') {
    const sc = getItems(m, data);
    G.push({ id: 'main', title: 'Sahna rasmlari', slots: sc.map((s, i) => ({ id: `s-${pad(i + 1)}`, label: `${i + 1}-sahna`, sub: s.matn, kind: 'image' })) });
    G.push({ id: 'audio', title: 'Ovoz (ixtiyoriy)', hint: 'Har sahna uchun alohida audio. Sahna davomiyligi audio uzunligiga moslanadi.', optional: true, slots: sc.map((s, i) => ({ id: `s-${pad(i + 1)}-v`, label: `${i + 1}-sahna ovozi`, kind: 'audio', optional: true })) });
  }
  return G;
}

export function allSlots(groups) {
  return groups.flatMap((g) => g.slots.map((s) => ({ ...s, group: g.id })));
}
