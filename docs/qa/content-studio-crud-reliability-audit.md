# Content Studio CRUD reliability audit — October 3, 2026

The audit covers Studio loading, source retrieval, saved-version checks, editing,
publication, retirement, deletion, reader hydration, and Supabase's supporting
schema/access boundaries. It starts from production/main
`f9b10366b4bb3aa13e9df94cb3b14bd9e9683127`. Production investigation is read-only;
all failure injection and CRUD verification use isolated fixtures. No owner
writing, approvals, database grants, or production rows are changed by this audit.

## Findings and fixes

| Finding | Evidence | Change |
| --- | --- | --- |
| Partial loads falsely appear healthy | Deployed frontend, isolated failed review/user/omission API responses: sidebar says `Connected`. The warning disappears with the toast. | Persistent warning names failed collections, sidebar says `Incomplete`, and retry restores a confirmed healthy state. Loaded inventory remains usable. Invalid collection shapes also fail visibly. |
| Different editors cancel the same save at different times | Secondary editor's shared client aborts CRUD at 10 seconds; main editor PATCH allows 45. Clock-controlled regression fails on the baseline. | One shared request policy: bounded 45-second CRUD writes; 10-second reads. Writing generation keeps its separate existing deadline. No automatic mutation retry. |
| A timeout can falsely confirm an older draft | Recovery accepts any of ten drafts with matching submitted fields, without checking row identity or a newer version. Regressions for unrelated, unchanged, and older rows fail on the baseline. | Confirmation requires the same row or an explicitly linked revision, a newer timestamp, DRAFT state, the same content key, and exact submitted fields. Empty submissions cannot confirm a save. |
| A committed edit with a lost network response is not recovered | Actual save handler commits, then the fixture drops the browser response. The previous client only recognized selected timeout text. | Network/protocol failures receive an explicit uncertain-save classification. One read verifies the saved result; the write is never repeated. Confirmed validation/version/auth rejections are not retried. |
| Auth outages look like lost admin access | Actual inventory/save/publication/status handlers return 401 when Supabase Auth returns 503; Auth fetch and body lack a deadline. | Six-second verification deadline covers headers and body. Shared Studio authorization returns 503 for unavailable verification and 401 for rejected credentials. Both fail before storage access. Owner role/email rules and emergency-key checks stay intact. |
| Production initial loading still calculates a month of sky | After PR 1120 deployed, the real `/api/admin/review-records?surface=upcomingAspects&status=all` request ran for 11.81 seconds with multiple eight-second calculation timeouts. Its eventual HTTP 200 arrived after the browser deadline. The separate fast handler's rewrite did not protect this physical route. Retry recovered, and the new persistent warning correctly exposed the failure. | Both physical review handlers now use the same authenticated early return for default supplemental loading, with no storage or calculation calls. Explicit date windows and Daily Glance retain their calculation workflow. |

The auth boundary is shared by Studio content, writing, preview, history,
publication, and report administration routes. Memory retains its stricter
credential requirement and now propagates temporary verification failures to its
existing 503 response. Authorization is not cached across requests.

## Production database and request evidence

Supabase logs were inspected in bounded windows on October 3, 2026, through
17:56 UTC. These are samples, not proof that intermittent outages cannot recur.

- The 84 inventory HTTP 400 responses occurred at 16:00:00–16:00:38, before
  the missing `studio_facts` migration was installed at 16:06. No later 400
  appeared in this sample. That repair belongs to PR 1117.
- From 16:10 onward, the 56 denied generated-content reads came from two old
  preview deployments. They are not evidence of a current production Studio
  storage failure, and do not justify opening table access to browsers.
- Successful generated-content reads had a 539 ms p95 origin time and a
  4,851 ms maximum in the broader sampled window. Publication reads had a
  384 ms p95 and 3,384 ms maximum. No fresh database timeout was found in the
  post-repair sample.
- A connection snapshot found no blocked or idle-in-transaction session.
  Cumulative query statistics still include earlier broad, slow reads; they
  cannot be interpreted as exclusively post-repair traffic.
- `studio_facts` is installed as a generated JSONB column. Required version,
  content-key, source, and section columns are present. Primary-key, content
  identity, cursor, provider, and live-reader indexes are installed.
- RLS is enabled on content, publication, private history, and operation receipt
  tables. Publication/history RPCs deny `anon` and `authenticated`, and grant
  execution to the service role. Their security-definer functions have fixed
  search paths. Version capture, publication synchronization, and immutable
  history/receipt triggers are enabled.
- The publication integrity join found **4,088 live content entries** with
  matching existing row IDs, content keys, saved timestamps, LIVE status,
  serving lane, and no review hold. The additional live ledger marker is
  `__content-publication-ledger/v1`; its intentionally null row ID is not an
  orphaned article. Eleven retired entries remain retired.
- The missing Moon article was a separate reader branch error fixed by PR 1119.
  Its eight rendered paragraphs were already verified against the owner's three
  saved source sections, including after reload. Publishing again was unnecessary.

