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
reader copy, invoke the repository skill at
`.agents/skills/marie-satori-writer/SKILL.md` before drafting. Do not write from
general repository context alone. The skill compiles a small governed evidence
packet, separates owner-authored voice from unapproved candidates, runs the
authorship gate before the Terra judge, and preserves approval provenance.

A writer result remains `needs_review` unless the owner explicitly approves
the complete exact wording. A judge score, positive direction, or preferred
line never authorizes governed-content promotion.

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
