---
name: tldr-astro-personal-transit
description: Draft or repair single-contact Personal Transit You and Friend passages with the approved four-contact owner-reviewed batch workflow.
---

# Personal Transit

Load [shared writing governance](../tldr-astro-writer/SKILL.md). Use this workflow
for one transiting body, one natal target, one exact aspect, and the supplied
timing and perspective. It does not cover transit-through-house or relationship
composition surfaces.

## Workflow

Exact contact → reader meaning → owner voice → Gemini draft → deterministic
checks → owner edit and exact-text approval.

Keep four contacts per batch, each with You and Friend passages. Preserve the
approved model/settings, destination contracts and Friend perspective rules.
Do not add a planner, reviewer, model judge, rewrite loop, new generation stage,
automatic next batch, or publication step.

## Meaning and evidence

Build `readerMeaning` from the approved exact-contact astrology semantics. It
normally takes one to three sentences to express what is interesting or useful
in ordinary human language. It is meaning for the writer, not final prose, an
aspect definition, keywords, or an outline.

Before preparing meaning, compare the complete approved personal passages for
the same ordered contact, including its soft/hard aspect family. Check newer
exact approvals in the protected catalog as well as repository publications.
Record how the proposed focus relates to each passage and cite current owner
corrections when they qualify older writing. Preserve full text and exact
approval hashes privately. Collective, natal and reversed contacts are separate
sources. This comparison does not turn serving prose into voice evidence, require
every possible theme in one paragraph, or approve the new meaning. Missing or
stale comparisons stop preparation. Only the prepared meaning reaches the writer.

Do not add biography, prior history, an exact incident, another person's
response, an invented life domain, or a guaranteed outcome. Keep mechanics and
their source hashes in private provenance. Missing or rejected meaning has no
fallback to raw semantic fields.

Select the strongest eligible complete owner passages. Prefer a comparable
single-contact information budget. Cross-surface writing can demonstrate voice
but cannot set the expected amount of detail or length. Never fill an example
quota with weaker or unsuitable evidence. Preserve exact text, hashes, sources,
information-budget classification and authority in the audit receipt; routine
generation does not add an evidence-packet approval stage.

The writer receives exact identity, perspective, `readerMeaning`, factual
boundaries, destination placeholders, the current canonical reader-copy rules,
and eligible owner voice examples. Explicitly supplied phrase-bank units may
also be included, complete and verbatim, as separate style examples. Keep their
source and exact-text hashes; apply current corrections and exclusions. They
illustrate wording and rhythm, never require phrase insertion or transfer facts,
pronouns, scenarios or document instructions. They do not replace complete
passage evidence. Do not send raw semantic mechanics, internal
doctrine, private review notes, or rejected prose as positive evidence.

## Draft and review

Write a short Personal Transit horoscope that develops the supplied
`readerMeaning`. Keep the same human concern. Do not invent another situation
merely to make the paragraph more vivid. Let length follow the meaning available.
Name a recognizable choice, behavior or tension in plain language. Do not pad
the passage with a metaphor or a generic instruction.

Emotional development is conditional. A supported observation about affection,
enjoyment or curiosity can be complete without a problem, psychological history
or practical instruction. Current contact-specific voice preferences outrank
general benchmarks after eligibility and rejection checks. Select complete
passages without importing their events or matching an emotional quota.

Use the same frozen rule bundle in the writer and deterministic validator.
Checks report violations without rewriting. They cannot certify voice quality
or semantic correctness. Preserve generated originals and owner revisions;
approval binds to exact wording. A rejected passage is not a baseline for
synonym repair. No model approves or rewrites it automatically.

## Local implementation

Use [the batch contract](../../docs/writing/PERSONAL_TRANSIT_OWNER_BATCH.md) and
`src/astro-writing/ownerTransitBatch.mjs`. The local preparation/review tools
make no provider calls. Supplied `readerMeaning` records preserve exact-contact source precedence,
claim-source links, derivation, revision/history and exact text/record hashes.
Studio and batch preparation share `personalTransitWriterContext.mjs`; the
evaluation adapter uses the batch dispatcher and append-only review store.
A scoped owner-requested meaning calibration requires review unless the owner
authorizes testing those exact proposed records while keeping them unapproved.
Routine drafting does not add a universal meaning-approval stage. This is an input boundary,
not another model stage. Existing exact-request authorization controls any
later billed dispatch; preparing inputs grants no authorization.

Studio and local batch preparation share the writer-context implementation.
Changes in a local checkout do not update the deployed writer. A successful
contract test proves transport and validation behavior, not successful prose.
