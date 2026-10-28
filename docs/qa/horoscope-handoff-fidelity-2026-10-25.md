# Horoscope handoff fidelity correction — October 25, 2026

The owner identified a concrete miss in the previous implementation: generic
Previous/Next pills did not match the supplied design. Earlier token and route
checks established behavior, not the fidelity of those controls. This correction
compares the actual control structure with the handoff and records its scope.

## Provenance

- Handoff: `GitHub app design system (4).zip`, SHA-256
  `0dff8c9d57bb2a526d20b2a1f6fc74090b50fa32cb6777d344ba720d6666d1e6`.
- References: `Horoscopes Container.dc.html`, `Horoscopes Mobile.dc.html`,
  `Horoscopes Empty States.dc.html` and the shared dark-theme specification.
  HTML controls are authoritative; reference screenshot text and sample dates
  are illustrative. The owner's uniform 19px narrative direction is preserved.
- Local branch: `codex/frontend-design-system-20261024`, HEAD `2baa1b170`.
  Remote was refreshed for this turn: 0 ahead / 28 behind `origin/main`
  (`1fb8ddd1a`). This is local verification, not a merged or deployed revision.
- Product-source snapshot: `/private/tmp/tldrastro-handoff-fidelity-source.json`,
  SHA-256 `752f9e78d20738c09c6de17411ff34f9cc9fd61fa76b0657aa22737657e253b4`.
  Owner and other-task work remains in the checkout; no reset or commit was made.

## Corrected UI

| Requirement | Result and evidence |
| --- | --- |
| Adjacent readings | Separate 44px circular chevrons beside stacked direction and destination labels, aligned to the reading column. Next reverses the layout, with visible disabled styling. Generic pill backgrounds are removed. |
| Correct destinations | Days, edition-aligned weeks, months and known seasons have real labels. Civil-date helpers preserve time zones, DST, Sunday-start published editions and year boundaries. Unknown seasonal destinations stay unknown. |
| Reading header | Compact date/range with a separate year; a range crossing years includes each year once. Separate sign and Rising chips. Repeated UI kicker, date/zone line and generic sign headline are suppressed; distinct authored headlines and every paragraph remain. |
| Explore signs | Personal-sign actions live beside the sign explorer. Names and links use UI sans rather than inherited monospace. |
| Dark tabs | Selected periods use shared segmented active background/foreground roles, so selection remains visible. |
| Context section | The omitted “What's behind it” panel now shows the planets named in the full passage, with recorded positions, available whole-sign houses and working dated placement links. Shared SVG planet/sign badges avoid platform glyph substitution. |

## Additional shared-avatar correction

The broader comparison found monograms inheriting Newsreader and owner avatars
using the dark active-control palette. Shared monograms now use UI sans; large
initials use the reference’s 20px role. Owner avatars retain teal #004b45 with
white initials in both themes, including You, Account, Settings, Menu, reports
and the first Friction/Flow avatar. Other people retain their neutral treatment.
A legacy profile-specific size override is removed. The four avatar matrices
cover You, Account, Menu opened from Settings and saved Charts at 390/1440px in both themes.

## Context data and content boundaries

`readerRowProjection.mjs` derives a narrow public `facts.horoscopeContext` from
the saved calculation packet only when the complete LIVE edition, its exact
period/window/time zone and the recorded Swiss reference instant agree.
Only planet, sign, degree, motion, reference instant and available calculated
houses cross this boundary. Authoring notes, signatures, events, provenance
notes and future private fields remain private.

The panel labels its reference instant. It does not claim that a reference
position is the time of a later event described in the passage. It does not
substitute today's sky for an archived reading. Stale, missing, unverified or
ambiguous context is omitted while the complete published passage remains.
Monthly remains the existing collective overview and does not invent personal
houses or sign chips. The handoff's illustrative descriptions are not approved
CMS summary fields; no descriptions are invented or excerpted from owner copy.
The seven private synastry drafts remain unchanged.

## Acceptance evidence

Fresh production preview: `/private/tmp/tldrastro-handoff-fidelity-review-dist`
at port 4202, built from this checkout with `reuseExistingServer: false`.
No existing dev server was used as production-build acceptance evidence.

- 17 distinct browser tests pass across final fresh builds: 13 horoscope cases in `design-handoff-pages.spec.ts` (date-led published
  navigation and handoff fidelity) and `horoscope-published-navigation.spec.ts`, plus four shared-avatar matrices.
  The fidelity matrices cover 390/1440px, light/dark, all four populated and
  empty periods, year-crossing headings, stale-context refusal, previous/next,
  reload, sign selection, published URLs and delayed account restoration.
  A context placement link opens the article and returns to the full reading.
