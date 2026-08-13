# Reader Judge v1 — blind calibration Round 2

## Headline metric

**Found the actual owner correction: 100.0% (15/15 pairs).**

Important limitation: Group B used exact changed field passages rather than complete rendered pages; this makes localization easier and limits the headline metric's external validity. No rerun is authorized.

## Frozen configuration

- Prompt SHA-256: `be54881bd06ff602bc93d121c6c4d011b0d070f072812dcd114008dd9781234f`
- Schema SHA-256: `7ecd808c7cd200b1be7e4deee54a822105ee9b4bfe273160bc117ab20b51fa82`
- Model/reasoning: `gpt-5.6-terra` / `medium`
- Prompt tuning during Round 2: none
- Verdict field: absent
- Governance: advisory forever; prose judgment remains an owner gate

## Calls and tokens

- Calls: 56
- Retries: 0
- Tokens: 799859 total (789292 input, 10567 output, 734 reasoning; 782656 cached input)

## Corpus

- Group A unseen owner gold: 10
- Group B: 15 before/after pairs / 30 calls
- Group C mixed quality: 8
- Group D near miss: 8

## Unseen owner-approved results

- Pages: 10
- Flags: 43
- Average: 4.30
- Median: 3
- Zero / one / more than one: 1 / 1 / 8

### Every owner-approved flag, verbatim

### rj2-a-01 — serving:approved/calendar-weekly-overview/2026-08-03

- **medium / explanatory_not_lived / CORRECT:** “The Last Quarter Moon in Taurus on Wednesday slows that urgency enough to show the practical limit.” — This explains the transit's function instead of naming the moment where someone notices what the choice will cost.
- **high / explanatory_not_lived / CORRECT:** “Venus enters Libra on Thursday, and the Sun trine Saturn makes a fair correction easier to hold.” — “Makes a fair correction easier to hold” is an abstract claim where a recognizable correction would carry the meaning better.
- **high / analytical_register / DEFENSIBLE_BUT_NOT_USEFUL:** “Ask what each person agreed to, what support is available, and where a boundary needs to be explicit.” — The checklist language reads like procedural relationship advice rather than showing the actual disagreement or unequal arrangement.
- **medium / unearned_assumption / CORRECT:** “Mercury enters Leo on Sunday and brings the unspoken need for recognition into the conversation.” — “The unspoken need” assumes a motive that the page has not made observable.
- **high / abstraction_over_consequence / CORRECT:** “A workable answer should leave room for honesty, contribution, and follow-through.” — The closing names general virtues instead of telling the reader what a workable answer would change for the people involved.

### rj2-a-02 — serving:authored/calendar-weekly-moon/virgo/variant-2

No flags.

### rj2-a-03 — serving:authored/compat-deep/moon/aquarius/aquarius

- **medium / textbook_scaffold / CORRECT:** “Your Moon is your instinctual emotional world: how you feel, what comforts you, how you care for yourself and others, how you react when you are upset, and what helps you recover after stress.” — This opens with a long definition list instead of getting quickly to a recognizable emotional pattern.
- **high / clinical_shorthand / CORRECT:** “Most of it is unconscious, conditioned behavior.” — This sounds like diagnostic language rather than naming how the pattern shows up in ordinary life.
- **medium / unearned_assumption / CORRECT:** “You're the two who get called distant by everyone else and know better.” — It assumes both people have been judged this way and that the judgment is wrong before the page has shown either thing.
- **medium / vague_history / CORRECT:** “What happened growing up shaped how each of you learned to use that reflex.” — The sentence points to formative history without saying what either person actually experienced or learned.
- **medium / constructed_sentence / DEFENSIBLE_BUT_NOT_USEFUL:** “and to think your way through what other people cry their way through” — The parallel phrasing sounds written for effect rather than like a natural description of what happens.
- **low / sign_house_separation / FALSE_POSITIVE:** “Because both of your Moons are in air signs” — Both Moons have already been identified as Aquarius, so shifting to the broader element makes the sign-specific reading less precise.
- **high / vague_word / CORRECT:** “a shared suspicion of anything too normal” — "Normal" leaves the reader to supply what kind of expectation, routine, or relationship structure they actually resist.
- **medium / metaphor_requires_translation / DEFENSIBLE_BUT_NOT_USEFUL:** “two people filing the feeling for later” — The filing image has to be converted back into the ordinary behavior of avoiding a conversation or putting off an emotion.
- **high / personification / DEFENSIBLE_BUT_NOT_USEFUL:** “A feeling two people keep stepping back from can sit unclaimed for months.” — A feeling cannot literally sit unclaimed, and the sentence is less direct than naming the conversation neither person starts.

### rj2-a-04 — serving:authored/compat-pair/jupiter/aquarius/aquarius

