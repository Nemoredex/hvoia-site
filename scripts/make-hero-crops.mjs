// Вертикальные кадры первого экрана для телефонов: node scripts/make-hero-crops.mjs
// На телефоне блок первого экрана высокий (412×730 px), а фото горизонтальное (3:2):
// object-fit: cover показывает узкую полоску, и браузеру нужен файл ~1900 px, а по sizes=100vw
// он берёт 768 px — фото мылит. Поэтому режем кадр заранее по той же точке, что и object-position
// на десктопе. Пропорция — высота блока на 412 px (замер в браузере); исходники не трогаем.
import sharp from 'sharp';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src', 'assets', 'img');
const crops = [
  // файл, пропорция ш/в, точка кадра по X (как object-position в src/data/images.ts), имя результата
  // Главная: своё вертикальное фото (2:3), но блок ещё уже (412×886) — подрезаем бока.
  ['hero-home-mobile', 0.47, 0.6, 'hero-home-mobile-crop'],
  ['hero-cottage', 0.56, 0.62],
  ['hero-wedding', 0.56, 0.6],
  ['hero-party', 0.54, 0.5],
  ['hero-winter', 0.66, 0.65],
  ['hero-aerial', 0.95, 0.5],
  ['hero-road', 0.75, 0.6],
];

for (const [name, aspect, x, outName = `${name}-mobile`] of crops) {
  const src = join(DIR, `${name}.webp`);
  const { width, height } = await sharp(src).metadata();
  const w = Math.round(height * aspect);
  const left = Math.round((width - w) * x);
  const out = join(DIR, `${outName}.webp`);
  const res = await sharp(src).extract({ left, top: 0, width: w, height }).webp({ quality: 90, effort: 6 }).toFile(out);
  console.log(`${outName}.webp: ${res.width}×${res.height}, ${Math.round(res.size / 1024)} КБ`);
}
