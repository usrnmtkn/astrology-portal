# Personal Transit owner batch authoring

Status: local batch preparation and shared Studio writer context. Owner direction, October 10, 2026,
`thread:01a11216-18b5-7f83-af91-fa040ad41096`.

The autonomous publish-untouched transit writer is closed. Personal Transit
authoring now targets owner-reviewed batches of four contacts, each with You
and Friend fields. Local preparation does not change content rows, approval
flags or deployed behavior. Studio consumes the same writer-context core;
code and private source changes require their own release to become live.

Shared governance: `skills/tldr-astro-writer/SKILL.md`. Surface workflow:
`skills/tldr-astro-personal-transit/SKILL.md`. Article argument gates, scene
requirements and evidence quotas do not apply to this surface.

## Authoring contract

Exact transit semantics → supplied `readerMeaning` → governed owner evidence → Gemini drafts → deterministic
validation → complete batch review/edit → exact-text owner approval → separate
publication workflow.

One initial request per perspective isolates the destination contracts: four
contacts produce eight requests and eight review slots. This is an owner-paced
batch, not an automatically continuing provider batch job. No planner, thesis,
human/situation outline, supported-specificity brief, sentence-function map,
reviewer, candidate tournament, automatic rewrite or fallback draft is used.

The prepared Google model is `gemini-3.8-flash`, with `thinking_level: medium`,
`max_output_tokens: 8192`, `thinking_summaries: none`, and `store: false`.
Temperature is the provider default; tools and previous interaction are absent.
The Interactions endpoint is recorded in the batch. No credential or provider
transport is loaded by these preparation/review tools.

The writer receives exact identity and timing, perspective, a plain-language
`readerMeaning` string, factual boundaries, destination placeholders, complete
eligible owner passages for voice only, and the current Personal Transit rule
bundle. Full astrology packets and meaning provenance remain private. Generic
body mythology, aspect operations, internal definitions and the old abstract
`targetSupportedHumanMeaning.facets` do not enter Gemini input.

`readerMeaning` is the complete reader-relevant meaning licensed by the exact
contact, normally one to three sentences in ordinary language. It is not final
horoscope prose, a paragraph template, keywords or a causal outline. Build it
from the approved semantics without adding biography, history, an exact incident,
another person's response, a life domain or a guaranteed outcome. The writer
develops that same concern; length follows the available meaning. Advice and a
concluding lesson are not required. A sparse contact does not need padding.

Preparation requires a supplied meaning record for each contact. Its text hash
and semantic-packet hash must match; rejected records, missing records, duplicate
targets and stale sources fail without an abstract fallback. This is deterministic
input transport, not a new meaning-generation stage or prose judge. A valid hash
proves integrity, not that an interpretation is good or semantically licensed.
No new real meanings are installed by this repair; synthetic test fixtures are
not positive writing evidence. Target row prose remains excluded.

`src/astro-writing/personalTransitReaderRules.mjs` is the single effective rule
bundle for the shared Studio and batch path. Its exact serialized JSON reaches the Gemini system
instruction; validation consumes that same frozen object. The October 11 owner
instruction makes steady, steadier, steadiness and settled hard bans for new
Personal Transit copy, alongside pleasure, bond, whether, alignment and the em
dash. Historical source occurrences confer no exception and are not rewritten.
Performance is literal-only. Quiet emotional filler, correctio, decorative
tricolon, purple prose and development quality remain contextual prohibitions.
Deterministic signals cannot establish those semantic violations or a pass.
The review desk displays the contextual rules; exact-text approval records the
owner's review and the effective rule hash. No additional model is introduced.

The separately supplied `CURRENT_TRANSIT_VOICE_GOLD` records exact owner evidence
and its authority. There is no automatic evidence selection based on publication
or a minimum example count. Prefer comparable single-contact passages; assess
cross-surface examples by information budget and prose function. Their facts,
scenarios, astrology, biography, perspective and timing never transfer, and they
do not set the expected amount of situational detail or length. Preserve any
source classification in each evidence record for audit. Routine generation does
not add an evidence-packet approval stage.

