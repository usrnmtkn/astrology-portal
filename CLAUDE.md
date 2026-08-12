# TLDR Astro Claude instructions

## Serving-content merge model (v2, 2026-08-08 — replaces the flight rule)

Scope: `apps/web/src/content/fallbackArchitectureV3/**` and
`packages/astro-knowledge/**`.

The v1 flight rule halted all work whenever any open PR touched the scope.
With multiple concurrent agent sessions that halted everything constantly and
made the owner adjudicate every merge. v2 protects the same things — approved
copy and generated-artifact integrity — with a queue and an invariant instead
of a stop.

1. **Queue, don't halt.** Open PRs in scope do not block branching or
   development. They establish merge order: scope PRs merge one at a time,
   oldest-ready-first unless the owner reorders. Immediately before merging,
   rebase onto current main and regenerate all generated artifacts.

2. **Overlap is judged on source files only.** `dist/tldr-content.js`, the
   bundled manifests, and `content-book.html` are generated — never merge them
   across branches; the merging PR regenerates them from its sources. A
   conflict exists only when two PRs edit the same source content.

3. **Approved copy is protected by invariant, not by pausing.** Every scope PR
   must leave all `review_status: approved` rows byte-identical, unless the PR
   description quotes the owner's explicit approval for the specific change.
   Diff the approved rows before merging to verify. Violations are a hard
   stop.

4. **Stop-and-report is reserved for:** (a) a source-file conflict with
   another open PR that rebasing cannot resolve, (b) any change to approved
   copy without quoted owner approval, (c) CI failures not on the known
   pre-existing list. Everything else proceeds through the queue.

5. **PR hygiene.** A scope PR idle for 3+ days must be rebased or closed by
   its owning session before that session opens another scope PR.

6. **Isolated gate execution.** Every gate-relevant check runs in an isolated
   worktree with dependencies installed locally by `npm ci`. Never symlink or
   reuse `node_modules` across worktrees. Before reporting a content gate,
   build `@tldr/astro-knowledge` locally in that worktree, regenerate every
   affected artifact there, and confirm workspace package links resolve inside
   that isolated worktree.
