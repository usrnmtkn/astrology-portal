# Natal insight readings

The seven Deeper Insights links appear below Empty Houses on You and Friends.
Each opens an editorial reading page within the existing app shell. The page
uses shared typography and theme tokens, numbered placement labels, inline
opening-sentence emphasis, and a shaded section for the planetary ruler.

## Content and editing

In Content Studio, the Natal Deeper Insights entries in the writing-surface
map link to the shared guide/title, topic templates, and reusable passages.
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
| Discover a saved chart, create/reopen a private draft, edit and reload | manual natal authoring; personalized natal write-up |
| Enforce ownership, chart/version identity, idempotency, complete text, and stale-edit protection in actual handlers | `scripts/test-natal-insight-authoring.mts`; Content Studio CRUD contract |
| Resolve all supported composition fixtures without excerpting passages | `npm run test:natal-insights` |

Install dependencies in the isolated checkout, then run the unfiltered
`npm run test:content-studio-api`, `npm run test:content`,
`npm run test:natal-insights`, `npm run test:reader-copy-boundary`,
`npm run test:studio-variables`, typecheck, and `npm run qa:css-audit`.
Run the browser cases above with the repository Playwright configuration,
which builds a fresh local preview. Do not reuse a prior preview as evidence.
Scan staged source and the rebuilt web assets with the project privacy guard.

After an authorized release, repeat the affected reader and Studio journeys on
the deployed main revision before calling the feature live. Publication of the
saved writing remains a separate owner action.
