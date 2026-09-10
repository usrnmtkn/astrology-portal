# Owner Approval — Synastry Reverse Authoring Batch 4

Approval status: **OWNER APPROVED**  
Approval date: **2026-09-09**  
Serving authorization: **AUTHORIZED 2026-09-10**  
Content Studio status: **LIVE**  
Canonical source status: **WIRED ON RELEASE BRANCH**

The owner explicitly approved the 24 reverse-direction passages in this batch as written after the connection-explanation revision. The owner subsequently authorized these 24 passages to be added to Content Studio, wired into the Friends reader path, and marked live.

## Approved writing rule

Each Friends synastry card should explain:

1. what `{{Name}}` naturally brings into the connection,
2. what that touches in the reader,
3. what those two things create between them,
4. the gift, tension, or place the dynamic can go too far.

Keep the language casual and easy to understand while preserving the psychological depth and useful imagery. Do not flatten the symbolism merely to simplify the prose.

## Serving implementation

These 24 canonical synastry-pair rows are published through the existing Content Studio fallback-dashboard override path. For this release, the newly approved reverse semantic passage is the viewer-centered `body_you` serving projection when the reader holds the canonical first body (Sun). The existing `body_they` passage is preserved for the opposite reader orientation, so both directions remain available without duplicating canonical pair keys.

The permanent repository source for this release is:

`apps/web/src/content/fallbackArchitectureV3/source-rows/synastry-directional-overrides-v1.json`

The relationship bundle appends those exact approved overrides after the older bundled synastry rows so the same canonical content key resolves to the newer directional record. The source keeps the Content Studio authoring variable `{{Name}}`; the relationship-bundle boundary compiles that authoring variable to the existing forward-pair runtime slot `{{holder2}}`. This preserves the owner-facing variable convention without leaking an unresolved variable into reader copy.

The guarded release command is implemented in:

`scripts/release-synastry-directional-overrides-v1.mjs`

It refuses rows classified as reciprocal or held for review, checks the new semantic arrow against the human-reviewed directionality map, preserves the existing `body_they` byte-for-byte, and only publishes when explicitly run with `--apply` after owner authorization.

Regression coverage lives in:

`scripts/test-synastry-directional-overrides-v1.mjs`

The test checks all 24 canonical rows, both reader orientations, square/opposition and trine/sextile family routing, exact owner-approved tier, preservation of the old opposite-direction copy, and zero unresolved `{{Name}}` / holder variables in rendered output.

Each released Content Studio row carries `directionality_mode: viewer-centered-synastry-v1`, semantic-direction markers, an owner-approval marker for the new `body_you` passage, `status: LIVE`, `lane: serving`, `review_state: null`, and a live content-publication ledger entry.

## Live content keys

- `fallback-hook/synastry-pair/sun/ascendant/conjunction`
- `fallback-hook/synastry-pair/sun/ascendant/hard`
- `fallback-hook/synastry-pair/sun/ascendant/soft`
- `fallback-hook/synastry-pair/sun/midheaven/conjunction`
- `fallback-hook/synastry-pair/sun/midheaven/hard`
- `fallback-hook/synastry-pair/sun/midheaven/soft`
- `fallback-hook/synastry-pair/sun/descendant/conjunction`
- `fallback-hook/synastry-pair/sun/descendant/hard`
- `fallback-hook/synastry-pair/sun/descendant/soft`
- `fallback-hook/synastry-pair/sun/imum-coeli/conjunction`
- `fallback-hook/synastry-pair/sun/imum-coeli/hard`
- `fallback-hook/synastry-pair/sun/imum-coeli/soft`
- `fallback-hook/synastry-pair/sun/chiron/conjunction`
- `fallback-hook/synastry-pair/sun/chiron/hard`
- `fallback-hook/synastry-pair/sun/chiron/soft`
- `fallback-hook/synastry-pair/sun/north-node/conjunction`
- `fallback-hook/synastry-pair/sun/north-node/hard`
- `fallback-hook/synastry-pair/sun/north-node/soft`
- `fallback-hook/synastry-pair/sun/south-node/conjunction`
- `fallback-hook/synastry-pair/sun/south-node/hard`
- `fallback-hook/synastry-pair/sun/south-node/soft`
- `fallback-hook/synastry-pair/sun/lilith/conjunction`
- `fallback-hook/synastry-pair/sun/lilith/hard`
- `fallback-hook/synastry-pair/sun/lilith/soft`

This serving authorization applies only to these 24 Batch 4 passages. Other reverse-direction drafts remain review-only until separately approved and released.
