# Remove the Uranus lunation layer from reader rendering

Date: 2026-08-23

Status: accepted

## Context

The per-rising lunation assembler had a Uranus-only secondary paragraph. No recorded owner
rationale explains why Uranus alone received this treatment. The content library contains 12
`fallback-hook/lunation-uranus-layer/*` rows and zero equivalent layer rows for Saturn,
Pluto, Neptune, Jupiter, or Chiron.

## Measured reach before removal

The former condition was measured across every principal 2026 lunation and all 12 rising
signs: 25 lunations × 12 rising signs = 300 lunation cards.

- Either condition: 156 of 300 cards (52.00%).
- Uranus in an angular house (1, 4, 7, or 10), inclusive: 100 of 300 (33.33%).
- Uranus within 3 degrees of an exact major aspect to a lunation light, inclusive: 84 of 300
  (28.00%).
- Both conditions: 28 of 300 (9.33%).
- Angular-house only: 72 of 300 (24.00%).
- Proximity only: 56 of 300 (18.67%).
- Neither condition: 144 of 300 (48.00%).

Seven of the 25 lunations met the proximity half of the condition. Inclusive counts overlap;
the disjoint counts show how the 52.00% total is composed.

## Decision

Stop rendering the Uranus lunation paragraph in both the browser and Node reference
resolvers. The weekly assembly continues to expose the calculated Uranus house for diagnostic
compatibility, but `uranusLayerActive` is always false. The 12 approved content rows remain in
the repository and generated package, making the decision reversible without recreating or
rewriting owner content.

## Evidence

The same firing fixture was rendered before and after the change. The complete render objects
are stored in
[`artifacts/2026-08-23-uranus-lunation-before-after.json`](artifacts/2026-08-23-uranus-lunation-before-after.json).
The after render retains the matching-New-Moon anchor, sign context, traditional ruler
localization, and weekly close; only the Uranus paragraph is absent.

## Consequences

Reader cards no longer receive a planet-specific secondary layer without a recorded reason.
Tests assert that the retained Uranus content does not render even when a caller supplies the
former active condition. Restoring any modern-planet layer requires a new recorded rationale
and explicit owner authorization.

## Bundle check

The deferred Friends workspace chunk is not part of this behavior change. Its measured gzip
size was 9,794 bytes on `origin/main` and 9,793 bytes after this change (−1 byte), below the
12,000-byte budget. No friend-voice pronoun or possessive handling was changed.
