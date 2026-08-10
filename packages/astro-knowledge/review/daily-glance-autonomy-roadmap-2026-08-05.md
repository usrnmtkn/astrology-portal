# Roadmap: from owner-written rows to an app that writes

Date: 2026-08-05. Prepared at owner request ("Eventually I want to grow the system so the app can write"). Four phases; each phase serves readers only content that passed its phase's gate. Nothing here changes governance: GR-001/GR-003 hold everywhere, and the owner can halt any phase by ruling.

## Phase 1 - NOW: operated engine, owner approves everything (complete and live)

One engine (packet compiler -> writer model -> lint -> optional judge), three interchangeable operators: Codex (when credited), the owner's Terminal, or the assistant preparing configs. Every serving row is exact-owner-approved. This is the shipped state: 68/68 keys live in the owner's words. Rule DG-P1 governs.

## Phase 2 - judge maturation: engine proposes, owner one-taps

Blocker: the voice judge must pass calibration before its scores mean anything.
- Step 2.1: switch judge model to gpt-5.6-terra, reasoning low (the model class that passed calibration on the placement surface), rerun `npm run judge:daily-glance:calibrate` against the 24-gold / 33-negative set (three failure families incl. Co-Star register). Cost ~$2.
- Step 2.2: acceptance unchanged: goldMean >= 2.6, negativeMean <= 1.9, zero negative 3s. If terra fails too, the judge is retired to coarse filtering (score-1 rejection only) and Phase 4 is deferred indefinitely.
- Step 2.3: if it passes, judged best-of-N becomes the default engine mode (`run-daily-glance-judged.js`, already built); owner reads only winners; approvals stay explicit but become one-tap-sized.

## Phase 3 - THE NEAR-TERM "APP WRITES": owner-authored variant rotation

The insight: the owner already writes variants naturally (alternative title hooks, backup bodies, the phrase library). An app that selects among owner-authored variants per key per day IS dynamic writing - fresher copy daily, zero novel machine prose, every sentence the owner's.

Seed inventory already written (preserved in the batch-4 record and phrase library): roughly 60 alternative headlines and 15 backup bodies, plus the phrase library's unassigned titles.

### Implementation (Codex work, one PR series through the v2 merge queue)

1. DATA MODEL: new file `apps/web/src/content/fallbackArchitectureV3/source-rows/daily-glance-variants-v1.json`:
   `{ "<key>": { "headlines": [{id, text, review_status, provenance}], "bodies": [...] } }`
   The existing row's text is variant id "primary". Variants carry the same review_status governance as rows; only "approved" variants serve. Bundled + manifest artifacts regenerate from it like the core rows.
2. IMPORT: seed the file from the batch-4 record's preserved hooks/bodies and the phrase library's unassigned Moon-driver titles, all as review_needed, provenance-linked to their source documents. (Assistant prepares the import file; nothing serves until the owner's approval sitting.)
3. OWNER SITTING: one review pass over the seeded variants - approve, edit, or strike each. Approved variants join the pool. (The owner already wrote them; this is a re-read, not a writing session.)
4. RESOLVER: `renderDailyGlance` gains deterministic variant selection: seed = hash(dateKey + contentKey [+ userId if per-user freshness is wanted]); pick from approved variants; constraints: (a) stable within a day, (b) no repeat of the same variant on consecutive appearances of the key, (c) headline and body chosen independently only if the owner approves cross-pairing per key - default is paired sets to protect coherence.
5. LINT AT BUILD: serve-time invariants checked at bundle build - every served combination passes the output bans; no identical line serving on two keys (DG-R18 at runtime).
6. TESTS: variant determinism, day-stability, rotation coverage, ban compliance across all combinations, SOURCE_GAP fallback unchanged.
7. SERVE: ship behind the same merge-queue process; owner verifies on preview; revocation = strike the variant, rebuild.

Growth loop: whenever the owner writes new hooks (as she does naturally in sittings), they append to the variants file as review_needed and enter the next approval sitting. The app's writing gets richer at exactly the speed the owner writes, with no other dependency.

## Phase 4 - generative serving (gated, later)

Live generation server-side only after ALL of: (a) Phase 2 judge passing calibration and holding across two surfaces; (b) an owner-approved SERVING POLICY document defining what may serve ungated (e.g., judge-3 only, banned-term hard fail, length gates, automatic fallback to the approved row on any doubt); (c) cost/latency budget; (d) a kill switch to Phase 3 behavior. The approved row always remains the fallback, so readers never see a gap.

## Sequencing recommendation

Phase 2 test ($2) and Phase 3 implementation can run in parallel; Phase 3 does not depend on the judge at all. Phase 3 is the highest-value build: it delivers the owner's goal ("the app can write") within current governance, using material that already exists.