## Verification contract

| Journey | Evidence required |
| --- | --- |
| Create, read, repeated edit, reopen | Full `test:content-studio-api`; real handlers and conditional PostgREST fixture storage |
| Stale edit/delete, conflicting insert | Full API gate; newer stored versions must remain intact |
| Publish, retire, restore, history | Full API gate and publication browser recovery; isolated PostgreSQL receipt/history execution |
| Lost save response | `test-sky-secondary-editor-crud.mts`: real save and inventory handlers, exact reopened copy, one write |
| Deadline and false save confirmation | `test-studio-request-reliability.mts`: fake clock, dropped response, wrong/unchanged/older draft, confirmed 409 |
| Auth timeout/outage/rejection | `test-studio-auth-availability.mts`: actual handler 503/401, no storage calls, stalled headers/body; existing owner/member auth gate |
| Partial loading and recovery | `content-studio-recovery.spec.ts`: saved rows stay usable; persistent warning; successful retry; invalid JSON/row lists; mobile/desktop and both themes |
| Default review bootstrap | `test-studio-review-bootstrap.mts`: invoke both physical handlers, require zero storage/calculation calls for initial loading, verify explicit two-day review still calculates both days, and enforce 401/405 before work. The public-route case failed before the fix. |
| Reader/publication recovery | Fresh web-build publication recovery and Moon reader suites; exact published text after reload and retired-source behavior |
| Styling and types | Admin/web typechecks and CSS/token audit |
| Release | Exact PR-head hosted gates, main Git deployment, deployed asset tests with isolated storage, read-only real production checks |

The full API gate includes secondary editors, personalized content, reports,
Calendar/lunations, horoscope period isolation, reader admission, privacy,
publication receipts, storage protocol failures, pagination, and memory.
Passing those fixtures does not claim that production writes were exercised or
that every possible future network condition has been eliminated.

Local acceptance passed on this change: the complete unfiltered API gate;
25 fresh web-build browser cases across Studio recovery, publication recovery,
and the Moon editor/reader; web/admin typechecks; CSS/token audit; owner-session
authorization tests; and repository plus built-web privacy scans. The baseline
failures were reproduced before the fixes (five save/client cases, six auth
cases, and the deployed frontend's false `Connected` status with isolated APIs).
Hosted checks and production verification are recorded on the release PR.

PR 1120 passed all 42 applicable hosted checks and deployed from main
`f2ec93f4c684eb001714a8a274c4c02e5b75815a`. Nine deployed-asset browser cases
passed with isolated storage. Read-only production inspection found all three
Moon sections Live and exposed the additional default review-route problem
above. The production request evidence is Vercel request
`clcb5-1791055584671-2d781566d6ab`, October 3 at 19:26:24 UTC. The successful
retry is a recovery observation, not proof that its initial-load cause was fixed.

### Measured bundle allowance

Independent checkouts with their own `npm ci`, using identical workflow Supabase
placeholders, measured main `f9b10366b` against feature `653602f0a`:

| Admin JavaScript | Main | Feature | Change |
| --- | ---: | ---: | ---: |
| Entry raw bytes | 764,539 | 765,959 | +1,420 |
| Entry gzip bytes | 222,550 | 222,962 | +412 |
| Aggregate gzip bytes | 785,248 | 785,667 | +419 |
| JavaScript files | 74 | 74 | 0 |

The initial hosted gate exceeded the existing size limits. Following the
repository's measured feature-allowance convention, allocate 1,500 raw entry/
largest-chunk bytes, 500 entry gzip bytes, and 750 aggregate gzip bytes for the
new recovery/status code. These leave 291, 288, and 333 bytes of measured
headroom, respectively. The complete bundle gate passes with the allowance.
No dependencies or content corpus are added; deferred boundaries, reader
startup, CSS, memory graph, and forbidden-payload checks retain their limits.

## Separate platform follow-ups

These findings are not established causes of the reported CRUD failures:

- Production PostgreSQL reports 17.6. Supabase's
  [September 25 PostgreSQL advisory](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
  announces 17.11/15.19 security updates. Plan and verify a maintenance upgrade
  separately. `ltree` and `btree_gist` are absent; `pgcrypto` is installed and its
  usage still needs compatibility review before upgrading. No upgrade was run.
- Advisors report [mutable search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
  on seven timestamp/transition functions,
  [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
  and unrelated [public security-definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
  Review their callers and access guards before changing permissions.
  The privileged Studio publication/history RPCs checked above are restricted.
- Performance advisors include [missing foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys),
  [repeated auth calls in RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan),
  and [unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). Prioritize measured query paths;
  cumulative/possibly reset statistics do not justify dropping indexes.
- Reader profile persistence produced six denied writes in the sampled logs.
  That adjacent profile-cache behavior is outside Studio content publication;
  it requires its own reproduction before a policy change.

Use the [API verification contract](content-studio-api-verification.md) for every
subsequent release. Do not replace server-side access controls, saved-version
checks, or publication receipts with a blanket retry or browser table grants.
