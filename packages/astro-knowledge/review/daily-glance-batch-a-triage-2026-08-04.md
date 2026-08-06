# Batch A daily At-a-Glance: full triage inventory

Date: 2026-08-04
Reviewer: editorial assistant (advisory pre-screen; no verdict here changes approval status)
Scope: all 136 rows (68 headline/body pairs) under `fallback-hook/daily-headline/*` and `fallback-hook/daily-body/*`
Companion: `daily-glance-soft-mars-review-2026-08-04.md` (decisions D1-D5)

## 1. Operational note before anything else

All 136 rows are serving in production. If the whole batch is demoted to `review_needed` at once, the review-status filter makes every row ineligible and `renderDailyGlance` throws SOURCE_GAP: the daily page's lead card breaks for every user. Recommended: rows stay serving during the audit; corrections land and flip per sitting. The owner accepts the interim state explicitly (D6 below) rather than the system pretending the batch flag is valid approval.

## 2. Systemic findings (batch-wide; each becomes a permanent rule on owner sign-off)

- S1. "Stop + verb" as move 2 in roughly 64 of 68 bodies (Stop spending, Stop treating, Stop waiting, Stop confusing...). The four-move structure is fine; a single surface realization of move 2 makes rows interchangeable (VC-011). Fix batch-wide: vary the realization, keep the function.
- S2. All 28 square and opposition headlines share one grammar: "You can X" / "You don't have to Y." The two groups are indistinguishable at headline level even though square is self-friction and opposition is other-friction, and the "You don't have to..." run reads as permission-formula register (BW-008 spirit). Fix: give square a distinct headline grammar.
- S3. Aphorism or slogan closers on roughly 25 bodies ("Say less. Land more." / "Named things shrink." / "Nothing else tastes like done." / "Both are wealth." / "Small words do big work." / "That is the medicine." / "Luck likes a moving target; give it one."). OV-038, VC-010, and the CF-006 ruling: compression that costs comprehension fails.
- S4. Outcome predictions the engine cannot honor: "Today, it lands." / "It goes better than rehearsal." / "the wrong turn works out" / "What surfaces today heals." / "half of today's fights die right there." A soft lunar contact is hours of mild ease; copy may not promise results.
- S5. Room-as-audience family (CF-004 owner-resolved prohibition) in five rows: "wins the room" (opposition/mars), "keep your place in the room" (headline opposition/sun), "refreshes the room" (soft/lilith), "whatever the room can handle" (square/lilith), "let the room meet the real version" (opposition/lilith).
- S6. Meme and cynicism register: "future-you" in three rows (conjunction/jupiter, square/jupiter, soft/mars); "for once" (soft/mars headline, house/1 headline), "for a change" (soft/uranus headline). The tic tells readers their baseline is failure.
- S7. `body_they` is byte-identical to `body_you` in all 136 rows, second person included. Either they-mode is unreachable for the daily glance (then note it in the spec) or every row needs a real they-register variant. Extends G3.
- S8. The 2026-07-23 batch "approved" flag is not valid owner approval under GR-001 for any of the 136 rows, not just soft/mars.

## 3. Hard-rule hits (individually urgent)

- square/lilith body: "the things you don't say start leaking out sideways" violates OV-041 (permanent leak ban) and is near-verbatim NE-031, wording the owner already rejected. Serving today. Worst row in the batch.
- square/moon body: "before you decide anything it's whispering" hits the `whisper` ban (BW-003) plus abstract personification (VC-003).
- conjunction/lilith body: "no performance required" is figurative performance framing about social behavior (CF-002 owner-resolved prohibition).
- opposition/south-node body: "auditioning for a part you already outgrew" same CF-002 family.
- house/11 body: "group chat" is on the VC-016 prohibited inventory (Sky Placement scope; scope extension to this surface is D8).
- conjunction/mars headline and body: "the energy is real, and it is going somewhere with or without you" plus "energy this good" is vague energy language (VC-007 boundary) with an ominous frame; body adds "wake up loaded" and "inbox skirmishes."
- soft/mars pair: reviewed in full in the companion file.

## 4. Per-pair triage

Verdicts: REWRITE (row-specific violations too dense to line-edit), EDIT (targeted line edits), PASS (clean apart from the systemic S-fixes, which apply to every row). Owner rulings override every verdict.

