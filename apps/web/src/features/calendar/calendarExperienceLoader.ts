export const loadCalendarRoute = () => import("../../routes/CalendarRoute");
export const loadLunarCalendar = () => import("./LunarCalendar");

// Fetch the route and its view together. Calculation and prose remain demand
// driven, so a healthy server response does not trigger a WASM download.
export function preloadCalendarExperience() {
  void Promise.all([loadCalendarRoute(), loadLunarCalendar()]).catch(() => {
    // The mounted route owns import errors and recovery.
  });
}