- **high / generic_astrology_copy / CORRECT:** “so you both bet on the future and believe in a better world” — This gives Aquarius a broad, familiar idealist description instead of showing what either person actually does together.
- **medium / constructed_sentence / DEFENSIBLE_BUT_NOT_USEFUL:** “You back the idea that's ahead of its time, and so does {{other_name}}.” — The mirrored phrasing sounds written to make the compatibility match neat rather than like ordinary language.
- **high / metaphor_requires_translation / CORRECT:** “Because you dream in the same direction, the vision between you two is enormous” — “Dream in the same direction” and “the vision between you two” make the reader translate an abstract idea before they can picture the relationship.
- **high / metaphor_requires_translation / CORRECT:** “when you're both ten years out nobody's running the errands of the present” — “Ten years out” and “errands of the present” are clever compression that obscures the concrete problem of who handles immediate needs.
- **medium / stock_trope / DEFENSIBLE_BUT_NOT_USEFUL:** “even utopia needs groceries” — The closing relies on a familiar idealism-versus-practicality joke instead of naming a specific consequence for the pair.

### rj2-a-05 — serving:authored/transit-aspect/any/chiron/conjunction

- **high / clinical_shorthand / CORRECT:** “it marks exactly what got managed instead of processed” — “Managed instead of processed” names an internal diagnosis rather than a recognizable thing that happened.
- **high / clinical_shorthand / CORRECT:** “You do owe yourself the debrief: what got touched, when it started, who's safe to tell.” — “The debrief” makes a personal reaction sound procedural and therapeutic instead of lived.
- **high / metaphor_requires_translation / FALSE_POSITIVE:** “Shame doesn't come out in the wash.” — The laundry metaphor has to be translated before the reader can get to the point about telling someone.

### rj2-a-06 — serving:authored/transit-house/chiron/1

- **high / personification / FALSE_POSITIVE:** “This transit is not asking for fake confidence every single day.” — The transit is framed as if it can ask something of the reader.
- **high / invented_motive / CORRECT:** “Over time, you become the person who makes space for others because you know what it feels like to be excluded.” — It assigns a specific future response and motive instead of staying with observable ways sensitivity to visibility may show up.

### rj2-a-07 — serving:fallback-hook/daily-body/conjunction/chiron

- **medium / constructed_sentence / DEFENSIBLE_BUT_NOT_USEFUL:** “The need for care and the fear of being disappointed arrive at the same time” — This names the emotional mechanism in a written, balanced construction instead of staying with what the person does or says.
- **high / analytical_register / DEFENSIBLE_BUT_NOT_USEFUL:** “Replace "I'm fine" with a quick check-in.” — “Quick check-in” sounds like process language rather than the ordinary words someone might actually send.

### rj2-a-08 — serving:house-horoscope-core/sun/leo/house-10

- **medium / textbook_scaffold / FALSE_POSITIVE:** “The Sun in Leo is moving through your 10th house of career and public life” — This leads with placement vocabulary and house definitions before getting to the lived consequences that follow.
- **medium / metaphor_requires_translation / FALSE_POSITIVE:** “putting more light on the work you want to be known for” — “Putting more light on” is decorative when the following examples already say plainly that credit and visibility matter more.
- **medium / abstraction_over_consequence / CORRECT:** “Praise is useful. It cannot be the only measure of progress.” — This states the lesson in general terms instead of naming what changes when praise starts deciding the work.

### rj2-a-09 — serving:sky-article/saturn/aries/2026

