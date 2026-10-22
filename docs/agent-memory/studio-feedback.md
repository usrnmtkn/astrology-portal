# Studio correction memory

## Supported workflow

The first feedback loop covers edits to the body of saved, reusable Sky placement
and aspect cards (`sky.placement.base.*`, `sky.aspect.*`, feed mode, no target date).
The database captures the complete original and replacement, key/family, source
row, and exact saved versions in the same transaction as each edit. A failed or
stale save creates no memory. Initial generation from an empty row is not an edit.
There is no historical backfill or inferred reason. Blank-body card edits and
card headlines/summaries remain outside capture.

Long-form Sky articles also capture complete reader-field documents for
`sky-article/{planet}/{sign}/{year}` and `fallback-hook/sky-sign-copy/{planet}/{sign}`.
Compiled editions retain headline, TL;DR, body, and each complete house/aspect
passage. Writer packets identify changed fields and distinguish unchanged context
from rejected wording. Legacy article sources retain their named narrative sections and draft
overlays, excluding internal metadata. The first edit of a published compiled
edition is captured when its revision row is created, using the stored target as
the original. Publication itself creates no duplicate correction. New imports,
initial article generation, template instructions, and historical content are not
turned into corrections.

Article corrections start passage-specific. Their only broader scope is
**Long-form Sky articles**, requiring an explicit reason; card-wide guidance does
not apply to articles or vice versa. Revision keys resolve to their original
edition key. Legacy package keys remain distinct: evidence for one legacy passage
is not automatically applied to an edition for another key/year. Broader reuse
requires the owner's family decision. The current saved reader fields must match
the reviewed replacement before activation. For a published edition's revision,
that check reads the original edition after its existing publication workflow.
Unpublished package drafts cannot become active memory.

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

Active corrections are read in one database snapshot before an explicit Sky card
draft or unfinished article-field generation. Card corrections share the existing eight-record budget and conflict gate with
repository corrections. Article corrections use a separate eight-record budget
and conflict gate, selected using the server-calculated edition identity; the
existing canonical article examples and knowledge gates remain in place. Contradictory replacements are excluded, not resolved by
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

### Explicit owner rejections across writing surfaces

The separate `studio_writing_feedback` store preserves complete rejected passages,
the owner's exact reason, explicit target keys and actual `thread:<UUID>`
provenance. Its existing `20260914150654_studio_explicit_writing_feedback.sql`
migration must be installed. This does not change the pending-edit activation
workflow above or infer approval of a replacement.

`scripts/studio-writing-feedback.mjs` records a rejection from a protected JSON
file, exports active records for one target, or retires an exact version through
the existing idempotent RPCs. Run `--help` for commands. Record input fields are
`requestId` (fresh UUID), `targetKeys`, `rejectedText`, `ownerReason`, `sourceUri`
(actual owner thread) and `sourceDate`. Retire input fields are `requestId`, `id`,
`version`, `reason` and `sourceUri`. Use a protected environment file containing
the server-role credentials. Never put these files or feedback bodies in Git.
The CLI does not record source-role assignments or approve reader prose.

Supported explicit scopes are `writing/all`, `writing/sky`, `writing/synastry`,
`writing/composite`, `writing/relationship`, `writing/personal-transit`, and each
`horoscope/{daily,weekly,monthly,seasonal}` period. A safe exact content key can
also be selected. Legacy content keys containing pipes cannot be explicit targets
under the database contract. Broader guidance still requires the owner's express
scope decision; an ordinary rejection never becomes global automatically.

Reusable Synastry library family requests also retrieve their own exact-member
corrections: `hard` includes square/opposition and `soft` includes trine/sextile.
Each complete record retains its original target and the request explicitly
limits its use to overlapping meaning supported for every family member. This
does not make an exact square request inherit opposition feedback, reverse a
planet-pair key, extend guidance to another surface or change stored scopes.
Proposed replacements in rejection reasons remain correction evidence, never
automatically approved positive voice examples.

With `STUDIO_MEMORY_FEEDBACK_ENABLED=true`, fresh shared writer, template-slot,
Sky Placement and horoscope requests read the existing private snapshot. Lunar
writing merges these applicable scopes with its existing exact-target feedback.
Report contracts retain their existing path. Unavailable or incomplete storage
stops new generation before a provider call. More than 100 selected records or
1 MiB of selected text requires maintenance, without truncating passages.

