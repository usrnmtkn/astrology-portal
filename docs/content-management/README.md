# TLDR Astro content management

This is the starting point for developers and coding agents changing reader-facing
copy in TLDR Astro. The detailed system design is in
[ARCHITECTURE.md](./ARCHITECTURE.md).

The short version:

1. Astrology facts come from calculation code and event-time ephemerides.
2. Reader prose comes from reviewed content rows.
3. Resolvers select content and fill declared slots.
4. Review gates and contracts decide whether a result may serve.
5. React displays the result. It must not invent astrology or interpretation.

## Read these before changing content

- [Connection transit detail](./connection-transits.md): separate personal transit,
  exact activation and editable bridge sources, without borrowing bond openings.
- [Reader-facing content contract](../../CONTENT-CONTRACT.md): the governing
  rules for complete fields, author-final copy, and refusal behavior.
- [Content architecture](./ARCHITECTURE.md): ownership, runtime flow, surface
  wiring, dashboard hydration, and worked examples.
- [Sky writing systems](./SKY_WRITING_SYSTEMS.md): current contracts, independent
  version tracks, source selection, and dated reference history.
- [Year-specific season articles](./SEASON_ARTICLES.md): one annual essay shared
  by Sky and Calendar, with normal article editing and publication controls.
- [Placement composition](./SKY_PLACEMENT_V5.md): editable sentence sources,
  named variables, ordered sections, calculated previews, and publication checks.
- [Personalized placement aspect bridges](./SKY_PLACEMENT_ASPECT_BRIDGES.md):
  editable house/contact bridges, intact aspect sources, and a single timing layer.
- [Governed approvals](./GOVERNED-APPROVALS.md): atomic owner decisions,
  unresolved queues, and the generated approved-only serving projection.
- [Sky aspect surface contract](./SKY-ASPECT-SURFACE-CONTRACT.md): required
  fallback precedence, card behavior, and regression checks for the Sky aspect
  list.
- [Fallback architecture](../../apps/web/src/content/fallbackArchitectureV3/FALLBACK-ARCHITECTURE.md):
  row roles and authored-versus-assembled resolution.
- [Resolver specification](../../apps/web/src/content/fallbackArchitectureV3/resolver/RESOLVER-SPEC.md):
  slot selection, review eligibility, and `SOURCE_GAP`.
- [Writing style guide](../../apps/web/src/content/fallbackArchitectureV3/admin/WRITING-STYLE-GUIDE.md):
  voice and copy conventions.

## Non-negotiable rules

### Facts and prose are separate

Birth-chart placements, houses, aspects, current positions, retrograde state,
event dates, and timing windows are facts. They must come from the chart engine,
the API, or the event-time ephemeris.

Content rows may explain a fact. They may not hardcode a moving body's sign,
house, retrograde state, or event date. If a sentence needs one of those values,
the value must be an explicit resolver slot.

The reader app treats the content package as read-only. New or revised prose
must pass through the owner-review and import workflow; components must not
patch package copy at render time.

### Author-final text is immutable

An approved authored unit serves verbatim. Do not shorten it, paraphrase it,
derive a TLDR from it, or silently repair it at render time. A requested copy
change creates a new approved version of that unit.

The same rule applies during source selection. A compact knowledge-matrix row,
evidence passage, generic transit row, card-length preference, or template
cannot replace a known owner-authored unit for the same content key. Protected
owner-authored sources must retain their recorded hash and word count, and the
materializer must fail rather than substitute shorter copy.

### Review state controls serving

Only `approved`, `approved_reuse`, and `reviewed` rows are reader-eligible.
`needs_review` rows can be wired and previewed in admin, but they stay dark in
the reader app.

### Missing content is a source gap

Resolution is:

```text
exact authored unit
  -> approved hook/template/vocabulary assembly
  -> SOURCE_GAP
```

On the Sky aspect surface, approved sign-specific copy wins for its exact sign
combination. Otherwise, a governed LIVE Content Studio exact row that has been
Signed Off is the current approved version for that exact identity. If no such
Studio version exists, an exact-aspect `readerCopy` with `status: "LIVE"` in
the canonical transit corpus is the authored baseline. These exact tiers must be
selected before generic phrasebook, generated, or general fallback prose. A DRAFT transit
record remains source material and is never promoted merely because the file exists.

