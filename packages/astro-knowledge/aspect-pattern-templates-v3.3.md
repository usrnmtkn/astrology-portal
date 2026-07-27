# Aspect pattern templates v3.3 (canonical - supersedes v3.2 and all earlier drafts)

Invariant copy assumes no particular planet's style; confidence branches complete at
both levels; one token namespace; house-aware empty-leg and reference clauses;
sign-resolved house-free unknown-time bodies at both levels. This file is the single
authority; v3.2 and earlier are historical.

## TOKEN REGISTRY (frozen contract - enforced by validate_patterns.py + render_matrix.py)

Role namespaces (the ONLY allowed prefixes; no aliases like apex_planet / f / fo / a / b1 / ref_sign):
  lists: c1..c4 (Grand Cross), t1..t3 (trines), base1,base2 (Yod sextile),
         oppA,oppB (T-square opp ends), oa1,oa2,ob1,ob2 (Mystic)
  singular roles: apex, focal (+focal.opposes), empty_leg, reference,
         oppositionA, oppositionB (derived opposition, has .area)

Fields (suffix | type | source | grammatical contract | sign? | house?):
  planet            | noun | chart | proper noun | - | -
  sign              | noun | chart | proper noun | - | -
  opposes           | noun | chart | planet name | - | -
  house_label       | phrase | house number | "the Nth house" | - | label only
  house_area        | noun phrase | house-topic layer | "home, family, and privacy" | - | Y
  house_context     | prepositional | house-context layer | "at home, around where you live" | - | Y
  role_gloss        | phrase | planet-function table | "what you're driving toward" | - | -
  sign_house_pull   | verb phrase | sign-behavior + house_context | completes "{planet} in {house_label} ___" | Y | Y
  sign_house_response | verb phrase | sign-behavior + house_context | completes "{planet} in {house_label} ___" (apex/focal) | Y | Y
  sign_pull         | verb phrase | sign-behavior only | house-free "{planet} ___" (unknown time) | Y | -
  sign_behavior     | verb phrase | sign-behavior only | house-free (unknown time) | Y | -
  response_example  | short clause | sign-behavior | shows_up ("often by protecting your space") | Y | -
  pressure_response | short clause | sign-behavior | complicated ("retreat, guard the people you love") | Y | -
  balancing_move    | clause | empty-leg sign | the balancing response | Y | -
  behavior          | clause | reference sign | what the reference points to | Y | -
  apex_pressure     | clause | apex-pressure table + sign + house | what the apex adds | Y | Y
  repeating_question| clause | apex planet + sign + house | the returning question | Y | Y
  focal_demand      | clause | focal-demand table + sign + house | the demand the focal adds | Y | Y
  focal_interruption| clause | focal planet + sign + house | the lived interruption | Y | Y
  area              | clause | opposition planets + houses | lived area of an opposition | - | Y

A token in the templates but not in this registry, or a registered token never used,
is a validation failure. Required clauses per pattern and every structural rule are
checked by validate_patterns.py; the per-role label-blind (sign) and house-blind
audits are proven by render_matrix.py. FROZEN: after this passes, table authoring
may change only the VALUES supplied to existing tokens - not add, rename, or change
any token's grammatical contract.

## Eligible bodies (LOCKED)
Primary detector (creates/suppresses patterns): Sun, Moon, Mercury, Venus, Mars,
Jupiter, Saturn, Uranus, Neptune, Pluto = 10 bodies. Chiron is SECONDARY - it may
appear as a participant but does not create or suppress a primary pattern in v1.
Nodes and angles are EXCLUDED (points, not bodies; no focal_demand / apex_pressure
grammar). => focal-demand-by-planet and apex-pressure-by-planet tables are 10 primary
rows each (+1 optional Chiron row only when secondary participation is designed).

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
opening exact: Your {oppA.planet}, {oppB.planet}, and {apex.planet} form a T-square, and {apex.planet} is the first place the pressure tends to show.
opening wide: Your {oppA.planet}, {oppB.planet}, and {apex.planet} form a wider T-square. You may recognize {apex.planet} as one place this pressure shows, though it may not work the same way every time.
feel: Your {oppA.planet} in {oppA.house_label} {oppA.sign_house_pull}. Your {oppB.planet} in {oppB.house_label} {oppB.sign_house_pull}. Those two pull opposite ways, and {apex.planet} in {apex.house_label} {apex.sign_house_response}, tending to end the suspense first, {apex.response_example}. That brings relief while the underlying pull stays intact, so you {apex.pressure_response} and then find the original conflict still waiting.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: Your {oppA.planet}, {oppB.planet}, and {apex.planet} form a T-square. Your {oppA.planet} {oppA.sign_pull} while your {oppB.planet} {oppB.sign_pull}, pulling different ways, and {apex.planet} is where that tension tends to become a response, {apex.response_example}. The response brings relief while the pull stays intact.

