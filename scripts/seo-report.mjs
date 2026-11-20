// SEO-отчёт по собранному сайту: node scripts/seo-report.mjs [--strict]
// Читает dist/, проверяет каждую страницу по правилам CLAUDE.md и пишет seo-report.html в корень проекта.
// --strict: проверка перед продакшеном — [заглушки] и отсутствие ОГРН становятся ошибками,
//           выход с кодом 1, если есть хоть одна ошибка (для CI и перед выкладкой).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
// С адаптером @astrojs/node статика лежит в dist/client.
const DIST = existsSync(join(ROOT, 'dist', 'client')) ? join(ROOT, 'dist', 'client') : join(ROOT, 'dist');
const PREVIEW = 'http://localhost:4322';
const strict = process.argv.includes('--strict');

if (!existsSync(DIST)) {
  console.error('Нет dist/ — сначала npm run build');
  process.exit(1);
}

// ---------- разбор HTML (вывод Astro предсказуемый, парсер не нужен) ----------
const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const strip = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>/])`));
  return m ? decode(m[1] ?? '') : null;
};
const meta = (html, key, value) => {
  const tag = html.match(new RegExp(`<meta[^>]*${key}="${value}"[^>]*>`));
  return tag ? attr(tag[0], 'content') : null;
};
const len = (s) => [...(s ?? '')].length;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

const urlOf = (file) => {
  const rel = relative(DIST, file).split(sep).join('/');
  return rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -10)}` : `/${rel}`;
};

