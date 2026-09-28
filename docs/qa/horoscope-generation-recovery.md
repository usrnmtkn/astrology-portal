# Horoscope generation recovery

Date: 2026-09-27. Base: `c9a796804`.

The owner reported a paused horoscope batch and then a stale “edition changed”
error beside twelve completed readings. The client caught a version conflict,
loaded the newer row, and still displayed the original error. It also left the
editor on Generate and could ask for a writing plan after every reading was ready.

## Behavior

- Generate provides **Check saved progress**, including during a browser poll.
- Checking cancels only the superseded browser operation. It reads the current
  saved edition and retrieves an existing provider response by its saved ID.
  It never starts generation, releases a reservation, or publishes an edition.
- Completed editions open Review and clear obsolete errors. Partial editions
  retain their saved copy and prepare the current plan for explicit approval.
- Pending or unconfirmed requests show a neutral status. Temporary connection
  failures keep recovery available. Terminal provider failures and access errors
  remain actionable errors.
- An aborted or late browser response cannot replace recovered state. Unsaved
  edits disable recovery. Opening a saved edition fetches its current version.
- Generation, plan approval, rejection history, exact content, and publication
  rules remain governed by the existing API. No database or writer changes.

## Acceptance evidence

`tests/visual/horoscope-recovery.spec.ts` drives the rendered production bundle
against the actual admin handlers and isolated storage. Only the provider is
synthetic; these checks incur no billed generation and touch no owner rows.

| Criterion | Evidence |
| --- | --- |
| Recovery is discoverable in Generate, including during polling | Desktop/light and mobile/dark browser flow |
| A pending request stays resumable without a red error | Provider returns in-progress; same saved response ID remains |
| Recovery of the last sign opens Review | Exact twelve saved readings and unchanged DRAFT status |
| Late client responses cannot restore stale progress | Delayed poll returns after Check saved progress has finished |
| Another session completing the batch is a successful recovery | Actual handler returns stale-version conflict; current row opens Review |
| Connection failures preserve recovery | Failed poll and failed storage read, then same-request retrieval |
| Partial recovery does not generate the remaining sign | Unchecked current-plan approval and exactly one provider start |
| Existing and unsaved writing are preserved | Exact saved first eleven readings; disabled recovery while dirty |
| Saved results survive reload | Exact reopened text and storage row equality |
| Unconfirmed requests are not replayed | No response ID: reservation unchanged, one provider start |
| Terminal failure is distinct from a stall | Actual handler persists failed state; plan review remains available |

The existing horoscope reader suite also covers four viewport/theme combinations,
newer outline preservation after a conflict, draft editing, rejection history,
import, publication, and exact reader text. Test results and exact tested commits
are recorded in the pull request. Production acceptance is read-only: verify the
main deployment, existing twelve-reading edition, Check saved progress → Review,
exact text after reload, and no content writes. A fixture pass alone does not
establish production acceptance.

## Bundle allocation

Recovery remains in the deferred horoscope editor. The initial integrated web
build measured 3,493,282 aggregate JavaScript gzip bytes and 9,059 editor bytes;
standalone admin measured about 757.5 kB aggregate. Allocate 1,250 aggregate web,
1,000 editor, and 1,000 aggregate admin bytes above the previous caps for the
added request coordination and recovery controls. No dependencies, reader prose,
CSS, or reader-startup code are added. Startup, other chunks, memory graph,
forbidden-payload, and runtime-performance budgets remain unchanged.

## Terminal seasonal failure recovery

A seasonal edition can fail before its first saved sign. The formerly generic
"did not complete a usable reading" message covered response limits, refusals,
provider failures, cancellations and invalid output. Both immediate and polled
responses now use the same complete-reading parser. Each confirmed failure keeps
its operation ID, response ID, request configuration, safe status/reason codes,
usage counts and output hash in private failure history. Partial prose, prompts
and arbitrary provider error/refusal messages are not copied into diagnostics.
A successful retry clears the current error but preserves the historical receipt.
No timeout or retry limit has been increased; no prompt, model or voice rule changed.

On reopening, Studio shows the saved failure and offers **Retry [sign]** after
review of the current plan. The action makes one new paid request for that sign
and stops after saving it. It never automatically regenerates the remaining batch.
Unknown outcomes keep their existing reservation and same-request recovery.
The date field retains the signed brief's original reference date. Using an
evening solar-ingress date at local noon could otherwise select the previous
season when returning to Dates.

Regression evidence: the actual horoscope handler is exercised with immediate
and background response-limit, failure, cancellation, refusal, invalid JSON and
empty-reading fixtures. Browser recovery checks cover seasonal zero-of-twelve,
reload, unchanged selected date, plan approval, one-sign retry, complete exact
saved text and retained failure history on mobile/dark and desktop/light.
These synthetic checks do not establish the reason for a historical provider
failure or prove actual live writer success. Historical responses need authorized
provider inspection, and a new billed generation needs explicit owner action.


The owner's authorized inspection of the reported seasonal response confirmed
`status: failed`, `error.code: credit_balance_exhausted`, and no output text.
The read-only deployed diagnostic preserved the complete edition and version.
Studio now names API credit exhaustion and directs the operator to replenish the
connected API balance before retrying. Quota/billing and credential rejections
also receive specific actions, whether returned at request start or polling.
This is an account-balance failure; increasing token budgets would not resolve it.
The patch does not refill credits or authorize a fresh paid writing run.

For older generic failures, **Check saved progress** can inspect the exact stored
failed response through the authenticated server. It returns only safe diagnostics,
never the credential, prompt or provider prose, and leaves the edition unchanged.
