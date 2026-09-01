# Content Studio handoff

Package: `CALENDAR-ASPECT-CONSEQUENCE-FIRST-CONTENT-STUDIO-2026-09-01`

This handoff is intentionally non-serving.

## Materialize locally

```bash
node scripts/stage-calendar-aspect-content-studio-drafts.mjs \
  --out=/tmp/calendar-aspect-content-studio-drafts.json
```

Expected result: 48 rows, split 24 composed Calendar cards + 24 Venus/Saturn square sign-specific hooks.

## Stage into Content Studio

With the normal Content Studio Supabase environment configured:

```bash
node scripts/stage-calendar-aspect-content-studio-drafts.mjs \
  --apply \
  --verify-remote
```

The command upserts only `mode=studio-draft` rows. It does not update `composed-cards-v1.json`, `sky-aspect-phrasebook-v1.json`, or any current serving row.

Remote verification requires every staged row to remain `DRAFT`, `reference`, `owner-review-required`, `readerServing=false`, and `stageOnly=true`. Any mismatch is a hard stop.

## Promotion wall

Do not promote these drafts merely because they exist in Content Studio. A later owner ruling must identify the exact approved wording. Serving promotion must then be a separate, reviewable change against the current baseline.
