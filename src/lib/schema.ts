/**
 * Генераторы JSON-LD (schema.org). Все факты — из src/data, ничего не дублируется.
 * Организация одна, с @id `https://домен/#org`; House, EventVenue и Offer ссылаются на неё.
 * Значения null (ОГРН, координаты, индекс, животные) просто не выводятся — без выдумок.
 * AggregateRating/Review не выводим, пока нет реальных данных с Яндекс Карт (CLAUDE.md).
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import company from '../data/company.json';
import stay from '../data/stay.json';
import events from '../data/events.json';
import { absoluteUrl } from './url';
import { fromRub } from './format';

export type JsonLd = Record<string, unknown>;
type Site = URL | undefined;

const CTX = 'https://schema.org';

export const orgId = (site: Site) => absoluteUrl('/#org', site).href;
const tentId = (site: Site) => absoluteUrl('/svadby/#tent', site).href;
const houseId = (site: Site) => absoluteUrl('/kottedzh/#house', site).href;

/** Абсолютный URL картинки для разметки (WebP, 1600 px по ширине). */
export async function imageUrl(src: ImageMetadata, site: Site, width = 1600): Promise<string> {
  const img = await getImage({ src, width: Math.min(width, src.width), format: 'webp', quality: 80 });
  return new URL(img.src, site).href;
}

function postalAddress(): JsonLd {
  const a = company.address;
  return {
    '@type': 'PostalAddress',
    streetAddress: a.street,
    addressLocality: a.locality,
    addressRegion: `${a.region}, ${a.district}`,
    ...(a.postalCode ? { postalCode: a.postalCode } : {}),
    addressCountry: a.country,
  };
}

function geo(): JsonLd | undefined {
  const g = company.geo as { lat: number; lon: number } | null;
  return g ? { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lon } : undefined;
}

const amenity = (name: string): JsonLd => ({ '@type': 'LocationFeatureSpecification', name, value: true });

/** Удобства. Шатёр — только у организации: к дому он не относится. */
function amenities(withTent = true): JsonLd[] {
  return [
    ...stay.territory.map((t) => amenity(t.amenity)),
    amenity('Кондиционеры в спальнях'),
    amenity('Халаты, полотенца, посуда'),
    ...(withTent ? [amenity(`Тёплый шатёр ${events.tent.area} м²`)] : []),
  ];
}

/** LodgingBusiness — главная и «Как добраться». */
export function lodgingBusiness(site: Site, images: string[]): JsonLd {
  const { phones, hours, legal } = company;
  const pets = stay.petsAllowed as boolean | null;
  return {
    '@context': CTX,
    '@type': 'LodgingBusiness',
    '@id': orgId(site),
    name: company.name,
    alternateName: company.shortName,
    url: absoluteUrl('/', site).href,
    logo: absoluteUrl('/icon-512.png', site).href,
    image: images,
    description: `Коттедж на ${stay.house.guests} гостей с баней, чаном и тёплым бассейном и тёплый шатёр для свадеб и праздников до ${events.tent.capacity} гостей, ${company.address.fromCity}.`,
    telephone: [phones.booking.label, phones.events.label],
    email: company.email,
    address: postalAddress(),
    ...(geo() ? { geo: geo() } : {}),
    hasMap: company.yandexMaps.url,
    sameAs: [company.yandexMaps.url],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hours.days.map((d) => `${CTX}/${d}`),
      opens: hours.opens,
      closes: hours.closes,
    },
    checkinTime: company.checkin,
    checkoutTime: company.checkout,
    priceRange: `${fromRub(stay.prices.weekday.from).replace(/ /g, ' ')} в сутки`,
    currenciesAccepted: 'RUB',
    numberOfRooms: stay.house.bedrooms,
    amenityFeature: amenities(),
    ...(pets === null ? {} : { petsAllowed: pets }),
    legalName: legal.name,
    taxID: legal.inn,
    containsPlace: [{ '@id': houseId(site) }, { '@id': tentId(site) }],
  };
}

