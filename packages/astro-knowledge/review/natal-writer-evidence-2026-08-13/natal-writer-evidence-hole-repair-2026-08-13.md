# Natal writer-evidence hole repair — 2026-08-13

## Reproduced defect

Before this repair, the general writing-packet compiler treated every placement request as a Sky placement and attempted to load `data/placements/sign/moon-venus.json`. The request failed with `Missing placement fact boundary: moon-venus.json`; no natal placement or natal aspect route existed.

The aspect packet builder accepted `--surface natal --id "moon|sextile|venus"`, returned `harvest_mode: none_found`, supplied zero owner foundation lines, and still set `generationAllowed: true` when a human-moment string was present. Natal drafting could therefore proceed from rules without owner-authored calibration.

## Repair

- `natal-aspect` accepts `planetA|aspect|planetB` and binds facts to the natal aspect registries.
- `natal-placement` accepts `planet|sign` and `planet|Nth house` and binds facts to the placement registries.
- A registry row must have status `REVIEWED`, `LIVE`, `APPROVED`, or `SOURCE_BACKED`. Draft, missing, mismatched, generic, and named-point-only boundaries fail closed.
- Voice evidence is restricted to `authorityClass: exact_owner_approved` and positive-evidence-authorized rows.
- Retrieval ranks same planet pair, same soft/hard aspect family, same planet with any aspect, then adjacent natal rows. Placement retrieval uses the analogous exact-placement, same-planet, same-position, then adjacent order.
- Every packet contains four to six passages from at least three source rows, with at most two passages from one source row. A packet below either floor is `insufficient-evidence` with `generationAllowed: false`; model-input rendering refuses it.
- The prompt block embeds the owner natal delineation standard, its five beats, owner corrections, and Editorial Standard V2.
- The voice index now carries governed LL row keys and normalized natal affinity metadata. All 3,835 pre-existing `exact_owner_approved` evidence texts remain byte-identical.

## Coverage before drafting

The deterministic audit covered all 713 unapproved LL V13 rows before any batch-2 drafting:

- compliant packets: 266 (37.31%);
- fail-closed rows: 447;
- WP1-B02 compliant packets: 45 of 131;
- WP1-B02 fail-closed rows: 86.

Across the 713 rows, fail-closed reasons are 371 missing registry rows, 53 unverified registry rows, and 23 unsupported key shapes. Counts do not overlap in this run.

## WP1-B02 result

Batch 2 was regenerated through the repaired path. Forty-five rows with compliant packets carry review-gated `REWRITE` drafts. The other 86 rows are explicit `SOURCE_GAP` entries and contain no generated wording. The complete 131-row editorial packet passes the V2 deterministic gates.

The owner workbook remains blank in every owner-verdict and owner-edit cell. The atomic importer reads the workbook and refuses it at the first blank verdict, as expected. No source row, approval state, serving row, auto-publish state, or writer-promotion state changed.

## Verification

- suite-wired natal packet regression: passed;
- synthetic zero-evidence refusal: passed;
- voice-index deterministic rebuild/check: passed at 7,695 entries;
- exact-owner-approved text invariant: 3,835 before, 3,835 after, zero text deltas;
- batch-2 editorial validation: 131 rows, 45 `REWRITE`, 86 `SOURCE_GAP`;
- workbook render and formula-error scan: passed;
- content suite body: passed after generating the clean worktree's missing `dist/knowledge.json` test input;
- normal suite pre-hook: still blocked by the pre-existing Mercury–Neptune registry-copy parity drift, which this scope did not alter.

## Governance

This repair creates writer evidence and owner-review material only. It makes no serving change, does not approve any row, does not auto-publish, and does not promote any candidate into the writer corpus.
