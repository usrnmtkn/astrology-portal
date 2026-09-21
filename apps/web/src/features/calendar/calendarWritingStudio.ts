export const CALENDAR_WRITING_STUDIO_ORIGIN = "http://127.0.0.1:5174";

export function isLocalCalendarWritingHost(hostname = typeof window === "undefined" ? "" : window.location.hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isEditableCalendarWritingKey(contentKey: string) {
  return /^(?:authored|fallback-hook|cms|owner-approved)\//.test(contentKey.trim());
}

export function calendarWritingStudioHref(contentKey: string) {
  const key = contentKey.trim();
  const params = new URLSearchParams({ q: key });
  let hash = "exact-content";

  if (
    key.startsWith("authored/lunar-journal/")
    || key.startsWith("authored/calendar-weekly-moon/")
    || key.startsWith("authored/calendar-moon-continuation-summary/")
    || key.startsWith("authored/calendar-moon-transition/")
    || key.startsWith("authored/calendar-season-transition/")
    || key.startsWith("authored/sky-lunation-macro/")
    || key.startsWith("cms/sky-daily-summary/sun/")
    || key.startsWith("cms/sky-daily-summary/moon/")
  ) {
    hash = "calendar-writeups";
    params.set("view", key.startsWith("authored/calendar-season-transition/") ? "season-transitions" : "daily-sky");
  } else if (key.startsWith("fallback-hook/sky-placement-lived/")) {
    hash = "sky-writeups";
  } else if (key.startsWith("cms/sky-daily-summary/")) {
    hash = "sky-writeups";
    params.set("view", "daily-summary");
  }

  return `${CALENDAR_WRITING_STUDIO_ORIGIN}/admin/content#${hash}?${params.toString()}`;
}
