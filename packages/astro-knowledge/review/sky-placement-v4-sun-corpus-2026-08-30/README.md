# Sky Placement V4 source-verified Sun corpus staging record

Date: 2026-08-30

## Governance

The superseding handoff states:

> Proposed V4 / stage-only. Sun prose is source-verified but not owner-approved as a corpus.

> Codex implementation/staging handoff with a review wall. Do not promote reader copy without explicit owner approval.

This change implements deterministic staging and preview support only. It does not add the V4 Sun rows or the Mars retrograde modifier to the reader package, the serving manifest, or a LIVE lane.

## Source verification

- Superseding handoff ZIP: `sky-placement-v4-source-verified-codex-handoff-2026-08-30.zip`
- ZIP SHA-256: `cc3e75a97dc10c1452929a111f7953015e6940c4d93f11720ccfec3e3d7af1c7`
- Workbook SHA-256: `7ee4d69874f9601b3fdb3ecb11662a49dff0b396b2c4314dc1d489325cef5fa5`
- Package JSON original SHA-256: `1bc3735b59ea4223469f9df0fb6944ccff396d0904e04030934d1e66dfd8f7f3`
- README SHA-256: `bf0efaa38155649e607af692b4fe62c6a3f65499ba7e2ab3a29060373a7edc7e`
- Workbook inspected: 11 sheets, 11 tables, zero formula errors; every sheet rendered for visual QA.

The committed JSON preserves the package's parsed values byte-for-byte before the repository final newline. This source-verified package supersedes the earlier `sky-placement-v4-sun-corpus-codex-handoff (1).zip` staging source wherever its prose differs.

## Exact-copy diff from the superseded staging source

All 12 Sun rows changed. Across the governed reader fields, the changed-field counts are:

- Aries 9; Taurus 9; Gemini 8; Cancer 9.
- Leo 10; Virgo 9; Libra 8; Scorpio 10.
- Sagittarius 8; Capricorn 10; Aquarius 9; Pisces 10.

The concatenated placement-article body hash changed from `ef52c30cd585046aed3b0c2946a7312f2ffa447bcca2e072e3b8dbea794e283c` to `5da5a0379def2891519ad6878eb590232c8064d6d57a1dfbcffed6ef3e887955`.

## Staged scope

- 12 source-verified Sun-in-sign article candidates, all `proposed_v4_source_verified`, `stage_only`, and not owner-approved.
- 12 hemisphere-aware seasonal contexts for Aries, Cancer, Libra, and Capricorn.
- 4 workbook-defined Mustache templates implemented exactly.
- Resolver hierarchy: full article, exact planet-sign fallback, then facts-only safe state.
- One exact owner-supplied Mars retrograde modifier with `copy_policy: exact` and `allow_paraphrase: false`, staged as reference and not promoted.
- Source URLs, exact phrase anchors, revision notes, metadata/URL rules, and package QA retained.

## Review wall

No Sun row in this package is owner-approved. Exact-wording approval and a separate serving release are required before the Sun copy may enter a reader bundle. The exact Mars modifier is also held out of reader bundles in this staging PR, as required by the package-level review wall.
