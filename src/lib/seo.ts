/** Общие SEO-константы и проверка мета-тегов при сборке. */

export const SITE_NAME = 'Гостевой дом «Хвоя»';
export const TITLE_SUFFIX = ' — «Хвоя»';
/** Мета-тег не понимает CSS-переменные: значение = токен --c-forest из global.css. */
export const THEME_COLOR = '#2E3A2B';

export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

export function fullTitle(title: string, noSuffix = false): string {
  return noSuffix ? title : `${title}${TITLE_SUFFIX}`;
}

/**
 * Правило из CLAUDE.md: title ≤ 60 символов (с суффиксом), description 140–160.
 * Нарушение не ломает сборку, а выводит предупреждение в терминал.
 * Жёсткая проверка всего dist/ — scripts/seo-check.mjs (этап 11).
 */
export function warnSeo(path: string, title: string, description: string): void {
  if (title.length > TITLE_MAX) {
    console.warn(`[seo] ${path}: title ${title.length} симв. (максимум ${TITLE_MAX}): «${title}»`);
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    console.warn(`[seo] ${path}: description ${description.length} симв. (нужно ${DESCRIPTION_MIN}–${DESCRIPTION_MAX})`);
  }
  if (/\[[^\]]+\]/.test(title + description)) {
    console.warn(`[seo] ${path}: в title или description осталась [заглушка]`);
  }
}
