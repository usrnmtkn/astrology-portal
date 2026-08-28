# TLDR Astro agent instructions

## Repository identity and worktree provenance

Before trusting or reporting on any worktree, refresh the remote-tracking refs
with `git fetch --prune origin` when network access is available, then run
`git remote -v`, `git log -1`, and
`git rev-list --left-right --count origin/main...HEAD`. State the branch and
how far it is from `origin/main` in any status report. A path existing is not
evidence that it is current. Do not use the directory name as proof that an
agent is in the intended clone or worktree. If the fetch cannot be run, state
that the comparison uses unrefreshed remote-tracking refs and may be stale.

If the remote, branch, or divergence does not match the task, stop drawing
repository-wide conclusions and locate the current worktree first. Do not turn
findings from an obsolete clone into pending work, restoration instructions, or
permanent architecture documentation.

Before reporting that content, a template, or a pipeline does or does not
exist, check the current source, any relevant generated knowledge artifact, and
the runtime consumer separately. Say "not present in this worktree" when that
is all the evidence supports. For writing-engine behavior, inspect
`api/_lib/content-generation.ts` and the relevant symbol directly; do not rely
on a prose description of its current prompt assembly.

The voice-corpus / voice-evidence subsystem built against an obsolete June 2026
clone was deliberately discarded. Do not rebuild it; use the canonical writer
and governed retrieval instructions below.

## Worktree safety

Assume uncommitted and untracked files may be owner work. Inspect the worktree
before git operations. Never run `git stash`, `git clean`,
`git checkout -- .`, or `git reset --hard`. Do not discard unrelated changes
or commit without the owner's request.

## Heading and visual-style integrity

Do not add or change an `h1`-`h6` tag, visible title, eyebrow, section label, or
heading-like text without first checking the affected surface's established
component and design-token contract. A semantic HTML correction must not
create an extra visible heading or silently change typography, spacing, casing,
or alignment. When the document outline needs a parent heading that the visual
design does not, use the shared screen-reader-only treatment and keep the
approved visible label hierarchy intact.

Before completing any heading or title change:

- inspect every affected rendered variant, not only the generic fixture;
- verify desktop and mobile, populated and empty states, and light and dark
  themes when those states apply;
- compare the computed font family, size, weight, line height, letter spacing,
  margins, casing, and alignment with the analogous existing heading;
- add or update a targeted regression that asserts both semantic heading order
  and the intended visible-label order; and
- run the CSS/token audit plus the relevant browser flow. Typecheck, DOM
  semantics, or an unrelated visual baseline alone is not sufficient evidence.

## Design-system and CSS integrity

Every new or changed product surface must use the shared design system in
`apps/web/src/styles/theme.css`. Do not introduce raw colors, spacing, radii,
shadows, font families, font sizes, font weights, line heights, or tracking in
component styles. A `clamp()` or `calc()` expression in a component stylesheet
is still a hardcoded value; place the expression behind a documented semantic
token first.

Do not create a component-prefixed typography scale or alias merely to preserve
a one-off visual value. Reuse the established semantic roles:

- narrative paragraphs, card descriptions, previews, write-ups, and list items
  use `--font-body`, `--text-body`, `--weight-regular`, `--leading-body`, and
  `--tracking-body` at every breakpoint;
- titles and visible headings use `--font-display` and an established title
  size/leading token;
- metadata uses the shared meta tokens and must not be used to shrink narrative
  copy on compact or mobile layouts;
- UI labels, data, pills, and navigation use the shared label/UI tokens; and
- `--font-glyph` is reserved for symbols, not readable text.

Before adding a token, confirm that no existing semantic token represents the
role. A genuinely new global role belongs in `theme.css`, must map onto the
canonical type and spacing scales, and must be covered by the CSS audit. Do not
add page-local design tokens to bypass the shared contract.

After CSS, component, or content-surface changes, run `npm run qa:css-audit`
and the relevant browser flow. For typography work, verify computed font
family, size, weight, line height, and letter spacing on desktop and mobile in
light and dark themes. A source declaration containing `var()` is not proof
that the correct semantic token was used.

## Content changes

Before changing reader-facing astrology content, review state, resolver
selection, or content-package distribution, read
[`docs/content-management/README.md`](docs/content-management/README.md) and
[`docs/content-management/ARCHITECTURE.md`](docs/content-management/ARCHITECTURE.md).
Keep computed facts in the calculation layer, approved prose in content rows,
and presentation in React/CSS.

