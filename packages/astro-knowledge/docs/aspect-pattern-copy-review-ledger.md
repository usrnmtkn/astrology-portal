# Aspect Pattern Copy Review Ledger

This ledger records the editorial acceptance pass for governed fallback copy. It does not approve authored copy records or reader integration.

## Decisions

| Pattern | Fixture ID | Level | Confidence | House Mode | Decision | Issues | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| t_square | `t-square-strong-sign-only` | source_grounded_template | exact | without_houses | revise | too_technical, poor_lived_explanation | Approved after replacing polarity/derived-point language with action-point and reference-point wording. |
| t_square | `t-square-strong-with-house` | source_grounded_template | exact | with_houses | revise | too_technical, poor_lived_explanation | Approved after house-aware empty-leg clause rendered cleanly without placeholders. |
| t_square | `t-square-partial-sign-only` | source_grounded_template | partial | without_houses | revise | overclaim | Approved with possible/partial wording and flexible confidence note. |
| grand_square | `grand-square-strong` | source_grounded_template | exact | without_houses | revise | too_technical, repetitive | Approved after removing report-like axis phrasing and keeping no-apex guardrail. |
| t_square | `grand-square-contained-t-square` | source_grounded_template | exact | without_houses | revise | poor_lived_explanation | Approved as independently resolvable contained pattern. |
| grand_trine | `grand-trine-strong` | source_grounded_template | exact | without_houses | revise | too_technical, internal_language_leak | Approved after replacing element-consistency wording with plain sign-style wording. |
| grand_trine | `grand-trine-multiple-real` | source_grounded_template | exact | without_houses | revise | too_technical, internal_language_leak | Approved; ambiguity remains visible and stable. |
| kite | `kite-strong` | source_grounded_template | exact | without_houses | revise | too_technical | Approved after replacing resource-planet language and preserving the opposition. |
| grand_trine | `kite-contained-grand-trine` | source_grounded_template | exact | without_houses | revise | too_technical | Approved as independently resolvable child pattern. |
| yod | `yod-strong-sign-only` | source_grounded_template | strong | without_houses | revise | overclaim, internal_language_leak | Approved with qualified Yod wording and no fate language. |
| yod | `yod-strong-with-house` | source_grounded_template | strong | with_houses | revise | overclaim, internal_language_leak | Approved with house-aware fallout reference and no natal-placement claim. |
| yod | `yod-wide-real-sign-only` | source_grounded_template | wide | without_houses | revise | overclaim | Approved with wide/possible wording. |
| mystic_rectangle | `mystic-rectangle-strong` | source_grounded_template | exact | without_houses | revise | wrong_role, too_technical | Approved after removing apex language and replacing variant enum with plain wording. |
| t_square | `emergency-t_square` | emergency_fallback | partial | without_houses | revise | too_technical | Approved as readable temporary fallback. |
| grand_square | `emergency-grand_square` | emergency_fallback | partial | without_houses | revise | vague | Approved after removing misleading planet-count claim. |
| grand_trine | `emergency-grand_trine` | emergency_fallback | partial | without_houses | revise | vague | Approved as readable temporary fallback. |
| kite | `emergency-kite` | emergency_fallback | partial | without_houses | revise | vague | Approved as readable temporary fallback. |
| yod | `emergency-yod` | emergency_fallback | partial | without_houses | revise | vague | Approved as readable temporary fallback with prohibited terms absent. |
| mystic_rectangle | `emergency-mystic_rectangle` | emergency_fallback | partial | without_houses | revise | vague | Approved as readable temporary fallback with no apex language. |

Fields reviewed for every fixture:

- eyebrow
- headline
- overview
- how_it_works
- planet_roles
- pressure_or_support
- derived_point
- watch_for
- confidence_note

## Blocked Wording

The following wording was rejected or removed:

- `creates a polarity that is acted through`
- `derived point`
- `element consistency`
- `resource planets`
- `The resolver can identify`
- `The geometry is`
- `Do not assign an apex`
- `This partial pattern includes 3 planets`
- `A qualified ... pattern`

## Before And After Examples

### T-square Mechanics

Before:

`The opposition between Sun and Moon creates a polarity that is acted through Mars.`

After:

`Sun and Moon can pull in different directions, and Mars is where the chart most often tries to do something with that pressure.`

### T-square Empty Leg

Before:

`The empty leg is a derived point that marks a less familiar response, not another natal planet.`

After:

`The empty leg is a reference point, not another natal planet. It names a response that may be less familiar.`

### Grand Square

Before:

`The pattern links Sun, Moon, Mars, and Saturn through two opposition axes: Moon and Saturn and Sun and Mars.`

After:

`Sun, Moon, Mars, and Saturn are tied together through two major pairs: Moon and Saturn, plus Sun and Mars.`

### Grand Trine

Before:

`The element consistency is same element, so mention that only as a geometric fact.`

After:

`The signs are the same element, which means the pattern has a consistent style.`

### Kite

Before:

`Saturn is the focal planet, Mars is the opposed trine planet, and Sun and Moon act as resource planets.`

After:

`Saturn draws the pattern forward, Mars stands across from it, and Sun and Moon help support the shape.`

### Yod

Before:

`The fallout point falls in Taurus as a derived point opposite the apex.`

After:

`The fallout point is opposite Saturn, in Taurus. It is a reference point, not another natal planet.`

### Mystic Rectangle

Before:

`Do not assign an apex or describe the pattern as automatically balanced.`

After:

`Do not describe this as automatic balance. The oppositions still matter.`

### Emergency Fallback

Before:

`The resolver can identify the pattern structure from approved slots without adding extra claims.`

After:

`This fallback names the pattern and keeps the explanation limited to the confirmed planets.`

## Approved Fixture Location

Golden copy snapshots are stored at:

`packages/astro-knowledge/engine/aspect-patterns/fixtures/copy/index.js`

Any future wording change should update this ledger and the golden fixture intentionally.