Sky Placement distribution has an additional independent gate. Editorially
approved rows remain `staged` until the owner approves the exact staged-to-serving
key diff. Record that approval statement, date, source, and approved keys in
`authored-inputs/sky-placement-serving-manifest-v1.json`. This applies to every
batch. Batch 2 cannot serve until the on-demand runtime deployment is verified,
and its serving change must be presented as a separate owner approval.

Do not add a generic sentence in React to make a missing card appear complete.
The owning surface should omit the unavailable unit and log the source gap.

### Traditional rulers are canonical

Use the Hellenistic ruler map:

| Sign | Ruler |
|---|---|
| Aries | Mars |
| Taurus | Venus |
| Gemini | Mercury |
| Cancer | Moon |
| Leo | Sun |
| Virgo | Mercury |
| Libra | Venus |
| Scorpio | Mars |
| Sagittarius | Jupiter |
| Capricorn | Saturn |
| Aquarius | Saturn |
| Pisces | Jupiter |

Uranus, Neptune, and Pluto may appear as computed placements or aspect layers.
They are never default sign rulers.

## Which layer should I change?

| You need to change | Owning layer | Start here |
|---|---|---|
| A planet, house, aspect, orb, date, or retrograde flag is wrong | Fact/calculation layer | `services/tldrastro-api`, `packages/astro-knowledge`, then the app fact adapter |
| Approved wording for one exact combination is wrong | Authored content row | `source-rows/*.json`, using the owner-approved source |
| Many combinations share an awkward sentence | Hook or vocabulary row | `fallback-hook/...` or `fallback-vocab/...` |
| A correct row is selected in the wrong situation | Resolver | `renderFallback.*` or `renderTransitSynastry.*` |
| Copy is correct but stale after page load | Dashboard mirror/cache | `generatedContent.ts` and the V3 materialization workflow |
| A card is visually wrong | UI/CSS | React component and shared design tokens; do not move prose into the component |
| A generated interpretation is unsafe or unapproved | Reader boundary | `generatedContent.ts`, `servedFieldsContract.ts`, and contract tests |

## Repository map

```text
packages/astro-knowledge/
  Astrology meaning, voice contracts, timing/ranking helpers, built bundles

services/tldrastro-api/
  Chart, ephemeris, timing, and relationship calculations

apps/web/src/content/fallbackArchitectureV3/
  source-rows/       Reader prose and source material
  templates/         Slot-bearing fallback templates
  resolver/          Deterministic content selection and assembly
  contracts/         Machine-readable role and grammar rules
  tests/             Package-level verification
  dist/              Browser bundle consumed by the runtime adapter
  content-book.html  Generated human-readable content book

apps/web/src/content/fallbackArchitectureV3Runtime.ts
  Builds the local snapshot, applies reader review gates, exposes renderers

apps/web/src/services/generatedContent.ts
  Loads safe live rows and the approved Supabase mirror of the V3 package

apps/admin/
  Review, editing, QA, and package-row visibility

scripts/
  Import, materialization, contract, regression, and QA tooling
```

## Content Studio access

### Sky reader preview

**Reader date** is shared by the source panel, Published/Draft preview,
**Read in Sky**, and **Export what readers see**. It stays selected when opening
an article editor or returning to the catalog. **Editing** identifies the source
being changed; **Readers see** identifies the published placement calculated for
that date and the reader's time zone. Pending revisions remain scoped to the
editing placement. Reader links and CSV exports always use the published view,
including when Draft is selected in the preview. Source verification runs when
a placement is chosen, so these actions do not require opening the preview.

The reader CSV filename uses the selected reader date. Its `body` contains the
main article, and `aspect_details` contains the public Aspect details in reading
order, including group and aspect headings, dates, complete passages and reader
links. Export waits for those details to finish loading. Personalized chart
sections stay separate, and reader CSVs cannot be imported as editable sources.

Choose a Sky placement, then **Preview reader** in **Reader sources**. The
preview opens inside Studio and uses the public Sky article builder, source
loaders, calculated placement facts and article renderer. **Published** reads
the current published versions. **Draft** simulates publishing a selected dated
article revision in an isolated reader frame; it does not write or install draft
text in the public content caches. An open article editor supplies its current
fields, including edits still being saved. The normal Review & publish flow
remains the publication action.

