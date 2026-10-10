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

## Loading and bundle verification

The reading, formatting parser, chart-authoring form, and private editor load
only when their route or action is opened. The reader shows a loading state
until the formatter is ready, so saved Markdown is never displayed as raw text.
Bundle checks explicitly reject these modules in the startup graphs. Both
Studio forms use the shared `surfaceSection` container.

Independent `npm ci` web builds compare main `a1e2ed368` with this feature.
The Studio comparison was refreshed against main `6d7e6ca7f` after integration;
its successor `d4b0f5fe7` changes only the API and tests. Both comparisons use
identical visual-smoke Supabase placeholders. Web feature measurements include
the browser fixture's enabled natal-aspect flag. Figures are gzip bytes except
the explicitly marked raw entry measurement.

| Measurement | Main | Feature | Ceiling |
| --- | ---: | ---: | ---: |
| Web startup JavaScript | 465,004 | 468,988 | 469,250 |
| Web startup including CSS | 518,958 | 523,556 | 524,000 |
| All web JavaScript | 3,559,319 | 3,578,261 | 3,579,000 |
| All web CSS | 115,547 | 116,161 | 116,250 |
| Deferred Sky detail | 6,022 | 6,221 | 6,400 |
| Deferred signup | 4,287 | 4,388 | 4,450 |
| Deferred horoscope editor | 14,589 | 14,614 | 14,700 |
| Studio entry, raw | 787,556 | 789,454 | 789,750 |
| Studio entry, gzip | 229,253 | 229,826 | 230,000 |
| All Studio JavaScript | 789,998 | 799,100 | 799,500 |

These allowances account for feature code and changed shared imports; they are
not performance improvements. No dependency, reader prose corpus, or runtime
deadline changed. Remaining budgets and the forbidden-content checks stay in
place. The existing first-paint formatting, slow-loading, complete-content and
Studio save/reload checks still apply.

## Integration follow-up, October 10

The final release check exposed a Calendar cold-load regression on the hosted
runner. Direct Calendar visits now receive HTML module-preload hints for App,
CalendarRoute and LunarCalendar's static dependencies. This removes their
serial code-discovery delay without changing the JavaScript startup graph,
calculation assets, reading selection or approved prose. Other routes retain
their existing hints. Deferred content and the calculation worker are not
preloaded by this change.

The startup contract checks route scope and excludes dynamic dependencies.
The browser regression holds App's download and requires both Calendar modules
to start independently. Existing cold-load ceilings, complete-reading checks,
stylesheet loading and failure/recovery checks remain unchanged.

The earlier integration incorporated main through `d4b0f5fe7`. Natal placement and
aspect regressions now use the existing **Back to natal chart** accessible
label; transit article assertions retain **Back to updates**. No navigation
behavior or reader wording changed in this follow-up.

Fresh-build local checks on the integrated reader passed:

- 43 natal reader and Studio cases, including complete paragraphs, both
  audiences, all seven topics, unknown birth time, errors, draft exclusion,
  guide editing and template/passage save-and-reopen.
- 10 previously failing client/Sky cases after main's hydration, eligible
  fixture and solver-rounding repairs.
- 3 previously failing reader-recovery cases, including complete Lilith/Pluto
  writing and the closing transit placement descriptions.
- The unchanged Calendar cold-loading contract: six uncached samples across
  mobile and desktop with throttled networking. Controls completed within
  5,670 ms (6,000 ms cap), and complete reading within 7,260 ms (7,500 ms cap).

The complete content suite now passes after the main-branch repairs. The
unfiltered Content Studio API suite passed after the first integration and is
rerun with main's additional Sky publication test before release. Exact final
revision and hosted results belong in the PR; a local pass does not establish
that the feature is deployed.

Main itself measures above its Studio entry and aggregate limits. The natal
entry delta remains 1,898 raw bytes after integration. The updated caps above
reconcile that inherited baseline while retaining all deferred-content checks
and every runtime deadline. No content is shortened to reduce the build.

Saved writing was also inspected using a private local snapshot and fictional
charts. That preview does not change database publication state. Its data and
screenshots remain outside the public repository.

### Shared-code integration and Studio entry measurement

Integration with main `4f5f92f79` keeps the common writing renderer in
`src/shared/components/FormattedWritingContent.tsx`. The reader's old import
path remains a compatibility export. Natal opening emphasis and inline links
use that shared implementation; a rendered regression checks both paragraphs
and the unchanged default formatting. The natal authoring form also imports
the shared chart types. Both the new Weekly API tests and the natal authoring
tests remain in the unfiltered API command.

The earlier hosted Sky Summary Studio job passed all 58 browser cases and
then failed its entry-size check. Independent `npm ci` builds with identical
CI Supabase placeholders measure main's Studio entry at 787,643 raw / 229,286
gzip bytes and the integrated natal entry at 790,134 raw / 230,142 gzip bytes.
The entry allowance now covers the measured natal feature: 790,250 raw and
230,250 gzip bytes. Total Studio JavaScript is 787,492 gzip bytes, under its
unchanged aggregate limit. Runtime deadlines and deferred-content checks remain
unchanged.

With the same web configuration, the unchanged Horoscope Editions editor
measures 14,897 gzip bytes on main and 14,924 with the natal shared dependencies.
Its deferred-chunk allowance is 14,950 bytes. All other web limits stay fixed.
These are measured size allowances, not claims of a performance improvement.
Final test results and their exact revision belong in the release PR.

The subsequent hosted cold-Calendar trace showed that a full Sky job claimed
the worker before engine initialization finished. Calendar requests arriving
during that download could not take their existing foreground priority. The
worker now waits for initialization before choosing from its queues. It still
starts only for a requested local calculation, retains the same calculation
inputs, and returns initialization failures with each request's identity.
The regression reproduces the cold Sky-first arrival order, checks Calendar
completion first, and covers failed initialization. The 6,000 ms controls and
7,500 ms complete-reading limits are unchanged.
All 21 fresh-build loading and recovery browser cases passed locally. At
390px, three uncached samples measured 4,804–4,842 ms for controls and
6,491–6,501 ms for complete readings; at 1440px, they measured 4,790–4,800 ms
and 6,366–6,386 ms. These are local throttled measurements, not production
latency claims.

The subsequent main update `42d9e15a0` adds shared retrograde-history facts.
Integration preserves its optional background worker queue and tests, both
article detail types, and its API regression in the full Studio command.
Matched standalone builds measure main's entry at 791,375 raw bytes and the
combined entry at 793,866 raw / 231,224 gzip bytes. Final entry allowances are
794,000 raw / 231,350 gzip bytes. Combined aggregate gzip is 790,204 bytes,
within the existing natal allowance of 801,000. These measurements supersede
the earlier entry figures; the runtime deadlines remain unchanged.
