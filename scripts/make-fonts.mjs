// Шрифты под тексты сайта: node scripts/make-fonts.mjs  → src/assets/fonts/*.woff2
//
// Файлы @fontsource — это наборы Google Fonts целиком: в «латинице» Onest 33 КБ ради
// диакритики (àçøß…), которой на русском сайте нет, в «кириллице» — украинские, белорусские
// и сербские буквы. Lighthouse Mobile качает шрифты по медленному 4G до первой отрисовки
// текста, поэтому оставляем только нужное:
//   - весь русский алфавит, ASCII и типографские знаки — всегда, чтобы правка текста
//     не дала «дыр» в шрифте;
//   - плюс все символы, которые встречаются в src/ (данные, страницы, компоненты).
// Вариативная ось Onest (wght 100–900) сохраняется.
//
// Запускать снова, если в текстах появятся новые редкие символы (кроме русских букв и ASCII):
// иначе они отрисуются запасным системным шрифтом.
import subsetFont from 'subset-font';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'src', 'assets', 'fonts');
const FONTS = [
  ['@fontsource/prata/files/prata-cyrillic-400-normal.woff2', 'prata-cyr.woff2'],
  ['@fontsource/prata/files/prata-latin-400-normal.woff2', 'prata-lat.woff2'],
  ['@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2', 'onest-cyr.woff2'],
  ['@fontsource-variable/onest/files/onest-latin-wght-normal.woff2', 'onest-lat.woff2'],
];

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('');
let text =
  range(0x20, 0x7e) + // ASCII
  range(0x410, 0x44f) + 'ЁёÁ́' + // русский алфавит, знак ударения
  ' «»°·×©±–—‐‑‘’‚“”„…•′″№₽−↑↓→←↗'; // типографика

async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (['.astro', '.ts', '.json', '.md', '.mjs', '.js'].includes(extname(e.name))) text += await readFile(p, 'utf8');
  }
}
await walk(join(ROOT, 'src'));
text = [...new Set(text)].filter((c) => c.codePointAt(0) >= 0x20).join('');

await mkdir(OUT, { recursive: true });
for (const [src, name] of FONTS) {
  const input = await readFile(join(ROOT, 'node_modules', src));
  const out = await subsetFont(input, text, { targetFormat: 'woff2' });
  await writeFile(join(OUT, name), out);
  console.log(`${name}: ${Math.round(input.length / 1024)} → ${Math.round(out.length / 1024)} КБ`);
}
