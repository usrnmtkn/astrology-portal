# Codex prompt — controlled "replace legacy with v3 DRAFT" import

Goal: replace the legacy dashboard fallback/vocab content with the v3 phrasebank rows, as
DRAFT. Nothing flips LIVE. A human signs DRAFT → LIVE later per the sign-off checklist.

Source: refresh `tldr-astro-phrasebank/` from `tldr-astro-handoff-20260714-v3.zip` first.

## 0. Safety assertion (abort on failure)
Before touching any existing row, assert that **no row involved in a conflict or a
demotion carries `tier = CONFIRMED` or a `source_snapshot`/provenance pointing at
`ms-*` / `marie-confirmed*`.** Those are Marie's verbatim, serve-verbatim rows and must
never be archived, overwritten, or demoted. If any conflict row is CONFIRMED, stop and
report it — do not proceed. (By construction every fallback-hook and vocab row is
REVIEWED/DRAFT, so this set should be empty; assert it anyway.)

## 1. Resolve the collisions
From the v2/v3 dry-run: 11 fallback rows blocked by LIVE legacy, 4 fallback + 12 vocab
blocked by existing DRAFT with different text.

- **11 LIVE legacy fallback rows** → set `status = ARCHIVED` (archive, do not delete).
  These are old `fallbackHooks.ts` placeholders, not authored content.
- **4 fallback DRAFT + 12 vocab DRAFT collisions** → overwrite with the v3 text. v3 is
  canonical (slot-template hooks + cleaned/extended vocab). Do not keep both; the older
  DRAFT is superseded.

## 2. Map the ingress rows
Map `cc/ingress/{planet}` → `fallback-hook/sky.ingress.{planet}` (the 10 new per-planet
ingress templates in v3). This clears the 10 unmapped ingress rows. Keep the generic
`fallback-hook/sky.ingress` as the ultimate fallback for any unlisted body.

## 3. Import
Insert all eligible v3 rows as **DRAFT** (`status = DRAFT`, `lane != serving`,
`tier = REVIEWED`). The serving predicate stays untouched:
`status = LIVE AND lane = serving AND review_state IS NULL AND not blocking-flagged`.

## 4. Leave parked
The 52 asteroid rows (Ceres/Pallas/Juno/Vesta) stay unmapped — that's a separate task to
wire them into the calculated/generated body list. Not part of this import.

## 5. Do NOT flip anything LIVE
No production serving change. Everything lands DRAFT for human review.

## 6. Verify
- Re-run the dry-run. Expect: unmapped drops by 10 (≈52 remaining, all asteroid);
  fallback hooks 0 blocked (was 15); vocab 0 blocked (was 12).
- `node --check scripts/prepare-tldr-astro-store-import.mjs`
- `node scripts/test-tldr-astro-store-import.mjs`
- Report inserted / archived / overwritten counts and confirm 0 rows flipped LIVE.