After changing fallback source rows or templates, run
`npm run build:fallback-manifest` before validation or commit. The bundled
manifest and summary are generated integrity indexes; never edit them by hand.
`npm run test:content` must reject source changes whose generated manifest is
stale.

### Runtime artifact verification (mandatory)

A resolver-source test is not proof that readers receive the change. The web
app imports `apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js`,
not the resolver source files directly. After changing fallback resolver
behavior:

1. rebuild `dist/tldr-content.js` from `resolver/index.browser.ts`;
2. bump `PACKAGE_VERSION` and refresh every pinned version assertion;
3. test the Node resolver, browser source resolver, and shipped dist artifact
   against the same fixture; and
4. verify the rendered product surface or its exact app-facing payload.

If the source resolvers pass but the shipped artifact or rendered surface does
not, the task is not complete and must not be reported as deployed.

### Browser release-path verification (mandatory)

A source resolver or unit test is not proof that reader-facing copy is fixed.
Rebuild the actual web bundle and verify the rendered reader route. Local
Playwright runs must start a fresh preview from the current checkout. Never
enable `reuseExistingServer` or use an already-running preview as release
evidence.

For protected owner-authored copy, browser regressions must assert identifying
text from the opening and the final sentence. Checking only that a source file
contains the passage is insufficient. A production claim requires the merge
commit's deployment to finish successfully and the same rendered-copy
regression to pass against the production URL.

### Isolated-worktree application-test prerequisite (mandatory)

An isolated worktree created from Git contains the source for
`@tldr/astro-knowledge`, but not its generated `dist` package. Application
tests resolve the workspace package through those generated exports. Therefore
`npm run test:content` must build `@tldr/astro-knowledge` before importing or
running any application test. This prerequisite belongs in the npm lifecycle;
do not rely on an agent remembering a separate setup command.

A missing local knowledge build is a prerequisite failure, not an application
test failure. Do not classify, waive, or report application-test results until
the prerequisite build succeeds and the suite has been restarted. The
repository regression must reject any change that removes or moves this build
behind the first application-test import.

### Editorial writing and review

Any reader-facing astrology copy written in chat must use the owner’s writing rules, phrase bank, corpus, voice, tone, and prior editorial decisions. Semantic components determine meaning; the owner’s writing determines how that meaning is expressed.

### Owner-authored copy is never compressed

An owner-authored passage is an indivisible, author-final unit. Never shorten,
summarize, excerpt, paraphrase, combine, or reconstruct it to fit a surface,
template, token target, card length, or fallback inventory. Word count is not a
selection criterion and compact matrix evidence is not a substitute for a
known owner-authored passage. If the product needs shorter copy, create a
separate field or content key and obtain the owner's approval for that exact
short version. If the surface cannot render the full passage, fail the unit or
fix the surface; do not change the writing.

Protected owner-authored sources must carry their exact-text hash and word
count. Materializers, imports, CMS synchronization, resolver selection, and UI
rendering must preserve the protected body byte-for-byte. Any mismatch is a
blocking error, not permission to fall back to a shorter row.

### Global owner-vocabulary rule

This rule applies to every reader-facing astrology draft, rewrite, revision,
example, and chat response on every surface. Semantic sources determine what
the astrology means. Owner-authored writing determines the vocabulary,
sentence movement, examples, and tone.

Before writing, retrieve the closest owner-authored passages for the exact
topic and register and use the owner corpus as the positive language source,
not merely as inspiration or a final style check. Do not draft directly from
semantic components, compact operations, doctrine labels, or internal planning
language.

Before showing prose to the owner:

- flag content words that are absent from or unusually rare in the owner
  corpus, except necessary astrology terms and ordinary function words;
- replace unsupported wording with plainer corpus-supported language, or flag
  the unresolved choice for owner review instead of guessing;
- apply the durable correction ledger so a rejected word, construction, or
  substitution is not repeated in a later draft; and
- run the surface register, phrase-bank, do-not-use, and owner-correction
  checks.

An invented synonym is not a correction. When the owner rejects a word or
construction, record the correction with its context and use the owner’s
documented replacement or the plainest supported wording. Do not deliver prose
that is known to fail this rule.

### Chat-output fail-closed gate

Before any reader-facing astrology draft appears in chat, show an evidence
receipt: the rendered surface and register, the meaning sources, at least three
exact owner-authored passages with source paths, the relevant owner corrections,
and the active do-not-use list. A hidden retrieval claim is insufficient. If
the receipt cannot be built, fail closed and do not draft.

