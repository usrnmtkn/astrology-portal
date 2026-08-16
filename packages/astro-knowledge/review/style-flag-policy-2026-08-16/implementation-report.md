# Banned-word and style-flag policy implementation report

Date: 2026-08-16

Scope: policy, lint, retrieval, validation, audit, and generated policy data only. No corpus or serving copy was rewritten, imported, approved, staged, promoted, or served.

## Classification changes

Every entry in the old global list behaved as a deterministic failure and retrieval exclusion. The classified policy now behaves as follows.

| Term | Old behavior | New policy class |
|---|---|---|
| reckoning | hard failure and retrieval exclusion | HARD_BAN |
| profound | hard failure and retrieval exclusion | REPLACEMENT_SUGGESTION |
| whisper | hard failure and retrieval exclusion | AI_TELL_PREVENTIVE |
| tapestry | hard failure and retrieval exclusion | AI_TELL_PREVENTIVE |
| weave | hard failure and retrieval exclusion | AI_TELL_PREVENTIVE, literal physical weaving allowed |
| woven | hard failure and retrieval exclusion | AI_TELL_PREVENTIVE, literal woven material allowed |
| self-erasure | hard failure and retrieval exclusion | EDITORIAL_REVIEW |
| truth bomb | hard failure and retrieval exclusion | HARD_BAN |
| permission slip | hard failure and retrieval exclusion | HARD_BAN |
| performing normalcy | hard failure and retrieval exclusion | HARD_BAN |
| voice shakes | hard failure and retrieval exclusion | WAIVED |
| self-punishment | hard failure and retrieval exclusion | WAIVED |
| death | hard failure and retrieval exclusion | WAIVED |
| die | hard failure and retrieval exclusion | WAIVED |
| dying | hard failure and retrieval exclusion | WAIVED |
| running tally | hard failure and retrieval exclusion | HARD_BAN |
| dynamic interplay | hard failure and retrieval exclusion | HARD_BAN |

`profound` warns only in the recorded generic-emphasis collocations and carries alternatives. Advisory and waived entries remain retrievable. Only HARD_BAN and contextually matching AI_TELL_PREVENTIVE entries exclude evidence.

## Consumer walk

All fourteen named consumers required and received changes; none was already safe against the classified schema.

1. `packages/astro-knowledge/scripts/lint-placement-voice.js`: shared classified findings replace unconditional failures.
2. `packages/astro-knowledge/scripts/lint-sky-voice.js`: shared classified findings replace unconditional failures.
3. `packages/astro-knowledge/scripts/lint-pattern-voice.js`: shared classified findings replace unconditional failures; duplicated global terms were removed from the surface hard-ban list so advisory and literal exceptions cannot be re-hardened.
4. `packages/astro-knowledge/scripts/lint-article-voice.js`: shared classified findings replace unconditional failures.
5. `packages/astro-knowledge/scripts/compile-satori-editorial-decisions.js`: runtime inventory and generated trace report retain the policy class.
6. `scripts/build-writing-harness-data.mjs`: generated harness policy keeps the complete classified records while the legacy hard-ban array contains HARD_BAN entries only.
7. `scripts/run-sky-placement-hook-audit.mjs`: deterministic issues retain severity, policy class, reason, and alternatives instead of flattening every hit to `banned_word`.
8. `packages/astro-knowledge/scripts/aspect-corpus-warmth-harvest.js`: retrieval rejects only hard or contextually matching preventive entries.
9. `packages/astro-knowledge/scripts/timing-warmth-harvest.js`: retrieval rejects only hard or contextually matching preventive entries.
10. `packages/astro-knowledge/scripts/judge-editorial-source-bank.js`: notes retain policy class and suggestions; waived entries produce no note.
11. `packages/astro-knowledge/scripts/daily-glance-writer-runtime.js`: writer output bans contain HARD_BAN and AI_TELL_PREVENTIVE entries only, with contextual evaluation at lint time.
12. `packages/astro-knowledge/scripts/validate.js`: schema validates policy classes and alternatives; data validation enforces retrieval-eligible failures only.
13. `packages/astro-knowledge/scripts/test-satori-editorial-decisions.js`: regression assertions protect the exact class assignment.
14. `packages/astro-knowledge/scripts/test-article-voice-routing.js`: routing regression proves warnings do not become failures and waived terms disappear.

The shared writing harness validator was also updated because it consumes the generated output of consumer 6. Canonical style documentation was aligned without changing historical audits or provenance records.

## Tests added and run

- Added `test-banned-word-policy.js`, covering every waiver, `profound` suggestions and contextuality, all hard terms, metaphorical versus literal weaving, editorial retrieval, both harvesters, and long-form lint severity.
- Extended the Satori editorial-decision test with exact policy-class assertions.
- Extended article routing with advisory and waived behavior.
- Rebuilt and checked the generated Satori propagation report and writing-harness policy data.

Passing focused gates:

- `npm run test:satori-editorial-policy -w @tldr/astro-knowledge`
- `npm run test:article-voice-routing -w @tldr/astro-knowledge`
- `npm run test:aspect-warmth-harvest -w @tldr/astro-knowledge`
- `npm run qa:timing-warmth-harvest`
- `npm run validate -w @tldr/astro-knowledge`

The broader `npm run test:astro-writing` started with a passing surface/register contract audit, then could not load `wink-pos-tagger` because `npm ci` in the isolated worktree twice terminated with npm's internal `Exit handler never called!` error before installing all dependencies. This is an environment/install failure, not a test assertion failure.

## Impact counts

### Currently serving reader copy

- Records scanned: 6,834
- Old flat-list deterministic failure rows: 21
- Classified-policy deterministic failure rows: 2
- Advisory-only rows: 2
- Findings: 2 HARD_BAN, 2 EDITORIAL_REVIEW
- Rows reclassified away from deterministic failure: 19

### Owner corpus and evidence stores

- Records scanned: 7,274
- Rows excluded by the old flat list: 47
- Rows excluded by the classified policy: 12
- Advisory-only rows: 7
- Findings: 9 HARD_BAN, 3 AI_TELL_PREVENTIVE, 5 EDITORIAL_REVIEW, 2 REPLACEMENT_SUGGESTION
- Evidence rows restored from the old blanket exclusion: 35

The full row-level reclassification list is in `impact-report.json`; the compact serving list is in `impact-report.md`.

## Status effects

Persisted row status changes: **0**. The change does not approve, stage, promote, or serve any row. Nineteen serving records receive a different deterministic lint outcome if re-linted, but their stored approval and serving states are unchanged.
