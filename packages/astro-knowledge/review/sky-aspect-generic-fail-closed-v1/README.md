# Sky aspect generic fail-closed v1

Status: implementation held for owner review

Date: 2026-08-12

## Owner authorization

After reviewing the rendered Sky Placement inventory and the recommendation to
fail the generic Sky-aspect compositor closed, the owner instructed:

> please proceed

This authorization applies to selection behavior only. It does not authorize
new or revised reader wording.

After the first CI run exposed an empty Calendar aspect shell, the owner
clarified the required rendering behavior:

> if there is an aspect, show the aspect in the details, but if there is no
> write-up for the aspect do not restore the generic prose or weaken the test

## Decision

The generic compositor identified by
`fallback-template/sky.aspect-card` is no longer reader-eligible on the
collective Sky or Calendar aspect surfaces.

Precedence is now:

1. owner-approved sign-specific Sky aspect copy;
2. owner-approved exact transit-corpus copy;
3. approved exact or pair-specific phrasebook copy;
4. explicitly approved generated copy;
5. `SOURCE_GAP`.

No prose replaces a missing unit. Every calculated aspect remains visible in
the existing aspect-card UI with its engine facts. A source-gap aspect has no
interpretation paragraph.

## Measured impact

Against `docs/content-review/sky-aspects/2026-07-31/canonical-noon-matrix.json`:

- 21 calculated aspects total;
- 11 resolve reviewed phrasebook copy;
- 8 resolve approved exact transit-corpus copy at the application precedence layer;
- 2 have neither and now fail closed:
  - `moon|sextile|chiron|pisces|taurus`;
  - `moon|conjunction|north-node|pisces|aquarius`.

This snapshot measures contract impact; it is not a hardcoded production
aspect list.

## Unchanged

- No aspect wording changed.
- No placement wording changed.
- No review or approval state changed.
- No collapsed or substitute UI was added. Existing factual aspect details
  remain visible when interpretation copy is unavailable.
- Approved sign-specific, exact, phrasebook, and generated precedence remains.
- House transits, natal aspects, and transit-to-natal content are untouched.

## Verification contract

- Node and browser renderers both return `SOURCE_GAP` when no reviewed
  phrasebook unit exists.
- Application and Calendar precedence can still select approved exact or
  generated copy above that package source gap.
- Source-gap aspects retain their title, timing, and orb in the established
  detail UI, with no interpretation body.
- The retired template key cannot reach the reader.
- The canonical snapshot partitions into 11 phrasebook, 8 exact, and 2 source
  gaps.
- All previously approved row bodies remain byte-identical.
