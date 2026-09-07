# Generated Friends / You report judge adapter v1

**Status:** `owner_approved`
**Version:** `generated-report-judge-adapter-v1.0`
**Approved:** 2026-09-07
**Owner approved:** `true`
**Active in production:** `true`
**Promotion authorized:** `true`
**Base rubric:** `report-judge-rubric-v3.4`
**Threshold:** `0.85`

## Scope

This adapter applies the owner-approved Report Judge v3.4 quality standard to short generated Friends readings and You Day/Week reports.

The judge diagnoses only. It never writes replacement prose and never changes astrology. The runtime owns the pass/fail verdict.

## Short-report adaptation

Judge the complete generated reading for:

- astrology and chronology accuracy against the supplied governed brief;
- factual traceability and unsupported claims;
- lived experience and recognizable consequence;
- interpretive movement instead of paraphrase or keyword summary;
- owner voice relative to supplied governed owner evidence;
- natural language;
- syntax variety;
- emotional temperature;
- density and repetition.

Do not penalize a Day or Friends reading for being short. Do not apply Year Ahead section-count, season, or long-form structural rules. A Week report may be broader than a Day or Friends reading, but length by itself is never a quality finding when the period is adequately synthesized.

A finding must name an observable defect in the submitted draft. Do not invent missing life facts merely to ask for more specificity. Do not require a concrete example that is absent from the governed brief.

## Release standard

Use the same `0.85` threshold and hard-gate standard as Report Judge v3.4. `owner_voice` and `natural_language` must each score 4 for release.

The judge returns scores and findings only. The runtime recomputes the overall score and release verdict.

## Corrective pass governance

If the first judgment blocks a draft, the runtime may give those findings to the writer for exactly one corrective rewrite from the same governed brief. The corrected draft must pass deterministic fact/writing validation and then be judged once more. A second judge failure remains blocked and must not become reader-ready.

Judge findings are run-local correction material. They are not owner evidence, do not alter future prompts, and are not promoted into the voice system.

Owner Draft Review feedback is separate. It may become future writer/judge evidence only through an explicit owner approval action. Candidate or rejected feedback must never enter a writer or judge packet.
