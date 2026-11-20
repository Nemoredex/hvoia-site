// Маска силуэта леса для CSS mask-image: node scripts/make-decor.mjs
// Четыре файла trees-*.webp из прототипа — одна и та же форма разных цветов (по 217 КБ).
// Оставляем одну форму (альфа-канал) в двух ширинах: браузер скачивает её один раз
// на весь сайт, а цвет задаёт CSS (background-color + mask-image).
import sharp from 'sharp';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src', 'assets', 'img', 'decor');
const alpha = await sharp(join(DIR, 'trees-green.webp')).extractChannel(3).toBuffer();

for (const [width, alphaQuality] of [
  [1080, 60], // телефоны до 520 px: 412 px × DPR 2,6
  [1440, 60],
  [2880, 55],
]) {
  const { data, info } = await sharp(alpha).resize({ width }).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4); // чёрный цвет, форма — в альфе
  for (let i = 0; i < info.width * info.height; i++) rgba[i * 4 + 3] = data[i];
  const out = join(DIR, `trees-mask-${width}.webp`);
  const res = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 10, alphaQuality, effort: 6 })
    .toFile(out);
  console.log(`${out}: ${res.width}×${res.height}, ${Math.round(res.size / 1024)} КБ`);
}
