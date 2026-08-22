# Friend natal house bridge context — owner approval and serving repair

Date: 2026-08-20

Surface: Friends → natal placement detail

## Owner ruling

> The grammar is wrong, the bridge sentence needs context.
> Instead of: It's in their 12th house
> Write: Their moon is in their 12th house.

The ruling first applied to the shared Friend natal house bridge. The 2026-08-21 serving repair applies the same explicit-subject grammar on You: `Your {{planetTitle}} is in your [Nth] house, meaning…`. The existing house-specific explanation continues after that clause. Planet names follow the app's title-case convention.

## Scope

- 12 governed `fallback-hook/house-meaning/*` variants updated for both You and Friend.
- Compatibility copy remains unchanged.
- No Friend passage is derived from a You passage; this is a shared placement-identification bridge only.
- Source release: `natal-house-bridge-context-v2`.

## Guardrails

The suite covers both Node and browser resolvers. Every You house section begins `Your [Planet] is in your [Nth] house, meaning…`; every Friend house section begins `Their [Planet] is in their [Nth] house, meaning…`. Neither may fall back to an antecedent-free `It's in…` opening.

The canonical 12-row release projection is frozen at SHA-256 `d399d24426a57a6ba9b643c0a2d4431d462975511e8944603e9b7a145a8b8c53`.
