# Sky Write-ups: planet and sign workspace

Implementation branch: `codex/sky-writeups-workspace-20261023`, based on
`1c235330ab7d789a14fb3bcfe670e18343928c9f`. This workspace changes authoring
navigation; it does not grant owner content approval or migrate saved writing.

Open **Sky Write-ups**, then select a planet or point and a zodiac sign. All
14 existing bodies/points and 12 signs use the same workspace. A selected pair
has a shareable/reloadable route, for example
`/admin/content#sky-writeups?planet=sun&sign=scorpio`.

| View | Purpose | Existing storage |
| --- | --- | --- |
| This visit | Open an existing dated article, or load calculated dates and write a new title, explicit summary and body. Save draft is the primary write action. | `sky-article/{planet}/{sign}/{entryYear}/{validFrom}`; existing article revisions keep their own keys. |
| Default reading | Preview and open the existing reusable placement sources. Saved previews may include drafts; source badges keep their existing meaning. | Existing placement, Moon, node, Lilith, seasonal-context and motion sources. |
| Writing setup | Open the exact reusable article template. Advanced source details retain composition, fallback and variable tools. | Exact sign templates, general ingress templates and the shared node template. |

The default reading and source template are distinct objects. A dated article
never replaces either. No migration, copy replacement, source creation,
approval or publication occurs when the workspace opens. Existing year-specific
wording in a default remains unchanged and still needs a separate owner edit
if a year-neutral replacement is wanted. In particular, the existing Scorpio
2026 draft is discovered under its current key and read from its current
compiled article record, not reconstructed from old workspace slot values.

## Dated draft workflow

1. Open an existing saved visit, or choose a date during the selected placement
   and select **Write article**. The writing controls share the selected reader
   date. The existing authenticated facts API
   identifies the visit. A different calculated sign is an error, not a new
   destination silently substituted for the selected pair.
2. Edit the title, separately authored summary and article body. Draft text
   stays in memory until **Save draft**; changing tabs preserves it. Leaving
   the placement or page warns about unsaved writing; an in-flight operation
   blocks navigation.
3. **Save draft** compiles a new dated article with the existing deterministic
   v3 renderer. Saving neither generates prose nor copies template prose over the
   article. The current source template is retained as provenance where one
   exists; otherwise provenance identifies the built-in v3 layout.
4. Existing articles use the normal version-checked
   `save-sky-article-edition-revision` action. Editing a published article
   creates a separate draft revision. Its published body remains unchanged.
5. **Review saved draft** opens the existing review/publication editor.
   Publication still requires a separate explicit owner action and its
   existing checks. Reloading simply reads saved writing.

Visits use calculated entry/exit instants. Separate retrograde return visits
retain distinct dated identities even within one year. Long stays can cross
years. Moon-sign visits remain separate from New Moon / Full Moon articles;
existing lunar, node and Lilith default source structures are retained.

## Full-visit generation and existing day documents

**Generate draft** loads the full calculated visit and opens a review panel.
Opening this panel sends no writer request. **Generate this draft** is the
explicit paid action; it uses the existing configured ingress writer and
unchanged instructions. A fresh exact-identity read prevents generation over an
already saved article. Existing writing opens intact instead.

Returned fields remain separate from the passage until **Use this draft**.
Saving then retains the generated fields and receipt alongside any subsequent
editor changes, without adding the compiled date line or Key dates twice.
Requests are not retried automatically. Leaving the panel aborts its client
request and prevents a late preflight response from starting generation.

New articles cover the full calculated visit. For example, October 28 selects
the Moon-in-Gemini visit containing that reference date, not an October-28-only
article. Existing `sky-article/moon/{sign}/{year}/day/{date}` documents retain
their complete writing, Eastern day bounds, scope and content keys. They remain
editable; a revision cannot change their scope. The new controls do not convert
them or offer day-only generation. Previously approved day articles retain
their reader precedence for their saved day; full-visit articles remain the
primary reading for the rest of their matching visit. Drafts never displace
published writing or fallback sources.

The standard Moon layout is an application layout reference, not a fabricated
approval of a stored template. Requests that name a stored template still
require its existing approval. The older built-in Moon identifier is accepted
for full-visit generation, while explicit day-generation requests stop before
dispatch. Read-only input inspection accepts the calculated planet/sign when
there is no saved approved Moon template. Shared writer facts, instructions,
profiles, owner evidence, and bundle limits are unchanged by this reconciliation.

The reconciled browser/API cases are prepared for the final test slot. Their
execution and final-base results must be recorded separately; the historical
acceptance results below do not verify this change.