The date selector stays on the selected civil date in the reader's time zone
(local noon for other dates, the live instant for today). If the selected planet
occupies another sign, the preview explicitly names that placement and shows
its article for the same date. It never advances to a future occurrence of the
editor's placement. The reader link opens the actual placement on that date.
A revision for another sign is not selected, and publication impact explains
that it would not affect the reading. Source
details show the selected dated article or shared fallback, its keys, available
saved versions and validity window. Publication impact names the changed
fields, target article window and whether that revision would be selected on
the preview date. Dates outside its window retain the other published reading;
newer eligible dated articles retain their selection precedence. Starts are
inclusive and ends exclusive. Stale published baselines and failed public reads
stop the comparison instead of presenting unverified copy as Published.

The preview includes the public article; personalized chart sections require
their own reader context. Without a dated draft, Published remains available
and Draft explains that a dated revision is needed. Shared fallback source
editing retains its existing source editor; this Draft view previews dated
article revisions.

The main web app serves the isolated frame at `/studio/sky-reader-preview`.
Local development uses the existing Studio `5174` / reader `5173` pair.
For a separately hosted standalone Studio, set `VITE_STUDIO_READER_ORIGIN` at
build time to the web reader origin, and set `VITE_STUDIO_PARENT_ORIGIN` in the
reader build to that Studio origin. Main-app Studio needs neither setting.
Only public article inputs and the local
compiled proposal cross the frame boundary; Studio credentials and raw private
source snapshots are never sent. Origin, frame identity, channel and request
IDs guard responses. Refresh preview rechecks publication state; publishing a
matching source also refreshes the frame.

### Dated Sky article variables

Dated articles keep the active passage, captured variable values and the actual
Published/Draft reader in one workspace. **Editing passage** selects the
headline, TL;DR or general article. The panes sit beside each other on wider
screens and stack on mobile. **How this article is assembled** shows each used
token's complete captured value and source; **Saved version** and **Resolved
passage** expose the version and complete expanded field. **Article variables**
opens the searchable Sky fact/phrase controls and **My variables**. These panels
start closed, with the editable passage, reader preview and **Save draft** first.
Save draft requests the existing serialized save immediately; the same autosave
queue still saves later edits after its normal delay. Saved, saving and failed
states remain beside the passage. Insertion replaces the native selection and
restores the cursor.

**Reader wording unchanged** appears only after the reader verifies the selected
date's draft against the published article and all resolved article and companion
fields match. A variable-only edit says **Publishing saves variable sources
only**. Wording edits, unavailable sources, stale baselines and dates that do not
select this revision cannot receive that assurance. Publication details stay
available in the workspace; no action publishes automatically. Equivalent
calculated facts do not offer a redundant replacement solely because their
calculation reference changed; complete captured provenance remains available.

**Original compilation values** exposes the saved template inputs, identifying
calculated slots from the original engine snapshot and the other saved writing.
These original values use `edition_` tokens, such as `{{edition_entryDate}}`,
to distinguish a saved dated visit's input from current Sky residency variables.
Later manual article edits can differ from these original inputs.

**Calculate dated article values** uses the article's original calculated
reference instant when available, otherwise the beginning of its saved window.
The actual calculated instant, motion and zone remain visible. A calculated
occurrence outside that article's window is refused. This source calculation
does not change the shared Reader date or advance the public preview.

Editable tokens and captured values persist privately in
`sections.skyArticleVariableDraft`. Autosave compiles the resolved fields into
the existing complete `skyArticleEdition`; invalid or missing values stop the
save and Draft preview. The API verifies the source snapshot against the exact
compiled hash at save and publication. Reader responses and the preview frame
contain only complete compiled text. Changes to shared writing after capture
do not automatically change a dated article; **Use current value** explicitly
updates its captured value. Source-only edits can publish without changing any
reader wording. Existing conflict checks, publication review and history remain.

### Editing assembled sections

Variable controls use readable labels alongside the unchanged saved tokens.
Sky supports search by name, meaning, token, or existing wording; type and
availability filters; and an option to show only variables used in the active
article or fallback section. Its source tables still open the same complete
Writing Library fields. The Variables directory also recognizes the readable
labels, and My variables searches names, descriptions, and tags together. An
inserted custom variable identifies whether its value comes from shared writing
or a planet/sign/placement override.

