// AI javobini sxema bo'yicha tekshirish (JSON Schema'ning kichik qismi + dastur uchun qo'shimchalar).
// Xatolar o'zbek tilida, aniq joyi bilan: "obyektlar[3].qiymat: raqam bo'lishi kerak".
//
// Qo'shimcha kalitlar:
//   planCount: "items"   massiv uzunligi rejadagi songa mos kelishi (tolerance bilan)
//   requiredIf: {option:"shablon", in:["pairs"]}   tanlangan variantga qarab majburiy
//   transform: "upper" | "lower"   matnni tekshirishdan oldin o'zgartirish
//   unique: "raqam"      massivda shu maydon takrorlanmasligi

const MAX_ERRORS = 12;

function join(path, key) {
  return typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key;
}

function typeName(t) {
  return { string: 'matn', number: 'raqam', integer: 'butun son', boolean: 'ha/yo\'q', object: 'obyekt', array: 'ro\'yxat' }[t] || t;
}

function coerceNumber(v) {
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  if (typeof v !== 'string') return undefined;
  let s = v.trim().replace(/[\s _$€£%]/g, '');
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined;
  return Number(s);
}

function walk(schema, value, path, ctx, errs, warns) {
  const where = path || 'javob';
  const t = schema.type;

  if (value === undefined || value === null) {
    return value; // majburiylikni ota obyekt tekshiradi
  }

  if (t === 'string') {
    if (typeof value === 'number' || typeof value === 'boolean') value = String(value);
    if (typeof value !== 'string') {
      errs.push(`${where}: matn bo'lishi kerak`);
      return value;
    }
    if (schema.transform === 'upper') value = value.trim().toUpperCase();
    if (schema.transform === 'lower') value = value.trim().toLowerCase();
    if (schema.minLength && value.trim().length < schema.minLength) {
      errs.push(`${where}: juda qisqa (kamida ${schema.minLength} belgi)`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      warns.push(`${where}: juda uzun (${value.length} belgi, odatda ${schema.maxLength} dan oshmaydi)`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errs.push(`${where}: "${value}" mumkin emas, faqat ${schema.enum.join(' / ')} bo'lishi kerak`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errs.push(`${where}: "${value}" formati noto'g'ri`);
    }
    return value;
  }

  if (t === 'number' || t === 'integer') {
    const n = coerceNumber(value);
    if (n === undefined) {
      errs.push(`${where}: ${typeName(t)} bo'lishi kerak (hozir: ${JSON.stringify(value)})`);
      return value;
    }
    if (t === 'integer' && !Number.isInteger(n)) errs.push(`${where}: butun son bo'lishi kerak`);
    if (schema.minimum !== undefined && n < schema.minimum) errs.push(`${where}: ${schema.minimum} dan kichik bo'lmasligi kerak`);
    if (schema.maximum !== undefined && n > schema.maximum) errs.push(`${where}: ${schema.maximum} dan katta bo'lmasligi kerak`);
    return n;
  }

  if (t === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    errs.push(`${where}: true yoki false bo'lishi kerak`);
    return value;
  }

  if (t === 'array') {
    if (!Array.isArray(value)) {
      errs.push(`${where}: ro'yxat ([...]) bo'lishi kerak`);
      return value;
    }
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errs.push(`${where}: kamida ${schema.minItems} ta element kerak, ${value.length} ta keldi`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errs.push(`${where}: ko'pi bilan ${schema.maxItems} ta element bo'lishi kerak, ${value.length} ta keldi`);
    }
    if (schema.planCount && ctx.plan) {
      const expected = ctx.plan[schema.planCount];
      if (typeof expected === 'number') {
        const tol = schema.tolerance ?? 0.1;
        const lower = Math.ceil(expected * (1 - tol));
        const upper = Math.floor(expected * (1 + tol));
        if (value.length < lower) {
          errs.push(`${where}: ${expected} ta kerak edi, ${value.length} ta keldi. AIga "yana ${expected - value.length} ta qo'sh" deb yozing va to'liq javobni qayta qo'ying`);
        } else if (value.length > upper) {
          warns.push(`${where}: ${expected} ta kerak edi, ${value.length} ta keldi (video uzayib ketishi mumkin)`);
        } else if (value.length !== expected) {
          warns.push(`${where}: ${expected} ta o'rniga ${value.length} ta keldi (ruxsat etilgan farq)`);
        }
      }
    }
    if (schema.items) {
      value = value.map((v, i) => walk(schema.items, v, join(path, i), ctx, errs, warns));
    }
    if (schema.unique && schema.items) {
      const seen = new Set();
      value.forEach((v, i) => {
        const k = v?.[schema.unique];
        if (k === undefined) return;
        if (seen.has(k)) errs.push(`${join(path, i)}.${schema.unique}: ${JSON.stringify(k)} takrorlangan`);
        seen.add(k);
      });
    }
    return value;
  }

  if (t === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      errs.push(`${where}: obyekt ({...}) bo'lishi kerak`);
      return value;
    }
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    for (const [k, ps] of Object.entries(props)) {
      if (ps.requiredIf && ctx.opt) {
        const chosen = ctx.opt[ps.requiredIf.option];
        if (ps.requiredIf.in?.includes(chosen)) required.add(k);
      }
    }
    for (const k of required) {
      if (value[k] === undefined || value[k] === null || value[k] === '') {
        errs.push(`${join(path, k)}: yetishmayapti`);
      }
    }
    for (const [k, ps] of Object.entries(props)) {
      if (value[k] === undefined || value[k] === null) continue;
      value[k] = walk(ps, value[k], join(path, k), ctx, errs, warns);
    }
    return value;
  }

  return value;
}

export function validate(schema, data, ctx = {}) {
  const errors = [];
  const warnings = [];
  const out = walk(schema, data, '', ctx, errors, warnings);
  let shown = errors;
  if (errors.length > MAX_ERRORS) {
    shown = errors.slice(0, MAX_ERRORS);
    shown.push(`...va yana ${errors.length - MAX_ERRORS} ta xato`);
  }
  return { ok: errors.length === 0, errors: shown, warnings, data: out };
}
