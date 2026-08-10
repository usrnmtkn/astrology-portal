# Reviewer calibration, 2026-08-09

## Scope and authority

The owner authorized up to five live rounds of 20 calls. Calibration stopped after the first round met the stated live-model bar. No gold or negative fixture was edited. The candidate writer remains unpromoted.

## Deterministic Pisces diagnosis

The exact owner-locked Pisces lived line contains `self-erasure`:

> Compassion that was really self-erasure starts coming with limits attached.

`self-erasure` is in the governed banned-vocabulary list. The earlier 12/12 deterministic summary did not run the complete final lint over each gold card, so this authority conflict was hidden until the first live semantic pass.

The rule was corrected, not the fixture: banned-vocabulary scanning now removes exact `protectedOwnerLines` before scanning. The exemption is exact-text and authority-bound. The same phrase remains banned in generated or otherwise unprotected copy. A regression proves both sides of that rule.

## Semantic calibration changes

1. All twelve exact owner-locked Lilith V5 cards are generated into the runtime reviewer instructions as explicit PASS exemplars.
2. Reviewer reasoning changed from `low` to `medium` by default and remains configurable through `OPENAI_REVIEW_REASONING_EFFORT`.
3. The strict response schema and runtime validation now permit only `PASS` or `REVISE`; `FAIL` is invalid.
4. The reviewer instruction version is `tldr-astro-editorial-gate-v3-owner-gold-2026-08-09`.

## Baseline round (preserved from PR #137)

- Model: `gpt-5.6-terra`
- Reasoning: `low`
- Calls: 20
- Gold: 5/12 exact PASS
- Negatives: 4/8 exact REVISE with required categories
- False positives: 7
- Negative mismatches: 4
- Result: FAIL

The original result remains at `lilith-live-semantic-review-eval.json`.

## Calibration round 1

- Model: `gpt-5.6-terra`
- Reasoning: `medium`
- Calls: 20
- Input tokens: 104,061
- Output tokens: 15,489
- Total tokens: 119,550
- Gold: 12/12 PASS
- Negatives: 8/8 REVISE with every required blocking category
- False positives: 0
- False negatives or category mismatches: 0
- Live-model result: PASS

Per-fixture results:

| Fixture | Expected | Live decision | Required categories found |
| --- | --- | --- | --- |
| gold-lilith-aries-v5 | PASS | PASS | n/a |
| gold-lilith-taurus-v5 | PASS | PASS | n/a |
| gold-lilith-gemini-v5 | PASS | PASS | n/a |
| gold-lilith-cancer-v5 | PASS | PASS | n/a |
| gold-lilith-leo-v5 | PASS | PASS | n/a |
| gold-lilith-virgo-v5 | PASS | PASS | n/a |
| gold-lilith-libra-v5 | PASS | PASS | n/a |
| gold-lilith-scorpio-v5 | PASS | PASS | n/a |
| gold-lilith-sagittarius-v5 | PASS | PASS | n/a |
| gold-lilith-capricorn-v5 | PASS | PASS | n/a |
| gold-lilith-aquarius-v5 | PASS | PASS | n/a |
| gold-lilith-pisces-v5 | PASS | PASS | n/a |
| neg-aries-dishes | REVISE | REVISE | stock_trope; example_proves_astrology |
| neg-capricorn-career | REVISE | REVISE | sign_house_separation |
| neg-sagittarius-9th | REVISE | REVISE | sign_house_separation |
| neg-pisces-well | REVISE | REVISE | metaphor_requires_translation |
| neg-taurus-tagline | REVISE | REVISE | tagline_stands_alone |
| neg-aquarius-selfhelp | REVISE | REVISE | generic_self_help; observable_behavior |
| neg-gemini-advocacy | REVISE | REVISE | advocacy_register_drift; observable_behavior |
| neg-virgo-clinical | REVISE | REVISE | clinical_shorthand; observable_behavior |

The complete provider response IDs, decisions, categories, reasoning effort, and token usage are preserved in `lilith-live-semantic-review-calibration-round-1.json`.

## Deterministic follow-up

The owner subsequently aligned the noun-level detector with the canonical cluster rule: one life-domain example is legitimate; a cluster is the warning sign. The detector now requires four distinct governed domain nouns. The exact Capricorn gold card passes, the all-career Capricorn negative still fails, and every other gold and negative result remains unchanged.

## Governance result

The semantic reviewer met the authorized success bar after one calibrated round. No further billed rounds were run. No fixture was changed. No generated copy was approved. `CURRENT_PRODUCTION_WRITER` remains unset and the Sol-xhigh candidate remains unpromoted.
