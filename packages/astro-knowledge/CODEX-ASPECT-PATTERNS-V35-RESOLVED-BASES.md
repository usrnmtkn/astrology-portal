# v3.5 amendment - base/corner "you need {sign_need}" clauses are not resolved clauses

This one is NOT a value/renderer fix. The flaw is in the template scaffold and the
contract that pins it, so this prompt authorizes a one-time contract amendment
(v3.4 -> v3.5). After it lands and the owner approves the renders, the contract
re-freezes under the same rule: values may change, contracts may not.

## The bug, from a real render (owner-reported)

> "With Neptune in the 10th house of career and reputation, you need achievement
> and structure; with Pluto in the 8th house of shared trust, you need depth and
> honesty."

Two problems, one cause:

1. `sign_need` is sign-keyed vocab ("achievement and structure" is just
   `fallback-vocab/sign-need/capricorn`). The named planet contributes zero words.
   Mercury in Capricorn and Neptune in Capricorn render the identical clause, so
   the clause is not a resolved clause; it is a sign lookup wearing a planet label.
2. For outer planets the sign is generational. Pluto sextile Neptune has been in
   orb for nearly everyone born since the 1940s, so the DEFAULT real-world Yod has
   a Pluto-Neptune base, and its feel section opens by asserting generation-level
   sign traits as the reader's personal psychology. "With Neptune, you need
   achievement and structure" is Saturn language sourced from Capricorn, pinned on
   Neptune.

The scaffold `With {x.planet} in {x.house_label}, you need {x.sign_need}` appears in
the feel and unknown_time L1/L2 lines of ALL SIX patterns (grep `you need {` in the
templates for the current locations; line numbers have shifted across voice passes),
and `aspect-pattern-contract.json` pins `*.sign_need` in `required_by_section.feel`
for every pattern, which is why no gate catches it.

The resolver already computes the right material and never uses it here:
`sign_house_response` / `sign_behavior` are synthesized per member from the approved
planet-in-sign placement layer (`fallback-hook/placement-sentence/{planet}/{sign}`).

## The two rules (owner-approved direction)

RULE 1 - personal planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) in any
member-intro slot currently built from the scaffold: replace "you need {sign_need}"
with a planet-in-sign resolved clause built from the placement layer (same source
as sign_house_response / sign_behavior). Acceptance test: the same sign with two
different personal planets must render two different clauses.

RULE 2 - outer planets (Uranus, Neptune, Pluto) in base / corner / opposition-end
roles: no personal "you need" claim at all. Frame them as slow background anchors
(a current whole generations share), name the house they anchor when time is known,
and hand the personal thread to the personal planets and the apex/focal. When BOTH
members of a pair are outers (the common Pluto-Neptune base), compose ONE combined
sentence, never two parallel "moves slowly" sentences.

Apex and focal roles keep their authored planet tables (lived_need, focal_demand,
focal_interruption) - those are planet-resolved and stay. The trailing "you also
need {apex.sign_need}" / "{focal.sign_need}" sentences: keep for personal apex/focal;
for an OUTER apex/focal switch to the sign-behavior form or drop the sentence.
Render both candidates in the audit and let the owner pick.

## What is already RIGHT and must be preserved (owner-verified render, 2026-07-27)

The current Yod render is correct everywhere EXCEPT the feel scaffold. Do not
regress these while amending:

- L1 opening: "When you decide what to do, your Pluto helps you understand what
  has to change, while your Neptune helps you keep sight of what the future could
  become. Where shared trust meets career and reputation, those two instincts can
  point toward the same plan. Your Moon keeps the decision from feeling settled..."
  This is `base_contribution` from the owner-authored planet table plus house
  topics: planet-real and house-real, no sign misattribution. RULE 2 DOES NOT
  APPLY HERE. Personalizing an outer planet by its function and natal house is
  legitimate; the offense being fixed is sign-derived need claims only. Optional,
  owner's call at audit: soften "your Pluto/your Neptune" to "Pluto/Neptune" for
  outers in openings; render both if cheap.
- L2 how-it-works, planet_roles, reference_point: mechanical and role-based, no
  sign claims; the reference point's "making room for freedom and meaning" is
  sign vocab applied to a sign-defined POINT, which is correct usage. Leave the
  sign-need layer intact for derived points (reference / empty leg).
- Reading note: current phrasing stays.

