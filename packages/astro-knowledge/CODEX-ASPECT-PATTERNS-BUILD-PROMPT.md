# Codex prompt: build the aspect-pattern resolver against the FROZEN contract

The aspect-pattern reader copy is redesigned, consolidated, and frozen. Your job is
to implement the resolver that renders it - not to edit the copy, tokens, or contract.

## The package (all in packages/astro-knowledge/)
- `aspect-pattern-contract.json` - SINGLE source of truth (token registry, per-pattern
  required-by-section clauses, namespaces, eligible bodies, banned lists). Read this.
- `aspect-pattern-templates-v3.3.md` - canonical two-level copy for all six patterns.
- `aspect-pattern-tables-v1.md` - the two authored 10-row tables (focal-demand-by-planet,
  apex-pressure-by-planet). Token VALUES.
- `CODEX-ASPECT-PATTERNS-V3-HANDOFF.md` - the resolver spec (schema, synthesis, ordering,
  confidence, overrides, precedence). Follow it exactly.
- `validate_patterns.py`, `render_matrix.py`, `gold_render.py` - the executable gates.
- `aspect-pattern-sample-renders.md` - reference (owner-approved shape for Kite & Yod).

## What to build
1. Resolve each pattern as a chart-independent MECHANIC filled by RESOLVED CLAUSES
   synthesized from planet + sign + house + geometry-role. Reuse the EXISTING
   planet-in-sign behavior layer and house-topic layer for sign_house_pull/response,
   role_gloss, house_area/context; use the two tables for focal_demand / apex_pressure
   (+ the focal_interruption / repeating_question seeds). Confirm the single canonical
   planet-in-sign source before wiring.
2. Deterministic participant ordering; confidence transforms (exact/strong/wide/partial);
   all overrides (out-of-sign GT & Kite, unknown-time L1+L2, missing derived point);
   moon_time_uncertainty (withhold user-facing, retain uncertain admin record);
   contained-pattern precedence (confidence-aware); Chiron SECONDARY (never creates or
   suppresses a primary pattern). All per the handoff.
3. Serve through the governed astro-knowledge resolver path already canonical for this
   surface (reader requests includeAspectPatternCopy=true; timeKnown=false strips houses),
   behind the existing `VITE_ENABLE_NATAL_ASPECT_PATTERNS` flag. Do not resurrect the V3
   fallback path for patterns.

## Gate (run from a CLEAN directory with only the 6 canonical files)
All three must pass before and after any change:
- `python3 validate_patterns.py` -> VALIDATOR: PASS (0 errors)
- `python3 render_matrix.py`      -> RENDER MATRIX: PASS
- `python3 gold_render.py`        -> GOLD RENDER: PASS
Re-run after any edit. FROZEN: you may change token VALUES (table entries) only - never
add, rename, or re-contract a token, and never edit the templates' structure. Any issue
is either a token-value fix (edit the table) or a renderer bug (fix resolution); it is
NOT a template redesign unless a real chart proves the contract cannot express a meaning.

## Report back
- The three gate outputs.
- One rendered card PER PATTERN from a real chart, at exact + wide + partial, known and
  unknown time, copied verbatim for owner audit (the sample-renders file shows the target
  shape for Kite & Yod).
- Confirmation: 10-primary-planet detector, Chiron secondary, nodes/angles excluded, no
  V3 pattern-copy leakage, no social changes.
