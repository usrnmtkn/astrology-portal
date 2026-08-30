# Sky Placement V4 Sun corpus staging record

Date: 2026-08-30

## Governance

The handoff states exactly:

> Editorial: proposed_v4
>
> Implementation: stage_only
>
> Owner approval: FALSE. Do not promote to serving.

This change implements deterministic staging and preview support only. It does not add the V4 rows to the reader package, the serving manifest, or a LIVE lane.

## Source verification

- Handoff ZIP: `sky-placement-v4-sun-corpus-codex-handoff (1).zip`
- ZIP SHA-256: `cef9827077ce42641b2a690c6b054592b2efdb4cf6e2a20f02c7e509e06866bf`
- Package JSON original SHA-256: `3af34c44b76f00215e35a69878b31dd9601da217670c8194df36b9bfd7f273ed`
- Workbook inspected: 9 sheets, no formula errors found, all sheets rendered for visual QA.

The committed JSON preserves the package's parsed values. The repository text file has the standard final newline added by source control.

## Staged scope

- 12 Sun-in-sign article candidates.
- 12 hemisphere-aware seasonal contexts for Aries, Cancer, Libra, and Capricorn.
- 4 Mustache templates.
- 6 resolver rules.
- 7 URL and metadata contract fields.
- Included mechanical QA, source URLs, and source notes.

## Review wall

Nothing in this package is owner-approved. Exact-wording approval and a separate serving release are required before any V4 copy may enter a reader bundle.
