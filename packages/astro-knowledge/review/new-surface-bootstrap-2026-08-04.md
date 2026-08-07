# TLDR Astro: new-surface expansion bootstrap

Paste this file (or point the assistant to it) at the start of the new chat. It carries the working
context needed to expand the editorial system to a new surface without re-learning anything.

## Who is who

- **Owner (Marie Satori):** decides everything. Only her explicit approval of exact wording changes
  approval status. Her line edits always win. She writes as Marie Satori; her published corpus is the
  voice source for all generated copy.
- **This assistant:** editorial reviewer and preparer. Produces reviews, sign-off sheets, meaning
  sources, and self-contained Codex prompts. Never approves; never lets its own phrasing stand as
  owner voice.
- **Codex:** implements machine changes in the repo, runs tests, records approvals, reports. Prompts
  to Codex must be self-contained; file hand-offs go through `packages/astro-knowledge/review/`.
- **Sol (gpt-5.6-sol, xhigh):** the writer, billed via OpenAI API. **Terra (gpt-5.6-terra, low):**
  the judge, advisory only, currently limited by OpenAI credits. No score ever grants approval.

## Canonical files (repo: tldrastro, github usrnmtkn/astrology-portal)

- Owner rulings: `packages/astro-knowledge/voice/tldr-astro/marie-satori-owner-feedback-audit.md`
  (OV rules, CF conflicts, VB vocabulary banks). Read before writing anything.
- Editorial decisions (machine): `voice/tldr-astro/marie-satori-editorial-decisions.yaml`.
- Placement surface contract (the model for new surface contracts):
  `voice/tldr-astro/sky-placement.json` (v5: devices, exemplars, fact-gated slots, bans, judge specs).
- Corpus warmth harvest method: `docs/content-management/../editorial-ai/method-corpus-warmth-harvest.md`
  (canonical; applies to all surfaces).
- Serving manifest pattern: `apps/web/src/content/fallbackArchitectureV3/authored-inputs/
  sky-placement-serving-manifest-v1.json` (staged | serving; owner approval per flip).
- Migration/rollout record: `docs/content-management/SKY-PLACEMENT-ON-DEMAND-MIGRATION.md`.
- Owner corpus: `voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/reference-surfaces/`
  plus `TLDR-Article-Edition-*-OWNER.md`. Books and mirrors (CC = chani.com, SD = spiritdaughter.com,
  AC = austincoppock.com) are in the owner's Resources/Downloads folders.

## Permanent rules (condensed; full text in the owner feedback audit)

- No em dashes anywhere. Semicolons are fine (owner uses them).
- Current Sky surfaces: collective voice only - never you/your; never the generic noun "people";
  use we, someone, named subjects. Natal and transit-to-natal surfaces MAY use second person.
- OV-039: no meme-astrology scenes (sign-cliche stock scenes banned; scene must come from the
  placement's meaning at the transit's actual scale).
- OV-040: the morning-reader test - every sentence understandable on one tired read.
- OV-042: the owner corpus is never a quota - no pipeline may fail or demand new owner writing;
  missing corpus matches degrade gracefully (harvest_mode: none_found, plain register, no invented
  warmth).
- Corpus warmth harvest: every card's turn-toward-the-reader traces to the owner's published lines,
  selected by emotional core. Foundation, not verbatim inserts (verbatim preferred when it fits).
- Dates and facts are engine-only: resolver tokens ({{entryDate}} etc.), no generated dates ever;
  qualitative subperiods allowed only inside a reviewed residency.
- Adjacent voices (CC/AC/SD): devices and structure transfer, phrasing never; paraphrase with source
  tags. Shared astrology terminology (Dragon's Head/Tail, cazimi, decans, stations) is never flagged.
- Editorial approval and serving are separate states. staged → serving requires a deployment-verified
  owner-approved key diff. Machines report; the owner decides.
- Fact text that feeds prompts must itself pass the output ban list (packet self-lint).
- Banned in reader copy (partial): weather/forecast/climate for sky, zodiac, tilt, leak, this energy,
  facilitation-workshop language in actions, appositive planet definitions, "the situation" (watch),
  coaching verbs. Full list in the surface contract's outputBans.

## Working cadence (proven on the placement surface, Aug 3-4 2026)

1. Review and REVIEW-mark fact boundaries first (sign-off sheet, one approval).
2. One owner reference piece: iterate a single article line-by-line with the owner to exact approval.
   This is the surface's voice anchor and generation evidence. Most expensive step; do it once.
3. Three pilots (one per register tier if applicable), writer-only billed calls, lint, owner read,
   fix systematic failures as rules, line-edit rather than regenerate good scenes.
4. Batches of seven: one sitting of owner review each; every correction becomes a permanent rule.
5. Owner approvals are explicit sentences naming the artifact and scope. Revocation is always
   possible and recorded.

## System state (as of 2026-08-04, end of session)

- 11 owner-approved placement fallback articles are serving in production (package v3-2026-08-04b,
  merged PRs #48/#55/#56, deployed on Vercel, live).
- Placement content loads on demand (105 kB chunk, out of the boot graph; app boots ~118 kB lighter).
- Batch 2 (next 7 placements) is staged: 5/7 packets pass preflight; pending items are the batch-2
  blocker sign-off application on main (approved but orphaned in an old checkout: four word fixes,
  new data/planetary/chiron.json and lunar-nodes.json with all signs/axes) and the owner's
  authorization of seven billed calls.
- Timing/Calendar surface: V9 meaning corpus active; four exact-owner-approved timing cards are the
  format exemplars; harvest wired; nearest surface to batch cadence.
- Aspects: 240-entry special-point meaning corpus + 214 classical entries exist as Sol source
  material; harvest wired; needs TLDR lines and one owner reference card.
- Terra judge runs blocked on OpenAI credits; all recent runs writer-only.

## Expanding to a new surface: the recipe

A surface needs five assets plus the cadence above:
1. Surface contract (slots, person policy, scale) - clone the sky-placement.json pattern; global
   rules inherit.
2. Reviewed fact boundaries for whatever the surface interprets.
3. One owner reference piece in the exact target format (the irreplaceable step).
4. Warmth harvest wiring mapped to the surface's emotional cores.
5. Judge spec + serving gate (inherited patterns, small additions).

Surface readiness ranking (Aug 4): Calendar/timing (closest - has exemplars, corpus, harvest),
aspects (has meaning corpus + harvest; needs reference + TLDR lines), horoscopes (second person
allowed, owner lines usable verbatim; needs contract + reference from scratch), lunations (richest
corpus mapping; behind the others only in tooling).

## First moves in the new chat

1. Ask the owner which surface, and what exists for it today (any current copy, any format model
   she likes - e.g. a CHANI structural model, as with placements).
2. Read the owner feedback audit and this file's canonical paths before proposing anything.
3. Draft the surface contract deltas and the fact-boundary review plan as a sign-off sheet.
4. Identify what the owner reference piece should be, and start its iteration early - it gates
   everything else.
5. Keep prompts to Codex self-contained; route files through packages/astro-knowledge/review/.
