# Auth, sign-in, invitations, and feature access: execution plan

Date: 2026-09-21. Status: implementation candidate; exact-head CI and physical acceptance pending.

## Baseline and scope

Use `codex/journal-account-sync` in the clean-history repository
`https://github.com/usrnmtkn/astrology-portal.git`. At planning time, refreshed
`origin/main` and branch HEAD both resolve to
`a05a04bce6da77dde37a4fdd368e34dd9df228d8`: zero commits ahead or behind,
with uncommitted changes. Preserve those changes and unrelated owner work.

The existing local fixes and 26 Chrome/WebKit results are documented in
[journal-account-sync.md](journal-account-sync.md). They cover callback ordering,
cached-session verification races, Account/Journal recovery, per-device sign-out,
and simulated cross-device journal synchronization. They have not been committed,
deployed, or accepted on the physical phone. Keep these regressions throughout.

Default referral scope: existing friend invitations and share links, including
the invited user's signup/login handoff and resulting relationship. Separate
acquisition attribution or rewards require an explicit product definition if
requested; do not invent a credit system as part of this repair. This scope
decision does not block auth, authorization, or invitation reliability work.

Implementation owner: coding agent. Release approval: repository owner, under
AGENTS.md. Physical-phone acceptance: owner-assisted, with engineering capturing
redacted results. The owner subsequently instructed “please proceed,” authorizing execution and the
planned release process after passing its checks.

## Required behavior

One successful app sign-in establishes one account identity used by every
protected feature. Cached profile fields never establish authentication. A
temporary verification failure offers recovery; it does not silently become an
empty account, a successful login, or an unnecessary new login prompt.

| State | Required behavior |
| --- | --- |
| Checking callback or stored session | Wait before protected requests; preserve callback data until the SDK consumes it. |
| Authenticated | Use the verified account ID; the API/database still authorizes each resource. |
| Recovering expired/interrupted session | Let the SDK refresh once through its shared client; show recovery status and preserve same-account drafts. |
| Verification/network error | Show retry; do not clear saved server data or report successful empty results. |
| Signed out or definitively revoked | Clear protected rendered data and disable protected operations; offer sign-in with a retained destination. |
| Account changes A to B | Cancel/ignore A's pending work and remove A's protected data before rendering B's data. |

| Surface | Access contract to verify |
| --- | --- |
| Public Sky, Learn, Calendar browsing | Remain usable as guests; account-owned overlays remain protected. |
| Cached profile and local chart | May remain available under existing offline behavior; must not imply live sign-in or expose another account's protected data. |
| Account and settings | Protected reads/mutations use the verified owner; verification failure is distinguishable from sign-out. |
| Journal and Calendar check-ins | Read/save/edit/delete/export only the verified owner's rows; use one shared backend across devices. |
| Friends, charts, invitations, blocking | Enforce ownership, recipient eligibility, relationship permissions, and revocation at the backend. |
| You/Friends AI readings | Authenticate the same account in the browser and API; enforce report ownership, relationship consent, and any existing entitlement rules. |
| Report library, notifications, delivery, sharing | No previous-account titles, unread counts, toasts, or results after sign-out/account switch; shared links follow their separate explicit access rules. |
| Account export, erasure, deletion | Target only the verified current account; interrupted or switched sessions cannot act on another account. |
| Content Studio/admin | Ordinary user sign-in never grants admin authority; preserve existing server authorization. |

## Phase 0 — establish the reproducible baseline

1. Refresh refs, record branch divergence and working-tree changes; retrieve
   current project memory and requiredContext from this verified checkout.
2. Record the live deployment's commit, public origin, browser auth project,
   server auth project, and applied migration versions using read-only inspection.
   Record configuration alignment, not keys or token values.
3. Inventory every auth consumer and protected endpoint against the table above.
   Mark each as covered, defective, or unverified, with source references.
4. Use two synthetic accounts (A and B), two independent browser contexts, and
   a disposable migrated database. Keep real account identifiers, birth data,
   journal prose, credentials, and invite tokens out of fixtures and logs.

Exit gate: a versioned coverage checklist and repeatable fixtures; no assumption
that local HEAD equals the deployed application or that matching emails prove
matching active account identities.

## Phase 1 — finish the shared session lifecycle

Targets: `apps/web/src/services/auth.ts`, `authCallback.ts`,
`apps/web/src/main.tsx`, `App.tsx`, `features/auth/SignupView.tsx`,
`services/studioAuthReturn.ts`, and `hooks/useChartSyncFlush.ts`.

1. Retain the prepared callback-ordering and verified-auth-event fixes. Review
   initial load, token refresh, resume, cross-tab changes, and sign-out against
   the state contract above; reuse the singleton SDK client.
