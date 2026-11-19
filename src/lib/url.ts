/**
 * Внутренние ссылки с учётом base из astro.config.mjs.
 * На своём домене base = «/», на GitHub Pages — «/имя-репозитория/».
 * Все ссылки на страницы сайта пишем как href('/kottedzh/'), а не '/kottedzh/'.
 */
const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** '/kottedzh/' → '/hvoia-site/kottedzh/'. Внешние ссылки, якоря и tel:/mailto: не трогает. */
export function href(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (base && (path === base || path.startsWith(`${base}/`))) return path;
  return `${base}${path}`;
}

/** Абсолютный URL страницы сайта — для canonical, JSON-LD и Open Graph. */
export function absoluteUrl(path: string, site: URL | undefined): URL {
  return new URL(href(path), site ?? 'https://example.invalid');
}
