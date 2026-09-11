# Studio correction memory

## Supported workflow

The first feedback loop covers edits to the body of saved, reusable Sky placement
and aspect cards (`sky.placement.base.*`, `sky.aspect.*`, feed mode, no target date).
The database captures the complete original and replacement, key/family, source
row, and exact saved versions in the same transaction as each edit. A failed or
stale save creates no memory. Initial generation from an empty row is not an edit.
There is no historical backfill or inferred reason. Blank-body edits, headlines,
summaries, structured package fields, and other surfaces are outside this release.

Each correction begins **pending**, scoped to its passage. In the editor's
**Memory corrections** panel, compare the wording and optionally record a reason.
After reviewing the exact replacement passage through its existing workflow,
choose **Use for future drafts**. Activating memory does not publish reader prose.
Family or all-Sky scope requires an explicit selection and explanation. No date,
model score, ordinary save, or agent instruction can widen scope or approve memory.
**Exclude from future drafts** retires the record. Each decision has a versioned,
append-only audit entry, available in **Memory decision history** (latest 100).
Competing decisions return a conflict instead of overwriting.
Retirement preserves the private history; it is not a data-erasure command.

Active corrections are read in one database snapshot before an explicit Sky draft
generation. They share the existing eight-record budget and conflict gate with
repository corrections. Contradictory replacements are excluded, not resolved by
recency. The complete source text remains intact. Receipt IDs, versions, hashes,
scope and exclusions identify what actually reached the writer, without embedding
correction bodies in reader-accessible content metadata. Rechecks preserve the
generation receipt and never run a writer. A receipt documents historical use;
retirement affects subsequent generation, not earlier drafts.

The authenticated graph combines its deployment snapshot with currently active
Studio corrections. It refreshes on returning to the window and reads live memory
for searches/details. Studio records have private database provenance and no
fabricated GitHub source URL. Pending/retired records remain in the editor's
review history, excluded from graph search and writer retrieval. Local CLI recall
still reads repository sources only; do not claim it includes live database feedback.

## Privacy and rollout

`studio_memory_feedback` and `studio_memory_feedback_decisions` have RLS enabled,
no PUBLIC/anon/authenticated grants, and only server-role access. RPCs are security
invoker with explicitly restricted execution. The API checks Content Studio owner
access. Never place correction text in Git, static exports, logs, chat notes, or
browser storage. Personal reports and birth data are not ingested by this workflow.

The migration creates the transactional capture trigger. Deploy it before setting
the server-only `STUDIO_MEMORY_FEEDBACK_ENABLED=true` in the relevant environment.
Without this flag the previous writer/graph behavior remains and review controls
are hidden. With it, private feedback is required: unavailable or malformed storage
fails generation before any paid call and reports an error instead of claiming
an empty/current memory. More than 5,000 active corrections or 4 MiB of active text requires explicit
capacity maintenance, not silent truncation.

With the flag enabled, new Sky edit history no longer appends bodies to
`source_snapshot.studioRevisionHistory`. Existing legacy metadata is unchanged.
The separate privacy/history cleanup must review existing exports, metadata,
branches and cached references; this migration does not claim to erase them.

## Verification and next milestones

- Run `npm run test:content-studio-api` (includes PostgreSQL trigger/RLS/decision
  tests and actual save-handler integration), CSS audit, and fresh-build
  `tests/visual/studio-memory-feedback.spec.ts` plus Review Queue workflows.
- Verify a reviewed synthetic correction reaches the actual writing service
  with a mocked provider, accurate receipts and no real generation charges.
- Before release, review database advisors, grants, trigger installation and RPC
  availability. Follow existing exact-head CI and main-only deployment gates.
- After release, verify unauthorized denial, owner access, live freshness, and a
  non-public synthetic roundtrip where supported. Do not publish test prose.
- Ask the owner to choose real passages for a prose-quality comparison before
  claiming better writing or extending beyond this first scope. Model assessments
  remain advisory; exact prose approval remains with the owner.
- Future work: structured-field capture for package editors, explicit supersession
  links, privacy-safe live recall for coding agents, and
  owner-approved expansion to other writer families. Do not infer these are wired.

Agent maintenance follows `AGENTS.md`: record source/version coverage and dated
technology checks, preserve pinned renderer behavior, and keep local notes distinct
from approved records. Neither this guide nor an ordinary task creates a background
schedule or permission to change reader writing.
