// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Боевой домен взят из прототипа (комментарий [canonical] в _materials/index.html).
// Главное зеркало (с www или без) — подтвердить у заказчика, см. PLAN.md, этап 0.
//
// Демо на GitHub Pages: workflow передаёт SITE (https://ник.github.io)
// и BASE (/имя-репозитория) — сайт собирается в подпапку.
// Без этих переменных собирается обычная версия для своего домена.
const site = process.env.SITE || 'https://www.hvoia-event.ru';
const base = process.env.BASE || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
