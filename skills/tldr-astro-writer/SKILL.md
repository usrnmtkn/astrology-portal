---
name: tldr-astro-writer
description: Canonical TLDR Astro argument-gated drafting and deterministic validation pipeline.
---

# TLDR Astro writer

Use this skill for every astrology-writing task in this repository.

## Global owner-vocabulary rule

This rule applies to every reader-facing astrology draft, rewrite, revision,
example, and chat response on every surface. Semantic sources determine what
the astrology means. Owner-authored writing determines the vocabulary,
sentence movement, examples, and tone.

Before writing, retrieve the closest owner-authored passages for the exact
topic and register and use the owner corpus as the positive language source,
not merely as inspiration or a final style check. Do not draft directly from
semantic components, compact operations, doctrine labels, or internal planning
language.

Before showing prose to the owner:

- flag content words that are absent from or unusually rare in the owner
  corpus, except necessary astrology terms and ordinary function words;
- replace unsupported wording with plainer corpus-supported language, or flag
  the unresolved choice for owner review instead of guessing;
- apply the durable correction ledger so a rejected word, construction, or
  substitution is not repeated in a later draft; and
- run the surface register, phrase-bank, do-not-use, and owner-correction
  checks.

An invented synonym is not a correction. When the owner rejects a word or
construction, record the correction with its context and use the owner’s
documented replacement or the plainest supported wording. Do not deliver prose
that is known to fail this rule.

### Chat-output fail-closed gate

Reader-facing astrology prose written in chat is not exempt from the governed
pipeline. Before drafting, create an evidence receipt containing:

1. the rendered surface and its register;
2. the semantic sources used for meaning;
3. at least three exact owner-authored passages chosen for the same surface or
   the closest valid register, with their source paths;
4. the owner-correction pairs relevant to the likely failure modes; and
5. the active do-not-use list.

Show the selected owner passages to the owner before or immediately alongside
the draft. A hidden claim that the corpus was checked is not evidence. If the
receipt cannot be built, return `failed-retrieval` and do not draft.

Vocabulary compliance is necessary but never sufficient. A draft fails when
it uses corpus words inside generic assistant scaffolding, flattens the owner's
sentence movement, or paraphrases semantic components directly into prose.
Before delivery, compare the draft's opening, turns, sentence lengths, and
ending movement with the selected owner passages. If the comparison cannot
name the specific owner evidence shaping those choices, do not show the draft.

When the owner says a draft does not sound like her, mark that complete draft
as rejected evidence. Do not synonym-swap or improvise another version. Return
to retrieval, show a corrected evidence receipt, and rebuild from the owner's
actual language and movement.

Before drafting or editing, read these files completely:

1. `../../docs/writing/ASTROLOGY_CONTRACT.md`
2. `../../docs/writing/VOICE_CONTRACT.md`
3. `../../docs/writing/LITERAL_LANGUAGE_RULES.md`
4. `../../docs/writing/BANNED_PATTERNS.md`
5. `../../docs/writing/REVIEW_RUBRIC.md`
6. `../../docs/writing/OWNER_CORRECTIONS.md`
7. `../../docs/writing/SHARED_EVIDENCE_STANDARD.md`

Use `../../src/astro-writing/runWritingPipeline.mjs` for generated prose. Its order is binding:

1. build the astrology meaning plan;
2. build the ten-line argument core plus eight required Sky Placement spine-quality intentions (and four slow-mover additions when applicable), then stop for exact owner approval;
3. require the target content family's recorded structural spine;
4. build the shared five-role packet: exact planet-sign matrix meaning; at least three exact
   owner-authored register passages plus the configured register-gold page; same-planet-sign
   scene evidence in house-core, approved-serving, then matrix order; the current approved
   article as argument-and-close evidence only; five to ten thematically relevant owner-authored
   AVAILABLE LINES from the voice-bank and governed phrasebank index; and six to ten relevant
   owner before/after pairs;
   load matrix evidence from `../../data/writing/matrix-evidence-index/`, keep meaning, scene,
   and argument-candidate lanes separate, filter to the exact planet-sign and relevant event,
   and deduplicate repeated copy by `copy_sha` under governance precedence;
5. draft from the approved argument, the spine, and governed astrology;
6. run deterministic validation;
7. return the prose to the owner for judgment.

Spine slots are semantic checks, not reader-copy templates. Their labels must not become
sentences that announce `the job of`, `this is a period for`, or `the collective lesson is`.
The prose must carry the content without narrating its own structure. Deterministic validation
reports negation-pivot counts per page and per set as advisory pattern evidence; the counts do
not block or rewrite copy.

Structural presence is not completion. Apply the unified eight-element Sky Placement article
spine in `../../docs/writing/ASTROLOGY_CONTRACT.md`; slow movers add era frame, recurrence,
conditional older analogs, and collective lesson between strategy and close. Every element is
required; any failed element returns
`spine-quality-incomplete`; do not mark or present that draft as pipeline-ready. Never rewrite
an element automatically, and never exempt an inherited close because it was approved under an
older standard.

No model prose gate is permitted. Prose judgment is an owner gate, permanently. A model may not
approve, block, revise, stage, promote, or serve prose. Read `../../docs/writing/WRITING_PIPELINE_V3.md`
for the binding v3 architecture.

Resolve active prompt and validation rules through
`../../config/writing-effective-rules-v1.json`. The writing documents preserve historical
rulings; do not concatenate them into a model prompt. Only the active rules for the requested
surface may be sent. Machine blocking is limited to factual safety, grammar, placeholder
integrity, source licensing, register direction, and unsupported astrology claims. All other
voice and form signals remain visible but advisory to the owner.

Owner ruling, 2026-08-13, verbatim: "if the article does not go through both the writing-pipeline
and the satori voice, fail the article and rewrite." An empty or below-floor positive evidence
pool, or an unmapped family label, must return `failed-retrieval` before any writer call. Preserve
the result only as a diagnostic artifact; never edit it into a candidate or use it as a baseline.

Approved same-planet-sign house cores are the primary scene bank for a placement article,
followed by approved serving rows and then matrix scene rows. If approved same-placement scene
evidence exists and none reaches the packet, return `failed-retrieval` before any writer call.
Scene evidence demonstrates observable objects, actions, costs, and follow-up work; it is never
relabeled as register evidence and never licenses a house claim in houseless copy.

Never infer owner approval. Generated or refined prose remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until the owner explicitly approves the exact wording.

Never make a billed model call without explicit authorization for that call or batch.
