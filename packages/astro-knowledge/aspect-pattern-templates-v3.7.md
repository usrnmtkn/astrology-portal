# Aspect pattern templates v3.7 (canonical - supersedes v3.6 and all earlier drafts)

Invariant copy assumes no particular planet's style; confidence branches complete at
both levels; one token namespace; house-aware empty-leg and reference clauses;
sign-resolved house-free unknown-time bodies at both levels. This file is the single
authority; v3.3 and earlier are historical.

## TOKEN REGISTRY (frozen contract - enforced by validate_patterns.py + render_matrix.py)

Role namespaces (the ONLY allowed prefixes; no aliases like apex_planet / f / fo / a / b1 / ref_sign):
  lists: c1..c4 (Grand Cross), t1..t3 (trines), base1,base2 (Yod sextile),
         oppA,oppB (T-square opp ends), oa1,oa2,ob1,ob2 (Mystic)
  singular roles: apex, focal (+focal.opposes), empty_leg, reference,
         oppositionA, oppositionB (derived opposition, has .area)
  composed groups: ends (T-square opposition), corners (Grand Cross),
         trio (Grand Trine / Kite), bases (Yod), axisA,axisB (Mystic)

Fields (suffix | type | source | grammatical contract | sign? | house?):
  planet            | noun | chart | proper noun | - | -
  sign              | noun | chart | proper noun | - | -
  opposes           | noun | chart | planet name | - | -
  house_label       | phrase | house number | "the Nth house" | - | label only
  house_area        | noun phrase | house-topic layer | "home, family, and privacy" | - | Y
  house_context     | prepositional | house-context layer | "at home, around where you live" | - | Y
  decision_area     | noun phrase | lived house layer | "your reputation" | - | Y
  decision_test     | adverbial phrase | lived house layer | "in public" | - | Y
  role_gloss        | phrase | planet-function table | "what you're driving toward" | - | -
  sign_need         | complement | sign-need layer | completes "you need ___" | Y | -
  base_contribution | verb phrase | pattern narrative table | completes "you may ___" | - | -
  lived_title       | title | pattern narrative table | reader-facing Yod apex title | - | -
  lived_need        | noun phrase | pattern narrative table | completes "brings ___" | - | -
  incomplete_first_answer | sentence | pattern narrative table | the Yod answer that works but remains incomplete | - | -
  returning_lived_example | sentence | pattern narrative table | a recognizable way the Yod subject returns | - | -
  moon_condition     | complement | Moon-condition table | completes "Your Moon in [sign] needs ___" | Y | -
  intro             | sentences | placement layer + background-anchor table | planet-resolved member introduction; known-time includes houses, unknown-time is house-free | Y | Y
  sign_list         | noun list | chart member signs | comma-separated signs for compact Level 2 mechanics context | Y | -
  sign_house_response | verb phrase | sign-behavior + house_context | completes "{planet} in {house_label} ___" (apex/focal) | Y | Y
  sign_behavior     | verb phrase | sign-behavior only | house-free (unknown time) | Y | -
  response_example  | sentence | sign layer or placement layer | personal apex/focal need, or outer-planet placement response | Y | -
  balancing_move    | clause | empty-leg sign | the balancing response | Y | -
  behavior          | clause | reference sign | what the reference points to | Y | -
  focal_demand      | clause | focal-demand table + sign + house | the demand the focal adds | Y | Y
  focal_interruption| clause | focal planet + sign + house | the lived interruption | Y | Y
  area              | clause | opposition planets + houses | lived area of an opposition | - | Y

A token in the templates but not in this registry, or a registered token never used,
is a validation failure. Required clauses per pattern and every structural rule are
checked by validate_patterns.py; the per-role label-blind (sign) and house-blind
audits are proven by render_matrix.py. LOCKED AT V3.7: after this passes, table authoring
may change only the VALUES supplied to existing tokens - not add, rename, or change
any token's grammatical contract.

