# "Today between you two" — daily pair paragraph (spec, v1 draft)

Status: IMPLEMENTED. The full frame and clause sets were owner-approved on
2026-08-06, satisfying the original dark-launch gate below. Drafted 2026-08-06
after comparing the Co-Star friend Compatibility surface; product direction
confirmed by the owner in session.

## Purpose

A short daily paragraph at the top of a friend's Compatibility tab that reads as one
piece of writing but changes every day. Synastry is static; this surface is what makes
the pair page worth revisiting. The daily variation comes from each person's transits
for today plus one shared condition — never from recomputing synastry.

Reference model (Co-Star, observed 2026-08-06): "@mariesatori, your goal is to explore
ingenuity, while @alisapopovic38 is learning how to make their innovative vision a
reality. You're both leading more with emotion than logic today. Talking on the phone
with your eyes closed can be an interesting experiment. Don't try to communicate the
ineffable." Five slots, assembled from fragments. We adopt the slot structure; we do
not adopt the seamy fragment tone — our frames must read as one voice.

## Naming rule (owner requirement, 2026-08-06)

The friend is always referenced by their @handle (`handle` on the social friend
record), rendered with the literal `@`: "@alisapopovic38". Fallbacks, in order:
`@handle` → display name → "your friend". Never a raw initial, never blank (same
principle as `formatCircleNames`).

Reader reference (owner revision 2026-08-06, superseding the earlier you-voice-only
rule): openers MAY open by addressing the reader with their own @handle followed by
you-voice ("@mariesatori, you are …"). The reader is never referred to in third
person. When the reader has no handle, serve `opener/variant-3`, which needs none —
never substitute a display name for the reader.

## Slot structure

One paragraph, four slots. Slots A and B are required; C and D degrade gracefully.

| Slot | Content | Data source (all existing) |
| --- | --- | --- |
| A | Reader's day, one clause, you-voice | Reader's top daily transit via the existing daily-glance driver selection (tightest qualifying aspect, else strongest house driver) on the reader's transits |
| B | @handle's day, one clause, third person | Same selector run on the friend's transits (`selectedFriendTransits`) |
| C | The shared condition, one sentence | Priority: (1) the top-ranked active bond transit from the "Between you two" selection (already deduped/ranked); (2) today's Moon condition when it aspects both charts within the daily orb gate; (3) omit the sentence — never manufacture a shared condition (SOURCE_GAP principle) |
| D | One do + one don't, keyed to slot C's theme family | Existing daily do/don't units (`renderDoDont` pool) filtered to the slot-C family; omit if C omitted. An approved `pair-daily/close/{family}` row, when present, overrides the pool for that family — but `close/hard` serves only when the friction concerns plans, timing, or indecision (owner ruling 2026-08-06; default gate: transiting Saturn or Mercury, owner to confirm) |

Assembly shape: `{A-frame with readerClause}, while {friendHandle} {friendClause}.
{C-sentence}. {do}. {don't}.`

## Selection and ranking

- Slots A/B reuse the daily-glance driver logic verbatim — no new ranking system. If
  either person has no qualifying driver today, the surface hides entirely (a missing
  half makes the pair framing false).
- Slot C reuses `activeBondTransitCards` output (rank 1 card). Its soft/hard
  `effectFamily` is the theme family that keys slot D.
- Variant rotation: stable per (readerId, friendId, ISO date) so the paragraph is
  identical on refresh but rotates across days even when the same drivers persist.
- Novelty: the same (A-driver, B-driver, C-condition) triple must not render the same
  frame variant two days running; rotate variants before repeating.

## Voice and copy rules

- Reader in you-voice; friend referenced by @handle with they-voice clauses via the
  resolvers' voice parameter (`body_they` path). NEVER pronoun substitution
  (DECOMMISSION-OLD-FALLBACKS.md, confirmed live bug).
- One hedge maximum across the whole paragraph (FRIENDS-CIRCLE-FEED-SPEC rule).
- Length cap: ~65 words / 4 sentences. Co-Star's runs ~50–60.
- The paragraph must read as authored prose — connectives live inside the approved
  frames, not in app-side string glue. App code only fills slots.
