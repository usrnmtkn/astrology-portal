# Placement article phrase variables verification

Date: 2026-09-14 UTC.

Implementation worktree: `/Users/mprez/Code/tldrastro-article-phrases`.
Release PR: #799 (`codex/placement-article-inline-vars`). This worktree combines
the earlier remote implementation with local preparation, publishing, and browser
fixes. The owner authorized merge and production deployment on 2026-09-14 in
Codex task `01a09d87-b080-7873-a45b-81373e2b0a0b`. Exact release checks and the
production result are recorded on the PR after execution. No production content
writes or editorial approval are part of this code release.

## Result

Placement article, Direct placement article, and Retrograde placement article
accept calculated facts and registered/custom Writing Library phrase tokens.
The article's Variables action opens the two scoped groups. Insert replaces the
selection and restores the cursor while retaining the literal token. Pasted and
inserted phrase tokens prepare the library in the placement draft; switching
writing sections during preparation preserves the result and existing text.
Preparation preserves the composition's enabled state and module order. Editing a
local phrase stays in the same unsaved article draft and updates its preview.

Preview and reader resolution use the same shared source contract. Missing
phrases block publishing, including when composition is disabled or absent.
Planet links require the same planet, sign links the same sign, and placement
links the same complete placement. Links remain one-hop and hash-pinned.
Source drafts cannot change approved reader copy. A changed published source
requires explicit relinking and article publication; stale links fail closed.
Local governed prefill remains a local draft copy; sharing uses exact source
links through the existing Writing Library tools.

The shipped resolver version is `v3-2026-09-14a`. The browser artifact, package
manifests, content book, and knowledge index were regenerated. Authored inputs
and source-row files have no diff against main.

## Passing verification

- Isolated `npm ci`; workspace knowledge package built locally.
- `npm run test:sky-evergreen-sections`.
- `npm run test:content-studio-api`; the added shared-source handler regression
  also passed directly after being added.
- `npm run test:reader-copy-boundary` (19,177 fields, no findings).
- Admin and web typechecks and builds.
- `npm run qa:css-audit`, including the canonical Studio CSS architecture check.
- Node, browser-source, and shipped-artifact article parity, including literal
  replacement characters, malformed/unknown tokens, missing values, motion
  variants, source scope, nonrecursive expansion, and stale link refusal.
- Actual handler → published storage fixture → actual reader loader → installed
  reader: repeated edits, exact Sun/ Virgo/ Sun-in-Virgo source resolution,
  unchanged dependent copy during source drafting, changed-source refusal, and
  reviewed relinking.
- Eight fresh-build Studio browser cases: 390/1440 widths, light/dark themes,
  automatic/existing libraries, selection replacement, cursor restoration,
  switching sections during loading, preview, and missing/unknown variables.
- Two fresh-build reader browser cases: shared and retrograde article templates,
  actual ephemeris dates, aspect dependencies inside phrases, opening/final text,
  and no unresolved tokens or page errors.
- Generated knowledge and phrase index checks, release-path freshness contract,
  and `git diff --check`.

## Known baseline failures

`npm run test:content` stops at the existing protected natal-aspect projection
assertion in `scripts/test-natal-exact-copy-routing.mjs:49`. Direct calculation
from the exact `origin/main` Git objects reproduces the same mismatch:

- Actual: `7469bac8e7742fe8e0a31ec8e002d8cca923e238fa75d226c60918d8e1784789`
- Expected: `087d8486c7e82b66da9b5bb115114ef1e0780f36328ca7429c5a06b17e7147d1`

Bundle checks also fail on unchanged main, verified with a separate detached
main worktree and its own `npm ci`. Admin artifact comparison uses direct Vite
assembly because main's normal admin build stops on the stale CSS imports fixed
by this continuation. This comparison is diagnostic, not a passing release gate.

| Budget | Unchanged main | Feature | Limit |
| --- | ---: | ---: | ---: |
| Admin entry, raw | 628.5 kB | 628.8 kB | 625 kB |
| Admin entry, gzip | 179.6 kB | 179.7 kB | 178 kB |
| Admin largest chunk, raw | 1,459.4 kB | 1,459.4 kB | 625 kB |
| Admin total JS, gzip | 812.0 kB | 817.3 kB | 448 kB |
| Web signup chunk, gzip | 4,008 bytes | 4,009 bytes | 4,000 bytes |

No hash assertion or bundle threshold was weakened. The full content suite has
not completed beyond its first failing assertion. The API workflow now runs without path filtering or merge-message skips so the
required contract can run on each PR head and main revision. The former branch
implementation scripts and self-mutating workflow are removed.
