import { articleReaderHref } from "./articleLibrary";

const signs = "aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" ");

export function seasonArticleKey(sign: string, year: number) {
  const normalized = sign.toLowerCase();
  return signs.includes(normalized) && Number.isInteger(year) && year >= 1900 && year <= 2200
    ? `article/manual/${normalized}-season-${year}` : null;
}

export function seasonArticleIdentity(key: string) {
  const match = /^article\/manual\/([a-z]+)-season-(\d{4})$/u.exec(key);
  if (!match || seasonArticleKey(match[1], Number(match[2])) !== key) return null;
  return { sign: match[1], year: Number(match[2]) };
}

/** The caller supplies the calculated season ingress, including for January's Capricorn season. */
export function seasonArticleForIngress(sign: string, startsAt: string, timeZone: string) {
  if (!Number.isFinite(Date.parse(startsAt))) return null;
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(new Date(startsAt)));
  const key = seasonArticleKey(sign, year);
  return key ? { key, href: articleReaderHref(key), year } : null;
}
