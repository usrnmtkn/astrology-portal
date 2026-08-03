# Sky Placement Terra-low promotion

Date: 2026-08-02 (America/New_York)

## Outcome and provenance correction

The provisional Terra-low activation was rolled back after an approval-provenance audit. `gpt-4.1-mini` is again the active Sky Placement judge. `gpt-5.6-terra` at low reasoning is retained as the immediate rollback release, and `gpt-5.6-sol` at xhigh remains staged only as an unpromoted future experiment.

No governed content row was promoted. Neither Uranus-in-Cancer candidate is owner-approved. Both remain `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false`; the frozen target-002 fixture is unchanged.

## Promotion-grade calibration

The technical model evaluation used five samples per fixture:

- One positive collective control then believed to be approved: score 3, no disagreement.
- Seven weak controls: five scored 1 and two scored 2; none scored 3.
- Approved mean: 3.00.
- Weak mean: 1.29.
- Separation: 1.71.
- Required separation: 1.50.
- Five-sample disagreement: none.

The model separation result remains useful, but the report cannot authorize promotion because its positive control lacked explicit exact-wording owner approval. The original report is preserved byte-for-byte in `review/sky-placement-judge-terra-promotion-calibration-v1.json` for audit-hash continuity. Its authority is revoked by `review/sky-placement-judge-terra-promotion-provenance-invalidation-v1.json`.

## Routing safeguard

An initial attempted run was invalid because a local environment model override reselected `gpt-4.1-mini`. Its report identified the mismatch and was not used for promotion. The calibration runner now rejects any promotion run whose selected model, provider, or reasoning effort overrides the staged candidate release. The passing run explicitly selected the Terra candidate and recorded `model: gpt-5.6-terra`, `reasoningEffort: low`, and the matching candidate release ID.

The runtime adapter now treats the generic `OPENAI_MODEL` setting as generation configuration only. Judges use `OPENAI_JUDGE_MODEL` solely as an explicit override; otherwise each judge surface resolves its active registry release. This routing safeguard remains valid after rollback.

## Registry state

- Active: `sky-placement-judge-openai-gpt-4.1-mini-v1`.
- Candidate: `sky-placement-judge-openai-gpt-5.6-sol-candidate-v2`.
- Rollback: `sky-placement-judge-openai-gpt-5.6-terra-v1`.
- Terra status: technically evaluated, promotion provenance invalidated.
- Next gate: explicit owner approval of the complete exact v2 article, followed by a new five-sample promotion calibration.
- Billed rerun: not authorized and not performed.
