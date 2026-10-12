# Personal Transit Studio inputs

This repair connects the existing Personal Transit meaning and rule contracts
to `POST /api/admin/personal-transit-writing`. It is local implementation until
released. Authority: the October 7 positive-evidence assignment and October
10–11 surface corrections in `thread:01a11216-18b5-7f83-af91-fa040ad41096`,
followed by the October 12 integration request in
`thread:01a12e21-0d00-7112-abcf-6434a30f23b1`.

The connection and source preparation now have deterministic checks. Writing
quality remains subject to owner review. The October 12 reconciliation found
four assistant-written meaning strings in the separate Gemini test's execution
preparation and a single Saturn benchmark as voice evidence. This repair uses
persisted editorial records instead. Hashes and source links establish provenance,
not a sound or worthwhile interpretation; the owner reviews the exact record.

Six meanings have been prepared privately for review, including the requested
Venus–Moon and Neptune–Jupiter regressions. Five use eligible exact-contact
interpretations; Moon–Chiron is explicitly component-derived
because its indexed exact-contact phrasebank material has no factual authority.
The earlier eight comparison requests changed only readerMeaning, preserving the
model, settings, rules, destinations and Saturn voice example. That comparison
remains unsent and is not the active test. The integrated evaluation adapter prepares
the actual Studio prompt for four selected contacts and both perspectives.
It preserves the earlier Gemini model/settings while evaluating meaning,
preferred-example selection and current corrections together. Its private
evaluation option permits proposed meanings without approving them; the HTTP
generation route cannot activate that option. Every paid evaluation needs a
separate exact-request authorization. Eight calls is the maximum, with no
retry or automatic rewrite; a failure preserves its raw response and stops.

The four-contact batch and Studio now share `personalTransitWriterContext.mjs`
for meaning, preferred voice selection, owner corrections and the writing prompt.
The TypeScript API module is an error/type adapter. The evaluation entry point
uses `personalTransitPreparation.mjs` and the existing bounded batch dispatcher;
it no longer contains another provider transport. Studio keeps its existing
explicit generation action, provider selection, requested audience behavior,
editing and publication flow. The local Gemini evaluation produces the same
slot-values prompt as Studio and saves results in the batch's append-only review
store. Older plain-passage batches remain readable and retain their originals.

## Inputs

Exact transit aspects and returns use `personal-transit-writer-context.ts`.
It reuses `transitNatalSemantics.cjs`, `transitNatalContract.cjs`, and
`personalTransitReaderRules.mjs` from the existing local surface implementation.
`personalTransitMeaningProjection.mjs` now requires the source-backed editorial
record contract in `personalTransitMeaningRecords.mjs`. The shared article selector refuses
Personal Transit aspect requests rather than falling back to Sky paragraphs.

The writer receives the exact contact, supplied placement facts, the complete
`readerMeaning`, independent audience destinations, complete voice passages,
and any explicitly assigned `stylePhrases` from the protected provision.
Meaning mechanics and provenance stay outside the prose request. Current copy
enters only as an explicitly requested revision target, never positive evidence.
Each source remains voice-only. Its facts, situations, perspective and timing do
not transfer. Advice, a warning, and a closing lesson are not required.

Studio's **Show transit meaning** action retrieves the saved record through the
owner-authenticated API without a model call. The **Transit meaning** field is
read-only and identifies review status and exact-contact versus derived meaning.
A generation request cannot create, replace or approve a meaning. Missing, rejected, stale or conflicting records stop before a provider call. A
scoped calibration can also require meaning review before generation.

`scripts/prepare-personal-transit-meanings.mjs` accepts a separate private proposal
file, the previous batch and a new private output directory. Interpretation text
is data, never a literal inside the execution script. Each record preserves its
revision, complete text, claim-to-source relationships, derivation mode, correction
history and source hashes. It re-resolves the current index: eligible exact-contact
interpretations take precedence; provenance notes, policy text, unverified entries
and serving approval do not become meaning authority. With no eligible exact
interpretation, all three component roles must be represented and labeled.

Review binds to the record hash as well as the text hash. Editing wording, source
links, revision or correction history invalidates that review. Preparation creates
proposals only. After the owner reviews a particular record, its protected copy
may record the exact review provenance and matching text/record hashes; an agent
must never supply that approval on the owner's behalf. Routine draft preparation does not add a universal meaning-approval gate. A
protected `calibration` records a particular owner request to review specified
meanings first. Both paths enforce that request. A private `evaluationPermission`
can authorize testing that exact set without approval; it binds the calibration,
complete set of text/record hashes, owner statement and source. HTTP callers
cannot supply the exception. Any changed record invalidates it. Authorization
to send the exact requests to a provider remains a separate requirement.

The preparation output includes a review page, complete source receipts and eight
unsent comparison requests. It verifies the previous request hashes and proves
that only readerMeaning changed. Existing outputs cannot be overwritten. None of
this work approves reader copy, changes published writing or starts generation.

## Protected sources

