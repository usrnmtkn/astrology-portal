# App and Content Studio QA — 2026-10-03

Base: production/main `dbadf218c2ae8dad23bab6b4f842de508930729f`. The PR records the exact tested release head and hosted API result.

## Reproduced failures and repairs

| Failure | Repair | Verification |
| --- | --- | --- |
| A delayed document read could open an editor after navigation to another section. | Abort superseded reads and ignore their late success/error results. | Delayed successful and failed responses both leave the new workspace intact. |
| Content Library opened horoscope editions in the generic text editor, whose edits conflict with the structured edition contract. Dated lunar workspace records also reached the generic endpoint that rejects them. | Route each family to its dedicated editor with the exact saved ID in the URL. Read fresh content, preserve navigation guards, and restore selection on reload. | Actual-handler save/reload at 390px and 1440px; unchanged sibling readings/drafts, canonical horoscope body, no generation calls. |
| Secondary content loaders stopped after 125 inventory pages. | Share the main inventory pagination implementation, retaining malformed/repeated-cursor and cancellation checks. | A 126-page inventory reproduces the old failure and completes with the fix. |
| Live Needs attention/Content coverage failed with a missing review-manifest file in the server bundle. | Explicitly package all eight runtime assets within Vercel's 256-character glob limit. Keep missing-source errors safe and recoverable. | The actual authenticated handler runs with reads restricted to its declared bundle. Missing asset fails safely; restoring it permits retry. |
| A coverage server failure disabled Refresh and incorrectly displayed the sign-in gate. | Preserve the current credential for server failures; show sign-in only when access is absent or rejected. | Both health pages recover via Refresh; 401 still displays the access gate on desktop/mobile, light/dark. |

## Verification scope

- Baseline: 352 passing browser checks covering Studio pages/forms, load failures, content and variable CRUD, formatting, publication/recovery, reader destinations and app loading.
- Final focused production-entry build: 21 passing browser checks for the repaired paths, including real API handlers with isolated storage. Dedicated editors also pass in the standalone admin build.
- Public app checks cover Sky, You, Friends list/chart, Settings, nested article navigation/reload, horoscope location/period/sign navigation and delayed account restoration. Lunar draft recovery and horoscope correction flows use simulated providers; no paid model calls.
- Full `npm run test:content-studio-api`, admin typecheck, CSS/token/design-system audits, bundle gates and built-asset privacy scan are release gates. Hosted `Content Studio API contract` must pass on the exact PR head before merge.
- Live read-only QA reproduced the health-page packaging failure and confirmed the Sky summary and placement article navigation. Repeat these reads against deployed main after merging.

Tests preserve authored content and use isolated storage for create/update/archive/delete/publication operations. No production content was rewritten or published as QA. This is functional coverage of the tested paths, not a claim that every authored passage has received an editorial review. Owner-supplied article sections remain an editorial dependency.

## Matched bundle comparison

Independent checkouts with their own `npm ci` installations; both web builds use the same browser-fixture Supabase settings and natal-pattern flag.

| Gzip bytes | Production base | Repair | Delta |
| --- | ---: | ---: | ---: |
| Admin aggregate JavaScript | 783,878 | 784,439 | +561 |
| Web aggregate JavaScript | 3,520,877 | 3,521,155 | +278 |
| Deferred web horoscope editor | 10,878 | 11,026 | +148 |

Allocate 750 bytes above the previous admin aggregate cap and 100 bytes above the deferred horoscope editor cap for these recovery/routing fixes. All initial-entry, reader-startup, CSS, other individual chunks, memory graph and forbidden-payload gates stay unchanged. The browser-fixture web build remains within the prior aggregate budget. Hosted CI without the browser-only feature flag measures 3,521,300 aggregate bytes, 50 above that cap; allocate 250 aggregate bytes (3,521,500 total), leaving 200 measured bytes.