Historical artifacts do not grant voice authority. The protected source provision
can carry current explicit voice-role assignments for complete owner-authored or
owner-approved passages, independently of serving approval. Preferred sources
are selected per contact and perspective by the shared Studio core, including
recorded exclusions and authorized cross-perspective use. A weaker example is
never added to fill an unused preferred slot. Historical batches remain unchanged.

The optional `preferredContentKeys` array assigns a complete passage to exact
aspect-to-natal contacts. Eligible contact assignments take precedence over
general `preferred` benchmarks. Current status, exact hashes, target exclusion,
feedback exclusions and perspective authority still apply before selection.
An empty or absent array creates no contact preference. This is editorial
selection metadata, not approval or an inferred emotional classification.
Keep private source bodies and assignments in the protected provision.

October 12 reference reconciliation: emotional stakes, causal explanation and
advice are conditional on supported meaning and surface needs. Brief positive
observations need no invented problem. Current lexical bans and factual contracts
remain unchanged. Prompt preparation and mocked-provider tests make no paid
calls and cannot establish improved voice. Owner evaluation remains necessary.

## Prepare and inspect locally

From an isolated checkout with its own dependencies and knowledge build:

```sh
node scripts/transit-owner-batch/inspect-inputs.mjs /private/input-plan.json /private/source-inspection.json
node scripts/transit-owner-batch/prepare.mjs /private/catalog.json /private/CURRENT_TRANSIT_VOICE_GOLD.json /private/reader-meanings.json /private/input-plan.json /private/dry-run
node scripts/transit-owner-batch/server.mjs /private/preparation/batch 4177
```

Source inspection displays the exact approved component sources, aspect and
surface boundaries for the requested contacts. It creates no interpretation.
Do not label the component sources as an owner-authored exact-contact meaning.
The source material remains private and never enters the provider request.

Preparation uses an explicit input plan with exactly four selected contacts and
required regression targets. It no longer inherits Batch 001's contact list.
The October 12 repair plan includes Venus square Moon and Neptune trine Jupiter
because these prompted the reported failures. Preparing eight requests does not
start generation or an automatic subsequent batch.
It verifies each evidence source-file hash and exact passage hash, plus the
meaning file, exact meaning text and semantic-packet hashes. Preparing inputs
does not authorize dispatch or approve wording.
The meaning file has `id: "PERSONAL_TRANSIT_READER_MEANINGS"` and `records` for
the selected contacts and any additional requested calibration contacts.
Each record contains `contentKey`, `text`, `sha256`, `semanticPacketSha256`,
`source`, `basisSha256`, and `status` (`proposed-owner-review` or `owner-accepted`).
`basisSha256` binds the private source inspection, including surface boundaries.
This confirms which sources were consulted, not the accuracy of the interpretation. Accepted
records also need `review.textSha256` and an exact approval `review.source`.
These fields document provenance; they do not create a new routine approval stage.
Only `text` is transported as `readerMeaning`. Unrecognized metadata is private.

The review server starts a loopback-only review desk and prints its local capability
URL. Open that URL locally; the token moves from the fragment to session storage.
No credentials or owner passages are bundled in source assets. Batch APIs require
the capability; review writes require the same origin and JSON. No generation,
publication, filesystem-browsing or next-batch endpoint exists.

The complete batch appears together. Before generation, each slot honestly says
there is no draft; edit/approval controls remain disabled. Generated output can
later enter through `ingestRawResponse` after an independently authorized caller
has made its bounded request. This helper never makes a call. It saves raw bytes
before parsing, verifies request/model identity, records provider ID and usage,
and keeps failed responses with no fallback. The review server has no dispatch
capability. Separately authorized execution uses the bounded CLI below.

## Current feedback and requested input calibration

The input plan has schema `personal-transit-input-plan-v1`, `id`, four
`selectedContacts`, `requiredRegressionContacts`, the explicit Friend evidence
policy and an absolute `feedbackFile`. Missing regression targets fail before
requests are written. An optional `previousBatchDirectory` retains the existing
explicit batch-completion requirement before a subsequent dispatch.

