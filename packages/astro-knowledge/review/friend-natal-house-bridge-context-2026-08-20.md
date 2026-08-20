# Friend natal house bridge context — owner approval and serving repair

Date: 2026-08-20

Surface: Friends → natal placement detail

## Owner ruling

> The grammar is wrong, the bridge sentence needs context.
> Instead of: It's in their 12th house
> Write: Their moon is in their 12th house.

The ruling applies to the shared Friend natal house bridge. The renderer now names the actual placement in every house: `Their {{planetTitle}} is in their [Nth] house, meaning…`. The existing house-specific explanation continues after that clause. Planet names follow the app's title-case convention.

## Scope

- 12 governed `fallback-hook/house-meaning/*` Friend variants updated.
- The You variants remain byte-identical.
- Compatibility copy remains unchanged.
- No Friend passage is derived from a You passage; this is a shared placement-identification bridge only.
- Source release: `friend-natal-house-bridge-context-v1`.

## Guardrails

The suite renders all 13 supported natal planets through all 12 Friend houses in both the Node and browser resolvers. Every house section must begin `Their [Planet] is in their [Nth] house, meaning…`, must not begin with the antecedent-free `It's in their…`, and must not leak second person.

The canonical 12-row release projection is frozen at SHA-256 `71c795cc694f308cc5f2732f4ab166d3ab820c5b3b1eecee34f2d0c74d71842e`.
