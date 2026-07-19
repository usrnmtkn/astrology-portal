# Aspect Pattern Write-ups Admin Report

This pass moves authored natal and Active Now aspect-pattern write-ups into an editable admin content surface.

It does not change aspect-pattern detection, orb rules, pattern IDs, roles, derived points, ranking, activation scoring, interpretation-context builders, copy slots, resolver precedence, reader layout, or approved fallback wording.

## Files Changed

- `api/admin/aspect-pattern-writeups.ts`
- `apps/admin/src/AspectPatternWriteups.tsx`
- `apps/admin/src/GeneratedContentAdminDashboard.tsx`
- `apps/admin/src/admin.css`
- `scripts/test-aspect-pattern-writeups-admin.mjs`
- `package.json`
- `packages/astro-knowledge/docs/aspect-pattern-writeups-admin-report.md`

## Persistence Path

Editable records save through the existing `generated_interpretations` content repository.

Each saved row uses:

- `content_key`: `aspect-pattern/natal/{pattern}` or `aspect-pattern/activation/{pattern}/{role}`
- `surface`: `natal`
- `mode`: `article`
- `event_type`: `aspect_pattern_natal_writeup` or `aspect_pattern_activation_writeup`
- `source_snapshot.sourceType`: `aspect-pattern-authored-record`
- `source_snapshot.record`: the resolver-compatible authored record

Draft rows stay `DRAFT`, reviewed rows stay `REVIEWED`, approved rows save as `LIVE`, and deprecated rows save as `ARCHIVED`.

## Records Materialized

Natal Write-ups exposes the six authored natal records:

- T-square
- Grand Square
- Grand Trine
- Kite
- Yod
- Mystic Rectangle

Active Now Write-ups exposes the eight authored activation routes:

- T-square: apex
- T-square: opposition member
- Grand Square: member
- Grand Trine: member
- Kite: focal planet
- Kite: resource planet
- Yod: apex
- Mystic Rectangle: member

## Admin Surface

The main route is:

```text
#content/aspect-patterns
```

The Active Now deep route is:

```text
#content/aspect-patterns/activation
```

The page includes tab switching, coverage summary, filters, search, governed field editors, slot insertion buttons, status workflow controls, and a production-resolver preview panel.

## Preview And Validation

Preview requests call `POST /api/admin/aspect-pattern-writeups` with `action: "preview"` and use the real production resolver plus the real validation functions.

The preview shows:

- final resolved authored write-up
- approved fallback comparison
- selected record ID
- selected content level
- selected template ID
- changed fields
- missing slots
- skipped sections
- validation warnings and blocking errors

Approval is blocked server-side when validation fails.

## Verification

- `npm run test:aspect-patterns-writeups-admin`
- `npm run typecheck -w @tldr/admin`
- `npm run build:admin`
- `npm run test:aspect-patterns-authored`
- `npm run test:aspect-patterns-activation-authored`
- `npm run test:aspect-patterns-copy`
- `npm run test:aspect-patterns-activation-copy`
- `npm run test:natal-aspect-pattern-reader`

## Deferred Work

- direct database migration/backfill for persisted dashboard rows in hosted environments
- richer fixture picker inside the editor
- inline field-level highlighting for each validation phrase
