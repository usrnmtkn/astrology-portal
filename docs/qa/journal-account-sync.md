# Journal account synchronization

Investigation date: 2026-09-21. Implementation branch: `codex/journal-account-sync`,
based on `origin/main` revision `a05a04bce6da77dde37a4fdd368e34dd9df228d8`.
This is a local fix; no production deployment or journal-data changes were made.

## Findings

The reported account's two entries exist in `public.calendar_check_ins` and are
readable under its authenticated ownership policy. The desktop Account journal
renders both. The service saves to this shared table, rather than browser storage.
No database repair or migration is needed for these entries.

Application defects confirmed by source review and focused regressions:

- Restoring the Friends hash route overwrote an OAuth callback before the
  dynamically loaded SDK consumed it. A fresh-build browser test starting with
  callback tokens and no stored session passed for restored You but failed for
  restored Friends: no session was saved. Both pass after the startup fix.
- Ordinary sign-out used Supabase's default global scope, revoking sessions on
  other devices. See the [Supabase sign-out contract](https://supabase.com/docs/reference/javascript/auth-signout).
- Account displayed its provider as signed in using a cached profile, independently
  of the recovered account session.
- App also applied SDK `SIGNED_IN` events directly while its separate user
  verification ran. Supabase can emit that event for a restored cached session;
  a repeated regression exposed it overriding a failed verification. Non-sign-out
  auth events now request the shared verified account instead. A synthetic
  cross-tab `SIGNED_IN` regression verifies this ordering deterministically.
- The Account handle lookup ran independently of the verified account, and only
  retried when the cached profile ID changed. Session recovery for the same user
  could therefore leave its earlier sign-in error visible.
- Account journal read history only on mount, with no resume/reconnection refresh,
  polling, retry action, or subscription to the parent account identity.

Only a desktop session remained on repeated read-only production inspections.
The owner confirmed the phone shows the same account email. The supplied phone
screenshots show the production URL, the journal sign-in message, and the Account
page simultaneously claiming Google sign-in while requiring sign-in for saved
connections. This confirms inconsistent authentication UI; the displayed email
comes from a cached profile and cannot establish a live session. The precise
sequence that invalidated or failed to establish the phone session is not proven.
The reproduced callback defect and global sign-out are separate confirmed paths
to session loss, not a claim that either was observed directly on this phone.

## Changes

Startup now awaits successful SDK callback initialization and a saved session
before mounting the app or restoring routes. Normal visits retain deferred auth
loading. Transient callback failures retain the startup recovery screen. Cancelled or
terminally rejected callbacks remove their one-use credentials and reopen the
sign-in screen, retaining the bounded reader destination.
See the [SDK initialization contract](https://supabase.com/docs/reference/javascript/auth-initialize)
and [implicit-flow callback handling](https://supabase.com/docs/guides/auth/sessions/implicit-flow).

Ordinary sign-out now uses `scope: "local"`. The Account page receives the app's
verified identity and shows checking, retry, or sign-in states when needed. Its
cached profile no longer establishes signed-in status. The handle lookup waits
for that identity and reloads when it recovers; stale-account results are ignored.
You reading controls also respect the parent's verification error state.
Sign-out invalidates the parent account immediately; other SDK auth events recover
the verified identity without overriding failed checks with cached user data.

The journal is remounted for account changes. History, library reads, saves, and
label mutations carry the expected account ID. Obsolete reads are cancelled.
An unauthenticated or failed load never appears as a successful empty journal.

History refreshes when the page resumes, gains focus, or reconnects, and every
30 seconds while visible. Readers can also refresh or retry manually. Refreshing
pauses during editing so that remote activity cannot reset an unsaved draft.
Closing the editor reloads current account history.

## Verification

The focused browser regressions use actual application assets from a fresh
production build with isolated synthetic auth and database transports. Callback
tests use the real Supabase SDK and begin without a stored session. They restore
You and Friends, open Account and Journal, then submit an AI reading request with
the same bearer session. Further cases exercise slow/failed callback verification,
retry, expired-session refresh, and recovery of Account's handle lookup. Report
requests are intercepted; no live AI generation or purchase occurs. Two
separate browser contexts share only a simulated account database, proving the
client does not depend on shared local storage. They cover desktop-to-phone save,
phone-to-desktop edit, reload, page resumption, reconnect, retry, draft preservation,
and the outgoing local sign-out request. They are not physical-device or live
production write tests.

Run the Chrome regressions with:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4197 npx playwright test \
  tests/visual/client-facing-user-flows.spec.ts \
  --grep 'auth callback|account session|journal sync|signed-in user can open Account journal' --workers=1
```

The same cases were also exercised using Playwright WebKit with its iPhone 13
device profile. Supporting checks cover journal storage ownership, pagination,
grouping, Account rendering, TypeScript, CSS consistency, bundle budgets, and the
unfiltered Content Studio API contract.

Initial narrow-fix results: 26 browser cases passed across Chrome and iPhone WebKit,
including the deterministic cached-session event regression. TypeScript, Account
rendering, journal storage/grouping, report session boundaries, startup/profile
performance contracts, CSS audit, bundle budgets, and the unfiltered API suite
passed. Source privacy scanning covered 10,450 files; built-asset scanning covered
309 files. Callback-only code is dynamically loaded, preserving normal startup
bundle limits. These initial results preceded the broader execution below.

Production acceptance still requires deployment from main and confirmation that
one sign-in on the physical phone grants access to its existing entries and AI
readings without further sign-in prompts. No private journal text, email address, or account identifier
is retained in these fixtures or this note.

## Broader execution, 2026-09-21

The owner authorized execution after reviewing the broader plan. The candidate
also binds invitation previews/claims to the verified account and exact token,
clears stale report notifications/library/delivery on account transitions, carries
bounded same-origin return paths across OAuth, and preserves Journal as an
addressable Account subview. Account export now fails visibly if journal export
fails. Export/erase/delete and report state/sharing operations check the initiating
owner. Same-account journal drafts survive temporary verification failure.

Profile bootstrap no longer applies a different account's cached profile to a new
identity, or sweeps every local chart bucket into that account. Existing local
buckets remain intact. Only the verified account and the legacy ID returned by
its own server-persisted profile are eligible for automatic migration.

The earlier 38-case expanded browser run passed in Chrome and iPhone WebKit. The
final selected suite additionally covers invitations and Reports UI/deletion;
run `npm run qa:auth-access` for the current suite. `npm run test:auth-access`
executes service race tests and actual report/account HTTP handlers with isolated
external transports. Browser mocks are not database authorization evidence.
The social CI job now runs invitation rejection/replay and concurrent-claim tests
in its freshly migrated disposable database. Both social-security and report
library workflows now run before merge.

Baseline production metadata was verified read-only: main commit
`a05a04bce6da77dde37a4fdd368e34dd9df228d8`, deployment READY. Auth and journal
migrations are present on the configured live project. Vercel lists production
browser URL/key, server URL/service key, and OAuth redirect variables, but marks
their values sensitive and does not return them. Server/browser issuer alignment
therefore remains unverified; no environment precedence or secret was changed.
A listing's blank redacted value does not mean an absent configuration.

Exact candidate SHA, CI runs and release deployment belong in the PR evidence.
Physical iPhone sign-in, real message-to-browser invitation handoff and live
billable generation remain explicit acceptance steps. No claim is made that
Playwright emulation completes those steps or proves the original phone failure's
exact cause.