Horoscope plans include selected IDs, versions and hashes. A changed correction
invalidates a fresh plan. Saved Daily, Weekly and Monthly request snapshots carry
a stable reference; dispatch resolves the exact private source and verifies its
immutable hash. JSONB field ordering does not change that reference. Retirement
affects future plans, while a reserved Monthly request retains its original
correction. Seasonal runs retain their frozen correction in the existing private
run store. Shared prompt shadows and edition rows contain no feedback bodies.

Feedback identity normalizes SQL and JSON timestamp syntax before hashing
`source_date`, retaining fractional-second precision. Equivalent timestamp
spellings cannot invalidate a new horoscope plan or saved-request recovery;
different instants, wording, reasons and target scopes still change identity.
The resolver also verifies legacy v1 hashes against equivalent SQL/JSON spellings
of that same source instant. It never drops the timestamp from the hash or edits
stored feedback. Seasonal rejection provenance uses the same normalization for
new evidence manifests; existing frozen requests and manifests remain intact.

The October 22 audit traced explicit-feedback use through shared OpenAI/Claude
generation, Sky slots and placements, lunar writing, all four horoscope periods,
and saved Daily/Weekly/Monthly hydration. Report feedback has its own contract;
the separate Sky edit-capture hash already normalizes its source-version dates.
Regressions reproduce the SQL/JSON mismatch, check actual horoscope handlers and
Monthly continuation, preserve legacy references, and reject real source changes.
These are integrity checks with isolated fixtures, not paid prose comparisons.

The actual-handler and intercepted-provider regressions verify all four horoscope
periods, Synastry, Personal Transit and Sky template delivery, scope isolation,
storage failures and saved-request recovery. These checks establish delivery,
not literary quality. A fresh prose comparison still requires owner review.

## Existing capture-store privacy and rollout

`studio_memory_feedback` and `studio_memory_feedback_decisions` have RLS enabled,
no PUBLIC/anon/authenticated grants, and only server-role access. RPCs are security
invoker with explicitly restricted execution. The API checks Content Studio owner
access. Never place correction text in Git, static exports, logs, chat notes, or
browser storage. Personal reports and birth data are not ingested by this workflow.

The initial migration creates the card capture trigger. The additive
`20260911212849_studio_article_memory_feedback.sql` migration extends capture and
review to article fields without changing existing evidence or approvals. Deploy it before setting
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

Production database verification (2026-09-11): migration version
`20260911152710` is installed. Both tables have RLS enabled, visitor/member
table and RPC access is denied, and the active snapshot initially contained zero
corrections. Database advisors added only the expected informational no-policy
notices for these server-only tables; existing warnings were unchanged.

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
- Future work: additional edit-capture families, explicit supersession
  links, privacy-safe live recall for coding agents, and
  owner-approved expansion to additional writer families. Explicit-rejection
  consumers are listed above; do not infer edit capture for those families.

Agent maintenance follows `AGENTS.md`: record source/version coverage and dated
technology checks, preserve pinned renderer behavior, and keep local notes distinct
from approved records. Neither this guide nor an ordinary task creates a background
schedule or permission to change reader writing.

## Article verification

`test:content-studio-api` also exercises the actual compiled-article save and
approval handlers against PostgreSQL correction capture, full structured fields,
first published revisions, scope separation, receipts, retirement and access
denial. The real article generator is tested with intercepted OpenAI/Claude
responses: approved evidence reaches both prompts, and memory outages stop before
provider requests. Browser coverage uses isolated storage and synthetic prose at
390px/1440px in light/dark themes. No test publishes production writing or incurs
model charges.

Supabase documentation review (2026-09-11): current changelog and database
function/RLS guidance were checked. This change uses existing security-invoker
functions and restricted server-role grants; no dependency upgrade or new paid
service is required. The listed changes to logs, extensions, Realtime, and
self-hosted gateways do not affect this migration.
References: https://supabase.com/changelog,
https://supabase.com/docs/guides/database/functions,
https://supabase.com/docs/guides/database/postgres/row-level-security.

Production schema verification (2026-09-11): article migration version
`20260911212849` is installed; the capture trigger is present, visitor/member
access remains denied, and server-role execution is available. No existing
corrections were activated by the migration. Application release verification
remains a separate gate.
