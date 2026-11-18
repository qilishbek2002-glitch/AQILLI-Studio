// Modul yangilanishlari: yangi APK tarqatmasdan bo'lim va promptlarni GitHub (yoki istalgan URL) orqali yetkazish.
//
// Indeks fayli (updateUrl) ko'rinishi:
//   { "modules": [ { "id": "quiz", "version": "1.2.0", "url": "quiz.json" } ] }
// "url" nisbiy bo'lsa, indeks manziliga nisbatan olinadi. Har fayl — bitta modul (manifest + "prompt" matni).
import { cmpVer } from './version.js';
import { validateManifest } from './modules.js';
import { saveInstalledModule, getInstalledModules } from './store.js';

export async function checkForUpdates(indexUrl, currentModules) {
  const result = { updated: [], skipped: [], failed: [], upToDate: 0 };
  if (!indexUrl) throw new Error('Yangilanish manzili kiritilmagan (Sozlamalar → Yangilanishlar).');
  let index;
  try {
    const r = await fetch(indexUrl, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status}`);
    index = await r.json();
  } catch (e) {
    throw new Error(`Indeksni olib bo'lmadi (${e.message}). Manzil va internetni tekshiring.`);
  }
  const list = Array.isArray(index.modules) ? index.modules : [];
  const installed = getInstalledModules();
  for (const entry of list) {
    const cur = currentModules.find((m) => m.id === entry.id);
    const curVersion = installed[entry.id]?.version && cmpVer(installed[entry.id].version, cur?.version || '0.0.0') > 0
      ? installed[entry.id].version
      : cur?.version || '0.0.0';
    if (cmpVer(entry.version, curVersion) <= 0) {
      result.upToDate++;
      continue;
    }
    try {
      const url = new URL(entry.url, new URL(indexUrl, location.href)).href;
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`${r.status}`);
      const mod = await r.json();
      if (mod.id !== entry.id) throw new Error('fayl ichidagi id indeksga mos emas');
      const errs = validateManifest(mod);
      if (errs.length) {
        // Dastur versiyasi yetmasa, bu "o'tkazib yuborildi", buzuq fayl esa xato
        const needsApp = errs.find((e) => e.includes('versiyasini talab qiladi'));
        if (needsApp) result.skipped.push({ id: entry.id, reason: needsApp });
        else result.failed.push({ id: entry.id, reason: errs[0] });
        continue;
      }
      saveInstalledModule(mod);
      result.updated.push({ id: entry.id, from: curVersion, to: mod.version });
    } catch (e) {
      result.failed.push({ id: entry.id, reason: e.message });
    }
  }
  return result;
}

// Foydalanuvchi o'zi modul fayli qo'shganda (fayl yoki matn orqali)
export function installModuleFromText(text) {
  let mod;
  try {
    mod = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Fayl to\'g\'ri JSON emas'] };
  }
  const errs = validateManifest(mod);
  if (errs.length) return { ok: false, errors: errs };
  saveInstalledModule(mod);
  return { ok: true, module: mod };
}
