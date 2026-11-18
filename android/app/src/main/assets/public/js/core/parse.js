// AI javobidan JSON ajratib olish. Kod bloki, ortiqcha matn, egri tirnoq, oxirgi vergul kabi
// odatiy muammolarni o'zi tuzatadi.

// start dagi '{' dan boshlab mos yopuvchi '}' indeksini topadi (qator ichidagi qavslarni hisobga olmaydi)
function scanObject(text, start) {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function tryParse(s) {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

function findObject(text) {
  // Faqat eng tashqi obyektlarni tekshiramiz: uzilgan javobdan ichki bo'lakni "to'liq javob" deb olmaslik uchun
  let pos = text.indexOf('{');
  while (pos !== -1) {
    const end = scanObject(text, pos);
    if (end === -1) return { unbalanced: true };
    const v = tryParse(text.slice(pos, end + 1));
    if (v) return { value: v };
    pos = text.indexOf('{', end + 1);
  }
  return { unbalanced: false };
}

function repair(text) {
  return text
    .replace(/[“”„]/g, '"') // egri qo'sh tirnoqlar
    .replace(/,\s*([}\]])/g, '$1') // oxirgi vergul
    .replace(/^\s*\/\/.*$/gm, ''); // // izohlar
}

export function parseAiResponse(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'Matn bo\'sh. AI javobini shu yerga qo\'ying.' };
  }
  let text = raw.replace(/^﻿/, '');

  // 1) ```json ... ``` bloklari
  const fences = [...text.matchAll(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/g)].map((m) => m[1]);
  const candidates = fences.length ? [...fences, text] : [text];

  for (const c of candidates) {
    const r = findObject(c);
    if (r.value) return { ok: true, data: r.value, repaired: false };
  }
  // 2) tuzatib ko'ramiz
  for (const c of candidates) {
    const r = findObject(repair(c));
    if (r.value) return { ok: true, data: r.value, repaired: true };
  }

  const hasOpen = text.includes('{');
  if (!hasOpen) {
    return { ok: false, error: 'JSON topilmadi. AI javobi {...} ko\'rinishida bo\'lishi kerak. Javobni to\'liq nusxalaganingizni tekshiring.' };
  }
  const opens = (text.match(/\{/g) || []).length;
  const closes = (text.match(/\}/g) || []).length;
  if (closes < opens) {
    return {
      ok: false,
      error: 'JSON tugallanmagan: javob oxiri uzilib qolgan ko\'rinadi (qavslar yopilmagan). AIga "davom et" deb yozing yoki javobni boshidan qayta so\'rang va to\'liq nusxalang.',
    };
  }
  return { ok: false, error: 'JSON o\'qib bo\'lmadi: tuzilishida xato bor (vergul, tirnoq yoki qavs). AIga "JSON ni to\'g\'rilab, faqat kod blokida qayta ber" deb yozing.' };
}