## Eligible bodies (LOCKED)
Primary detector (creates/suppresses patterns): Sun, Moon, Mercury, Venus, Mars,
Jupiter, Saturn, Uranus, Neptune, Pluto = 10 bodies. Chiron is SECONDARY - it may
appear as a participant but does not create or suppress a primary pattern in v1.
Nodes and angles are EXCLUDED (points, not bodies; no focal-demand / pattern-narrative
grammar). => focal-demand-by-planet and pattern-narrative-by-planet tables are 10 primary
rows each; background-anchor-by-planet contains Uranus, Neptune, and Pluto only (+1 optional Chiron row only
when secondary participation is designed).

## Confidence + reading notes
exact = canonical. strong = the exact title and opening VERBATIM; only the reading
note changes (Close -> Clear). wide = authored wide title + wide opening below;
canonical body otherwise. partial = the authored partial TITLE + Partial block only
(no separate opening, no full mechanics). Notes: Close/Clear/Wider/Partial + "The
widest link is {max_orb} degree(s)" (singular only when max_orb is 1). Unknown time
uses the house-free unknown_time L1 and L2 bodies. Under moon_time_uncertainty:
withhold from the reader, but retain an uncertain diagnostic record in admin.

===============================================================================
## T-SQUARE
===============================================================================
MECHANIC: Two planets oppose; both square a third, the apex. The apex is where the pressure tends to become visible first - the response there can relieve it without settling the opposition behind it. Opposite the apex, the empty leg is a less-automatic balancing response, not a missing planet and not a fix.

### Level 1
title exact/strong: **{apex.planet} is where the pressure shows first**
title wide: **A wider T-square** | title partial: **Possible T-square**
opening exact: You may {oppA.base_contribution} and {oppB.base_contribution}, especially where {oppA.house_area} meets {oppB.house_area}. When those aims pull apart, {apex.house_area} is where you tend to respond first.
opening wide: Your {oppA.planet}, {oppB.planet}, and {apex.planet} form a wider T-square. You may recognize {apex.planet} as one place this pressure shows, though it may not work the same way every time.
feel: {ends.intro} When both sides cannot lead, you tend to answer through {apex.house_area}. {apex.response_example} That can settle the immediate pressure without resolving the original conflict, so the same disagreement returns when the first answer stops holding.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: You may {oppA.base_contribution} and {oppB.base_contribution}. {ends.intro} When both sides cannot lead, {apex.planet} becomes the first response. {apex.response_example} That can settle the immediate pressure without resolving the original conflict.

### Level 2  (How the pressure moves / {apex.planet}'s role / What happens when pressure builds)
title exact/strong: **How the T-square works** | wide: **How this wider T-square works** | partial: **How a possible T-square works**
opening exact: A T-square is two planets in opposition, both squaring a third. Two parts of you keep pulling opposite ways, {oppA.role_gloss} against {oppB.role_gloss}, and when neither can be ignored, {apex.planet}, the apex, is where the tension becomes a response.
opening wide: Because the links are wider, the apex may gather the tension in some situations more than as a rule.
how_it_works: (none)
planet_roles: {apex.planet} is the apex, so it tends to be the first place the pressure shows. Opposite it, the empty leg in {empty_leg.sign}, in {empty_leg.house_label}, is not a missing piece or a guaranteed solution - it is the less automatic response, toward {empty_leg.house_area}: {empty_leg.balancing_move}.
watch_for: (none)
unknown_time L2: A T-square is two planets in opposition, both squaring a third, the apex. Here {apex.planet} tends to be where the tension becomes a response. Opposite it, a less automatic balancing response appears through {empty_leg.balancing_move}.

### Partial
L1: Your {oppA.planet}, {oppB.planet}, and {apex.planet} come close to a T-square, with {apex.planet} near the pressure point. You may recognize two needs that will not line up and the pull to respond through {apex.planet} when the tension has nowhere to go. It may not run as one constant pattern, and it can sharpen under transit.
L2: Your chart approaches a T-square, two planets near opposition both near a square to {apex.planet}. You may recognize it, especially under transit, without experiencing it as a constant feature.

