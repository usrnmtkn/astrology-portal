# Sky Placement Terra-low promotion

Date: 2026-08-02 (America/New_York)

## Outcome

`gpt-5.6-terra` at low reasoning is the active Sky Placement judge. The previous `gpt-4.1-mini` release is preserved in the rollback slot. `gpt-5.6-sol` at xhigh remains staged only as an unpromoted future experiment.

No governed content row was promoted. The Uranus-in-Cancer article is owner-approved only as noncanonical judge-calibration evidence. It remains `promotionAuthorized: false` and `canonical: false`; the frozen target-002 fixture is unchanged.

## Promotion-grade calibration

The calibration used five samples per fixture:

- One exact owner-approved collective Current Sky article: score 3, no disagreement.
- Seven weak controls: five scored 1 and two scored 2; none scored 3.
- Approved mean: 3.00.
- Weak mean: 1.29.
- Separation: 1.71.
- Required separation: 1.50.
- Five-sample disagreement: none.

The resulting report passed the repository promotion gate and is preserved in `review/sky-placement-judge-terra-promotion-calibration-v1.json`.

## Routing safeguard

An initial attempted run was invalid because a local environment model override reselected `gpt-4.1-mini`. Its report identified the mismatch and was not used for promotion. The calibration runner now rejects any promotion run whose selected model, provider, or reasoning effort overrides the staged candidate release. The passing run explicitly selected the Terra candidate and recorded `model: gpt-5.6-terra`, `reasoningEffort: low`, and the matching candidate release ID.

The runtime adapter now treats the generic `OPENAI_MODEL` setting as generation configuration only. Judges use `OPENAI_JUDGE_MODEL` solely as an explicit override; otherwise each judge surface resolves its active registry release. Verification confirms that Sky Placement resolves Terra-low while the Sky Aspect and long-form judges, and default generation, remain on their own `gpt-4.1-mini` releases.

## Registry state

- Active: `sky-placement-judge-openai-gpt-5.6-terra-v1`.
- Candidate: `sky-placement-judge-openai-gpt-5.6-sol-candidate-v2`.
- Rollback: `sky-placement-judge-openai-gpt-4.1-mini-v1`.
- Approver: owner.
- Automatic model activation: not used; promotion occurred only after the report passed.