- Window words: "today" only; this surface never shows date ranges (the transit lists
  below it own that job).

## New copy required (owner authoring queue — revised 2026-08-06 after reuse audit)

Most slot content already exists approved and serving; the queue is connective
tissue only.

Reuse map (no new authoring):

- Slot A/B clause material: the daily At-a-Glance library (68 `daily-headline/*` +
  68 `daily-body/*` rows, approved 2026-07-23). Caveat: the library is you-voice;
  slot B needs gerund/they-voice clause adaptations of the same approved meaning —
  adaptation passes through review, but it is compression, not invention.
- Slot C bond clause: the 139 approved `bond-effect-*` rows (the top bond card's
  effect line, compressed by frame).
- Slot C moon source material: the 36 approved weekly-Moon sign cards inform the
  element one-liners.
- Slot D: the Do/Don't engine and its approved seed vocabulary, unchanged.

Net-new rows (11, drafted 2026-08-06 as assistant candidates in
`source-rows/pair-daily-frames-v1.json`, all `needs_review`, dark):

1. `pair-daily/opener` + variants 2–3 — the connective frame with `{readerClause}`,
   `{friendHandle}`, `{friendClause}`.
2. `pair-daily/shared-bond/{soft|hard}` + one variant each — `{bondClause}` frames.
3. `pair-daily/shared-moon/{fire|earth|air|water}` — the "you are both…" sentence.

The drafts appear in the content book under "Today between you two (pair daily)."
Approval path: content book review → `my-copy-edits.json` → `admin/apply-edits.mjs`.

## Judge roadmap (owner direction 2026-08-06: this dataset will grow to serve
thousands of users)

Owner review in the content book remains the only approval gate at every stage —
the judge is a billed, advisory pre-filter that makes large batches reviewable, not
an approver.

- Stage 1 (now, ≤~15 rows): no judge. Deterministic lint + owner review is faster
  than calibrating a judge for one small batch.
- Stage 2 (first expansion, e.g. per-sign moon rows or driver-specific openers):
  create a pair-daily judge config in `packages/astro-knowledge/config/` mirroring
  the Terra-low Sky Placement pattern, with a pair-daily rubric (frame grammar
  integrity, seam quality at slot boundaries, one-hedge rule, @handle usage, no
  invented astrology). Calibrate against the stage-1 owner-approved rows plus
  owner rejections — the same calibration discipline as
  `sky-placement-judge-terra-*`.
- Stage 3 (scale, hundreds of rows): judge-gated batches — candidates below the
  acceptability score never reach the content book; the owner reviews only
  survivors. Spot-audit a fixed sample of judge-passed rows each batch to keep the
  judge honest. Billed calls remain explicitly authorized per batch, per existing
  governance.

## Renderer API (proposal)

`renderPairDaily({ reader: { handle, clauseKey }, friend: { handle, clauseKey },
shared: { kind: "bond" | "moon" | null, family?, element?, bondClauseKey? }, variant })` in the
transit-synastry resolver, exported like `renderCircleStory`. Throws `SourceGapError`
when any required frame or clause row is missing → app hides the surface. Both `.mjs`
and `.browser.ts` + dist rebuild, tests alongside `test-daily-glance-selection`.

## Placement

Friend profile → Compatibility tab, above the compatibility list, replacing nothing.
Eyebrow: "Today between you two" + date. No feedback widget in v1.

## Out of scope (v1)

- Co-Star-style day picker (Tue–Sat scoping) — separate feature.
- Themed synthesis headlines ("Social anxiety") — requires a new authored surface.
- Composite-chart daily readings — different technique, not in the current engine.

## Open questions for the owner

1. Opener frame tone: how playful may the experiment/do sentence get? (Co-Star's
   "phone with your eyes closed" register vs. house practical register.)
2. When reader and friend share the same driver (same transit hits both), collapse
   A+B into one "you both" clause, or keep two clauses? (Needs one extra frame row.)
3. Should slot C prefer the bond transit even when it's a months-long window, or
   prefer the Moon because this surface is a daily? (Spec currently says bond first.)
