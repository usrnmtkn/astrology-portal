# Final package audit

## Corrections made

- Replaced competing prompts with one authority hierarchy and one controlling prompt.
- Added explicit Home planetary-horoscope resolution distinct from collective Sky.
- Separated Moon phase and Moon sign.
- Converted template prose into machine-readable surface and render contracts.
- Made narrative beats optional and prohibited stock-slot repetition.
- Added exact field-to-component ownership to prevent hero/Overview/Long-term duplication.
- Quarantined generic transit-house formulas as `REFERENCE_SCAFFOLD`.
- Required review before raw exact-pair evidence becomes reader-eligible.
- Added an instruction-source firewall so prompts, feedback, reports, fixtures, and screenshots cannot become copy.
- Preserved exact-pair-first sourcing and `SOURCE_GAP` behavior.
- Preserved natal day/night sect eligibility while explicitly excluding transit-ranking changes.
- Added focused fixtures and executable package tests.
- Corrected the Mars-conjunct-Ascendant fixture to expect `SOURCE_GAP`; the archive contains no reviewed eligible exact-pair source for that interpretation.

## Evidence policy

The archive includes the earlier source banks and screenshots because Codex needs the evidence used by the original handoff. Their presence is not publication approval. `SOURCE-TIER-CONTRACT.md` and `SOURCE-CLASSIFICATION.json` control eligibility.

## Validation performed before packaging

```text
node tests/verify-package-contract.mjs                 PASS
node tests/verify-render-fixture-shape.mjs             PASS
JSON parse check for all JSON files                     PASS
archive integrity test                                  PASS
clean extraction and rerun of both package tests        PASS
source/extracted file-count parity (76/76)               PASS
```

This is an implementation handoff, not a claim that all source combinations are reader-ready. Repository completion remains blocked by any failed acceptance gate or unresolved `SOURCE_GAP`.