===============================================================================
## GRAND CROSS
===============================================================================
MECHANIC: Two oppositions at right angles; four planets each in tension with the two beside them and the one across, in a closed figure with no single outlet. Easing one corner tends to load another.
### Level 1
title exact/strong: **Four pressures compete for the same time and energy**
title wide: **A wider Grand Cross** | partial: **Possible Grand Cross**
opening exact: You may {c1.base_contribution} while also trying to {c3.base_contribution}, and you may {c2.base_contribution} while trying to {c4.base_contribution}. These conflicts meet across {c1.house_area}, {c2.house_area}, {c3.house_area}, and {c4.house_area}.
opening wide: Your {c1.planet}, {c2.planet}, {c3.planet}, and {c4.planet} form a wider Grand Cross. You may feel the squeeze across these areas during certain periods rather than as a constant.
feel: One conflict runs between {c1.house_area} and {c3.house_area}; the other runs between {c2.house_area} and {c4.house_area}. {corners.intro} Because both conflicts share the same system, a choice that helps one side can press on another. You may answer the loudest demand first and find that another need has been waiting the whole time.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: You may {c1.base_contribution} while also trying to {c3.base_contribution}, and you may {c2.base_contribution} while trying to {c4.base_contribution}. {corners.intro} More than one response can need attention at once, and settling one tends to unsettle another.
### Level 2  (How the conflict keeps moving / The four competing responses / Where the cycle repeats)
title exact/strong: **How the Grand Cross works** | wide: **How this wider Grand Cross works** | partial: **How a possible Grand Cross works**
opening exact: A Grand Cross is two oppositions at right angles, so four planets square and oppose each other in a closed figure with no single outlet. Each corner sits in tension with the two beside it and the one across, so pressure hands off around the figure and easing one corner tends to load another.
opening wide: Because the links are wider, the four-way squeeze may show up in certain periods more than as a constant.
how_it_works: (none)
planet_roles: {c1.planet} and {c3.planet} form one opposition, {c1.role_gloss} against {c3.role_gloss}. {c2.planet} and {c4.planet} form the other, {c2.role_gloss} against {c4.role_gloss}. No planet is the whole story, and none is the release the way a T-square has an apex.
watch_for: (none)
unknown_time L2: A Grand Cross is two oppositions at right angles: {c1.planet} against {c3.planet}, {c2.planet} against {c4.planet}. The four corners fall in {corners.sign_list}. The pressure hands off around the figure with no single outlet.
### Partial
L1: Your {c1.planet}, {c2.planet}, {c3.planet}, and {c4.planet} come close to a Grand Cross. You may recognize the squeeze when several areas want attention at once. It may not operate constantly, and transits can make it more noticeable.
L2: Your chart approaches a Grand Cross, four planets near two right-angled oppositions. You may recognize the pattern without experiencing it as a constant feature.

