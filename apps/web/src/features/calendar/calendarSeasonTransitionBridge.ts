/**
 * One-sentence transition-day summaries based on the base Ends record for each
 * sign pair. Sky and Calendar need a shorter handoff than the full seasonal
 * record, so keep these explicit instead of slicing editable prose at runtime.
 */
export const calendarSeasonTransitionEndsBridges: Record<string, string> = {
  "pisces-aries": "Aries season brings attention to what we can act on now, even when we do not know how everything will turn out.",
  "aries-taurus": "Taurus season brings attention to the choices we can sustain and what makes the effort worthwhile.",
  "taurus-gemini": "Gemini season brings attention to the new information that may change what we decide, keep, or invest in.",
  "gemini-cancer": "Cancer season brings attention to what we need once the conversation is over and where we want to give our time and care.",
  "cancer-leo": "Leo season brings attention to what we want to share and the response it draws.",
  "leo-virgo": "Virgo season brings attention to the daily work that supports what we want to create and enjoy, including the routines that make it easier to return.",
  "virgo-libra": "Libra season brings attention to how the work of daily life is shared, including the agreements nobody remembers making.",
  "libra-scorpio": "Scorpio season brings attention to what our agreements leave unspoken and what is at stake when we depend on someone.",
  "scorpio-sagittarius": "Sagittarius season brings attention to the conclusions we have drawn, especially when one experience has started to determine what we expect from everything else.",
  "sagittarius-capricorn": "Capricorn season brings attention to what we can reasonably promise and the responsibilities that follow.",
  "capricorn-aquarius": "Aquarius season brings attention to how expectations were decided, who they work for, and what needs to change.",
  "aquarius-pisces": "Pisces season brings attention to the feelings an explanation alone cannot resolve, because understanding something is not the same as being finished with it."
};

export function calendarSeasonTransitionPair(fromSign: string, toSign: string) {
  return `${fromSign.toLowerCase().trim()}-${toSign.toLowerCase().trim()}`;
}

export function calendarSeasonTransitionEndsBridge(fromSign: string, toSign: string) {
  return calendarSeasonTransitionEndsBridges[calendarSeasonTransitionPair(fromSign, toSign)] ?? "";
}

export function calendarSeasonTransitionKey(fromSign: string, toSign: string, variant = 1) {
  const from = fromSign.toLowerCase().trim();
  const to = toSign.toLowerCase().trim();
  if (!from || !to) return "";
  return variant > 1
    ? `authored/calendar-season-transition/${from}/${to}/variant-${variant}`
    : `authored/calendar-season-transition/${from}/${to}`;
}