Calendar's passage picker groups saved writing, calculated values, and
conditions. Search narrows the choices; **Include unavailable variables** makes
the rest of the supported contract discoverable. Current values are available
without leaving the field. Normal insertion replaces the selection with the
canonical token. Conditions such as `hasFullMoon` use **Wrap selection in
condition**, which preserves the selected wording inside an opening/closing
block and selects that wording for continued editing. The real Calendar
renderer resolves nested conditions; malformed blocks still fail validation.

The daily Calendar workspace keeps **Editing passage**, **Editing scope**, the
editable wording, used variable values and sources, and **Published / Draft**
together. **Editing section** switches between the complete passage and its
sections without opening template tools. Used values/sources, variable insertion,
template ordering/colors, source keys and Moon timing start in closed panels.
The primary **Save draft** action stays directly after the passage. Publication
impact and validation errors remain visible; fuller publication details and
history are expandable. Both reader views use the loaded date and time zone. A pending date or
time-zone change hides the old preview until **Load passage** completes.

Calendar and dated Sky editors use the same framed editing and reader panes.
Source context, variable values and publication impact have separate inset
surfaces. Template sections keep their numbered reading order with individual
borders and spacing. Moon timing uses label/value pairs, stacked on narrow
screens. Narrative text keeps the shared body typography in both themes.
The main Studio page header scrolls with the page so it cannot obscure passage
controls; the editor side sheet keeps its own header and scrolling body.

The same reading surfaces apply to composite variants, compatibility identity
and report previews. Full composition-source and report passages preserve their
paragraph breaks. Composite relationship types use separate context panels;
calculated context chips wrap and filter groups keep their shared spacing.
Daily At-a-Glance uses the standard editor header and readable context layout.
These treatments do not change source selection, saved wording or publication.

**Daily overview** edits the complete daily passage or its shared template.
**Moon transition passage** opens the Moon section of a date-only passage, or
the complete shared Moon-sign transition source. A custom complete passage with
no Moon section stays intact and is identified explicitly. Date-only passages
apply to that local date and time zone. Shared edits apply wherever the reader
selects that source.

The reader preview shows the daily overview and the Moon transition event card
separately. A dated daily overview takes precedence over the shared daily
template, but the event card still uses its shared Moon transition source.
Separate **Changed / Unchanged** labels for **Daily overview** and **Moon event
card** compare Draft with Published for the loaded date, in either view and for
both editing scopes. Invalid drafts show **Cannot compare**; a date without a
Moon event card is identified explicitly.
**Reader wording unchanged** requires valid draft wording and equality of both
reader passages. This preview covers these two Calendar units; other event
readings and the rest of the Calendar remain outside this workspace.

Calculated Calendar values resolve for the selected date and time zone, rather
than being captured as dated Sky article values. Condition blocks control
visibility without inserting their source wording. Used values and complete
source text remain visible beside the editable passage. Shared Moon-transition
sources store complete literal wording; use a date-only passage or shared daily
template for calculated tokens. Saving and publishing remain separate, version
checked actions. Published and Draft source selection use the reader's shared
assembly and Moon event resolver without changing the publication ledger.

Verified Studio owners can use **Edit this passage** in the Calendar daily
overview, the Moon transition event reading, and Sky placement articles with an
editable reader source. It opens Studio in a new tab with the selected local
date, time zone, and exact editing source. The Calendar overview opens that
date's workspace and prefers its existing date-only draft. A Moon event opens
the shared transition for its actual sign pair. Sky prefers a saved revision
for the dated article being read, or opens the selected shared source through
the existing package-source loader. The original reader remains open.

Opening a passage creates no draft and performs no publication. Existing
source and draft loading, version checks, owner access, save and publication
controls still apply. Unavailable or invalid handoffs report an error instead
of opening unrelated writing. The links contain no credentials and do not
appear when owner access cannot be verified.

Review Queue's **Edit** action for a dated daily Calendar passage opens the
same workspace in the current tab. Its canonical source key supplies the date
and time zone; the workspace reloads the saved draft and offers Published and
Draft for that date. Invalid dated keys remain in the queue with an error.
Shared sources keep their existing editor because they have no single date.

