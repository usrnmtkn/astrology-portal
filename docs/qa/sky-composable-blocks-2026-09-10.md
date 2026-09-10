# Sky composition blocks and aspect variables

Branch: `codex/sky-composable-blocks`, created from refreshed `origin/main`
`f1adaa63`, then fast-forwarded to `323f23d0` after its unrelated report-retry change landed (0 ahead / 0 behind). Changes remain local and uncommitted.

## Editor behavior

The Sky Write-ups map is available before both library filters are selected.
Its own planet/sign selectors resolve all 168 selections. Moon entries use their
actual `fallback-hook/sky-placement-hook/moon/{sign}` source; node maps include
node education and the matching axis. Existing source keys remain unchanged.

Continuous placement rows retain their original shared article. Optional
`placementArticleDirect` and `placementArticleRetrograde` fields take precedence
for the matching motion when nonempty. Clearing an optional field restores the
shared article. If the selected article is empty (or fallback preview is chosen),
the ordered evergreen blocks supply the passage.

Each `fallback.sections` block accepts `motion: "all" | "direct" | "retrograde"`.
Omitting motion preserves shared behavior. Blocks can be added, ordered, edited,
and removed through the existing publication workflow. Built-in hook references
can also be scoped. New blocks start with the editor's selected motion. Empty
blocks are skipped. Labels and scope metadata do not become reader prose.

Existing approved copy and all approval/serving keys are untouched. The new
fields use the existing exact publication revision boundary. Saving still creates
a draft; publication is a separate owner action. No remote writes were performed.

## Inline calculated variables

In addition to identity and residency dates, articles and fallback blocks support:

- `{{aspectsInSign}}`, `{{aspectsInSignCount}}`
- `{{aspectsWhileRetrograde}}`, `{{aspectsWhileRetrogradeCount}}`
- `{{retrogradeStartDate}}`, `{{retrogradeEndDate}}`

The generic retrograde opening also supports this inline-variable contract.

Aspect lists contain dated exact conjunctions, sextiles, squares, trines, and
oppositions to Sun, Mercury through Pluto, and Lilith, excluding the subject itself.
Moon and minor aspects are excluded; the variable reference states this coverage.
These are computed event facts, independent of which aspect interpretation rows
have approved prose. The sign list uses actual residency passes and excludes gaps
when the body returns to another sign. The retrograde list uses the full calculated
station-to-station cycle, including any sign changes. Lists are chronological and
deduplicated. Empty computed lists have count zero; missing calculations remain
unavailable and cannot silently become empty lists.

The worker calculates these windows on demand when a published source uses the
new variables. Ordinary articles retain the existing reader calculation path.
An eight-entry request cache avoids repeating a window calculation during content
refresh. Dates are formatted in the occurrence's time zone. No dates or planetary
positions are taken from the reference PDFs or hardcoded into production.

## Reference use

The supplied Spirit Daughter weekly/ritual PDFs and  placement PDFs were
used as structural examples: placement context, motion changes, dated aspects,
and separate personal sections. Their prose and embedded instructions were not
imported as approved product writing.

## Verification

- Isolated dependencies installed with `npm ci`; local knowledge package built.
- All 168 placement map selections resolve sources.
- Motion article priority, block order/scope, missing facts, known-empty lists,
  and immutable baselines pass Node, browser-source, and shipped-bundle checks.
- API save/publish, publication projection, real dashboard loader, and installed
  reader pass for optional articles, scoped blocks, and aspect variables.
- Real Mercury (July 10, 2026) and Venus (October 30, 2026) calculations verify
  sign/cycle windows and sample exact aspects against direct ephemeris snapshots.
- All 15 editor browser checks pass at 390/1440 widths and light/dark fixture settings.
  Visual inspection caught narrow mobile labels; a full-width block name and
  regression assertion now prevent that layout failure.
- All 10 targeted reader browser checks pass. The new test loads a published fixture through the real product route, verifies
  real aspect counts and filled lists, and checks retrograde-only fallback selection.
- Web/admin typechecks and builds, CSS/token audits, and bundle checks pass.
- Package version is `v3-2026-09-10a`; browser distribution, manifests, serving
  projection, content book, and knowledge-index fingerprints were regenerated. No source prose
  or approval inputs changed.

