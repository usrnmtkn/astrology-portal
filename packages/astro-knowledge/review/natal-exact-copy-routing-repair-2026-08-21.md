# Natal exact-copy routing and section-heading repair

Date: 2026-08-21

Surfaces: You natal placement and natal aspect detail

## Owner direction

> The house placement doesn't use the latest sentence

> Planetary aspects
> The Angels and Points

> please repair

The UI label is rendered as the astrology term `Angles and Points`; “Angels” is treated as a spelling slip, not a new content category.

## Root cause

Dashboard hydration classified every `content_role: full_copy` row as an authored card. Exact natal rows retain `fallback-hook/*` keys and are consumed by the natal fallback resolver's hook lane, so hydration removed them from the lane that could resolve them. The bundled local source still worked, which made the problem dependent on which package path was active.

The same resolver returned exact house copy before rendering the governed house bridge. Final Moon rows happened to contain the older antecedent-free bridge inside their body; other exact rows, such as Sun in the 9th house, contained no bridge at all.

## Repair

- Dashboard `fallback-hook/*` rows with `content_role: full_copy` stay in `hookRows`; true `authored/*` cards stay in `authoredCards`.
- Every You and Friend natal house section renders its contextual bridge before exact or composed house prose.
- Older embedded `It's in your [Nth] house…` bridge paragraphs are removed at render time before the current contextual bridge is added. Canonical exact prose rows remain byte-identical.
- `Planetary Aspects` and `Angles and Points` use the same eyebrow/section-label treatment as `Natal Aspects`.

## Protected natal-aspect calibration set

There are 241 `fallback-hook/natal-aspect-lived/*` rows. All 241 are `review_status: approved`, `approval.approvalLevel: exact_owner_approved`, `reader_only: true`, and use `reader-only-exact-lived-v1`.

They were authored and approved as exact passages rather than assembled from the generic aspect template:

- 96: `owner-lived-experience-ll-v9-owner-approved`
- 66: `owner-approved-v13-direct-language`
- 1: `owner-approved-clarity-fix-ll-v12`
- 78: exact owner-approved Lilith passages with individual approval records

Their deterministic copy-and-provenance projection is frozen at SHA-256 `63b47f1b808d136ea53b0f74172aa3c3f0b5350df1c6dc44a520f5a7229643d1`. The resolver must prefer these exact rows in either planet ordering and return their bodies byte-for-byte.