2. Confirm no SDK callback awaits a nested auth operation while holding the
   SDK's auth lock. Shared recovery must not create refresh/retry loops.
3. Replace the in-memory-only login destination with a bounded, same-origin,
   allowlisted handoff that survives OAuth reloads. Consume it once after
   successful sign-in; preserve the existing Studio return-path restriction.
4. Distinguish cancellation, invalid callback, expired session, and temporary
   network failure. A terminal callback failure must have a usable route to
   restart sign-in, not an endless reload of the same failed callback.
5. Verify Google, existing email/password, email confirmation, and phone auth
   only where enabled. Define behavior for an existing identity rather than
   silently creating or merging accounts.

Exit gate: AUTH-01 through AUTH-07 below pass; all protected surfaces receive
the same verified identity, and login returns to the requested feature.

## Phase 2 — close feature-access and account-switch gaps

Targets: Account/Journal, `features/calendar/useCalendarCheckIns.ts`, You and
Friends report controls, `features/reports/ReportsGlobalLayer.tsx`,
`components/reports/ReportLibraryView.tsx`, `routes/ReportRoute.tsx`,
`services/reportLibrary.ts`, `reportFulfillment.ts`, `reportSharing.ts`,
`userGeneratedContent.ts`, and manual-chart synchronization.

1. Add a failing regression for each uncovered feature before changing it.
2. Scope report notifications, report-library state, and in-flight responses
   to the verified account. Clear protected titles, toasts, counts, and cached
   results immediately on sign-out/switch; prevent late responses restoring them.
3. Keep expected-owner checks on reads and mutations. Preserve same-account
   drafts during refresh; prevent drafts or queued writes from crossing accounts.
4. Verify journal synchronization on save, edit, deletion, reload, resume, and
   reconnect. While visible and idle, another device's committed changes must
   appear by the next successful 30-second refresh; reopening/resuming must read
   current server state. Never overwrite an open draft during background refresh.
5. Check all account-sensitive actions, including export, erasure, deletion,
   report sharing, and queued chart synchronization, during account changes.

Exit gate: DATA-01 and ACCESS-01 through ACCESS-04 pass; no surface grants access
from a cached profile and no prior-account protected data survives a transition.

## Phase 3 — make invitation handoffs account-safe

Targets: invitation effects/actions in `App.tsx`,
`services/socialFriends.ts`, `features/friends/SocialFriendsPanel.tsx`,
`features/auth/SignupView.tsx`, and the social invitation SQL functions.
Preserve [email-confirmation-invite-handoff.md](email-confirmation-invite-handoff.md).

1. Bind each preview and acceptance to the exact invite token and verified
   account that produced the preview. Cancel/ignore results when either changes.
   Clear the old modal/state on sign-out; revalidate eligibility after re-login.
2. Prevent acceptance from rereading a different mutable pending token than
   the one displayed. A new invite invalidates the old preview and action.
3. Preserve intended handoffs through Google redirect, same-browser confirmation
   tabs, reload, and app resume. For a different browser/device with no shared
   storage, reopening the original link must recover the invitation safely;
   provide an explicit recovery path when the token is unavailable.
4. Distinguish contact-bound invitations from transferable share links. Enforce
   recipient eligibility, expiry, cancellation, blocking, self-invite rules,
   and repeat-use behavior in SQL/API, not only in the UI.
5. Make retries/double taps/concurrent acceptance produce one intended
   relationship outcome. Reopen both users' Circle views and verify the
   persisted relationship and chart-sharing permissions.
6. Map any existing referral attribution discovered during inventory. If a
   separate attribution feature is requested, first define qualifying event,
   attribution precedence/window, existing-user eligibility, deduplication,
   consent/retention, and reward rules if applicable. Track it as a separate
   deliverable; invitation success alone does not prove referral credit.

Exit gate: INV-01 through INV-07 pass through actual SQL/RPC handlers, including
wrong-account and concurrent claims; no token, recipient identity, or protected
invitation preview leaks through logs or stale UI.

## Phase 4 — verify API identity and database authorization

Targets: `api/_lib/report-http.ts`, `api/_lib/admin-auth.ts`,
`api/account.ts`, report request/delivery/share handlers, social RPCs, and
`apps/web/supabase/tests/`.

1. Compare actual deployed browser/server auth configuration before changing
   environment precedence. Verify each endpoint accepts tokens from the intended
   issuer using that issuer's matching key, and rejects other issuers.
2. Add actual-handler tests for absent, invalid, expired, and other-account
   credentials; resource IDs and body-supplied user IDs must not override the
   authenticated principal. Retain distinct admin and ordinary-user permissions.
