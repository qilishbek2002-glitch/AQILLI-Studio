// Artifact uchun to'plam yasaydi: artifact/ papkasida bitta sahifa va uning fayllari.
//   node tools/make-artifact.mjs
// Sahifa fayli <html>/<head>/<body> teglarisiz yoziladi (platforma o'zi o'rab beradi).
import { cpSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'artifact');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const d of ['css', 'js', 'modules']) cpSync(join(root, d), join(out, d), { recursive: true });

const page = `<title>Aqilli Studio</title>
<link rel="stylesheet" href="css/app.css">
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
<script>window.__AQS_EMBEDDED__ = true;</script>
<script src="js/builtin.js"></script>
<script type="module" src="js/app.js"></script>
`;
writeFileSync(join(out, 'aqilli-studio.html'), page);

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(out, p));
  }
})(out);
const list = files.filter((f) => f !== 'aqilli-studio.html').sort();
console.log(`${list.length} ta qo'shimcha fayl`);
writeFileSync(join(out, 'files.json'), JSON.stringify(Object.fromEntries(list.map((f) => [f, f])), null, 1));
