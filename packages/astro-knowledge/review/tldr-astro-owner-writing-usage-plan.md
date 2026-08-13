# Plan: putting the owner's long-form writing at the center of the app

Date: 2026-08-12. Status: proposal for owner review. No changes made.

## Why now

The whole-passage semantic QA (2026-08-12) made the case quantitatively. Of 7,702
judged natal passages, 4,816 were flagged — and the flags concentrate almost
entirely in *assembled* copy (frame + slot composition), while the surfaces that
serve your authored rows read clean. This is the fourth time the same lesson has
surfaced: the CC v5 rewrite, the LL V13 direct-language edition, the friend-frame
41/43 rejection, and now this QA. Authored beats assembled, every time it has
been measured.

You wrote the long-form delineations expecting them to appear in the output.
Today most of them don't. This plan closes that gap.

## What you have, and where it reaches the app today

**Serving as real passages (working as intended):**
- 301 owner-approved LL V13 rows — planet-in-sign, planet-in-house, and aspect
  delineations (median ~370 characters of authored prose). Serving natal
  placements since PR #162.
- 241 authored natal-aspect-lived rows. Serving natal aspects.

**Written but idle:**
- 713 unapproved LL matrix rows — the rest of your natal delineation write-ups.
  Exported and staged, excluded from serving only because they have not been
  through your review. This is the largest body of finished-but-unused writing.

**Serving only as *influence*, not as passages:**
- Knowledge matrix v8/v9 (transit and house write-ups, ~1,300 entries) and the
  CC/ML/AC voiced matrices (2,400+ cells). These feed the writer/judge voice
  index as few-shot evidence — they shape how generated text sounds, but the
  reader never sees your actual sentences.

**Not serving at all (assembled instead):**
- Empty houses (541 hook rows — the worst QA offender, including the ruler-splice
  seam), sky placements (672 rows across four hook types), transit effects,
  daily copy, synastry pairs. All composed from short fragments.

## The principle

**Authored-first serving.** Wherever an owner-authored passage exists for a
chart fact, the app serves that passage. Composition is demoted to a fail-closed
fallback for keys with no authored coverage — and where composition would seam
two unrelated ideas (the ruler pattern), it fails closed instead of rendering.
Friend voice derives from the authored self-voice row, never from independent
frame assembly (this is already the pass-2 design; the principle just extends it
everywhere).

## The plan, in four phases

**Phase 1 — activate the writing that already exists.**
Review the 713 idle LL rows in batches (the V12→V13 clarity workflow already
proved the format: judged batches, your verdicts, byte-identical ingestion).
Every approved row immediately widens direct authored serving for placements,
houses, and aspects — no new writing required, only review. This phase turns the
QA's biggest flagged family (placement-composed, 2,429 flags) into authored
territory.

**Phase 2 — replace the worst assembled families with authored passages.**
Empty houses first: 1,425 flagged passages and all the ruler-seam CUTs. An empty
house has a small real keyspace (12 houses × 12 ruling-sign contexts): author
them as whole passages derived from your LL house write-ups, and retire the
ruler-splice pattern on every surface, not just friend voice. Sky placements
second: your v8 transit/house write-ups become the served sky-placement
passages, replacing the four-fragment hook assembly.

**Phase 3 — put your passages inside the reports.**
This is the direct answer to "use the long-form writing inside the write-ups."
Today the report writer *imitates* you (voice-index evidence). Change the
contract: for each report unit, retrieval selects the owner-authored passage
matching the unit's chart facts, and that passage becomes the delineation core
of the unit — served intact. The writer's job narrows to what only it can do:
timing, transitions, and the reader's specific chart context around your prose.
The judge gains one deterministic check: the embedded owner passage must survive
byte-identical. Your writing stops being a style reference and becomes the
product; the 16 SKUs become, in substance, editions of your writing.

**Phase 4 — measure it.**
Re-run the semantic QA after each phase as a regression suite. The metric that
matters: flag rate of authored passages vs assembled passages. If the thesis
holds (it has, four times), each phase visibly drains the EDIT/CUT pool without
a single hand-fixed passage.

## Governance

Nothing changes: every passage that reaches serving passes through your review
batches; approved rows are byte-identical invariants; unapproved rows never
serve; missing coverage fails closed as SOURCE_GAP; all merges ride the queue.
This plan doesn't loosen the gate — it routes more of the product through the
gate you already control.

## Sequencing against current work

Pass 2 and the broader defect batch are not displaced — they are absorbed. Pass
2's authored friend rows are Phase 1's friend-voice arm. The broader batch's
378/146/49 findings mostly live in rows Phases 1–2 replace outright, so the
batch shrinks to whatever survives the replacement. The QA rollup Codex is
preparing (row-level table) becomes the priority order for Phase 2: highest
flag-rate families first.

## What needs your decision

1. Greenlight Phase 1: the 713-row review pipeline (batched workbooks, same as
   V12→V13).
2. Greenlight the Phase 2 empty-house authoring approach (passages derived from
   your LL house rows; ruler-splice retired on all surfaces).
3. Phase 3 changes the report writer contract — approve the direction before
   any implementation.
