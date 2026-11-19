// Карта 301 со старого сайта: node scripts/redirects.mjs
// Читает _migration/old-urls.csv и пишет:
//   deploy/nginx-redirects.conf — map для nginx (подключается в deploy/nginx.conf)
//   deploy/htaccess-redirects   — те же правила для Apache (.htaccess), если хостинг без nginx
// Проверяет: цель существует в dist/client (кроме PDF, который ждём от заказчика), нет цепочек,
// у каждого старого адреса есть вариант со слэшем и без.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = existsSync(join(ROOT, 'dist', 'client')) ? join(ROOT, 'dist', 'client') : join(ROOT, 'dist');
const rows = readFileSync(join(ROOT, '_migration', 'old-urls.csv'), 'utf8')
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const [oldUrl, title, target, comment] = line.split(';');
    return { path: decodeURI(new URL(oldUrl).pathname), title, target, comment };
  });

const problems = [];
const map = new Map();
for (const r of rows) {
  if (r.path === r.target || r.path === '/') continue; // главная остаётся на месте
  const variants = r.path.endsWith('/') || /\.[a-z0-9]+$/i.test(r.path) ? [r.path] : [r.path, `${r.path}/`];
  for (const v of variants) {
    if (map.has(v) && map.get(v) !== r.target) problems.push(`Конфликт: ${v} → ${map.get(v)} и ${r.target}`);
    map.set(v, r.target);
  }
}

// Цепочки: цель не должна сама быть старым адресом.
for (const [from, to] of map) if (map.has(to)) problems.push(`Цепочка: ${from} → ${to} → ${map.get(to)}`);
// Цели должны существовать в сборке.
const targets = [...new Set(map.values())];
for (const t of targets) {
  const file = t.endsWith('/') ? join(DIST, t, 'index.html') : join(DIST, t);
  if (!existsSync(file)) (t.endsWith('.pdf') ? console.warn : (m) => problems.push(m))(`Цели нет в сборке: ${t}${t.endsWith('.pdf') ? ' (PDF ждём от заказчика)' : ''}`);
}

const q = (s) => `"${s.replace(/"/g, '\\"')}"`;
const header = `# Сгенерировано scripts/redirects.mjs из _migration/old-urls.csv — не править руками.\n# ${map.size} правил, ${new Date().toISOString().slice(0, 10)}\n`;

const nginx = `${header}# В http { }: map $uri $hvoia_redirect { ... }, в server { }: if ($hvoia_redirect) { return 301 $hvoia_redirect; }
map $uri $hvoia_redirect {
    default "";
${[...map].map(([from, to]) => `    ${q(from)} ${q(to)};`).join('\n')}
}
`;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s');
const htaccess = `${header}# Вставить в .htaccess до остальных правил. Нужен mod_rewrite.
RewriteEngine On
${[...map].map(([from, to]) => `RewriteRule ^${esc(from.slice(1))}$ ${to} [R=301,L]`).join('\n')}
`;

mkdirSync(join(ROOT, 'deploy'), { recursive: true });
writeFileSync(join(ROOT, 'deploy', 'nginx-redirects.conf'), nginx);
writeFileSync(join(ROOT, 'deploy', 'htaccess-redirects'), htaccess);
console.log(`Редиректы: ${map.size} правил → deploy/nginx-redirects.conf, deploy/htaccess-redirects`);
if (problems.length) {
  problems.forEach((p) => console.error(`  ✗ ${p}`));
  process.exit(1);
}
