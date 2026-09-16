# Calendar Step 4: sign-scoped seasonal phrase sources

## Scope

Step 3 (#848) is merged; this change is integrated with main 412fdff8. It adds owner-only source binding and
preview for the five seasonal aliases in `monthlyPhraseVariables.ts`:
`openingSeasonFocus`, `openingSeasonOpportunity`, `closingSeasonFocus`,
`closingSeasonChallenge`, and `closingSeasonPractice`.

The template keeps its sentence patterns. `sections.calendarSeasonPhraseBindings`
stores a source token name for each alias, not a passage or a resolved value.
The owner can paste a token from Variables / My variables or enter its name.
Existing custom-variable sign and placement overrides remain independently editable.
The same source token can supply both focus aliases; the opening and closing Sun
signs choose different values. The source library's existing priority remains
placement, planet, sign, shared, and the selected priority is shown in preview.

The Calendar preview reuses its authenticated exact-key loader to retrieve only
the referenced definitions. There is no new credential store or whole-library
request. The lookup uses existing calculated period boundaries. Example-sign
mode does not invent an incoming season. A token rename requires explicit
rebinding, consistent with the current My variables rename warning.

Blank matching overrides remain missing. Missing, malformed, ambiguous and
incomplete sources do not fall through to another sign. Source loading failures
remove previously resolved phrase values while leaving unrelated owner writing
visible. Response identity and effect cancellation prevent late responses from
replacing a newer token selection. Source text remains literal and byte-preserved.

## Deliberate boundaries

- No seed prose, owner-copy adaptation, content approval, or publication.
- No changes to calculated astrology, monthly theme selection or event ranking.
- No new public reader resolver. Monthly edition snapshots remain Step 5+.
- No AI generation or Memory Map provider calls; those remain later steps.
- No custom-variable nested-template policy change. Existing overview templates
  can consume these literal phrase leaves; broader definition work in #845/#846
  remains separate and must be reconciled before integration.
- No new runtime dependencies, fonts or product CSS. The measured deferred
  aggregate allocation is documented below; startup and reader budgets stay fixed.

## Verification and release status

The Actions spending blocker has cleared. The earlier integrated-head run
35108267384 completed npm ci, knowledge generation, the seasonal lookup suite,
and the actual-handler save/read-back/concurrency suite. It then stopped at the
CSS audit, before browser tests. Those API/lookup successes are not browser proof.

The token audit treated 13 disconnected historical admin stylesheets as shipped
and reported 2,964 missing references to their retired token aliases. It now
follows the canonical Studio CSS import graph, preserving all reader-style
coverage and reporting the disconnected files separately. Existing architecture
checks still reject noncanonical imports. The regression verifies that importing
an invalid historical sheet fails, unshipped definitions cannot satisfy active
references, nested/cyclic imports terminate, and missing/remote imports fail.
No tokens or debt thresholds were added to silence active violations.

A fresh source/ref snapshot and lockfile-verified npm cache were obtained through
private Actions artifact 10468942076. Each local worktree performed its own
npm ci --offline installation; dependencies were not copied or symlinked between
worktrees. Knowledge generation completed in each before application checks.
The local remote fetch still lacks DNS; source comparison is pinned to connector-
verified main 412fdff8 and Step 4 head 5ef7e77. Repository memory recall succeeded
against that pinned reference after normalizing the same origin URL to its
canonical .git spelling. It is repository evidence, not live Studio feedback.

Isolated builds under identical workflow Supabase environment:

| Build | Aggregate JavaScript gzip |
| --- | ---: |
| main 412fdff8 | 484,425 bytes |
| Integrated Step 4 | 487,523 bytes |
| Feature difference | 3,098 bytes |

Allocate 3,500 bytes to the deferred aggregate, from 484,500 to 488,000.
Entry gzip remains approximately 180.1 kB inside the unchanged 180,250-byte
limit. Raw entry, largest chunk, graph, CSS and all public-reader budgets stay
unchanged. This allocation accounts for the new feature; it does not waive any
behavioral, source-preservation, security or browser assertion.

The isolated lookup/API suites, active-CSS regression and all CSS audits pass.
The fresh-build browser regressions and all hosted integrated-head release gates
must pass before this PR is declared verified. No production content has been
written and no approval or publication state has changed.
