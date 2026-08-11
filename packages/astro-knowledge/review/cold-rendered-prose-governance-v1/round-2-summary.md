# Cold rendered prose: final TRAIN/HOLDOUT calibration

- Status: **FAIL**
- Governance outcome: **permanently_advisory_only_owner_prose_gate**
- Model: `gpt-5.6-terra` at `high`
- Calls: 13
- Tokens: 48325 total (37763 input, 10562 output, 5756 reasoning; 31536 cached input)
- Negative holdouts: 8/8 correctly REVISE
- Gold holdouts: 1/2 correctly PASS
- TRAIN/HOLDOUT full-text leakage: none

## Results

- `cold-holdout-fail-mercury-taurus-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-gemini-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-cancer-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-scorpio-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-sagittarius-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-capricorn-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-aquarius-v7`: REVISE; expected REVISE; correct
- `cold-holdout-fail-mercury-pisces-v7`: REVISE; expected REVISE; correct
- `cold-holdout-pass-venus-libra-collective`: REVISE; expected PASS; mismatch
- `cold-holdout-pass-lilith-sagittarius-v5`: PASS; expected PASS; correct
- `cold-probe-mercury-virgo-pilot-v1`: REVISE (unscored probe)
- `cold-probe-mercury-libra-pilot-v1`: REVISE (unscored probe)
- `cold-probe-mercury-sagittarius-pilot-v1`: REVISE (unscored probe)
