export function calendarSeasonTransitionSummaryKey(fromSign: string, toSign: string) {
  return `cms/sky-daily-summary/season-transition/${[fromSign, toSign].map(sign => sign.toLowerCase().trim()).join('/')}`;
}
