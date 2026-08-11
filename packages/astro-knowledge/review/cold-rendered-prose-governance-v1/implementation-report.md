# Cold rendered prose governance: implementation report

Date: 2026-08-11

## Implementation

- `cold_rendered_prose` is a blocking review field and a hard `REVISE` condition.
- The cold pass is a separate model call with the `COLD_REVIEWER` role.
- Its request payload contains exactly one field: `rendered_copy`.
- Meaning plans, source notes, astrology logic, intended meaning, drafting context, and owner
  evidence are not supplied to the cold pass.
- The contextual astrology review runs afterward. It cannot override a failed cold result.
- If no semantic model client is supplied, the pipeline fails closed rather than treating
  deterministic lint as a cold read.
- The application generation path uses the same isolated cold pass before its contextual
  reviewer.

## Fixtures

- Negative set: twelve reverted Mercury V7 rendered article pages.
- Positive gold: the rendered owner-approved Sun in Leo V3 article.
- Fixture count: 13.
- Fixture source hashes are stored in `data/writing/cold-rendered-prose-fixtures.jsonl`.

## Rendered-sample transition gate

The machine transition contract is `data/writing/approval-status-transitions.json`.
Document owner approval can authorize staging, but it leaves `batchGenerationAuthorized`
and `servingAuthorized` false. Both capabilities remain blocked until the owner explicitly
approves the staged sample ID after reading it on the product surface.

## Local verification

- `npm run test:astro-writing`: PASS.
- `npm run typecheck`: PASS.
- Context-isolation and status-transition regressions: PASS.

## Live calibration

Status: **FAIL; CHECK NOT TRUSTED OR PROMOTED**.

The owner explicitly authorized transmission of the thirteen rendered fixtures. One live
pass ran with `gpt-5.6-terra` at `high` reasoning effort.

- Calls: **13**.
- Input tokens: **12,496**.
- Output tokens: **9,670**, including **6,380** reasoning tokens.
- Total tokens: **22,166**.
- Cached input tokens: **0**.
- V7 Mercury negatives correctly returned `REVISE`: **8/12**.
- Sun in Leo V3 gold correctly returned `PASS`: **0/1**.

False negatives: Mercury in Aries, Leo, Virgo, and Libra returned `PASS`.
False positive: Sun in Leo V3 returned `REVISE`.

The complete unchanged model results and provider usage records are in `live-eval.json`.
The concise per-fixture result list is in `summary.md`.

## Calibration delta

- Prior behavior: all twelve V7 Mercury articles passed the earlier gates.
- Implemented behavior: one additional context-isolated semantic call per reviewed unit.
- Measured negative-set delta: the new pass caught eight of the twelve owner-rejected V7
  articles, but still missed four.
- Measured positive-set delta: the new pass incorrectly rejected the owner-approved Sun in
  Leo V3 gold.
- Trust decision: the target of 12/12 negative rejection and 1/1 gold acceptance was not
  met. The check remains an implemented candidate and must not be treated as calibrated.
