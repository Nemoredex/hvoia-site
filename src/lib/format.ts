/** Форматирование цен и чисел для текста. Неразрывные пробелы — как в прототипе (`40&nbsp;000&nbsp;₽`). */

const NBSP = ' ';

/** 40000 → «40 000 ₽» (пробелы неразрывные). */
export function rub(value: number): string {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}₽`;
}

/** 40000 → «от 40 000 ₽». */
export function fromRub(value: number): string {
  return `от${NBSP}${rub(value)}`;
}

/** Цена строки прайса: число → «2 000 ₽», текст («бесплатно», «по смете») — как есть. */
export function priceText(item: { price?: number; text?: string }): string {
  if (typeof item.price === 'number') return rub(item.price);
  return item.text ?? '';
}

/** Телефон для показа: неразрывные пробелы, чтобы номер не переносился (дефисы держит CSS: a[href^="tel:"] nowrap). */
export function phoneText(label: string): string {
  return label.replace(/ /g, ' ');
}