| Pair | Verdict | Row-specific issues beyond S1-S8 |
| --- | --- | --- |
| square/lilith | REWRITE | OV-041 leak; NE-031 near-verbatim; room-as-audience |
| square/moon | REWRITE | whisper (BW-003); personification; "puts them on trial" |
| soft/mars | REWRITE | see companion review |
| conjunction/mars | REWRITE | vague energy x3; "wake up loaded"; "inbox skirmishes" |
| opposition/mars | REWRITE | "wins the room" (CF-004); "volume as an argument" |
| opposition/sun | REWRITE | headline "keep your place in the room" (CF-004) |
| conjunction/lilith | REWRITE | "no performance required" (CF-002) |
| soft/pluto | REWRITE | "What surfaces today heals" (S4 healing overpromise); "will land gently" prediction |
| conjunction/north-node | REWRITE | "chapter taps you on the shoulder", "calendar's way of underlining" (VC-003) |
| house/11 | REWRITE | "group chat"; "The future has people in it." closer |
| opposition/south-node | EDIT | "auditioning for a part" (CF-002); nostalgia framing otherwise sound |
| conjunction/chiron | EDIT | "softness is the work" therapy register (VC-005 boundary) |
| conjunction/jupiter | EDIT | "future-you"; "That's how luck gets real." closer |
| conjunction/mercury | EDIT | "Say less. Land more." closer |
| conjunction/moon | EDIT | "want witness, not fixing" therapy register; "empties it" mechanics |
| conjunction/pluto | EDIT | "The deep read is on" slang; minor |
| conjunction/saturn | EDIT | "Nothing else tastes like done." closer |
| conjunction/sun | EDIT | "Today, it lands." prediction (S4) |
| conjunction/uranus | EDIT | "different route/answer/room" triad (VC-011); "most accurate one you make all year" overpromise |
| conjunction/venus | EDIT | "gets felt as" passive; "a skill most people never build" generic subject (VC-009) |
| house/1 | EDIT | "for once" tic; "whole assignment" school register |
| house/2 | EDIT | "Both are wealth." closer; "someone else's ruler" |
| house/3 | EDIT | "Small words do big work." closer |
| house/5 | EDIT | "fuel, not dessert" not-X-but-Y |
| house/6 | EDIT | "Small fixes outlast big plans." closer |
| house/8 | EDIT | "keeps charging interest" decode-metaphor |
| house/9 | EDIT | "perspective is a physical thing" polished; personified curiosity |
| house/10 | EDIT | "visibility is a task, not a personality trait" not-X-but-Y closer |
| house/12 | EDIT | "the inner rooms" figurative |
| opposition/chiron | EDIT | "reaction outruns the crime" harsh; "old pain borrows new faces" (VC-003); "courtroom" |
| opposition/jupiter | EDIT | "convert people" generic subject; "its own kind of wrong" aphorism |
| opposition/lilith | EDIT | "paying for harmony with pieces of yourself"; "let the room meet" (CF-004) |
| opposition/mercury | EDIT | "your version is the recording"; "fights die right there" prediction-lite |
| opposition/north-node | EDIT | "yes to the stretch, no to the guilt. Both fit." balanced aphorism |
| opposition/pluto | EDIT | "playing chess"; "Influence hoarded turns into distance." aphorism |
| opposition/saturn | EDIT | "a conversation, not a resentment" not-X-but-Y; "in daylight" figurative |
| opposition/uranus | EDIT | balanced space/space symmetry (VC-011) |
| soft/chiron | EDIT | "Named things shrink." closer; "someone safe" therapy register |
| soft/jupiter | EDIT | "Luck likes a moving target" personified closer; "no catch to wait for" |
| soft/lilith | EDIT | "refreshes the room" (CF-004); "Warm and honest beats polite." closer; headline overpromise |
| soft/mercury | EDIT | "It goes better than rehearsal." prediction + performance-adjacent |
| soft/north-node | EDIT | "before the doubt refills" mechanics; "Go now." staccato |
| soft/south-node | EDIT | "a tool today, not a trap" not-X-but-Y closer |
| soft/sun | EDIT | "a trap... a window" not-X-but-Y; headline "negotiating" (OV-013 family) |
| soft/uranus | EDIT | "the wrong turn works out" prediction; "rewards whoever stays loose"; "detour is the point" closer; headline "for a change" |
| square/chiron | EDIT | "That is the medicine." VC-010 restatement closer |
| square/jupiter | EDIT | "future-you has to pay for" |
| square/mars | EDIT | "Anger with no job picks one at random" personification (clear, but confirm) |
| square/north-node | EDIT | "readiness rarely shows up on schedule" aphorism |
| square/south-node | EDIT | "fine place to rest and a bad place to live" polished aphorism |
| square/sun | EDIT | "a sketch, not a contract" not-X-but-Y (clear; confirm); "Start smaller. Start anyway." staccato |
| square/uranus | EDIT | "starts pricing exits" decode-personification (VC-003) |
| square/venus | EDIT | "testing always finds the failure" personified aphorism; "tallying warmth" echoes soft/venus |
| headline square/moon | EDIT | "catch yourself reaching": "you catch yourself" is on VC-016 (scope decision D8) |
| conjunction/neptune | PASS | systemic fixes only |
| conjunction/south-node | PASS | systemic fixes only |
| house/4 | PASS | systemic fixes only |
| house/7 | PASS | systemic fixes only |
| opposition/moon | PASS | systemic fixes only |
| opposition/neptune | PASS | systemic fixes only |
| opposition/venus | PASS | systemic fixes only |
| soft/moon | PASS | systemic fixes only |
| soft/neptune | PASS | "Logic can check the work tomorrow" borderline; else clean |
| soft/saturn | PASS | systemic fixes only |
| soft/venus | PASS | systemic fixes only |
| square/mercury | PASS | systemic fixes only |
| square/neptune | PASS | systemic fixes only |
| square/pluto | PASS | systemic fixes only |
| square/saturn | PASS | systemic fixes only |