The private feedback file has schema `personal-transit-feedback-v1`. It names
exact owner corrections, immutable rejection receipts, latest reviewed batch
directories and scoped evidence/input exclusions. Corrections carry exact text,
hash, source and applicable contact keys. Full rejected passages remain private;
their hashes prevent positive-evidence reuse. Exact current owner directions
reach the writer as `currentOwnerCorrections`; they do not replace the frozen
rule bundle or become invented regex bans. Rejection reasons and source versions
remain inspectable in the private preparation receipt. Source failures stop
preparation rather than silently using an empty feedback set.

Batch-directory sources are read at their latest revision on every preparation
and again before dispatch. A new rejection or correction invalidates stale
requests. This is a local feedback integration; it does not claim live Studio
retrieval. Successful preparation automatically registers its review directory
under the private registry, so later owner rejections are available to future
batches without a separate copying step. Dispatch excludes its own in-progress
batch from historical feedback; newly recorded outside feedback still stops it.

The owner's requested initial meaning review is represented by a scoped
`calibration` in the input plan: `id`, `source`, `required: true` and the requested
`contentKeys`. All requested meanings require exact owner review unless an explicit
`evaluationPermission` authorizes testing that same set while unapproved.
Acceptance binds `review.textSha256`, `review.recordSha256`, `review.calibrationId`
and `review.source`; any supplied component-basis receipt must also match.
Evaluation permission binds the calibration ID, every record and text hash,
`actor: owner`, `decision: test-proposed-keep-unapproved`, `ownerApproved: false`,
and the actual owner statement/source. It never changes record status.
Preparation can show pending inputs; dispatch requires completed review or that
exact exception. Routine plans without calibration do not acquire a universal
meaning-approval stage.

`personalTransitPreparation.mjs` is the shared file preparation entry point.
`scripts/evaluate-personal-transit-writer.mts --prepare` reads an input plan with
`catalogPath` and `sourcesPath`, creates the actual Studio slot-values prompts,
and uses the same manifest, dispatcher and review store. The older catalog/gold/
meanings CLI remains supported through that same module. The canonical meaning
contract requires saved source-backed records, including claim-source links,
exact-contact source precedence, revision/history, and text/record hashes.

Meaning retrieval also checks complete approved personal writing for the ordered
contact and its explicit aspect family. Protected `approvedPersonalWritings`
records carry full text, catalog and exact approval hashes; repository passages
retain their indexed source and field-level approval receipts. Every saved meaning
must bind an `approvedWritingComparison` to the current retrieved packet and
explain its relationship to each passage. Current corrections can qualify older
approved material without changing it. Comparison records and full source prose
stay private and never become automatic voice examples or factual approval.
Old meaning records require explicit re-preparation; there is no silent migration.

## Exact authorization and bounded dispatch

Preparation saves a manifest binding the eight request bytes, model/settings,
source files, input plan, meanings, voice evidence and current feedback. An
explicit authorization receipt must use schema
`personal-transit-explicit-authorization-v1`, `actor: owner`,
`decision: authorize-exact-batch`, the owner's exact statement and source,
`manifestSha256`, all eight `requestHashes`, exact `model`, `maximumCalls: 8`,
`callsPerRequest: 1`, zero retries/reviewer calls/rewrites, and false publication
and deployment authorization. Assistant-inferred authorization is rejected.
Preparing this receipt requires actual owner authorization; a valid JSON shape
does not establish that an owner said something.

A later explicit owner request for a new test can authorize continuation while
the previous passages remain unreviewed. The input plan keeps the actual
`previousBatchDirectory` and records `previousBatchContinuation` with the owner
statement/source, `actor: owner`, `decision: continue-without-approving-prior`,
`ownerApproved: false`, previous batch ID/revision/state hash, and next batch ID.
The dispatcher checks this permission before each request. It never modifies
the previous review or substitutes for exact authorization of the new requests.

```sh
node scripts/transit-owner-batch/dispatch.mjs --preflight /private/prepared /private/explicit-authorization.json
# Only after explicit authorization of this exact batch:
node scripts/transit-owner-batch/dispatch.mjs --dispatch-eight-once /private/prepared /private/explicit-authorization.json
```

