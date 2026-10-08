# Horoscope generation recovery

Date: 2026-09-27. Base: `c9a796804`.

The owner reported a paused horoscope batch and then a stale “edition changed”
error beside twelve completed readings. The client caught a version conflict,
loaded the newer row, and still displayed the original error. It also left the
editor on Generate and could ask for a writing plan after every reading was ready.

## Behavior

### Complete documents during recovery

Generation returns the complete stored row. Recovery now reads the same shape
through `generated-content?horoscopeEditions=true&id=...`, restricted to one
horoscope edition. The generic content-detail endpoint deliberately projects a
subset of storage columns; using it for an exact recovery comparison made a
provider checkpoint look like an unrelated edit and stopped an approved batch.
The comparison remains strict. This repair does not ignore changed owner text,
instructions, facts, review state, or unknown storage fields.

The actual-handler fixture honors storage column projection and includes
nullable storage metadata. API coverage proves the former detail response
fails the comparison and the scoped complete response preserves it through
writer, review and save transitions. Browser coverage exercises that same
projection during lost acknowledgements and all twelve sign transitions.

### Weekly batch continuation

An explicitly approved Weekly batch continues through all remaining available
signs, including after **Retry [sign] and continue**. The displayed cost covers
every remaining reading. This Weekly behavior supersedes single-sign retry for
Weekly only; Daily, Monthly and Seasonal retry scopes are unchanged.

Within that approval, manual/focus progress checks join the running loop instead
of cancelling it. A transient connection failure reconciles the exact saved
operation, draft review or completed candidate before continuing. Newer owner
edits, changed facts, instructions, model or rejection history invalidate this
continuation. An unchanged row never permits replaying an unconfirmed paid POST.
An unchanged ready prose check is the narrow exception: it has no response ID
or request hash, and its version and complete candidate remain identical.
Its conditional ready-to-starting save must succeed before any reviewer call.
After a transient storage timeout, the client may retry that reservation; two
concurrent handlers reading the same version produce one dispatch and one
conflict. A running, uncertain, failed or released request is never restarted.
The actual-handler regression injects an initial storage timeout and races both
reservations; desktop/light and mobile/dark browser flows inject the timeout
before completing all twelve signs with exact writer/reviewer call counts.

Polling an existing response has no 120-poll client cutoff. Ready stages proceed
immediately; unchanged pending responses wait between reads. Connection recovery
uses a bounded delay up to 30 seconds without repeating paid requests.

Explicit Pause, leaving the edition, reload, and account changes still end local
batch consent. Reopening alone cannot authorize new signs. Terminal provider
failures still need attention; this does not guarantee that an external provider
will complete every request. Existing saved text and review holds remain intact.

`horoscope-model-choice.spec.ts` covers a failed Gemini attempt followed by a
single approved retry that completes all twelve signs, 125 pending review polls,
lost review-start and review-save acknowledgements, a progress check during the
run, exact call counts, persisted text after reload, and explicit pause. It uses
the real handlers with synthetic providers and isolated storage, on desktop/light
and mobile/dark. It proves continuation, not live model availability or prose quality.

The following original recovery behavior applies outside an actively approved
Weekly batch.

### Reopening a Weekly request during its prose check

Opening or recovering an active Weekly request prepares the remaining writing
plan without dispatching a writer or reviewer. The plan approval checkbox is
available beside the saved request. Without that approval, **Resume generation**
finishes only the saved sign. With approval, **Resume remaining readings**
continues the same request and then writes the other available signs. The cost
display excludes requests already dispatched and includes an unstarted prose
check. Opening through a Content Library link remains read-only; preparing its
plan is explicit. The running ready-review message says it is starting the
approved check instead of incorrectly asking the operator to resume again.

The actual-handler regression prepares a plan during ready and running review
states and asserts an unchanged stored row, stable plan hash, and zero new model
calls. Browser regressions reopen a saved Gemini Aries draft at both states,
approve the remaining plan, complete all twelve signs, preserve the original
Aries candidate, count exactly twelve writers and twelve reviewers, and verify
persistence after reload. Explicit Pause still ends batch consent. These tests
use synthetic providers and isolated storage; they do not prove that twelve live
Gemini requests completed.

When investigating a reported stall, compare the open tab's script asset with
the current production HTML before attributing the failure to the deployed
client. Verify the writer receipt, review receipt, saved passage, active request
and next-sign dispatch independently. A completed writer and reviewer with no
next-sign dispatch is a continuation failure, not evidence of a model timeout.
Preserve detailed operational records privately. Refresh an idle stale tab only
after checking for unsaved edits and in-flight requests.

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
| Terminal failure is distinct from a stall | A newly observed failure is an alert; reopening shows collapsed Previous attempt history and leaves plan review available |

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