/** WebSite — только главная. */
export function webSite(site: Site): JsonLd {
  return {
    '@context': CTX,
    '@type': 'WebSite',
    name: company.name,
    url: absoluteUrl('/', site).href,
    inLanguage: 'ru',
    publisher: { '@id': orgId(site) },
  };
}

/** House — страница коттеджа. */
export function house(site: Site, images: string[]): JsonLd {
  const h = stay.house;
  const pets = stay.petsAllowed as boolean | null;
  return {
    '@context': CTX,
    '@type': 'House',
    '@id': houseId(site),
    name: `Коттедж ${h.area} м² на ${h.guests} гостей`,
    url: absoluteUrl('/kottedzh/', site).href,
    image: images,
    description: h.summary,
    floorSize: { '@type': 'QuantitativeValue', value: h.area, unitCode: 'MTK' },
    numberOfRooms: h.bedrooms,
    numberOfBedrooms: h.bedrooms,
    numberOfBathroomsTotal: h.bathrooms,
    occupancy: { '@type': 'QuantitativeValue', maxValue: h.guests },
    amenityFeature: amenities(false),
    ...(pets === null ? {} : { petsAllowed: pets }),
    address: postalAddress(),
    containedInPlace: { '@id': orgId(site) },
  };
}

/** EventVenue — свадьбы и праздники (один и тот же шатёр). */
export function eventVenue(site: Site, images: string[]): JsonLd {
  const t = events.tent;
  return {
    '@context': CTX,
    '@type': 'EventVenue',
    '@id': tentId(site),
    name: `Тёплый шатёр ${t.area} м² — ${company.name}`,
    description: t.summary,
    image: images,
    maximumAttendeeCapacity: t.capacity,
    address: postalAddress(),
    ...(geo() ? { geo: geo() } : {}),
    telephone: company.phones.events.label,
    containedInPlace: { '@id': orgId(site) },
  };
}

const offer = (site: Site, name: string, price: number, opts: { from?: boolean; unit?: string } = {}): JsonLd => ({
  '@type': 'Offer',
  name,
  priceCurrency: 'RUB',
  ...(opts.from
    ? { price, priceSpecification: { '@type': 'UnitPriceSpecification', minPrice: price, priceCurrency: 'RUB', ...(opts.unit ? { unitText: opts.unit } : {}) } }
    : { price }),
  offeredBy: { '@id': orgId(site) },
});

/** OfferCatalog — страница цен: только числовые цены (по смете — не выводим). */
export function priceCatalog(site: Site): JsonLd {
  const { prices, extra } = stay;
  return {
    '@context': CTX,
    '@type': 'OfferCatalog',
    name: `Цены на проживание — ${company.name}`,
    url: absoluteUrl('/ceny/', site).href,
    itemListElement: [
      { ...offer(site, `Коттедж на ${stay.house.guests} гостей, ${prices.weekday.label.toLowerCase()}`, prices.weekday.from, { from: true, unit: 'сутки' }), itemOffered: { '@id': houseId(site) } },
      { ...offer(site, `Коттедж на ${stay.house.guests} гостей, ${prices.weekend.label.toLowerCase()}`, prices.weekend.from, { from: true, unit: 'сутки' }), itemOffered: { '@id': houseId(site) } },
      ...extra.filter((e) => typeof e.price === 'number').map((e) => offer(site, e.label, e.price as number)),
    ],
  };
}

/** ImageGallery — страница фото. */
export function imageGallery(site: Site, items: { url: string; caption: string }[]): JsonLd {
  return {
    '@context': CTX,
    '@type': 'ImageGallery',
    name: `Фото — ${company.name}`,
    url: absoluteUrl('/foto/', site).href,
    about: { '@id': orgId(site) },
    associatedMedia: items.map((i) => ({ '@type': 'ImageObject', contentUrl: i.url, caption: i.caption })),
  };
}
