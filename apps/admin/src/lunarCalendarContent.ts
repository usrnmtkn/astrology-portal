/** Editorial labels only: stable source keys and owner prose are never renamed. */
export const lunarSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const words = (value: string) => value.replace(/[-_.]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
export function lunarContentIdentity(key: string) {
  const moon = key.match(/^authored\/calendar-weekly-moon\/([^/]+)(?:\/variant-(\d+))?$/);
  if (moon) return { family: 'Moon-sign passages', sign: moon[1], variant: Number(moon[2] ?? 1), title: `Moon in ${words(moon[1])} · Variant ${moon[2] ?? 1}`, kind: 'Complete passage', destination: 'Calendar day and week', selection: 'The Calendar selects one complete passage using the Moon sign, week and day role. Variants are alternatives; they are never joined together.', excluded: key === 'authored/calendar-weekly-moon/cancer' };
  if (!/lunar|lunation|moon-phase|moon-sign|eclipse|(?:new|full)-moon|cms\/calendar-day|^season(?:-arc)?\/|^transit-fallback\//.test(key)) return null;
  const parts = key.split('/');
  const sign = parts.find(part => lunarSigns.includes(part)) ?? '';
  const variant = parts.at(-1)?.match(/^(?:v|variant-)(\d+)$/)?.[1];
  const family = key.includes('eclipse') ? 'Eclipse passages' : key.includes('moon-phase') ? 'Moon phases' : key.startsWith('cms/calendar-day/') ? 'Day-card templates' : 'Lunar supporting copy';
  const name = parts.filter(part => !['cc', 'fallback-hook', 'authored', 'fallback-template', 'cms', sign].includes(part) && !/^(?:v|variant-)\d+$/.test(part)).map(words).join(' · ');
  return { family, sign, variant: Number(variant ?? 1), title: `${name}${sign ? ` · ${words(sign)}` : ''}${variant ? ` · Variant ${variant}` : ''}`, kind: key.includes('template') || key.startsWith('cms/') ? 'Template' : 'Supporting passage', destination: 'Calendar / lunar sources', selection: 'Review this source and its declared variables. A saved or published row alone does not prove the Calendar selects it. The composition view shows missing source links.', excluded: false };
}
