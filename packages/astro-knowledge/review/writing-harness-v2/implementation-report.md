# Writing harness v2 implementation report

Date: 2026-08-09

This report follows the seventeen-item reporting contract in `CODEX-MASTER-PROMPT.md`.

## 1. Exact files created or modified

Created:

- `data/writing/owner-corrections.jsonl`
- `data/writing/owner-approved-examples.jsonl`
- `data/writing/negative-regression-fixtures.jsonl`
- `docs/writing/BANNED_LANGUAGE.md`
- `docs/writing/CONCRETENESS_CONTRACT.md`
- `docs/writing/EDITORIAL-GATE-REVIEWER-PROMPT.md`
- `docs/writing/FAILURE_TAXONOMY.md`
- `docs/writing/OWNER_APPROVAL_GOVERNANCE.md`
- `docs/writing/SOURCE_GOVERNANCE.md`
- `packages/astro-knowledge/review/writing-harness-v2/*`
- `src/astro-writing/approvalGovernance.mjs`
- `src/astro-writing/generationMetadata.mjs`
- `src/astro-writing/openAIResponses.cjs`
- `src/astro-writing/openAIResponses.cjs.d.ts`
- `src/astro-writing/resolveAstrology.mjs`
- `src/astro-writing/sourceGovernance.mjs`
- `src/astro-writing/verticalSliceEval.mjs`
- `src/astro-writing/writerRegistry.mjs`

Modified:

- `api/_lib/content-generation.ts`
- the seven existing OpenAI prose scripts under `packages/astro-knowledge/scripts/`
- `scripts/build-writing-harness-instructions.mjs`
- `scripts/run-astro-writing-evals.mjs`
- `scripts/run-astro-writing-harness.mjs`
- the existing modules under `src/astro-writing/`
- `tests/astro-writing/harness.test.mjs`

The final Git diff is the authoritative complete list.

## 2. Existing generation paths discovered

Eight OpenAI Responses call sites generated, revised, or judged astrology prose: the application content generator, sky-aspect generator, Daily Glance judge, Daily Glance judged writer, Daily Glance pilot writer, Sky Placement judge evaluation, Sky Placement writer sample, and the general writing-harness CLI.

## 3. API calls routed through the harness

All eight now call `src/astro-writing/openAIResponses.cjs`. A repository scan finds the OpenAI Responses endpoint only inside that wrapper. It rejects caller-supplied `instructions` and `previous_response_id`, then loads the canonical instruction set on every request according to the explicit role `MEANING_PLANNER`, `WRITER`, `REVIEWER`, or `REVISER`.

## 4. Meaning-plan schema

The strict plan includes `content_type`, `object`, `sign`, `house`, `event_type`, `object_function`, `sign_mechanics`, `actual_house_domain`, `core_tension`, `what_changes`, `constructive_expression`, `overcorrection`, `observable_behaviors`, `possible_consequences`, `allowed_life_domain_examples`, `do_not_assume`, `house_bleed_risks`, `stock_trope_risks`, and `unearned_motives`. Application prose generation runs this structured planner before drafting.

## 5. Writer instruction source

The writer loads `canonicalAstrologyWritingInstructions`, derived from the owner doctrine, canonical horoscope template, phrasebank writing standard, and Marie voice bank. The same generated CommonJS instruction module serves script call sites.

## 6. Reviewer instruction source

The reviewer loads the exact package file `EDITORIAL-GATE-REVIEWER-PROMPT.md` as `canonicalAstrologyReviewInstructions`. The runtime response is strict JSON diagnosis only. It cannot rewrite copy.

## 7. Revision path

Failed fields and their exact failed lines, structured violations, revision instructions, and the governed meaning plan go to a separate `REVISER` call. Successful and owner-protected fields are withheld and cannot be returned in the revision patch. One bounded retry is allowed; a second failure returns `human-review-required`.

## 8. Deterministic lint rules

The final gate checks em dashes, forbidden `whether`, governed banned words and phrases, placeholder equality, required fields, collective versus second-person register, protected owner lines, exact correction fixtures, prediction language on placement copy, stock tropes, and noun-level sign/house bleed for every sign.