Passing a corpus-vocabulary scan is not proof of voice. Generic assistant
scaffolding made from owner words still fails. Compare the draft's opening,
turns, sentence movement, and ending with the selected owner passages. If the
owner says the result does not sound like her, record the complete draft as
rejected evidence and return to retrieval before attempting another version.

For any request to write, rewrite, refine, compare, or approve TLDR Astro
reader copy, load the canonical repository skill at
`skills/tldr-astro-writer/SKILL.md` before drafting. Do not write from general
repository context alone. The skill routes every task through the versioned
meaning-plan, owner-context, draft, separate-review, surgical-revision, and
deterministic-validation pipeline. The existing Marie Satori evidence compiler
at `.agents/skills/satori-writer/SKILL.md` remains the governed retrieval
implementation used by that pipeline.

A writer result remains `needs_review` unless the owner explicitly approves
the complete exact wording. A judge score, positive direction, or preferred
line never authorizes governed-content promotion.

Agents prepare approval records unsigned. Only the owner may mark wording,
components, a composer, or serving state approved. When an approval comes from
another task or tool, its record must cite a resolvable tool, thread or task ID,
and date; a generic `owner_chat` label is not valid provenance.

## Serving-content merge model (v2 - replaces the flight rule; canonical text in CLAUDE.md)

Open PRs touching `apps/web/src/content/fallbackArchitectureV3/**` or `packages/astro-knowledge/**` do NOT block branching or development. Queue, don't halt:

1. Scope PRs merge one at a time, oldest-ready-first unless the owner reorders. Immediately before merging, rebase onto current main and regenerate all generated artifacts.
2. Overlap is judged on SOURCE files only. `dist/tldr-content.js`, bundled manifests, and `content-book.html` are generated - never merge them across branches; the merging PR regenerates them from its sources. A conflict exists only when two PRs edit the same source content.
3. Every scope PR must leave all `review_status: approved` rows byte-identical, unless the PR description quotes the owner's explicit approval for the specific change. Diff the approved rows before merging to verify. Violations are a hard stop.
4. Stop-and-report is reserved for: (a) a source-file conflict with another open PR that rebasing cannot resolve, (b) any change to approved copy without quoted owner approval, (c) CI failures not on the known pre-existing list. Everything else proceeds through the queue.
5. A scope PR idle 3+ days must be rebased or closed by its owning session before that session opens another scope PR.
6. Gate-relevant checks must run in an isolated worktree with its own dependencies installed by `npm ci`. Never symlink or reuse `node_modules` across worktrees. Before reporting a content gate, build `@tldr/astro-knowledge` locally in that worktree and regenerate every affected artifact there; confirm workspace package links resolve inside the isolated worktree.

### Sky aspect surface

Before changing Sky aspect selection, fallback behavior, loading state, card
visibility, grouping, or interaction, read
[`docs/content-management/SKY-ASPECT-SURFACE-CONTRACT.md`](docs/content-management/SKY-ASPECT-SURFACE-CONTRACT.md).
Editorial review state controls which prose may serve; it does not authorize a
new UI treatment. Do not add disclosures, collapsed lists, facts-only buckets,
or alternate aspect-card classes without explicit product approval.

## Calculation integrity

- Never hardcode planetary, lunar-node, angle, house, sign, degree, motion, or
  aspect placements in production code, UI components, content templates, or
  API responses. Every placement must be calculated from the configured
  ephemeris for the requested date, time, and location.
- The canonical North Node is the Swiss Ephemeris True Node (`swe.TRUE_NODE`).
  Do not substitute the Mean Node or a dated sign table.
- Test fixtures may store expected placements as regression evidence, but
  fixture values must never be imported by or used as fallbacks in runtime
  code.
- Any calculation change must preserve ephemeris provenance and include a test
  that checks more than one date against a direct ephemeris calculation. Mocks
  and fallback engines must be explicit and confined to tests or development.

## Production deployments

Vercel production has one source of truth: the `main` branch.

- Work on feature branches and use their Vercel preview deployments for QA.
- Never run `vercel --prod`, `vercel promote`, `vercel rollback`, or reassign
  `tldrastro.vercel.app` while checked out to a branch other than `main`.
- Never make a feature-branch preview the public production alias.
- When a feature is approved, merge it into `main` and let the Vercel Git
  integration deploy that `main` commit automatically.
- Before any manual production recovery, confirm the intended commit is on
  `origin/main`, the worktree is clean, and the deployment metadata names
  `main` as `gitCommitRef`.

The production build runs `scripts/assert-vercel-production-source.mjs` and
rejects non-`main` or source-less production builds. Do not bypass that guard.
