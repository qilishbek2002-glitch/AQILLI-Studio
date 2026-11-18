// Veb qismini www/ papkasiga yig'adi (Capacitor shu papkani ilovaga joylaydi).
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

execSync('node tools/bundle.mjs', { stdio: 'inherit' });
rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
for (const p of ['index.html', 'css', 'js', 'modules']) {
  if (existsSync(p)) cpSync(p, `www/${p}`, { recursive: true });
}
console.log('www/ tayyor');
