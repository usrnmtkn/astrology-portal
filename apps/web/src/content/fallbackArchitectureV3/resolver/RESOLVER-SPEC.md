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

### Continuous Sky Placement interim hook

Resolution order for continuous Sky Placements is: exact authored article,
eligible `sky-placement-continuous-v2` unit, eligible complete standalone
`fallback-hook/sky-placement-sign/{planet}/{sign}`, then `SOURCE_GAP`. The
standalone row renders whole as one paragraph. It must not be combined with the
retired placement hook/lived/turn/moves stack, and `needs_review` rows remain
ineligible. Continuous rows are also distribution-gated: only keys in a
`serving` release with an exact owner-approved serving diff enter the reader
partition. The on-demand partition may replace the eager standalone floor only
after it loads and passes package-manifest validation.

Owner ruling 2026-08-09: Sky Placement articles do not render a `Try this`
section. No placement resolver may read `try_this` arrays or
`fallback-hook/sky-placement-moves/*` rows. The retired action rows are absent
from approved source, and no placement render path may read, substitute, or
display them.

## Hard runtime rules

- A row with `content_role: fallback_source` reaching any render path is a thrown error, not a skipped row.
- Voice: only `{{possessive}}`/`planetRef` tokens vary by viewer. No pronoun substitution inside stored bodies, ever (this is what caused "their drive comes straight through they").
- `planetRef`/`planetRefCap`: "the Sun", "the Moon", "the North/South Node" take the article; other bodies use the bare name. Cap form for sentence-initial position.

## Porting notes

`renderFallback.mjs` exports `renderNatalPlacement(facts, opts)` and error classes `SourceGapError` / `RoleViolationError`. Extend the same pattern per surface: one exported render function per template, same slot-eligibility and gate logic.