## 9. Fixture counts

- Owner corrections: 20
- Owner-locked Lilith V5 gold fixtures: 12
- Synthetic negative fixtures: 8
- Broad retrieval evidence: 6,906 entries (6,425 serving approved rows plus 481 locked v8 matrix rows)

## 10. Gold per-fixture results

The preserved Terra-low baseline passed 5/12 gold cards. After owner-authorized calibration, GPT-5.6 Terra-medium passed all 12/12 exact owner-locked cards in one 20-call round. The deterministic Pisces conflict was fixed by exempting exact protected owner lines from banned-vocabulary scanning while retaining the ban for unprotected copy. The noun-level house-bleed detector now follows the owner's cluster rule: one life-domain example is allowed, while a cluster of four distinct associated-house nouns blocks. All 12 gold cards pass the complete deterministic gate, and the all-career Capricorn negative still fails.

## 11. Negative per-fixture results

- `neg-aries-dishes`: `REVISE`; `stock_trope`, `example_proves_astrology`
- `neg-capricorn-career`: `REVISE`; `sign_house_separation`
- `neg-sagittarius-9th`: `REVISE`; `sign_house_separation`
- `neg-pisces-well`: `REVISE`; `metaphor_requires_translation`
- `neg-taurus-tagline`: `REVISE`; `tagline_stands_alone`
- `neg-aquarius-selfhelp`: `REVISE`; expected `generic_self_help`, `observable_behavior`
- `neg-gemini-advocacy`: `REVISE`; `advocacy_register_drift`, `observable_behavior`
- `neg-virgo-clinical`: `REVISE`; `clinical_shorthand`, `observable_behavior`

Those lines describe the deterministic expectations. The preserved Terra-low baseline met the exact decision-and-category standard for 4/8. After calibration, Terra-medium returned `REVISE` and included every expected blocking category for all 8/8.

## 12. False positives and false negatives

Preserved Terra-low baseline: 7 false positives and 4 negative mismatches. Calibrated Terra-medium round: 0 false positives and 0 false negatives or category mismatches. Fixtures remained untouched.

## 13. Approval ladder

The five statuses are `generated`, `pipeline-review-passed`, `owner-review-pending`, `owner-approved`, and `owner-locked`. Only `applyOwnerApproval` with an explicit exact owner ruling can set either owner status. Generated and pipeline-passed copy remains `ownerApproved: false`.

## 14. Generation metadata

Every generated output carries component versions for the astrology contract, writing contract, review rubric, owner corpus date, fixture set, writer prompt, and reviewer prompt, plus role, model, reasoning effort, and retrieved source IDs. Persisted application output stores the same metadata and non-owner approval state.

## 15. Writer promotion gate

`CURRENT_PRODUCTION_WRITER` remains unset. `CANDIDATE_WRITER` is the unpromoted Sol-xhigh Sky Placement lane. Promotion requires 12/12 gold, 8/8 negatives, zero false positives, zero false negatives, zero blocking regressions, and a separate explicit owner authorization. The live semantic result fails that gate, so promotion remains impossible.

## 16. Source governance and billed call count

The authority order is exact owner approval, owner corrections, owner corpus, locked matrix, voice bank, governed neutral astrology, then external neutral facts. External prose is rejected by the anti-laundering guard; only structured neutral facts and provenance can enter. The first executable vertical slice used **0 billed model calls** and was deterministic/pattern-based. The preserved baseline used **20 billed reviewer calls** with `gpt-5.6-terra` at low reasoning. The owner-authorized calibration used **20 additional billed reviewer calls** with the same model at medium reasoning. No generation or revision calls were made.

## 17. Remaining known gaps and next family

The candidate writer has not been promoted and no generated copy was approved. The live reviewer is calibrated on the Lilith vertical slice at 12/12 gold and 8/8 negatives, and the complete deterministic gate now passes all 12 gold cards while retaining every negative fixture's expected blocking category. The next generalization target remains the other Sky Placement families, followed by house-horoscope cores.
