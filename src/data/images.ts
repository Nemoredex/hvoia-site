/**
 * Все фото сайта. Ключ — имя, на которое ссылаются JSON-данные (поле "image").
 * Исходники — максимальный размер из прототипа; ширины под экраны нарежет Astro (этап 4).
 */
import type { ImageMetadata } from 'astro';

import aerial from '../assets/img/aerial.webp';
import banya from '../assets/img/banya.webp';
import bathroom from '../assets/img/bathroom.webp';
import bedroom from '../assets/img/bedroom.webp';
import birthday from '../assets/img/birthday.webp';
import chan from '../assets/img/chan.webp';
import corporate from '../assets/img/corporate.webp';
import gazebo from '../assets/img/gazebo.webp';
import houseSunset from '../assets/img/hero.webp';
import houseWinter from '../assets/img/house-winter.webp';
import kitchen from '../assets/img/kitchen.webp';
import poolDay from '../assets/img/pool-day.webp';
import tentBanquet from '../assets/img/tent-banquet.webp';
import tentNight from '../assets/img/tent-night.webp';
import tentParty from '../assets/img/tent-party.webp';
import weddingArch from '../assets/img/wedding-arch.webp';
import weddingCouple from '../assets/img/wedding-couple.webp';
import weddingDecor from '../assets/img/wedding-decor.webp';

import heroHome from '../assets/img/hero-home.webp';
import heroHomeMobile from '../assets/img/hero-home-mobile.webp';
import heroCottage from '../assets/img/hero-cottage.webp';
import heroWedding from '../assets/img/hero-wedding.webp';
import heroParty from '../assets/img/hero-party.webp';
import heroWinter from '../assets/img/hero-winter.webp';
import heroAerial from '../assets/img/hero-aerial.webp';
import heroRoad from '../assets/img/hero-road.webp';

export const photos = {
  aerial,
  banya,
  bathroom,
  bedroom,
  birthday,
  chan,
  corporate,
  gazebo,
  'house-sunset': houseSunset,
  'house-winter': houseWinter,
  kitchen,
  'pool-day': poolDay,
  'tent-banquet': tentBanquet,
  'tent-night': tentNight,
  'tent-party': tentParty,
  'wedding-arch': weddingArch,
  'wedding-couple': weddingCouple,
  'wedding-decor': weddingDecor,
} satisfies Record<string, ImageMetadata>;

export type PhotoKey = keyof typeof photos;

/** Достаёт фото по ключу из JSON; опечатка в ключе ломает сборку, а не страницу. */
export function photo(key: string): ImageMetadata {
  const img = (photos as Record<string, ImageMetadata>)[key];
  if (!img) throw new Error(`[images] нет фото «${key}» в src/data/images.ts`);
  return img;
}

/** Первые экраны: картинка, alt (из прототипа) и фокус кадра. */
export interface HeroImage {
  src: ImageMetadata;
  /** Вертикальный кадр для телефона (только главная). */
  mobile?: ImageMetadata;
  alt: string;
  position?: string;
}

export const heroes = {
  home: {
    src: heroHome,
    mobile: heroHomeMobile,
    alt: 'Коттедж «Хвоя» в соснах на закате, бассейн с подогревом',
    position: '60% 50%',
  },
  kottedzh: { src: heroCottage, alt: 'Коттедж «Хвоя» вечером: панорамные окна и тёплый бассейн в соснах', position: '62% 50%' },
  svadby: { src: heroWedding, alt: 'Свадебная арка из белых роз и стулья для церемонии в сосновом лесу', position: '60% 55%' },
  prazdniki: { src: heroParty, alt: 'Банкет в прозрачном шатре с гирляндами среди сосен', position: '50% 45%' },
  ceny: { src: heroWinter, alt: 'Коттедж «Хвоя» зимним вечером: тёплый бассейн и банный чан в снегу', position: '65% 50%' },
  foto: {
    src: heroAerial,
    alt: 'Территория гостевого дома «Хвоя» сверху: коттедж, бассейн, шатёр и беседка в сосновом лесу',
    position: '50% 55%',
  },
  kontakty: { src: heroRoad, alt: 'Песчаная дорога через сосновый лес к гостевому дому «Хвоя»', position: '60% 50%' },
} satisfies Record<string, HeroImage>;
