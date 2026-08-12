# Friend natal voice ruling (owner ruling, canonical, verbatim)

**Status: owner ruling, 2026-08-10. Governs the friend natal chart surface: the reader views a friend's chart; the friend is not the reader and not present. This document is both the register definition and the execution prompt for the friend-voice build/audit pass. Companion to the lived-prose standard and its amendments, the natal delineation standard, and the global style rules; where they overlap, this document sharpens for the friend surface. Origin: owner-authored following the friend-natal pronoun audit of 2026-08-10 (audit record: packages/astro-knowledge/review/friend-natal-pronoun-audit-2026-08-10.md).**

Owner text verbatim below.

---

TASK: Build and audit FRIEND NATAL voice for natal-chart surfaces.
The reader is looking at someone else's natal chart.
The friend is NOT the reader.
The friend is NOT present.
The copy describes the friend to the reader.
This is not a pronoun-conversion task.
Friend natal voice is a separately governed editorial surface derived from the same astrology. Do not overwrite canonical self-voice natal copy unless the owner explicitly instructs you to do so.
══════════════════════════════════════
1. FRIEND-VOICE REGISTER
══════════════════════════════════════
Write as if you were describing someone the reader cares about to another person who has not met them yet.
The tone is:
- observational
- specific
- warm without flattering
- direct
- emotionally intelligent
- recognizable in ordinary life
- generous about an absent third person
- honest about complications without diagnosing, correcting, or judging them
The reader should finish the passage thinking:
"Yes, that sounds like them."
They should NOT feel:
"Here is what I am supposed to do about them."
or:
"Here is what this person needs to fix."
Friend copy is a portrait, not a management manual.
══════════════════════════════════════
2. HARD FRIEND-VOICE RULE
══════════════════════════════════════
Friend natal copy describes the friend.
It does not instruct the friend.
It does not instruct the reader how to handle the friend.
BAD:
Give yourself more time before making the decision.
BAD:
They should give themselves more time before making the decision.
BAD:
They need to slow down before reacting.
BAD:
They would benefit from thinking it through first.
BAD:
It is important for them to give themselves space.
BAD:
The lesson is learning to be patient.
BAD:
Give them space when they get overwhelmed.
BAD:
You may need to be patient with them.
GOOD:
They often make better decisions once the first rush of emotion has passed.
GOOD:
When they are overwhelmed, they may get quieter before they are ready to explain what is wrong.
GOOD:
They usually need some time to sort out what they think before they can say it clearly.
Advice must become observation.
Do not launder instructions into:
- they should
- they need to
- they have to
- they must
- they would benefit from
- it is important for them to
- the lesson is
- the goal is
- the work is
- their best ideas deserve...
- what they need to learn is...
Instead describe:
- what they tend to do
- what happens next
- what conditions tend to help
- what tends to make the pattern easier or harder
- how the behavior appears in ordinary life
══════════════════════════════════════
3. PRONOUN AND REFERENT CONTRACT
══════════════════════════════════════
Friend-facing user copy must remain consistently third person.
Allowed:
- they
- them
- their
- the existing friend-name placeholder, when the product schema calls for it
Do not introduce:
- you
- your
- yourself
A single second-person pronoun leaking into composed friend output is a failure.
Do NOT mechanically replace every "you" with "they."
Rewrite sentences so they sound naturally authored in third person.
Additional QA requirement:
Every they / them / their must unambiguously refer to the friend.
BAD:
Their best ideas deserve a second day before they drop them.
This creates referent ambiguity.
BETTER:
They may reject an idea while they are irritated, then wish they had kept it once they have cooled off.
If another person appears in the sentence, make the referents unmistakable.
══════════════════════════════════════
4. VOCABULARY SLOTS ARE IN SCOPE
══════════════════════════════════════
The friend-voice bug exists at more than one layer.
The audit has identified three possible failure points:
1. the friend / they-frame itself
2. second-person vocabularyRows inserted into that frame
3. the composed output produced when frame + vocabulary slots are assembled
Therefore:
vocabularyRows referenced by in-scope friend natal frames are ALSO in scope.
Any referenced vocabularyRow that currently contains self-voice or second-person wording must receive a separately governed FRIEND / THEY variant under the same editorial rules.
Do not mutate a canonical self-voice vocabulary slot merely because friend rendering also uses it.
Preserve both variants when both surfaces need to exist.
QA MUST run on composed output, not individual database fields in isolation.
Render:
FRAME
+
ALL REFERENCED VOCABULARY SLOTS
+
PLACEHOLDERS
and judge the finished sentence / paragraph exactly as the user will see it.
Composition-level failures are hard stops.
Examples include:
- "needing the spotlight to feel like you matter"
- duplicated words created across slot boundaries
- "feel things... by feel"
- repeated nouns or verbs after assembly
- pronoun collisions
- tense disagreement
- article disagreement
- punctuation collisions
- sentence fragments
- semantically duplicated clauses
- a frame and slot that are each clean alone but awkward together
A field-level QA pass is not sufficient.
══════════════════════════════════════
5. EXPLICIT IN-SCOPE KEY FAMILIES
══════════════════════════════════════
The friend natal pass applies to natal-chart user-facing families including:
- angle-sign
- placement-sentence
- element-pattern
- natal house hooks
- natal sign hooks
- natal planet × sign hooks / frames
- natal planet × house hooks / frames
- friend-natal vocabularyRows referenced by any of the above
- any directly dependent friend-natal composition frame required to render those families correctly
Use the repository's exact canonical family identifiers where they differ from these descriptive names.
Before editing, enumerate the exact resolved keys / families you intend to touch.
Do NOT silently widen the pass into:
- daily astrology
- transits
- sky placements
- collective astrology
- calendar copy
- synastry
- comparison cards
- forecast surfaces
- any other family whose person contract may intentionally remain reader-addressed
If a family's person contract is ambiguous:
FLAG IT.
DO NOT REWRITE IT.
Report:
AMBIGUOUS PERSON CONTRACT — OWNER RULING REQUIRED
The agent does not decide that a reader-addressed surface should become friend-addressed merely because it appears near friend natal content.
══════════════════════════════════════
6. DIRECTNESS RULE
══════════════════════════════════════
The reader should never have to translate the writing.
Prefer:
behavior
→ circumstance
→ consequence
→ useful observation
Say what actually happens.
Avoid sentences written primarily to sound clever.
Flag language such as:
- the fire is not the problem
- give it a target
- moving faster than the facts
- the shelf is empty
- the door opens
- emotional weather
- finding their footing
- holding the key
- changing lanes
- the signal gets louder
- carrying the weight
- following the thread
- turning up the volume
Also scrutinize metaphor families such as:
- fire
- fuel
- engines
- wiring
- electricity
- current
- tide
- weather
- horizon
- map
- route
- road
- doors
- windows
- rooms
- stage
- spotlight
- gravity
- steering wheel
- architecture
- scaffolding
A metaphor may remain only when it makes the meaning MORE immediate than literal language.
If literal language is clearer, write the literal sentence.
The reader should never have to mentally translate the prose back into behavior.
══════════════════════════════════════
7. LIVED-EXPERIENCE RULE
══════════════════════════════════════
Do not turn traits into lists.
BAD:
They are confident, independent, spontaneous, and impatient.
BETTER:
They are often the person who makes the call, starts the project, or says what everyone else is still thinking about saying. Waiting can frustrate them, especially once they have decided what they want.
Whenever astrology supports it, ground the passage in ordinary life:
- conversations
- texts
- meetings
- work
- money
- plans
- deadlines
- spending
- home
- routines
- friendships
- family
- dating
- body cues
- decisions
- conflict
- recognition
- responsibility
- privacy
- time
- social situations
Do not invent a concrete example that changes or exceeds the astrology already supported by the row.
══════════════════════════════════════
8. REPEATING-SKELETON RULE
══════════════════════════════════════
Structurally repetitive writing is a REWRITE trigger even when an individual row is grammatically clean.
Known example:
"meaning they [adverb, adverb, adverb], and what they want most is [noun]"
Treat this skeleton as formulaic.
Do not preserve it merely because the sign-specific vocabulary differs.
Also flag other repeating syntax discovered across the batch, including repeated constructions such as:
- "They are someone who..."
- "At their best..."
- "Pushed too far..."
- "This can make them..."
- "What they want most is..."
- "They tend to X, Y, and Z..."
- "The lesson is..."
- "The challenge is..."
- identical sentence order repeated across planet × sign rows
The triage unit is not only the individual sentence.
Audit the whole family for repeated rhetorical architecture.
If multiple rows read like a template with swapped nouns and adjectives, classify the skeleton itself as REWRITE.
Do not replace one universal skeleton with another universal skeleton.
Variation must come from the actual astrological mechanism and lived behavior.
══════════════════════════════════════
9. ASTROLOGY FIDELITY
══════════════════════════════════════
This is a voice transformation, not a reinterpretation.
Preserve:
- underlying astrological mechanism
- positive expression
- difficult expression
- distinctions between planets, signs, houses, aspects, Nodes, phases, angles, etc.
- meaningful causal logic
- source-supported claims
Do not:
- add new astrology
- remove a difficult implication merely to make the portrait warmer
- exaggerate certainty
- diagnose pathology
- convert a tendency into destiny
- introduce relationship claims the natal placement does not support
Use tentative language when earned:
- can
- may
- often
- tends to
- is more likely to
Do not make every sentence tentative merely because it is astrology.
══════════════════════════════════════
10. FRIEND-WARMTH RULE
══════════════════════════════════════
Warmth should come from understanding the person accurately, not praising them.
BAD:
They are an amazing and deeply gifted person.
BAD:
Everyone loves their wonderful energy.
GOOD:
They usually notice when someone has been left out and are often the person who makes room for them.
GOOD:
They care about doing the job properly, which is useful until they start taking responsibility for work that was never theirs.
GOOD:
They may argue quickly when they feel dismissed, then realize later that the point they were trying to make got buried inside the reaction.
Do not flatten difficult traits into compliments.
Do not make the friend sound defective.
Describe them like a person you understand.
══════════════════════════════════════
11. SHOW CAUSE AND CONSEQUENCE
══════════════════════════════════════
Prefer explicit behavioral logic.
GOOD:
They may agree too quickly because they want the conversation resolved, then resent the agreement once they have had time to think about it.
GOOD:
They can spend a long time preparing because being caught unprepared bothers them more than the extra work does.
GOOD:
When they feel overlooked, they may try harder to prove themselves instead of saying directly that they wanted recognition.
Avoid:
- this creates tension
- this can be challenging
- this affects relationships
- this brings lessons
- this creates growth
unless the sentence immediately explains what actually happens.
══════════════════════════════════════
12. NO READER-MANAGEMENT COPY
══════════════════════════════════════
Do not write:
- Give them space.
- Be patient with them.
- Do not take it personally.
- Let them come to you.
- Make sure they know...
- Remember that...
- Try not to...
- You can help by...
- The best way to deal with them is...
- They respond best when you...
This surface describes who the friend is.
It does not tell the reader how to operate them.
If an interpersonal consequence is astrologically relevant, describe it observationally.
BAD:
Give them time to cool off before talking.
GOOD:
They are usually easier to talk with once the first rush of anger has passed.
BAD:
Do not pressure them to open up.
GOOD:
Pressure tends to make them more private rather than more forthcoming.
══════════════════════════════════════
13. GLOBAL TLDR ASTRO STYLE RULES
══════════════════════════════════════
Also enforce the existing owner rules:
- no em dashes
- no "whether"
- no vague "things"
- avoid "alignment"
- avoid "activation"
- avoid "performance" unless literal or specifically Leo-related
- avoid "on paper"
- avoid "shared trust"
- avoid "keep shrinking"
- avoid "real" as a generic intensifier
- avoid "asks" as astrology shorthand
- avoid therapist language
- avoid textbook astrology language
- avoid source-facing language
- never write "the source says..."
- no keyword stacks
- no clever line requiring decoding
- no generic permission-line endings
- avoid canned "at their best / at their worst" framing
- no moralizing
- no judge / grade language
The prose should sound like natural speech about a person.
══════════════════════════════════════
14. WORKED EXAMPLE: IMPERATIVE → OBSERVATION
══════════════════════════════════════
SELF VOICE:
The wit is real and so is the temper, so give your best ideas a second day before dropping them.
BAD MECHANICAL FRIEND VOICE:
The wit is real and so is the temper, so their best ideas deserve a second day before getting dropped.
GOOD FRIEND VOICE:
Their wit is quick and so is their temper. The idea they drop in irritation today is often the one they wish they had kept once they have cooled off.
Why the good version works:
- nobody is instructed
- no disguised advice
- no "is real" filler
- no phrase needs decoding
- referents are clear
- the friend remains a person being observed
- the consequence is recognizable
Do not copy this syntax across the dataset.
It demonstrates the register, not a reusable template.
══════════════════════════════════════
15. WORKED EXAMPLE: PRONOUN LEAK
══════════════════════════════════════
BROKEN FRIEND COPY:
Pushed too far, this side of them can tip into ego inflation, or needing the spotlight to feel like you matter. At their best, they bring confidence and warmth, and people see them for who they really are.
Problems:
1. "you matter" is a second-person vocabulary-slot leak.
2. "for who they really are" is soft filler.
3. "at their best" is a reusable skeleton that should not automatically survive triage.
BETTER:
Pushed too far, this side of them can turn into needing attention to feel important. When they feel confident without needing everyone to notice, they tend to be warm, expressive, and easy to be around.
Again: do not template this sentence structure across all rows.
══════════════════════════════════════
16. TRIAGE
══════════════════════════════════════
Classify every in-scope frame, hook, and vocabulary slot:
AS IS
Already:
- natural friend voice
- fully third person
- observational
- direct
- source-faithful
- free of hidden advice
- free of translation-required language
- free of family-level formula repetition
LIGHT EDIT
Underlying passage works but contains:
- pronoun leak
- filler
- isolated second-person vocabulary
- one disguised imperative
- one abstract or indirect sentence
- a small composition bug
- grammar problem
- referent ambiguity
REWRITE
Use REWRITE when the passage:
- speaks to "you"
- contains an imperative
- contains disguised advice
- tells the reader how to manage the friend
- reads like a textbook
- relies on metaphor or clever phrasing
- uses trait stacks instead of behavior
- sounds diagnostic
- becomes unnatural when mechanically converted
- loses the person behind the astrology
- contains the known repeating skeleton:
  "meaning they [adverb, adverb, adverb], and what they want most is [noun]"