===============================================================================
## GRAND TRINE
===============================================================================
MECHANIC: Three planets about 120 degrees apart in a closed triangle, usually one element. They share a style of response and rarely fight each other, so the pattern feels natural - and, because nothing pushes back, it can go soft.
### Level 1
title exact/strong: **Several parts of you tend to support the same response**
title wide: **A wider Grand Trine** | partial: **Possible Grand Trine**
opening exact: You may {t1.base_contribution}, {t2.base_contribution}, and {t3.base_contribution}, especially where {t1.house_area}, {t2.house_area}, and {t3.house_area} meet. Those instincts tend to support one another.
opening wide: Your {t1.planet}, {t2.planet}, and {t3.planet} form a wider Grand Trine. You may notice their agreement in certain situations rather than in every part of your life.
feel: {trio.intro} Because those responses cooperate, one can make the next feel natural before you have stopped to question the direction. The agreement lowers the pressure to check your first response, so you may repeat a familiar approach, skip useful feedback, or read ease as proof the approach is working.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: You may {t1.base_contribution}, {t2.base_contribution}, and {t3.base_contribution}. {trio.intro} Those responses tend to support one another, so the result can feel natural enough to lean on without questioning.
### Level 2  (Where the ease comes from / How the planets cooperate / Where ease can become inertia)
title exact/strong: **How the Grand Trine works** | wide: **How this wider Grand Trine works** | partial: **How a possible Grand Trine works**
opening exact: A Grand Trine is three planets roughly 120 degrees apart in a closed triangle, usually in one element, which is why the responses tend to agree.
opening wide: Because one or more links are wider, the agreement may be situational rather than constant.
how_it_works: The three planets share an element, so they share a style of response and rarely work against each other. The parts agree before you have to reconcile them.
planet_roles: {t1.planet}, {t2.planet}, and {t3.planet} pass momentum between {t1.role_gloss}, {t2.role_gloss}, and {t3.role_gloss}. Ease here is not talent or success; it means these parts cooperate before you have had to explain why.
watch_for: (none)
OVERRIDE out_of_sign (replaces how_it_works): Your {t1.planet}, {t2.planet}, and {t3.planet} form trines by degree even though they do not all sit in signs of the same element. The cooperation can still show up in stretches, but the planets do not share one automatic style, so what feels easy in one moment may need translation in another.
unknown_time L2: A Grand Trine is three planets in a closed triangle that share a style of response. The three planets fall in {trio.sign_list}. Because those signs work in the same element, the responses reinforce one another without much internal friction.
### Partial
L1: Your {t1.planet}, {t2.planet}, and {t3.planet} come close to a Grand Trine. You may notice their agreement in certain areas more than as a constant, and it can be easy to miss because it feels ordinary.
L2: Your chart approaches a Grand Trine, three planets near a closed triangle. You may recognize it in stretches rather than as a constant feature.

===============================================================================
## KITE
===============================================================================
MECHANIC: A Grand Trine with a fourth planet opposite one corner. On its own the triangle can drift; the opposition gives the easy flow a target, so the ease has something to push against. The demand and the interruption are resolved from the focal planet's sign and house.
### Level 1
title exact/strong: **{focal.planet} gives the easy flow a demand**
title wide: **A wider Kite** | partial: **Possible Kite**
opening exact: You may {t1.base_contribution}, {t2.base_contribution}, and {t3.base_contribution}, especially where {t1.house_area}, {t2.house_area}, and {t3.house_area} meet. That momentum is useful, but {focal.planet} in {focal.house_label} gives it a point of resistance.
opening wide: Your {t1.planet}, {t2.planet}, {t3.planet}, and {focal.planet} form a wider Kite, with {focal.planet} opposite {focal.opposes}. The pull between the easier response and {focal.planet}'s demand may become clear in certain situations rather than every time.
feel: {trio.intro} Together, those responses can make the first plan feel complete. Your {focal.planet} brings {focal.focal_demand}. {focal.response_example} The momentum meets its limit when it reaches {focal.focal_interruption}. That is where the easy response has to become more deliberate.
shows_up: (none)
complicated: (none)
another_response: (none - the focal point is {focal.planet}, covered at L2)
unknown_time L1: You may {t1.base_contribution}, {t2.base_contribution}, and {t3.base_contribution}. {trio.intro} Together, those responses can make the first plan feel complete. Your {focal.planet} brings {focal.focal_demand}. {focal.response_example} The momentum meets its limit when it reaches {focal.focal_interruption}.
### Level 2  (What gives the pattern direction / {focal.planet}'s role / Where pressure interrupts the flow)
title exact/strong: **How the Kite works** | wide: **How this wider Kite works** | partial: **How a possible Kite works**
opening exact: A Kite is a Grand Trine with one more planet opposite one corner. That opposition gives the easy triangle something to aim at.
opening wide: Because the links are wider, the direction {focal.planet} adds may come and go rather than hold.
how_it_works: On its own a Grand Trine can drift. {focal.planet} opposite {focal.opposes} gives the flow something to push against, so the ease has a target instead of circling.
planet_roles ("{focal.planet}'s role"): {focal.planet} sits across from {focal.opposes} and becomes the point that draws the pattern forward - not a T-square apex under pressure, but the condition the flow has to meet. {focal.planet} in {focal.house_label} {focal.sign_house_response}.
watch_for: (none)
unknown_time L2: A Kite is a Grand Trine with {focal.planet} opposite one corner, which gives the easy flow a target: {focal.focal_demand}. The trine maintains the momentum; {focal.planet} is the condition it has to meet.
OVERRIDE out_of_sign (Kite; when the contained trine is out of sign): The three trine planets connect by degree even though they do not all share one elemental style. The cooperation can still support the pattern, but the response may need more translation before {focal.planet} gives it direction.
### Partial
L1: Your chart comes close to a Kite. You may recognize the pull between a response that comes naturally and {focal.focal_demand}. It becomes clearer around {focal.focal_interruption}.
L2: Your chart approaches a Kite, a Grand Trine with a near-opposition to {focal.planet}. You may recognize the pattern without experiencing it as a constant feature.

