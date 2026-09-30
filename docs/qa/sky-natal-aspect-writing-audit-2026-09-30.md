# Published transit-to-natal reader hydration

Audit and fix dated September 30, 2026. Audited base:
`670c84d9d90548972d9414a68c4230e45ced03dd`. Release evidence belongs to the
fix PR and its exact-head checks; this document does not establish deployment.

## Failure and repair

The reported Moon square Sun and Moon sextile Jupiter passages already existed
as published, approved sources at `authored/transit-aspect/moon/sun/hard` and
`authored/transit-aspect/moon/jupiter/soft`. Read-only production reader requests
and Studio previews confirmed complete writing for both. Sky's narrowed reader
query omitted these rows. Its deferred local bundle lacked their publication
identities, so the publication gate correctly rejected stale copies; the article
then rendered calculated titles without their bodies.

The shared `personalTransitSources.ts` service loads the current published source
families through bounded public-reader queries and verifies exact row/version
identity through the existing packager and publication gate. A separate runtime
overlay prevents Sky's scoped inventory from replacing these dependencies.
Personalized Sky articles, You, Friends, and explicit report preparation wait
for these sources. Failed reads use the existing retry treatment. Publication
changes invalidate stale details. Unrelated Friend natal articles remain usable
during a transit-source outage, and initial Sky list queries remain narrow.

Studio's effective preview now identifies the selected audience accurately.
Missing timing context produces a note and keeps source-edit links available;
the complete preview appears after timing is supplied. The intentional Friend
name placeholder remains supported. No approved prose, editorial state, resolver
precedence, calculated facts, heading hierarchy, or typography was changed.

## Acceptance evidence

The implementation checkout used its own `npm ci` dependencies and generated
knowledge package. Browser tests used fresh production builds with
`reuseExistingServer: false`, synthetic charts, and isolated storage. They did
not publish content, alter owner profiles, or incur generation charges.

| Criterion | Result |
| --- | --- |
| Both reported Moon passages on direct Sky entry | Passed mobile light and desktop dark; every paragraph matched the original source after calculated aspect/date substitutions. |
| Sky, You, Friends navigation and reload | Passed all four 390/1440 light/dark variants, including full opening and final sentences and the selected audience. |
| Failed load and retry; retired open article | Passed; outage also preserves access to unrelated Friend natal details. |
| Source consistency and stale versions | Passed focused service tests for partial responses, concurrent reads, overlay isolation, publication microseconds, and retirement. |
| House-transit readers | Passed all four theme/width variants with isolated published sources. |
| Studio previews and edit controls | Passed canonical preview, exact/shared source editing, stale/malformed response rejection, house sources, legacy navigation, and missing timing across audiences and themes. |
| Required local API suite | `npm run test:content-studio-api` passed. |
| Static/UI checks | Web/admin TypeScript checks and `npm run qa:css-audit` passed. |
| Resolver parity | 2,436 Sky/You cases and 120 Node/browser-source/shipped fixtures passed, with expected genuine source gaps preserved. |
| Dependency coverage | 3,752 transit cases inspected; all selected source keys fit the new dependency scope. 3,744 had readings; eight cases represented the two existing return gaps below. |
| Live inventory, read-only | 3,937 public rows inspected; the actual packager accepted all 1,591 applicable published dependency rows. |

Twenty-six distinct relevant browser cases passed across the implementation
verification runs. The new service and report-source regressions are included
in the content test chain. Targeted browser cases live in
`tests/visual/client-facing-user-flows.spec.ts` and
`tests/visual/content-dashboard-admin-user-flows.spec.ts`.

## Limits and release checks

The broader release matrix found an overbroad You loading boundary: unavailable
transit sources also hid saved-report controls. The boundary now covers the
readings while report controls remain accessible. The outage regression verifies
this separately from successful report preparation. Report/factual-footer
fixtures explicitly resolve their bundled content plane while keeping generation
and external calculations isolated.

