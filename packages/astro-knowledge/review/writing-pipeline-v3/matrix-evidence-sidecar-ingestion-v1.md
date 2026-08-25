# Matrix evidence sidecar ingestion v1

Status: **ingested; no billed calls**  
Canonical workbook changed: **no**

## Verified sidecars

- `data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl`: `0b4aa6ad27819edbe3333beff342392fa4ba646b7f6fdcfd8ff899f77b2759d8`; 3472 rows
- `data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json`: `4196d48d0a38660e861f4677cbb5d7cb10dcf96301f39bcf0f5b92a91a340be0`; 179 placements

## Raw matrix roles

- meaning: **3472**
- register: **2253**
- scene: **372**
- argument_candidate: **787**

## V13 recovery

- Approved V13 source rows: **302**
- Runtime-manifest rows: **301**
- Rows added to the shared evidence index: **301**
- Shared-index entries: **4861 → 5930**
- Meaning entries: **1876 → 2224**
- Scene entries after education cleanup: **419 → 422**
- Argument entries after approved four-slot cards were indexed: **510 → 1180**

Alias normalization covers **123** Lilith/node rows
and **62** global-sign rows. Global rows are eligible
for a concrete target; exact planet-sign rows retain precedence.

Generic planet education is not scene evidence: **157**
repeated Moon lead paragraphs are stripped before scene qualification, and
**14** standing planet-intro rows are excluded.

Moon/Cancer and Moon/Aquarius each retrieve an exact V13 meaning row. All twelve Lilith signs
retrieve four or more exact approved card/scene records.

Repeated copy is deduplicated inside each role and exact planet-sign-event target using
`copy_sha`; the highest governance tier wins. The matrix register tag remains indexed for
coverage, but the writer's register authority stays with owner-corpus passages and the approved
register-gold page.

## Extended role counts by source

- `approved_house_horoscope_core`: meaning 0, register 0, scene 23, argument 0, phrase 0
- `approved_serving_row`: meaning 0, register 0, scene 230, argument 0, phrase 0
- `current-owner-approved-placement-article`: meaning 0, register 0, scene 0, argument 55, phrase 0
- `current-owner-approved-placement-card`: meaning 0, register 0, scene 0, argument 672, phrase 0
- `owner_corpus_fixture_scene`: meaning 0, register 0, scene 3, argument 0, phrase 0
- `owner-approved-knowledge-matrix-argument_candidate`: meaning 0, register 0, scene 0, argument 453, phrase 0
- `owner-approved-knowledge-matrix-meaning`: meaning 1875, register 0, scene 0, argument 0, phrase 0
- `owner-approved-knowledge-matrix-register`: meaning 0, register 1226, scene 0, argument 0, phrase 0
- `owner-approved-knowledge-matrix-scene`: meaning 0, register 0, scene 166, argument 0, phrase 0
- `owner-approved-ll-matrix-v13`: meaning 301, register 0, scene 0, argument 0, phrase 0
- `owner-approved-register-gold`: meaning 0, register 1, scene 0, argument 0, phrase 0
- `owner-approved-voice-bank-phrase`: meaning 0, register 0, scene 0, argument 0, phrase 87
- `owner-confirmed-phrasebank-line`: meaning 0, register 0, scene 0, argument 0, phrase 259
- `owner-corpus-passage`: meaning 0, register 531, scene 0, argument 0, phrase 0
- `reviewed-sky-point-placement-meaning`: meaning 48, register 0, scene 0, argument 0, phrase 0
