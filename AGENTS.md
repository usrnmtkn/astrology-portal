# TLDR Astro agent instructions

## Content changes

Before changing reader-facing astrology content, review state, resolver
selection, or content-package distribution, read
[`docs/content-management/README.md`](docs/content-management/README.md) and
[`docs/content-management/ARCHITECTURE.md`](docs/content-management/ARCHITECTURE.md).
Keep computed facts in the calculation layer, approved prose in content rows,
and presentation in React/CSS.

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
