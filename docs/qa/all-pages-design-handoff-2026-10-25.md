# App-wide design handoff reconciliation — October 25

Local UI reconciliation against `GitHub app design system (5).zip`, SHA-256
`01e3347c5201281917e11e741679fde0e9d54fd7e26b90d59a38cab3a2d6b7d0`, and the
owner's earlier corrections. The archive is read as design evidence; its scripts
and publication labels were not executed or treated as content approval.

Branch `codex/frontend-design-system-20261024`, HEAD `2baa1b170`, is 0 ahead /
37 behind freshly fetched main `92c9f893e`. The checkout contains concurrent work.
This is local review evidence; nothing was committed, merged or deployed.

## Reconciled components

- One `AspectBadge` supplies the aspect-only circle, canonical glyph and shared
  theme colors. It replaces the older planet/aspect/planet strips in reader
  cards, related readings, article headers and Calendar event cards. Report
  attribution facts and multi-contact chart patterns retain their separate
  factual notation.
- Story cards use 64px badges, Newsreader 26px titles, 19px/1.5 narrative,
  14px metadata, 32px radii and 44px reading cues. Friends Transits and Synastry
  groups occupy the full profile rail, with three columns on desktop and one
  on compact screens. Six-line visual previews retain the full saved text;
  complete readings are available through the card action.
- Related reading rows use 48px aspect circles and UI sans 18px/17px titles.
  The personalized placement card keeps its previously verified 52px/44px
  responsive circles. Loading rows now use one circle as well.
- Compatibility tiles sit below the chart and overview in a full-width
  three-column section. They use 56px planet circles, element-backed tags,
  stacked signs, saved prose previews and a 48px outlined Read action. Titles
  use the existing planet names, without importing placeholder editorial copy.
- Synastry and Compatibility details reopen from their stored route after
  refresh and browser Back/Forward. Complete Compatibility paragraph assembly
  is shared between the card and route restoration. Calculated aspect metadata
  supplies article badges even when an editorial headline omits the aspect.
- The shared missing-reader component supplies the handoff's card, 8-ball art,
  one recovery action, 36px title, theme roles and reduced-motion behavior.
  Invalid hash destinations, placements, dates and horoscope addresses, absent
  articles, unavailable planetary selections and confirmed missing reports use
  it. Temporary report failures retain a retry action rather than asserting
  that a report was deleted.

## Page coverage

| Area | Reference and verification |
| --- | --- |
| Shared header/menu | Same navigation order, persistent theme toggle, whole-item overflow, child Back alignment and consistent first-element clearance. Guest/member, reload and compact widths checked. |
| Sky and placement articles | Sky highlights, uniform body/highlight type, dignity section, placement readings, shared aspect circles, key dates and adjacent-cycle disclosure defaults. Complete Sky/You copy and dates checked. |
| You / natal / transits | Profile heading, control alignment, surfaces, natal tiles, related aspect rows and full detail opening. Both themes checked. |
| Friends | Feed source filters, Circle and saved charts, Friction/Flow, missing birth-time and consent boundaries, partial failure/retry, birthdays, profile tabs, full-rail story groups and Compatibility tiles. |
| Calendar | Day, Week and Month geometry, event cards, segmented-control height, full published weekly/monthly readings and unavailable editions. |
| Journal | Five-step editor, controls/meters, save failure/retry, reopening, reload and cross-device fixture persistence. No owner journal entries written. |
| Horoscopes | Dated Previous/Next controls, period/sign hierarchy, personal sign links, published/empty states and planetary horoscope routing. All four periods checked. |
| Guide / account / login | Shared type/surfaces, library empty/populated states, account controls, credential/error preservation and navigation clearance. |
| Reports | Header/menu/theme parity, card typography, shared complete reading, preparing/review states and distinct missing/transient-error recovery. |
| Missing readers | All twelve supplied presentation variants checked on 390px/1440px in light/dark, including contrast, one action, heading and reduced-motion geometry. Direct route recovery tested for the states with reliable current inputs. |

All narrative remains Newsreader 19px/1.5, including highlights. No astrology
prose, source order, calculation policy, transit timing or publication filters
were changed by this presentation pass. The seven private synastry drafts remain
unchanged. The handoff's amber bridge and placeholder people/readings were not
imported as live content.

## Acceptance evidence

The broad fresh-production-preview run covers 208 cases: 200 passed. Four new
Compatibility assertions initially compared rendered paragraph breaks against
raw `textContent`; four older feed assertions expected a superseded explanation
sentence. Their assertions were corrected without changing reader copy.

A separate fresh final build reruns the affected card/profile/feed matrix,
including full reading text after reload, Back/Forward, long names, 320/390/960/
1440px widths, both themes, computed typography, contrast and overflow.
Final result: 29 passed (5.5 minutes).

Logs:

- `/private/tmp/tldrastro-all-pages-final-acceptance.log`
- `/private/tmp/tldrastro-all-pages-cards-final-acceptance.log`

Both previews use `reuseExistingServer: false`; no stale development build is
used as browser acceptance evidence. Web typecheck, CSS/token audits,
full-detail integrity (1,880 protected passages and 15 consumers) and scoped
whitespace checks pass. Synthetic sessions and local mocked responses isolate
the tests from owner data and external mutations.

Live port-5173 placement UI was inspected in light and dark and remains open for
review. Captures: `test-results/all-pages-live-aspects-light.png` and
`test-results/all-pages-live-aspects-dark.png`. Responsive story and Compatibility
captures are in `test-results/aspect-handoff-*` and
`test-results/compatibility-handoff-*`.

Source inventory: `/private/tmp/tldrastro-all-pages-final-source.json`.
Inventory SHA-256: f8df0ec4cf5f45dc1a8a12d49d2befdeeae95da2cfabd0c8bdfb646edab86239.

## Bundle evidence

Matched builds share the runtime, dependencies and synthetic preview settings.
A read-only Vite loader substitutes saved pre-task files for the baseline; no
checkout files are reverted. This compares the feature with the same concurrent
worktree, not with main.

| Gzip measurement | Baseline | Final | Delta | Final limit |
| --- | ---: | ---: | ---: | ---: |
| All CSS | 131,849 | 134,175 | +2,326 | 134,300 |
| Startup CSS | 57,217 | 57,918 | +701 | 58,000 |
| Sky detail | 6,717 | 6,759 | +42 | 6,800 |
| All JavaScript | 3,684,862 | 3,687,347 | +2,485 | 3,684,050 |

The measured UI allocations add 2,500 aggregate CSS, 450 startup CSS and 50 Sky
article gzip bytes. Baseline CSS was already 49 bytes above its prior cap; that
small prior excess is explicitly separate from the feature delta. The unchanged
JavaScript gate still fails by 3,297 bytes, including 812 pre-existing bytes.
It is not waived. All other bundle limits pass. There is no new dependency or
performance improvement claim.

## Boundaries

The twelve missing-reader designs are a reusable presentation catalog. Removed
articles, expired invites, private/nonexistent handles and deleted saved charts
must receive reliable lifecycle/permission results before those specific states
can be selected. This pass does not infer such facts from network errors or
empty protected data. Hash-route presentation cannot return an HTTP 404/410;
server status handling remains a backend concern. Native/sheet frames are web
references, not a claim that a native client was implemented.

The local preview and this coverage matrix do not certify every combination of
remote account data, a production deployment, backend lifecycle states or the
37 newer commits on main. The existing release size gate and normal merge/API
contract gates remain in force.
