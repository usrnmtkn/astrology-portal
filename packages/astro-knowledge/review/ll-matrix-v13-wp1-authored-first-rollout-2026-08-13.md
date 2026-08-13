# LL Matrix V13 WP-1 authored-first rollout

Date: 2026-08-13

## Authority and scope

This record implements WP-1 from:

- `packages/astro-knowledge/review/tldr-astro-owner-writing-execution-plan.md`
- `packages/astro-knowledge/review/tldr-astro-owner-writing-usage-plan.md`

The source packet is the 713 rows whose `OwnerApproved` value is not `TRUE` in `packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json`. They remain unapproved and non-serving until a complete owner verdict batch passes the atomic importer. The previously approved 301-row V13 lineage is unchanged.

## Ordered review batches

The machine-readable manifest is `packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json`. Batches are grouped by source sheet and runtime family, then ordered by the semantic-QA flag rate of the rendered serving families they would replace.

| Batch | Families | Rows | Judged passages matched | QA flags potentially retired | Flag rate |
|---|---|---:|---:|---:|---:|
| WP1-B01 | exact natal aspects | 132 | 264 | 264 | 100.00% |
| WP1-B02 | exact natal aspects | 131 | 217 | 217 | 100.00% |
| WP1-B03 | exact placement-house, node sign/house, lunar phase, generic aspect | 116 | 2,865 | 2,111 | 73.68% |
| WP1-B04 | exact placement-sign, generic planet/sign/house | 72 | 2,898 | 1,966 | 67.84% |
| WP1-B05 | exact natal aspects | 131 | 160 | 108 | 67.50% |
| WP1-B06 | exact natal aspects | 131 | 0 | 0 | no current QA coverage |

“QA flags potentially retired” counts distinct semantic-QA `EDIT`/`CUT` passages whose rendered facts match at least one candidate row in the batch. It is prospective replacement coverage, not an approval claim. Placement batches can match the same composed passage through generic and exact dependencies, so their counts are not additive.

## Batch 1 workbook

`tldr-astro-phrasebank/TLDR-LL-V13-WP1-BATCH-01-OWNER-REVIEW.xlsx` contains all 132 WP1-B01 rows. Controlled fields include the source sheet, family, row key, current copy, deterministic V13 clarity annotation, QA evidence, and metadata SHA-256. Only the owner verdict and owner edit columns are writable review inputs.

The clarity annotation is a deterministic precheck for `translation-required`, `real-filler`, and `astrology-restated`. “No deterministic V13 clarity defect detected” is not a pass verdict; owner review controls.

## Atomic verdict import

`scripts/import_ll_v13_wp1_owner_verdicts.py`:

- requires all 132 verdicts and accepts only `approve`, `edit`, or `cut`;
- validates every controlled workbook cell and metadata SHA-256 against the manifest;
- refuses formulas in verdict/edit cells, missing rows, extra/reordered keys, partial verdicts, copy drift, or hash drift;
- adopts current copy byte-identically for `approve`, owner wording verbatim for `edit`, and no row for `cut`;
- performs no state change when validation fails;
- on an authorized `--apply`, replaces canonical fallback rows by exact `contentKey`, runs the duplicate-key invariant before and after, and preserves every other row byte-identically;
- writes approved evidence to the separate WP-1 locked overlay consumed by the voice-index builder.

The checked-in workbook is intentionally blank, so importer execution currently refuses it. It becomes executable only after the owner fills every row.

## Friend derivation boundary

The importer queues newly approved exact placement rows in `apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-ll-v13-wp1-derived-candidates-v1.json`. Queue entries contain the approved self-copy hash and a fail-closed third-person render contract; they do not invent Friend wording. Every derived row remains `needs_review`, non-serving, and unavailable to voice promotion until authored, composed-sample QA is attached, and the owner approves it under pass 2.

Batch 1 contains exact aspect rows only, so its current Friend derivation output is correctly zero rows. Later placement batches exercise the same wired path.

## Governance

- No unapproved source row serves.
- No WP-1 row is approved by this preparation PR.
- No serving copy, auto-publish state, or writer promotion changes in this preparation PR.
- Generated fallback artifacts are regenerated only when an owner-approved verdict batch is applied and rebased for merge.
- WP-2 empty-house authoring and full ruler retirement remain blocked until the QA rollup lands and the first house-row batch is owner-approved. No WP-2 scaffold is created here.
