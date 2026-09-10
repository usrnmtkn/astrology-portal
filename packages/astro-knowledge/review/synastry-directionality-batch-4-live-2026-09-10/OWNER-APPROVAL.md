# Owner Approval — Synastry Directionality Batch 4 Live

Approval status: **OWNER APPROVED**  
Writing approval date: **2026-09-09**  
Serving authorization date: **2026-09-10**  
Serving status: **LIVE in Content Studio**

The owner approved the 24 viewer-centered reverse-direction passages after the connection-explanation revision, then explicitly authorized them to be added to Content Studio, wired into the Friends reader path, and marked live.

## Serving contract

These rows keep one canonical synastry pair key. For each released `sun/<other>/<aspect-family>` row:

- `body_you` is the newly approved viewer-centered direction: what the other person's body or point brings out in the reader's Sun.
- `body_they` remains the previously serving opposite semantic direction from the canonical base row.
- The release must not create a reverse duplicate content key.
- The release must not alter any reciprocal or unresolved directionality row.

The exact approved new copy is stored in:

`apps/web/src/content/fallbackArchitectureV3/authored-inputs/synastry-directionality-live-v1.json`

The overlay is intentionally additive. It supersedes only `body_you`; the merger inherits `body_they` byte-for-byte from the canonical base row and removes any stale whole-row exact-approval hash before applying the new release metadata.

## Approved live content keys

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

This authorization applies only to these 24 rows. Other reverse-direction drafts remain held until separately approved and released.

## Canonical release completion

Serving authorization is also recorded in task `6a9efc20-93ac-83e9-aca8-ef437fa03cb7`,
user turn `29a7b74b-3413-4181-a1fc-593264f17744`, dated 2026-09-10:
“please add these to the content studio and wire them up, mark these as live”.
Exact wording approval is user turn `ef52bac4-f070-4498-984d-fcc96165efc1`:
“this is good and approved”. The current task `01a089dd-57dc-7882-951e-69b0888197e5`
explicitly requests canonicalization, direction-aware release tooling, regression
coverage, actual Friends verification, and pushing the release live.

The source of truth is now the existing canonical rows in
`source-rows/fallback-source-rows-v3.json`, materialized by
`scripts/release-synastry-directionality.mjs --write`. The authored release input
holds approved hashes and expected hashes for both pre-release fields. The
runtime-only additive overlay has been removed. All 24 change `body_you`;
all 24 `body_they` values retain their exact pre-release hashes.

`content-studio-parity.json` records the read-only 2026-09-10 production comparison:
24 LIVE + serving rows, clear review state, and identical editor/packageRecord
hashes in both directions. The publication ledger independently returned 24 live
entries. Neither this release nor this verification changes the earlier 29 drafts,
76 reciprocal rows, 10 unresolved rows, or remaining 344 unwritten reverses.