### Level 2  (How the pressure moves / {apex.planet}'s role / What happens when pressure builds)
title exact/strong: **How the T-square works** | wide: **How this wider T-square works** | partial: **How a possible T-square works**
opening exact: A T-square is two planets in opposition, both squaring a third. Two parts of you keep pulling opposite ways, {oppA.role_gloss} against {oppB.role_gloss}, and when neither can be ignored, {apex.planet}, the apex, is where the tension becomes a response.
opening wide: Because the links are wider, the apex may gather the tension in some situations more than as a rule.
how_it_works: (none)
planet_roles: {apex.planet} is the apex, so it tends to be the first place the pressure shows. Opposite it, the empty leg in {empty_leg.sign}, in {empty_leg.house_label}, is not a missing piece or a guaranteed solution - it is the less automatic response, toward {empty_leg.house_area}: {empty_leg.balancing_move}.
watch_for: (none)
unknown_time L2: A T-square is two planets in opposition, both squaring a third, the apex. Here {apex.planet} tends to be where the tension becomes a response, {apex.response_example}. Opposite it, a less automatic balancing response appears through {empty_leg.balancing_move}.

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
opening exact: Your {c1.planet}, {c2.planet}, {c3.planet}, and {c4.planet} tie {c1.house_area}, {c2.house_area}, {c3.house_area}, and {c4.house_area} into one pattern, and more than one can need a response at the same time.
opening wide: Your {c1.planet}, {c2.planet}, {c3.planet}, and {c4.planet} form a wider Grand Cross. You may feel the squeeze across these areas during certain periods rather than as a constant.
feel: Your {c1.planet} in {c1.house_label} {c1.sign_house_pull}. Your {c2.planet} in {c2.house_label} {c2.sign_house_pull}. Your {c3.planet} in {c3.house_label} {c3.sign_house_pull}. Your {c4.planet} in {c4.house_label} {c4.sign_house_pull}. One decision rarely settles all four: a move that protects {c1.house_area} can strain {c4.house_area}, and a demand from {c2.house_area} can interrupt {c3.house_area}. You may stay functional by treating every demand as urgent, then find you are answering the loudest problem while your own needs wait for a quieter week that never arrives.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: Your {c1.planet}, {c2.planet}, {c3.planet}, and {c4.planet} form a Grand Cross. Your {c1.planet} {c1.sign_pull} and your {c3.planet} {c3.sign_pull}; your {c2.planet} {c2.sign_pull} and your {c4.planet} {c4.sign_pull}. More than one can need a response at once, and settling one tends to unsettle another.
### Level 2  (How the conflict keeps moving / The four competing responses / Where the cycle repeats)
title exact/strong: **How the Grand Cross works** | wide: **How this wider Grand Cross works** | partial: **How a possible Grand Cross works**
opening exact: A Grand Cross is two oppositions at right angles, so four planets square and oppose each other in a closed figure with no single outlet. Each corner sits in tension with the two beside it and the one across, so pressure hands off around the figure and easing one corner tends to load another.
opening wide: Because the links are wider, the four-way squeeze may show up in certain periods more than as a constant.
how_it_works: (none)
planet_roles: {c1.planet} and {c3.planet} form one opposition, {c1.role_gloss} against {c3.role_gloss}. {c2.planet} and {c4.planet} form the other, {c2.role_gloss} against {c4.role_gloss}. No planet is the whole story, and none is the release the way a T-square has an apex.
watch_for: (none)
unknown_time L2: A Grand Cross is two oppositions at right angles: {c1.planet} against {c3.planet}, {c2.planet} against {c4.planet}. Your {c1.planet} {c1.sign_pull}, and the tension it adds hands off around the figure with no single outlet.
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
opening exact: Your {t1.planet}, {t2.planet}, and {t3.planet} tend to support the same response. Once one part moves in a certain direction, the other two are less likely to argue with it.
opening wide: Your {t1.planet}, {t2.planet}, and {t3.planet} form a wider Grand Trine. You may notice their agreement in certain situations rather than in every part of your life.
feel: Your {t1.planet} in {t1.house_label} {t1.sign_house_pull}. Your {t2.planet} in {t2.house_label} {t2.sign_house_pull}. {t3.planet} in {t3.house_label} {t3.sign_house_pull}. Because these responses reinforce one another, one makes the next feel natural before you have stopped to question the direction. The agreement lowers the pressure to check your first response, so you may repeat a familiar approach, skip useful feedback, or read ease as proof the approach is working.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: Your {t1.planet}, {t2.planet}, and {t3.planet} form a Grand Trine. Your {t1.planet} {t1.sign_pull}, your {t2.planet} {t2.sign_pull}, and your {t3.planet} {t3.sign_pull}, and the three tend to support the same response. It can feel natural enough to lean on without questioning.
### Level 2  (Where the ease comes from / How the planets cooperate / Where ease can become inertia)
title exact/strong: **How the Grand Trine works** | wide: **How this wider Grand Trine works** | partial: **How a possible Grand Trine works**
opening exact: A Grand Trine is three planets roughly 120 degrees apart in a closed triangle, usually in one element, which is why the responses tend to agree.
opening wide: Because one or more links are wider, the agreement may be situational rather than constant.
how_it_works: The three planets share an element, so they share a style of response and rarely work against each other. The parts agree before you have to reconcile them.
planet_roles: {t1.planet}, {t2.planet}, and {t3.planet} pass momentum between {t1.role_gloss}, {t2.role_gloss}, and {t3.role_gloss}. Ease here is not talent or success; it means these parts cooperate before you have had to explain why.
watch_for: (none)
OVERRIDE out_of_sign (replaces how_it_works): Your {t1.planet}, {t2.planet}, and {t3.planet} form trines by degree even though they do not all sit in signs of the same element. The cooperation can still show up in stretches, but the planets do not share one automatic style, so what feels easy in one moment may need translation in another.
unknown_time L2: A Grand Trine is three planets in a closed triangle that share a style of response. Your {t1.planet} {t1.sign_pull}, and {t2.planet} and {t3.planet} rarely work against it. The same ease can also let the pattern go soft.
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
opening exact: Your {t1.planet}, {t2.planet}, and {t3.planet} run an easy current between {t1.role_gloss}, {t2.role_gloss}, and {t3.role_gloss}. {focal.planet} stands across from {focal.opposes} and adds {focal.focal_demand}.
opening wide: Your {t1.planet}, {t2.planet}, {t3.planet}, and {focal.planet} form a wider Kite, with {focal.planet} opposite {focal.opposes}. The pull between the easier response and {focal.planet}'s demand may become clear in certain situations rather than every time.
feel: Your {t1.planet} in {t1.house_label} {t1.sign_house_pull}. Your {t2.planet} in {t2.house_label} {t2.sign_house_pull}. Your {t3.planet} in {t3.house_label} {t3.sign_house_pull}, and together these responses reinforce one another. {focal.planet} in {focal.house_label} {focal.sign_house_response}, introducing {focal.focal_demand}, a condition the momentum has to hold up under: {focal.focal_interruption}. The easy flow can make a response feel complete before it has met that demand, and {focal.planet} is where {focal.focal_interruption} shows what still needs attention.
shows_up: (none)
complicated: (none)
another_response: (none - the focal point is {focal.planet}, covered at L2)
unknown_time L1: Your {t1.planet} {t1.sign_pull}, and with {t2.planet} and {t3.planet} the three run an easy current, until {focal.planet} adds {focal.focal_demand}. The trine maintains the momentum; {focal.planet} brings the condition that cannot be skipped.
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
L1: Your chart comes close to a Kite. You may recognize the pull between a response that comes naturally and {focal.focal_demand}, especially when {focal.focal_interruption} changes what is possible.
L2: Your chart approaches a Kite, a Grand Trine with a near-opposition to {focal.planet}. You may recognize the pattern without experiencing it as a constant feature.

