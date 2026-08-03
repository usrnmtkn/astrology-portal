# Marie Satori writer environment audit

Date: August 2, 2026

## Outcome

Before this change, the repository contained a substantial owner corpus, a vocabulary bank, surface rules, deterministic lint, and a calibrated Sky Placement judge. It did not contain one durable workflow that selected the best governed evidence, performed an authorship rewrite, and captured future owner edits without confusing preference with approval.

The missing capability was context selection and workflow ownership, not access to writing samples.

## What Codex loaded

Repository `AGENTS.md` instructions are part of the working environment. They previously required factual and content-management safety, but did not route writing tasks through a dedicated Marie Satori process.

The following material was available only after a task or agent explicitly opened it:

- the 47-article owner corpus and its cohort manifest;
- active owner-published long-form fixtures;
- the owner vocabulary bank and style report;
- review bundles, owner corrections, and preserved candidates;
- the Sky Placement surface contract and linter;
- the editorial model registry and judge calibration fixtures.

Large corpus availability did not guarantee that the strongest five excerpts entered the writing context. General repository context could therefore contain many rules while missing the closest owner paragraph and the exact before/after correction.

## Existing writer and judge behavior

The Sky Placement judge already had a separate governed lane. Its active release was Terra-low and its score meant editorial acceptability, not maximum writing quality.

The existing placement generator assembled facts, rules, and vocabulary. Its positive full-example selector required active, canonical, owner-approved Current Sky material. At audit time, that selector returned no eligible examples. This was safe against unapproved AI leakage, but left the generator without positive full-form voice evidence.

The judge could see the exact-approved Uranus-in-Cancer v3 calibration example. That record was intentionally calibration-only. It was not authorized for generation and remains excluded from writer evidence.

Writer and judge were operationally different, but there was no dedicated repository writer lane, writing skill, authorship gate, or writer-quality evaluation.

## Provenance and correction memory

Owner-authored, approved, historical, rejected, unapproved AI, and third-party material existed in several locations with different local schemas. There was no single excerpt-level authority index.

Owner corrections were preserved across review artifacts and conversation-derived records, but not consistently represented as structured before/after examples with surface, beat, reason, and approval level. That made the final correction harder to retrieve than the larger body of merely related writing.

## Flattening risks

The audit found four causes of polished-but-flat output:

1. Positive evidence was absent from the existing Current Sky generator context.
2. A large corpus had no task-specific retrieval compiler, so nearby but unhelpful examples could crowd out the closest correction.
3. Lint and Terra could confirm acceptability without asking whether every sentence sounded observed rather than composed.
4. Review feedback did not automatically become governed contrastive memory, so the owner had to repeat the same distinction.

## Authority safety

Unapproved AI candidates were not deliberately configured as positive examples in the existing generator. The new index makes that invariant testable at excerpt level.

Only these classes may set `useAsPositiveVoiceEvidence: true`:

- `owner_authored_final`;
- `exact_owner_approved`.

Even an exact-approved record can be barred from writing use when its provenance is calibration-only. Uranus-in-Cancer v3 exercises this exception.

Third-party sources remain knowledge or vocabulary context and never Marie Satori voice evidence. AC continues to be labeled `AC` where sourced.

## Governance conclusion

A judge score of 3 must not be represented as owner approval, canonical status, production promotion, or proof that a sentence is the strongest available writing. The durable fix is the writer workflow documented in `MARIE-SATORI-WRITER-IMPLEMENTATION-2026-08-02.md`.
