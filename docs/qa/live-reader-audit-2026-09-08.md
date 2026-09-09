# Live reader audit — September 8, 2026

Baseline: production `tldrastro.vercel.app`, main `4e9c55fe` (#709). Work branch: `codex/live-reader-audit`, created from freshly fetched main with no divergence. This is a targeted production audit and regression repair, not a claim that every possible chart/date/content combination is defect-free.

## Production observations

The audit used the owner's existing signed-in browser session, without mocked production responses or writes to account/content data. Read-only database queries corroborated source identity and publication state.

| Surface | Observed result |
| --- | --- |
| You, September 8 | The restored Lilith–Pluto preview and complete detail passage were present. Revised Virgo New Moon macro matched the live publication. Planetary house cards contained writing. |
| Friends | An old open tab failed to fetch a removed `ManualChartsPanel` JavaScript asset after deployment. The existing reload action recovered the real Circle and Charts inventories. Opening a friend's Transits showed written previews and a complete Uranus–Mars detail. Its duration was repeated as both duration and range. |
| Sky | Current placement cards had writing. Saturn Rx in Aries retained both date lines across a reload, with aspects before the separate horoscope section. Some direct placement countdowns disagreed with their current-pass date range. |
| Calendar | Lilith's station card had no writing even though its Sky detail contained an approved station passage. September 10's list omitted additional ingresses/stations. November's month list repeated a station. November 27's upcoming lunar countdowns still measured from September 8. |
| Future You, November 27 | Loading feedback completed; daily writing, the Gemini Full Moon macro, planetary house transits, and forecast entries rendered. |
| Content Studio | Authenticated inventory loaded; sampled Saturn and Virgo canonical sources were Live and matched the reader. |
| Database | Project reported `ACTIVE_HEALTHY`; sample showed 25 connections, three active and zero lock waiters. A point-in-time check is not a long-term stability guarantee. |

## Repairs

- Calendar resolves Lilith station prose through the existing published V4 reader, preserving the entire approved unit, its source key, and publication/retirement rules. Ongoing retrograde passages cannot borrow station prose. The existing deferred load/status is shared with Calendar; no new eager content download is introduced.
- Calendar week/month transit lists retain all eligible exact ingresses and stations, instead of selecting only one per day. Duplicate physical events from adjacent day buckets collapse into one card; ongoing background retrogrades remain in their existing section.
- Upcoming lunar events and their countdowns follow the selected Calendar date.
- Friends displays a duration-only estimate once. Verified date ranges continue to appear when available; estimated dates are not fabricated.
- Direct Sky placement countdowns use the same verified residency pass as the adjacent date range. The full residency remains available for article context.

No approved prose, content approval metadata, astronomy calculations, or production data were edited.

## Regression evidence

- Actual reader/package station test: cold state, both station directions, complete-body equality with Sky detail, source provenance, ongoing-passage exclusion, retirement.
- Reader recovery browser suite: 14 flows passed before the additional Calendar-list changes; the affected Calendar flow was rerun after those changes. It covers stalled CMS loading, complete station copy, simultaneous ingress and station, repeated day-bucket events, month/day views, selected-date countdowns and date continuity into You. Browser fixtures are synthetic and confined to tests.
- Friends rendered component regression preserves ordinary date ranges and prevents the duration-only duplicate.
- Sky countdown regression compares September and November Venus visits against directly calculated ephemeris residency facts.
- Full personal-transit adapter matrix: 3,752 cases, 2,940 authored selections, 804 governed fallback selections, eight known missing-source combinations and zero dropped eligible selections.
- Calendar exact aspect parity: 379 records, 758 directions; existing 75 documented exact gaps remain outside this repair.
- Web typecheck, CSS/token audits and bundle budget passed during implementation. Final CI and post-deployment verification are reported in the associated PR/task.

## Remaining content work and operational limit

Sun return and Uranus return lack eligible units in the current source, shipped package and production database. Those two identities account for eight matrix gaps across reader/motion variants. They require complete content units; ordinary conjunction prose is not a valid substitute.

The stale-tab asset failure recovered using the existing reload action. Automatic reload was deliberately not added: it can discard unsaved form edits. The browser audit confirms recovery, not permanent retention of old deployment assets.
