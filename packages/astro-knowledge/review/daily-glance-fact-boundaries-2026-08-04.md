# Daily At-a-Glance: fact boundaries (asset 2)

Date: 2026-08-04
Prepared by: editorial assistant, distilled from the governed astrology library only. Nothing here is invented; every statement carries its source file. REVIEW markers flag what needs the owner's eye before this packet feeds Sol. One approval covers the packet (cadence step 1).
Self-lint: statements below avoid the output ban lists so fact text can enter prompts directly.

## F1. Engine facts (resolver-supplied; never rendered as text)

- Contact gate: transiting Moon within 5 degrees of a natal target. Source: shipped selection, `orb-policy.json` governs wider transit gates.
- Computation: once per user per day at local noon (assembly spec section 2).
- Aspect groups: conjunction, square, opposition, soft. Trine and sextile collapse into soft by owner design; copy cannot know which occurred and must never imply it can.
- Interpretive school: the aspects primitive holds two schools side by side (traditional and cyclic) and requires each surface to pick one. This surface uses TRADITIONAL, because applying/separating carries the selection logic. REVIEW.
- Applying policy (resolves D3): prefer the tightest APPLYING contact. If only separating contacts sit within orb, fall through to the HOUSE fallback rather than serve peak copy for a fading contact. Grounding: the primitive defines separating soft as "the opening closes; unused, it passes" and "the ease withdraws" (`primitives/aspects.json`), while each content row is static and written at available-condition strength; serving it on a fading contact is the overpromise DG-R4 bans. RECOMMENDED ANSWER, owner ratification: ____
- Angle targets (new gap G4, decision D14): App.tsx compares the Moon against the Ascendant and Descendant, but the spec says "natal planet" and the content model has 14 targets with no angle keys; an angle winning the tightest-contact race requests a key that does not exist. Recommended: remove angles from the daily-glance comparison set to match spec and content; add angle rows later as a deliberate expansion if wanted. RECOMMENDED ANSWER, owner ratification: ____

## F2. Aspect-group meanings at daily scale

Source: `primitives/aspects.json`, traditional school. Scale note: the Moon moves roughly 12-13 degrees per day, so any contact is a matter of hours. Every group meaning below licenses conditions, not outcomes (DG-R4).

- Conjunction: the two meanings fuse and intensify; the target's whole theme saturates the mood of the day. Nature: takes the combined nature of Moon and target.
- Square: friction that builds toward an adjustment; malefic-leaning; the friction is internal to the person's own day (self-friction register per DG-R2).
- Opposition: the other side comes fully into view; awareness- and relationship-oriented; friction arrives through another person (other-friction register).
- Soft: a supportive opening is offered, not automatic (sextile); ease that arrives and passes whether used or not (trine). Licensed claims: things feel easier, starting costs less, the opening exists. Not licensed: results, absence of all resistance, success of any named action.

## F3. Natal-target meanings at daily scale (14 targets)

Each line is distilled from the named source. The daily meaning is the target's core function under a brief lunar touch; domains not listed are unsupported for this surface. Planet files carry REVIEWED status; the four point files carry DRAFT status and need explicit REVIEW here.