- **high / personification / DEFENSIBLE_BUT_NOT_USEFUL:** “the retrograde asks you to re-walk the ground covered since February before building further on it.” — The retrograde is given an assignment-like voice instead of describing the emphasis directly.
- **high / explanatory_not_lived / CORRECT:** “The core theme of this transit is proving you can lead yourself, and finding out which of your commitments survive without an authority figure to report to.” — This states the interpretation at a distance rather than showing the reader what they would recognize happening.
- **high / metaphor_requires_translation / FALSE_POSITIVE:** “the self that acts before the committee inside finishes voting” — The internal committee image has to be decoded back into ordinary behavior.
- **high / constructed_sentence / DEFENSIBLE_BUT_NOT_USEFUL:** “It makes you show your work on independence you used to just claim.” — “Show your work on independence” sounds technically shaped rather than like ordinary spoken English.
- **high / metaphor_requires_translation / FALSE_POSITIVE:** “It turns impatience into a bill you can read.” — The bill image decorates the point but requires the reader to translate it into an actual consequence.
- **high / metaphor_requires_translation / FALSE_POSITIVE:** “courage without follow-through is just noise with good posture.” — “Noise with good posture” is a clever phrase that does not say plainly what the behavior costs.
- **high / constructed_sentence / DEFENSIBLE_BUT_NOT_USEFUL:** “the training plan restarted every Monday, the exit you keep announcing and not taking, the anger that arrives on time while the action runs late.” — The parallel phrasing is polished, but “anger arrives on time while the action runs late” sounds constructed rather than lived.
- **high / metaphor_requires_translation / FALSE_POSITIVE:** “The frustration you are feeling is not a verdict on the goal; it is the gap between deciding and doing, presented as an invoice.” — The invoice metaphor turns a recognizable delay into a phrase the reader has to unpack.
- **high / personification / FALSE_POSITIVE:** “Saturn does not smother that fire; it apprentices it.” — Saturn is made to perform a human role in a way that pulls the sentence away from direct explanation.
- **high / personification / FALSE_POSITIVE:** “The push learns patience, the anger learns aim, and the independence stops needing an audience to be real.” — Push, anger, and independence are given human actions, making the mechanism more literary than direct.
- **high / vague_history / CORRECT:** “That era rewarded the people who stopped waiting to be picked and built their own ventures at the edge of everyone else's attention.” — The historical claim reduces 1996 to 1999 to an ungrounded generalization instead of naming what was changing.
- **high / metaphor_requires_translation / FALSE_POSITIVE:** “The same contract returns: self-reliance is being restructured from a mood into a practice.” — “The same contract returns” and “from a mood into a practice” make the point sound abstract instead of naming a visible change.
- **high / generic_astrology_copy / CORRECT:** “Saturn in Aries pays out to the ones who move small, move now, and keep moving.” — This closes in generalized transit advice and a slogan-like rhythm rather than a concrete consequence.

### rj2-a-10 — serving:fallback-hook/bond-effect-conjunction/chiron

- **medium / invented_motive / CORRECT:** “{{holder1}} may not realize why it bothered you because the insecurity was already there before this happened.” — It assigns an inner insecurity as the cause instead of staying with the observable effect of the reply or joke.

## Before/after pairs

| Pair | Before | After | Delta | Actual correction found |
| --- | --- | --- | --- | --- |
| rj2-pair-01 | 2 | 2 | 0 | yes |
| rj2-pair-02 | 1 | 1 | 0 | yes |
| rj2-pair-03 | 1 | 1 | 0 | yes |
| rj2-pair-04 | 1 | 1 | 0 | yes |
| rj2-pair-05 | 1 | 1 | 0 | yes |
| rj2-pair-06 | 1 | 1 | 0 | yes |
| rj2-pair-07 | 1 | 1 | 0 | yes |
| rj2-pair-08 | 1 | 1 | 0 | yes |
| rj2-pair-09 | 1 | 1 | 0 | yes |
| rj2-pair-10 | 1 | 2 | -1 | yes |
| rj2-pair-11 | 1 | 1 | 0 | yes |
| rj2-pair-12 | 4 | 1 | 3 | yes |
| rj2-pair-13 | 2 | 2 | 0 | yes |
| rj2-pair-14 | 1 | 1 | 0 | yes |
| rj2-pair-15 | 2 | 1 | 1 | yes |

Before > after: 2/15 (13.3%); equal: 12; before < after: 1; average reduction: 0.20.

### Category-level before/after improvement

| Category | Before flags | After flags | Delta | Pairs improved | Equal | Worse | Improvement rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| abstraction_over_consequence | 6 | 5 | 1 | 2 | 12 | 1 | 13.3% |
| ambiguous_referent | 0 | 1 | -1 | 0 | 14 | 1 | 0.0% |
| analytical_register | 1 | 2 | -1 | 0 | 14 | 1 | 0.0% |
| batch_furniture | 0 | 1 | -1 | 0 | 14 | 1 | 0.0% |
| boilerplate_opener | 1 | 0 | 1 | 1 | 14 | 0 | 6.7% |
| clinical_shorthand | 0 | 1 | -1 | 0 | 14 | 1 | 0.0% |
| constructed_sentence | 2 | 2 | 0 | 1 | 13 | 1 | 6.7% |
| explanatory_not_lived | 1 | 2 | -1 | 1 | 12 | 2 | 6.7% |
| invented_motive | 1 | 2 | -1 | 0 | 14 | 1 | 0.0% |
| metaphor_requires_translation | 4 | 0 | 4 | 4 | 11 | 0 | 26.7% |
| natural_language | 1 | 0 | 1 | 1 | 14 | 0 | 6.7% |
| personification | 1 | 1 | 0 | 0 | 15 | 0 | 0.0% |
| register_lurch | 1 | 0 | 1 | 1 | 14 | 0 | 6.7% |
| vague_word | 1 | 0 | 1 | 1 | 14 | 0 | 6.7% |
| vagueness | 1 | 1 | 0 | 1 | 13 | 1 | 6.7% |

Categories with fewer aggregate flags after correction: 6/15 (40.0%).

## Mixed-quality localization