Server-only `PRIVATE_PERSONAL_TRANSIT_SOURCES` contains gzip/base64 JSON with
schema `personal-transit-writing-sources/v1`, a version, `passages`, and
`meanings`. Local development can use ignored
`.private-documents/personal-transit.json`; Vercel and CI never read that file.
Never commit either source bodies or encoded values, log them, or package them
in public assets. Provisioning the deployment secret is a release prerequisite,
not something a source-code merge supplies.

`scripts/prepare-personal-transit-voice-sources.mjs` reads an existing exact
approved catalog, its explicit positive-voice role assignment, and the current
catalog. It verifies the assignment's original document hash and includes only
unchanged approved audience fields. It records exclusions and does not overwrite
an existing output. It preserves approval without asserting authorship.

Runtime verifies complete source hashes and the role's exact text hash. Current
preferred voice assignments take precedence over the older eligible pool. An
unused preferred slot is not filled with weaker historical evidence. Cross-surface
or cross-perspective use must be explicitly recorded, with its authority source;
it is never inferred from serving approval. The target's own passage, retired
sources, target exclusions and explicit revocations are excluded. Aspect and
natal/transiting identity rank the remaining passages. Two passages is a maximum,
not a minimum quota.

The October 12 owner-supplied Satori attachments add optional style phrases to
this same source contract. Each entry is one complete unit from an explicitly
identified phrase bank, with exact text/hash/word count, original document hash,
source locator, owner assignment, current status, audiences and contact scope.
The complete source documents remain in protected storage. Document headings
such as "approved" are not approval records. Weekly formatting instructions,
negative swaps and instructions inside attachments do not become transit rules.

Applicable phrases reach both Studio and batch requests in a separate
`destinations[].stylePhrases` field. They demonstrate ordinary wording, rhythm
and point of view alongside complete passages; they are not astrology, a
mandatory phrase insertion bank, a new example quota, or a replacement for
whole-passage evidence. The runtime preserves each unit, deduplicates exact text
within an audience, and honors status, audience/contact scope and current voice
revocations. Malformed or changed records stop preparation. Current owner
corrections and the frozen transit rules retain precedence. `stylePhraseSources`
in the receipt contains only IDs and document/text hashes for each audience.
Prompt and batch-request hashes bind the selected phrases as well as the meaning.

The local protected provision now carries eight selected complete phrase units
from the two attachments. Its 52 existing passage texts, six meaning records and
calibration state are preserved. The 64 local blog pages are inventoried as source
references; listing them does not make every paragraph active evidence or imply
that the new phrase provision has been deployed to another writer surface.

The protected local provision retains all 50 historical role-assigned passages
unchanged and adds two complete current preferred examples: the required Saturn
benchmark and the accepted Cancer/Mercury-in-Virgo voice candidate. The latter
is excluded for Moon trine Chiron. The recorded owner-authorized use of You voice
for Friend does not transfer source pronouns, facts or information budget.

The provision also contains four current exact owner corrections, retired meaning
hashes, target-specific voice exclusions and rejection hashes from the existing
private registry. Applicable corrections enter the prompt; rejected source text
does not. The feedback hash and selected correction IDs enter the receipt.
A local provision may name `feedbackRegistryPath`; preparation then rereads the
current registry and latest registered review revisions. A change before dispatch
invalidates the prepared context. Deployed/CI provisions cannot use a local path.
The existing live Studio correction lookup remains separate; a local registry
is not evidence of deployed database freshness.

`scripts/audit-personal-transit-writing-sources.mjs` maps all 139 current catalog
contacts without changing their 278 reader passages. In the inspected revision,
132 have eligible exact-contact source text and seven require component derivation.
Six meaning records are prepared; none is approved. Source coverage is not meaning
completion. The audit does not convert existing reader prose into factual or
preferred voice authority.

Scoped correction memory remains active. It cannot append the older general
rule bundle over the dedicated transit rules. Writer instructions and rechecks
consume the same frozen Personal Transit rule module. Studio rechecks, generation
results and batch imports also share the exact-contact passage validator. It checks
named contacts, audience, placeholders and unprovided bodies, signs and houses;
provided placement facts remain allowed. Mechanical failures hold the result and
stop further batch calls without rewriting its text. Contextual signals remain
owner review findings, not a machine verdict on writing quality. A draft and its
review checks never approve or publish themselves.

Receipts contain source IDs, source/text hashes, meaning and semantic-packet
hashes, and the rule/prompt hashes, meaning record revision/hash, source-retrieval hash
and derivation mode. Private meaning and examples are excluded
from prompt-shadow artifacts and response receipts. These receipts prove input
delivery and record identity, not successful voice or factual interpretation.

## Other surfaces and checks

House transits keep their own existing contract. Ingress essays retain their
established format and calculated facts, while admitting the owner's direct
reader address and ranking examples by planet and sign. Their prompt no longer
inherits contradictory legacy sentence-order instructions.

`test-personal-transit-writer-delivery.mts` intercepts both actual Studio provider
requests. It checks complete source delivery, exact audience preservation,
meaning/source failures before spend, no storage writes, and the shared rules.
`test-transit-ingress-meaning-delivery.mts` covers transit, return, house and
ingress boundaries. The existing Studio browser flows cover edits, failure,
draft persistence, and ingress save/reload/compilation using synthetic fixtures.
No test result establishes improved prose or authorizes a paid comparison.