The new feel intro must COMPLEMENT the opening, not repeat it: the opening already
carries each base planet's contribution, so the feel replacement supplies the
placement-layer (planet-in-sign) texture for personal planets, or the single
background-anchor sentence for outers, and then hands off to the apex exactly as
the current feel line does ("The first plan is likely to satisfy those two aims.
But your {apex.planet}...").

## Recommended mechanism

Add one group-level token per member list, composed by the resolver:

- `{bases.intro}` (Yod base1+base2), `{trio.intro}` (Grand Trine / Kite t1..t3),
  `{corners.intro}` (Grand Cross c1..c4), `{ends.intro}` (T-square oppA+oppB+apex or
  oppA+oppB with apex handled separately), `{axisA.intro}` / `{axisB.intro}` (Mystic).
- Composition, known time: personal members get one sentence each from the placement
  layer plus a house anchor; outers get one combined background sentence; personal
  sentences first.
- Composition, unknown time: same shape, house-free (`sign_behavior` variant);
  outers get the generation line ("their signs say more about your generation than
  about you alone") and no house.
- Feel templates then read: `{bases.intro} Together, they shape the first answer
  that comes naturally. ...` with a planet-neutral connective, so the both-outer
  case still parses.

An acceptable alternative is a per-member `need_line` token with a renderer dedup
rule for adjacent outers. Pick ONE mechanism and register it; do not ship both.

## Draft target renders (VOICE DRAFTS for the audit, not canonical until owner approves)

BEFORE (Yod, Pluto-Neptune base, Moon apex):
  "With Neptune in the 10th house of career and reputation, you need achievement
  and structure; with Pluto in the 8th house of shared trust, you need depth and
  honesty."
AFTER (draft, fitting the current feel structure so the apex handoff is kept):
  "Pluto and Neptune move slowly, so whole generations share their signs. In your
  chart they anchor this pattern in the 8th house of shared trust and the 10th
  house of career and reputation. The first plan is likely to satisfy those two
  aims. But your Moon in the 3rd house of communication brings a need to name
  what you feel and know it was heard. ..."

BEFORE (personal member): "With Venus in the 3rd house of communication, you need
  variety and mental stimulation"
AFTER (draft, placement-layer sourced): "Your Venus in Gemini keeps affection quick
  and talkative, and in the 3rd house that plays out around communication"

## Files to touch

1. `aspect-pattern-templates-v3.4.md` -> `aspect-pattern-templates-v3.5.md`: header
   line, TOKEN REGISTRY rows (new group token; note the known/unknown duality),
   feel + unknown_time L1/L2 lines in all six patterns, Mystic axis intros.
2. `aspect-pattern-contract.json`: `_note`, `allowed_prefixes` (new group prefixes),
   `fields` (new token), `required_by_section` (replace the member `sign_need` +
   `house_label` pins in `feel` with the group token; KEEP apex/focal pins).
3. `engine/aspect-patterns/v3-copy-resolver.js`: TEMPLATE_PATH, recordId/templateId
   version strings, OUTER set {uranus, neptune, pluto}, group-intro composition
   (known + unknown), outer-apex handling per owner's audit choice.
4. `aspect-pattern-tables-v1.md`: new authored table `background-anchor-by-planet`
   with EXACTLY the rows Uranus, Neptune, Pluto (fragments, no terminal punctuation,
   no em dashes, no banned words). Marie voice.
5. `validate_patterns.py`: TPL filename, canonical header check (v3.5), a table-spec
   map so the 3-row outers table validates (current validator hard-requires 10 rows
   per table), bidirectional token check picks up the new token, and a NEW check:
   no `you need {x.sign_need}` scaffold may target a non-apex/non-focal prefix.
6. `render_matrix.py` + any gold renders that pin v3.4 strings.
7. `scripts/print-aspect-pattern-v3-real-renders.js`: regenerate the 36-card audit.
8. `scripts/test-aspect-pattern-v3-resolver.js`: update expectations; add the
   planet-distinctness and outer-base assertions below.

## Acceptance gates (all must pass before commit)

1. `validate_patterns.py` PASS 0 errors under v3.5.
2. `render_matrix.py` PASS.
3. Planet-distinctness: same sign, two personal planets, same slot -> different
   clauses (assert in test-aspect-pattern-v3-resolver.js).
4. Outer-base: Pluto-Neptune Yod base renders exactly one combined background
   sentence; `you need` never follows Uranus/Neptune/Pluto in any feel or
   unknown_time body (grep-level assertion).
5. Unknown-time bodies stay house-free (existing audit) and outers get the
   generation line.
6. Regenerated real-render audit reviewed and approved by the owner BEFORE commit;
   include both outer-apex candidates (sign-behavior vs dropped sentence).
7. Full suites stay green: `npm run test:natal-aspect-pattern-reader`,
   `npm run test:content`, `npm run typecheck`, engine + v3 resolver tests.

## Out of scope / do not chase

- The reader component, API timeKnown plumbing, and section-label allowlist are
  already correct and tested; feel-body text changes do not touch section ids.
- Reading-note phrasing drift ("Clear. The widest link is..." vs "This pattern is
  clear in the chart. Its widest link is...") is a separate, already-landed change;
  leave it alone here.
- Do not edit sign-need vocab rows themselves; they remain correct for sign-keyed
  surfaces. The fix is where they are attributed, not what they say.
