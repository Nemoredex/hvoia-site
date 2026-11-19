/**
 * POST /api/lead/ — заявка из LeadForm → Telegram и/или почта.
 * Единственный серверный маршрут: все страницы остаются статикой (адаптер @astrojs/node).
 *
 * Настройки — переменные окружения на сервере (см. .env.example), в git их нет:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID       — заявка в Telegram
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEAD_EMAIL_TO — копия на почту
 *   SMARTCAPTCHA_SERVER_KEY                    — проверка Яндекс SmartCaptcha (если включена)
 * Хватит любого одного канала. Если не настроен ни один — 503, и форма показывает телефоны.
 * Персональные данные в логи не пишем.
 */
import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { emailText, parseLead, telegramText } from '../../lib/lead';

export const prerender = false;

const env = (k: string) => process.env[k] ?? import.meta.env[k];

// Простое ограничение: не больше 5 заявок с одного IP за 10 минут.
const WINDOW = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > LIMIT;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function checkCaptcha(token: string, ip: string): Promise<boolean> {
  const key = env('SMARTCAPTCHA_SERVER_KEY');
  if (!key) return true; // капча не включена
  if (!token) return false;
  const res = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
    method: 'POST',
    body: new URLSearchParams({ secret: key, token, ip }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!res?.ok) return true; // сервис капчи недоступен — не теряем заявку
  const data = (await res.json().catch(() => ({}))) as { status?: string };
  return data.status === 'ok';
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = env('TELEGRAM_BOT_TOKEN');
  const chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return Boolean(res?.ok);
}

async function sendEmail(subject: string, text: string): Promise<boolean> {
  const host = env('SMTP_HOST');
  const to = env('LEAD_EMAIL_TO');
  if (!host || !to) return false;
  const port = Number(env('SMTP_PORT') ?? 465);
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
      connectionTimeout: 8000,
    });
    await transport.sendMail({ from: env('SMTP_FROM') ?? env('SMTP_USER') ?? to, to, subject, text });
    return true;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? clientAddress ?? '';
  if (limited(ip)) return json(429, { ok: false, error: 'Слишком много заявок. Позвоните нам, пожалуйста.' });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: 'Неверный формат заявки' });
  }

  const parsed = parseLead(form);
  if (parsed.ok === 'bot') return json(200, { ok: true });
  if (!parsed.ok) return json(422, { ok: false, error: parsed.error, field: parsed.field });

  if (!(await checkCaptcha(String(form.get('smart-token') ?? ''), ip))) {
    return json(403, { ok: false, error: 'Подтвердите, что вы не робот' });
  }

  const { lead } = parsed;
  const [tg, mail] = await Promise.all([sendTelegram(telegramText(lead)), sendEmail(`Заявка с сайта: ${lead.reason}`, emailText(lead))]);

  if (tg || mail) return json(200, { ok: true });
  console.error(`[lead] заявка не доставлена: telegram=${tg} email=${mail}`);
  return json(503, { ok: false, error: 'Не удалось отправить заявку' });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Только POST' });
