# UI completion candidate — November 21, 2026

Status: local preflight passed. Required PR/main gates, deployment and production
acceptance remain pending. This receipt does not claim that the candidate is live.

## Candidate

- Base: `0363303cf96ad0c0a98795b461304353c476056f` (`main`).
- Runtime/test head: `f9cc1bb010edbbf2c8802406d30b75a2c85c2ab2`.
- Runtime/test tree: `b8a86985b40970ea6d5b8af918b34001cbe577a0`.
- Release owner: this UI-completion task. One compatible candidate contains the
  fixes; no other task is assigned implementation or release ownership.

Friends feed ranges now include both years when their endpoints cross a year in
the selected time zone. Relationship introductions contain long profile names
at narrow widths. Saved personal-transit reads retain an in-flight request when
profile hydration recreates equivalent objects; account, chart, date and reading
identity changes still cancel the old request. Existing publication and request
cancellation boundaries remain in force.

Test maintenance supplies the startup publication fixture, waits for the existing
light-theme colour transition before measuring contrast, and exercises the
actual saved-reading function with its current content-key closure. Reader copy,
approved icons, owner drafts and live account records were not edited.

## Local verification

| Check | Result |
| --- | --- |
| Complete affected browser specs | 373 passed; zero failures, skips or retries |
| Responsive parity matrix | 50 passed; zero failures, skips or retries |
| Focused integration diagnostic | 8 passed |
| Canonical release builds | All 12 phases passed, including Web/auth/Studio budgets and native server startup |
| Browser catalog and CSS architecture | Passed |
| Clean source privacy | Passed, 12,142 files |
| Built public asset privacy | Passed, 470 files |

The affected screen run completes Calendar Moon UI, chart-table viewport,
design-handoff pages, feed range labels and loading-handoff specs. It covers
mobile, landscape and desktop layouts and both themes. The parity run includes
Chromium and mobile WebKit, selected-day dialog → transit article → Back,
available house readings, publication refresh during activation and matching
Sky/planetary countdowns. Fresh previews and synthetic-network containment were
used. Screenshots were inspected for feed ranges, readable themes and profile
introduction containment.

The first preview launch was blocked by the local sandbox before testing. The
authorized local-server run passed. Earlier diagnostic failures are preserved:
startup tests lacked a publication fixture, light contrast sampled a colour
transition, and the request-lifecycle harness used the prior closure. Their
corrected complete consumers passed; none was recorded as a product pass before
correction. A prior concurrent mobile run timed out loading Friends; both return
routes passed in the isolated current-main diagnostic and the full parity run.

## API evidence and required hosted scope

The affected selector conservatively selects 209 API commands and 231 browser
specs because `App.tsx` is shared. Required hosted gates must run their selected
scope on the exact final PR head. This local receipt does not replace them.

Dependency-closure analysis identifies five API commands with changed inputs;
all five passed locally:

- `npm run test:sky-saved-template-reader`
- `npm run test:calendar-lunation-aspects`
- `node scripts/test-user-content-request-lifecycle.mjs`
- `node --import tsx scripts/test-composite-writeups-render.mjs`
- `node --import tsx scripts/test-natal-placement-friend-publication.mts`

The other 204 command input closures are unchanged from the successful
[main API gate](https://github.com/usrnmtkn/astrology-portal/actions/runs/44958582438/job/137012484491)
at `72a6f10fbdb4a6f3df27dfe509412a536631482c`. The intervening main merge changes
only a recovery-schedule cron line. That evidence is reused for local preflight
under the release policy, not described as exact-head API success. No protected
fixture was copied into the checkout or receipt.

The final documentation-only commit leaves the validated runtime, dependencies,
test inputs and build profiles unchanged. Production acceptance must verify the
merged main revision, READY deployment and affected journeys before this task is
closed.
