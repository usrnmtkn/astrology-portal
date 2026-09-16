# Calendar Step 4: sign-scoped seasonal phrase sources

## Scope

This change is stacked on Step 3 (#848). It adds owner-only source binding and
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
- No bundle limit increases, new runtime dependencies, fonts or CSS.

## Verification and release status

Preliminary local checks passed for the dependency-light phrase lookup suite,
TypeScript checking of the new helper/hook, and syntax checks of the changed UI
and test files. The helper suite covers separate signs, source priority,
case-sensitive token identity, exact-key validation, missing/renamed/deleted
sources, blank overrides, invalid rows, deterministic results and owner-section
preservation. These checks used archived tooling and are not release evidence.

The isolated `npm ci --offline` prerequisite could not complete because the npm
cache lacked `zod-4.1.11.tgz`; direct GitHub/npm network resolution was unavailable.
A development snapshot workflow also failed before a runner started (run
35065028674, no executed steps). Its cause was not established.

The actual-handler save/read-back/CAS tests and desktop/mobile light/dark browser
regressions have been added but were not run locally. The latter include two
calculated monthly contexts across a year boundary and source-outage recovery.
The dedicated seasonal workflow runs the new lookup and actual-handler tests,
the browser cases and unchanged size limits. The existing unfiltered Studio API
workflow remains a separate required release gate.

Do not merge or report this as live until isolated installation, the full
`test:content-studio-api`, CSS/token audit, browser regressions, bundle budgets,
privacy and all gate-relevant checks pass on the integrated revision. Step 3's
previous green checks are not Step 4 validation. No production row has been written.
