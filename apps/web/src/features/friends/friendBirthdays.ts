import type { ManualChart } from "../../services/manualCharts";

/** Birthdays use saved civil dates, never timestamps from shared natal charts. */
export function upcomingFriendBirthdays(charts: ManualChart[], now: string, timeZone: string) {
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone });
  const year = Number(today.slice(0, 4));
  return charts.flatMap(chart => {
    if (chart.chartType !== "person" || !/^\d{4}-\d{2}-\d{2}$/.test(chart.birthDate)) return [];
    const birth = new Date(`${chart.birthDate}T00:00:00Z`);
    if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== chart.birthDate || chart.birthDate > today) return [];
    const monthDay = chart.birthDate.slice(5);
    // February 29 stays February 29; do not invent a different birthday.
    for (let nextYear = year; nextYear <= year + 4; nextYear += 1) {
      const date = `${nextYear}-${monthDay}`;
      if (date >= today && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date) return [{ chart, date }];
    }
    return [];
  }).sort((a, b) => a.date.localeCompare(b.date) || a.chart.id.localeCompare(b.chart.id));
}
