# Author from mechanism, not from existing prose (owner ruling, canonical, verbatim)

**Status: owner ruling, 2026-08-13. Generation and judge rule, not reader-facing copy. Applies to every reader-facing delineation surface: natal placements, natal aspects, empty houses, sky placements, and report units. Supersedes any workflow that starts from existing candidate prose. Companion to `TLDR-NATAL-PLACEMENT-DELINEATION-STANDARD-OWNER.md` (five beats) and `TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md` (astrology sentence to lived consequence).**

## The ruling in one line

The AstrologySupport field is the source. The existing prose is not the draft. Paraphrasing current copy is the cause of the drift.

## Owner text verbatim

```text
The rule I should have been using

The AstrologySupport field is the source. The existing prose is not the draft.
I need to stop paraphrasing the current copy. That is the source of the drift.

For every row, the process should now be:

Stage / Requirement
1. Extract mechanism - Reduce the astrology to one plain internal sentence. Example: Jupiter opposite Mars can push enthusiasm and action past a useful limit.
2. Find the human situation - Ask where someone actually experiences this: calendar, trip, argument, workout, work deadline, money, class, relationship, body.
3. Enter through the scene - Start with something happening, not a trait.
4. Show the consequence - What gets overbooked, misunderstood, spent, delayed, strained, missed, or made easier?
5. Add perspective only after the scene - Explain just enough for the reader to understand themselves differently.
6. Delete astrology-summary prose - If a sentence could appear in a generic horoscope, personality profile, therapy worksheet, or spiritual Instagram post, it probably goes.

And there is a harder quality test:

Could I photograph or overhear some part of this interpretation?

If the answer is no, it probably still needs work.

"Your creativity and empathy give you the ability to hold compassion" cannot be photographed.
"You are the friend who brings dinner over and stays long enough to wash the dishes because you know grief makes ordinary chores harder" can.

"Your competitive streak is strong" cannot.
"You turn the friendly game into a rematch, answer the coworker before they finish their sentence, or add another mile because stopping while you are ahead feels strangely unsatisfying" can.

That is the difference.
```

## Rejected mode (owner diagnosis, verbatim)

```text
Mercury sextile Venus is written like therapy language: empathy, suffering, grief, trauma, fertile potential, nurturing care, growth. There is no person doing anything.
Saturn trine Venus uses deep bonds, financial and emotional entanglements, intricate ties, engender loyalty. Nobody talks or lives like that.
Uranus sextile Venus turns the whole placement into an investment metaphor instead of showing how affection or money actually behaves.
Jupiter opposite Mars gives us life's biggest questions, adventure, education, spirituality, losing the forest for the trees, nuance. Almost every noun is abstract.
Neptune sextile Mars gives us intuition, discoveries, leaps of faith, work ethic, superpower. It could describe hundreds of placements.
Pluto trine Mars is all astrology poetry: catharsis, underworld, death and rebirth, mysteries of life. The reader has to translate every sentence.
Moon square Mars gives us knowledge, perspectives, rash judgments, defensive tendencies, objectivity. Again, analysis from outside the person.
MC conjunct Mars is archetype soup: warriors, athletes, striving, rocket fuel, chariot, blades. It is cleverer than it is useful.

That whole mode needs to be rejected, not polished.
```

## Owner benchmark rewrites (calibration exemplars, verbatim)

**Jupiter opposite Mars**

```text
You sign up for the course, book the trip, volunteer for the project, and only then look at the week you already had planned. Enthusiasm makes the next experience feel worth stretching for, especially when there is something to learn, prove, or see for yourself. The problem usually appears later, when the flight is at six, the presentation is still unfinished, and your body has been running on whatever you could eat between obligations. You can want the bigger life without making every opportunity fit into the same week.
```

**Mercury sextile Venus**

```text
You usually know how to say the difficult part without making somebody regret telling you. A grieving friend gets a text that does not demand an answer. A tense email gets rewritten once before you send it. When somebody is embarrassed, you can leave them a little dignity while still dealing with what happened. That same instinct can show up in writing, editing, design, art, or any work where the way something is communicated matters almost as much as the information itself.
```

**Moon sextile Venus**

```text
You remember the coffee order, bring food when someone has had a terrible week, and notice when the room would feel better with the lamp on instead of the overhead light. Affection tends to come through small choices that make another person more comfortable. You may not think of any of this as caretaking. To the people who know you well, it is often how they know you care.
```

## Workflow change (owner directive, verbatim)

```text
So I would make a significant change to our workflow: do not use V2/V3 prose as the starting sentence structure anymore. Keep the row key, source mechanism, astrology support, and source constraints. Then write the reader copy fresh against the lived benchmark.
```

## Implementation (not owner prose)

### Generation contract

The writer receives the row key, the astrology-support mechanism, and the source constraints. The writer does NOT receive the existing candidate prose as a drafting input. Existing prose may be shown only to a downstream comparison step, never as the sentence structure to improve.

Stage order is enforced: mechanism sentence (internal, never shipped) → human situation → scene entry → consequence → perspective last.

### Judge additions

1. `photograph-test` (blocking): at least one clause in the passage names something that could be photographed or overheard. Abstract-noun subjects with no observable referent fail. The failing pattern is a sentence whose subject is a quality (creativity, empathy, competitiveness, intuition, work ethic) rather than a person doing something.
2. `trait-entry` (blocking): the opening must be something happening, not a trait or an abstract restatement.
3. `interchangeable` (blocking): if the passage could describe many other placements without alteration, it fails. Test by substituting a different planet pair and asking whether the prose still reads as true.
4. `astrology-summary` (blocking): a sentence that could appear unchanged in a generic horoscope, personality profile, therapy worksheet, or spiritual social post is deleted, not softened.
5. `archetype-soup` (blocking): mythological or archetypal vocabulary standing in for behavior (warriors, chariot, underworld, catharsis, rebirth, blades, rocket fuel).
6. `paraphrase-of-prior` (blocking, batch pipelines only): a candidate whose sentence structure tracks the prior version's is a paraphrase, not an authoring. Compare against the prior row and fail on structural correspondence.

### Deterministic lint (pre-judge)

Flag abstract-noun subjects in opening sentences; flag passages containing zero concrete nouns from the observable set (objects, places, times, money amounts, body, food, messages, documents, rooms, vehicles, appointments); flag therapy-register vocabulary clusters (empathy, trauma, nurturing, healing, growth, potential, energy, journey) where no observable action appears in the same paragraph.

### Precedence

Where this ruling and an earlier standard appear to conflict, this ruling governs the entry point and the evidence source; the five-beat model still governs the shape once the scene has been established; the lived-prose standard still governs the astrology-to-consequence move.
