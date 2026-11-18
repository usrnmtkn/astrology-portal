# Friction/Flow writing in Content Studio

Open **Content Studio → Connection Transits → Friction and flow writing**.
Choose a writing group and source, then **Edit Friction/Flow writing**. The editor
reads the exact saved document before offering the existing app wording as a new
draft. Opening a source never creates or publishes a row.

The `cms/friction-flow/` catalog covers the five status labels and explanations,
annual-profection heading, calculated fact line, priority explanation, unavailable
message and method paragraph, calculation explanations, contact metadata, popup
headings, and feed labels and controls. The complete existing wording is retained
as the app default until an owner publishes an override. These defaults are UI
baselines, not newly approved interpretations or writing exemplars.

**Save draft** keeps the edit outside the reader. **Save & publish** uses the
existing authenticated owner-publication workflow and exact-version check. Reader
requests use `/api/content-reader` and its publication ledger. A retired, missing,
stale or invalid published revision cannot resurrect the default. Only the
existing explicit baseline-restoration action can restore it. This implementation
does not publish any actual content rows.

Templates use single-brace calculated variables, listed in the editor. Each
declared variable must appear exactly once. The canonical catalog, rather than
editable source metadata, defines the allowed variables. The reader fills the
actual planets, aspect, orb, times, people, annual house, sign and lord of the
year. Source edits cannot change the calculation or substitute another person's
chart. Text renders in the existing feed and popup elements and CSS classes.

Other writing continues to use its existing editable sources:

- Complete personal aspect readings: **Personal Transits**, with separate You
  and Friend bodies. Edits affect all consumers of the same source.
- Optional relationship passages: **Connection Activations**, retaining their
  directional keys and independent publication requirement.
- The complete aspect education block: the published **Learn → Aspects** article.

No new generic interpretation, composite-chart prose, paid generation, approval,
deployment, birth-data sharing or rating-method change is part of this work.

Verification commands:

```sh
npm run test:relationship-forecast
npm run test:friction-flow-studio-api
npm run test:reader-copy-boundary
npm run test:content-studio-api
npm run typecheck
npm run qa:css-audit
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4196 npx playwright test tests/visual/friends-pair-forecast.spec.ts tests/visual/friends-feed-exact.spec.ts --workers=1
```

The source test covers all 64 catalog entries and publication lifecycle selection.
The isolated actual-handler test creates, reopens and publishes each entry, checks
the complete public reader response, republishes existing sources, retires them
without restoring defaults, and rejects stale writes and unsupported variables.
It also refuses unregistered relationship keys and explicitly marked samples.
Browser tests exercise Studio draft/save/reload/publish and the reader
on mobile and desktop in light and dark themes, alongside the existing feed and
Swiss-calculation regressions. These fixtures do not establish deployed freshness
or write to the owner's content store.

Local acceptance on this checkout is tied to base
`2baa1b170dc7ca553cc80e338821798ede2c0f78`, with remote context refreshed to
`c51d9c551be0bc882e5b8aec328141dde57553de`. The branch is 35 commits behind that
remote; this is local feature verification, not an integration or deployment claim.

| Criterion | Evidence |
| --- | --- |
| Discover and edit the new sources | Studio group/source controls and existing editor, tested on both widths and themes. |
| Preserve saved text across reload | Complete edited status, profection and method bodies reopen through the actual inventory handler. |
| Keep drafts outside the reader | Actual reader response excludes each of the 64 created drafts. |
| Publish and render exact revisions | Actual owner action and public reader response preserve every source byte; only declared calculated variables are filled. |
| Protect facts and other content | Canonical source slots, stale-version refusals, unregistered-key and sample refusals; unchanged calculation tests. |
| Retire without resurrecting defaults | Actual publication handler plus reader response and resolver selection. |
| Preserve feed design | Three day tiles, existing classes, card styling, title typography and friend underline asserted before/after publication; desktop/mobile and light/dark screenshots inspected. |
| Preserve existing aspect readings | Existing source-body assertions, real Swiss worker and exact-today date-feed regressions. |

Bundle allocations record the small requested editor/reader feature cost in the
existing budget rationale files. The complete catalog stays out of Studio's
initial entry. No startup, dependency, CSS, privacy or runtime-performance limit
is relaxed. Matched independently installed Admin builds and the final web build
remain separately identified; the web allocation is an absolute final-build
measurement rather than a claimed matched baseline comparison.

Final local result: the complete `test:content-studio-api` command passed in the
independently installed checkout, including the 64-source regression. All 11
release-path browser scenarios passed. Web/Admin typechecks, calculation/source
tests, reader-copy boundary, CSS audit, both builds and bundle budgets passed.
The isolated checkout required read-only links to the repository's existing
protected ingress and report test documents. A native Node import failure found
by the gate was corrected and the complete command was rerun successfully.
No hosted CI, merge, deployment or actual content-store mutation is claimed.
