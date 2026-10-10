export const calendarFeedCategories = ["lunations", "moon-signs", "seasons", "ingresses", "retrogrades", "key", "weekly", "aspects"] as const;
export type CalendarFeedCategory = typeof calendarFeedCategories[number];
export const calendarReminders = ["None", "At the time", "Day before"] as const;
export type CalendarSubscriptionOptions = { include: CalendarFeedCategory[]; reminder: typeof calendarReminders[number]; timeZone: string };
export type CalendarSubscription = CalendarSubscriptionOptions & { token: string; manageToken: string; updatedAt: string };
export type CalendarFeedEvent = {
  title: string; description: string; start: string; end: string; allDay: boolean;
  category: CalendarFeedCategory; url: string;
};
export type CalendarFeedEventRecord = {
  id: string; draft: CalendarFeedEvent; published: CalendarFeedEvent | null;
  cancelled: boolean; revision: number; updated_at: string; published_at: string | null;
};
export const calendarSubscriptionStorageKey = "tldrastro:calendar-subscription:v1";
export function loadCalendarSubscription(): CalendarSubscription | null {
  try {
    const value = JSON.parse(localStorage.getItem(calendarSubscriptionStorageKey) ?? "null");
    return value && /^[A-Za-z0-9_-]{43}$/.test(value.token) && /^[A-Za-z0-9_-]{43}$/.test(value.manageToken)
      && Array.isArray(value.include) && value.include.length > 0 && value.include.every((key: string) => calendarFeedCategories.includes(key as CalendarFeedCategory))
      && calendarReminders.includes(value.reminder) && typeof value.timeZone === "string" && typeof value.updatedAt === "string" ? value : null;
  } catch { return null; }
}
export function calendarSubscriptionUrls(token: string, origin: string) {
  const https = new URL(`/feed/${token}.ics`, origin).href;
  const webcal = https.replace(/^https?:/u, "webcal:");
  return {
    https, webcal,
    google: `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent("TLDR Astro")}`
  };
}
export async function saveCalendarSubscription(options: CalendarSubscriptionOptions, previous: CalendarSubscription | null) {
  const response = await fetch("/api/calendar-subscriptions", {
    method: previous ? "PATCH" : "POST", headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ ...options, ...(previous ? { token: previous.token, manageToken: previous.manageToken, expectedUpdatedAt: previous.updatedAt } : {}) })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok || !data.subscription?.updatedAt) throw new Error(data?.error ?? "Your calendar link could not be saved. Please try again.");
  const saved = { ...options, ...data.subscription, ...(previous ? { token: previous.token, manageToken: previous.manageToken } : {}) } as CalendarSubscription;
  if (!/^[A-Za-z0-9_-]{43}$/.test(saved.token) || !/^[A-Za-z0-9_-]{43}$/.test(saved.manageToken)) throw new Error("Your calendar link could not be confirmed. Please try again.");
  try { localStorage.setItem(calendarSubscriptionStorageKey, JSON.stringify(saved)); } catch { /* The displayed URL still works without browser storage. */ }
  return saved;
}
