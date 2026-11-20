# Natal placement pattern and complete aspect editing

Owner direction: `thread:01a1fa37-6d7e-7942-9aa1-c7260a84bb59`, 2026-11-20.
Natal planetary placement pages must retain the same design system and Gifts /
Challenges pattern. The owner also reported that the Sun–Mercury aspect editor
omitted the closing sentence visible in the reader.

Initial candidate: `712631232ee911b72328650ac6792f89a08302cc` on
`fix/natal-aspect-complete-editor-20261120`, initially based on
`28489df1c937c5195bb5946b351721c2a5ac3f6b`. Final integration, frozen-head gates
and production evidence are recorded in the release handoff. Earlier local
source fingerprints do not identify the later release corrections.

## Causes and repair

- The aspect editor opened a pair hook. Its closing sentence belongs to the
  shared natal-aspect template. Edit complete write-up now uses the shipped
  reader renderer and published source selection to populate both audience
  fields in an unsaved exact-passage draft. A publication outage or source gap
  cannot open a partial draft. Existing save and owner-publication actions apply.
- Natal aspect rows had been grouped by counterpart kind. You and Friends now
  use one shared `NatalPlacementAspects` component for Gifts / Challenges cards.
  Existing aspect classification and uncapped, calculated contacts are retained.
  Empty categories stay omitted; the synthetic Pluto fixture has only Gifts.
- Generic house headings repeated the full article title and were removed by
  heading deduplication. House headings now always use planet + house, for both
  exact and generic sources. Their existing typography and spacing are retained.

No reader source prose, calculation, content approval or production data changed.

## Regression review and prevention