===============================================================================
## YOD
===============================================================================
MECHANIC: Two planets in an easy sextile that both reach a third at 150 degrees, an angle with no natural resting place. The apex is what the base pair keeps adjusting to - it needs a different response from the one that comes naturally to them. Opposite it is an unoccupied balancing direction.
### Level 1
title exact/strong: **{apex.lived_title}**
title wide: **A wider Yod** | partial: **Possible Yod**
opening exact: {base1.planet} helps you {base1.base_contribution}. {base2.planet} helps you {base2.base_contribution}. Because the decision affects both {base1.decision_area} and {base2.decision_area}, the plan has to work {base1.decision_test} as well as it does {base2.decision_test}. Your {apex.planet} will not call it settled until you {apex.base_contribution}.
opening moon_decision: Pluto helps you see when a shared financial arrangement, obligation, or relationship has become unequal, controlling, or too heavy to keep carrying. Neptune pulls you toward work that feels meaningful, not simply the job with the safest paycheck or most impressive title. The risk is solving the money, power, or career problem while building a life that leaves you exhausted, unsupported, or disconnected from yourself. Your {apex.planet} in {apex.sign} needs {apex.moon_condition}. Until the plan makes room for that need, you may be able to defend the choice without feeling at home in it.
opening wide: Your {base1.planet}, {base2.planet}, and {apex.planet} form a wider Yod. The pull to keep adjusting toward {apex.planet} may surface in some situations more than as a constant.
feel: {bases.intro} The first plan is likely to satisfy those two responses. But your {apex.planet} in {apex.house_label} brings {apex.lived_need}. {apex.response_example} {apex.incomplete_first_answer}. {apex.returning_lived_example}.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: {base1.planet} helps you {base1.base_contribution}. {base2.planet} helps you {base2.base_contribution}. Your {apex.planet} will not call it settled until you {apex.base_contribution}. {bases.intro} The first plan is likely to satisfy those two responses. But your {apex.planet} brings {apex.lived_need}. {apex.response_example} {apex.incomplete_first_answer}. {apex.returning_lived_example}.
### Level 2  (Why the response keeps changing / {apex.planet}'s role / Where adjustment becomes necessary + Reference point)
title exact/strong: **How the Yod works** | wide: **How this wider Yod works** | partial: **How a possible Yod works**
opening exact: A Yod has two planets that work together and a third whose needs do not fit their first solution. Here, {base1.planet} and {base2.planet} form the cooperative pair. Each meets {apex.planet} at 150 degrees. That angle offers no automatic compromise, so a plan that suits {base1.planet} and {base2.planet} must be adjusted to include {apex.planet}.
opening wide: Because the links are wider, the pull to keep adjusting may surface in some situations more than as a rule.
how_it_works: (none)
planet_roles ("{apex.planet}'s role"): {apex.planet} is the apex: the planet whose needs do not fit the first solution. In this chart, that missing need appears in {apex.house_label}. The plan must be revised until it includes that need.
watch_for: (none)
reference_point ("Reference point"): Opposite {apex.planet} is a reference point in {reference.sign}, located in {reference.house_label}. It is not another planet or a missing piece. When the same issue returns, it points toward a perspective the first plan may have missed: away from the immediate demands of {apex.house_area} and toward the wider view of {reference.area}. In practice, that means {reference.behavior}.
unknown_time L2: A Yod has two planets that work together and a third whose needs are not fully met by their first solution. Here, {base1.planet} and {base2.planet} form the cooperative pair. Each meets {apex.planet} at 150 degrees, an angle that requires adjustment. A response that suits {base1.planet} and {base2.planet} may need revisiting before it also works for {apex.planet}. Opposite it, the reference point in {reference.sign} shows a balancing move through {reference.behavior}.
### Partial
L1: Your chart comes close to a Yod. You may recognize the sense of adjusting again and again around {apex.role_gloss}, especially when an old answer stops fitting.
L2: Your chart approaches a Yod, two planets near a sextile both near 150 degrees to {apex.planet}. You may recognize the pattern without experiencing it as a constant feature.

