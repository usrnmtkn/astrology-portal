# Friends directory handoff

The owner requested matching the Friends Charts directory to the supplied
November 18 handoff. The initial comparison used accepted main
`767a98a5285ac9e917aadaab0712a7f20a8c493f` in an isolated worktree with its own
locked dependencies. The source document and screenshots remain private;
reference people and chart data were not imported into runtime content.

The desktop list uses the shared content rail and raised rows, with the birth
time chip alongside the open chevron. Mobile uses compact unboxed rows and
places the chip beneath the identity. The directory has a compact header offset,
no duplicate mobile top padding, recessed search, and aligned Circle controls.
The shared application navigation and Feed layout keep their existing roles.

The owner explicitly selected moving saved-chart Edit/Delete actions into the
chart profile menu. The chevron belongs to the existing open-chart button and
opens the chart; it is not a disguised overflow menu. Profile actions retain
keyboard focus, outside/Escape dismissal, confirmation and cancellation. Circle
management actions remain available on the Circle rows.

The new directory browser journey covers desktop/mobile in both themes, known
and unknown birth times, row geometry and surfaces, navigation, keyboard menu
access, edit/delete cancellation, confirmed synthetic deletion and reload
persistence, Circle alignment and Requests. Existing profile and cancellation
journeys follow the approved new menu location. The new spec is assigned to the
existing design-handoff job; no extra CI job is introduced.

Diagnostics were preserved: the original bordered/misplaced birth-time chip;
an early measurement against an element replaced during hydration; overly broad
name selectors after returning to a populated profile; and a shared test fixture
that ignored ID filters and could not model confirmed deletion correctly. The
fixture now honors equality/list filters for reads and deletes. Product data
services and their safeguards are unchanged.

Pre-integration checks passed: four complete directory journeys, the corrected
two cancellation journeys, CSS/token audit, web TypeScript/build, bundle budget,
composite rendered-card contract, Friends routing, browser-suite coverage and
repository/built-asset privacy. Earlier profile journeys passed within their
recorded scope. Final integration, exact-head affected gates and deployed visual
acceptance are still required; this record does not claim production completion.
