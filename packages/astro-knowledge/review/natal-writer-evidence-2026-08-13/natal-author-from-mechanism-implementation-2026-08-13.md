# Natal author-from-mechanism implementation — 2026-08-13

Status: review-evidence implementation. No reader copy in this record is owner-approved, canonical, serving, auto-published, or writer-promoted.

## Owner authority

- `tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER.md`
- Owner source SHA-256: `b68255fca1e49c716250d924c7cb5544e1ee8005baaa82cf1f2b82a6cef2e8c8`
- AstrologySupport workbook: `tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V9-DIRECT-SECOND-PERSON-LIVED-PENDING-OWNER.xlsx`
- Workbook SHA-256: `08e66b948baadadba49b376665e8c3e8de2773e0947c28607d7553cda459da58`
- `tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-WHOLE-PASSAGE-CLARIFICATION-OWNER.md`
- Whole-passage clarification SHA-256: `99ee9ee114648a54ff78aa1e85f8e971f0870205320959c1b46cd78b4e16e7ad`

## Generation contract

Natal placement and natal aspect packets now accept only:

1. exact row key;
2. exact-key `AstrologySupport`;
3. source constraints;
4. active registry identity and provenance, without registry prose;
5. four to six `exact_owner_approved` passages from at least three source rows.

Existing, current, prior, revised, V2, and V3 candidate prose cannot enter the natal writer input. The renderer rejects `inputText`, and the natal CLI rejects `--input`. Prior prose is available only to the downstream structural comparison.

## Coverage before drafting

- LL V13 unapproved rows: 713
- Exact AstrologySupport identities: 713 of 713
- Compliant natal packets today: 266 of 713 (37.31%)
- Fail closed: 447
- Batch 1: 51 READY, 81 SOURCE_GAP
- Batch 2: 45 READY, 86 SOURCE_GAP

The fail-closed remainder is caused by missing registries, inactive/DRAFT registries, or unsupported generic key shapes. It is not caused by missing AstrologySupport.

## Batch 1 V3

`TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V3.xlsx` contains all 132 original review units:

- 51 fresh V3 candidates authored from mechanism and exact owner evidence;
- 81 blank reader-copy cells marked SOURCE_GAP;
- exact AstrologySupport beside each row for audit;
- deterministic gate status;
- explicit photograph-minimum status and whole-passage semantic-review status;
- blank V3 owner-verdict and owner-edit columns.

Candidates132 columns A:O are cell-identical to the V2 workbook: 1,980 checked cells. Metadata SHA-256 values are unchanged. All V3 owner fields remain blank.

The 51 candidates clear the deterministic mechanism precheck and downstream prior-structure comparison. That result is not an editorial verdict. They remain review gated because the blocking semantic owner checks, including interchangeable copy, astrology-summary, and whole-passage sentence role, still require row-by-row owner review.

The batch split is exact: all 81 Ascendant, Midheaven, North Node, South Node, and Part of Fortune rows are the 81 SOURCE_GAP rows; all 51 non-point rows are READY. AstrologySupport exists for all 132, but the 81 point/angle mechanisms do not have the required active registry boundary.

No external model-provider call was made for this V3 preparation.

## Judge and lint changes

The judge calibration contains the three verbatim owner benchmark rewrites as PASS fixtures and the eight verbatim rejected-mode diagnoses as REVISE fixtures.

Pre-judge lint now flags:

- abstract-noun subjects in opening sentences;
- zero concrete nouns from the observable set;
- therapy-register clusters without observable action in the same paragraph;
- photograph-test failures;
- trait-first openings;
- archetype soup;
- structural paraphrase of prior prose.

The photograph test is a necessary minimum only. Every sentence must advance the lived scene, state a specific consequence, or provide necessary astrology-to-life perspective. Observable-noun density remains lint and is not used as a voice-quality score.

## Sequencing

Batch 2 packet artifacts were regenerated through the mechanism-only path to remove prior-copy fields. No Batch 2 prose was approved or served. Batches 3 through 6 remain unstarted.