| Target | Daily-scale meaning (Moon contact colors the day with...) | Unsupported at this scale | Source, status |
| --- | --- | --- | --- |
| sun | identity, vitality, visibility, confidence, acting from one's own center | life purpose overhauls | `planetary/sun.json`, REVIEWED |
| moon | the emotional body: instinct, mood, safety, belonging, needs noticed or unnoticed | long-term family narrative | `planetary/moon.json`, REVIEWED |
| mercury | thought, language, questions, conversation, information becoming useful | contracts, major decisions | `planetary/mercury.json`, REVIEWED |
| venus | attraction, pleasure, values, comfort, affection becoming real | money windfalls, commitment milestones | `planetary/venus.json`, REVIEWED |
| mars | action, drive, courage, desire, the instinct to move toward what is wanted | conflict escalation as advice | `planetary/mars.json`, REVIEWED |
| jupiter | growth, opportunity, belief, generosity, confidence, trusting possibility | guaranteed luck, financial promises | `planetary/jupiter.json`, REVIEWED |
| saturn | structure, responsibility, limits, discipline, becoming more capable and realistic | verdicts on character, life audits | `planetary/saturn.json`, REVIEWED |
| uranus | the need for room to change, surprise, refusal of a stale pattern | rupture as instruction | `planetary/uranus.json`, REVIEWED |
| neptune | imagination, longing, compassion, receptivity, softened boundaries | escapism as advice, spiritual claims | `planetary/neptune.json`, REVIEWED |
| pluto | honesty about what sits underneath: power, control, what can no longer stay buried; under friction this runs through emotional intensity, not only analysis (Ebertin refinement, F6) | transformation promises, "healing" claims | `planetary/pluto.json`, REVIEWED |
| chiron | nearness of an old wound and the option of working with it honestly | cure narratives; medicine-metaphor closers | `points/chiron.json`, DRAFT - REVIEW |
| north-node | pull toward unfamiliar growth, the field asking for conscious development | destiny language | `points/north-node.json`, DRAFT - REVIEW |
| south-node | pull of familiar pattern, inherited competence, the comfort zone | past-life language | `points/south-node.json`, DRAFT - REVIEW |
| lilith | raw instinct that refuses to be tamed or shamed; unfiltered truth, autonomy | provocation as advice | `points/black-moon-lilith.json`, DRAFT - REVIEW |

## F4. House-fallback topics (no contact within orb)

Source: `primitives/houses.json`, plainTranslation fields, DRAFT status - REVIEW. The house supplies the day's topic only in this fallback (D4 below).

1 self, body, identity, first impressions; 2 money, possessions, resources, values; 3 communication, siblings, short trips, local environment; 4 home, family, roots, private life; 5 creativity, romance, children, play, self-expression; 6 work, daily routine, service, health; 7 partnership, one-to-one others; 8 shared resources, intimacy, transformation; 9 beliefs, higher education, travel, philosophy; 10 career, public role, reputation, authority; 11 friendships, groups, hopes, community; 12 solitude, hidden things, retreat, the unconscious.

Note: house 6 source includes "illness, injury, health affliction"; daily copy should stay on routine and looking after the body, not diagnosis. House 12 source includes "confinement, isolation"; daily copy stays on rest and privacy.

## F5. Remaining recommended answers (asked by the owner, grounded in existing surface work)

- D4: (a) amend the assembly-spec sentence so the house supplies the topic only in the no-aspect fallback, matching the shipped 4x14+12 model. Grounding: expanding to a house axis multiplies the content model past a thousand rows against OV-042's no-quota principle, and no other surface couples two derivation axes in one row key. RECOMMENDED ANSWER, owner ratification: ____
- D8: (a) adopt the VC-016 hard-output inventory for this surface minus the collective-pronoun rules, exactly as the aspect surface derived VC-018 from the placement inventory. Surface-specific additions are DG-R1 through R6. RECOMMENDED ANSWER, owner ratification: ____
- D12: soft/mars as the reference-piece anchor: fully diagnosed failure modes, clearest seed (Mars effort under offered ease), and the group (soft) that carries the most overpromise risk, so the approved pair teaches the hardest lesson first. RECOMMENDED ANSWER, owner ratification: ____

## F6. Book cross-check (owner-requested, 2026-08-04)

Verified against the Resources-folder books directly, not only the repo files.

Ebertin, "Transits: What Days Favor You," has a dedicated transiting-Moon chapter (entries 14-26) with +, -, and C markers that map onto our soft, friction, and conjunction groups. Row-by-row against F3: sun (recognition, praise, affection) confirms; moon (moods) confirms; mercury (intellectual stimulation, news, short trips, small transactions) confirms; venus (feelings of love, sociability, desire for affection) confirms; mars (impulsiveness, goal-consciousness, enterprise, "small successes"; irritability under friction) confirms; jupiter (happiness, helpfulness, "small advantages," recognition) confirms; saturn (self-control, duty, settling matters; inhibition and low confidence under friction) confirms; uranus (excitability, instinct, surprises, restlessness) confirms; neptune (introspection, vivid dream life; illusion under friction) confirms; pluto (pursuit of aims, assertion; sudden emotional outbursts under friction) confirms, and adds a refinement adopted into F3: Moon-Pluto friction runs through emotional intensity, not only power analysis.