===============================================================================
## MYSTIC RECTANGLE
===============================================================================
MECHANIC: Two oppositions whose ends are joined by trines and sextiles, so every hard angle has an easier one beside it. The oppositions supply the tension; the soft links supply the ways out, so a conflict here rarely locks up. The two conflict areas are resolved from the participating planets and houses.
### Level 1
title exact/strong: **One disagreement can help you understand the other**
title wide: **A wider Mystic Rectangle** | partial: **Possible Mystic Rectangle**
opening exact: You may {oa1.base_contribution} while also trying to {oa2.base_contribution}; you may {ob1.base_contribution} while trying to {ob2.base_contribution}. What you learn from one conflict can help with the other.
opening wide: Your {oa1.planet}, {oa2.planet}, {ob1.planet}, and {ob2.planet} form a wider Mystic Rectangle. The mix of tension and available responses may become recognizable in certain situations rather than as a constant pattern.
feel: One conflict runs between {oppositionA.area}, and the other runs between {oppositionB.area}. {axisA.intro} {axisB.intro} The easier links let what you learn from one disagreement change how you handle the other. Because a workable route is usually available, you may settle the immediate situation before the underlying conflict is named.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: You may {oa1.base_contribution} while also trying to {oa2.base_contribution}; you may {ob1.base_contribution} while trying to {ob2.base_contribution}. {axisA.intro} {axisB.intro} The easier links let what you learn from one conflict help with the other.
### Level 2  (How tension and support connect / The two opposing pairs / Where compromise can hide the conflict)
title exact/strong: **How the Mystic Rectangle works** | wide: **How this wider Mystic Rectangle works** | partial: **How a possible Mystic Rectangle works**
opening exact: A Mystic Rectangle is two oppositions whose ends are joined by trines and sextiles, so every hard angle has an easier one beside it. The oppositions supply the tension and the softer links supply the ways out, so a conflict here rarely locks up.
opening wide: Because the links are wider, the balance of tension and easy routes may vary by situation rather than hold.
how_it_works: (none)
planet_roles ("The two opposing pairs"): {oa1.planet} opposes {oa2.planet} ({oa1.role_gloss} against {oa2.role_gloss}) and {ob1.planet} opposes {ob2.planet} ({ob1.role_gloss} against {ob2.role_gloss}). The supportive links let one opposition throw light on the other.
watch_for: (none)
unknown_time L2: A Mystic Rectangle is two oppositions joined by easier angles: {oa1.planet} against {oa2.planet}, {ob1.planet} against {ob2.planet}. One axis falls in {axisA.sign_list}; the other falls in {axisB.sign_list}. The softer links give the resulting conflict more than one route out.
### Partial
L1: Your chart comes close to a Mystic Rectangle. You may recognize how one conflict changes the way you respond to another, instead of leaving you with a complete standoff.
L2: Your chart approaches a Mystic Rectangle, two near-oppositions linked by soft angles. You may recognize the pattern without experiencing it as a constant feature.