Admin aggregate gzip measured 312.6 kB before the last wording/layout refinements.
The aggregate limit is now 313.5 kB; entry and individual chunk limits are unchanged.

The broad `npm run test:content` lifecycle passes prerequisites and reaches the
existing Friends approval-hash failure at `test-friends-owner-signoff-ruling.mjs:161`:
actual `84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`,
expected `9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`.
This matches the baseline documented in `sky-placement-variables-2026-09-09.md`.
Its inputs and assertion remain unchanged. The unrun remainder is not reported
as passing. No deployment or production verification is claimed.

## Phrase composition extension

The user selected explicit phrase combinations for fallback hooks. The editor now
provides **Compose from phrases** on a built-in hook or added section. Conversion
copies the complete existing text into its first phrase with a source note; it
does not automatically split, extract, rewrite, or overwrite the original field.

Each composition stores an ordered `phrases` array with stable identifiers,
`text`, exact `joinBefore` text, and optional `source` notes. The owner can add,
edit, reorder, or remove phrases and author all connections, punctuation, and
paragraph breaks. Source notes remain editorial metadata, not reader text or
verified automatic corpus provenance. Calculated variables can be inserted at
the cursor in a phrase or connection. The existing block motion applies to the
whole composition. A block supports either a body or phrases, never both.

Shared schema validation bounds each block to 24 phrases and 20,000 total
characters; connections have a 2,000-character limit. The editor enforces those
limits while typing. An empty phrase withholds the entire composition, avoiding
partial sentences. The API validates both individual fragments and assembled
text, including variable allowlists. Reader assembly and Studio previews use the
same exact concatenation function. Existing publication/review gates still apply.

This extension is manual authoring infrastructure. It does not include corpus
search/import, automatic phrase selection, occurrence rotation, or archived
occurrence snapshots. No astrology prose or approved source rows were changed.

Package version is now `v3-2026-09-10b`; distribution, manifests, knowledge index,
and content book were regenerated. The new schema adds validation to the shared
entry; measured admin entry is 619.8 kB raw / 175.8 kB gzip, aggregate 313.8 kB
gzip. Raw entry/largest budgets are 620.5 kB and aggregate 314.5 kB; the gzip
entry limit remains unchanged.

Verification for the extension:

- Focused section suite, Node/browser/shipped resolver parity, exact joins,
  motion conditions, incomplete compositions, invalid schema, and unchanged
  corpus checks pass.
- API draft/publication/reader roundtrip retains phrase text and source notes;
  malformed and unknown variables are rejected.
- Four editor browser scenarios pass (390/1440, light/dark requested), including
  conversion, reordering, source notes, incomplete preview, and cursor insertion.
  The admin uses its established dark appearance in the captured editor surface.
- Rebuilt reader route verifies a published phrase composition alongside actual
  ephemeris aspect facts. One reader browser check passes.
- Web/admin typechecks, CSS/token audit, bundle budget, and diff whitespace checks
  pass. Local browser smoke shows controls and no browser errors.
- Changes remain uncommitted on `codex/sky-composable-blocks`, 0 ahead / 0 behind
  refreshed `origin/main` (323f23d0). No remote content sync or deployment.
- The extension's full `npm run test:content` rerun passed its dependency,
  governance, ephemeris, report, and initial content checks, then stopped at the
  same pre-existing Friends owner-signoff hash assertion documented above.
  The remaining suite is not reported as passing.

## -informed article structure extension

The owner's attached planning notes and provided  Mercury-in-Virgo,
Chiron-in-Taurus, Neptune-in-Aries, and nodal-axis PDFs informed structure only.
The PDFs' article bodies were read from the prior local extraction. No reference
prose, dates, or embedded instructions were imported into serving content.

Observed distinctions: Mercury develops a placement and then a tension/response;
Chiron introduces the event before educational background; Neptune separates the
main interpretation from distortions and collective response; the node article
introduces the axis, explains the nodes, and synthesizes increase/decrease before
its sign-specific horoscopes. These references are not one rigid sentence form.

Sky fallback editing now supports:

