// Modullarni yig'adi:
//   1) js/builtin.js     — dasturga o'rnatilgan to'plam (file:// va oflayn rejim uchun)
//   2) dist/modules/*.json + dist/index.json — GitHub'ga yuklash uchun yangilanish paketi
// Ishga tushirish:  node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../js/core/modules.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = JSON.parse(readFileSync(join(root, 'modules/index.json'), 'utf8'));

const mods = [];
let bad = 0;
for (const id of ids) {
  const manifest = JSON.parse(readFileSync(join(root, `modules/${id}/manifest.json`), 'utf8'));
  manifest.prompt = readFileSync(join(root, `modules/${id}/prompt.txt`), 'utf8');
  const errs = validateManifest(manifest);
  if (errs.length) {
    bad++;
    console.error(`✗ ${id}:\n  - ${errs.join('\n  - ')}`);
  } else {
    console.log(`✓ ${id} v${manifest.version}`);
  }
  mods.push(manifest);
}
if (bad) process.exit(1);

writeFileSync(
  join(root, 'js/builtin.js'),
  `// Avtomatik yaratilgan (node tools/bundle.mjs). Qo'lda o'zgartirmang.\nwindow.__BUILTIN_MODULES__ = ${JSON.stringify(mods)};\n`
);

mkdirSync(join(root, 'dist/modules'), { recursive: true });
for (const m of mods) writeFileSync(join(root, `dist/modules/${m.id}.json`), JSON.stringify(m, null, 1));
writeFileSync(
  join(root, 'dist/index.json'),
  JSON.stringify({ modules: mods.map((m) => ({ id: m.id, version: m.version, url: `modules/${m.id}.json` })) }, null, 2)
);
console.log(`\n${mods.length} ta modul yig'ildi: js/builtin.js va dist/`);