**Currently live** checks saved LIVE dated candidates with the authenticated
publication-status API and the existing exact-approval/time-window selector.
It excludes drafts and offers the full stored published dated article where
one is selected. Otherwise it explains the existing default-source path and
links to the published reader. The default-source editor is a saved preview,
not a claim that every displayed source is currently selected in the reader.
Unknown or failed publication checks are shown explicitly.

## Verification

`npm run test:sky-placement-workspace` compiles synthetic cases for all 168
planet/sign pairs and uses the actual API handler against isolated storage to
check draft create/reopen, unchanged source rows, version conflicts, distinct
Venus return visits, a long Pluto stay, Moon and node identities. No provider
request or publication action is involved. It is included in
`npm run test:content-studio-api`.

The browser cases in `tests/visual/content-dashboard-admin-user-flows.spec.ts`
named **Sky planet and sign workspace** cover discovery, title/body retention,
separate default/template views, draft saving through the actual handler,
reload, unsaved-navigation refusal, another planet's new visit, inventory
failure and stale-save recovery. Desktop/mobile and light/dark cases verify
heading order, shared typography and horizontal overflow. All writes use
synthetic isolated storage. Screenshots are local test artifacts under
`test-results/sky-placement-workspace/`.

Production content, the saved Scorpio draft, default readings, reusable
templates, publication state and the deployed writer contract are untouched.

## Local acceptance results, October 23, 2026

The initial acceptance snapshot was taken before committing or deploying, with
the branch zero commits ahead and zero behind the fetched `origin/main`.
Its implementation/test-source fingerprint is
`abb98eac365cb6425b7d44f8792b364c42e65e78fb9a4da66d55f247feba146c`.

| Check | Result |
| --- | --- |
| Workspace contract | Passed: 168 identities; actual-handler create, reload, stale-write refusal, unchanged source rows, separate return visits, published-original protection and newest-document selection. |
| Browser acceptance | 10 passed against a fresh web build: four theme/width journeys, every selector, live-copy selection, empty-article evergreen sources, failure/conflict handling and existing library navigation. |
| Heading and layout contract | Passed: semantic/visible order, computed typography compared with the established placement heading, body typography, shared tabs and no horizontal overflow. |
| Content Studio API suite | The complete unfiltered `npm run test:content-studio-api` passed using isolated storage and intercepted providers. Final cache-selection/presentation refinements were then covered by the focused workspace contract and fresh browser acceptance. |
| Builds and types | Fresh web and standalone Admin builds passed; Admin and root server type checks passed. Existing bundle-size advisories remain. |
| CSS and boundaries | `npm run qa:css-audit`, Admin/web architecture boundary regression and `git diff --check` passed. No new stylesheet or design tokens. |
| Privacy | Source scan passed for 11,330 files; final Admin and web public asset scans passed. Private test reference fixtures stayed in test-process memory and outside Git. |
| Production changes | None. No provider generation, owner-content write, source migration, approval or publication was performed in production. |

The screenshots use synthetic writing. Production owner copy was not imported
into browser fixtures or public files. The existing reader resolver and its
source distribution remain unchanged. The default editor can show saved drafts;
the published-reader link is the final view of the complete default reading,
including its calculated additions and personalized sections.

## Configured Admin feature cost

Matched builds use independent `npm ci --ignore-scripts` installations, Node
22.20.0, identical CI visual-smoke Supabase placeholders, and empty publishable
key / natal-aspect flag settings. Each workspace package link resolves inside
its own checkout. The baseline is main `993f23c048`; the layout is `8a250cbbd2`.

| Measurement | Main | Layout | Added cost |
| --- | ---: | ---: | ---: |
| Entry JavaScript, raw bytes | 796,901 | 798,194 | 1,293 |
| Entry JavaScript, gzip bytes | 229,977 | 230,423 | 446 |
| All JavaScript, gzip bytes | 803,560 | 809,602 | 6,042 |
| JavaScript assets | 82 | 83 | 1 |

The requested workspace remains a separate dynamic entry. The feature allowance
adds 1,500 bytes to the entry/largest raw ceilings and 6,250 bytes to aggregate
gzip, leaving 456 and 248 measured bytes respectively. Entry gzip, memory graph,
reader startup, dependencies, CSS and forbidden-content limits are unchanged.
The guard additionally requires this workspace to remain dynamic and absent
from the initial import graph. This is interface-cost accounting, not a runtime
performance improvement. No source corpus, writer prompt or owner article was
added to the browser bundle or shortened to meet a limit.
