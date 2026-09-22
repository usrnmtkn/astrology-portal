# Content Studio publication reliability

Release state: implemented on the review branch; production activation and deployed
verification are pending. This is a technical change, not approval of reader prose.
Implementation was rebased onto main `bd2316b8531068bbaae80add4d5f675dc382c85e`
(PR #1003); it retains #1002 inventory loading and #1003 scoped Sky loading.

## Contracts and caller audit

| Caller | Actor and storage | Resulting contract | Evidence |
| --- | --- | --- | --- |
| Core, compatibility, Sky placement, key and surface loaders; Astro 101 | Anonymous or signed-in reader; `/api/content-reader` | Fixed query vocabulary, bounded ID pages, explicit nested public fields, current publication identity, existing family approval rules | `test-content-reader-privacy.mts`, complete Studio API/reader round trips |
| Nightly offline exporter | Public reader plus public publication ledger | V2 public projection; no author drafts, originals, history or arbitrary future metadata | `test-content-studio-last-known-good.mjs`; all 3,914 retained rows |
| Owner inventory/detail and history | Existing verified owner/administrator or emergency secret; server service role | Authoring stays private; history endpoint returns 25 immutable versions per cursor | `test-admin-auth.mjs`, `test-content-studio-private-versions.mts` |
| Editor save, archive/restore, approval, delete, bulk non-LIVE updates | Owner API; caller's exact `updated_at` | Missing/invalid version is 400; stale version is 409; final conditional write retains microseconds | CRUD, round-trip, copy-recovery and storage suites |
| Package and separate article revision publication | Owner API and restricted transaction RPC | Proposal, target, ledger and dynamic dependency versions must still match; target, history, completion and receipt commit together | Actual handler plus PGlite; PostgreSQL 17.6 separate-session races |
| Browser publication recovery | Same owner and exact action/proposal/version | Read-only receipt lookup, no new publish; report later retirement/supersession; retain unsaved input; recover from Studio page after reload | `studio-publication-recovery.spec.ts` on mobile/desktop and both Studio themes |
| `generate-sky-placements` cron | Service role | Existing base/topper writes include fetched row version and require a returned row; insert ignores duplicates | `test-generated-row-writers.mts`, judge pre-call authorization test |
| `generate-sky` cron and `/api/generate-content` | Authorized generator | Existing identity blocks generation before a provider call; final insert cannot replace a concurrently created row | Actual handler/storage in `test-generated-row-writers.mts` |
| `generate-sky-aspects`, prepopulation | Service role | Existing insert/ignore-duplicates paths retained; no general overwrite permission | Prepopulation LIVE-race and Sky draft suites |
| `import-sky-writeup-variables.mjs` | Explicit owner CLI operation | Already carries fetched versions on PATCH/DELETE/publication | Inspected caller; no import dispatched |
| Store-import preparation and memory-preview authorizer | Local artifact generation / read-only authorization | No live authoring mutation | Inspected callers |
| Personal reports, shares and user-generated results | Existing user/owner endpoints and separate tables | Not folded into the public shared-content reader | Report CRUD/privacy and personalized live-status suites |

Direct reader access to `generated_interpretations` is removed from web loaders.
The timestamp-only `content_runtime_revision` and public lifecycle ledger remain
available. Version capture stores complete original rows, including existing inline
history. It does not rewrite source content or recover versions already lost before
capture. No automatic history purge or new restore UI is introduced.

## Production observations before activation

Bounded read-only database audit at 2026-09-22 00:15 UTC found anonymous and
signed-in SELECT grants on raw authoring rows. Of 6,752 LIVE/serving/review-clear
rows, 242 contained inline dashboard history and 678 contained original package
records. Counts indicate exposure potential, not evidence that a reader downloaded
those values. No dependent views or realtime publications for the affected objects
were found. The existing private archive remains restricted. Audited publication
and retirement RPCs are service-role only; the runtime revision RPC returns a time.
Raw owner text, identifiers and credentials are excluded from this document.

Vercel's dashboard confirmed production main `bd2316b85`, deployment
`dpl_4dvMqJfuDHMJa2FDrsRNYT5JQgtT`, Ready, on September 21. Existing Standard
Protection is enabled with no displayed domain exceptions. Its immutable deployment
snapshot URL redirects anonymous requests to authentication. This protects old
deployment URLs; it cannot recall previously downloaded data. The current production
alias still needs the new V2 snapshot and public reader before grant cutover.
The Vercel connector lacks this team scope; the signed-in dashboard is available.

Supabase's security advisor was inspected before DDL. Existing notices include
mutable search paths, privileged RPC execution and disabled leaked-password checks;
these are not evidence of an exploitable path by themselves. The affected raw-reader
RPC/view/catalog audit was narrower and is recorded above. New private objects deny
reader and direct service-role table access, use fixed function search paths, and
expose only restricted server RPCs. The changelog markdown endpoint was unavailable;
API security documentation and the actual PostgreSQL 17.6 behavior were checked.
No dependency upgrades, live generation or paid Council calls are part of this work.

## Verification

The isolated worktree has its own `npm ci` dependencies and locally built knowledge
package. The full unfiltered `npm run test:content-studio-api` passed after integrating
main #1003; it includes the reader-copy boundary. Added SQL tests run the real copy,
completion and publication triggers, private-version migration and receipt migration.
A native PostgreSQL 17.6 server with distinct backend sessions verifies blocking,
one-winner competition, same-operation replay, changed proposal/target/dependency,
and concurrent retirement. Forced late failure rolls back target, completion,
history and receipt together. Synthetic tests never call a paid model or write
production content.

Fresh browser builds verify Calendar save/reopen/publication and competing tabs.
Recovery tests lose the HTTP response after the actual transaction commits, then
recover its receipt without another publication; local unsaved text survives.
Dark-theme cases reload after commit and recover from the empty Review Queue.
Light/dark is asserted on `data-studio-theme`, not just the page color preference.
Web/admin typechecks and CSS/token contracts passed. Public-asset and staged privacy
scans must pass on the final release bytes. CI must pass on the exact PR head;
local evidence never substitutes for that gate.

### Bundle comparison

Independent builds of main `bd2316b853` and this release used separate `npm ci`
dependencies and identical workflow Supabase placeholders. Gzip uses level 9.

| Metric (bytes) | Main | Release | Change |
| --- | ---: | ---: | ---: |
| Web startup JavaScript | 458,625 | 458,479 | -146 |
| Reader startup including CSS | 511,412 | 511,266 | -146 |
| All web JavaScript | 3,443,143 | 3,444,253 | +1,110 |
| Admin entry raw | 738,164 | 741,824 | +3,660 |
| Admin entry gzip | 215,185 | 216,316 | +1,131 |
| All admin JavaScript | 727,348 | 728,536 | +1,188 |

The transport schema constant is separate from the server projection, avoiding
unneeded schema construction in reader startup. The small aggregate and admin
allocations cover publication recovery and version-aware controls. No dependency
or CSS is added; reader startup, deferred-source, editor, graph and timing
boundaries remain enforced. Both bundle gates pass with these measured allocations.

## Ordered rollout and rollback

1. Review and pass the exact PR head, including full API, PostgreSQL concurrency,
   browser, packaging, bundle and privacy gates. Recheck deployed main and active
   callers before activation.
2. Apply `20260922002101_content_studio_private_versions.sql`, then
   `20260922003250_content_studio_publication_receipts.sql`. These are additive;
   retain all existing raw data and reader grants during this preparation. Compare
   source row/version/hash membership with the private backfill, inspect new grants,
   and run advisors. A capture failure must reject its source edit.
3. Verify the feature preview against the migrated schema with owner authorization
   and approved existing records. Use synthetic storage for publication mutations;
   do not approve owner prose just to test the release. Confirm the deployed function
   includes its runtime contracts/assets and the exact current publication is returned.
4. Merge through main's Git deployment. Verify production revision, the typed reader
   for every affected family, owner inventory/history access, exact saved text and
   V2 downloadable snapshot before closing the old reader path.
5. Apply `scripts/sql/content-studio-reader-cutover.sql` as the separate activation
   migration. It revokes table and column privileges and asserts actual denial.
   Probe anonymous and non-owner signed-in raw REST/GraphQL access, private history
   denial and permitted public reader access. Recheck views/RPCs/realtime and the
   old immutable deployment URL. Reload stale clients; do not leave an insecure
   compatibility route open.
6. Verify production Studio search/detail and memory source hashes with owner access,
   plus anonymous denial. Record the deployed commit and completed checks before
   changing the release state to verified.

Rollback must retain private history, receipts and closed raw grants. Use only a
version-aware reader build compatible with `/api/content-reader`; never reopen raw
authoring access or repeat an uncertain publication. Disable a failing publication
action while preserving drafts and read-only recovery. A receipt describes a past
commit; its current row may have been superseded, retired or deleted.

References: [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api),
[PostgreSQL isolation](https://www.postgresql.org/docs/17/transaction-iso.html),
[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication),
[API release runbook](content-studio-api-verification.md).
