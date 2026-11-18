// Pullik tarif: bot orqali sotib olingan kalit serverda tekshiriladi.
// Hozircha faqat tayyor tuzilma: server manzili (Sozlamalar → Tarif) kiritilmaguncha kalit tasdiqlanmaydi.
//
// Kutilgan server javobi (POST {key, device}):
//   { "ok": true, "plan": "pro", "expires": "2026-12-31", "modules": ["quiz","monster"] }  // modules bo'lmasa — hammasi
//
// Muhim: kalitni faqat dastur ichida tekshirish xavfsiz emas (osongina aylanib o'tiladi),
// shuning uchun tekshiruv serverda bo'ladi.
import { getSettings, saveSettings } from './store.js';
import { uid } from './util.js';

const CACHE_KEY = 'aqs.license';

export function deviceId() {
  try {
    let id = localStorage.getItem('aqs.device');
    if (!id) {
      id = uid() + uid();
      localStorage.setItem('aqs.device', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export function cachedLicense() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!v) return null;
    if (v.expires && new Date(v.expires) < new Date()) return null;
    return v;
  } catch {
    return null;
  }
}

export async function activate(key) {
  const s = getSettings();
  if (!s.licenseUrl) {
    return { ok: false, error: 'Tarif serveri hali sozlanmagan. Bu qism keyingi bosqichda ulanadi.' };
  }
  try {
    const r = await fetch(s.licenseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, device: deviceId() }),
    });
    const j = await r.json();
    if (!j.ok) return { ok: false, error: j.error || 'Kalit qabul qilinmadi' };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...j, key }));
    saveSettings({ licenseKey: key });
    return { ok: true, license: j };
  } catch (e) {
    return { ok: false, error: `Serverga ulanib bo'lmadi (${e.message})` };
  }
}

// Modul ochiqmi? tier "free" bo'lsa hamisha ochiq. "pro" bo'lsa — faol kalit yoki dasturchi rejimi.
export function isUnlocked(manifest) {
  if (!manifest.tier || manifest.tier === 'free') return true;
  if (getSettings().devMode) return true;
  const lic = cachedLicense();
  if (!lic) return false;
  return !Array.isArray(lic.modules) || lic.modules.includes(manifest.id);
}
