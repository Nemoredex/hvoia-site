/**
 * Сервис картинок: стандартный sharp + подбор качества под бюджет «байт на пиксель».
 *
 * Lighthouse (Improve image delivery) считает WebP пережатым слабо, если файл тяжелее
 * 1/6 байта на пиксель (≈1,33 бита) больше чем на 4 КБ: «Increasing the image compression
 * factor could improve…». Фото леса и хвои с мелкой фактурой при одном и том же качестве
 * весят по-разному, поэтому качество подбираем для каждого файла: начинаем с заданного
 * в компоненте и снижаем шагами, пока файл не уложится в бюджет (но не ниже MIN_QUALITY).
 *
 * Бюджет — image.service.config.bytesPerPixel в astro.config.mjs.
 * Кеш Astro (node_modules/.astro/assets) не знает об этом сервисе: после правки бюджета
 * его надо удалить, иначе в сборку попадут старые файлы.
 */
import sharpService from 'astro/assets/services/sharp';
import type { LocalImageService } from 'astro';
import sharp from 'sharp';

const MIN_QUALITY = 32;
const STEP = 5;

const service: LocalImageService = {
  ...sharpService,
  async transform(input, transform, config, logger) {
    // alphaQuality по умолчанию 100: у декора с прозрачностью (ветки) альфа весит больше самой картинки,
    // поэтому снижаем её вместе с качеством.
    const run = (quality?: number) =>
      sharpService.transform(
        input,
        quality === undefined ? transform : { ...transform, quality },
        quality === undefined
          ? config
          : { ...config, service: { ...config.service, config: { ...config.service.config, webp: { alphaQuality: quality + 20 } } } },
        logger,
      );
    let out = await run();
    const budget = Number(config.service.config?.bytesPerPixel);
    if (out.format !== 'webp' || !budget) return out;

    const { width = 0, height = 0 } = await sharp(out.data).metadata();
    const pixels = width * height;
    let quality = Number(transform.quality) || 80;
    while (pixels && out.data.length / pixels > budget && quality - STEP >= MIN_QUALITY) {
      quality -= STEP;
      out = await run(quality);
    }
    return out;
  },
};

export default service;