Git history identifies the grouping change in
[`2146a9e23`](https://github.com/usrnmtkn/astrology-portal/commit/2146a9e23840f6b138ca4fca18c807a7d2de049d),
August 20, 2026. A functional repair removed natal aspect count limits, but also
introduced the counterpart groups in the shared builder and both article
renderers. Those are separate product decisions: completeness does not require
replacing Gifts / Challenges. The same commit added a source assertion requiring
`grouping: "counterpart"`. Later browser expectations also required Planetary
aspects. Passing those tests therefore reinforced the changed design. This is
code and test provenance; the commit alone cannot establish any separate owner
design approval.

The source-dependent house-heading branch was introduced in
[`a5c2e5fc5`](https://github.com/usrnmtkn/astrology-portal/commit/a5c2e5fc5d1fde65f868d97741c54c89dcbf51db),
August 12, 2026. Exact house sources received a planet-and-house heading;
generic sources received the complete sign-and-house title. The article heading
deduplicator treats that second form as a repeat of the page title and removes
it. Sun and Uranus consequently differed even though their page builder was
shared. Source provenance had leaked into visual presentation.

The verification gap was coverage of approved structure across source kinds.
Token audits can reject raw styling values while still accepting the wrong
group names, missing sections or a uniform change to every page. The initial
new all-planet test compared heading styles between planets; that alone could
also pass if every planet changed together. Its assertions now additionally
pin the existing article typography, surface colors, card radius, padding and
width at both viewports and themes. The original approved prose and uncapped
contact checks remain in place. These assertions are in the existing
CI-registered client-facing spec, so the protection is not limited to an optional
manual command.

The reusable [design-preservation command](preserve-design-command.md) separates
functional work from authorized design changes, covers source-dependent
presentation, and requires comparison with an approved reference before changing
test expectations. `AGENTS.md` points agents to it. `npm run qa:natal-design`
runs the shared CSS audit and all four rendered ten-planet cases from a fresh
local preview by default. Other product surfaces retain their affected journeys;
this command does not claim whole-site visual coverage.

Instruction walkthrough: inventory completeness keeps existing grouping; new
source copy keeps existing headings; shared typography changes fail the pinned
roles; existing scoped redesign approval remains usable; a test failure does
not approve new expectations; non-natal edits require their own affected flows.
These six cases exercise the written decision rules, not empirical model
compliance or a guarantee against every future visual defect.

Guard verification: `npm run qa:natal-design` passed the CSS/design-system audit
and all four browser cases (40 planet visits). Each case temporarily forces
11px narrative text across every natal article and confirms that the pinned
design assertion rejects it, then removes the test-only style and verifies
the original type again. The final run passed in 51.6 seconds. Repository
privacy scanning passed for 12,035 files. Later release preflight also removes obsolete counterpart branches and shares
the existing aspect-card shell and row normalization. Its rendered consumers
require a fresh verification before release.

## Acceptance evidence

- Fresh isolated dependencies and local knowledge build completed.
- Web, server and standalone-admin type checks passed.
- CSS/token/design-system audit and reader-copy boundary passed.
- Preview actual-handler, Natal Aspects source, aspect-display and editor-field
  contracts passed. Editor-field checks include stale-write refusal and actual
  saved-reader delivery.
- Fresh-built browser run: 11 passed. All ten planets were opened at 390px and
  1440px in light and dark themes. Checks cover house heading typography,
  category order, card geometry and heading hierarchy; Sun and Uranus also
  reload. Existing complete Sun/Uranus prose and Friend navigation checks pass.
- Four editor browser cases use isolated actual save/publication handlers.
  They check preview failure, full You/Friend opening and closing text, editing,
  save, reload/reopen, publication, unchanged shared source and no doubled ending.
  The same four cases also passed against a fresh standalone-admin preview,
  giving 15 browser case passes across the two entry points.
- Sun/Uranus screenshots were visually inspected on desktop and mobile in both
  themes. Layout, headings, full prose and category cards agree. Editor captures
  were inspected on mobile/dark and desktop/light.
- Repository privacy scan: 12,034 files passed. Fresh public web assets: 462
  files passed. Standalone-admin build and bundle budgets passed; 104 public
  admin files passed privacy scanning. The aggregate admin budget has only
  82 bytes of headroom, so a rebase or further source changes must recheck it.

The first browser run had seven passes and four failures: its all-planets test
incorrectly required a Challenges card for the synthetic Pluto chart. The
expected fixture groups were corrected and all 11 cases passed on the fresh
final build. The initial Friend draft experiment also found that literal name
braces are rejected by template rendering; a dedicated temporary name slot is
now restored to the supported `{{Name}}` editor variable after rendering.

## Release authorization and verification

The owner explicitly authorized committing and deploying these fixes and design
safeguards, followed by live natal placement and complete-aspect editor
verification, on 2026-11-20 in this source thread. This authorizes the software
release; it does not authorize changing or publishing owner prose for QA.

Record the frozen candidate's affected exact-head API/browser/privacy gates,
main merge, Git deployment and production acceptance with the release handoff.
Use the existing release queue without interrupting its admitted candidate.
Do not promote a branch preview to production or publish owner content as part
of these software fixes. Local evidence above is not a production claim.

## Retained release preflight findings

The original ordinary Web build exceeded the unchanged aggregate JavaScript
limit by 687 gzip bytes; authenticated startup exceeded it by 794. Intermediate
cleanup measurements also failed (639, 410, 299, 94 and 168 bytes over). These
are retained failures, not passing release evidence. No limit was increased.
Standalone Studio previously passed with 82 bytes of aggregate headroom and
must be remeasured after the shared draft helper correction and integration.

The broader API preflight reached an unavailable protected ingress reference
fixture in shard 1. Its fail-closed reference-storage failures are not an
application regression or a complete API pass. The required CI API workflow
supplies protected fixtures. The actual affected preview/source contracts and
production-style native preview-handler startup pass independently.

The initial affected plan selects 203 API commands and 227 browser specs across
16 jobs because the shared `App.tsx` change selects the conservative fallback.
That mandatory exact-head selection, Linux browser qualification and native
PostgreSQL gates explain why release requires more than a short focused run.
Local affected-flow evidence does not replace them.

The final runtime candidate integrates `ad25950d8` at `46d6dbe29`. Canonical
preflight passes ordinary Web, authenticated Web, standalone API types, client
boundaries, server types and native startup. Standalone Studio initially fails
its aggregate cap by 323 gzip bytes. A matched independently installed main
control measures 935,523 bytes versus 936,118 for the editor (+595). The owner
approved up to 500 aggregate compressed bytes in this chat; only the Studio
aggregate receives 500 bytes, consuming another 95 bytes of existing headroom
and leaving 177. All startup, styling, individual-chunk and Web caps stay
unchanged. See the [measured receipt](natal-complete-editor-bundle-cost-2026-11-20.json).
The integrated affected plan selects 204 API commands, 227 browser specs and
16 browser jobs. Required hosted gates remain pending until admission.

The complete-editor regression now supplies a synthetic shared template tail
for both audiences rather than pinning the production recap. This preserves
the original missing-sentence failure while allowing a separately authorized
template edit. Actual preview-handler checks pass with that fixture; all four
standalone Studio cases pass, including save/reopen/publication, unchanged pair
and template rows, and one complete ending. Mobile/dark and desktop/light
editor captures were inspected; remaining source-specific production text is
verified against the renderer at deployment, without publishing owner prose.

Final local browser evidence: the complete client-facing and natal-publication
specs finished with 353 passes and four existing private-snapshot opt-in skips
in 13.9 minutes. The client-facing runtime and its tests are unchanged after
that run. The final synthetic-tail fixture then passed the entire 31-case natal
publication spec in the Web entry (1.7 minutes), plus all four complete-editor
cases in standalone Studio (44.3 seconds). The four opt-ins are the saved-body
day/night and Friend-placement private snapshots; they are not passing cases.
All four all-ten-planet design cases and their negative controls passed. Fresh
Sun desktop/light and Uranus mobile/dark captures were inspected against the
prior four-profile Sun/Uranus review; shared shell geometry, house headings,
full prose and Gifts/Challenges cards agree.

After integration, actual preview/source/exact-copy/display contracts, emitted
native preview-handler startup, CSS/design-system, affected-selector/workflow
contracts and the corrected Studio budget all pass. Broad API shard 2 passed
during the base-update window and is not exact-final-head evidence. Shard 3
first hit a sandbox IPC denial; rerunning with IPC available progressed to a
missing protected report-evidence fixture. Shard 1 separately lacks protected
ingress evidence. Neither is described as a complete API pass. Exact-head
hosted API, Linux browser/PostgreSQL/privacy and production acceptance remain
with the authorized cohort release owner.

The owner authorized cross-chat release coordination in this chat. The existing
coordinator in `thread:01a1efe7-84fd-7623-8559-23a770f86ad8` assigned this work
to the next compatible cohort and owns integration, hosted gates, merge and main
deployment. This source owner keeps the candidate unpushed, creates no separate
PR or CI watch, and supplies bounded source/render acceptance evidence.