## Reopening historical failures after account recovery

Opening an incomplete saved edition now inspects an older generic failure while
preparing its writing plan. The operator does not need to discover **Check saved
progress** to learn why the previous attempt stopped. Current structured failure
receipts are available in collapsed **Previous attempt** history without another
provider read. Reloading does not restore a current red alert; newly observed
terminal failures still show one immediately. Credit exhaustion
is explicitly described as the previous attempt's result, not the account's
current balance. After adding credits, the operator approves the current plan
and uses **Retry [sign]** for one fresh request.

If the historical diagnostic is temporarily unavailable, Studio keeps the plan
and recovery control usable. Opening, reloading, revisiting Dates, and checking
progress never retry generation automatically or modify the failed edition.
The seasonal reference date remains September 1; its calculated window remains
the solar season containing that date.

The browser regression adds legacy saved failures in mobile/dark and
desktop/light layouts, automatic diagnosis on open, temporary diagnostic failure
and recovery, exact row preservation, unchanged reference date, and no additional
provider starts. These use the actual handlers with isolated storage and a
synthetic provider. They do not verify a replenished production balance or claim
a successful live generation.

## Leaving an interrupted browser request

The Generate step offers **Back to editions** during writing and recovery.
**Pause generation** aborts the local browser operation immediately. It leaves the
provider request and saved readings intact, invalidates plan approval, and requires
saved-state synchronization before another action. A late response from the
aborted operation cannot update the current edition. Returning to the saved
edition reads its current version before presenting the remaining signs.

While Generate is open, Studio checks an idle saved request every 30 seconds.
Returning to a visible tab also checks saved progress; a running operation is
superseded only after 15 seconds without a successful update. The periodic
watchdog waits 60 seconds for a running operation. All these checks use the
existing retrieval and version-conflict recovery path. They cannot start, release,
reject or publish a reading. Background synchronization skips unsaved edition
edits and open writing instructions.

The actual-handler browser suite covers immediate pause with a held response,
leaving and reopening the same seasonal edition, late-response isolation, focus
recovery, periodic idle recovery, exact saved copy and explicit plan approval for
remaining signs. It uses synthetic storage and an injected provider; it performs
no production generation.

## Instruction-field overflow

Voice, Structure, Sources and Prompt each support 32,000 characters, increased
from 12,000 so a complete seasonal prompt fits. The native input no longer
truncates pasted text. The editor keeps the
complete unsaved value, marks an over-limit field invalid, displays the excess
character count and prevents saving until corrected. Variable insertion likewise
preserves the whole value. Browser tests cover overflow, field switching and
recovery in all four desktop/mobile and light/dark combinations. Actual-handler
checks verify all four fields at the limit, including multibyte text beyond the
old API request size, and that a rejected save does not change the stored profile.
The request byte allowance covers all four fields even when JSON-escaped.
The complete expanded instructions reach the injected writer. A browser
regression saves and reloads a seasonal prompt longer than the old limit.
No writer model, output budget or reader passage changes are involved.

After integrating main `57f4a2ce1`, separate clean `npm ci` builds with the same
browser-workflow Supabase placeholders measure 3,501,257 aggregate web gzip bytes
on main and 3,501,832 for the feature, a 575-byte increase. Main itself exceeds
the previous aggregate limit by 7 bytes. Allocate 750 aggregate web bytes in
addition to the 1,000-byte deferred-editor and admin-aggregate allocations.
Preserve the independent House Transit allocation and all reader startup, CSS,
memory graph, forbidden-payload and other chunk limits.

### Saved-failure history release measurement

Matched isolated builds of main `65dc05837851f6d44b99fd8ff7ba0c6f293bd33c`
and the recovery-history change use the same browser-workflow environment.
The deferred Horoscope editor grows from 10,798 to 10,880 gzip bytes (+82).
Aggregate JavaScript changes from 3,520,097 to 3,520,102 bytes (+5); reader
startup including CSS changes from 513,798 to 513,797 bytes (-1). Allocate
200 bytes above the previous 10,800-byte editor cap. Startup, aggregate, CSS
and every other chunk limit remain unchanged. All 20 Monthly/recovery browser
cases pass, including fresh failures, reopen/reload history and explicit retry.