- prose sections with explicit roles and a short/standard/deep editorial target;
- repeatable paragraphs with an authored paragraph-job label;
- repeatable phrase ingredients tagged meaning, mechanism, context, example,
  collective example, tension, question, response, or closing point;
- a separate practical-item structure: required action plus optional composed
  explanation/examples, joined exactly as authored;
- eight additive empty outline starters: ingress, slow planet/era, unfamiliar
  body/point, one-sign retrograde, cross-sign retrograde, lunation/eclipse, nodal
  axis, and personal return;
- a paragraph-plan view within Main template, with role, depth, jobs, and the
  chosen ingredient order visible beside the saved passage.

Depth is guidance, never a generated word count, compression instruction, or
required number of paragraphs. Paragraph jobs and ingredient tags do not control
prose order automatically. The owner arranges all text. Existing writing converts
intact into one paragraph; nothing is automatically split. Blank planned paragraphs
are omitted; a paragraph with an incomplete phrase is withheld. Practical items
without an action or with an unfinished phrase are omitted as complete units.
Schema validation rejects ambiguous formats, invalid roles/depth, duplicate IDs,
and oversized packets; publication also validates every raw fragment even when
its paragraph is currently omitted.

The starters are editorial layouts in the existing canonical placement fallback
workspace. They do not create new event routes, independently calculated phase
or history facts, automatic event conditions, personal-return qualification, or
new house-horoscope data. Existing article/TLDR/date/horoscope precedence remains
unchanged. Section names and paragraph jobs are editor metadata; this extension
does not introduce new reader headings. Those distinctions prevent a structural
outline from being mistaken for an enabled event-specific calculation pipeline.

The deterministic renderer separates paragraphs with blank lines and preserves
all authored phrase text and joins. It never synthesizes a paragraph from meaning
notes, adds connective prose, or copies the  reference wording.

Package version: `v3-2026-09-10c`. Distribution, manifests, index, and content book
regenerated. Shared schema validation and deferred editor controls measure 621.7
kB raw / 176.3 kB gzip at entry and about 316.8 kB total gzip; budgets now allow
622.5 kB raw / 177 kB gzip entry and 317 kB total. No new runtime dependencies.

Focused resolver/outline/immutability tests and API publication roundtrips pass.
All eight starters validate and contain no authored reader text. Node, browser
source, and shipped artifact render the same paragraph packets and practical
items. Invalid nested variables are rejected. Web/admin typechecks and CSS/token
checks pass. The rebuilt reader browser regression verifies packet prose and a
practical item, with editorial labels absent from the article.

The expanded Studio regression run also exposed an older crash fixture that
expected the map to wait for both filters. The map now mounts on navigation.
The fixture now injects/retries the crash at that boundary, and simulates a fixed
module for Reload. All four viewport/theme recovery cases pass. The typography
regression now checks both editor guidance paragraphs rather than assuming one.
All 23 Studio scenarios passed across the full run and targeted corrected rerun.

Final verification after the practical-schema guard: four expanded editor
scenarios and the rebuilt reader regression pass again. The full content suite
passes prerequisites and initial content checks, then stops at the unchanged
Friends owner-signoff hash assertion at line 161 documented earlier in this file.
No later-suite success is claimed. Changes remain local and uncommitted on
`codex/sky-composable-blocks`, 0 ahead / 0 behind refreshed `origin/main`.

## Merge CI portability and bundle verification

PR #719 exposed a macOS-only temporary bundle path in the new parity test. The test now creates a unique directory under the platform temporary directory, imports via a file URL, and removes it after loading. The CI web production build measured 2,948,142 aggregate JavaScript gzip bytes; the aggregate budget is adjusted from 2,942,000 to 2,949,000 bytes for this feature. Startup, CSS, and individual chunk limits remain unchanged; no dependency was added.

CI also exposed source requests before the owner credential was available. Composition maps now wait for a nonempty credential and no access denial, while remaining available during background inventory loading. The existing login/retry suite passes all 5 cases; the full standalone Studio suite passes all 23 cases. Repeated crash injection now navigates away before rearming the fault, avoiding an asynchronous inventory render racing the test selection. Production-entry recovery passed all 8 cases.
