# Codex prompt — Ascendant batch 1: store approved beats, then generate card drafts

Copy everything below the line into Codex. This scales the completed Jupiter–Ascendant pilot
(PRs #51 and #61) to five pairs: Sun, Moon, Mercury, Venus, and Saturn against the Ascendant.
It has two phases. Phase A is deterministic and unbilled. Phase B is billed and
owner-authorized at exactly thirty successful calls: 15 Sol writer calls (one draft per target,
no retries without stopping for direction) and 15 Terra judge calls. Nothing else billed.

---

## Phase A — store the approved human-moment beats (unbilled, own PR)

Branch off current `main` (suggest `codex/ascendant-batch-1-human-moments`). Add a `humanMoment`
field to each of the fifteen governed entries in `packages/astro-knowledge/data/synastry/aspects/`,
placed directly after `plainTranslation`. The field is already registered in the schema and
validator (PR #51). Use these strings exactly, byte for byte — they are exact owner-approved
semantic input, not reader copy. Do not rewrite, trim, or improve them.

`A-sun_B-ascendant_conjunction.json`:
"{{holder1}} makes {{holder2}} feel seen and more certain about what they want, but {{holder2}} may start relying on {{holder1}}'s confidence instead of making their own decisions."

`A-sun_B-ascendant_square.json`:
"Around {{holder1}}, {{holder2}} may feel that {{holder1}} decides the tone and direction, so {{holder2}} works harder to make their own personality and choices clear."

`A-sun_B-ascendant_trine.json`:
"{{holder1}}'s confidence helps {{holder2}} feel more comfortable being themselves when they meet people or enter a new situation."

`A-moon_B-ascendant_conjunction.json`:
"{{holder1}} notices {{holder2}}'s mood almost immediately, which can feel comforting when {{holder2}} wants to be understood and exposing when {{holder2}} wants privacy."

`A-moon_B-ascendant_square.json`:
"{{holder2}} may start watching {{holder1}}'s mood and changing how they act to prevent tension before anything has even happened."

`A-moon_B-ascendant_trine.json`:
"Around {{holder1}}, {{holder2}} can relax and show how they feel without worrying that it will become a problem."

`A-mercury_B-ascendant_conjunction.json`:
"What {{holder1}} says about {{holder2}} can quickly shape how {{holder2}} sees themselves and how they choose to present themselves."

`A-mercury_B-ascendant_square.json`:
"{{holder1}}'s questions and comments can make {{holder2}} feel picked apart, so {{holder2}} starts explaining or defending themselves instead of acting naturally."

`A-mercury_B-ascendant_trine.json`:
"{{holder1}} makes it easier for {{holder2}} to say what they mean and feel understood without having to explain every part of themselves."

`A-venus_B-ascendant_conjunction.json`:
"{{holder1}} makes {{holder2}} feel liked and accepted, but {{holder2}} may start changing small parts of themselves to keep that approval."

`A-venus_B-ascendant_square.json`:
"What {{holder1}} likes, dislikes, or considers appropriate can make {{holder2}} question their own style and how they naturally act around {{holder1}}."

`A-venus_B-ascendant_trine.json`:
"{{holder1}} likes {{holder2}} as they are, and that makes {{holder2}} feel more relaxed and comfortable around {{holder1}}."

`A-saturn_B-ascendant_conjunction.json`:
"{{holder1}}'s standards make {{holder2}} more aware of how they act, but {{holder2}} may start holding parts of themselves back to avoid criticism."

`A-saturn_B-ascendant_square.json`:
"Around {{holder1}}, {{holder2}} may feel like every move is being noticed, so ordinary situations start to feel like something they have to prepare for."

`A-saturn_B-ascendant_trine.json`:
"{{holder1}} is consistent and takes {{holder2}} seriously, which helps {{holder2}} feel comfortable enough to be themselves without proving anything first."

Verify Phase A before opening the PR: schema validation passes with no new errors; the packet
builder (`--surface synastry-aspect --format full-card`) reports every target `ready` /
`generationAllowed: true` with exactly these modes:

| Target | conjunction | square (hard) | trine (soft) |
|---|---|---|---|
| Sun | matched | matched | matched |
| Moon | matched | matched | none_found |
| Mercury | matched | none_found | none_found |
| Venus | matched | none_found | none_found |
| Saturn | matched | none_found | matched |

If any mode differs, stop and report; do not adjust beats, corpus, or matcher. `none_found` is
owner-accepted plain register (OV-042). Pinned sky-exact corpus counts (240 / 198 matched /
42 fail-closed / 225 calibration) must be untouched. Open the PR and stop for merge
authorization.

## Phase B — generate drafts for owner review (billed, after Phase A merges)

Branch off `main` post-Phase-A (suggest `codex/ascendant-batch-1-card-drafts`). For each of the
fifteen targets, follow the Jupiter–Ascendant draft process exactly
(`codex-prompt-jupiter-ascendant-card-drafts-aug04.md` structure, and the shipped
`review/jupiter-ascendant-card-drafts-v1/` packet as the reference artifact set):

1. Build the packet deterministically; confirm it matches the mode table above.
2. One Sol draft per target using the packet's promptBlock and the marie-satori-writer contract.
   Direction fixed: {{holder1}}'s planet acting on {{holder2}}'s Ascendant. Meaning is bounded by
   each entry's governed `plainTranslation`/`summaryDeep` — no imported planet meanings beyond
   them, no invented scenarios, no excluded-claim classes (luck, guaranteed events, third-party
   arrivals, literal size/food/bills, scorekeeping, required confidence). Row shape and
   placeholder conventions must match the shipped Jupiter–Ascendant rows. All Marie Satori
   editorial decisions apply: no em dashes, morning-reader test, no stock closers, stop when
   behavior and cost are clear. Matched packets: at most one warmth sentence, placed after the
   shadow or cost, traced to a supplied foundation line with `warmthSource` recorded. None_found
   packets: plain register, no invented warmth.
3. Terra judge per draft after deterministic checks. Under none_found, no turn toward the reader
   is required; invented imitation warmth still scores 2.
4. Full review packet per pair under
   `packages/astro-knowledge/review/ascendant-batch-1-card-drafts-v1/<pair>/<aspect>/` with the
   same artifact set as the Jupiter packet (packet, draft, provider responses, deterministic
   checks, verdict, model inputs), plus a single top-level SUMMARY.md presenting all fifteen
   candidates beside the legacy copy they would replace, grouped by pair, with Terra scores.

All candidates end `needs_review`. No approval, promotion, serving-row change, or dashboard
synchronization. Log all billed calls; report the final count (must be exactly 30 successful).
Stop after the review packet is complete — owner review of all fifteen happens in one pass, then
revisions/approvals and a single shipping PR follow as separate authorized steps.

## Out of scope

- The remaining six Ascendant pairs, the 41 duplicate-copy pairs, and non-synastry rows.
- Any edit to serving rows in either phase.
- `FEELING_FAMILIES` inflection coverage (separate prompt).
