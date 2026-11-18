import { HOROSCOPE_SIGNS } from './horoscopeWindow.mjs';

export { HOROSCOPE_SIGNS as WRITEUP_HOROSCOPE_SIGNS };
export type WriteupHoroscope = { sign: string; body: string };

/** Article-owned copy. Empty readings may be saved privately while writing. */
export function writeupHoroscopes(value: unknown): WriteupHoroscope[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== HOROSCOPE_SIGNS.length) throw new Error('Write-up horoscopes need one field for each of the twelve signs.');
  const seen = new Set<string>();
  for (const passage of value) {
    if (!passage || !HOROSCOPE_SIGNS.includes(passage.sign) || seen.has(passage.sign) || typeof passage.body !== 'string'
      || Object.keys(passage).some(key => !['sign', 'body'].includes(key)) || /\{\{|\}\}/u.test(passage.body)) {
      throw new Error('Keep twelve distinct signs and complete text without unresolved variables.');
    }
    seen.add(passage.sign);
  }
  return HOROSCOPE_SIGNS.map(sign => ({ sign, body: value.find(passage => passage.sign === sign).body }));
}

export function writeupHoroscopesReady(value: unknown) {
  const passages = writeupHoroscopes(value);
  return !passages || !passages.some(passage => passage.body.trim()) || passages.every(passage => passage.body.trim());
}

export function writeupHoroscopeMarkdown(value: unknown) {
  const passages = writeupHoroscopes(value)?.filter(passage => passage.body.trim()) ?? [];
  return passages.length ? ['## Horoscopes', ...passages.map(({ sign, body }) => {
    const title = sign[0].toUpperCase() + sign.slice(1);
    return `### ${title} & ${title} Rising\n\n${body}`;
  })].join('\n\n') : '';
}

export function writeupRisingHoroscopes(value: unknown, placementSign: string): { risingSign: string; house: number; body: string; contentKey?: string }[] {
  const index = HOROSCOPE_SIGNS.indexOf(placementSign.toLowerCase());
  if (index < 0) throw new Error('The write-up needs its calculated placement sign.');
  return (writeupHoroscopes(value) ?? []).filter(passage => passage.body.trim()).map(({ sign, body }) => ({
    risingSign: sign, house: ((index - HOROSCOPE_SIGNS.indexOf(sign) + 12) % 12) + 1, body
  }));
}
