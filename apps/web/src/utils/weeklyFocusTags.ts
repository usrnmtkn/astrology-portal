export function weeklyHoroscopeTagItems(tag?: string | null): string[] {
  return [...new Set((tag ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}
