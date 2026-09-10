# Composition lifecycle audit — 2026-09-10

The owner requested an audit and removal of superseded compositions after Sky
placement natal aspects disagreed with the better You Transit writing. The
request is recorded in task `01a08cdf-ebab-7761-8d18-4e57a820487a` on 2026-09-10.
This authorizes removal of obsolete serving paths; it does not approve new prose.

Worktree: `codex/composition-retirement`, based on current `origin/main`
`83c96331` (0 ahead / 0 behind when refreshed). The original audit started at
`1994179f`; the fix was then applied cleanly to a fresh checkout after #741,
#742 and #743 merged. This checkout has its own `npm ci` dependencies and
regenerated artifacts. The original worktree was preserved.
The owner authorized merge and production release in the same task. Release
checks and deployment evidence are recorded in the release PR. No remote
mirror synchronization has been performed by this audit.

## Findings and disposition

| Path | Finding | Resolution |
| --- | --- | --- |
| Sky personal natal aspects | House-first helper displaced the exact You article; separate time anchors produced different end dates. | Shared personal transit selector, local-noon calculation snapshot, full paragraph rendering, and matching timestamp guards. |
| House-transit embedded aspects | The same obsolete house-event helper was still called by the package. | Removed the helper/export from both resolvers; embedded events select complete canonical aspect/return units. |
| Personal Transit Studio preview | Studio reconstructed four old source fragments independently and could preview a draft as effective reader copy. | Uses an authenticated server preview with the shipped reader resolver, shared published-row packaging, return policy, and reader copy boundary. Refreshes after content updates; links to the actual selected source. |
| Personal-aspect CMS overrides | Studio still offered a separate house-aware override starter after the reader no longer needed it. | Removed key builder, starter, editor action and surface-map route. Historic searches still lead to Personal Transits. |
| Compiled Sky natal-aspect fallback | A separate selector could revive old prose after the canonical source was unavailable. | Removed selector and dead reader fields. Historical immutable article edition schemas and content are retained. |
| Seven transit-house-event frame rows | Original approved text remained in source files. | Immutable source records retained; retirement guard excludes them from serving, reader partitions, active composition maps, hook catalogs and the content book. Materialized rows are reference-only. |
| Shared wants/natal/scenes/effect hooks | Old family names also supply canonical fallback readings without exact authored coverage. | Retained. Deleting them would create source gaps. |
| Studio source maps | Personal-aspect and house maps omitted current authored sources while exposing old key families. | Maps now include exact aspect/return and layered house source families; retired keys are excluded. |
| Other writing surfaces | Audited the current materialized catalog against all 24 surface maps and inventoried 28 transit/synastry resolver capabilities and their consumer references. | Retained active composers and shared fallback units. Lack of a direct application reference alone does not establish that a public package export is safe to delete. |
| Generation pipeline | `api/_lib/content-generation.ts` still uses `legacyPrompt` inside the governed meaning-plan and role-gated generation path. | Retained; the variable name does not represent a disconnected old generator. |

The permanent key policy lives in
`apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs`.
It is checked by Node/browser eligibility, publication guards, reader lifecycle
state, Studio live status, both publishing APIs and the mirror materializer.
Even a stale LIVE record or `allowUnreviewed` preview cannot reactivate these
identities. Archive/history access remains available.

No owner-authored source body was edited. Package version is
`v3-2026-09-10f`; distribution artifacts, catalog, content book and unresolved
inventory were regenerated. The seven retired rows are historical records,
not new editorial work for the owner.

## Evidence

The reproducible inventory is
[composition-lifecycle-audit-2026-09-10.json](composition-lifecycle-audit-2026-09-10.json).
Run `node --import tsx scripts/audit-composition-lifecycle.mts` to verify the
24 surface maps, seven retired reference rows, 19 shipped indexes/partitions,
and removed runtime entry points.

The original mismatch analysis and calculation fixtures are in
[sky-you-transit-parity-2026-09-10.md](sky-you-transit-parity-2026-09-10.md).
Verified in the fresh current-main checkout (`83c96331`):

- `npm run test:content-studio-api`: passed, including actual handler CRUD,
  stale-write protection, publication eligibility and retired-key rejection.
- `test-content-publication-api.mts`: passed; stale explicit publication cannot
  restore retired keys. Create, update, bulk import and approval-action paths
  reject retirement with zero writes in isolated storage tests.
- Fresh `build:web` + Playwright: eight cases passed (33.2 seconds). Sky/You
  matching passages and dates; Studio full opening/final sentence, draft
  exclusion, selected-source editor, source gaps and house independence.
  Desktop/mobile and both application theme settings were exercised. Studio
  retains its existing fixed dark palette; the setting does not recolor it.
  Existing finder and preview heading roles were compared and preserved.
- App-facing matrix: 2,436 aspect/motion cases passed, with four shared source
  gaps for unapproved Sun/Uranus returns. No replacement prose is invented.
- Node, browser source and shipped resolver: 120 house/aspect/voice fixtures
  passed, plus return and retirement cases. Studio uses the same shipped source.
- Lifecycle inventory: 24 surface maps, seven historical retired frame rows,
  19 clean shipped indexes/partitions, 28 resolver capabilities inventoried.
- Studio source relationships, navigation, source maps, hook catalog packaging,
  immutable article compilation, typecheck (via build), CSS/token audit and
  `git diff --check`: passed.
- Source-file comparison: no changes to canonical source-row files or
  `packages/astro-knowledge/data`.

The complete content gate is not claimed green. The historical Friends
signoff hash mismatch (`84bcb934...` versus `9ae494a7...`) reproduced on the
current base and on the original untouched baseline. The separate
`test-fallback-refresh-wiring.mjs:326` also still expects the pre-refresh
Chiron/Jupiter opening instead of the current approved article. Neither was
fixed by changing protected copy or approval evidence. The obsolete transit
composition assertions themselves were replaced with canonical parity checks.
The final `npm run test:content` run in the `83c96331` checkout passed its
prerequisites and stopped at `test-friends-owner-signoff-ruling.mjs:161` with
that same historical hash mismatch; the full suite did not run to completion.
These existing failures are documented separately from the passing targeted
checks. The Friends failure is also recorded in the earlier
`fallback-placement-identity-audit-2026-09-08.json` and
`sky-evergreen-sections-2026-09-08.md` audits. No approval evidence or authored
copy was changed to make these checks pass.

This audit does not certify that every possible reading is error-free. It
removes the demonstrated competing paths and adds checks against their return.
A production claim requires a main-branch deployment and the same browser
regressions against its URL; no production data was changed in this audit.

Release hardening: the standalone Studio bundle check caught the initial preview
importing the complete reader package. The preview now runs in an authenticated
API using the same extracted row-packaging function as the reader, with
request-scoped publication state. Handler regressions cover published updates,
draft exclusion, retirement, stale revisions and unavailable storage. The
standalone Admin bundle passes its unchanged budgets.