| Page | Flags | Localized | Unrelated good prose | Found defect |
| --- | --- | --- | --- | --- |
| rj2-c-01 | 7 | 1 | 6 | yes |
| rj2-c-02 | 9 | 0 | 9 | no |
| rj2-c-03 | 3 | 0 | 3 | no |
| rj2-c-04 | 6 | 1 | 5 | yes |
| rj2-c-05 | 6 | 1 | 5 | yes |
| rj2-c-06 | 4 | 1 | 3 | yes |
| rj2-c-07 | 7 | 0 | 7 | no |
| rj2-c-08 | 7 | 1 | 6 | yes |

Localization: 5/8 (62.5%). Unrelated flags on otherwise approved prose: 44.

### Mixed-page correction precision (sampled flags only)

| Page | Sampled | Correct | Directional | Defensible/not useful | False positive |
| --- | --- | --- | --- | --- | --- |
| rj2-c-01 | 4 | 1 | 0 | 2 | 1 |
| rj2-c-02 | 4 | 0 | 0 | 3 | 1 |
| rj2-c-03 | 1 | 0 | 0 | 1 | 0 |
| rj2-c-04 | 5 | 1 | 0 | 4 | 0 |
| rj2-c-05 | 3 | 0 | 0 | 2 | 1 |
| rj2-c-06 | 4 | 1 | 0 | 2 | 1 |
| rj2-c-07 | 3 | 0 | 0 | 3 | 0 |
| rj2-c-08 | 3 | 1 | 0 | 2 | 0 |

## Near-miss sensitivity

- Pages: 8
- Flags: 26
- Average: 3.25
- Categories: textbook_scaffold, abstraction_over_consequence, vagueness, vague_word, constructed_sentence, natural_language, sign_house_separation, boilerplate_opener, batch_furniture, invented_motive, unearned_assumption
- Human sample: 7 correct, 2 directionally correct/wrong category, 1 defensible/not useful, 0 false positive.
- The useful near-miss rationales generally identified textbook setup, vague nouns, invented motives, or abstraction without inventing a new defect; low-value flags were retained in the report rather than promoted into rules.

## Category frequency

| Category | Flags |
| --- | --- |
| abstraction_over_consequence | 25 |
| constructed_sentence | 21 |
| metaphor_requires_translation | 21 |
| vagueness | 11 |
| invented_motive | 9 |
| explanatory_not_lived | 8 |
| analytical_register | 8 |
| textbook_scaffold | 8 |
| personification | 8 |
| clinical_shorthand | 5 |
| vague_word | 4 |
| batch_furniture | 4 |
| unearned_assumption | 3 |
| vague_history | 3 |
| sign_house_separation | 3 |
| natural_language | 3 |
| repeated_explanation | 3 |
| generic_astrology_copy | 2 |
| ambiguous_referent | 2 |
| boilerplate_opener | 2 |
| stock_trope | 1 |
| register_lurch | 1 |
| batch_seam | 1 |
| empty_intensifier | 1 |

## Human correction-precision sample

Sample: 100/157 flags. All 43 owner-gold flags plus a deterministic SHA-256-seeded, category-round-robin sample of 20 Group B, 27 Group C, and 10 Group D flags; 100 total. Labels were assigned by a post-run Codex review, never by the reader itself.

| Label | Count |
| --- | --- |
| CORRECT | 39 |
| DIRECTIONALLY_CORRECT_WRONG_CATEGORY | 2 |
| DEFENSIBLE_BUT_NOT_USEFUL | 41 |
| FALSE_POSITIVE | 18 |

### Category precision

| Category | Sampled | Correct | Directional/wrong category | Defensible/not useful | False positive |
| --- | --- | --- | --- | --- | --- |
| metaphor_requires_translation | 13 | 4 | 0 | 2 | 7 |
| constructed_sentence | 11 | 3 | 0 | 8 | 0 |
| abstraction_over_consequence | 8 | 5 | 0 | 3 | 0 |
| explanatory_not_lived | 7 | 3 | 0 | 4 | 0 |
| analytical_register | 7 | 1 | 0 | 6 | 0 |
| personification | 7 | 0 | 0 | 2 | 5 |
| invented_motive | 6 | 3 | 0 | 3 | 0 |
| clinical_shorthand | 5 | 3 | 0 | 2 | 0 |
| vague_word | 4 | 3 | 0 | 1 | 0 |
| unearned_assumption | 3 | 3 | 0 | 0 | 0 |
| textbook_scaffold | 3 | 2 | 0 | 0 | 1 |
| vague_history | 3 | 2 | 0 | 1 | 0 |
| batch_furniture | 3 | 0 | 0 | 1 | 2 |
| natural_language | 3 | 1 | 1 | 1 | 0 |
| vagueness | 3 | 1 | 0 | 2 | 0 |
| sign_house_separation | 2 | 0 | 1 | 0 | 1 |
| generic_astrology_copy | 2 | 2 | 0 | 0 | 0 |
| ambiguous_referent | 2 | 0 | 0 | 2 | 0 |
| boilerplate_opener | 2 | 2 | 0 | 0 | 0 |
| repeated_explanation | 2 | 0 | 0 | 2 | 0 |
| stock_trope | 1 | 0 | 0 | 1 | 0 |
| register_lurch | 1 | 1 | 0 | 0 | 0 |
| batch_seam | 1 | 0 | 0 | 0 | 1 |
| empty_intensifier | 1 | 0 | 0 | 0 | 1 |

