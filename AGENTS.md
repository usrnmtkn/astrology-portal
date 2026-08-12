# TLDR Astro agent instructions

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

### Editorial writing and review

For any request to write, rewrite, refine, compare, or approve TLDR Astro
reader copy, load the canonical repository skill at
`skills/tldr-astro-writer/SKILL.md` before drafting. Do not write from general
repository context alone. The skill routes every task through the versioned
meaning-plan, owner-context, draft, separate-review, surgical-revision, and
deterministic-validation pipeline. The existing Marie Satori evidence compiler
at `.agents/skills/marie-satori-writer/SKILL.md` remains the governed retrieval
implementation used by that pipeline.

A writer result remains `needs_review` unless the owner explicitly approves
the complete exact wording. A judge score, positive direction, or preferred
line never authorizes governed-content promotion.

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
