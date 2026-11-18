// Davomiylikdan hajmni hisoblash: nechta obyekt / savol / sahna, nechta rasm, nechta so'z.
import { fmtDuration } from './util.js';

export function availableFormats(manifest) {
  return Object.keys(manifest.plan || {}).filter((k) => k === 'long' || k === 'short');
}

export function formatLabel(format) {
  return format === 'short' ? 'Shorts (vertikal)' : 'Long (gorizontal)';
}

export function defaultMinutes(manifest, format) {
  const d = manifest.durations?.[format];
  if (d?.default) return d.default;
  return format === 'short' ? 1 : 4;
}

export function durationChoices(manifest, format) {
  const d = manifest.durations?.[format];
  if (d?.choices?.length) return d.choices;
  return format === 'short' ? [0.5, 1] : [1, 2, 3, 4, 5, 8, 10, 15];
}

export function durationLimits(manifest, format) {
  const d = manifest.durations?.[format];
  return { min: d?.min ?? (format === 'short' ? 0.25 : 0.5), max: d?.max ?? (format === 'short' ? 3 : 60) };
}

export function computePlan(manifest, { minutes, format }) {
  const cfg = manifest.plan?.[format];
  if (!cfg) throw new Error(`Bu bo'lim "${format}" formatini qo'llamaydi`);
  const warnings = [];
  const total = Math.round(minutes * 60);
  const intro = cfg.introSeconds ?? 0;
  const outro = cfg.outroSeconds ?? 0;
  const usable = Math.max(total - intro - outro, 0);
  const per = cfg.secondsPerItem;
  let items = Math.round(usable / per);
  const min = cfg.minItems ?? 1;
  const max = cfg.maxItems ?? 200;
  if (items < min) {
    warnings.push(`Bu davomiylik juda qisqa, kamida ${min} ta ${cfg.itemName || 'obyekt'} olinadi.`);
    items = min;
  }
  if (items > max) {
    warnings.push(`Bu davomiylik uchun ${cfg.itemName || 'obyekt'} soni ${max} ta bilan cheklandi.`);
    items = max;
  }
  const group = manifest.images?.group ?? 1;
  const groups = group > 1 ? Math.ceil(items / group) : items;
  const words = cfg.wordsPerMinute ? Math.round((usable / 60) * cfg.wordsPerMinute) : 0;
  return {
    minutes,
    format,
    seconds: total,
    items,
    groups,
    words,
    itemName: cfg.itemName || 'obyekt',
    durationText: fmtDuration(minutes),
    warnings,
  };
}
