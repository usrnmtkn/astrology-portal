# RATM lunation horoscope integration

The [October 30 follow-up](lunation-studio-publication-2026-10-30.md) resolves the
initial book provenance, local private-evidence and eclipse-publication gaps.

Local work on `codex/ratm-lunation-horoscopes-20261029`, based on
`a8e89c62c7495c0a776fd4131a92b4b54179d91d`. Changes are uncommitted and have
not been deployed. Production was inspected read-only; no owner content was changed.

## Location and cause

Content Studio → Sky Write-ups → Placements & lunations → open a New Moon or
Full Moon → Rising-sign horoscopes → Edit source beneath the desired rising sign.

The deployed related-source panel selects the older frame, house opening,
jurisdiction and compact-sign hooks. The existing approved RATM cells are a
different content-key family. The public lunar article builder also omitted its
`risingHoroscopes` field. This is an integration gap, rather than browser caching.

The local change selects the existing twelve exact RATM cells for each ordinary
lunation, loads their saved documents or package originals, and opens each through
the existing source editor. Drafts preview their saved proposal; publishing uses
the existing version-checked package approval. The reader loads this code and the
book bundle on demand, prefers published source revisions, and respects retirement
and unavailable pinned versions. Complete article-specific horoscope sections
take precedence. Eclipse composition retains its separate contract.

The subsequent [full chart wiring audit](content-studio-chart-wiring-audit-2026-10-29.md)
also connects published exact book revisions to the shared fallback package loader,
so the shipped lunation renderer receives them outside the dated article. Source
discovery now includes package-only complete passages in the Composition map.

## Acceptance evidence

| Criterion | Result and evidence |
| --- | --- |
| Existing source coverage and complete copy | Passed: 288 identities across both phases, all twelve lunation signs and all twelve rising signs. All 288 baseline bodies equal their current canonical source entries; reader and Studio match the serving bundle, including the existing Virgo/Gemini astrology-boundary correction. |
| Studio discovery and source editing | Passed: actual rendered Sky Write-ups navigation, twelve RATM sources, original opening and final text, complete editable body. |
| Save, reload and publish | Passed: actual handlers with isolated storage, saved draft recovery after reload, Save & publish, current reader status and exact reader payload. Stale writes are rejected. |
| Loading and failure recovery | Passed: failed source lookup exposes Retry horoscopes; retry loads all twelve sources without old template previews. |
| Guest reader articles | Passed: New Moon in Cancer on July 14 and Full Moon in Taurus on October 26, 2026; twelve rising-sign passages, complete first-passage opening and ending, direct navigation and reload without a saved chart. |
| Responsive layouts | Passed: 390px and 1440px, light and dark, editor and reader containment. |
| Publication precedence | Passed: article-specific complete horoscopes win; retired or unavailable published source revisions do not reveal an older book original. |
| Source preservation | Passed: no changes under the protected fallback source rows or knowledge package. No PDF or newly written astrology copy was imported. |
| Deployment | Unverified: local changes only. The live Studio still displays its previous implementation. |

Commands run successfully:

- `node --import tsx scripts/test-lunation-article-horoscopes.mts`
- `npx playwright test -c playwright.lunation-horoscopes.config.ts` — 12 passed on the final implementation, including Save & publish.
- `node --import tsx scripts/test-admin-sky-writeup-relations.mjs`
- `node --import tsx scripts/test-content-live-status.mts`
- `node --import tsx scripts/test-studio-package-source.mjs`
- `node --import tsx scripts/test-cross-surface-admission.mts`
- `npm run test:reader-copy-boundary`
- `npm run typecheck`, `npm run typecheck:server`, fresh web and admin builds
- `npm run qa:css-audit`, `npm run qa:admin-boundary`, `npm run qa:bundle`

Broader checks that do not pass in this checkout:

- `npm run test:content-studio-api` reaches three approved-voice checks that fail
  with `INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE`. The required protected
  ingress references were not available. No evidence gate was weakened.
- `npm run test:lunation-book` stops at the existing source-file hash mismatch:
  the generated record contains `12f722a7e6de1a18d250f4ee52aa4545fecaeca62182bca92e7daf9dcae1dd21`,
  while the current source file hashes to `817613ab7b9faa0a059c7a0b1440841bc3799af600c2018bce71385233cb819e`.
  The same values are present in the base revision. All 288 passage bodies are
  identical between the current canonical source and the generated records.
  This change does not regenerate or approve those content artifacts.

Private test logs remain outside Git under `/private/tmp/ratm-lunation-20261029/`.
No full API, hosted CI, merge or production-release success is claimed.