### False positives

- `rj2-a-03#6` **sign_house_separation:** “Because both of your Moons are in air signs”
- `rj2-a-05#3` **metaphor_requires_translation:** “Shame doesn't come out in the wash.”
- `rj2-a-06#1` **personification:** “This transit is not asking for fake confidence every single day.”
- `rj2-a-08#1` **textbook_scaffold:** “The Sun in Leo is moving through your 10th house of career and public life”
- `rj2-a-08#2` **metaphor_requires_translation:** “putting more light on the work you want to be known for”
- `rj2-a-09#3` **metaphor_requires_translation:** “the self that acts before the committee inside finishes voting”
- `rj2-a-09#5` **metaphor_requires_translation:** “It turns impatience into a bill you can read.”
- `rj2-a-09#6` **metaphor_requires_translation:** “courage without follow-through is just noise with good posture.”
- `rj2-a-09#8` **metaphor_requires_translation:** “The frustration you are feeling is not a verdict on the goal; it is the gap between deciding and doing, presented as an invoice.”
- `rj2-a-09#9` **personification:** “Saturn does not smother that fire; it apprentices it.”
- `rj2-a-09#10` **personification:** “The push learns patience, the anger learns aim, and the independence stops needing an audience to be real.”
- `rj2-a-09#12` **metaphor_requires_translation:** “The same contract returns: self-reliance is being restructured from a mood into a practice.”
- `rj2-pair-05-after#1` **batch_furniture:** “sun-leo — tension”
- `rj2-pair-08-after#1` **personification:** “keeps looking”
- `rj2-c-01#5` **batch_furniture:** “The Sun last moved through Aries from {{previousResidencyEntryDate}} to {{previousResidencyExitDate}}.”
- `rj2-c-02#7` **batch_seam:** “The Sun last moved through Aries from {{previousResidencyEntryDate}} to {{previousResidencyExitDate}}.”
- `rj2-c-05#5` **empty_intensifier:** “Praise can give real energy.”
- `rj2-c-06#1` **personification:** “The Sun in Virgo finds purpose in this kind of care”

### Directionally correct, wrong category

- `rj2-d-03#1` **natural_language:** “Sun in Libra moves through your 2nd house of disposable income and foundation”
- `rj2-d-04#1` **sign_house_separation:** “your 2nd house of disposable income and foundation”

### Defensible but not useful

