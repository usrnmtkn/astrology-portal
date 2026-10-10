/** Lightweight editorial label; importing it must not load all season passages. */
export function calendarSeasonTransitionTitle(fromSign: string, toSign: string, variant = 1) {
  const from = fromSign.replace(/^\w/u, (letter) => letter.toUpperCase());
  const to = toSign.replace(/^\w/u, (letter) => letter.toUpperCase());
  const pair = `${from} to ${to}`;
  if (variant <= 1) return `${pair} · Ends`;
  return variant === 2 ? `${pair} · Begins` : `${pair} · Begins · ${variant - 1}`;
}
