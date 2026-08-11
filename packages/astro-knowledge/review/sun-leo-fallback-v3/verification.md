# Sun in Leo fallback V3 verification

Date: 2026-08-10

## Scope

- Branch base: `origin/main` at `7ebbb13ae168678b68a2c2d51e3cff758e902fd1`.
- Content key: `fallback-hook/sky-sign-copy/sun/leo`.
- Applied package: `owner-package.md`, SHA-256 `3fefae0648de4f7dfacaf8289f49a6ef08ec51b84984c4ddf75053ecb57459af`.
- `sun-leo-fallback-v2` and `sun-leo-close-fix-v1` were not applied.
- `fact_line` remains `{{entryDate}} to {{exitDate}}`.
- `aspect_insert` remains `{{aspectInsert}}`.
- Package version: `v3-2026-08-10a`.

## Copy verification

- The `opening`, `tension`, `development`, and `close` fields are byte-identical to the four owner-package sections.
- The only placeholders in those four fields are `{{entryDate}}`, `{{priorSign}}`, `{{priorSignEntryDate}}`, and `{{exitDate}}`.
- The legacy editorial `body_you` mirror is the mechanical paragraph join of those four exact fields.
- All 55 non-target rows in `sky-placement-owner-approved-fallbacks-v1.json` remain byte-identical to `origin/main`.
- The target row changed only in the four approved fields, the derived `body_you` mirror, and approval provenance metadata.

## Generated artifacts

Regenerated from source:

- `dist/tldr-content.js`
- full, core, and Sky Placement manifests and row bundles
- `bundled-sky-placement-owner-approved-reader-v1.json`
- `content-book.html`
- `data/writing/OWNER_APPROVED_EXAMPLES.jsonl`

The generated diff was stable across a second complete regeneration. Key counts remain unchanged: 7,209 total and 785 Sky Placement.

## Tests

- Package-to-source byte verification: PASS.
- `node scripts/test-sky-placement-regressions.mjs`: PASS.
- `node scripts/generate-fallback-package-manifest.mjs --check`: PASS.
- `node scripts/test-fallback-package-cache-contract.mjs`: PASS.
- `npm run test:astro-writing`: PASS.
- `npm test`: PASS, including typecheck and production web build.
- `npm run test:performance-contracts`: PASS.
- `git diff --check`: PASS.

No serving key, render policy, fact line, aspect insert, or non-target approved copy changed.
