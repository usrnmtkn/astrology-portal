# TLDR Astro global canonical content hub

This directory is the single surface-neutral authority model for reader-facing
content. Phase 1 migrates natal content only; the schema and resolver do not
encode natal-only precedence.

The ID grammar is:

`<surface>/<kind>/<normalized semantic identity...>`

Segments are lowercase ASCII kebab-case. Body aliases normalize before ID
construction, house ordinals normalize to `1` through `12`, and unordered
aspect bodies sort lexically. `nonagen` normalizes to `semisextile`.

Examples admitted by the same grammar:

- `natal/placement-sign/moon/taurus`
- `transit/house/saturn/10`
- `sky/aspect/mercury/saturn/opposition`
- `lunation/full-moon/scorpio`
- `calendar/moon-phase/first-quarter/leo`
- `synastry/aspect/moon/venus/sextile`
- `composite/placement-house/saturn/10`
- `daily/horoscope/aries/2026-08-20`
- `weekly/horoscope/aries/2026-08-17`

Build or verify the one exported index:

```sh
node scripts/build-canonical-content-hub.mjs --write
node scripts/build-canonical-content-hub.mjs --check
```

The deterministic index is
`index/canonical-content-index.json`. Runtime consumers call
`createCanonicalContentResolver(index)` and then `getCanonicalUnit(unitId)`.
Pending candidates are retained under their unit and never render. Candidate
promotion must create a new revision; it never overwrites revision zero.

The unit universe is imported from the shared natal reader runtime contract in
`packages/astro-knowledge/engine/natal-content-support/browser.mjs`; the hub
builder does not carry a separate body, angle, sign, or aspect list. Resolution
is explicitly perspective-scoped: `resolution.perspectiveModes.you` and
`resolution.perspectiveModes.they` preserve states such as authored for You and
composed for Friends without treating the whole unit as authored.

The source manifest inventories all 2,764 distinct `authored/*` keys by their
declared surface. They remain inventory-only in Wave 1. Source reachability is
also fail-closed: every eligible exact reader row must resolve to a unit, a
composition ingredient, or the cited data allowlist.

The natal compatibility adapter is guarded by
`VITE_CANONICAL_CONTENT_HUB_NATAL`. The repository does not define or enable
that variable, so the legacy renderer remains the production path by default.
