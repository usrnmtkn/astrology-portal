# Empty-house V14 modern-ruler package

Status: V14 `body_you` and all 541 projection-4 Friend variants are
owner-approved exact wording. The Friend approval is bound to SHA-256
`07e238f17f5d3941412cc9dcf273a87a9b05f996d3d1ae82b1c587f79aad7b1b`.

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
`serving-projection-v14-projection-4.json` records all 33 pre-assigned keys.

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
runtime. The approval record covers all 541 rows at the digest above; any byte
change requires a new approval. `--promote` fails unless that record is complete
and matches the generated payload.

## Superseded draft lineage

The cleaned Gemini corpus is retained as reference-only lineage in
`../empty-house-corpus-v1/`. Its deterministic validator is
`../empty-house-corpus-v1/source/validate.py`; the original judge rubric and
writing prompt remain beside it. None of those draft rows are served by V14.
