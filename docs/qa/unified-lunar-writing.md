# Unified lunar writing verification

September 27, 2026 integration on `codex/unified-lunar-writing`, based on
`31d1c7deb` and main `8f9fdfc17`. The new dated editor joins the reusable writer
under Calendar Write-ups > New & Full Moons & Eclipses. See the
[workflow and source-selection contract](../writing/LUNATION_ARTICLE_STUDIO.md).
Before release, the two feature commits were rebased onto main `99058edae`.
The shared writer retains main's sign-specific horoscope schema and gives dated
lunar articles their own headline/body schema. The integrated API and browser
checks are rerun before merge; exact-head hosted results belong to the PR.

Local verification uses this checkout's own `npm ci` dependencies and generated
knowledge package. Synthetic stores and model responses avoid production
content edits and paid generation.

- The full `npm run test:content-studio-api` gate passes, including actual lunar
  handlers, saved guidance and exact-key feedback freshness, four calculated
  event types, one durable generation request, version conflicts, reserved-key
  protection and the ordinary reader publication handler. The dated handoff
  copies the complete saved body to DRAFT and preserves any existing reader edit.
- Fresh reader browser verification passes all ten Calendar preview cases,
  including New/Full Moon reusable text and dated articles at 390/1440 pixels
  in light/dark themes. Opening and final sentences match the same saved body
  after Calendar expansion and direct navigation to the Sky lunar article.
- All eight cases in the two editor browser suites pass, covering saved guidance, exact saved copy,
  generation recovery, the reader-editor handoff, unsaved navigation and shared
  heading typography. Release results must be recorded for the exact PR head.
- Application/admin typechecks, reader-copy boundaries, CSS/token audit,
  deployment asset inclusion, memory source packaging and all 21 memory tests
  pass. Public web/admin asset privacy scans pass.
- Fresh workflow-environment admin build: 218.1 kB entry gzip, 748.9 kB entry
  raw, 752.7 kB aggregate gzip. Isolated main with the same environment measures
  217.8 / 747.7 / 743.7 kB. The combined feature retains the earlier 5 kB reusable
  editor allowance and adds 5 kB aggregate for the dated view. Entry, largest
  chunk, graph and forbidden payload limits remain unchanged. All three lunar
  editor modules remain outside the static startup graph.
- Matched web builds measure 3,476,498 baseline and 3,487,034 integrated aggregate
  JavaScript gzip bytes. The 12 kB allowance covers both deferred Studio editors
  and the shared reader selector. Shared chunk repartitioning adds 14 bytes to
  SkyDetailArticle (5,939 to 5,953); its allowance increases by 50 bytes. Reader
  startup, CSS, other chunks and runtime-performance caps remain unchanged.

The broad writing suite reaches the existing protected voice-document hash
assertion at `tests/astro-writing/harness.test.mjs:159`. An unchanged isolated
checkout of main `8f9fdfc17` reproduces the same expected `8ac0a55b…` versus actual
`0346f9c9…` mismatch. The protected document and assertion remain unchanged.
The later Gemini adapter, writing kernel, grammar and both card-judge checks
were run separately and pass. The lunar-specific writing checks also pass.

Derived owner-example and evidence-index artifacts were regenerated from the
unchanged source bank to satisfy their existing freshness gates. No source
reader passage or protected voice standard was rewritten. Background Responses
API transport now lives in the canonical transport module, used by all three
Studio generation endpoints, rather than adding drift-guard exemptions.

Local checks do not establish production deployment or the quality of a live
model's prose. Require the hosted Content Studio API contract on the exact PR
head, main's Git deployment, and the deployed editor/reader browser regressions.
No test result approves generated wording or publishes an owner draft.
