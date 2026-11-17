# Natal aspect editing acceptance

Implemented locally on `fix/natal-aspect-editability-20261117`, based on freshly
fetched main `f21b0b71f78b6c27c29137d20c19ca6f56dc2593` (0 ahead/0 behind at
checkout creation). The owner subsequently authorized committing and releasing
this fix in the owning chat. This document records local acceptance; exact-head
CI and production results belong to the release PR. No live reader-content write
is part of this change.

The code/test fingerprint is
`9f07fcc8fa93747d7290131549caf89fc8d909b63b4342ffa2e72a889e8c4633`:
SHA-256 of sorted modified/new code and test paths, each followed by NUL,
complete file bytes, and NUL. Documentation is excluded. The checkout has its
own `npm ci` dependencies and locally built knowledge package.

## Behavior

- Natal Aspects discovers the exact-source library and all six native
  Sun–Moon entries, including reversed planet selection.
- Exact editors expose You, Friend and optional Astrology hint fields even
  when a field was absent. Editing You keeps its canonical body alias in sync.
- Shared pair writing, both template audiences, aspect explanation/phrasing,
  movement and both planet/point meanings stay accessible alongside exact copy.
- Source cards use the latest saved revision and preview package proposals.
  Native Sun–Moon cards identify the standalone You source and offer a separate
  Friend source where absent. Opening a source creates no content.
- Hint changes use the existing private proposal, conflict and owner-publication
  paths. The reader projection admits only these natal hint fields; editor
  history and private source fields stay excluded. The native App article
  forwards its published hint. Core cache v10 rejects pre-hint overlay caches.
- Native Sun–Moon publication retains the sample/personal-content boundary;
  only the six source-identified reusable keys receive the scoped exemption.

## Local verification

| Criterion | Evidence |
| --- | --- |
| You/Friend/hint edit, save, reload and reopen | Four browser variants, 390/1440 pixels and asserted Studio light/dark themes. Exact opening/ending and independent audience values checked. |
| Shared source navigation and persistence | All seven dependencies visible with an exact passage present; shared You template edit reopens intact, Friend template unchanged. |
| Sun–Moon discovery and Friend authoring | All six native keys selected; native You and hint fields open; a separate Friend-only source saves without inventing You copy. |
| Publication UI regression | Existing new-aspect and approved-Draft publication flows retained, for six focused browser cases total. |
| Actual API and reader | `node --import tsx scripts/test-natal-aspect-editor-fields.mts`: hint save/reopen/publish, stale refusal, unchanged other audience, native publication/refusals, public transport, shipped resolver and actual App article payload. |
| Other affected contracts | Natal placement/Friend and 144 retrograde modifier publication cases; reader privacy/projection of 3,996 admitted fixture rows; Studio inventory visibility; natal serving precedence; source finder; Sky cache upgrade and package cache contract. |
| Types/builds | Admin and Web typechecks, canonical server typecheck; fresh Web and standalone Admin builds. |
| Layout/design | CSS/token/design-system audits; title computed-style parity, no horizontal overflow, screenshots inspected. Shared styles/tokens retained. |
| Bundles/privacy | Web and Admin bundle budgets pass without cap changes. Built Web assets pass the protected privacy policy scan. |

Browser command:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4187 npx playwright test \
  tests/visual/content-dashboard-admin-user-flows.spec.ts \
  --project=chromium-desktop \
  --grep 'natal aspect surfaces remain editable|new natal aspect They copy|an approved natal aspect stuck in Draft' \
  --workers=1 --max-failures=1
```

The configured preview builds the current checkout and refuses server reuse.
Storage and publication writes are isolated fixtures, never production changes.

## Preserved failures and limits

The first handler regression reproduced `astroHint` being rejected as read-only,
then its omission from the public projection. The native publication test also
reproduced the reusable Sun–Moon rejection. All three are covered by passing
regressions after repair. Early browser locator assumptions were corrected.
Visual inspection caught an initial fixture using the reader theme key rather
than the Studio key; final tests assert the actual Studio theme.

An initial preview was blocked from binding its local port. A later overlapping
Admin/Web prerequisite build temporarily removed the generated shared knowledge
export. Builds were serialized before final verification. Initial bundle checks
exceeded the Admin raw entry cap by 27 bytes and Web aggregate gzip cap by 268
bytes; duplicated classification and unnecessary interface text were removed.
No budget was increased. Ad hoc compiler invocations omitted project declarations;
the canonical server/Admin/Web checks passed.

The broader static `test-fallback-refresh-wiring.mjs` still fails at line 758,
expecting an older personal-transit preview expression. The same failure was
confirmed using the unchanged main App source. It is preserved as a pre-existing
failure, not described as a passing check or waived CI gate. The dedicated cache
and source-hydration checks pass. Full-suite and exact-commit CI results are not
claimed by this local evidence; required release gates remain mandatory.

The earlier content audit's quincunx urgency was overstated: the chart display
filters those calculated aspects. Their 63 missing Friend fields are library
coverage, not visible chart-reading assignments. The corrected local report
separates them from the displayed-type writing queue. This change exposes saved
library content without changing chart calculations, display filters or prose.
