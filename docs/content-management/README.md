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

- [Reader-facing content contract](../../CONTENT-CONTRACT.md): the governing
  rules for complete fields, author-final copy, and refusal behavior.
- [Content architecture](./ARCHITECTURE.md): ownership, runtime flow, surface
  wiring, dashboard hydration, and worked examples.
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
combination. Otherwise, an exact-aspect `readerCopy` with `status: "LIVE"` in
the canonical transit corpus is the authored unit. Both must be selected before
generic phrasebook, generated, or general fallback prose. A DRAFT transit
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

To review the complete governed package backlog, open Content Studio >
Unresolved Content (`/admin/content#unresolved-content`). Its inventory is
generated from `content-unresolved-queue-v1.json` and includes file-backed
records that are not materialized as editable CMS rows. Editorial issues open
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
