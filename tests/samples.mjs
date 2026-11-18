// Sinov uchun sun'iy "AI javoblari": har modul sxemasiga mos, rejadagi soncha yozuv bilan.

const base = (title) => ({ sarlavha: title, tavsif: 'Sinov tavsifi, bir necha gap.', teglar: ['a', 'b'] });

export function sampleFor(id, plan, optIds = {}) {
  const n = plan.items;
  const range = (k) => Array.from({ length: k }, (_, i) => i + 1);
  switch (id) {
    case 'comparison':
      return {
        ...base('Sinov comparison sarlavhasi'),
        birlik: 'km/soat',
        manba: 'Sinov',
        obyektlar: range(n).map((i) => ({
          nom: `Obyekt ${i}`,
          english: `object number ${i}, front view`,
          qiymat: n - i + 1.5,
          ...(optIds.shablon === 'pillars' ? { kod: 'US' } : {}),
          ...(optIds.shablon === 'pairs' ? { ikkinchi_nom: `Ikkinchi ${i}`, ikkinchi_english: `second thing ${i}` } : {}),
        })),
      };
    case 'monster':
      return {
        ...base('Sinov monster sarlavhasi'),
        maxluqlar: range(n).map((i) => ({
          nom: `Maxluq ${i}`,
          english: `a creature number ${i} standing tall, front view`,
          balandlik: i * 3.2,
          tur: 'fiction',
          izoh: 'Qiziq gap',
        })),
      };
    case 'countries-vs':
      return {
        ...base('Sinov davlatlar sarlavhasi'),
        yil: 2025,
        tomonlar: [
          { nom: 'Birinchi', english: 'First', kod: 'AA' },
          { nom: 'Ikkinchi', english: 'Second', kod: 'BB' },
        ],
        kategoriyalar: range(n).map((i) => ({
          nom: `Kategoriya ${i}`,
          birlik: 'mln',
          qiymat_a: i % 2 ? 10 : 5,
          qiymat_b: i % 2 ? 5 : 10,
          kattasi_yaxshi: i % 3 !== 0,
          manba: 'Sinov',
          yil: 2024,
        })),
      };
    case 'quiz':
      return {
        ...base('Sinov quiz sarlavhasi'),
        kirish: 'Salom, boshlaymiz.',
        xulosa: 'Rahmat, ko\'rganingiz uchun.',
        savollar: range(n).map((i) => ({
          savol: `Savol raqami ${i}?`,
          sahna_english: 'a quiet library at night with tall bookshelves and a reading table',
          variantlar: ['bir', 'ikki', 'uch', 'to\'rt'],
          togri: 'abcd'[i % 4],
          dalil_nom: 'Iz',
          dalil_english: 'muddy footprints on the floor',
          izoh: 'Chunki iz bor.',
          dalil_markaz: { x: 0.4, y: 0.7 },
        })),
      };
    case 'find-original':
      return {
        ...base('Sinov find sarlavhasi'),
        raundlar: range(n).map((i) => ({
          nom: `Narsa ${i}`,
          english: `flag number ${i}, flat vector, three stripes`,
          kategoriya: 'bayroq',
          qiyinlik: Math.min(5, 1 + Math.floor((i * 5) / n)),
          ozgartirish: 'rang tusi',
        })),
      };
    case 'stickman':
      return {
        ...base('Sinov stikman sarlavhasi'),
        sahnalar: range(n).map((i) => ({
          matn: `Bu ${i}-sahna matni.`,
          english: `the stick figure does action number ${i} in a room`,
          effekt: ['zoom_in', 'none', 'PAN_LEFT'][i % 3],
          soniya: 8,
        })),
      };
    default:
      throw new Error('noma\'lum modul ' + id);
  }
}