// Демо на GitHub Pages собирается с BASE=/имя-репозитория/ — ссылки в HTML начинаются с него.
const BASE_PATH = (process.env.BASE || '/').replace(/\/$/, '');
const exists = (path) => {
  const local = BASE_PATH && path.startsWith(BASE_PATH + '/') ? path.slice(BASE_PATH.length) : path;
  const p = join(DIST, decodeURIComponent(local).replace(/^\//, ''));
  return existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
};

const sitemapUrls = (() => {
  const f = join(DIST, 'sitemap-0.xml');
  if (!existsSync(f)) return null;
  return [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
})();

// ---------- проверка страницы ----------
function check(file) {
  const html = readFileSync(file, 'utf8');
  const url = urlOf(file);
  const body = html.slice(html.indexOf('<body'));
  const issues = [];
  const err = (msg) => issues.push({ level: 'error', msg });
  const warn = (msg) => issues.push({ level: 'warn', msg });

  const title = strip(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = meta(html, 'name', 'description');
  const robots = meta(html, 'name', 'robots');
  const noindex = /noindex/.test(robots ?? '');
  const canonical = attr(html.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? '', 'href');
  const lang = attr(html.match(/<html[^>]*>/)?.[0] ?? '', 'lang');
  const og = Object.fromEntries(
    ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map((k) => [k, meta(html, 'property', k)]),
  );

  if (!title) err('Нет title');
  else if (len(title) > 60) err(`Title ${len(title)} симв. — больше 60`);
  if (!description) err('Нет description');
  else if (len(description) < 140 || len(description) > 160) (noindex ? warn : err)(`Description ${len(description)} симв. — нужно 140–160`);
  if (lang !== 'ru') err(`lang="${lang ?? ''}", нужен ru`);
  if (!noindex && !canonical) err('Нет canonical');
  if (canonical && !canonical.endsWith('/')) err('Canonical без слэша на конце');
  for (const [k, v] of Object.entries(og)) if (!v) err(`Нет ${k}`);
  if (og['og:image']) {
    const ogPath = new URL(og['og:image']).pathname.replace(/^\/[^/]+(?=\/_astro\/)/, '');
    if (!exists(ogPath)) err(`Файла og:image нет в сборке: ${ogPath}`);
  }

  // заголовки
  const headings = [...body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({ level: +m[1], text: strip(m[2]) }));
  const h1 = headings.filter((h) => h.level === 1);
  if (h1.length !== 1) err(`H1: ${h1.length} шт. — нужен ровно один`);
  headings.forEach((h, i) => {
    const prev = headings[i - 1];
    h.jump = prev && h.level - prev.level > 1;
    if (h.jump) err(`Скачок заголовков: H${prev.level} → H${h.level} («${h.text}»)`);
    if (!h.text) err(`Пустой H${h.level}`);
  });
  if (headings[0] && headings[0].level !== 1) warn(`Первый заголовок — H${headings[0].level}, а не H1`);

  // картинки
  const imgs = [...body.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const images = imgs.map((t) => ({
    src: attr(t, 'src'),
    alt: attr(t, 'alt'),
    decorative: attr(t, 'aria-hidden') === 'true',
    sized: attr(t, 'width') !== null && attr(t, 'height') !== null,
    lazy: attr(t, 'loading'),
    priority: attr(t, 'fetchpriority'),
  }));
  images.forEach((im) => {
    if (im.alt === null) err(`Картинка без alt: ${im.src}`);
    else if (!im.alt && !im.decorative) err(`Пустой alt у контентной картинки: ${im.src}`);
    if (!im.sized) err(`Картинка без width/height (сдвиг макета): ${im.src}`);
    if (im.src && !/\.(webp|avif|svg)(\?|$)/.test(im.src)) warn(`Не WebP: ${im.src}`);
  });

  // файлы, на которые ссылаются картинки, <source>, preload и url() во встроенном CSS, — должны быть в сборке
  const asset = (u) => u.replace(/^\/[^/]+(?=\/_astro\/)/, ''); // демо в подпапке: /hvoia-site/_astro/… → /_astro/…
  const missing = new Set();
  const need = (u) => {
    if (!u || /^(data:|https?:|#|%23|mailto:|tel:)/i.test(u)) return; // %23… — ссылка внутри встроенного SVG
    if (!u.startsWith('/')) return missing.add(`${u} (относительный путь — файл не найдётся)`);
    if (!exists(asset(u.split(/[?#]/)[0]))) missing.add(u);
  };
  for (const t of body.match(/<(?:img|source)\b[^>]*>/g) ?? []) {
    need(attr(t, 'src'));
    const srcset = attr(t, 'srcset');
    srcset?.split(',').forEach((c) => need(c.trim().split(/\s+/)[0]));
    if (srcset && /\d+w\b/.test(srcset) && !attr(t, 'sizes')) err(`srcset без sizes (браузер возьмёт файл на всю ширину экрана): ${attr(t, 'src') ?? srcset.slice(0, 60)}`);
  }
  for (const t of html.match(/<link[^>]*rel="preload"[^>]*>/g) ?? []) need(attr(t, 'href'));
  for (const css of html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? [])
    for (const m of css.matchAll(/url\((["']?)([^"')]+)\1\)/g)) need(m[2]);
  missing.forEach((u) => err(`Файла нет в сборке: ${u}`));

  // JSON-LD
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try {
      const data = JSON.parse(m[1]);
      return { type: [].concat(data['@type']).join(', '), ok: true, data };
    } catch (e) {
      err(`JSON-LD не парсится: ${e.message}`);
      return { type: '?', ok: false };
    }
  });
  const types = jsonld.map((j) => j.type);
  // Какие типы обязаны быть на странице (CLAUDE.md, «Специфика проекта»).
  const expected = {
    '/': ['LodgingBusiness', 'FAQPage'],
    '/kottedzh/': ['House', 'FAQPage'],
    '/svadby/': ['EventVenue', 'FAQPage'],
    '/prazdniki/': ['EventVenue'],
    '/ceny/': ['OfferCatalog', 'FAQPage'],
    '/foto/': ['ImageGallery'],
    '/kontakty/': ['LodgingBusiness'],
  }[url] ?? [];
  for (const t of expected) if (!types.includes(t)) err(`Нет JSON-LD ${t}`);
  if (url !== '/' && !noindex && !types.includes('BreadcrumbList')) err('Нет BreadcrumbList');
  if (/<details/.test(body) && !types.includes('FAQPage')) warn('Есть FAQ, но нет FAQPage');

  // ссылки
  const hrefs = [...body.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => decode(m[1]));
  const internal = [...new Set(hrefs.filter((h) => h.startsWith('/') && !h.startsWith('//')))];
  const broken = internal.filter((h) => !exists(h.split('#')[0].split('?')[0]));
  broken.forEach((h) => err(`Битая внутренняя ссылка: ${h}`));
  internal
    .filter((h) => {
      const p = h.split('#')[0];
      return p && !p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p);
    })
    .forEach((h) => err(`Ссылка без слэша на конце: ${h}`));
  const ids = new Set([...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  hrefs
    .filter((h) => h.startsWith('#') && h.length > 1 && !ids.has(h.slice(1)))
    .forEach((h) => err(`Якорь ведёт в никуда: ${h}`));
  const external = [...new Set(hrefs.filter((h) => /^https?:/.test(h)))];

  // заглушки и коммерческие факторы
  const text = strip(body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''));
  const placeholders = [...new Set(text.match(/\[[^\]]{2,120}\]/g) ?? [])];
  if (placeholders.length) (strict ? err : warn)(`Незакрытые [заглушки]: ${placeholders.length} — ${placeholders.slice(0, 3).join(' ')}${placeholders.length > 3 ? ' …' : ''}`);
  const footer = strip(html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '');
  const commerce = {
    телефон: /\+7[\s\d()-]{10,}/.test(footer),
    адрес: /ул\./.test(footer),
    email: /@/.test(footer),
    ИНН: /ИНН\s*\d{10}/.test(footer),
    ОГРН: /ОГРН\s*\d{13}/.test(footer),
  };
  for (const [k, ok] of Object.entries(commerce)) if (!ok) (k === 'ОГРН' && !strict ? warn : err)(`В подвале нет: ${k}`);

  if (sitemapUrls && !noindex && !sitemapUrls.includes(url)) err('Страницы нет в sitemap');
  if (sitemapUrls && noindex && sitemapUrls.includes(url)) err('Закрытая от индекса страница есть в sitemap');

  const words = text.split(/\s+/).filter((w) => /[а-яёa-z]/i.test(w)).length;
  return { url, file, title, description, robots, noindex, canonical, lang, og, headings, images, jsonld, internal, external, placeholders, commerce, words, issues };
}

const pages = walk(DIST).map(check).sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.url.localeCompare(b.url)));

// дубли title / description
for (const key of ['title', 'description']) {
  const seen = new Map();
  for (const p of pages) if (p[key]) seen.set(p[key], [...(seen.get(p[key]) ?? []), p.url]);
  for (const [, urls] of seen) if (urls.length > 1) for (const p of pages.filter((x) => urls.includes(x.url))) p.issues.push({ level: 'error', msg: `${key} совпадает с ${urls.filter((u) => u !== p.url).join(', ')}` });
}

// сайт целиком
const site = [];
const robotsTxt = join(DIST, 'robots.txt');
if (!existsSync(robotsTxt)) site.push({ level: 'error', msg: 'Нет robots.txt (этап 6)' });
else if (/^Disallow:\s*\/\s*$/m.test(readFileSync(robotsTxt, 'utf8')))
  site.push({ level: process.env.PUBLIC_NOINDEX === 'true' ? 'warn' : 'error', msg: 'robots.txt закрывает весь сайт (Disallow: /) — так только в демо-сборке' });
else if (!/Sitemap:/i.test(readFileSync(robotsTxt, 'utf8'))) site.push({ level: 'error', msg: 'В robots.txt нет Sitemap' });
if (!existsSync(join(DIST, 'sitemap-index.xml'))) site.push({ level: 'error', msg: 'Нет sitemap-index.xml' });
else site.push({ level: 'ok', msg: `sitemap: ${sitemapUrls?.length ?? 0} URL` });
for (const f of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'site.webmanifest'])
  if (!existsSync(join(DIST, f))) site.push({ level: 'error', msg: `Нет ${f}` });

const count = (level) => pages.reduce((n, p) => n + p.issues.filter((i) => i.level === level).length, 0) + site.filter((i) => i.level === level).length;
const errors = count('error');
const warns = count('warn');

// ---------- HTML-отчёт ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const show = (s) => esc(s).replace(/ /g, '<span class="nb" title="неразрывный пробел">·</span>');
const badge = (n, lo, hi, s) => `<span class="len ${n >= lo && n <= hi ? 'ok' : 'bad'}">${n}</span>${s ? ` <small>${s}</small>` : ''}`;
const issueList = (list) =>
  list.length
    ? `<ul class="issues">${list.map((i) => `<li class="${i.level}">${esc(i.msg)}</li>`).join('')}</ul>`
    : '<p class="allgood">Замечаний нет</p>';

const pageCard = (p) => {
  const e = p.issues.filter((i) => i.level === 'error').length;
  const w = p.issues.filter((i) => i.level === 'warn').length;
  const status = e ? 'error' : w ? 'warn' : 'ok';
  return `
<details class="page ${status}" id="p${esc(p.url.replace(/\W/g, '-'))}">
  <summary>
    <span class="dot"></span><code>${esc(p.url)}</code>
    <span class="t">${esc(p.title)}</span>
    <span class="counts">${e ? `<b class="e">${e} ош.</b>` : ''}${w ? `<b class="w">${w} пред.</b>` : ''}${!e && !w ? '<b class="o">ок</b>' : ''}</span>
  </summary>
  <div class="grid">
    <section>
      <h3>Мета-теги</h3>
      <dl>
        <dt>title ${badge(len(p.title), 1, 60, '≤ 60')}</dt><dd>${show(p.title)}</dd>
        <dt>description ${badge(len(p.description), 140, 160, '140–160')}</dt><dd>${show(p.description)}</dd>
        <dt>canonical</dt><dd>${p.canonical ? `<code>${esc(p.canonical)}</code>` : '<i>нет</i>'}</dd>
        <dt>robots</dt><dd>${p.robots ? `<code>${esc(p.robots)}</code>` : '<i>не задан → индексируется</i>'}</dd>
        <dt>lang</dt><dd><code>${esc(p.lang)}</code></dd>
      </dl>
      <h3>Open Graph</h3>
      <dl>
        ${Object.entries(p.og).map(([k, v]) => `<dt>${k}</dt><dd>${k === 'og:image' && v ? `<code>${esc(v)}</code>` : show(v) || '<i>нет</i>'}</dd>`).join('')}
      </dl>
      ${p.og['og:image'] ? `<img class="og" src="${esc(p.og['og:image'].replace(/^https?:\/\/[^/]+/, PREVIEW))}" alt="OG-картинка" loading="lazy">` : ''}
    </section>
    <section>
      <h3>Заголовки (${p.headings.length})</h3>
      <ol class="outline">${p.headings.map((h) => `<li class="h${h.level}${h.jump ? ' jump' : ''}" style="--l:${h.level - 1}"><b>H${h.level}</b> ${show(h.text)}</li>`).join('')}</ol>
      <h3>Микроразметка JSON-LD</h3>
      ${p.jsonld.length ? `<ul class="plain">${p.jsonld.map((j) => `<li><details><summary><code>${esc(j.type)}</code></summary><pre>${esc(JSON.stringify(j.data, null, 2))}</pre></details></li>`).join('')}</ul>` : '<p><i>нет</i></p>'}
    </section>
    <section>
      <h3>Картинки (${p.images.length})</h3>
      <table class="imgs"><thead><tr><th>alt</th><th>загрузка</th></tr></thead><tbody>
        ${p.images.map((im) => `<tr><td>${im.decorative ? '<i>декор, alt=""</i>' : im.alt ? show(im.alt) : '<b class="e">нет alt</b>'}</td><td><code>${im.priority === 'high' ? 'LCP, high' : im.lazy ?? 'eager'}</code></td></tr>`).join('')}
      </tbody></table>
      <h3>Ссылки</h3>
      <p>Внутренних: ${p.internal.length}, внешних: ${p.external.length}. Слов на странице: ${p.words}.</p>
      <h3>Коммерческие факторы в подвале</h3>
      <p class="chips">${Object.entries(p.commerce).map(([k, ok]) => `<span class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${k}</span>`).join(' ')}</p>
      ${p.placeholders.length ? `<h3>Заглушки [ ] (${p.placeholders.length})</h3><ul class="ph">${p.placeholders.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    </section>
  </div>
  <h3>Замечания</h3>
  ${issueList(p.issues)}
  <p class="open"><a href="${PREVIEW}${esc(p.url)}" target="_blank">Открыть страницу</a> · <a href="view-source:${PREVIEW}${esc(p.url)}" target="_blank">исходный код</a></p>
</details>`;
};

const report = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEO-отчёт — Хвоя</title>
<meta name="robots" content="noindex">
<style>
:root{--bg:#F5F1E6;--card:#fff;--text:#232A20;--muted:#62665A;--line:#DFDCCD;--ok:#2F7D4A;--warn:#B7791F;--err:#B42318;--accent:#2E3A2B}
@media (prefers-color-scheme:dark){:root{--bg:#1B211A;--card:#252D23;--text:#ECEBE4;--muted:#AEB59F;--line:#3A4436;--ok:#6CC68A;--warn:#E3A33B;--err:#FF8A80;--accent:#D6DBC7}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:18px 0 8px}
.lead{color:var(--muted);margin:0 0 20px}
.summary{display:flex;flex-wrap:wrap;gap:12px}.summary div{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px;min-width:150px}
.summary b{display:block;font-size:28px;line-height:1.1}.summary .e b{color:var(--err)}.summary .w b{color:var(--warn)}.summary .o b{color:var(--ok)}
table.pages{width:100%;border-collapse:collapse;background:var(--card);border-radius:14px;overflow:hidden;border:1px solid var(--line)}
table.pages th,table.pages td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
table.pages th{font-size:12px;color:var(--muted);text-transform:uppercase}
.wrap{overflow-x:auto}
.len{display:inline-block;min-width:34px;text-align:center;border-radius:999px;padding:0 8px;font-weight:600;font-size:12px;color:#fff}.len.ok{background:var(--ok)}.len.bad{background:var(--err)}
details.page{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--ok);border-radius:14px;margin:10px 0;padding:0 18px}
details.page.warn{border-left-color:var(--warn)}details.page.error{border-left-color:var(--err)}
details.page>summary{cursor:pointer;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;padding:14px 0;list-style:none}
details.page>summary::-webkit-details-marker{display:none}
details.page .t{flex:1 1 300px;color:var(--muted)}.counts b{margin-left:8px;font-size:13px}.e{color:var(--err)}.w{color:var(--warn)}.o{color:var(--ok)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:8px 28px;border-top:1px solid var(--line)}
dl{margin:0}dt{font-weight:600;margin-top:8px}dd{margin:2px 0 0;word-break:break-word}small{color:var(--muted);font-weight:400}
code{font:13px ui-monospace,Consolas,monospace;word-break:break-all}
.nb{color:var(--warn);font-weight:700}
img.og{width:100%;max-width:360px;aspect-ratio:1200/630;object-fit:cover;border-radius:10px;margin-top:10px;border:1px solid var(--line)}
.outline{list-style:none;padding:0;margin:0}.outline li{padding:3px 0 3px calc(var(--l)*18px)}.outline b{display:inline-block;min-width:28px;font-size:11px;color:var(--muted)}
.outline .h1{font-weight:700}.outline .jump{color:var(--err)}
.imgs{width:100%;border-collapse:collapse;font-size:13px}.imgs td,.imgs th{padding:4px 6px;border-bottom:1px solid var(--line);text-align:left}
.chips span{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid var(--line);margin:2px 0}.chips .ok{color:var(--ok)}.chips .bad{color:var(--err)}
.issues{padding-left:20px}.issues .error{color:var(--err)}.issues .warn{color:var(--warn)}.issues .ok{color:var(--ok)}.allgood{color:var(--ok)}
.ph{font-size:13px;color:var(--warn);padding-left:20px}
pre{font-size:12px;background:var(--bg);padding:10px;border-radius:8px;overflow:auto;max-height:320px}
ul.plain{list-style:none;padding:0;margin:0}
.open{padding-bottom:14px}a{color:inherit}
</style></head><body><main>
<h1>SEO-отчёт: гостевой дом «Хвоя»</h1>
<p class="lead">Собран ${new Date().toLocaleString('ru-RU')} из <code>dist/</code> по правилам CLAUDE.md. Страницы открываются на <code>${PREVIEW}</code> (npm run preview -- --port 4322).</p>
<div class="summary">
  <div><b>${pages.length}</b>страниц</div>
  <div class="${errors ? 'e' : 'o'}"><b>${errors}</b>ошибок</div>
  <div class="${warns ? 'w' : 'o'}"><b>${warns}</b>предупреждений</div>
  <div><b>${pages.reduce((n, p) => n + p.placeholders.length, 0)}</b>заглушек [ ]</div>
</div>
<h2>Сайт целиком</h2>
${issueList(site)}
<h2>Сводка по страницам</h2>
<div class="wrap"><table class="pages"><thead><tr><th>URL</th><th>title</th><th>description</th><th>H1</th><th>JSON-LD</th><th>ошибки</th></tr></thead><tbody>
${pages
  .map((p) => {
    const e = p.issues.filter((i) => i.level === 'error').length;
    const h1 = p.headings.filter((h) => h.level === 1);
    return `<tr><td><a href="#p${esc(p.url.replace(/\W/g, '-'))}"><code>${esc(p.url)}</code></a>${p.noindex ? ' <small>noindex</small>' : ''}</td><td>${badge(len(p.title), 1, 60)}</td><td>${badge(len(p.description), 140, 160)}</td><td>${h1.length === 1 ? show(h1[0].text) : `<b class="e">${h1.length} шт.</b>`}</td><td><small>${esc(p.jsonld.map((j) => j.type).join(', ') || '—')}</small></td><td>${e ? `<b class="e">${e}</b>` : '<b class="o">0</b>'}</td></tr>`;
  })
  .join('')}
</tbody></table></div>
<h2>Страницы подробно</h2>
${pages.map(pageCard).join('')}
</main></body></html>`;

writeFileSync(join(ROOT, 'seo-report.html'), report);

console.log(`SEO-отчёт: ${pages.length} страниц, ошибок ${errors}, предупреждений ${warns} → seo-report.html`);
for (const i of site) if (i.level !== 'ok') console.log(`  [сайт] ${i.msg}`);
for (const p of pages) for (const i of p.issues.filter((x) => x.level === 'error')) console.log(`  ${p.url}: ${i.msg}`);
if (strict && errors) process.exit(1);
