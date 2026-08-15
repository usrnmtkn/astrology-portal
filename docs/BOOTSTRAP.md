# Bootstrap: TLDR Astro writing engine

Paste this at the start of a new chat. Everything it references is in the repo.

Repo: `/Users/mprez/Code/tldrastro-friends-transit-wave-1-review`
Last updated: 2026-08-15

---

## What we are building

TLDR Astro is an astrology app. The writing engine turns a chart configuration
into reader-facing prose in the owner's voice, without the model inventing life
details the chart does not license.

**The architecture is one governed kernel with surface-specific writers.** The
kernel owns everything that must never drift — evidence resolution, provenance,
hashing, surface permissions, validation, fail-closed behaviour. Each surface
(Daily, Friends, Sky, Synastry, articles, reports) owns its own prose decisions:
length, point of view, whether advice is allowed.

```
canonical ID -> evidence resolver -> governed packet -> surface strategy
  -> planner -> writer -> shared validation + surface validation
  -> advisory Reader Judge -> optional revision -> revalidation -> PENDING OWNER
```

**Read `docs/WRITING-ENGINE-GLOSSARY.md` first.** Terms like *authority class*,
*surface permission*, *the gate* versus *the Reader Judge*, and *voice evidence
index* have exact meanings. Using them loosely causes real rework.

---

## Where things stand

### Catalog

```
13,221 canonical objects | 24,107 source records
0 unresolved | 0 collisions | 55 skipped (deliberate, each with a reason)
```

Baselines, all shrink-only:

- `config/production-identifier-quarantine.json` — 3,328 known-failing
  production identifiers (3,216 catalog gaps, 60 empty evidence, 28 permission
  gaps, 24 unmapped shapes, **0 misparse**)
- `config/catalog-unreadable-baseline.json` — 690 objects that yield no prose,
  legitimately (citation indexes, licences)
- `config/writing-kernel-drift-allowlist.json` — 28 frozen kernel bypasses

### Governed today

- Friends transit writer
- `api/_lib/content-generation.ts` (all production reader prose)
- `api/cron/generate-sky-aspects.ts`
- `api/cron/generate-sky-placements.ts`
- The whole report chain, via `api/_lib/report-production-gate.ts`

### Known production model paths not governed

- None. Every known production writer, reviewer, and reviser path now crosses
  the governed pre-call boundary.

### In flight

P0-P3 and the legacy placement-cache correction are implemented and tested in
the worktree. Deployment, production environment variables, the deployed smoke
check, and the canary remain owner actions. Follow
`docs/runbooks/sky-canary-rollout.md`.

---

## Owner decisions already made — do not re-ask

- **Rollout:** Sky canary. `WRITING_KERNEL_GOVERNED_SURFACES=sky` at canary 0
  first (pure governance, prompt bytes unchanged), then 10%, then widen.
  Rollback is canary 0 plus global enable 0.
- **Scope:** wire up everything, not Sky alone.
- **Axis derivation:** the Descendant's sign derives from the Ascendant.
  Identity derives; meaning does not. Derived targets are mechanism reference
  with `framingAllowed: false`.
- **Nonagen** is an alternate spelling of semisextile.
- **Third-party books never enter the repo.** Doctrine-only, voiced originally,
  never quoted into a prompt. 41 titles stay in `~/Downloads/Resources`.
- **Machine drafts are audit material**, never prompt context.
- Markdown stays the human-readable source; JSON is generated from it with a
  `--check` that fails on drift.

## Open, needs the owner

1. **Deploy and run the serverless smoke.** The worktree now bundles both
   indexes and every resolver source family. The deployed environment still
   must prove `assertIndexCurrent()` succeeds.
2. **Check the historical Vercel logs for the sky-aspect cron.** Determine
   whether `KNOWLEDGE_INDEX_MISSING` caused an outage before the bundle fix.
3. **When to take the placement content blackout.** The 2026-08-15 read-only
   inventory found 19 legacy generated bases and 1 legacy topper that the new
   owner-review boundary hides. Replacements are generated only as drafts.