- uses any other rhetorical skeleton repeated systematically across the family
- is individually grammatical but batch-level formulaic
- produces awkward or incorrect language only after frame + vocabulary slot composition
AMBIGUOUS PERSON CONTRACT
Use this status instead of editing when the family may intentionally remain reader-addressed.
Stop and request owner ruling.
══════════════════════════════════════
17. QUALITY TEST FOR EVERY COMPOSED ROW
══════════════════════════════════════
After rendering the complete friend output, ask:
1. Could this naturally be said about an absent friend?
2. Is every pronoun pointing at the correct person?
3. Does every they / them / their unambiguously refer to the friend?
4. Is anyone being instructed?
5. Is advice being disguised as "they should / need to / have to / would benefit from"?
6. Does the copy tell the reader how to manage the friend?
7. Does the reader have to translate a metaphor or clever phrase?
8. Can I picture the behavior in ordinary life?
9. Is cause and consequence clear?
10. Did the astrology remain the same?
11. Did I add an unsupported claim?
12. Is the warmth coming from understanding rather than praise?
13. Does the passage sound individually authored rather than generated from a repeating skeleton?
14. Does the frame read naturally after EVERY referenced vocabulary slot is rendered?
15. Are there any duplicates, awkward repetitions, pronoun collisions, or grammar errors created only during composition?
16. Would a reader recognize their friend here rather than recognize an astrology template?
If any answer fails, revise again.
══════════════════════════════════════
18. IMPLEMENTATION SAFETY
══════════════════════════════════════
- Preserve canonical self-voice natal copy.
- Create / use a separately governed friend-voice field or structure.
- Do not mutate canonical self vocabularyRows merely to serve friend voice.
- Create governed friend variants for referenced vocabularyRows where required.
- Preserve row keys exactly.
- Preserve PageRef and source references exactly.
- Preserve category / planet / sign / house / angle metadata exactly.
- Preserve template placeholders exactly.
- Do not insert personal names into canonical text.
- Do not alter calculation logic.
- Do not alter source-fidelity decisions.
- Do not broaden the pass into ambiguous person-contract families.
- Preserve historically owner-approved wording unless the owner has explicitly authorized a friend-voice derivative from it.
The deterministic friend-pronoun gate must be extended to every new friend-voice field and every composed friend-natal output.
The deterministic gate should fail build/test when:
- you / your / yourself appears in final friend output
- an ungoverned self-voice vocabulary slot is used by a friend frame
- a required friend vocabulary variant is missing
- composed output produces invalid pronoun grammar
- a they/them referent becomes ambiguous according to the existing grammar checks
- friend output falls back silently to self-voice copy where a governed friend variant is required
Do not rely only on editorial review to prevent regression.
══════════════════════════════════════
19. OUTPUT / REVIEW WALL
══════════════════════════════════════
For each edited item, report:
- family
- key
- field / slot
- original self copy
- proposed friend copy
- triage class
- reason for change
- composition dependencies
- rendered composed sample
- QA result
Also provide:
- all in-scope key families discovered
- all AMBIGUOUS PERSON CONTRACT families
- vocabularyRows requiring friend variants
- composition failures discovered
- repeating skeletons discovered
- deterministic gate changes required
Do NOT mark new friend copy owner-approved.
Final state:
READY FOR OWNER REVIEW
Before saying the task is complete, run:
1. field-level friend-pronoun audit
2. vocabulary-slot pronoun audit
3. fully composed frame + slot audit
4. referent-ambiguity audit
5. disguised-advice audit
6. reader-management audit
7. translation-required / clever-language audit
8. repeating-skeleton audit across each family
9. source-facing-language audit
10. banned-vocabulary audit
11. grammar and duplicate-word audit
12. key / metadata / PageRef drift audit
13. self-copy byte-drift audit
14. deterministic friend-pronoun-gate tests
Then show the owner a representative random sample of the rendered friend output before any approval state changes.
