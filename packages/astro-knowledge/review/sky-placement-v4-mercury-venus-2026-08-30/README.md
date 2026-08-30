# Sky Placement V4 Mercury + Venus staging record

Date: 2026-08-30

## Governance

This is a documentation and staging import of the owner-supplied Mercury + Venus next batch. It contains 24 source-led planet-in-sign articles: all twelve Mercury signs and all twelve Venus signs.

The package governance is preserved exactly:

- `status`: `reviewed_source_led_proposed`
- `implementation_status`: `next_codex_batch`
- `owner_approved`: `false`

These records are `needs_review`, stage-only, and excluded from every reader bundle. They do not serve and do not become owner-approved through this import. Exact-wording approval and a separate serving release remain required.

This change is intentionally stacked on the reviewed Sun V4 staging/compiler work in PR #450. It reuses that compiler and its four Mustache templates without duplicating or changing the template contract.

## Package verification

- Handoff ZIP SHA-256: `00ced0b15d71fc96060552a8c57036bfe2933a1b444cde3a78b46d3bae0b1b35`
- Package JSON SHA-256: `c02b1cd3b8a29641a2d1d1a281174330c4c23c5413bbb991ffdacef6d7378c8c`
- Workbook SHA-256: `6d47836c16fea2d5c7e1daffac498d53a9121359e84c0b23af62b994a73960af`
- README SHA-256: `b66d3afad68953be3e3adfff60ae817f1d68a410e7984f063a2295fdfb16ae3c`
- Concatenated 24 article bodies SHA-256: `3b389284d203d2fbc76b139516d6076369b869434f04c96616906e2882be8bd9`
- Concatenated 72 fallback slots SHA-256: `7e1a547e38fb6bf5776a7a8a334c44b80a0639da6774288f3cd9278fad364442`
- Sorted content-key manifest SHA-256: `ac57b00674e663c0414c0b5c63cd60f5ecd3bf20d6ae55b8c76dfcdae7234737`

Both supplied standalone workbooks and the workbook inside the ZIP were byte-identical. The ZIP passed integrity verification.

## Workbook inspection

All 20 workbook sheets were imported and rendered for inspection. The Mercury and Venus editorial-review sheets each contain twelve `PASS` rows with the verdict `READY FOR NEXT CODEX BATCH`. Formula/reference-error search returned zero matches.

Mechanical review is not editorial approval. The staged JSON remains the machine-readable source of this review package.

## Runtime and dashboard boundary

- Exactly 24 unique canonical keys are staged under `sky-placement/article/{planet}/{sign}`.
- Each article compiles byte-identically from `opening`, `tension`, `development`, and `close`.
- Each fallback compiles byte-identically from its `hook`, `lived`, and `turn` slots.
- Full-article, exact-fallback, and facts-only previews resolve all Mustache variables.
- The dashboard materializer exposes the 24 rows for owner review without adding them to reader manifests.
- The existing Sun support records remain the sole staged source of the shared templates and supporting context; this batch adds no duplicate templates.

## Review wall

No serving promotion is authorized. The package stops here for owner review.
