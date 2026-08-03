# Sky Placement judge targeted evaluation v3

Status: provenance-corrected blinded evaluation. No promotion capability, runtime mutation, or governed-content mutation.

## Provenance states

The placement calibration now keeps three distinct states:

- `historical_owner_approved`: original second-person owner copy, preserved verbatim and excluded from active Current Sky positive evidence.
- `collective_adaptation_candidate`: a collective-language adaptation with `needs_review`, `ownerApproved: false`, and `promotionAuthorized: false`. It may be an evaluation input but is not gold.
- `current_sky_owner_approved`: exact collective wording explicitly approved by the owner and eligible for active positive calibration. There are currently zero full-article fixtures in this state.

The generation and judge prompts therefore contain no full-article Current Sky gold examples. They say so explicitly and rely on the rubric plus the separately approved Uranus-in-Cancer beat evidence. Candidate adaptations are not supplied as few-shot or gold evidence.

## Exact 9-case classification

| Case | Classification | Expected outcome | Approval state |
|---|---|---|---|
| target-001 | positive_collective_control | 3 / rule-compliant | collective adaptation candidate; not owner-approved |
| target-002 | positive_collective_control / preservation | 3 / preserve clear writing | assembled candidate; only its lived paragraph is owner-approved beat evidence |
| target-003 | single_pronoun_failure | below 3 | test-only failure control |
| target-004 | single_pronoun_failure | below 3 | test-only failure control |
| target-005 | domain_drift_failure | below 3 | test-only failure control |
| target-006 | natural_english_failure | 1 expected | test-only failure control |
| target-007 | overwriting_failure | below 3 | test-only failure control |
| target-008 | editorial_restraint_control | 2 expected; proportional diagnosis | needs-review adaptation; not owner-approved |
| target-009 | positive_collective_control | 3 / rule-compliant | collective adaptation candidate; not owner-approved |

All nine fixtures declare `ownerApproved: false` and `promotionAuthorized: false`. A positive expected outcome means only that the copy is intended as a rule-compliant control; it does not imply owner voice approval.

## Comparison

The same model pair receives byte-identical prompts:

- Terra at low reasoning.
- Sol at xhigh reasoning.

The active runtime remains `gpt-4.1-mini`. One sample per treatment across nine cases produces 18 billed calls. This run cannot promote either judge. The original blind vote remains B 5, A 0, ties 9, and the original model key remains sealed.

## Commands

```sh
npm run test:sky-placement-judge-targeted
npm run plan:sky-placement-judge-targeted
```

Authorized live run:

```sh
TLDR_ALLOW_LIVE_LLM_JUDGE=1 \
TLDR_ALLOW_LIVE_LLM_CALIBRATION=1 \
npm run evaluate:sky-placement-judge-targeted:live
```

The anonymous review, scorecard, internal metrics, and separate sealed key are written under `out/sky-placement-judge-targeted-v3/`.

## Completed run

The provenance-corrected run completed on 2026-08-02:

- 9 fixtures with the classifications above.
- 18 successful paired API calls.
- Byte-identical prompts within every pair.
- Combined estimated API cost: `$0.2995`.
- Owner review: complete; A 4, B 4, tie 1.
- Model key: revealed after blind scoring; A was Sol-xhigh and B was Terra-low.
- Promotion eligibility: false.

The manifest is frozen with `liveRerunAllowed: false`.

## Owner result and operational comparison

Sol-xhigh was preferred in targets 001, 004, 007, and 008. Terra-low was preferred in targets 003, 005, 006, and 009. Target 002 was a tie.

| Model | Owner preferences | Average latency | Total cost | Per-call cost | Schema failures | Retries |
|---|---:|---:|---:|---:|---:|---:|
| GPT-5.6 Terra low | 4 | 3.47 s | $0.068479 | $0.007609 | 0 | 0 |
| GPT-5.6 Sol xhigh | 4 | 8.60 s | $0.230988 | $0.025665 | 0 | 0 |

Sol was approximately 2.5 times slower and 3.4 times more expensive without winning more owner preferences. The result does not justify promotion. The active runtime remains unchanged.

Target 006 remains a severity-calibration follow-up: both judges detected the unnatural personification but scored the article borderline. No automatic rubric change is authorized; the owner must decide whether first-read unnatural English plus generalized supporting copy should force an off-voice score.

All collective adaptations remain `needs_review`, `ownerApproved: false`, and `promotionAuthorized: false`.
