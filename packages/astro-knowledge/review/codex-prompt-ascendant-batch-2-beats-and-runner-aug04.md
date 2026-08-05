# Codex prompt — Ascendant batch 2: store approved beats and the batch draft runner

Copy everything below the line into Codex. Deterministic only: no billed calls, no draft
generation, no serving change. One PR, then stop for merge authorization.

---

Branch off current `main` (suggest `codex/ascendant-batch-2-beats-runner`). Three additions:

## 1. Six approved human-moment beats

Add `humanMoment` directly after `plainTranslation` in each governed entry, byte for byte:

`A-neptune_B-ascendant_conjunction.json`:
"{{holder1}} sees something special in {{holder2}}, but {{holder2}} may start becoming the version of themselves that {{holder1}} wants to believe in."

`A-neptune_B-ascendant_square.json`:
"{{holder2}} cannot always tell what {{holder1}} really thinks of them, so {{holder2}} may start watching for approval and changing how they act to keep it."

`A-neptune_B-ascendant_trine.json`:
"{{holder1}} sees {{holder2}} with kindness and gives them room to relax. Around {{holder1}}, {{holder2}} does not have to work so hard to be understood."

`A-pluto_B-ascendant_conjunction.json`:
"{{holder1}} notices every shift in how {{holder2}} acts, which can feel intimate at first. After a while, {{holder2}} may start feeling watched instead of known."

`A-pluto_B-ascendant_square.json`:
"{{holder1}}'s intensity can make {{holder2}} careful about what they reveal. {{holder2}} starts managing every reaction instead of responding honestly."

`A-pluto_B-ascendant_trine.json`:
"{{holder2}} can show more of themselves around {{holder1}} without immediately feeling exposed. The connection grows deeper without {{holder2}} having to stay guarded."

## 2. The batch draft runner

Add `scripts/run-ascendant-batch-drafts.mjs` and
`packages/astro-knowledge/review/ascendant-batch-2-config.json` exactly as supplied alongside this
prompt (they are in the review folder / working tree). The runner replaces agent-orchestrated
draft generation: it builds packets, issues the authorized Sol/Terra calls directly, runs
deterministic checks, and writes the batch-1-layout artifact set. Its `--dry-run` mode is fully
unbilled. Do not modify its authorization, budget, model, or stop-rule logic.

## 3. Verify

- Schema validation passes; no new errors.
- Packet builder confirms all six targets `ready` / `generationAllowed: true` with pinned modes:
  neptune matched/matched/none_found, pluto none_found/none_found/matched (conjunction/hard/soft
  order). If any mode differs, stop and report.
- `node scripts/run-ascendant-batch-drafts.mjs --batch packages/astro-knowledge/review/ascendant-batch-2-config.json --dry-run`
  completes with 0 billed calls and writes packets and model inputs for all six targets.
- Pinned sky-exact corpus counts untouched. `git diff --check` clean.

Open the PR and stop for merge authorization. Phase B (the 12 billed calls) runs via the runner
after merge, outside this task.

## Out of scope

Chiron, Lilith, and Node Ascendant pairs (no governed entries exist; separate source-work step),
the 41 duplicate-copy pairs, any billed call, any serving change.
