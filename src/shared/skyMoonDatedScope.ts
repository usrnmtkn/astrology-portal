/** Exact civil-day boundaries for the dated Sky Moon article, independent of the viewer's timezone. */
export const SKY_MOON_ARTICLE_TIME_ZONE = "America/New_York";

function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(day) && Number.isFinite(Date.parse(`${day}T00:00:00Z`))
    && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}

function easternMidnight(day: string) {
  const wallClock = Date.parse(`${day}T00:00:00Z`);
  let instant = wallClock + 5 * 60 * 60 * 1000;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SKY_MOON_ARTICLE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  for (let i = 0; i < 4; i++) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const observed = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second));
    const difference = wallClock - observed;
    if (difference === 0) break;
    instant += difference;
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  if (`${parts.year}-${parts.month}-${parts.day}` !== day || parts.hour !== "00" || parts.minute !== "00") {
    throw new Error("The selected Eastern civil day could not be resolved.");
  }
  return new Date(instant).toISOString();
}

export function skyMoonDatedDayBounds(day: string) {
  if (!validDay(day)) throw new Error("Choose a valid YYYY-MM-DD date for the Moon article.");
  const nextDay = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return { day, nextDay, start: easternMidnight(day), end: easternMidnight(nextDay) };
}
