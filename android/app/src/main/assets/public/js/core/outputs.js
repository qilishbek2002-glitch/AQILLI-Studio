// Tasdiqlangan AI ma'lumotidan chiqishlar yasaydi: rasm promptlari, diktor matni, hisoblangan xulosa.
// Hammasi modul manifestidagi shablonlar bilan — kod emas, ma'lumot.
import { render } from './template.js';
import { getPath } from './util.js';
import { resolveOptions } from './prompt.js';
import { COMPUTED } from './computed.js';

export function getItems(manifest, data) {
  const arr = getPath(data, manifest.dataPath);
  return Array.isArray(arr) ? arr : [];
}

// manifest.sort: {key, dir:"asc"|"desc"}; asl obyektlarning o'zi qaytadi (jadval tahrirlash uchun)
export function sortedItems(manifest, data) {
  const items = [...getItems(manifest, data)];
  const s = manifest.sort;
  if (s?.key) {
    const dir = s.dir === 'desc' ? -1 : 1;
    items.sort((a, b) => {
      const x = a?.[s.key];
      const y = b?.[s.key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x ?? '').localeCompare(String(y ?? '')) * dir;
    });
  }
  return items;
}

function resolveImagesConfig(manifest, optIds) {
  const cfg = manifest.images;
  if (!cfg) return null;
  if (!cfg.byOption) return cfg;
  const { option, configs } = cfg.byOption;
  const picked = configs?.[optIds[option]] || configs?.[Object.keys(configs || {})[0]];
  const { byOption, ...base } = cfg;
  return { ...base, ...(picked || {}) };
}

function variantActive(v, optIds) {
  if (!v.when) return true;
  return optIds[v.when.option] === v.when.equals;
}

export function buildImagePrompts(manifest, data, chosen = {}, meta = {}) {
  const { opt, ids } = resolveOptions(manifest, chosen);
  const cfg = resolveImagesConfig(manifest, ids);
  if (!cfg) return [];
  const items = sortedItems(manifest, data);
  const group = cfg.group ?? 1;
  const variants = (cfg.variants || []).filter((v) => variantActive(v, ids));
  const out = [];
  const aspect = meta.format === 'short' ? 'vertical 9:16' : 'wide 16:9';
  const base = { data, opt, total: items.length, aspect, format: meta.format || 'long' };

  if (group > 1) {
    const groups = Math.ceil(items.length / group);
    for (let g = 0; g < groups; g++) {
      const chunk = items.slice(g * group, g * group + group);
      const from = g * group + 1;
      for (const v of variants) {
        out.push({
          id: `g${String(g + 1).padStart(2, '0')}-${v.id}`,
          label: `${v.label} ${g + 1}/${groups}`,
          note: `${from}–${from + chunk.length - 1}-obyektlar`,
          prompt: render(v.template, { ...base, group: chunk, groupNo: g + 1, groups, count: chunk.length }).trim(),
        });
      }
    }
  } else {
    items.forEach((item, i) => {
      for (const v of variants) {
        out.push({
          id: `i${String(i + 1).padStart(2, '0')}-${v.id}`,
          label: `${i + 1}. ${v.label}`,
          note: item.nom || item.savol || '',
          prompt: render(v.template, { ...base, ...item, item, no: i + 1 }).trim(),
        });
      }
    });
  }
  return out;
}

export function buildVoice(manifest, data, chosen = {}) {
  if (!manifest.voice?.template) return null;
  const { opt } = resolveOptions(manifest, chosen);
  const sorted = sortedItems(manifest, data);
  const ctx = { ...data, opt };
  if (manifest.dataPath) ctx[manifest.dataPath] = sorted;
  return render(manifest.voice.template, ctx).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function buildComputed(manifest, data) {
  const fn = manifest.computed && COMPUTED[manifest.computed];
  return fn ? fn(data) : null;
}

export function wordCount(text) {
  return (text || '').split(/\s+/).filter(Boolean).length;
}

export function buildOutputs(manifest, data, chosen = {}, meta = {}) {
  const images = buildImagePrompts(manifest, data, chosen, meta);
  const voice = buildVoice(manifest, data, chosen);
  return {
    items: sortedItems(manifest, data),
    images,
    voice,
    voiceWords: voice ? wordCount(voice) : 0,
    computed: buildComputed(manifest, data),
    youtube: {
      title: data.sarlavha || '',
      description: data.tavsif || '',
      tags: Array.isArray(data.teglar) ? data.teglar : [],
    },
  };
}

export function imagesAsText(prompts) {
  return prompts.map((p, i) => `#${i + 1} ${p.label}\n${p.prompt}`).join('\n\n');
}

// Javob olinmasdan oldin taxminiy rasm soni (reja ko'rsatish uchun)
export function estimateImages(manifest, plan, chosen = {}) {
  const { ids } = resolveOptions(manifest, chosen);
  const cfg = resolveImagesConfig(manifest, ids);
  if (!cfg) return 0;
  const active = (cfg.variants || []).filter((v) => variantActive(v, ids)).length;
  const per = (cfg.group ?? 1) > 1 ? plan.groups : plan.items;
  return per * active;
}