3. Run the existing social, calendar, You/Friends lifecycle, and report-library
   database tests against a clean disposable database with current migrations.
   Add missing invitation race/replay cases and direct anonymous/A/B access cases.
4. Confirm RLS and security-definer RPC checks, grants, search paths, ownership,
   sharing revocation, and entitlement checks. Do not broaden grants to make
   failing tests pass. Any necessary schema repair is a new migration.

Exit gate: unauthorized direct requests fail and authorized requests reach the
correct owner's persisted data; browser mocks alone cannot satisfy this gate.

## Regression checklist

| ID | Required scenario and assertion |
| --- | --- |
| AUTH-01 | Fresh Google callback with no stored session, restored You/Friends/Account, delayed SDK/network: callback survives and one verified account reaches all three protected features. |
| AUTH-02 | Cached profile with absent/invalid session: no false signed-in label and no successful empty journal. |
| AUTH-03 | Failed verification followed by cached/cross-tab SIGNED_IN: error remains until verification succeeds; retry does not require a new login. |
| AUTH-04 | Expired token, concurrent feature requests, phone background/resume and offline/reconnect: refresh recovers without duplicate login prompts or loops. |
| AUTH-05 | Local sign-out clears this session and protected UI; the other device remains usable. Revoked sessions receive the correct signed-out state. |
| AUTH-06 | Account A requests remain pending while switching to B: resolve A's requests last; no A data, toast, draft submission, or mutation appears under B. |
| AUTH-07 | Requested Journal/Friends/reading route survives OAuth reload; cancelled/failed login recovers; external and malformed return destinations are rejected. |
| DATA-01 | Independent desktop/phone contexts sharing only the account backend: save/edit/delete/reload/resume/reconnect synchronize; an open draft is not reset. |
| ACCESS-01 | Each feature-access table row is exercised as guest, verified owner, and wrong account through UI plus direct API/SQL. |
| ACCESS-02 | Previously visible report titles/toasts/counts disappear on sign-out and cannot return from an old request. |
| ACCESS-03 | You Day, You Week, and Friends reading requests use the verified principal; saved delivery and library reads enforce owner/entitlement/relationship rules. |
| ACCESS-04 | Export, erase, delete, sharing, and queued chart writes cannot target another account after a switch. |
| INV-01 | Guest invite → new Google/email account → preview → explicit acceptance → persisted Circle relationship for both users. |
| INV-02 | Existing verified user and cached-but-signed-out user each open the same invitation with correct eligibility and login behavior. |
| INV-03 | Email signup returns a user without a session: confirmation required, no claim/write; confirmation in another tab resumes the intended invite. |
| INV-04 | Switch accounts or open a second invite while preview/claim is pending: old responses/actions cannot attach the wrong invitation or account. |
| INV-05 | Expired, cancelled, blocked, self, and wrong-recipient invitations are rejected without creating a relationship. |
| INV-06 | Double tap, retry after lost response, replay, and two concurrent claims: exactly one permitted persisted outcome. |
| INV-07 | iPhone message/browser handoff and another-device reopening: original link recovers safely without assuming shared browser storage. |

AUTH-01/02/03/04/05 and DATA-01 have partial local coverage already; keep those
tests but mark individual rows complete only after all listed assertions pass.
Other rows remain pending. The physical-device cases remain pending regardless
of Playwright's emulated viewport or WebKit results.

## Phase 5 — make verification reproducible before merge

Create a committed `playwright.auth.config.ts` using the existing fresh-build
web-server helper (`reuseExistingServer: false`) with desktop Chrome and iPhone
WebKit projects. Add focused suites for feature account isolation and invitation
handoff; include the existing client-flow and You/report auth regressions.
Expose the selected suite as `npm run qa:auth-access` and make every checklist ID
traceable to a test name or an explicit physical-device acceptance record.

Run from the isolated checkout with its own dependencies:

```sh
npm ci
npm run build:knowledge
node scripts/test-you-report-session.mjs
node scripts/test-calendar-check-ins.mjs
node scripts/test-account-journal-groups.mjs
npm run test:account-view
npm run qa:database-friends
node scripts/test-report-library-notifications.mjs
node scripts/test-report-library-delete.mjs
node --experimental-strip-types scripts/test-admin-auth.mjs
npm run typecheck
npm run qa:css-audit
npm run qa:auth-access
npm run qa:bundle
npm run test:content-studio-api
npm run privacy:check
node scripts/check-project-privacy.mjs --directory apps/web/dist
```

`qa:auth-access` and `test:auth-access` are implemented in this candidate. Run
the latter for service/account race and actual-handler identity regressions. Provision the protected privacy policy through
`PROJECT_PRIVACY_POLICY_FILE` or the existing secret mechanism; do not print it.

