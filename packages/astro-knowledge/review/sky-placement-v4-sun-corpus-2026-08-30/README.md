# Sky Placement V4 reviewed-for-Codex Sun corpus staging record

Date: 2026-08-30

## Governance

The final editorial handoff states:

> All 12 Sun rows are marked READY FOR CODEX STAGING.

> Codex is instructed to stage and render it, preserve the wording exactly, and stop before serving promotion.

This change implements deterministic staging and preview support only. It does not add the V4 Sun rows, seasonal modules, or retrograde modifier records to the reader package, the serving manifest, or a LIVE lane.

## Source verification

- Superseding handoff ZIP: `sky-placement-v4-reviewed-for-codex-2026-08-30.zip`
- ZIP SHA-256: `f077d44f1043d5e40caa18eb2a9dd45203616a0984f42fdb46cf4ba20374afe5`
- Workbook SHA-256: `51eada8f28480f8dddada39894af545b5aeae6542981d4ac71ff96b284e19ce4`
- Package JSON original SHA-256: `fe453ee4c7ac4e88525a764822cf808ad24eb7987e57cc2fb5538c45da2945c9`
- README SHA-256: `a5c892291ec38be04e55f4231a6550fe6004d09a29918a1a02b6f0228cc5d2cd`
- Workbook inspected: 14 sheets, 14 tables, zero formula errors; every sheet rendered for visual QA.

The committed JSON preserves the package's parsed values byte-for-byte before the repository final newline. This reviewed-for-Codex package supersedes every earlier V4 Sun handoff wherever its prose or governance differs.

## Exact-copy diff from the superseded staging source

All 12 Sun rows changed from the prior source-verified stage. Across TLDR What, TLDR Takeaway, four article fields, compiled article, and three fallback fields, the changed-field counts are:

- Aries 8; Taurus 9; Gemini 9; Cancer 10.
- Leo 10; Virgo 10; Libra 8; Scorpio 10.
- Sagittarius 9; Capricorn 9; Aquarius 9; Pisces 7.

The concatenated placement-article body hash changed from `5da5a0379def2891519ad6878eb590232c8064d6d57a1dfbcffed6ef3e887955` to `dd8c8e30091b1d481ac1e8fe96e9702d2e0f635a461fa12ed3ef8c0b0492e952`. The reviewed fallback hook/lived/turn hash is `141e524f410d6086e4e4f25d3c99aec23a2c71516c18fe593058d4edbde30f38`.

## Staged scope

- 12 reviewed Sun-in-sign article candidates, all `reviewed_for_codex_proposed`, `ready_for_codex_stage`, and not owner-approved.
- 12 hemisphere-aware seasonal contexts for Aries, Cancer, Libra, and Capricorn.
- 4 workbook-defined Mustache templates implemented exactly.
- Resolver hierarchy: full article, exact planet-sign fallback, then facts-only safe state.
- 9 planet retrograde records with their short/body approval flags preserved. Only bodies explicitly marked approved may appear in previews; proposed exact-source reuse fails closed.
- Mars remains exact owner copy with `copy_policy: exact` and `allow_paraphrase: false`.
- Source URLs, exact phrase anchors, revision notes, metadata/URL rules, and package QA retained.

## Review wall

No Sun row in this package is owner-approved. Exact-wording approval and a separate serving release are required before the Sun copy may enter a reader bundle. All retrograde records also remain outside reader bundles in this staging PR, including fields that carry prior approval, because the package-level instruction stops before serving promotion.
