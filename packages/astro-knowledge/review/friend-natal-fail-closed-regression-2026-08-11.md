# Friend natal fail-closed regression repair — 2026-08-11

## Scope

This repair changes resolver behavior only. It does not edit, replace, approve, promote, or serve new vocabulary copy.

## Regression

Friend natal composition could select an approved vocabulary row whose only body was written for the reader in second person. For example, a Friend Sun-in-Leo render selected `vocabularyRows[109]`, `fallback-vocab/planet-excess/sun`, and surfaced the phrase `you matter` inside a they-voice result instead of returning `SOURCE_GAP`.

## Root cause

Hook resolution was person-aware (`body_you` versus `body_they`), but vocabulary resolution was not. `getVocab` selected an eligible row and returned `row.body` without considering the requested voice. The Node reference resolver and browser resolver shared this defect.

## Repair

- Vocabulary selection now resolves a body for the requested voice before accepting a row.
- A they-voice selection refuses any body containing second-person pronouns after template slots are stripped.
- If no eligible, person-safe vocabulary body exists, the required template slot remains empty and the existing `SOURCE_GAP` contract fails closed.
- A governed `body_they` candidate can be previewed only when the caller explicitly enables unreviewed content; the selector does not authorize or promote that candidate.
- You-voice selection continues to use the existing `body` unchanged.

## Regression gate

`scripts/test-friend-natal-pronoun-contract.mjs` is wired into `pretest:content`. It verifies:

- all 40 rows in the audited second-person vocabulary baseline are rejected for they voice by both resolvers;
- the separately governed V14 empty-house vocabulary row is also rejected, bringing the current source inventory covered by the general selector to 41;
- `vocabularyRows[109]` makes Friend Sun-in-Leo return `SOURCE_GAP` in both resolvers;
- the existing You Sun-in-Leo composition still contains the approved source wording;
- a person-safe `body_they` value remains selectable for explicit review preview without changing serving eligibility.

The 40 known rows remain owner-gated pass-2 inputs. No replacement wording was authored in this repair.