Scale rule independently confirmed: Ebertin states the Moon's influence "lasts only a few hours," functions "primarily as a trigger," and that "great importance cannot be attached to the individual lunar transits." His "+" entries are consistently small-scale (visits, small gifts, small advantages, small successes), which is DG-R4 in 1970s German cosmobiology.

Hamaker-Zondag, "Aspects," confirms all four group meanings in F2: conjunction (forces act together, intensified, latent modes); opposition (tension and doubt through the axis, "the reverse side of the coin," relationship-oriented); square (open tension, acute problems, drive, distinct from the opposition's other-pole structure, supporting the self/other-friction split); trine (a gift, rest, ease to fall back on); sextile (a weak trine whose "promise is not too easily realized" and needs application, which is the offered-not-automatic boundary verbatim in spirit).

Rodden, "Modern Transits," covers slow transiting planets only, so it checks the natal-target column indirectly: her natal-Moon entries (mood, family, domestic life, women and children) match our moon row.

One school divergence, recorded not fixed: Ebertin reads Moon-to-Node as contacts and associations, while our governed sources (Rudhyar, Spring, the owner's lunar-nodes file) read the nodes as the growth/release axis. The governed sources win per SO-001; Ebertin's reading is noted as cosmobiology school variance, not an error.

Chiron and Lilith predate none of Ebertin/Rodden coverage (both absent, as expected for the period); their F3 rows re-derive from the owner's own sources (P3), whose provenance already cites Greene, Hand Clow, Spring, Rudhyar, and the BML texts in this folder. My distilled rows contradict none of them.

## F7. Moon-Moon source record candidate (drafted 2026-08-04, needs exact owner approval)

The pair imports landed (2026-08-04 Codex run) but the natal-Moon target has no compact record: the matching-library ZIP describes two people's Moon signs, not the transiting-to-natal contact, and Codex correctly held it back. Assistant-drafted candidate below, distilled from `planetary/moon.json`, Ebertin entry 15 (Moon-to-Moon: pleasant mood under harmony; "changes in mood" under friction), and the fact that the conjunction is the monthly lunar return. Not owner voice; lands as `data/pairs/moon-moon.json` only with exact approval.

OWNER-REWRITTEN AND APPROVED wording (owner, chat, 2026-08-04, "for P8:", lived-experience version chosen; assistant draft superseded):

- traditional: "About once a month, the Moon returns to the same place in the zodiac it held when you were born. For a few hours, your feelings are easier to notice. You may realize what you need, what has been weighing on you, and what feels different from last month."
- modern.blend (conjunction): "Your feelings arrive quickly and take up more space than usual. It is hard to ignore what you need, and your mood may shape how you answer, decide, or react for the next few hours."
- modern.harmonious (soft): "You feel more comfortable in your own skin. The day makes room for what you need, and it is easier to move through your routine without feeling pulled away from yourself."
- modern.hard (square/opposition): "You have plans, but your mood shifts and suddenly you need more time, space, or rest than the day allows. You may get irritated when someone rushes you, ignores what you need, or expects you to keep going as if nothing changed."

- P8. APPROVED with the owner's exact wording above. (Owner, chat, 2026-08-04.)

## 6. Sign-off

- P1. Approve this fact packet as the meaning boundary for daily-glance generation (with any line edits above). OWNER: APPROVED, traditional school included, after the F6 book cross-check. (Owner, chat, 2026-08-04: "P1 - yes.")
- P2. Ratify the recommended answers to D3, D4, D8, D14. OWNER: APPROVED. (Owner, chat, 2026-08-04: "P2 - if you answered, then it's answered." D12 approved separately: "Yes, lets start with soft/mars.")
- P3. UPDATE 2026-08-04: the owner reports she has just written the chiron, node, and lilith sources and they will be moved to approved; generation for those four targets sources from HER files once they land, superseding the DRAFT point files cited in F3. The new files are not yet in this working copy (likely the same orphaned checkout as the batch-2 word fixes); F3's chiron/node/lilith rows get re-derived from her wording when they arrive. House primitives remain DRAFT and are approved for this surface only. OWNER: APPROVED. (Owner, chat, 2026-08-04: "P3 - I am approving their use for this surface.")
