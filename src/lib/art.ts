/**
 * Кадры и sizes для <Img art={…}> — под сетки из global.css.
 *
 * Ширина контента W = min(100vw, 1440px) − 2 × clamp(16px, 4vw, 56px) ≈ min(92vw, 1328px).
 * У блоков с фиксированной высотой и object-fit: cover нужная ширина файла = max(ширина блока,
 * высота × пропорция кадра) — поэтому в sizes стоят max(…).
 * Брейкпоинты те же, что в global.css (раздел 10): 520 / 760 / 960 px.
 * Проверка после правок: замер в браузере (ширина блока против sizes) на 360–1920 px.
 */
type Art = { media?: string; aspect?: number; sizes: string }[];

const PHONE = '(max-width: 520px)';
const TABLET = '(max-width: 760px)';
const NARROW = '(max-width: 960px)';

/** .split__img: 520 px высотой, две колонки от ~965 px; на ≤760 px — 360 px высотой. */
export const split: Art = [
  { media: PHONE, aspect: 1, sizes: 'max(calc(100vw - 32px), 360px)' },
  { media: TABLET, aspect: 1.6, sizes: 'max(92vw, 576px)' },
  { media: NARROW, aspect: 1.5, sizes: 'max(92vw, 780px)' },
  { aspect: 1, sizes: 'min(max(calc(46vw - 24px), 520px), 640px)' },
];

/** .split__img--arch: арка 440×580; на ≤760 px — до 440×360. */
export const splitArch: Art = [
  { media: TABLET, aspect: 1.1, sizes: 'min(max(calc(100vw - 32px), 396px), 440px)' },
  { aspect: 0.76, sizes: '440px' },
];

/** .path__img на тёмной полосе главной: арка 260×380; на ≤760 px — на всю ширину, 320 px высотой. */
export const path: Art = [
  { media: PHONE, aspect: 1.15, sizes: 'max(calc(100vw - 32px), 368px)' },
  { media: TABLET, aspect: 1.8, sizes: 'max(92vw, 576px)' },
  { aspect: 0.684, sizes: '260px' },
];

/** .bento__big: 2×2 ячейки сетки; min-height 520 / 440 / 360 px. */
export const bentoBig: Art = [
  { media: PHONE, aspect: 1.05, sizes: 'max(calc(100vw - 32px), 378px)' },
  { media: NARROW, aspect: 1.6, sizes: 'max(92vw, 704px)' },
  { aspect: 1.15, sizes: 'min(max(calc(46vw - 8px), 598px), 656px)' },
];

/** .card__img в бенто: 160 px высотой, ширина 210…480 px. */
export const bentoCard: Art = [
  { aspect: 2, sizes: `${PHONE} calc(100vw - 32px), ${NARROW} max(calc(46vw - 8px), 320px), 320px` },
];

/** .card__img--tall (три карточки в ряд): 240 px высотой. */
export const card3: Art = [
  { aspect: 1.6, sizes: `${TABLET} max(calc(100vw - 32px), 384px), min(max(calc(30.6vw - 11px), 384px), 432px)` },
];

/** Галерея: 4 колонки (420 px высотой, арка 340), 2 колонки и 1 колонка — 240 px. */
const galleryMobile = [
  { media: PHONE, aspect: 1.6, sizes: 'max(calc(100vw - 32px), 384px)' },
  { media: TABLET, aspect: 1.2, sizes: 'max(calc(46vw - 7px), 288px)' },
];
export const gallery: Art = [...galleryMobile, { aspect: 0.72, sizes: '320px' }];
export const galleryArch: Art = [...galleryMobile, { aspect: 0.9, sizes: '320px' }];
export const galleryWide: Art = [
  galleryMobile[0],
  { media: TABLET, aspect: 2.4, sizes: 'max(92vw, 576px)' },
  { aspect: 1.45, sizes: 'min(max(calc(46vw - 7px), 609px), 657px)' },
];
