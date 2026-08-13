# Execution plan: authored-first rollout

Date: 2026-08-12. Companion to `tldr-astro-owner-writing-usage-plan.md`.
Owner has greenlit execution planning; each work package still lands through
its own review gate. Nothing serves without owner approval.

## Work packages

### WP-1: Activate the 713 idle LL rows  (Phase 1 — start immediately)

1. Codex splits the 713 unapproved LL rows into review batches of ~120,
   grouped by sheet (PlacementMeanings sign rows, planet|sign rows,
   planet|house rows, AspectMeanings, NodesPhasesFortune). Batch order:
   families with the highest semantic-QA flag rates first, so each approval
   batch retires the most flagged serving copy.
2. Each batch ships as an owner workbook in the established format: row key,
   current copy, judge annotations under the V13 clarity rubric
   (translation-required, real-filler, astrology-restated), verdict column
   (approve / edit / cut), edit column, metadata hash.
3. Verdicts import through a hash-validated, atomic importer (clone of the
   friend-verdict importer). Approved rows ingest exactly like V13: serving
   stores + voice index, byte-identical, V13-precedence dedupe gate already
   in place from PR #173.
4. Friend-voice variants derive from newly approved self rows through the
   pass-2 derivation pipeline — no separate authoring.

Owner effort: ~6 workbook sittings. Each batch is independently useful; no
batch blocks another.

### WP-2: Empty-house authored passages + ruler retirement  (Phase 2a)

1. Blocked on: the QA rollup table (in flight) to confirm empty-house flag
   concentration, and at least one WP-1 house-row batch approved (source
   material).
2. Keyspace: 12 houses × 12 ruling-sign contexts = 144 passages, each with
   you/they variants derived, drafted by the writer chain from the owner's
   LL house rows as source, judged, then one owner review workbook.
3. Ruler-splice retirement extends to ALL surfaces: resolver fails closed on
   ruler-composition rather than seaming sign material to house material.
   Ships as its own scope PR ahead of the new passages (same pattern as the
   friend fail-closed fix: safety first, replacement copy second).

### WP-3: Sky-placement authored passages  (Phase 2b)

1. Keyspace: 168 planet×sign passages replacing the four-fragment hook
   assembly. Source: owner's v8/v9 transit and sky write-ups.
2. Same pipeline as WP-2: derive → judge → one owner workbook → ingest.
3. Existing four-part hooks remain as fail-closed fallback until the
   authored passage for a key is approved, then retire per key.

### WP-4: Reports serve owner passages intact  (Phase 3)

1. Codex writes a contract spec first — no implementation: per report unit,
   retrieval selects the owner-approved passage matching the unit's chart
   facts; the passage embeds byte-identical as the unit's delineation core;
   the writer authors only timing, transitions, and chart-specific context
   around it; the judge adds a deterministic embedded-passage-integrity
   check; missing passage = SOURCE_GAP, unit falls back to current
   generation with a flag.
2. Owner approves the spec (one read, one decision).
3. Implementation behind a flag; Codex renders one full sample report
   (Year Ahead, general_12m) both ways; owner compares before the flag
   flips. SKU catalog and billing untouched.

### WP-5: Regression scoreboard  (Phase 4 — continuous)

1. The semantic QA runner re-runs after each WP lands (deterministic pass
   free; billed semantic pass only on changed passages via checkpoint
   diffing — cost per rerun should be a fraction of the $19 baseline).
2. Standing metric in each review record: flag rate of authored vs
   assembled passages, and total EDIT/CUT pool remaining.
3. The broader defect batch (owner-authorized, queued) re-scopes after WP-1
   and WP-2: findings living in replaced rows close automatically; only
   survivors get rewritten.

## Dependency order

WP-1 starts now (nothing blocks it; pass 2 continues in parallel).
WP-2 starts after the QA rollup lands and the first house-row batch of WP-1
is approved. WP-3 after WP-2's pipeline is proven. WP-4's spec can be
written any time; implementation waits for WP-1 coverage so retrieval has
passages to embed. WP-5 wraps every merge.

## Owner gates (the complete list)

1. WP-1: verdicts on ~6 batches of ~120 rows.
2. WP-2: one workbook (144 passages) + admin-merge of the ruler retirement.
3. WP-3: one workbook (168 passages).
4. WP-4: spec approval, then the side-by-side sample report comparison.
5. Admin-merges as PRs come ready (approval clicks remain impossible on
   self-authored PRs; admin-merge is the standing mechanism).

## Invariants (unchanged, restated for every WP)

Approved rows byte-identical without quoted owner approval; unapproved rows
never serve; missing coverage fails closed; generated artifacts regenerate
at merge, never merge across branches; merge queue oldest-ready-first; no
auto-publish; no writer promotion; stop-and-report per the merge model.
