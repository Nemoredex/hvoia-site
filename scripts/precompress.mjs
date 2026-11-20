// Предварительное сжатие сборки: node scripts/precompress.mjs (запускается в npm run build)
//
// Рядом с каждым текстовым файлом dist/client кладём .br (brotli 11) и .gz (gzip 9).
// Сервер отдаёт готовый файл, а не жмёт на лету: максимальная степень сжатия бесплатна
// по времени ответа. HTML с встроенным CSS выходит на 15–20% меньше, чем при сжатии на лету
// (brotli 5 / gzip 6). nginx: gzip_static on (и brotli_static on, если есть модуль brotli),
// локально — scripts/serve.mjs.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const ROOT = join(process.cwd(), 'dist', 'client');
const EXT = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);
let files = 0;
let before = 0;
let after = 0;

async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (EXT.has(extname(e.name))) {
      const body = await readFile(p);
      if (body.length < 512) continue;
      const br = brotliCompressSync(body, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: body.length },
      });
      await writeFile(p + '.br', br);
      await writeFile(p + '.gz', gzipSync(body, { level: 9 }));
      files++;
      before += body.length;
      after += br.length;
    }
  }
}
await walk(ROOT);
console.log(`Сжато заранее: ${files} файлов, ${Math.round(before / 1024)} → ${Math.round(after / 1024)} КБ (brotli)`);
