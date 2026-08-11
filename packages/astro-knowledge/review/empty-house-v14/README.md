# Empty-house V14 modern-ruler package

Status: V14 `body_you` and all 541 projection-5 Friend variants are
owner-approved exact wording. Projection 5 applies the owner's 2026-08-11
revision to `empty-2nd|cancer` in both voices. The resulting Friend approval
payload is bound to SHA-256
`6388f0d05e8bba16bce13f25b7faf052047ec0e3f64498595a4f993461c67811`.

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
`serving-projection-v14-projection-5.json` records all 33 pre-assigned keys.

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

Projection 4 applied the owner's 34 selected corrections over the deterministic
plural-they draft. `body-they-decision-aid.json` records the complete flag
disposition: 34 corrected rows and 31 rows approved as-is, with zero unresolved
flags. The importer reproduces those exact bytes and never rewrites pronouns at
runtime. The approval record covers all 541 rows at the digest above; any byte
change requires a new approval. Projection 5 adds the separately approved
`owner-revision-2026-08-11.json` overlay. `--promote` fails unless the combined
payload record is complete
and matches the generated payload.

## Detail-view bridge layer

The owner-approved bridge templates connect the sign and ruler-placement
paragraphs in the detail view only. Cards still use the sign paragraph alone.
The exact supplied wording is retained in `bridge-templates-proposal.json`, and
`bridge-template-approval-record.json` records the 2026-08-11 approval. If the
bridge template or its topic vocabulary is unavailable, the renderer preserves
the sign and ruler paragraphs instead of failing the empty-house surface.

## Advisory judge close-out

The advisory LLM judge completed all 541 `body_you` serving projections:
497 `advisory_pass`, 44 `advisory_noted`, and zero `mismatch_suspected`.
`judge-results.json` is bound to results digest
`752d9a79447057bcec90f3a7b9011307561aa1694b37dd3174c1b8182ca7823e`.
The row-level metadata overlay is `serving-row-judge-verdicts.json`; it does not
modify serving source rows, bundles, or approved prose.

The 44 notes are retained in `advisory-editorial-backlog.json` as an optional
owner editorial backlog, not as defects against PR #145. The first candidates
for any future owner revision are the leftover conditional in
`empty-1st|sagittarius|jupiter-in-2nd` and the duplicated sentence shared by
`empty-8th|mars-in-10th` and `empty-8th|ruler-in-10th`. Exact-wording approval
remains controlling unless the owner elects to revise those rows.

## Superseded draft lineage

The cleaned Gemini corpus is retained as reference-only lineage in
`../empty-house-corpus-v1/`. Its deterministic validator is
`../empty-house-corpus-v1/source/validate.py`; the original judge rubric and
writing prompt remain beside it. None of those draft rows are served by V14.