4. **`sky-aspect/*` wording approval** — 198 records are indexed as
   `unverified` / `needs-owner-decision`.
5. **The bounded Sky parity run** — 16 billed writer calls, spec written, never
   authorized. Optional; the canary at 0 gives most of the signal free.
6. **11 impossible composite phrasebank objects** to delete (Sun-Mercury and
   Sun-Venus at aspects that cannot occur).
7. **The remaining authoring gaps:** 11 South Node sign sources, 12 Midheaven
   sign entries plus distinct IC meaning work, a Lilith phrasebank file, an
   angles article, and 78 Lilith records to promote. Axis geometry does not
   license borrowing the opposite pole's prose.

---

## How to work here

**Verify before asserting.** The recurring failure this project has hit is not
bad code, it is *checks that pass without testing anything*. Four real examples,
all mine:

- Confirmed a generator was deterministic when it had thrown before writing, so
  the matching hashes proved nothing
- Applied elongation limits to synastry and transits, where they do not hold
- Shipped `if (rowsRead !== rowsPresent)` where both sides came from the same
  array
- Claimed the sky cron auto-publishes at score 3, in two documents, from a stale
  reading I never re-checked

The habit that catches these: **ask what would have to be true for this check to
fail, and whether that is reachable.** A guard nobody has seen fail has not been
tested. `scripts/test-index-store-guards.mjs` is the pattern — it reintroduces
each bug and asserts the build refuses.

**Distinguish what you verified from what you were told.** When relaying a
survey or a subagent's findings, say which claims you checked yourself.

**Reports overstate.** Check them. Several times a correction was worth more
than the original work — including Codex correctly catching my row count, and
the audit finding ten dead guards.

**Standing rules:** nothing serves without explicit owner approval; source
approval never inherits into copy approval; fail closed; no billed call without
an authorization cap; only deterministic gates block, judges advise.

**Sequencing hazard:** editing corpus files invalidates the index and halts any
in-flight billed run with `KNOWLEDGE_INDEX_STALE`. Confirm no run is active
before regenerating.

**Owner communication** (also in `CLAUDE.md`): plain language, lead with what
happened and what it means, short sentences, keep the precise detail but put the
plain meaning first. Say plainly when something is broken and when a decision is
needed.

---

## Commands

```bash
node scripts/build-knowledge-index.mjs --check        # index freshness
node scripts/test-knowledge-wiring.mjs                # 7 kernel tests
node scripts/test-catalog-reachability.mjs            # indexed == readable
node scripts/test-index-store-guards.mjs              # guards actually fire
node scripts/test-production-identifier-coverage.mjs  # 10,953 identifiers
node scripts/test-production-precall-gate.mjs
node scripts/test-production-evidence-adapter.mjs
node scripts/test-writing-kernel-drift.mjs            # no new bypasses
node scripts/lint-corpus-grammar.mjs
node scripts/build-transit-house-files.mjs --check
```

All pass as of 2026-08-15. The four-body inventory generator needs
`FOUR_BODY_RESOURCES_DIR` set or it throws before writing — a run without it
"succeeds" having done nothing.

## Key documents

| Path | What |
|---|---|
| `docs/WRITING-ENGINE-GLOSSARY.md` | vocabulary — read first |
| `docs/directives/2026-08-14-engine-wireup-implementation.md` | the live work |
| `docs/decisions/2026-08-14-writing-kernel-and-surface-strategies.md` | architecture |
| `docs/decisions/2026-08-14-deep-audit-dead-guards.md` | the eleven dead guards |
| `docs/decisions/2026-08-14-v9-house-activations-dropped-by-indexer.md` | 2,368 rows silently dropped |
| `docs/decisions/2026-08-14-impossible-aspects-and-four-body-coverage.md` | astronomy filter, four-body coverage |
| `docs/directives/2026-08-14-four-body-promotion-plan.md` | six-step promotion plan |
| `docs/four-body-promotion-inventory.md` | 433 assets, classified |
