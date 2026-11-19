/**
 * Галерея /foto/. Порядок — как в прототипе: под него подобрана сетка без пустых ячеек
 * (`grid-auto-flow: dense`), менять осторожно.
 */
import type { PhotoKey } from './images';

export const categories = [
  { id: 'all', label: 'Все' },
  { id: 'house', label: 'Дом' },
  { id: 'territory', label: 'Территория' },
  { id: 'events', label: 'Праздники' },
  { id: 'winter', label: 'Зима' },
] as const;

export type CategoryId = Exclude<(typeof categories)[number]['id'], 'all'>;

export interface GalleryItem {
  image: PhotoKey;
  alt: string;
  tags: CategoryId[];
}

export const gallery: GalleryItem[] = [
  { image: 'aerial', alt: 'Территория сверху', tags: ['territory'] },
  { image: 'house-sunset', alt: 'Коттедж и тёплый бассейн на закате', tags: ['house', 'territory'] },
  { image: 'wedding-arch', alt: 'Свадебная арка', tags: ['events'] },
  { image: 'kitchen', alt: 'Кухня-гостиная', tags: ['house'] },
  { image: 'bedroom', alt: 'Спальня с видом на сосны', tags: ['house'] },
  { image: 'banya', alt: 'Русская баня', tags: ['territory'] },
  { image: 'chan', alt: 'Банный чан зимой', tags: ['territory', 'winter'] },
  { image: 'gazebo', alt: 'Беседка с мангалом', tags: ['territory'] },
  { image: 'tent-banquet', alt: 'Шатёр к банкету', tags: ['events'] },
  { image: 'tent-party', alt: 'Праздник в шатре', tags: ['events'] },
  { image: 'house-winter', alt: 'Коттедж зимой', tags: ['house', 'winter'] },
  { image: 'pool-day', alt: 'Бассейн днём', tags: ['territory'] },
  { image: 'bathroom', alt: 'Санузел', tags: ['house'] },
  { image: 'wedding-decor', alt: 'Декор стола', tags: ['events'] },
  { image: 'birthday', alt: 'День рождения', tags: ['events'] },
  { image: 'tent-night', alt: 'Шатёр вечером', tags: ['events'] },
  { image: 'corporate', alt: 'Корпоратив', tags: ['events'] },
];
