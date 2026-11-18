// Tanlovlardan AI uchun yagona buyruq yig'ish.
import { render } from './template.js';
import { computePlan, formatLabel } from './plan.js';

export const LANGUAGES = {
  uz: { label: "O'zbekcha (lotin)", name: "o'zbek tili (lotin yozuvi)" },
  qq: { label: 'Qoraqalpoqcha (lotin)', name: 'qoraqalpoq tili (lotin yozuvi)' },
  ru: { label: 'Ruscha', name: 'rus tili' },
  en: { label: 'Inglizcha', name: 'ingliz tili' },
};

export const COMMON_RULES = [
  'Javobni FAQAT bitta ```json kod blokida ber. Kod blokidan oldin va keyin hech narsa yozma.',
  "JSON to'g'ri bo'lsin: faqat ikkilik qo'shtirnoq (\"), oxirgi elementdan keyin vergul qo'yma, izoh yozma.",
  "Raqamlar faqat son bo'lsin (qo'shtirnoqsiz, ming ajratgichsiz, birlik va belgilarsiz): 5400000000, 12.5.",
  '"english" nomli maydonlar HAR DOIM ingliz tilida bo\'ladi (rasm yaratish uchun), qolgan matnlar so\'ralgan tilda.',
  "Faktik raqamlar uchun eng ishonchli manbani ishlat. Aniq bilmagan raqamni uydirma: yaqin qiymatni ber va \"manba\" maydonida taxminiy ekanini yoz.",
].join('\n');

// Tanlangan variantlarni {{opt.<id>.<kalit>}} ko'rinishida shablonga uzatish uchun yig'adi.
export function resolveOptions(manifest, chosen = {}) {
  const opt = {};
  const ids = {};
  for (const o of manifest.options || []) {
    const val = chosen[o.id] ?? o.default;
    if (o.type === 'toggle') {
      opt[o.id] = !!val;
      ids[o.id] = !!val;
    } else {
      const choice = (o.choices || []).find((c) => c.id === val) || (o.choices || [])[0];
      opt[o.id] = { id: choice?.id, label: choice?.label, ...(choice?.vars || {}) };
      ids[o.id] = choice?.id;
    }
  }
  return { opt, ids };
}

export function buildContext(manifest, { topic, minutes, format, language = 'uz', options = {} }) {
  const plan = computePlan(manifest, { minutes, format });
  const { opt, ids } = resolveOptions(manifest, options);
  return { plan, opt, optIds: ids, langName: LANGUAGES[language]?.name || LANGUAGES.uz.name };
}

export function buildCommand(manifest, input) {
  const { plan, opt, langName } = buildContext(manifest, input);
  const ctx = {
    topic: (input.topic || '').trim(),
    minutes: plan.minutes,
    durationText: plan.durationText,
    formatLabel: formatLabel(plan.format),
    format: plan.format,
    languageName: langName,
    items: plan.items,
    groups: plan.groups,
    words: plan.words,
    seconds: plan.seconds,
    opt,
    rules: COMMON_RULES,
    example: JSON.stringify(manifest.example ?? {}, null, 2),
  };
  const text = render(manifest.prompt, ctx).replace(/\n{3,}/g, '\n\n').trim();
  return { text, plan };
}
