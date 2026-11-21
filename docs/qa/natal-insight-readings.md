# Natal insight readings

The seven Deeper Insights links appear below Empty Houses on You and Friends.
Each opens an editorial reading page within the existing app shell. The page
uses shared typography and theme tokens, numbered placement labels, inline
opening-sentence emphasis, and a shaded section for the planetary ruler.

## Content and editing

In Content Studio, **Natal Chart → Deeper insights** contains the seven shared
guides, the You/Friends templates and untimed variants, and a saved-writing
selector for reusable passages. These records are excluded from Articles.
Opening a guide from the writing-surface map also returns to this workspace.
The selected tab survives reload; opening a saved record preserves its key,
complete wording and publication state.
These are ordinary editable `generated_interpretations` rows. Templates select
complete passages from calculated chart facts; they do not generate prose.
The guide is available through **Read the guide** below the reading.

The **Users** page also supports an optional complete private override: find a
reader, choose a saved chart and topic, and open its write-up. Creation makes a
blank Draft, or reopens the existing row for that chart. Saving uses an exact
version check. A changed chart cannot silently reuse the old chart's override.

Only Live, eligible shared rows and Live private readings serve readers. An
exact-chart private reading takes precedence over the shared composition.
Draft creation or editing does not approve publication. Private readings stay
in `user_generated_interpretations` behind the existing reader/admin access
boundaries; their keys are excluded from the shared publication exception.

Rulership uses traditional rulers and whole-sign houses. The Midheaven is
resolved independently of the 10th-house sign. A source-house-specific ruler
passage takes precedence over the general ruler/sign passage. Unknown birth
times omit houses and angles, and Approach uses its separate untimed template.
Shared composition does not synthesize aspects, house occupants, or a complete
assessment of planetary condition. Saved guides and passages remain the source
of reader prose; this feature does not publish new content automatically.

## Acceptance checks

Record pass/fail and the tested revision in the PR. These tests use synthetic
charts and isolated storage; they do not establish production inventory or
deployment status.

| Journey | Regression evidence |
| --- | --- |
| Discover all seven topics below Empty Houses on You and Friends | `client-facing-user-flows.spec.ts`: natal deeper insights |
| Open a topic and return to the originating chart; handle direct links | natal topic page; shared natal insights |
| Preserve full opening and final sentences, heading order, ruler grouping, and links | approved natal insight passages; shared natal insights |
| Match existing heading/body tokens at 390px and 960px in both themes | shared natal insights |
| Omit unreliable houses/angles and retain supported untimed readings | untimed natal insights |
| Hide drafts and recover independently from guide/reading load errors | shared natal insight drafts; natal guides; natal topic page |
| Edit and reload shared guides, templates, and passages | `content-dashboard-admin-user-flows.spec.ts`: natal insights Studio; shared natal insight templates |
| Find all seven guides under Natal Chart, exclude them from Articles, and save/reopen the existing records in both themes and widths | natal guides belong in Natal Chart |
| Discover a saved chart, create/reopen a private draft, edit and reload | manual natal authoring; personalized natal write-up |
| Enforce ownership, chart/version identity, idempotency, complete text, and stale-edit protection in actual handlers | `scripts/test-natal-insight-authoring.mts`; Content Studio CRUD contract |
| Resolve all supported composition fixtures without excerpting passages | `npm run test:natal-insights` |

Use the current [affected-check runbook](affected-ci.md) for the committed
candidate. The required `content-studio-api`, `browser-release-gate`, and
`project-privacy` checks remain mandatory. Focused local checks do not replace
those gates. Browser verification builds a fresh preview and uses fictional
charts with isolated storage. Check source and rebuilt public assets with the
private project policy.

## Complete readings

**Complete readings** provides dependent chart selectors, separate You/Friends
audiences, and a paginated list of saved records. The URL preserves a valid
selection so a reviewer can reopen the same combination. Opening a combination
loads its existing full body or an unsaved blank editor. Saving a draft does not
publish it. Both the editor and API preserve exact-version conflict protection.

Reader precedence is a published exact-chart private override, then an eligible
published complete combination, then the existing eligible composed reading.
An explicit hold on a complete record prevents fallback. A new unpublished draft
does not remove an existing published reading. Complete Friends readings permit
`{{ownerName}}`; no other interpolation variables are accepted. You and Friends
writing is authored independently.

See [the combination inventory](natal-insight-combination-inventory.md) for
selection facts and coverage limits. Supported selectors are not evidence that
every combination has been written. Never equate a source passage count with
full-reading coverage.

## November integration

This implementation was reapplied to main `767a98a5285ac9e917aadaab0712a7f20a8c493f`.
It preserves the current natal source loading states, Studio publication lifecycle,
sect/rulership workspaces, and profile layout. The obsolete branch's Calendar
preloads, worker changes, writing quotas and old bundle allowances are excluded.

Topic navigation is lightweight. The reading formatter and authoring editors
load on demand, and traditional ruler helpers stay outside Studio's deferred
editor bundle. The new pages use current article spacing and typography tokens.
A transit date refresh keeps an open natal reading and its guide mounted.

Matched isolated main/feature builds document any measured bundle allocation in
the budget files. Required loading boundaries, forbidden payload checks and
runtime deadlines remain unchanged. Earlier build, styling and browser failures
remain failures in the local evidence; successful reruns must name their tested
revision. Private writing candidates, source receipts and live inventory stay
outside Git. No publication of reader prose is implied by this code release.
