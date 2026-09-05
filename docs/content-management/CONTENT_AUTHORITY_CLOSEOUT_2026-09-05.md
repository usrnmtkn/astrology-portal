# Content Authority Integrity Closeout — 2026-09-05

This is a timestamped evidence snapshot for the Content Studio consolidation. It does not create prose approval or serving authority. The normative promotion-authority registry is `config/content-authority-map-v1.json`.

## Audited production baseline

- Repository `main` audited at `6368877d5b9f7d425d495911c19614cec6dafde8`.
- Vercel reported deployment success for that commit.
- Supabase production was queried read-only. No database writes were made during this closeout.
- Reader database hydration requires all three conditions: `status = LIVE`, `lane = serving`, and `review_state IS NULL`. A row being in the `serving` lane alone does not make it reader copy.

## Production database state

`generated_interpretations` contained:

| Status | Lane | Rows |
|---|---|---:|
| ARCHIVED | reference | 160 |
| DRAFT | reference | 5,571 |
| DRAFT | serving | 3,002 |
| LIVE | reference | 1 |
| LIVE | serving | 6,173 |
| REVIEWED | reference | 56 |

All 6,173 `LIVE + serving` rows had `review_state IS NULL`. There were zero duplicate content keys among `LIVE + serving` rows.

The 3,002 `DRAFT + serving` rows are not reader-eligible under the production loader contract. They are therefore not counted as serving reader authority.

The single `LIVE + reference` row is `spec/sky-fallback-canonical-template`, a reference specification rather than a reader-lane row.

## Duplicate-key review

Twenty-four content keys existed more than once in the table. Every duplicate was confined to non-serving `DRAFT + reference` records. Each pair consisted of an `owner-content-studio` review copy and a `tldrastro-fallback-architecture-v3` fallback reference copy. There were zero duplicate keys on the reader-eligible `LIVE + serving` path.

## Personal Transit parity

For `authored/transit-aspect/*`:

- production rows: 378
- `LIVE + serving`: 378
- nonblank You copy: 378
- nonblank Friends copy: 377
- intentional Friends blank: `authored/transit-aspect/venus/moon/hard`

The canonical repository source and the production database were independently aggregated from sorted `content_key + body_you + body_they` values. Both produced MD5:

`064eb0fb2098922961be4070a1e49ed6`

This proves byte-level parity for the combined live You/Friends Personal Transit corpus at the time of the audit.

## Exact Sky parity

- production `LIVE + serving` exact-Sky rows: 248
- repository owner payload count: 248
- every live exact-Sky row pointed to one canonical manifest hash
- production canonical manifest SHA-256 and repository payload-set SHA-256 both equal:

`b3b2a90a00241dff84b271bb8d7d9ac5ed539ff8b7a1c1505ce34c7283233d60`

There were zero rows with an owner-approved, serving-release-authorized exact package draft that had failed to reach `LIVE + serving`.

## Sky Placement authority checks

- legacy independent Sky Placement rows archived in production: 158, all `ARCHIVED + reference`
- continuous V4 correction authority: 120 records, owner approved and serving enabled
- exact-day lunar-context authority: 40 records, owner approved and serving enabled
- Jupiter in Leo full house passages: 12/12 owner-approved rows
- each Jupiter in Leo owner passage matches its current house serving-source body byte-for-byte under the repository invariant test
- the current house-set guard remains responsible for withholding future partial, unapproved, or byte-drifted owner-authored sets

## Unresolved queue

The repository unresolved queue contains 212 items, all with reason `review-status`.

This is an editorial review backlog, not evidence of reader-copy drift. The queue remains intentionally visible and should not be reclassified as approved or serving without the applicable review/owner authority.

## Known non-defects

The following states were explicitly checked and should not be treated as integrity failures:

1. `DRAFT + serving` does not equal reader-serving; `LIVE + serving + review_state IS NULL` is the actual database overlay gate.
2. The 24 duplicate content keys are draft/reference duplicates only and cannot compete on the reader path.
3. The one `LIVE + reference` specification is not in the reader lane.
4. Friends Transit explicit-copy coverage is 377/378, not 378/378. The Venus/Moon Friends blank remains intentional unless separately authored and owner-approved.
5. The 212 unresolved items are review-status backlog, not silently serving content.

## Authority-model decision

`apps/admin/src/writingSurfaceSourceMap.ts` remains the broad inventory of renderers, source material, knowledge, fallback packages, and editorial surfaces.

`config/content-authority-map-v1.json` is narrower: it identifies the single semantic/promotion authority for each governed family, the permitted Content Studio overlay, the serving source, resolver, reader destination, and fail-closed rule. A surface may depend on many inputs without granting those inputs equal promotion authority.

The Content Coverage dashboard reads this registry so the authority chain is visible next to the coverage count rather than existing only in documentation.
