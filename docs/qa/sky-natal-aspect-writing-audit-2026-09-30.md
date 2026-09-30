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