- Browser assertions check control geometry/order, stacked labels, theme fills,
  shared font metrics, semantic and visible heading order, complete synthetic
  opening/final paragraphs and absence of horizontal overflow. Screenshots are
  `test-results/handoff-fidelity-horoscope-*.png` and
  `test-results/handoff-fidelity-navigation-*.png`.
- Focused calculation/context tests pass: `test-horoscope-navigation.mts`,
  `test-horoscope-context.mts` and the real save/publication/reader journey in
  `test-horoscope-editions.mts`. The latter asserts exact public positions and
  houses from the signed packet, complete owner fields and private-field
  exclusion.
- Read-only local API inspection confirms the current published weekly edition
  exposes the narrow context with its October 19 reference instant. The actual
  local reader renders its named planet links and the new date controls.
- Typecheck, CSS/token audits, reader API privacy (3,996 offline rows),
  reader-copy boundary, full-detail copy and heading-deduplication checks pass.
- Full Content Studio API regression passes (complete lifecycle, exit 0). The initial sandbox run failed to open a TSX IPC pipe; acceptance uses the completed run with local IPC permitted, not that failed attempt.

## Performance

Matched isolated builds use the same runtime, dependencies and synthetic
Supabase/Mapbox environment. Before/after gzip bytes: total JS
3,673,340 / 3,675,026 (+1,686), lazy horoscope reader 4,141 / 4,897 (+756),
CSS 130,186 / 130,748 (+562). The context component loads on demand.
Allocate 2,000 aggregate JS bytes and 500 horoscope-reader bytes for the missing
interface, leaving 524 / 103 bytes. No CSS, startup, other individual chunk,
dependency or runtime-timing ceiling changes. Reader boot is 538,006 and startup
CSS 56,907, below unchanged 573,350 / 57,550 limits. The budget check passes.
This records interface cost, not a performance improvement.

## Scope of the sign-off

This is a horoscope fidelity correction and data-flow verification. Existing
Planets-card routing is retained; this pass does not claim a new pixel comparison
of every Planets card or every screen in the wider handoff. Prior app-wide
behavior and token results are not a blanket visual sign-off. The audit JSON
now makes that distinction explicit instead of repeating the earlier claim.

## Monthly review follow-up

The owner's later screenshots show the earlier generic pills, full month range,
personal-sign controls and serif/monospace explorer treatment. A read-only check
of port 5173 confirmed PID 70969 serves this worktree. Both the existing Chrome
client and the in-app review tab now render the compact month/year header and
dated chevrons. The earlier screenshot state was not reproduced; no browser-cache
cause is asserted.

One remaining source mismatch was corrected: the exact automatically generated
monthly label, such as `October 2026 Overview`, is redundant below the October /
2026 lockup and is now suppressed. Distinct authored headlines remain visible;
saved titles and complete body copy are unchanged. The fixture covers both the
generated label and a distinct earlier-edition headline.

Fresh production-preview acceptance passes four matrices (390/1440px, both
themes), including all populated/empty periods, previous/next, reload and complete
fixture copy. Log: `/private/tmp/tldrastro-horoscope-monthly-acceptance.log`.
Typecheck is part of that fresh build. CSS/token audits and the unchanged bundle
budgets pass. This presentation-only follow-up did not rerun or alter the API
suite recorded above.

Actual Chrome mobile inspection confirms 19px Newsreader body text, transparent
edition buttons with 44px circular targets, September/November destination labels,
no duplicate monthly heading and no horizontal overflow. Local screenshots are
`test-results/horoscope-monthly-live-header-390.png` and
`test-results/horoscope-monthly-live-navigation-390{,-dark}.png`. The normal
viewport and original light theme were restored, and the monthly review page
remains open in Chrome and the in-app browser.

Remote refs were refreshed again: branch `codex/frontend-design-system-20261024`
remains at `2baa1b170`, 0 ahead / 31 behind `origin/main` (`ad951d80e`). The
follow-up source hashes are in
`/private/tmp/tldrastro-horoscope-monthly-source.json`, SHA-256
`8a03ed29497bfa7cf8260dfd3b8963eaf3544d58ca08555b775a195b29a837d1`.
This remains a local worktree review, not a deployment or full-app visual sign-off.

The subsequent owner correction for Planets navigation is recorded in
[planetary-horoscope-navigation-2026-10-25.md](planetary-horoscope-navigation-2026-10-25.md).
Planet cards now open their dedicated placement horoscope within Horoscopes;
the earlier scope note about retained Sky routing describes the prior pass.
