/** The reader supplies a verified exact event source; Studio validates the entry. */
export function calendarEventPassageEditHref(context: {
  kind: 'ingress' | 'station'; sourceKey: string; date: string; timeZone: string;
}) {
  return `/admin/content#calendar-writeups?${new URLSearchParams({
    view: context.kind === 'ingress' ? 'planetary-ingresses' : 'planetary-stations',
    editEvent: context.sourceKey, date: context.date, timeZone: context.timeZone
  })}`;
}
