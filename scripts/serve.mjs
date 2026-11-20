// Локальный сервер «как на проде» — для Lighthouse и ручной проверки: npm run serve
// Повторяет deploy/nginx.conf: готовые .br/.gz из сборки (gzip_static), ETag и 304, кеш /_astro/ на год, HTML на 5 минут,
// /kottedzh → /kottedzh/, настоящий 404, заголовки безопасности, 301 со старых адресов.
// POST /api/lead/ обрабатывает тот же код, что и на сервере (dist/server/entry.mjs).
// `astro preview` всего этого не делает, поэтому Lighthouse на нём ругается на сжатие и кеш.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const ROOT = join(process.cwd(), 'dist', 'client');
const PORT = Number(process.env.PORT || 4322);
if (!existsSync(ROOT)) {
  console.error('Нет dist/client — сначала npm run build');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

// Карта 301 из deploy/nginx-redirects.conf (если сгенерирована).
const redirects = new Map();
const mapFile = join(process.cwd(), 'deploy', 'nginx-redirects.conf');
if (existsSync(mapFile)) {
  for (const m of readFileSync(mapFile, 'utf8').matchAll(/^\s*"([^"]+)"\s+"([^"]+)";/gm)) redirects.set(m[1], m[2]);
}

let api = null;
async function apiHandler() {
  if (!api) api = (await import(new URL(`file:///${join(process.cwd(), 'dist', 'server', 'entry.mjs').replace(/\\/g, '/')}`))).handler;
  return api;
}

const cache = new Map(); // сжатые ответы: путь + кодировка → Buffer
function compress(file, mtime, body, enc) {
  const key = `${file}|${mtime}|${enc}`; // mtime: после npm run build отдаём свежие файлы без перезапуска
  if (!cache.has(key)) {
    cache.set(
      key,
      enc === 'br'
        ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
        : gzipSync(body, { level: 6 }),
    );
  }
  return cache.get(key);
}

async function send(req, res, file, status = 200) {
  const ext = extname(file).toLowerCase();
  let body = await readFile(file);
  const { mtimeMs } = await stat(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', ...SECURITY };
  const rel = file.slice(ROOT.length).replace(/\\/g, '/');
  headers['Cache-Control'] = rel.startsWith('/_astro/')
    ? 'public, max-age=31536000, immutable'
    : status === 404 || ext === '.html'
      ? 'no-cache' // на проде HTML кешируется 5 минут; локально — нет, чтобы после сборки сразу видеть правки
      : 'public, max-age=300';
  // Проверка свежести: при повторном заходе браузер получает 304 без тела.
  const etag = `W/"${body.length.toString(16)}-${Math.round(mtimeMs).toString(16)}"`;
  headers['ETag'] = etag;
  headers['Last-Modified'] = new Date(mtimeMs).toUTCString();
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  if (COMPRESSIBLE.has(ext) && body.length >= 512) {
    const accept = String(req.headers['accept-encoding'] || '');
    const enc = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
    headers['Vary'] = 'Accept-Encoding';
    if (enc) {
      // Готовый файл из scripts/precompress.mjs (brotli 11 / gzip 9), иначе — сжатие на лету.
      const pre = file + (enc === 'br' ? '.br' : '.gz');
      const preStat = await stat(pre).catch(() => null);
      body = preStat && preStat.mtimeMs >= mtimeMs ? await readFile(pre) : compress(file, mtimeMs, body, enc);
      headers['Content-Encoding'] = enc;
    }
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const isFile = async (p) => (await stat(p).catch(() => null))?.isFile() ?? false;
const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory() ?? false;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = decodeURIComponent(url.pathname);

    if (path.startsWith('/api/')) return (await apiHandler())(req, res, () => send(req, res, join(ROOT, '404.html'), 404));

    if (redirects.has(path)) {
      res.writeHead(301, { Location: redirects.get(path) + url.search });
      return res.end();
    }

    const safe = normalize(join(ROOT, path));
    if (!safe.startsWith(ROOT) || /[\\/]\.(?!well-known)/.test(path) || /\.(br|gz)$/.test(path)) return send(req, res, join(ROOT, '404.html'), 404);

    if (!path.endsWith('/') && !extname(path) && (await isDir(safe))) {
      res.writeHead(301, { Location: `${path}/${url.search}` });
      return res.end();
    }
    const file = path.endsWith('/') ? join(safe, 'index.html') : safe;
    if (await isFile(file)) return send(req, res, file);
    return send(req, res, join(ROOT, '404.html'), 404);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end();
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`«Хвоя» как на проде: http://localhost:${PORT}/  (gzip/brotli, кеш, 301, 404)`);
});
