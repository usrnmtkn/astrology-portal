# Cursor prompt: import Astro 101 into Content Studio

Paste this into Cursor with the tldrastro repo open.

---

Import the Astro 101 education content into Content Studio.

The rows and the importer are already in the repo, untracked:
- `data/astro-101/astro-101-rows-flat.json` (33 rows: 9 chapters, 12 sign pages, 12 house pages)
- `data/astro-101/astro-101-rows.json` (same content with a `sections.blocks[]` structure, for later, do not import this one yet)
- `scripts/import-astro-101-education-rows.mjs`

Step 1. Dry run from the repo root. It validates and writes nothing:

```
node scripts/import-astro-101-education-rows.mjs --source=data/astro-101/astro-101-rows-flat.json
```

Expect: `validation passed` and `by kind: { chapter: 9, sign: 12, house: 12 }`.

Step 2. Import for real. Needs `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`, which the script reads from `apps/web/.env.local` when run from the repo root:

```
node scripts/import-astro-101-education-rows.mjs \
  --source=data/astro-101/astro-101-rows-flat.json \
  --approve --out=$(pwd)/data/astro-101/astro-101-import-audit.json
```

Rows upsert on `content_key` in one batch of 33, with `resolution=merge-duplicates`, so re-running is safe and idempotent.

Step 3. Verify in Content Studio at `/admin/content#articles`. Filter for `education/astro-101`. Expect 33 rows, each `status=DRAFT`, `mode=article`, `block_type=essay`, `lane=serving`, `surface=natal`, `review_state=needs_review`. Open `education/astro-101/sign/aries` and confirm headline, summary and body are populated and editable.

Notes:
- Editable fields for these rows are headline, summary and body. Body holds the whole page as plain text with the section headings inline. There is no markdown in any display field, deliberately: the reader splits body on blank lines into paragraphs and has no markdown renderer.
- `sections` carries only a package record, and `facts` carries the fact list, the planned slug and the related-page links. Neither is editable in the admin UI, and both survive a normal save.
- Do not import `astro-101-rows.json` (the blocks variant) until an education renderer exists. The compiled-edition save path in `api/admin/generated-content.ts` around line 1258 replaces the whole `sections` column rather than merging it, so `blocks[]` on an editable row can be silently dropped.

If the import fails, report the exact error rather than editing the rows file. The validator is strict on purpose: enum values, key prefix, duplicates, empty display fields and markdown artifacts.
