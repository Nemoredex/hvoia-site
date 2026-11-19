/**
 * robots.txt собирается при сборке: домен и base берутся из astro.config.mjs,
 * поэтому Sitemap всегда указывает на правильный адрес.
 * Демо (PUBLIC_NOINDEX=true) закрыто целиком — копия не должна попасть в индекс раньше боевого сайта.
 * Host не пишем: Яндекс его больше не использует, главное зеркало задаётся 301-редиректами.
 */
import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const sitemap = absoluteUrl('/sitemap-index.xml', site).href;
  const isDemo = import.meta.env.PUBLIC_NOINDEX === 'true';

  const body = isDemo
    ? ['# Демо-копия, закрыта от индексации', 'User-agent: *', 'Disallow: /', ''].join('\n')
    : [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        // Метки рекламы и аналитики создают дубли страниц — Яндекс склеит их с основным адресом.
        'Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid&fbclid&from&_openstat',
        '',
        `Sitemap: ${sitemap}`,
        '',
      ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
