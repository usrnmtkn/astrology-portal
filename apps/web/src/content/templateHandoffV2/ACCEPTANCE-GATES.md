# Release-blocking acceptance gates

## Package gates

- `node tests/verify-package-contract.mjs`
- `node tests/verify-render-fixture-shape.mjs`

## Repository gates Codex must implement/run

1. Surface resolver fixtures cover every surface in `SURFACE-RESOLUTION-MATRIX.json`.
2. Final visible-output fixtures cover the focused fixtures in the controlling prompt.
3. Each fixture records facts, template ID/version, field map, primary source, supporting sources, source tier, record ID, and initial/hydrated provenance.
4. Compact and expanded strings differ.
5. No normalized sentence repeats on a route.
6. `The astro:` appears exactly once where required and never on compact cards.
7. Dates render once in the timing component; narrative does not restate them as boilerplate.
8. Expanded narrative never appears in hero/TLDR and Overview simultaneously.
9. Long-term/pass sections contain only pass context, not the complete article.
10. Evidence-only and reference-scaffold rows cannot resolve to reader fields.
11. Instruction/report/status content cannot resolve to reader fields.
12. Missing exact combination sources produce `SOURCE_GAP`.
13. Collective Sky and personalized planetary horoscopes resolve differently.
14. Moon phase and Moon sign resolve separately.
15. Sect clauses obey eligibility and do not alter transit ranking.
16. Admin preview and reader final output are identical for the same facts/record.
17. Existing calculation/API integrity tests remain unchanged and passing.
18. Web typecheck and build pass.

Counts are inventory, not acceptance evidence. Do not mark the package complete with any failed or skipped gate.

