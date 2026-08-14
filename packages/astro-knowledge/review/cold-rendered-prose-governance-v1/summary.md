# Cold rendered prose gate: live evaluation

- Status: **FAIL**
- Model: `gpt-5.6-terra`
- Reasoning effort: `high`
- Calls: 13
- Tokens: 22166 total (12496 input, 9670 output, 6380 reasoning; 0 cached input)
- V7 Mercury negatives: 8/12 correctly REVISE
- Sun in Leo V3 gold: 0/1 correctly PASS
- Context isolation: every model request contained only the rendered prose.

## Per-fixture results

- `cold-negative-mercury-aries-v7`: expected REVISE, received PASS (mismatch)
- `cold-negative-mercury-taurus-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-gemini-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-cancer-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-leo-v7`: expected REVISE, received PASS (mismatch)
- `cold-negative-mercury-virgo-v7`: expected REVISE, received PASS (mismatch)
- `cold-negative-mercury-libra-v7`: expected REVISE, received PASS (mismatch)
- `cold-negative-mercury-scorpio-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-sagittarius-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-capricorn-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-aquarius-v7`: expected REVISE, received REVISE (correct)
- `cold-negative-mercury-pisces-v7`: expected REVISE, received REVISE (correct)
- `cold-positive-sun-leo-v3`: expected PASS, received REVISE (mismatch)