Two older browser failures were reproduced on unchanged main. A Calendar link
with its date only in the hash selected that date visibly but calculated today's
sky, leaving the reading pending. The shared date reader now honors a valid
Calendar hash date, with precedence, invalid-date and unrelated-route tests.
The original 21-passage Calendar regression passes without changing its route or
full-copy assertions. A Sky hydration fixture served the current published
snapshot but expected superseded knowledge-file prose; its complete-copy
assertions now reference the same published rows and still verify exact key
requests, dated links and reloads. No source passage was edited.

An expanded fresh-build run passed 32 cases covering Calendar, all four report
layouts, both Moon readings, cross-surface transit hydration, outage isolation
and Studio previews. Five additional factual-footer cases passed for You/Friends,
including unknown birth times, and the dated Sky article full-copy test passed.
The Calendar performance check passed all six cold samples: complete readings
appeared within 6.1 seconds under its configured network/CPU throttling, below
the unchanged 7.5-second limit.

Release fixtures now model the actual source requests: delayed macros respond to
both provider and exact-key reads; offline tests fail the publication endpoint
and release the held snapshot before its deadline; Calendar lunation navigation
uses the current event identity and card kind because Studio owns its visible title.
Lunation article assertions compare the complete currently approved reusable
body selected by the shared reader, rather than superseded SKY V4 wording. Pending
Calendar event checks respect the existing full-calculation loading boundary.
Full body, opening/ending, publication identity, navigation and reload assertions
remain in place. The old offline and delayed-macro fixtures also failed on
unchanged main `670c84d9d`.

A new read-only live inventory contained 4,079 public rows;
all 1,591 required transit dependencies packaged successfully. Exercising the
actual loader against those public rows completed eight bounded reads in
4.2 seconds with no missing publication versions. This is a single measured
network run, not a mobile performance guarantee.

Release comparison used separate `npm ci` installations for unchanged main
`670c84d9d` and implementation `b86c41a73`, with identical browser-workflow
environment settings. Aggregate JavaScript gzip measured 3,501,845 versus
3,503,019 bytes (+1,174); CI measured 3,502,992 on the implementation head.
The loader and recovery controls receive a documented 1,500-byte aggregate
allocation. App boot (460,365 bytes) and reader boot (513,673 bytes) remain below
their unchanged limits. CSS, individual chunks, deferred-source boundaries,
memory graph and runtime-performance limits also remain unchanged.

Sun-return and Uranus-return readings remain genuine content gaps in the audited
package and live inventory. This repair does not invent replacement readings.

The full local `npm run test:content` was not green: protected report source
documents were not provisioned in the isolated checkout, and a separately
attempted downstream chain encountered the unchanged raw-Node
`import.meta.env.VITE_SUPABASE_URL` prerequisite. These are recorded separately
from the passing required API suite and focused tests, not waived as passed.

Before merge, run the required API suite again in the release clone, scan staged
files and built assets with the protected privacy policy, and require the
unfiltered Content Studio API workflow on the exact PR head. Merge to main and
let its Git integration deploy. A live completion claim requires a ready main
deployment matching the merge revision and the same rendered-copy regression
against the production URL. Isolated browser fixtures and real public-reader
checks must remain separately identified in the release evidence.

Final integration includes Calendar passage editing and preview links from main
`7ae1375e2`. The transit/report loading modules now download only when requested;
the small publication identity helper stays available for stale-reading detection.
Matched current-main/release builds measure 3,512,853/3,516,369 aggregate gzip bytes.
The combined aggregate allocation is 3,517,000 bytes; startup, CSS, individual
chunk and timing caps stay unchanged. The browser feature-flag build measures
3,516,418 bytes. This accounts for deferred module/import overhead rather than
claiming a reduction in total JavaScript. The prior integrated build passed all
39 affected browser cases and the complete API suite; final-head evidence is
recorded on the release PR.