Calendar's **Complete passage** lists conditional sections in reading order,
with their variable type and availability for the selected date. **Edit** opens
only that section's wording. **Earlier/Later** moves intact top-level blocks,
including nested conditions; invalid templates cannot be reordered. Literal
text between sections stays in place. **Edit complete template** exposes the
whole pattern. Both **Insert variable at cursor** and source-table insertion
replace the selection in the active section, or the complete template when no
section is open. Source values remain complete in the source table. Saving a
draft and publishing remain separate actions.

Sky's **Full summary template** lists paragraphs in layout order. **Edit
paragraph wording** filters the sentence-template selector to that paragraph's
variants and focuses it. The selected shared source is identified as published
or built in. Event count, event order, and available facts still determine which
variant the reader uses. Custom literal paragraphs open the layout editor.
Existing layout, example-fact preview, and review/save/publish controls remain
the authority; the paragraph index performs no writes.

### Offline CSV editing

Personal Transit primary/alternate retention and new-source imports are documented in
[Personal Transit copy versions](PERSONAL_TRANSIT_COPY_VERSIONS.md).

Personal Transit primary/alternate retention and new-source imports are documented in
[Personal Transit copy versions](PERSONAL_TRANSIT_COPY_VERSIONS.md).

Shared content tables expose **Export CSV** and **Import CSV**. Select rows or
filter the list, choose a content type, and download its CSV. Export reads full
saved documents across all matching pages. Edit the text columns in Excel or
Numbers and save as comma-separated UTF-8 CSV. Keep the format, content ID,
content key, saved version and content type columns unchanged.

The **publish** column exports as **no**, including for live rows. Set it to
**yes** to mark a row for publication. **no**, an empty cell or an older CSV
without this column keeps edited rows as drafts. Other values are rejected.

Import first compares the file with current saved versions and shows complete
before/after fields and identifies each row marked **Will publish**. An empty
edited cell clears that field; removing a row from the file does not delete
content. Resolve all preview errors before saving. **Save drafts** saves only
text changes. When rows are marked yes, **Save & publish** explicitly approves
those rows: it saves their edits, then submits the resulting saved versions to
Studio's existing publication actions and checks. Unmarked edits stay drafts.
An unchanged row marked yes can be published without rewriting its text.
Unchanged rows marked no are skipped. Import preview itself performs no writes.
Save uses the normal editor's draft/revision behavior, including demoting a
directly edited LIVE row or creating a separate proposal where that content
family supports it. The original text is retained in import history.

The first version updates existing saved text. Unsaved package sources must be
saved in Studio first. Archived rows, writing profiles, variables, dated lunar
workspaces, compiled Sky article editions and multi-reading horoscope editions
remain in their dedicated editors. Ordinary article sections and named package
text fields are supported; calculated facts and structural metadata are excluded.
Exports identify excluded documents. Each file is limited to 5,000 rows and
10 MB; individual imported rows are limited to 2 MB.

If a save or publication fails, Studio stops before later rows and identifies
confirmed saves and publications separately. A successfully saved draft remains
available when publication fails. Check the current publication status and
export current rows before retrying an uncertain response. Imports never retry
writes automatically. A CSV mark alone cannot publish; the explicit button and
normal publication checks are required. Sources requiring separate release or
writing checks still use their dedicated workflows.

