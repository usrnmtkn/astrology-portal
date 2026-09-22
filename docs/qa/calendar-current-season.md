# Calendar current season

The September 22, 2026 morning Calendar displayed “Libra Season” while its Sun
introduction correctly described Virgo. The season labels compared civil dates;
the Sun introduction used the live Sky snapshot. Swiss Ephemeris calculates the
Libra ingress at `2026-09-23T00:05:14Z` (September 22, 8:05 PM in New York).

Current-season labels, countdown boundaries and the selected-day season headline
now use the same instant as the validated Sky snapshot. While that snapshot is
loading, they use the shared Sky selection policy: now for today in the selected
location, local noon for other dates. An upcoming Sun ingress remains a timed
event in Day, Week and Month. Date-based editorial arcs retain their whole-day
scope. Approved prose and ephemeris calculations are unchanged.

The existing live refresh also schedules a calculation at the Sun's computed
exit, alongside the Moon boundary, minute refresh, and focus recovery.

Verification:

- `npm run test:event-dates`: September and December ingresses checked on both
  sides against direct Swiss calculations in New York, UTC and Tokyo; existing
  cross-surface, midnight, year and DST regressions pass.
- `TLDR_DATE_BASELINE=1 npm run test:event-dates`: the new assertion fails on the
  old implementation with `Libra !== Virgo` immediately before ingress.
- `calendar-current-season.spec.ts`: mobile/desktop, both themes, no premature
  season flash, before/after ingress, reload, focus recovery, automatic boundary
  refresh, Day/Week/Month event dates, heading hierarchy and unchanged typography.
- `calendar-day-summary.spec.ts` and `sky-live-clock.spec.ts`: existing complete
  copy, empty/populated layouts, formatting, Moon ingress and refresh behavior.
- Web typecheck/build, CSS/token audit, web bundle budget and public asset privacy
  scan pass. The full local Content Studio API contract passes.

The PR records the tested head, exact-head CI gate and deployed-main verification.
