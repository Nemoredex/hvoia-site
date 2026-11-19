/** Меню и подвал. Пути — без base: в компонентах их оборачивает href(). */
import company from './company.json';

export interface NavLink {
  label: string;
  path: string;
  /** Внешняя ссылка или файл — без href(). */
  external?: boolean;
}

export const mainNav: NavLink[] = [
  { label: 'Коттедж', path: '/kottedzh/' },
  { label: 'Свадьбы', path: '/svadby/' },
  { label: 'Праздники', path: '/prazdniki/' },
  { label: 'Цены', path: '/ceny/' },
  { label: 'Фото', path: '/foto/' },
  { label: 'Как добраться', path: '/kontakty/' },
];

/** В мобильном меню первым пунктом идёт главная. */
export const mobileNav: NavLink[] = [{ label: 'Главная', path: '/' }, ...mainNav];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: 'Отдых и события',
    links: [
      { label: 'Коттедж и территория', path: '/kottedzh/' },
      { label: 'Свадьбы', path: '/svadby/' },
      { label: 'Праздники и корпоративы', path: '/prazdniki/' },
      { label: 'Цены', path: '/ceny/' },
    ],
  },
  {
    title: 'Гостям',
    links: [
      { label: 'Фото', path: '/foto/' },
      { label: 'Как добраться', path: '/kontakty/' },
      { label: 'Правила проживания (PDF)', path: company.docs.rules },
      { label: 'Отзывы на Яндекс Картах', path: company.yandexMaps.url, external: true },
    ],
  },
];

/** Хлебные крошки: название страницы для BreadcrumbList и видимой цепочки. */
export const crumbLabels: Record<string, string> = {
  '/': 'Главная',
  '/kottedzh/': 'Коттедж',
  '/svadby/': 'Свадьбы',
  '/prazdniki/': 'Праздники',
  '/ceny/': 'Цены',
  '/foto/': 'Фото',
  '/kontakty/': 'Как добраться',
  '/politika-konfidencialnosti/': 'Политика конфиденциальности',
};
