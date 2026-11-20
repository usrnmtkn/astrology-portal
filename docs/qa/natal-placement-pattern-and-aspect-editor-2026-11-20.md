# Natal placement pattern and complete aspect editing

Owner direction: `thread:01a1fa37-6d7e-7942-9aa1-c7260a84bb59`, 2026-11-20.
Natal planetary placement pages must retain the same design system and Gifts /
Challenges pattern. The owner also reported that the Sun–Mercury aspect editor
omitted the closing sentence visible in the reader.

Candidate: uncommitted changes on `fix/natal-aspect-complete-editor-20261120`,
based on refreshed `origin/main` at
`28489df1c937c5195bb5946b351721c2a5ac3f6b` (zero committed divergence).
Runtime/test source fingerprint:
`52de1b18998c12fdc4273b7238d99f41b1c8781d67051a06f6b602281196ce9a`.
It hashes sorted changed/new non-Markdown paths, NUL, complete bytes, NUL.

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
privacy scanning passed for 12,035 files. Runtime source remains the already
verified local repair; this follow-up adds instructions, a command and stricter
tests, without changing the rendered application design.

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
