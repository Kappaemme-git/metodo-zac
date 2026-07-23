import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const pages = ['index.html', 'metodo.html', 'questionario.html', 'risultati.html', 'privacy.html', 'admin.html'];
const errors = [];

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`${page}: id duplicati ${[...new Set(duplicates)].join(', ')}`);
  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (!target || /^(?:https?:|mailto:|tel:|data:|#|\/api\/)/.test(match[1])) continue;
    try { await access(resolve(dirname(page), target)); }
    catch { errors.push(`${page}: riferimento mancante ${match[1]}`); }
  }
}

const scripts = ['admin.js', 'dev-server.mjs', 'api/config.js', 'api/waitlist.js', 'api/questionnaire.js', 'api/program.js', 'api/admin/session.js', 'api/admin/overview.js', 'api/admin/program.js'];
for (const file of scripts) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (error) { errors.push(`${file}: ${error.stderr?.toString() || error.message}`); }
}

const envExample = await readFile('.env.example', 'utf8');
if (/sb_secret_(?!REPLACE_ME)/.test(envExample)) errors.push('.env.example contiene una chiave reale');

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log(`Static check OK: ${pages.length} pagine, link locali e JavaScript verificati.`);
