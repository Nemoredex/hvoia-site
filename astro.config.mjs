// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// Боевой домен взят из прототипа (комментарий [canonical] в _materials/index.html).
// Главное зеркало (с www или без) — подтвердить у заказчика, см. PLAN.md, этап 0.
//
// Демо на GitHub Pages: workflow передаёт SITE (https://ник.github.io)
// и BASE (/имя-репозитория) — сайт собирается в подпапку.
// Без этих переменных собирается обычная версия для своего домена.
const site = process.env.SITE || 'https://www.hvoia-event.ru';
const base = process.env.BASE || '/';

// Все страницы — статика. Сервер (@astrojs/node) нужен только для POST /api/lead/ (src/pages/api/lead.ts).
// Сборка: dist/client — статические файлы для веб-сервера, dist/server/entry.mjs — Node-процесс для /api/.
export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  // CSS (≈6 КБ gzip) встраивается в HTML: на первом визите из поиска нет блокирующего запроса перед отрисовкой.
  build: { format: 'directory', inlineStylesheets: 'always' },
  adapter: node({ mode: 'standalone' }),
  integrations: [sitemap({ filter: (page) => !page.includes('/api/') })],
});