- `rj2-a-01#3` **analytical_register:** “Ask what each person agreed to, what support is available, and where a boundary needs to be explicit.”
- `rj2-a-03#5` **constructed_sentence:** “and to think your way through what other people cry their way through”
- `rj2-a-03#8` **metaphor_requires_translation:** “two people filing the feeling for later”
- `rj2-a-03#9` **personification:** “A feeling two people keep stepping back from can sit unclaimed for months.”
- `rj2-a-04#2` **constructed_sentence:** “You back the idea that's ahead of its time, and so does {{other_name}}.”
- `rj2-a-04#5` **stock_trope:** “even utopia needs groceries”
- `rj2-a-07#1` **constructed_sentence:** “The need for care and the fear of being disappointed arrive at the same time”
- `rj2-a-07#2` **analytical_register:** “Replace "I'm fine" with a quick check-in.”
- `rj2-a-09#1` **personification:** “the retrograde asks you to re-walk the ground covered since February before building further on it.”
- `rj2-a-09#4` **constructed_sentence:** “It makes you show your work on independence you used to just claim.”
- `rj2-a-09#7` **constructed_sentence:** “the training plan restarted every Monday, the exit you keep announcing and not taking, the anger that arrives on time while the action runs late.”
- `rj2-pair-01-after#1` **abstraction_over_consequence:** “Independence narrows into self-focus.”
- `rj2-pair-11-after#1` **ambiguous_referent:** “after everything we have done”
- `rj2-pair-04-after#1` **analytical_register:** “The feeling may be real, but it does not tell us what actually happened.”
- `rj2-pair-06-after#1` **clinical_shorthand:** “This pass can expose the same exhausting bargain: life will finally feel manageable once every weak spot has been handled.”
- `rj2-pair-12-after#1` **constructed_sentence:** “Because we never said what we expected in return, the other person starts feeling pressured while we feel unappreciated.”
- `rj2-pair-14-after#1` **explanatory_not_lived:** “Now it may be easier to notice how often we use helpfulness to measure whether we matter.”
- `rj2-pair-13-after#1` **invented_motive:** “care offered to keep someone close”
- `rj2-pair-01-after#2` **analytical_register:** “We spend more time defending the first decision than checking whether it still makes sense.”
- `rj2-pair-02-after#1` **explanatory_not_lived:** “Before {{exitDate}}, momentum can keep us committed to a choice we no longer want because stopping would mean admitting how quickly we made it.”
- `rj2-pair-15-after#1` **invented_motive:** “Accepting help can feel uncomfortable because we no longer control how the care is given.”
- `rj2-c-01#2` **abstraction_over_consequence:** “what was still taking shape becomes something we can act on”
- `rj2-c-02#4` **ambiguous_referent:** “We make a choice that has been waiting for approval.”
- `rj2-c-07#5` **clinical_shorthand:** “care for the body becomes another test to pass”
- `rj2-c-04#4` **constructed_sentence:** “Concern becomes extra caretaking, a need becomes silence, and silence becomes proof that nobody understands.”
- `rj2-c-07#1` **explanatory_not_lived:** “The Sun in Virgo finds purpose in this kind of care, where skill produces a visible result.”
- `rj2-c-04#3` **invented_motive:** “We defend an old arrangement because it once kept someone safe.”
- `rj2-c-05#2` **metaphor_requires_translation:** “Attention can become a running score.”
- `rj2-c-02#5` **natural_language:** “The first impulse sounds honest, so we treat it as complete.”
- `rj2-c-02#8` **repeated_explanation:** “We keep moving because action feels more certain than a pause. We launch an idea because beginning feels alive. We accept a challenge because backing down feels worse.”
- `rj2-c-08#5` **vague_history:** “Whatever came into view then may show where honesty restored strength and where pain hardened into control.”
- `rj2-c-04#6` **vague_word:** “At home or with someone close, we start working around a possible upset while the need underneath remains untouched.”
- `rj2-c-04#1` **vagueness:** “what matters starts to feel personal”
- `rj2-c-08#4` **abstraction_over_consequence:** “The search for truth becomes a test that was never explained.”
- `rj2-c-03#2` **analytical_register:** “The feeling may be real, but it does not tell us what actually happened.”
- `rj2-c-05#1` **explanatory_not_lived:** “This transit builds confidence through clear expression, especially when being seen helps the work reach who it was made for.”
- `rj2-c-06#4` **repeated_explanation:** “Repeated correction makes help less likely.”
- `rj2-c-06#3` **vagueness:** “The result may improve, but energy drops when attention stays fixed on defects.”
- `rj2-c-07#2` **analytical_register:** “Soon the same scrutiny is aimed at the self.”
- `rj2-c-01#3` **constructed_sentence:** “The first impulse sounds honest, so we treat it as complete.”
- `rj2-d-05#2` **batch_furniture:** “the reply can come too fast, the argument can start from one sentence, or a short errand can become the place where impatience finally shows”

### Strongest true positives

