// Проверка сервера: node scripts/check-server.mjs [адрес]   (по умолчанию http://localhost:4322 — npm run serve)
// После выкладки: node scripts/check-server.mjs https://www.hvoia-event.ru
// Проверяет то, чего не видно в HTML: коды ответов, 301 со старого сайта, 404, сжатие, кеш, robots, sitemap.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.argv[2] || 'http://localhost:4322').replace(/\/$/, '');
const PROD = 'https://www.hvoia-event.ru';
const ok = [];
const bad = [];
const pass = (m) => ok.push(m);
const fail = (m) => bad.push(m);
const get = (path, opts = {}) =>
  fetch(BASE + path, { redirect: 'manual', headers: { 'Accept-Encoding': 'br, gzip', 'User-Agent': 'hvoia-check' }, ...opts });

// 1. Страницы из sitemap
const smIndex = await get('/sitemap-index.xml');
if (smIndex.status !== 200) fail(`sitemap-index.xml → ${smIndex.status}`);
const smUrl = (await smIndex.text()).match(/<loc>([^<]+)<\/loc>/)?.[1];
const sm = smUrl ? await (await get(new URL(smUrl).pathname)).text() : '';
const pages = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (!pages.length) fail('В sitemap нет страниц');
for (const p of pages) {
  const r = await get(p);
  const html = await r.text();
  const enc = r.headers.get('content-encoding');
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  const problems = [];
  if (r.status !== 200) problems.push(`код ${r.status}`);
  if (!/text\/html/.test(r.headers.get('content-type') ?? '')) problems.push(`content-type ${r.headers.get('content-type')}`);
  if (!enc) problems.push('без сжатия');
  if (/noindex/i.test(r.headers.get('x-robots-tag') ?? '') || /<meta[^>]*name="robots"[^>]*noindex/.test(html)) problems.push('noindex');
  if (canonical && new URL(canonical).pathname !== p) problems.push(`canonical → ${canonical}`);
  problems.length ? fail(`${p}: ${problems.join(', ')}`) : pass(`${p}: 200, ${enc}, canonical ок`);

  if (p !== '/') {
    const noSlash = await get(p.slice(0, -1));
    const loc = noSlash.headers.get('location') ?? '';
    noSlash.status === 301 && loc.endsWith(p) ? pass(`${p.slice(0, -1)} → 301 ${p}`) : fail(`${p.slice(0, -1)} → ${noSlash.status} ${loc}`);
  }
}

// 2. 301 со старого сайта: одна переадресация, цель отвечает 200
const rows = readFileSync(join(process.cwd(), '_migration', 'old-urls.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean);
let redirects = 0;
for (const line of rows) {
  const [oldUrl, , target] = line.split(';');
  const path = new URL(oldUrl).pathname;
  if (path === '/' || path === target) continue;
  const r = await get(encodeURI(decodeURI(path)));
  const loc = r.headers.get('location') ?? '';
  const to = loc ? new URL(loc, BASE).pathname : '';
  if (r.status !== 301 || decodeURI(to) !== target) {
    fail(`Старый адрес ${path} → ${r.status} ${loc || ''} (ждали 301 ${target})`);
    continue;
  }
  const final = await get(encodeURI(target));
  final.status === 200 ? redirects++ : fail(`Цель редиректа ${target} → ${final.status} (цепочка или нет страницы)`);
}
pass(`${redirects} старых адресов → 301 → 200 за один шаг`);

// 3. 404
const nf = await get('/net-takoy-stranicy-' + Date.now() + '/');
const nfHtml = await nf.text();
nf.status === 404 && /<h1/.test(nfHtml) ? pass('Несуществующий адрес → 404 со страницей сайта') : fail(`Несуществующий адрес → ${nf.status}`);

// 4. robots.txt
const robots = await get('/robots.txt');
const rtxt = await robots.text();
if (robots.status !== 200) fail(`robots.txt → ${robots.status}`);
else if (!/Sitemap:\s*\S+/.test(rtxt)) fail('В robots.txt нет Sitemap');
else if (/Disallow:\s*\/\s*$/m.test(rtxt) && BASE === PROD) fail('robots.txt закрывает весь сайт (Disallow: /) — это демо-сборка?');
else pass(`robots.txt: 200, Sitemap: ${rtxt.match(/Sitemap:\s*(\S+)/)[1]}`);

// 5. Кеш статики и заголовки
const home = await (await get('/')).text();
const asset = home.match(/\/_astro\/[^"'\s)]+\.(?:webp|woff2)/)?.[0];
if (asset) {
  const a = await get(asset);
  /immutable/.test(a.headers.get('cache-control') ?? '') ? pass(`/_astro/ кешируется на год (immutable)`) : fail(`/_astro/: Cache-Control «${a.headers.get('cache-control')}»`);
}
const h = await get('/');
for (const name of ['x-content-type-options', 'referrer-policy']) h.headers.get(name) ? pass(`Заголовок ${name}`) : fail(`Нет заголовка ${name}`);
if (BASE.startsWith('https://')) h.headers.get('strict-transport-security') ? pass('HSTS') : fail('Нет HSTS');

// 6. Зеркала (только на боевом домене)
if (BASE === PROD) {
  for (const from of ['http://www.hvoia-event.ru/', 'http://hvoia-event.ru/', 'https://hvoia-event.ru/']) {
    const r = await fetch(from, { redirect: 'manual' });
    const loc = r.headers.get('location');
    r.status === 301 && loc === PROD + '/' ? pass(`${from} → 301 ${loc}`) : fail(`${from} → ${r.status} ${loc ?? ''}`);
  }
}

console.log(`Сервер ${BASE}\n`);
ok.forEach((m) => console.log(`  ✓ ${m}`));
bad.forEach((m) => console.log(`  ✗ ${m}`));
console.log(`\n${ok.length} ок, ${bad.length} ошибок`);
process.exit(bad.length ? 1 : 0);
