# Sky Placement moves retirement v1

Owner instruction, 2026-08-09, verbatim:

> for every sky placement fallback hook remove the
>
> **Try this section**

## Recorded ruling

- The ruling applies to every Sky Placement fallback render lane.
- The 12 Moon moves rows were removed by PR #122.
- This package removes the remaining 156 approved
  `fallback-hook/sky-placement-moves/{planet}/{sign}` rows for Sun, Mercury,
  Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, Lilith, North
  Node, and South Node across all twelve signs.
- Sky Placement resolvers return no `moves` or `movesPresentation` payload.
- The Sky Placement reader component contains no `Try this` presentation path.
- No approved `sky-placement-moves` content key remains in source or generated
  reader artifacts.
- Nothing renders or substitutes in place of the retired rows.
- No approved article body or other reader-facing wording changes under this
  ruling.

## Verification contract

- All non-retired approved source rows remain byte-identical.
- Node and browser Sky Placement resolvers contain no moves lookup lane.
- Every placement render output omits both a `moves` property and the literal
  `Try this` section.
- Generated artifacts are rebuilt from source under flight rule v2.