===============================================================================
## YOD
===============================================================================
MECHANIC: Two planets in an easy sextile that both reach a third at 150 degrees, an angle with no natural resting place. The apex is what the base pair keeps adjusting to - it needs a different response from the one that comes naturally to them. Opposite it is an unoccupied balancing direction.
### Level 1
title exact/strong: **{apex.planet} keeps needing a different response**
title wide: **A wider Yod** | partial: **Possible Yod**
opening exact: Your {base1.planet} and {base2.planet} keep an easy rhythm between {base1.role_gloss} and {base2.role_gloss}. {apex.planet} in {apex.house_label} adds {apex.apex_pressure}.
opening wide: Your {base1.planet}, {base2.planet}, and {apex.planet} form a wider Yod. The pull to keep adjusting toward {apex.planet} may surface in some situations more than as a constant.
feel: Your {base1.planet} in {base1.house_label} {base1.sign_house_pull}. Your {base2.planet} in {base2.house_label} {base2.sign_house_pull}. {apex.planet} in {apex.house_label} {apex.sign_house_response}, and a response that satisfies the first two tends to leave {apex.planet} out. {base1.planet} and {base2.planet} produce a workable first answer, and then {apex.planet} comes back later with {apex.repeating_question}. The same question returns until all three can take part, none handled as an afterthought.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: Your {base1.planet} {base1.sign_pull} and your {base2.planet} {base2.sign_pull}, keeping an easy rhythm, while {apex.planet} adds {apex.apex_pressure}. A response that works for the first two may need reworking once {apex.planet} is included.
### Level 2  (Why the response keeps changing / {apex.planet}'s role / Where adjustment becomes necessary + Reference point)
title exact/strong: **How the Yod works** | wide: **How this wider Yod works** | partial: **How a possible Yod works**
opening exact: A Yod is two planets in an easy sextile that both reach a third at 150 degrees, an angle with no natural resting place. {base1.planet} and {base2.planet} sit comfortably together, but both meet {apex.planet} at that awkward angle, so the response that suits their rhythm keeps missing {apex.planet}, and you adjust again.
opening wide: Because the links are wider, the pull to keep adjusting may surface in some situations more than as a rule.
how_it_works: (none)
planet_roles ("{apex.planet}'s role"): {apex.planet} is the apex, the point everything has to keep accommodating. In {apex.house_label} it weighs {apex.role_gloss}. It is not punishment; it is the part that will not be smoothed over, only answered honestly.
watch_for: (none)
reference_point ("Reference point"): Opposite {apex.planet}, the balancing direction falls in {reference.house_label}, in {reference.sign}. It points toward {reference.area}, approached through {reference.behavior}. It is a reference point, not another planet in your chart.
unknown_time L2: A Yod is two planets in a sextile that both reach {apex.planet} at an awkward 150-degree angle, so {base1.planet} and {base2.planet} keep adjusting to {apex.planet}, which adds {apex.apex_pressure}. Opposite it is an unoccupied balancing direction in {reference.sign}.
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
opening exact: Your {oa1.planet}, {oa2.planet}, {ob1.planet}, and {ob2.planet} hold two opposing pulls, but the supportive links between them give the pressure more than one route.
opening wide: Your {oa1.planet}, {oa2.planet}, {ob1.planet}, and {ob2.planet} form a wider Mystic Rectangle. The mix of tension and available responses may become recognizable in certain situations rather than as a constant pattern.
feel: Your {oa1.planet} in {oa1.house_label} {oa1.sign_house_pull}, and your {oa2.planet} in {oa2.house_label} {oa2.sign_house_pull}, setting {oa1.role_gloss} against {oa2.role_gloss}. Your {ob1.planet} in {ob1.house_label} {ob1.sign_house_pull}, and your {ob2.planet} in {ob2.house_label} {ob2.sign_house_pull}, setting {ob1.role_gloss} against {ob2.role_gloss}. A conflict around {oppositionA.area} changes how you respond to {oppositionB.area}, so one disagreement can help you understand the other. The risk is smoothness: because there is always a workable route, you may settle the immediate situation before the underlying conflict is named, and the resolution can look elegant while the original clash of values stays live underneath.
shows_up: (none)
complicated: (none)
another_response: (none)
unknown_time L1: Your {oa1.planet}, {oa2.planet}, {ob1.planet}, and {ob2.planet} form a Mystic Rectangle. Your {oa1.planet} {oa1.sign_pull} while your {oa2.planet} {oa2.sign_pull}; your {ob1.planet} {ob1.sign_pull} while your {ob2.planet} {ob2.sign_pull}. The easier links let one conflict help you understand the other.
### Level 2  (How tension and support connect / The two opposing pairs / Where compromise can hide the conflict)
title exact/strong: **How the Mystic Rectangle works** | wide: **How this wider Mystic Rectangle works** | partial: **How a possible Mystic Rectangle works**
opening exact: A Mystic Rectangle is two oppositions whose ends are joined by trines and sextiles, so every hard angle has an easier one beside it. The oppositions supply the tension and the softer links supply the ways out, so a conflict here rarely locks up.
opening wide: Because the links are wider, the balance of tension and easy routes may vary by situation rather than hold.
how_it_works: (none)
planet_roles ("The two opposing pairs"): {oa1.planet} opposes {oa2.planet} ({oa1.role_gloss} against {oa2.role_gloss}) and {ob1.planet} opposes {ob2.planet} ({ob1.role_gloss} against {ob2.role_gloss}). The supportive links let one opposition throw light on the other.
watch_for: (none)
unknown_time L2: A Mystic Rectangle is two oppositions joined by easier angles: {oa1.planet} against {oa2.planet}, {ob1.planet} against {ob2.planet}. Your {oa1.planet} {oa1.sign_pull}, and the soft links give the resulting conflict more than one route out.
### Partial
L1: Your chart comes close to a Mystic Rectangle. You may recognize how one conflict changes the way you respond to another, instead of leaving you with a complete standoff.
L2: Your chart approaches a Mystic Rectangle, two near-oppositions linked by soft angles. You may recognize the pattern without experiencing it as a constant feature.