New Moon and Full Moon generation reads the matching complete saved lunar
passage and the Sun sign's Season write-ups as writing references. Latest saved
revisions take precedence over their original source; missing/invalid lunar
writing stops preparation. These references are separate from calculated event
facts and never approve or publish a generated draft. See the
[lunar writing source contract](../writing/LUNATION_ARTICLE_STUDIO.md#sources-persistence-and-cost).

For editable daily, weekly and seasonal AI instructions, see [Horoscope writing in Content Studio](horoscope-writing-studio.md). The AI Writing workspace saves profiles and exports them into the governed writing harness.

Content Studio uses the existing signed-in TLDR Astro owner session. The Admin
API verifies that session with Supabase on every request. It authorizes either
the protected `app_metadata.role = admin` claim or an exact verified email in
the server-only `CONTENT_ADMIN_EMAILS` allowlist. A normal signed-in member
remains denied. The email allowlist gives the owner a stable bootstrap path
without making an ordinary account an administrator.

The verifier uses the browser app's `VITE_SUPABASE_URL` and publishable key
before any server-job Supabase configuration. Content Studio sessions must be
checked by the same Supabase project that issued them; unrelated server jobs
may intentionally use a different project.

`CONTENT_GENERATION_SECRET` remains an emergency fallback, not the normal
browser login. The dashboard never saves a Supabase access token in its own
admin-secret storage key. If the signed-in session expires, the dashboard
refreshes the same-origin Supabase session; if verification fails, the API
fails closed and shows the emergency access field.

## Finding content from the reader surface

Sky Write-ups groups each planet/sign's dated visit articles, default reading
and reusable writing setup into separate views. See the
[planet and sign workspace](SKY_WRITEUP_WORKSPACE.md) for the draft workflow,
source preservation and verification boundaries.

### Natal rulership and day/night libraries

Natal Chart > Rulership edits Understanding Undoing and the twelve twelfth-house
ruler destinations, independently for You and Friend. Natal Chart > Day & night
edits the chart overview and Jupiter, Venus, Mars and Saturn by day/night sect,
also independently for both audiences. These sources retain their complete
paragraphs; the Friend name field changes only the preview, preserving the saved
`{{ownerName}}` template. Existing planet-placement and empty-house editors remain
available in their own tabs.

The libraries use `cms/natal-twelfth-ruler/{you|they}/introduction`,
`cms/natal-twelfth-ruler/{you|they}/ruler-house/{1..12}`,
`cms/natal-chart-context/{you|they}/sect/{day|night}`, and
`cms/natal-planet-sect/{you|they}/{jupiter|venus|mars|saturn}/{day|night}`.
Missing writing opens a blank draft. Failed reads require retry and cannot be
mistaken for missing content. Saving uses the normal version-checked editor;
deployment never approves or publishes these drafts.

The You Natal Chart and Friend Natal tab select the published overview,
Understanding Undoing and one Hellenistic twelfth-house ruler destination.
The ruler reading applies to both occupied and empty twelfth houses. Jupiter,
Venus, Mars and Saturn placement details add the matching planetary sect passage
after the existing interpretation. No sign-specific claims are inferred from a
general sect passage. Existing foundation copy remains intact.

`natalChartReadings.ts` selects exact library keys from reliable natal facts.
`NatalChartReadings.tsx` loads only the selected LIVE, serving, review-clear rows
through the public reader and interpolates the Friend name without changing the
stored template or deduplicating paragraphs. Publication retirement and revisions
retain the shared reader's admission rules. Unknown birth time omits the timed
sections; a solar altitude within 0.25 degrees of the horizon omits sect while a
reliable house calculation can still select the ruler reading. This margin is an
application reliability policy, not an additional astrological doctrine.

The browser engine records geometric solar-centre altitude from Swiss equatorial
coordinates and sidereal time. Shared account charts retain only the day/night
result, without the birth instant or horizon receipt. Existing manual charts use
their repair flow to refresh older calculations. No generation occurs on reading.
`npm run test:natal-chart-readings` checks direct Swiss horizontal coordinates,
all 46 identities, Hellenistic rulers and exact name/body handling. The fresh
browser matrix is `npx playwright test -c playwright.reader-release.config.ts
 tests/visual/client-facing-user-flows.spec.ts --grep "Natal published readings"`.


The owner can publish these reusable library sources with Save & publish. The
publication guard recognizes only the registered natal library keys with matching
audience, editorial-library scope and source metadata. Personal reports, explicit
sample rows and malformed library keys remain ineligible for global publication.

The focused regression is `node --import tsx scripts/test-natal-editorial-library.mts`.
The focused browser matrix uses the existing CI config: `npx playwright test --config playwright.config.ts --workers=1 tests/visual/content-dashboard-admin-user-flows.spec.ts --grep "Natal editorial library|Natal Empty Houses opens|surface map organizes editable"`;
all mutations use isolated storage. An opt-in private saved-row preview is local
only and is skipped when `NATAL_EDITORIAL_PREVIEW_ROWS` is absent.

Open Content Studio > App surfaces > Surface Map. This is the canonical
reader-to-editor directory. Start with where the copy appears (Sky, You,
Friends, Calendar, or Settings), then use the action on that surface to open
the filtered article, exact-content, compatibility, vocabulary, template, or
fallback workspace.

## Reviewing composition naming and architecture

Open Content Studio > Composition (`/admin/content#composition-map`). The map
groups templates by reader destination and begins with a representative reader
preview. Use **Main template** to inspect the raw pattern, then **Assembly** to
trace each slot to either a calculated runtime fact or an editable saved hook or phrase.
Use **Needs IA review** to find templates without a reader destination,
templates without detectable slots, missing saved-copy sources, and opaque
legacy template IDs. Edit actions always open the canonical saved row: template
and copy-source rows are editable, while calculated facts remain read-only.

Review the map in this order: rendered reader surface, main template, slot
meaning, source type, then canonical key. This keeps the information
architecture reader-first while preserving stable machine identifiers.
See the dated [Composition Map naming and IA audit](../qa/composition-map-ia-audit.md)
for the current real-catalog baseline and the remaining owner decision.

To review the required governed package backlog, open Content Studio >
Unresolved Content (`/admin/content#unresolved-content`). Its active inventory is
generated from `content-unresolved-queue-v1.json` and contains only pending records
required to close reader coverage. Resolver-supported optional enrichments, exact-key
rows already superseded by reader-eligible peers, and governed retirements remain in
the report for audit and future enrichment planning but are not presented as required
owner work. Editorial issues open
the exact Content Library row when one exists. A source-repair issue with a
registered replacement opens an exact-text approval panel in Content Studio:
the owner reviews the complete candidate, confirms its hash-bound approval
statement, and authorizes promotion. That decision is stored separately from
serving content and cannot clear the reader hold by itself. The package repair
must still be deployed; after the regenerated unresolved inventory no longer
contains the issue, it disappears from Content Studio.

Every mapped reader surface now has a `Dashboard editable` route. Surfaces that
still use a local reviewed fallback also expose a one-click CMS starter. Those
rows use the reserved `cms/` namespace and resolve in this order:

```text
exact LIVE CMS row
  -> broader LIVE CMS surface template
  -> existing reviewed local/package fallback
```

Personal transit aspects are an exception to the CMS override pattern. Sky, You, and the Personal Transit Studio preview select the same complete approved aspect or return unit. The old `cms/personal-transit-aspect/` override family and house-event frame composition are permanently retired; edit the canonical source linked from the Personal Transits workspace.

CMS templates receive only their declared calculated slots. A published row
can replace prose, but it cannot replace a sign, house, aspect, date, motion,
or timing fact. Draft, Reviewed, reference-lane, and review-held rows remain
invisible to readers.

After Content Studio publishes or demotes a row, it announces a same-origin
content update. Open reader tabs clear their content caches and request current
LIVE rows again. New page loads always fetch current rows, so a CMS wording
change does not require a web deployment. Editing a published CMS row with the
ordinary Save action demotes it to Draft; `Sign Off` is the explicit action
that makes the revised wording reader-eligible.

Current Sky aspect passages that still have `needs-owner-decision` governance
appear under App surfaces > Sky Aspect Drafts. That catalog is returned only
through the authenticated Admin API. Opening or saving one creates a held
draft; the general editor cannot make it reader-serving.

## Standard content-change workflow

### 1. Trace the rendered sentence

Start from a distinctive phrase or a known content key:

```bash
rg -n "distinctive phrase" apps/web/src/content packages/astro-knowledge
rg -n "authored/transit-aspect/saturn/venus/square" .
```

Then identify:

- the UI call site;
- the renderer method;
- the selected `contentKey`;
- the row's role and review status;
- every computed slot used by the row;
- whether an approved dashboard mirror can replace the local snapshot after
  page load.

### 2. Classify the change

- Fact bug: fix the calculation or adapter.
- Exact prose bug: replace the authored row from the approved source.
- Shared prose bug: edit the narrowest hook or vocabulary family.
- Selection bug: fix the resolver and add a selection regression.
- Presentation bug: use shared UI tokens and leave content ownership unchanged.

### 3. Preserve provenance

Every changed row should keep or add:

- `contentKey`;
- `content_role`;
- `review_status`;
- `source_keys`;
- `approved_via` or a clear review note;
- a declared grammar frame when the role requires one.

Do not turn screenshots, prompts, audits, or third-party passages into serving
copy unless the owner has explicitly approved the resulting text.

### 4. Change both resolver implementations

The package keeps a Node reference resolver and a browser TypeScript resolver.
Behavioral changes must stay equivalent:

```text
resolver/renderFallback.mjs
resolver/renderFallback.browser.ts

resolver/renderTransitSynastry.mjs
resolver/renderTransitSynastry.browser.ts
```

Never patch `dist/tldr-content.js` by hand.

Passing tests against the two resolver source files is not sufficient. The
reader app imports the prebuilt `dist/tldr-content.js`, so every resolver
behavior change must also have a regression that imports that shipped artifact
and compares it with both source implementations. A product-surface change is
complete only after the exact app-facing payload or rendered surface is
verified.

### 5. Rebuild generated artifacts

From the repository root:

```bash
./node_modules/.bin/esbuild \
  apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts \
  --bundle \
  --format=esm \
  --outfile=apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js

npm run build:fallback-manifest

cd apps/web/src/content/fallbackArchitectureV3
node admin/build-content-book.mjs
```

The fallback manifest and summary are integrity indexes for the complete
reader package. Any eligible source-row or template change can alter their key
count or hashes. Never hand-edit these generated files. Rebuild them with the
command above; `npm run test:content` and pull-request CI both reject stale
manifests.

When package behavior or serving content changes, bump `PACKAGE_VERSION` in
`resolver/index.browser.ts` and update the assertions that pin that version.

### 6. Run the gates

At minimum:

```bash
npm run test:content
npm run typecheck
npm run build:web
git diff --check
```

For package resolver changes, also run the directly affected regression and
package verifier. Useful focused gates include:

```bash
node scripts/test-reader-facing-content-contract.mjs
node scripts/test-fallback-refresh-wiring.mjs
node scripts/test-sky-placement-regressions.mjs
node scripts/test-sky-placement-serving-gate.mjs
node scripts/test-deferred-sky-placement-runtime.mjs
node scripts/test-weekly-horoscope-assembly.mjs
node scripts/test-lunation-blend-assembly.mjs
node --experimental-strip-types scripts/test-bond-transit-grouping.mjs
```

### 7. Treat dashboard synchronization as deployment

The Supabase `generated_interpretations` rows are a distribution and editing
mirror of the package. They are not a separate prose source.

Generate and inspect a mirror without changing remote state:

```bash
node scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs \
  --out=/tmp/tldr-fallback-dashboard-rows.json
```

Remote application is an external mutation and may also remove stale package
rows. Run it only when the owner has authorized a dashboard sync:

```bash
node scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs \
  --apply \
  --verify
```

### 8. Report the result

A content handoff should state:

- source files changed;
- resolver behavior changed;
- package version;
- generated artifacts rebuilt;
- tests run and their result;
- whether dashboard rows were synchronized;
- any unrelated working-tree changes left untouched.

## Common mistakes

- Putting interpretation strings in `App.tsx`, a service, or a test fixture.
- Hardcoding a moving body's sign, house, or date in prose.
- Editing only the browser resolver or only the Node resolver.
- Editing `dist/tldr-content.js` directly.
- serving `needs_review` because the row exists.
- Falling back from a specific authored unit to a broad generic paragraph.
- Letting `fallback_source` reach a reader.
- Treating the dashboard mirror as a second authoring authority.
- Fixing an astrology error by changing prose instead of the fact provider.
- Running a full dashboard sync or deleting stale rows without owner approval.

## Fast agent checklist

Before editing:

- [ ] I found the actual serving call site and content key.
- [ ] I know whether the defect is fact, prose, selection, review, hydration, or UI.
- [ ] I read the governing contract/spec for this surface.
- [ ] I have an owner-approved source for prose changes.

Before handing off:

- [ ] No astrology facts were hardcoded in copy.
- [ ] No prose was added to UI or resolver code.
- [ ] Node and browser resolvers remain equivalent.
- [ ] Review gating is unchanged or intentionally tested.
- [ ] The distribution bundle and content book were rebuilt when required.
- [ ] Focused regressions, content contracts, typecheck, and build passed.
- [ ] Dashboard sync status is explicit.

## Explicit owner publication

The October 15, 2026 owner publishing request makes an authenticated owner's explicit publication action the final decision on exact saved reader wording. Automated editorial verdicts do not replace that decision. Generated/automatic publication keeps its existing editorial policy. Source identity, signed calculated windows, complete required fields, source/reader separation, variables, concurrency and actual publication state remain enforced. See [the Studio publishing audit](../qa/content-studio-owner-publishing-audit.md) for editor coverage and release evidence.
