/**
 * Производные блоки, которые в прототипе повторяются на нескольких страницах:
 * «Выберите свой формат» (Packages), «Как забронировать» (BookingSteps), строки прайса.
 * Собираются из company.json, stay.json и events.json — сами ничего не хранят.
 */
import company from './company.json';
import stay from './stay.json';
import events from './events.json';
import { fromRub, priceText, rub } from '../lib/format';

const { prices, booking, deposit } = stay;

export interface Package {
  id: 'stay' | 'wedding' | 'party';
  title: string;
  price: string;
  priceNote: string;
  items: string[];
  cta: string;
  /** Куда ведёт кнопка (через href()). На странице, куда ведёт ссылка, Packages меняет её на якорь формы — без ссылки на саму себя. */
  ctaHref: string;
  featured?: boolean;
}

export const packages: Package[] = [
  {
    id: 'stay',
    title: 'Отдых в коттедже',
    price: fromRub(prices.weekday.from),
    priceNote: `в сутки ${prices.weekday.short}, ${prices.weekend.short} ${fromRub(prices.weekend.from)}`,
    items: stay.included,
    cta: 'Выбрать даты',
    ctaHref: '/ceny/',
  },
  {
    id: 'wedding',
    title: 'Свадьба под ключ',
    price: `до ${events.tent.capacity} гостей`,
    priceNote: 'стоимость по смете под ваш бюджет',
    items: events.wedding.included,
    cta: 'Обсудить свадьбу',
    ctaHref: '/svadby/',
    featured: true,
  },
  {
    id: 'party',
    title: 'Корпоратив и праздники',
    price: `до ${events.tent.capacity} гостей`,
    priceNote: 'день рождения, юбилей, корпоратив',
    items: events.parties.included,
    cta: 'Получить смету',
    ctaHref: '/prazdniki/',
  },
];

/** Сноска под тарифами. */
export const extraNote = (() => {
  const [withBed, noBed] = stay.extra;
  return `Доп. гость ${withBed.short} — ${rub(withBed.price!)}, ${noBed.short} — ${rub(noBed.price!)}. Дети до 5 лет — бесплатно. От 3 суток — индивидуальная скидка.`;
})();

export const bookingSteps = [
  { title: 'Заявка', text: 'Выбираете даты на сайте или звоните. Менеджер проверит, свободен ли дом.' },
  {
    title: `Задаток ${booking.prepaymentPercent}%`,
    text: `Даты закреплены за вами. Перенести можно не позднее чем за ${booking.rescheduleDays} дней.`,
  },
  {
    title: `Заселение с ${company.checkin}`,
    text: `Нужен паспорт и возвратный залог: ${rub(deposit.small.price)} до ${deposit.guestsThreshold} гостей, ${rub(deposit.large.price)} — больше. Выезд до ${company.checkout}.`,
  },
];

export interface PriceRow {
  label: string;
  value: string;
}

/** Карточки на /ceny/ и блок цен на /kottedzh/. */
export const priceRows = {
  stay: [
    { label: prices.weekday.label, value: fromRub(prices.weekday.from) },
    { label: prices.weekend.label, value: fromRub(prices.weekend.from) },
    { label: prices.holidays.label, value: prices.holidays.text },
  ],
  extra: stay.extra.map((e) => ({ label: e.label, value: priceText(e) })),
  booking: [
    { label: 'Задаток при бронировании', value: `${booking.prepaymentPercent}%` },
    { label: deposit.small.label, value: rub(deposit.small.price) },
    { label: deposit.large.label, value: rub(deposit.large.price) },
    { label: 'Перенос дат', value: `не позднее чем за ${booking.rescheduleDays} дней` },
  ],
  events: events.estimates.map((e) => ({ label: e.label, value: e.text })),
} satisfies Record<string, PriceRow[]>;

/** Для JSON-LD: минимальная и максимальная цена суток. */
export const priceRange = `${fromRub(prices.weekday.from)} в сутки`;
export const minNightPrice = Math.min(prices.weekday.from, prices.weekend.from);
