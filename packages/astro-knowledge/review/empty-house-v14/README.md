# Empty-house V14 modern-ruler package

Status: V14 `body_you` is owner-approved exact wording. The explicit Friend
variants from owner projection 4 remain `needs_review` and cannot be promoted by the import script
until `friend-variant-approval-record.json` covers their exact payload digest.

## Canonical source

- Workbook: `source/TLDR-AR-EMPTY-HOUSES-MATRIX-V14-OWNER-APPROVED.xlsx`
- Workbook SHA-256: `bbfdc02f6a5684d75dd7ec348e1f62d2e38f7e0487e495e50f9fa626660e4334`
- Governance: `owner_approved_exact_full_workbook_2026-08-10`
- Rows: 550 total; 541 reader rows and 9 reference principles

The extracted `copy_you` values are byte-identical to the workbook `Copy`
cells. Any change to those bytes requires fresh owner approval.

## Dual-system ruler policy

The empty-house surface launches with the V14 modern map. Scorpio follows
Pluto, Aquarius follows Uranus, and Pisces follows Neptune. The resolver takes
a surface-local ruler-system setting, so modern and traditional planet-bearing
keys can coexist without changing the app-wide rulership contract. The 33
traditional house-1 rows remain an owner-authoring backlog; requesting one of
those cells returns `SOURCE_GAP` until that additive layer lands.

## Serving precedence

1. For the 1st house, resolve the exact sign, active-system ruler planet, and
   that planet's natal house.
2. For houses 2 through 12, prefer an exact ruler-planet and ruler-house
   example row.
3. Otherwise use the generic ruler-house row.
4. Missing required base, sign, or ruler coverage returns `SOURCE_GAP`.

The base essay is the detail lens hint. The sign row appears first in the body,
followed by the one selected ruler row. A planet-specific row replaces rather
than duplicates its generic fallback.

## Friend review

Projection 4 applies the owner's 34 selected corrections over the deterministic
plural-they draft. `body-they-decision-aid.json` records the complete flag
disposition: 34 corrected rows and 31 rows approved as-is, with zero unresolved
flags. The importer reproduces those exact bytes and never rewrites pronouns at
runtime. All 541 rows still require final exact-wording approval. Run the
importer without flags to refresh the staged authored input and review file.
`--promote` fails unless the approval record is complete and matches payload
SHA-256 `07e238f17f5d3941412cc9dcf273a87a9b05f996d3d1ae82b1c587f79aad7b1b`.
