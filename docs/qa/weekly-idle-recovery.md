# Weekly idle recovery and rejection transport

An idle Weekly tab previously stopped synchronizing when no provider request was
active. Holds released elsewhere stayed on screen, disabled generation and
produced a version conflict when the owner tried to release or reject them.
The database could be correct while the owner's existing tab remained blocked.

The Generate step now checks the saved version while visible and on return.
Unchanged versions retain plan approval; changed versions reload the complete
edition and require approval of the current plan. Unsaved edits are preserved.
A conflicting Release, Reject or model choice reconciles the current version
without replaying that mutation or dispatching a provider request.

Weekly rejection and preparation also use the service-only checkpoint RPC.
Unchanged evidence stays in storage instead of being sent again in a full-row
PATCH. Rejection appends the exact original, refreshes calculated facts when
rejecting all, and clears review metadata atomically. The function cannot approve
or publish copy. Apply `20261010042007_weekly_rejection_checkpoint.sql` before
deploying the API change; the existing checkpoint signature remains compatible.

## Acceptance evidence

Run from an isolated checkout with its own dependencies and a fresh web build:

- `npm run test:content-studio-api`: real handlers with isolated storage, signed
  facts, exact history, lost rejection acknowledgement, concurrent-edit protection,
  and real PostgreSQL checkpoint SQL with more than 17 MB of retained history.
- `npx playwright test tests/visual/horoscope-recovery.spec.ts`: stale idle/focus
  recovery, Release/Reject conflicts, preserved approval on unchanged versions,
  unsaved edits, interrupted requests and existing review flows.
- `npx playwright test tests/visual/horoscope-model-choice.spec.ts`: model-choice
  conflicts, all twelve synthetic Gemini results, long reviews and lost responses.
- Admin/web typechecks, CSS audit, staged privacy and built-asset privacy checks.

Production verification must identify the deployed main commit, inspect the
owner's actual tab after reload, and compare its saved edition with protected
before/after evidence. Browser fixtures substitute storage and model responses;
they do not prove a paid twelve-sign Gemini run or prose quality. Do not publish,
discard saved writing, or incur paid calls merely to verify this repair.
