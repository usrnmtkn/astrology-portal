# Sky article CMS layout

The October 31, 2026 owner request calls for a simpler Content Studio and an
article covering the entire Mercury retrograde in Scorpio period. The owner
selected the Shopify editor with a settings sidebar from the Mobbin references.

## Interface

Sky Write-ups opens a selected planet/sign workspace on Articles. A searchable
list shows article title, complete saved period, verified publication status,
updated date, and an editing action. New article opens a period lookup. The
lookup date identifies a period and is not the article's publication date or a
one-day content scope. Placement filters and reader/source diagnostics remain
available through disclosures. Default reading and reusable writing setup retain
their separate content identities.

The article editor puts title, complete content and summary in the writing
column. Save draft and Review & publish are above it. The settings column shows
status, placement, exact calculated coverage, and access to existing article
history/actions. Mobile stacks these sections and gives each article-list field
a visible label. Existing variable-backed documents retain their dedicated
variable editor so this layout cannot flatten their saved source values.

## Period contract

The facts API accepts `period=current` or `period=visit`; the existing default
remains `visit` for other callers. The new article workspace requests `current`.
For a displayed retrograde, current coverage intersects the verified
station-to-station window with the current continuous sign visit. Missing
stations stop article preparation. Direct placements retain their continuous
sign visit. Calendar, Sky reader timing and the calculation engine are unchanged.

The writer's preparation and explicit generation request carry `articlePeriod`
through the same facts adapter. No generation starts when opening the workspace.
A returned period must be verified. Existing saved articles preserve their
coverage and complete copy. If a matching start-date identity has different
coverage, preparation refuses to relabel or overwrite it.

The actual Swiss API regression checks October 25, October 31, and November 10,
2026 against the same expected Mercury interval: October 24 at 07:12:42.999 UTC
to November 13 at 15:53:52.999 UTC. Snapshot fixtures also cover missing stations,
return visits and unchanged direct placement windows.

## Publication timing

The November 2 owner follow-up adds independent publication dates. A saved date
alone does not approve or publish copy. Approve & schedule validates the complete
saved article and records its exact wording, source version, owner action and
release time while keeping it DRAFT. The authenticated minute cron revalidates
that same version through the normal publication path when due. It publishes no
earlier than the selected time; execution can follow the next scheduled tick or
recovery from an outage. No writer or paid generation runs.

A scheduled revision leaves the live target untouched until atomic publication.
Changing the draft cancels its scheduled approval. Cancellation preserves a
private draft. An outside target edit or failed dependency check holds the
replacement for owner attention. Object key order after a JSONB round-trip does
not invalidate unchanged wording. Normal version checks prevent stale writes
and racing cancellation from overwriting a newer state.

A previous publication date publishes now with that stored date; actual approval
and execution timestamps remain in the audit metadata. A live article's date can
also be corrected without changing its wording or original approval. Future
replacements start as private drafts. The input names the browser's time zone,
saves an absolute instant, and rejects invalid local times. These controls never
change the calculated astrology window, title, summary or body.

## Verification

- `npm run test:sky-placement-workspace`: actual-handler draft creation,
  persistence, conflicts, protected source preservation, plus authenticated
  period calculation, scheduled release/backdating, exact reader retrieval,
  cancellation, JSONB key order and invalid/anonymous/stale request refusal.
- `node --import tsx scripts/test-sky-article-facts.mjs`: period adapter fixtures.
- `node --import tsx scripts/test-sky-article-facts-node-runtime.mjs`: deployment
  module imports and Swiss asset packaging.
- `npx playwright test -c playwright.sky-cms.config.ts`: fresh standalone build;
  desktop/mobile and both themes; list discovery, heading/body typography,
  existing-copy preservation, save/reload, filtering, existing-period lookup,
  concurrent edits, empty state, calculation failure, new draft creation,
  saved scheduling, cancellation and backdated publication/reload;
  existing article writer/export handoff.
- `npm run qa:css-audit`, admin and server typechecks, and the full
  `npm run test:content-studio-api` gate.

Browser write tests use the actual handlers with isolated storage and synthetic
copy. The period API test uses the local Swiss engine. These checks do not mutate
production documents, incur a paid generation, or establish a production release.

## Initial local results on October 31

Verified on `codex/sky-cms-layout-20261031`, based on `fe6117eef` with the
uncommitted implementation diff. The nine dedicated CMS/writer browser checks,
four existing Moon workflows and four existing planet/sign workflows passed.
Admin/server typechecks, CSS audit, calculation fixtures, plain Node deployment
imports, and actual authenticated period API checks passed.

The full Content Studio API command reached the existing durable Weekly batch
regression, then stopped with a save-deadline 504 in
`test-horoscope-durable-batch.mts`. That unchanged test passed in isolation.
The full command has not completed successfully; a clean unfiltered API gate is
still required before merge. No commit, pull request or deployment was made.

## Release follow-up

The clean release branch is `codex/sky-cms-release-20261102`, based on refreshed
main `308140c447e914d39035b953fa85f660ece46512`, with its own `npm ci`. The final
local and exact-head CI results are recorded in the release PR. The added
`sky-cms` Studio CI matrix runs the nine dedicated browser cases. Both bundle
budgets retain their existing limits; publication controls load with the editor.
The protected source fixtures and privacy policy stay outside Git.

`playwright.sky-cms-deployment.config.ts` exercises the same workflows against
the deployed main app at `/admin/content`. Every write is intercepted by the
isolated actual-handler store. It verifies deployed assets and interactions,
not production content mutation or a live paid generation. Authenticated live
facts checks remain read-only. Deployment evidence must identify main's merge
SHA and a READY Vercel production deployment before claiming release.

The Vercel prebuild also runs the editor navigation guard. Publication-result
refresh uses the existing saved-row refresh path outside the rendered controls;
opening a related source retains the editor's named return navigation. The
prebuild component-consistency check covers that boundary.
