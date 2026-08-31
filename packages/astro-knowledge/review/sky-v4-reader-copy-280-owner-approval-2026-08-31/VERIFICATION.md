# SKY V4 reader-copy approval verification

Date: 2026-08-31

## Immutable source contract

- Package: `SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30`
- Canonical JSON SHA-256: `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750`
- Copy drift: `0`
- Source baselines mutated: `0`
- SKY V4 aspect records approved by this change: `0`

## Approved reader-copy records

| Content family | Count |
| --- | ---: |
| Continuous placements | 120 |
| New Moon | 12 |
| Full Moon | 12 |
| Exact eclipse events | 4 |
| Sign-aware eclipse fallbacks | 48 |
| Generic eclipse fallbacks | 4 |
| Node axes | 12 |
| North/South Node modules | 24 |
| Node education | 1 |
| Black Moon Lilith articles | 12 |
| Lilith station | 1 |
| Generic retrograde modifiers | 9 |
| Contextual transit overlays | 9 |
| Seasonal context | 12 |
| **Total** | **280** |

The 120 continuous records approve exactly `tldrWhat`, `tldrTakeaway`,
`placementArticle`, `fallback.hook`, `fallback.lived`, and `fallback.turn`.
Each other approved record uses exactly its existing `studio_editable_fields`.

## Configuration and serving state

- 24 Mustache/template records: `needs_review`, `owner_approved=false`, `serving_enabled=false`, categorized as configuration.
- `sky-v4/settings/contextual-overlays`: `needs_review`, `owner_approved=false`, `serving_enabled=false`, categorized as configuration.
- All 305 SKY V4 records: `serving_enabled=false`.
- Content Studio writing-review queue excludes the 280 hash-approved reader records and the 25 configuration records.
- A future edited version returns to `needs_review`; hash approval is not inherited by draft copy.

## Verification results

- `npm run test:content`: PASS
- `npm run typecheck`: PASS
- `npm run build:admin`: PASS
- `scripts/test-sky-v4-reader-copy-owner-approval.mjs`: PASS
- Content Studio scenarios: 14/14 PASS
- Production-parity preview API: PASS

The first sandboxed full-suite attempt stopped before application assertions
when `tsx` could not create its local IPC pipe (`EPERM`). The complete suite
was rerun outside that sandbox restriction and passed.