Run database authorization using the existing `database-authorization` job in
`.github/workflows/social-friends-security.yml`: pinned Supabase CLI 2.113.0,
ephemeral database start/reset, rollback-only SQL tests, then stop. Use the
report-library workflow's database job for its migration tests. Database reset
is confined to this disposable test instance. If Docker/local infrastructure is
unavailable, run these jobs on the candidate SHA in CI; do not substitute a
production database or mark the gate passed without the actual SQL runs.

Add pre-merge PR triggers or an equivalent exact-head workflow to social-security
and report-library verification; their existing main-push coverage is insufficient
for this release gate. The unfiltered Content Studio API workflow and all relevant
browser/security/privacy checks must pass on the exact candidate commit.

Exit gate: reproducible green checks and evidence for every checklist row;
unavailable live checks are marked pending rather than inferred from mocks.

## Phase 6 — release and physical-device acceptance

1. Prepare focused commits/PRs after owner commit/release authorization. Keep
   auth/feature fixes separate from any necessary schema/config changes where
   reviewable; sequence dependent PRs and rerun affected checks after rebasing.
2. Verify the candidate preview before merge. Record commit, browser versions,
   configuration alignment, migration state, test output, and remaining limits.
3. Merge only a passing approved candidate into main. Let Vercel's Git integration
   deploy that main commit; verify the production alias serves that exact commit.
4. On the physical iPhone, complete one actual Google sign-in, then open Account,
   Journal, You readings, Friends readings, and Reports without another prompt.
   With controlled fixtures, exercise a real invitation handoff and verify both
   users' relationship views. Read the owner's existing journal without copying
   its contents into evidence; use synthetic entries for mutation tests.
5. Use a test entitlement and controlled generation backend for repeatable report
   lifecycle tests. A mocked 202 verifies request wiring only. Any live billable
   generation or real account mutation needs an authorized acceptance action;
   record request, persisted result, and authenticated delivery separately.
6. Repeat desktop ↔ phone journal synchronization and sign-out isolation.
   Observe token refresh/resume and confirm signed-in labels match feature access.
7. If there is unauthorized access, prior-account data exposure, failed session
   establishment, data loss, or broken migrations, stop the rollout and revert
   through main under the repository deployment rules; preserve user data and
   capture redacted diagnostics before retesting. Do not reassign production
   to a feature-branch deployment.

Final acceptance requires no unresolved high-severity auth/access defects,
passing exact-head CI, and the physical-phone journey above. Release notes must
distinguish reproduced defects, implemented changes, deployed verification, and
unverified hypotheses about the original phone session failure.

## Execution evidence map

| Cases | Reproducible evidence | Remaining acceptance |
| --- | --- | --- |
| AUTH-01/02/03/07 | `client-facing-user-flows.spec.ts`, `auth-account-isolation.spec.ts`: actual SDK callback, cache-only account, delayed/failed verification, safe return and rejected/cancelled login. | Physical Google browser handoff. |
| AUTH-04/05, DATA-01 | Client flows: expired token refresh; independent contexts; save/edit/reload/resume/reconnect; draft preservation; local sign-out request. Calendar service and SQL ownership tests. | Physical background/resume and desktop/phone observation; real-device delete synchronization remains unverified. |
| AUTH-06, ACCESS-02 | Service observer stale-response test; report/You browser sign-out races; account-keyed delivery and notifications. | Full live two-account journey. |
| ACCESS-01/03 | Actual report/account HTTP handlers; admin auth; social, calendar and You/Friends lifecycle SQL; public report-share browser regression. | Controlled live report generation/delivery with a test entitlement. |
| ACCESS-04 | Expected-owner checks in journal/report state/share/export/erase/delete; export no longer masks failed journal reads; profile migration allows only server-proven owner mappings. | Physical account-switch acceptance; no destructive real-account test performed. |
| INV-01/02/04 | Actual SDK and invitation service/browser tests bind token and owner, reject stale preview/claim, and retain a subsequent pending invitation. SQL verifies both Circle views after acceptance. | Actual Google/email invitation signup on the phone. |
| INV-03 | Existing signup/session-established contract and bounded same-browser email-confirmation storage handoff retained. | Real email confirmation in another tab/device. |
| INV-05/06 | New rollback-only SQL for anonymous/wrong-recipient/self/expired/cancelled/blocked/replayed claims; separate simultaneous-claim database test. | Candidate CI database job must pass. |
| INV-07 | Original `/i/…` URL can recapture a token; browser/service handoff covered. | Physical messaging/browser and other-device handoff. |

This map is deliberately not an assertion that all 19 rows are fully accepted.
The implementation/CI release evidence and physical acceptance record must be
reported separately. No reward/attribution system was found or introduced in this
repair's invitation scope.
