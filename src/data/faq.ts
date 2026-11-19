/**
 * Вопросы и ответы. Цифры (время, залог, задаток, сроки) подставляются из company.json и stay.json,
 * чтобы у каждого факта был один источник. Тот же текст идёт в видимый блок Faq и в JSON-LD FAQPage.
 */
import company from './company.json';
import stay from './stay.json';
import events from './events.json';
import { fromRub, rub } from '../lib/format';

export interface FaqItem {
  q: string;
  a: string;
}

const { booking, deposit, prices } = stay;
const depositText = `${rub(deposit.small.price)} до ${deposit.guestsThreshold} гостей, ${rub(deposit.large.price)} — больше`;

const checkinTimes: FaqItem = {
  q: 'Во сколько заезд и выезд?',
  a: `Заселение с ${company.checkin}, выезд до ${company.checkout}.`,
};
const checkinDocs: FaqItem = {
  q: 'Что нужно при заселении?',
  a: `${deposit.documents} и возвратный залог: ${depositText}.`,
};
const howToBook: FaqItem = {
  q: 'Как забронировать даты?',
  a: `Оставьте заявку на сайте или позвоните. После внесения задатка ${booking.prepaymentPercent}% даты закрепляются за вами.`,
};
const reschedule: FaqItem = {
  q: 'Можно ли перенести бронь?',
  a: `Да, не позднее чем за ${booking.rescheduleDays} дней до заезда.`,
};
const wholeHouse: FaqItem = {
  q: 'Сдаётся ли дом частично?',
  a: 'Нет, дом и территория сдаются целиком — только для вашей компании.',
};

/** Главная. */
export const faqHome: FaqItem[] = [checkinTimes, checkinDocs, howToBook, reschedule, wholeHouse];

/** Коттедж. */
export const faqStay: FaqItem[] = [
  ...faqHome,
  { q: 'Можно ли с детьми?', a: 'Да. Дети до 5 лет — бесплатно.' },
  { q: 'Можно ли с домашними животными?', a: '[Уточнить у заказчика]' },
];

/** Цены. */
export const faqPrices: FaqItem[] = [
  {
    q: 'Почему цена «от»?',
    a: `Стоимость суток зависит от дня недели: ${prices.weekday.short} ${fromRub(prices.weekday.from)}, ${prices.weekend.short} ${fromRub(prices.weekend.from)}. В праздничные даты — ${prices.holidays.text}.`,
  },
  { q: 'Есть ли скидки?', a: 'При бронировании от 3 суток — индивидуальная скидка.' },
  {
    q: 'Что входит в стоимость?',
    a: `Весь дом на ${stay.house.guests} гостей, баня, чан, тёплый бассейн, беседка с мангалом, халаты, полотенца и посуда.`,
  },
  {
    q: 'Как оплатить?',
    a: `Задаток ${booking.prepaymentPercent}% закрепляет даты. Остаток — ${booking.balance}.`,
  },
];

/** Свадьбы. */
export const faqWedding: FaqItem[] = [
  {
    q: 'Сколько гостей вмещает шатёр?',
    a: `До ${events.tent.capacity} гостей. Шатёр тёплый, ${events.tent.area} м², работает круглый год.`,
  },
  { q: 'Сколько стоит свадьба?', a: 'Стоимость считаем по смете под ваш бюджет и количество гостей.' },
  { q: 'Можно ли провести выездную регистрацию?', a: '[Уточнить у заказчика]' },
  { q: 'Можно ли привезти своих подрядчиков?', a: '[Уточнить у заказчика]' },
];