- `rj2-a-01#1` **explanatory_not_lived:** “The Last Quarter Moon in Taurus on Wednesday slows that urgency enough to show the practical limit.” — This explains the transit's function instead of naming the moment where someone notices what the choice will cost.
- `rj2-a-01#2` **explanatory_not_lived:** “Venus enters Libra on Thursday, and the Sun trine Saturn makes a fair correction easier to hold.” — “Makes a fair correction easier to hold” is an abstract claim where a recognizable correction would carry the meaning better.
- `rj2-a-01#4` **unearned_assumption:** “Mercury enters Leo on Sunday and brings the unspoken need for recognition into the conversation.” — “The unspoken need” assumes a motive that the page has not made observable.
- `rj2-a-01#5` **abstraction_over_consequence:** “A workable answer should leave room for honesty, contribution, and follow-through.” — The closing names general virtues instead of telling the reader what a workable answer would change for the people involved.
- `rj2-a-03#1` **textbook_scaffold:** “Your Moon is your instinctual emotional world: how you feel, what comforts you, how you care for yourself and others, how you react when you are upset, and what helps you recover after stress.” — This opens with a long definition list instead of getting quickly to a recognizable emotional pattern.
- `rj2-a-03#2` **clinical_shorthand:** “Most of it is unconscious, conditioned behavior.” — This sounds like diagnostic language rather than naming how the pattern shows up in ordinary life.
- `rj2-a-03#3` **unearned_assumption:** “You're the two who get called distant by everyone else and know better.” — It assumes both people have been judged this way and that the judgment is wrong before the page has shown either thing.
- `rj2-a-03#4` **vague_history:** “What happened growing up shaped how each of you learned to use that reflex.” — The sentence points to formative history without saying what either person actually experienced or learned.
- `rj2-a-03#7` **vague_word:** “a shared suspicion of anything too normal” — "Normal" leaves the reader to supply what kind of expectation, routine, or relationship structure they actually resist.
- `rj2-a-04#1` **generic_astrology_copy:** “so you both bet on the future and believe in a better world” — This gives Aquarius a broad, familiar idealist description instead of showing what either person actually does together.
- `rj2-a-04#3` **metaphor_requires_translation:** “Because you dream in the same direction, the vision between you two is enormous” — “Dream in the same direction” and “the vision between you two” make the reader translate an abstract idea before they can picture the relationship.
- `rj2-a-04#4` **metaphor_requires_translation:** “when you're both ten years out nobody's running the errands of the present” — “Ten years out” and “errands of the present” are clever compression that obscures the concrete problem of who handles immediate needs.
- `rj2-a-05#1` **clinical_shorthand:** “it marks exactly what got managed instead of processed” — “Managed instead of processed” names an internal diagnosis rather than a recognizable thing that happened.
- `rj2-a-05#2` **clinical_shorthand:** “You do owe yourself the debrief: what got touched, when it started, who's safe to tell.” — “The debrief” makes a personal reaction sound procedural and therapeutic instead of lived.
- `rj2-a-06#2` **invented_motive:** “Over time, you become the person who makes space for others because you know what it feels like to be excluded.” — It assigns a specific future response and motive instead of staying with observable ways sensitivity to visibility may show up.

## Weakest judge calls

- `rj2-a-09`: Thirteen flags on owner-approved prose, including eight sampled false positives or low-value device objections.
- `rj2-c-02`: Missed the known defect and raised nine unrelated flags on the surrounding approved prose.
- `rj2-c-07`: Missed the known defect and raised seven unrelated flags on the surrounding approved prose.
- `rj2-c-03`: Missed the known defect and raised three unrelated flags on the surrounding approved prose.
- `rj2-pair-10-after`: Raised more flags on the owner-approved AFTER passage than on its rejected BEFORE passage.

## Reading-order ranking

