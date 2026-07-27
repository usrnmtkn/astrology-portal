# Codex: ship the tightened aspect-pattern templates (content version bump)

## What changed
The v3.3 pattern write-ups were over-sectioned (8 body sections + 2 openings per
pattern, with two built-in duplicates: another_response == reference_point, and the
L2 opening == how_it_works). Tightened all six patterns to a two-level shape by editing
ONLY the template + contract - no resolver code change.

Files changed (both in packages/astro-knowledge):
- `aspect-pattern-templates-v3.3.md` - merged L1 sections into one `feel`; folded
  how_it_works into the L2 opening for T-square/Grand Cross/Yod/Mystic; set the dropped
  sections to `(none)`; removed "can" hedges. Kept how_it_works for Grand Trine + Kite
  (their out_of_sign OVERRIDE still lives there).
- `aspect-pattern-contract.json` - `sections` and `required_by_section` reduced to the
  new set for each pattern.

## Why no code change
The resolver already skips any section whose template body is `(none)` and renders
`sections` generically, so removing sections is a template concern. Every registered
token is still used at least once, so the validator's token-coverage check stays green.
The out_of_sign override only fires inside how_it_works, which is why Grand Trine + Kite
keep that section.

## Gates (run from packages/astro-knowledge, all PASS)
- `python3 validate_patterns.py` -> PASS (0 errors)
- `python3 render_matrix.py` -> PASS (76 sign/house audits)
- `python3 gold_render.py` -> PASS (32 cards)
Real-resolver spot renders (known-time, exact) for all 6 patterns confirm the tightened
shape with no unresolved tokens or grammar defects.

## To ship
This is a governed astro-knowledge content change (same package that owns the
aspect-pattern reader). Rebuild/import the package the way the aspect-pattern engine is
normally versioned, bump PACKAGE_VERSION, run the aspect-pattern test scripts
(test-natal-aspect-pattern-reader-contract, test-aspect-pattern-*), and deploy. No V3
fallback source-row change and no app wiring change beyond picking up the new package.

## Reader-facing result
Each pattern now renders: headline + opening, one "what it feels like" paragraph, a
geometry paragraph, planet_roles, (Yod) reference_point, reading note - about 5-6 blocks
instead of ~11, with the duplicate balancing-point and duplicate geometry removed.

## Still queued (separate, unchanged by this)
- The resolver "can" hedge grammar fix (can throw yourself / can need) in
  thirdPersonBehavior - CODEX-ASPECT-PATTERNS-VOICE-FIXES follow-up. Not addressed here;
  this change only touched template prose, not the third-person verb transformer.
