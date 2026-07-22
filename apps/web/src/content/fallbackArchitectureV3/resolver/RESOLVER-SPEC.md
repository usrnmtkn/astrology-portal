# Fallback resolver spec (v3)

Reference implementation: `renderFallback.mjs` (natal placements). The app's resolver must match this behavior; the file is intentionally dependency-free so it can be ported or imported directly.

## Resolution algorithm (per surface request)

1. **Authored check.** Look up `full_copy` for the exact combination key. If found and READY → render verbatim. Done.
2. **Template selection.** Pick the surface's template: `natal.planet-in-sign` when no house is known (or whole-sign/house data is unreliable), `natal.planet-in-sign-in-house` when it is. Never render house language without a house fact.
3. **Slot resolution**, narrowest row first:
   - placement-level vocabulary (`placement-lived-behavior/{planet}/{sign}`, `placement-misreading/...`, `placement-actual-dynamic/...`) — optional enrichment;
   - entity-level vocabulary (`planet-function`, `planet-productive`, `sign-style`, `sign-need`, `sign-shadow`, `house-topic`, `house-pressure`) — required, guaranteed coverage.
   - Only rows with `review_status` in {`approved`, `approved_reuse`, `reviewed`} are eligible in production. `needs_review` rows render only in admin QA preview (`allowUnreviewed`).
4. **Paired blocks.** `misreading` renders only together with `actualDynamic`; if either is missing, the whole block is suppressed.
5. **Modifiers.** Dignity, natal retrograde, and sect (only when `has_reliable_sect`) each render through their own modifier template into the `modifierSentences` list. Order: dignity → retrograde → sect → aspect summary.
6. **Required-slot gate.** Any required slot without an eligible row → throw `SOURCE_GAP` (surface then shows its designated emergency copy). Never substitute a generic phrase.
7. **Post-processing.** a/an agreement, whitespace collapse, unresolved-brace check (throw, never ship braces).

## Hard runtime rules

- A row with `content_role: fallback_source` reaching any render path is a thrown error, not a skipped row.
- Voice: only `{{possessive}}`/`planetRef` tokens vary by viewer. No pronoun substitution inside stored bodies, ever (this is what caused "their drive comes straight through they").
- `planetRef`/`planetRefCap`: "the Sun", "the Moon", "the North/South Node" take the article; other bodies use the bare name. Cap form for sentence-initial position.

## Porting notes

`renderFallback.mjs` exports `renderNatalPlacement(facts, opts)` and error classes `SourceGapError` / `RoleViolationError`. Extend the same pattern per surface: one exported render function per template, same slot-eligibility and gate logic.