| Rank | Page | Group | Flags | Categories |
| --- | --- | --- | --- | --- |
| 1 | rj2-a-09 | A | 13 | personification, explanatory_not_lived, metaphor_requires_translation, constructed_sentence, vague_history, generic_astrology_copy |
| 2 | rj2-a-03 | A | 9 | textbook_scaffold, clinical_shorthand, unearned_assumption, vague_history, constructed_sentence, sign_house_separation, vague_word, metaphor_requires_translation, personification |
| 3 | rj2-c-02 | C | 9 | constructed_sentence, abstraction_over_consequence, ambiguous_referent, natural_language, batch_seam, repeated_explanation, vagueness |
| 4 | rj2-c-01 | C | 7 | metaphor_requires_translation, abstraction_over_consequence, constructed_sentence, batch_furniture, repeated_explanation |
| 5 | rj2-c-07 | C | 7 | explanatory_not_lived, analytical_register, constructed_sentence, metaphor_requires_translation, clinical_shorthand, abstraction_over_consequence |
| 6 | rj2-c-08 | C | 7 | vagueness, constructed_sentence, abstraction_over_consequence, vague_history |
| 7 | rj2-c-04 | C | 6 | vagueness, abstraction_over_consequence, invented_motive, constructed_sentence, analytical_register, vague_word |
| 8 | rj2-c-05 | C | 6 | explanatory_not_lived, metaphor_requires_translation, constructed_sentence, empty_intensifier |
| 9 | rj2-a-01 | A | 5 | explanatory_not_lived, analytical_register, unearned_assumption, abstraction_over_consequence |
| 10 | rj2-a-04 | A | 5 | generic_astrology_copy, constructed_sentence, metaphor_requires_translation, stock_trope |
| 11 | rj2-c-06 | C | 4 | personification, metaphor_requires_translation, vagueness, repeated_explanation |
| 12 | rj2-d-02 | D | 4 | textbook_scaffold, vagueness, vague_word, constructed_sentence |
| 13 | rj2-d-05 | D | 4 | textbook_scaffold, batch_furniture, invented_motive, abstraction_over_consequence |
| 14 | rj2-d-07 | D | 4 | textbook_scaffold, vagueness, unearned_assumption |
| 15 | rj2-d-08 | D | 4 | textbook_scaffold, batch_furniture, invented_motive, vagueness |
| 16 | rj2-pair-12-before | B | 4 | constructed_sentence, vagueness, metaphor_requires_translation, register_lurch |
| 17 | rj2-a-05 | A | 3 | clinical_shorthand, metaphor_requires_translation |
| 18 | rj2-a-08 | A | 3 | textbook_scaffold, metaphor_requires_translation, abstraction_over_consequence |
| 19 | rj2-c-03 | C | 3 | constructed_sentence, analytical_register, vagueness |
| 20 | rj2-d-03 | D | 3 | natural_language, sign_house_separation, constructed_sentence |
| 21 | rj2-d-06 | D | 3 | textbook_scaffold, invented_motive, constructed_sentence |
| 22 | rj2-a-06 | A | 2 | personification, invented_motive |
| 23 | rj2-a-07 | A | 2 | constructed_sentence, analytical_register |
| 24 | rj2-d-01 | D | 2 | textbook_scaffold, abstraction_over_consequence |
| 25 | rj2-d-04 | D | 2 | sign_house_separation, boilerplate_opener |
| 26 | rj2-pair-01-after | B | 2 | abstraction_over_consequence, analytical_register |
| 27 | rj2-pair-01-before | B | 2 | abstraction_over_consequence, metaphor_requires_translation |
| 28 | rj2-pair-10-after | B | 2 | constructed_sentence, abstraction_over_consequence |
| 29 | rj2-pair-13-after | B | 2 | invented_motive, abstraction_over_consequence |
| 30 | rj2-pair-13-before | B | 2 | invented_motive, vague_word |
| 31 | rj2-pair-15-before | B | 2 | explanatory_not_lived, metaphor_requires_translation |
| 32 | rj2-a-10 | A | 1 | invented_motive |
| 33 | rj2-pair-02-after | B | 1 | explanatory_not_lived |
| 34 | rj2-pair-02-before | B | 1 | constructed_sentence |
| 35 | rj2-pair-03-after | B | 1 | vagueness |
| 36 | rj2-pair-03-before | B | 1 | abstraction_over_consequence |
| 37 | rj2-pair-04-after | B | 1 | analytical_register |
| 38 | rj2-pair-04-before | B | 1 | analytical_register |
| 39 | rj2-pair-05-after | B | 1 | batch_furniture |
| 40 | rj2-pair-05-before | B | 1 | natural_language |
| 41 | rj2-pair-06-after | B | 1 | clinical_shorthand |
| 42 | rj2-pair-06-before | B | 1 | abstraction_over_consequence |
| 43 | rj2-pair-07-after | B | 1 | abstraction_over_consequence |
| 44 | rj2-pair-07-before | B | 1 | abstraction_over_consequence |
| 45 | rj2-pair-08-after | B | 1 | personification |
| 46 | rj2-pair-08-before | B | 1 | personification |
| 47 | rj2-pair-09-after | B | 1 | abstraction_over_consequence |
| 48 | rj2-pair-09-before | B | 1 | abstraction_over_consequence |
| 49 | rj2-pair-10-before | B | 1 | abstraction_over_consequence |
| 50 | rj2-pair-11-after | B | 1 | ambiguous_referent |
| 51 | rj2-pair-11-before | B | 1 | metaphor_requires_translation |
| 52 | rj2-pair-12-after | B | 1 | constructed_sentence |
| 53 | rj2-pair-14-after | B | 1 | explanatory_not_lived |
| 54 | rj2-pair-14-before | B | 1 | boilerplate_opener |
| 55 | rj2-pair-15-after | B | 1 | invented_motive |
| 56 | rj2-a-02 | A | 0 |  |

## Conclusions

Round 2 does not reproduce Round 1's clean separation. The reader found every exact historical BEFORE passage, but it also flagged every AFTER passage and produced 43 flags across ten unseen owner-approved pages. Only one unseen gold page had zero flags. Mixed-page localization was measured alongside substantial unrelated criticism of approved prose. The reader remains useful as a noisy reading-order aid, but its blind false-positive density is too high for any authority beyond advisory triage.

There is evidence of lexical and device overreach: vivid owner-approved metaphor and ordinary astrology personification were repeatedly flagged. Required transit and house framing was sometimes treated as textbook scaffolding. The vocabulary-outside-corpus category appeared once and was not treated as a ban. No psychological history was added to source copy, but invented-motive flags sometimes inferred more certainty than the text warranted.

### POSSIBLE_V2_JUDGE_CHANGES — not implemented

- Reduce lexical and figurative-language overreach on owner-approved vivid prose.
- Teach surface-specific scaffolding so required house/transit framing is not mistaken for textbook prose.
- Separate useful editorial flags from technically defensible but low-value observations.
- Calibrate against unseen approved compatibility and slow-mover prose rather than only the seven Round 1 gold pages.

## Governance confirmation

The reader is advisory forever. Flag count is not a verdict or score. No serving copy, runtime content, source copy, owner verdict, approval state, staging state, promotion state, or governance state changed. No automatic rewrite instruction was produced.