Preflight reads no credentials and makes no requests. Dispatch uses the configured
Google endpoint and `GEMINI_API_KEY` from the invoking environment. The owner
authorization hash is saved with the execution receipt. A durable reservation
in the batch directory prevents replay, including after an uncertain failure.
The first DNS, timeout, HTTP, parsing, import or deterministic validation failure stops the batch. Receipts
distinguish reserved slots, network attempts, HTTP responses, completed
generations and unattempted requests. A timeout is delivery-unknown, never a
license to retry. No automatic next batch, fallback or model reviewer is added.

## Review, persistence and evidence

- Save edit records exact owner text as a new version and reruns deterministic
  checks. The generated original and all prior revisions remain intact.
- Approve exact saved text binds approval to its SHA-256, request, evidence,
  provider settings and explicit local owner action. Unsaved edits cannot be
  approved. A later edit or rejection invalidates current approval/eligibility.
- Reject retains the original, edits and reason. Request regeneration records
  intent only; it makes no call and does not transmit the rejected prose.
- Finish batch review requires all eight slots to be approved or rejected and
  an explicit owner action. It never schedules or generates the next batch.
- Final owner-approved text from this workflow becomes preferred current transit
  evidence. The evidence projection includes only current exact approvals, never
  drafts, rejected versions or obsolete approvals. Existing catalog eligibility
  is not retroactively upgraded.

Private append-only `revision-NNNNNN.json` files preserve complete inputs,
requests, hashes, semantic sources, originals, edits, exact approvals and events.
`raw/` preserves untouched provider response bytes and HTTP receipts. Parsed
usage is also retained in the versioned state. Files use mode 0600 and batch/raw
directories use mode 0700. Exclusive revision writes plus version/text guards
reject stale updates. Missing or corrupt state fails closed. Store this directory
outside Git and public assets; the published catalog is a separate, read-only
source for preparation.

Approval does not change canonical status or authorize publication. A later
publication implementation must use the existing guarded Content Studio writer,
separate owner publication authorization, snapshots and exact ID/version checks.
That integration is outside this preparation and has not been deployed.

## Validation and limits

Checks cover perspective, literal transit identity, required/allowed placeholders,
malformed braces, owner-banned vocabulary/punctuation, unsupported named bodies,
signs, houses, motion/degrees/dates, and the existing reader-copy boundary. They
return findings without changing text. Contextual signals flag owner review and never claim semantic approval. Regexes
cannot prove semantic correctness, biography support, grammatical quality or
voice: the owner makes those decisions. A clean machine check is not approval.

```sh
node --test tests/astro-writing/owner-transit-batch.test.mjs tests/astro-writing/personal-transit-reader-contract.test.mjs tests/astro-writing/personal-transit-reader-meaning.test.mjs tests/astro-writing/personal-transit-audit-repair.test.mjs
node tests/astro-writing/owner-transit-batch.browser.mjs /private/browser-evidence
npm run test:reader-copy-boundary
```

Browser tests use synthetic isolated stores in desktop/mobile and light/dark
states. They cover empty preparation, complete inputs, edit persistence, exact
approval, rejection/regeneration intent, approval invalidation and denied access.
They make zero provider calls and cannot establish prose quality or production
readiness. The earlier eight-call test was rejected by the owner. It is preserved
as failure evidence, not validation of this repair. Record actual-provider runs
and deployment verification separately for each release. Contract tests alone
do not establish either result or improved writing quality.

## Protected deployment source snapshots

The Studio handler also accepts a `blob:` JSON reference in the server-only
`PRIVATE_PERSONAL_TRANSIT_SOURCES` setting. The reference uses schema
`personal-transit-private-blob/v1`, a private Vercel Blob `storeId`, a
`personal-transit/<sha256>.json` pathname and the complete document SHA-256.
Upload the exact prepared source document to a private store connected to the
project before installing the reference. Never put its body in Git, public
assets or function bundles. Existing gzip provisions and local preparation
remain supported.

Only authenticated Studio requests load the snapshot. The server bounds the
download size and duration, validates its hash and schema, and caches only the
verified immutable snapshot. A missing, changed or unavailable source fails
before generation. A new snapshot requires a new hash-pinned reference and
deployment. This storage change grants no review or publication approval.