Tally: 10 REWRITE, 44 EDIT, 14 PASS (of 68 pairs). Note the pass rows still change under S1/S2/S3 batch fixes, so "pass" means no row-specific violation, not no change.

## 5. Sitting plan (sevens, worst first) — SUPERSEDED

Superseded 2026-08-04 by the full surface rebuild: see `daily-glance-rebuild-plan-2026-08-04.md`. The owner confirmed S1-S8 and chose regeneration over line edits. This inventory remains the failure-evidence record; the sittings below are not run.

1. Sitting 1: square/lilith, square/moon, soft/mars, conjunction/mars, opposition/mars, opposition/sun, conjunction/lilith
2. Sitting 2: soft/pluto, conjunction/north-node, house/11, opposition/south-node, soft/lilith, soft/mercury, conjunction/jupiter
3. Sittings 3-9: remaining EDIT pairs, seven per sitting, tightest issues first
4. Sitting 10: PASS pairs, confirmation read only

Before sitting 1, the S1/S2/S3 systemic decisions should be settled so corrections are written once, not re-corrected per sitting. Every owner correction in a sitting becomes a permanent rule per the proven cadence.

## 6. New owner decisions (continues D1-D5 in the companion file)

- D6. Serving state during audit: RESOLVED (b). Owner, chat, 2026-08-04: "the app is in beta with no users. There is no concern about moving content back into draft or review." All 136 rows set to `review_needed` in `fallback-source-rows-v3.json` and `bundled-deferred-core-rows-v3.json` on 2026-08-04. The daily At-a-Glance will raise SOURCE_GAP until rows are corrected and re-approved per sitting; accepted for beta.
- D7. Correction path for EDIT and PASS pairs: (a) owner line-edits assistant-flagged fixes per sitting, (b) Sol regenerates flagged rows (billed calls, needs authorization and a reference piece for this surface), (c) mixed: Sol for the 10 REWRITE pairs, line edits for the rest. OWNER: ____
- D8. Scope extension: do VC-016 inventory items ("group chat", "you catch yourself", etc.) and the CF-004 room prohibition apply to this engine-hidden daily surface? (a) yes, adopt the Sky Placement output bans here minus the pronoun rules (recommended), (b) build a separate ban list for this surface. OWNER: ____
- D9. Headline grammar for square group (S2): approve developing a distinct square grammar so square and opposition stop sharing one voice. OWNER: ____
- D10. they-register (S7): (a) confirm they-mode is unreachable for daily glance and record it, (b) commission real they-variants. Needs a code check first; Codex can answer reachability in the same run as G1. OWNER: ____
