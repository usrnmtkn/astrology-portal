import { SKY_INGRESS_ARTICLE_FORMAT, skyIngressTemplateForFormat } from '../../apps/web/src/content/skyIngressEssay.mjs';

const bodies = new Set('sun moon mercury venus mars jupiter saturn uranus neptune pluto chiron lilith north-node south-node'.split(' '));
const signs = new Set('aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces'.split(' '));

/** A server-owned layout reference, without claiming approval of any stored template or prose. */
export function skyArticleVisitReference(value: unknown, format: unknown) {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value) || format !== SKY_INGRESS_ARTICLE_FORMAT)
    throw new Error('A dated visit requires the current ingress article format and a planet/sign selection.');
  const { planet, sign } = value as { planet?: unknown; sign?: unknown };
  if (typeof planet !== 'string' || !bodies.has(planet) || typeof sign !== 'string' || !signs.has(sign))
    throw new Error('Choose a supported Sky planet and zodiac sign for this visit.');
  return { planet, sign, content_key: `sky/article-template/${planet}/${sign}`,
    body: skyIngressTemplateForFormat(SKY_INGRESS_ARTICLE_FORMAT), origin: 'standard-ingress-layout' as const };
}
