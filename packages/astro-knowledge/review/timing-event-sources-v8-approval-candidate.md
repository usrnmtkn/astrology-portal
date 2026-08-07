# Timing-event source V8 approval candidate

Status: meaning layer `approved` by the owner on Aug 3, 2026. Nothing in this packet is reader-eligible
or serving; reader-copy approval remains separate.

This candidate preserves the meaning text and claim-level provenance in
`review/timing-event-sources-v7.md`, then applies the completed mechanical and calculation work. V7
contains 32 `src.timing.*` records, despite its 31-record title. The import correctly selects only the 21
source records whose event families are emitted after this engine pass.

## Imported meaning scope

- Mercury, Venus, and Mars: station retrograde, active retrograde passage, station direct.
- Jupiter, Saturn, Uranus, Neptune, Pluto, and Chiron: structural station retrograde, active retrograde
  passage, station direct. Each concrete row also requires its planet-specific meaning.
- Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto: pass-neutral ingress.
- Moon ingress: permanently excluded. No Moon timing key is materialized.
- Pre-shadow, post-shadow, cazimi named events, Mars-Sun opposition, and ingress pass types: not imported
  because those event families are not emitted today.

The compiled review artifact is
`data/timing/timing-event-sources-v8-candidate.json`: 21 source records and 432 concrete sign-specific
mappings. Every mapping is `needs_review`, `serving: false`, and has a concrete underscore-normalized
reader key. No wildcard keys are present. The collection is included in the full knowledge bundle only;
it is excluded from reader-facing web and Sky bundles.

## Calculation reconciliation

- Named cazimi threshold: exactly 17 arcminutes (`17 / 60` degrees).
- Near-Sun metadata: one degree. This does not emit a card.
- Boundary checks on two independent Mercury-Sun conjunctions:
  - 2026-01-21T15:48:54.999Z
  - 2026-03-07T11:01:43.999Z
- On both conjunctions, direct Swiss Ephemeris tests confirm that 16.9 arcminutes is cazimi, 17.1
  arcminutes is not, and 0.5 degrees remains near-Sun metadata without a cazimi event card.
- Chiron station calculations match direct Swiss Ephemeris at five stations from 2025 through 2027.
- Chiron active-passage calculations are independently checked on 2025-09-15 and 2026-10-01.

## Additional Chiron composition source for approval

The structural outer-body timing record requires a Chiron-specific meaning. The candidate adds this
non-serving DRAFT line to `data/modifiers/retrograde-planet-meanings.json`:

> review of old wounds, repair, and the survival responses built around them

It composes with `data/modifiers/chiron-life-cycle.json` and
`data/modifiers/point-metadata.json#chiron`. It does not call Chiron a planet or a traditional timing
factor.

## Still blocked

- Ingress pass type (`initial | re-entry | final`) derived from ephemeris history.
- Pre-shadow and post-shadow event emission.
- Named Mercury/Venus cazimi event emission with retrograde/direct distinction. The threshold and
  proximity metadata are now correct, but no new reader event is emitted.
- Mars-Sun opposition midpoint emission.

## Owner decision recorded

The owner approved the 21 imported meaning records and the Chiron-specific line exactly as written.
Approval is meaning-layer only. It does not approve generated reader copy, change any mapping to a
serving status, or authorize reader-copy promotion without the separate voice-review step.
