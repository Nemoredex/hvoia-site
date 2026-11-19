/**
 * Заявка с сайта: проверка полей и текст сообщения. Без зависимостей — легко проверить отдельно.
 * Используется в src/pages/api/lead.ts.
 */

export const REASONS = ['Отдых в коттедже', 'Свадьба', 'День рождения или юбилей', 'Корпоратив', 'Другое'] as const;
export const GUESTS = ['до 10', '11–20', 'больше 20'] as const;

export interface Lead {
  name: string;
  phone: string;
  reason: (typeof REASONS)[number];
  dates: string;
  page: string;
}

export type LeadResult = { ok: true; lead: Lead } | { ok: false; error: string; field?: string };

const clean = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export function parseLead(form: FormData): LeadResult | { ok: 'bot' } {
  // Honeypot: поле скрыто от людей, заполняют только боты. Отвечаем «успехом», но ничего не отправляем.
  if (clean(form.get('website'), 200)) return { ok: 'bot' };

  const phone = clean(form.get('phone'), 40);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return { ok: false, error: 'Проверьте номер телефона', field: 'phone' };

  const reasonRaw = clean(form.get('reason'), 60);
  const reason = (REASONS as readonly string[]).includes(reasonRaw) ? (reasonRaw as Lead['reason']) : 'Другое';

  return {
    ok: true,
    lead: {
      name: clean(form.get('name'), 80),
      phone,
      reason,
      dates: clean(form.get('dates'), 120),
      page: clean(form.get('page'), 200),
    },
  };
}

/** Telegram, parse_mode HTML: экранируем всё пользовательское. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function telegramText(lead: Lead): string {
  return [
    `<b>Заявка с сайта: ${esc(lead.reason)}</b>`,
    `Телефон: ${esc(lead.phone)}`,
    lead.name && `Имя: ${esc(lead.name)}`,
    lead.dates && `Даты: ${esc(lead.dates)}`,
    lead.page && `Страница: ${esc(lead.page)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function emailText(lead: Lead): string {
  return [
    `Заявка с сайта: ${lead.reason}`,
    `Телефон: ${lead.phone}`,
    lead.name && `Имя: ${lead.name}`,
    lead.dates && `Даты: ${lead.dates}`,
    lead.page && `Страница: ${lead.page}`,
  ]
    .filter(Boolean)
    .join('\n');
}
