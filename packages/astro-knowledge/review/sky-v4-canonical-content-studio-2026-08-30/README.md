# SKY V4 canonical Content Studio staging record

Date: 2026-08-30

This change stages the owner's first canonical SKY V4 handoff for review. It does not authorize serving, promotion, or merge.

## Source authority

- Archive: `SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30.zip`
- Archive SHA-256: `a01f48a92b876ff4ff19673f35266f63cee6a90bc70bb5a8e1f22fc68b722dbc`
- Canonical JSON SHA-256: `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750`
- Workbook SHA-256: `3f2c2c6b61c90ba42a625fb6d19f5f11c4d50eb28b632c10e98f83de8edd16d6`
- Package version: `SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30`

This package supersedes the earlier SKY V4 drafts and the work represented by PRs #450 and #452. Their copy was not used as source authority here.

## Governance boundary

- All imported rows are `needs_review`, `owner_approved: false`, and `serving_enabled: false`.
- The canonical package baseline is retained byte-for-byte and hashed per record.
- Content Studio edits create versioned, non-serving drafts. Identity, trigger, axis, source, and governance fields remain read-only.
- Status order is draft → editorial-reviewed → owner-approved → serving. This change does not perform any transition.
- Reader fallback order in the stage preview is canonical article → exact Hook/Lived/Turn → facts-only.
- No owner wording approval is inferred from mechanical QA or from inclusion in this package.

## Review wall

The PR must stop for the owner's rendered review. A separate owner ruling is required before any wording can be promoted or any serving switch can be enabled.

## Owner review report: production-parity correction

- Implementation commit: `eda94553`
- Canonical JSON SHA-256: `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750` (unchanged)
- Source/runtime comparison: `wordingDrift: 0`
- Lifecycle: all 305 records remain `needs_review`, `owner_approved: false`, and `serving_enabled: false`

### Contextual overlay result

Lower numeric Priority now wins after suppression. The three-record regression selects, in order:

1. `sky-context/venus/aries/retrograde/mercury-retrograde-aries-priority-10`
2. `sky-context/venus/aries/retrograde/mercury-retrograde-aries-priority-20`

Fallback selection is limited to the priority-10 record. Suppressing priority 10 before selection yields priority 20, then priority 30. Full evidence is in `overlay-priority-evidence.json`.

### Production-parity preview result

The shared resolver now produces family-specific previews for:

- New Moon with cycle context and a direct luminary aspect
- Full Moon with the Moon/Sun axis and `Key aspects`
- exact eclipse with node/series context, Other Conditions, and `Key aspects`
- eclipse fallback using exact → sign/node → generic → facts-only precedence
- continuous placement with contextual overlay, retrograde, and `Aspects shaping this transit`
- zero optional conditions, with no empty headings

Rendered evidence for all four requested page families is in `rendered-review-evidence.md`.

### Real governed aspect result

Content Studio integrates the existing approved record `fallback-hook/sky-aspect-sign/venus/virgo/trine/saturn/capricorn`. Headline and Body create a versioned draft; identity, participants, aspect type, calculated date/orb, key, and governance stay read-only. Approved baseline, provenance, and draft diff remain visible. A valid Venus/Virgo surface renders the draft preview; an unsupported surface omits it. It cannot serve automatically. Full evidence is in `real-governed-aspect-evidence.json`.

### Local verification

- `npm run test:content`: PASS, including posttest SKY V4 regressions
- `npm run qa:admin-bundle`: PASS
- `npm run typecheck`: PASS
- `npm run build:web`: PASS
- Content Studio contract: 14/14 PASS
- SKY V4 canonical stage: 305 records; 120 continuous articles; serving OFF
- Composition Map: 64 templates; 64 traceable previews; zero untraceable
- Admin bundle budget: 499.9 kB raw entry, 140.0 kB gzip entry, 184.9 kB total gzip; PASS

GitHub CI, including Visual smoke, must be green before the owner review wall is considered cleared. No merge, promotion, or serving action is authorized by this report.
