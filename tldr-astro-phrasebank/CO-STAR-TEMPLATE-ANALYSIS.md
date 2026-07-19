# Co-Star compatibility-by-planet: template analysis

Source: 15 app screenshots (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn cards across three friend
profiles). This is the structural spec our cards follow. Do not drift.

## The madlib skeleton (4 slots)

Every Co-Star card is the same four slots, in order:

**Slot 1 — planet description.** Fixed verbatim text per planet, identical on every pairing. This is the
card's subject declaration. Co-Star's exact lines:

- Sun: "The sun determines your ego, identity, and 'role' in life. It's the core of who you are, and is the sign you're most likely to already know."
- Moon: "The moon rules your emotions, moods, and feelings. This is likely the sign you most think of yourself as, since it reflects your personality when you're alone or deeply comfortable."
- Mercury: "Mercury determines how you communicate, talk, think, and process information. It also indicates how you learn. It is the mind's planet."
- Venus: "Venus determines how and what you love. It indicates how you express affection and the qualities you're attracted to."
- Mars: "Mars is the planet of aggression. It determines how you assert yourself, take action, and the energy that surrounds you, particularly in your sex life, your ambitiousness, and when you're angry."
- Jupiter: "One of the two social planets, Jupiter rules idealism, optimism, and expansion. It's also very philosophical."
- Saturn: "The other social planet, Saturn rules responsibility, restrictions, limits, boundaries, fears, and self-discipline."

**Slot 2 — your sign block.** A reusable planet-in-sign paragraph. Verbatim across pairings: the same
"Your Mercury is in Pisces, meaning your intellect is emotionally-driven, dreamy, and a bit in the
clouds…" text appears unchanged whether the other person is Sagittarius, Libra, or Aquarius. Only the
possessives shift.

**Slot 3 — their sign block.** The same library paragraph for the other sign, pronoun-shifted
("Their Venus is in Scorpio, meaning their romantic side is mysterious, passionate, and seductive…").
Same-sign pairs merge slots 2+3 into one "You both have X in Y, meaning you both…" block with plural
re-conjugation. **Proof the merge is mechanical, not editorially authored**: the Venus Capricorn/Capricorn
card (Jose profile screenshot) ships "You both're extremely cautious and appreciate stability." That
contraction can only be produced by string substitution on the second-person snippet ("You're" → "You
both're") — no human writer ships "both're." This upgrades the same-sign-merge claim from inference to
demonstration: Co-Star's same-sign cards are a find-and-replace on the singular block. (Verification
note: this claim was challenged as fabricated in review and confirmed against the source screenshot; the
fabrication call was the error, logged here so the check isn't re-run.)

**Slot 4 — verdict line.** A short closing keyed to the harmony bucket (same/trine vs square/etc.), NOT
to the specific signs: Jupiter Leo+Leo and Leo+Gemini close with the identical "The ways you grow and
dream are aligned and make intuitive sense to each other." Verdict bank observed:

- Moon (harmonious): "You can instinctively empathize with each other's moods and feelings."
- Mercury (hard): "It's challenging to understand how each other thinks and you frequently argue." / (softer) "You don't really understand how each other thinks – you may have to make some adjustments to how you naturally communicate."
- Venus (good): "Your ways of loving are very compatible." / (hard): "It's challenging to understand the other's approach to love and romantically, you frequently end up feeling unloved or uncared for."
- Mars (good): "Your passion and sexuality are extremely compatible." / (mixed): "Your senses of passion are a bit mismatched, but with a bit of work, can be wonderful!"
- Jupiter (good): "The ways you grow and dream are aligned and make intuitive sense to each other."
- Saturn (same sign): "Your struggles are similar, and you likely can help each other work through them." / (different): "Your struggles are fairly different, but with empathy, you can help each other grow."
- Sun: no one-liner; the Sun card instead gets a full bespoke synthesis paragraph ("This can be a difficult pairing. They like to do things by the book, while you are a natural trailblazer…"). Sun is the only card where the comparison itself is written out.

The verdict vocabulary is planet-locked: grow/dream (Jupiter), struggles (Saturn), moods (Moon),
passion/sexuality (Mars), ways of loving (Venus), how each other thinks (Mercury), pairing/role (Sun).
That's what keeps a madlib from reading generic — every sentence names the planet's subject.

## Lived experiences Co-Star embeds in the sign blocks

The sign blocks aren't pure adjectives; each carries at least one observable, planet-subject behavior:

- Mercury Pisces: "you may have a tendency for white lies. You prefer face-to-face communication."
- Mercury Sagittarius: "they have a critical opinion of most things… fairly sarcastic and make other people feel uncertain."
- Mercury Libra: "searching for balance in every set of ideas, though this may come off as insincere or indecisive."
- Sun Aquarius: "You carry a lot on your shoulders and have a need to fight for the underdog."
- Sun Capricorn: "a tendency for workaholism and success… Emotionally reserved, they need to learn to express their inner world and have fun."
- Sun Virgo: "get bogged down by the details of their day-to-day. They have a need to be wholesome."
- Venus Capricorn: "Sometimes it seems like you don't care about love."
- Venus Scorpio: "may sometimes mutate into suspicion, jealousy, and cruelty."
- Venus Libra: "willing to make compromises to get there… may have trouble being realistic or loyal."
- Moon Cancer: "a tendency to feel like a martyr, and secretly fear being abandoned… trouble letting things go and feel like an emotional wreck."
- Moon Scorpio: "trouble opening up and letting other people in… keep your intense darker emotions private."
- Mars Capricorn: "their rationality sometimes seems soulless."
- Mars Libra: "it may take them a while to make a decision… though sometimes passive aggressive."
- Saturn Virgo: "perfectionism, a critical eye, workaholic tendencies, and your need to be pure."
- Saturn Leo: "arrogance, egocentrism, a need for validation, and bossiness."

Pattern: trait + a felt consequence in the planet's own domain. Never a scene from another planet's
domain (no Mercury thinking-examples on a Sun card, no Venus love-examples on a Saturn card).

## The five rules (locked)

1. The planet has a description (slot 1, fixed).
2. The planet determines the subject. Every sentence on the card is about that subject.
3. The sign determines how each person approaches that subject.
4. The relationship context only changes where the scene occurs (friend, partner, ex) — never the subject.
5. Planet-swap test: if a sentence works unchanged on another planet's card, it is too generic. Delete or rewrite it. ("You understand each other" fails; "you keep your darker moods private" passes only on Moon.)

## Tone, language, and grammar

**Tone.** Clinical and declarative. Flat indicative statements delivered deadpan, including the
unflattering ones: "their rationality sometimes seems soulless," "you frequently argue," "you frequently
end up feeling unloved or uncared for," "They can be a little self-obsessed." The insult is never
softened or apologized for; the card just moves on. **Flaw density scales by planet**: Saturn blocks are
all flaw ("perfectionism, a critical eye, workaholic tendencies"), the personal planets (Sun, Moon,
Mercury, Venus, Mars) get the trait triad with one softened blade, and Jupiter blocks are positive-only
("magnanimity, inspiring confidence, thinking big" — no flaw anywhere in a Jupiter block). Match the
planet's flaw budget, not a flat rule. Warmth is rationed: exactly one exclamation point in 15 cards ("with
a bit of work, can be wonderful!"). The reader is always "you"; the other person is always "they/their"
in body text, named only in the header.

**Sentence machinery.** Three constructions carry almost every card:

- The copular definition: "X determines / rules / is the planet of Y" (slot 1 always opens this way).
- The "meaning" hinge: "Your X is in Y, meaning…" — the universal connector between placement and description, used on every single card.
- The trait triad/quad: "intense, passionate, and a bit dramatic"; "responsible, serious, efficient, and rational"; "sensitive, thoughtful, and empathetic"; "perfectionism, a critical eye, workaholic tendencies, and your need to be pure." Adjective or noun lists of 3–4, then one behavioral sentence.

Recurring idioms: "have a tendency for X" (nonstandard but consistent), "have a need to be X" ("pure,"
"wholesome"), "have trouble X-ing," "struggle with X," "find it difficult to X." Hedges are constant and
small: "a bit," "somewhat," "sometimes," "may," "fairly," "tend to." Contractions throughout.

**Grammar looseness (evidence it's template-merged, and part of the voice).** "You both're extremely
cautious" (mechanical pronoun merge), "Your imagination and intuition keeps you open" (agreement),
"romantically, you frequently end up feeling unloved" (dangling adverb). Co-Star ships these; the copy is
confident enough that readers don't notice. We match the confidence, not the errors. Note Co-Star uses
em dashes ("surrounds you—particularly in your sex life"); we do not — restructure instead.

**Sign-keyed vocabulary.** Each sign has its own register that repeats across planets — the sign, not the
planet, picks the word palette:

- Aries: "head-on," "trailblazer," bold/first vocabulary.
- Taurus: build/stability/pleasure vocabulary.
- Cancer: attachment words — "martyr," "secretly fear being abandoned," "emotional wreck," "sensitive."
- Leo: grandeur words — "magnanimity," "inspiring confidence," "thinking big"; flaw side "arrogance, egocentrism, a need for validation, bossiness."
- Virgo: purity/precision — "meticulous," "thorough," "wholesome," "pure," "bogged down by the details," "self-sacrificing."
- Libra: balance/appeasement — "charming and diplomatic relativist," "equitable," "compromises," "eager-to-please"; flaw side "insincere or indecisive," "passive aggressive."
- Scorpio: the gothic register, the most dramatic language in the app — "intense darker emotions," "mysterious, passionate, and seductive," "mad and boundless love," "suspicion, jealousy, and cruelty," "tumultuous."
- Sagittarius: freedom words — "expansive, boundary-pushing, independent," "big picture," "sarcastic."
- Capricorn: duty words — "responsible, serious, efficient, rational," "workaholism," "repressed in the name of responsibility," "cautious."
- Aquarius: outsider-intellect words — "unconventional," "eccentric," "anti," "abstraction," "super meta," "fight for the underdog," "rebellious streak."
- Pisces: soft/water words — "dreamy," "a bit in the clouds," "emotionally-driven," "white lies," "empathetic."

So a card's language = sign palette (word choice) × planet subject (what the words are about). Scorpio
Venus gets "seductive/jealousy"; Scorpio Moon gets "darker emotions kept private" — same palette, aimed
at the planet's subject. That crossing is the whole trick, and it's why the copy never feels
planet-swappable even when the skeleton is a madlib.

## Part 2: Linguistic analysis of the source copy (Marie)

**2.1 "Determines" — the grammar of mechanism.** Not "represents," "is associated with," or
"symbolizes." Determines. The planet definitions borrow causal-machinery vocabulary from science
writing, framing astrology as mechanism rather than metaphor before any interpretation begins. The
definitions also function as a curriculum: users learn the vocabulary card by card and become fluent
enough to discuss placements socially. The app teaches its users to be its marketers.

**2.2 "Meaning" — the universal connective.** Every interpretation attaches with "meaning" — not "which
suggests" or "can indicate." The connective presents interpretation as translation, as if the placement
were a foreign phrase being rendered in English. No epistemic gap between data and claim. Combined with
"determines," the grammar contains zero structural hedging; the only softeners live inside trait lists.

**2.3 The gossip structure.** The card diagnoses two people but only one is reading. The reader receives
an authoritative psychological profile of their friend: "Their rationality sometimes seems soulless."
"They tend to be fairly sarcastic and make other people feel uncertain." "They have a tendency to feel
like a martyr, and secretly fear being abandoned." This is licensed gossip — the astrology absorbs the
moral liability. "Secretly" is especially potent: it hands the reader privileged access to the friend's
hidden interior. Judgment of another person registers as revelation; judgment of yourself registers as
being seen.

**2.4 Trait triads with one softened blade.** "Intense, passionate, and a bit dramatic." "Fairly
sarcastic." "A little self-obsessed." The harshest item in the list carries a minimizer (a bit, somewhat,
fairly, a little, sometimes). The softener is the delivery mechanism: "dramatic" would be rejected; "a
bit dramatic" is admitted, and once admitted, the reader owns the whole word. Softeners never touch the
positive traits — nobody is "somewhat passionate." Minimize the insult, state the compliment plainly.

**2.5 Escalation buried mid-paragraph.** "…a mad and boundless love, though they may sometimes mutate
into suspicion, jealousy, and cruelty." Extreme words are permitted only when (a) syntactically
subordinated, (b) hedged by may/sometimes, and (c) in a list, gaining plausibility from milder
neighbors. Dark content in flat affect. The deadpan is the voice.

**2.6 The verdict line — a score rendered as a sentence.** Short, absolute, second-person-plural,
present tense, no hedge. A number wearing a sentence's clothing; it's also the screenshot unit. Grading
adverbs ("extremely," "very," "a bit mismatched") imply a scale the app never shows. The exclamation
point appears exactly once — on a redemption verdict ("with a bit of work, can be wonderful!").
Enthusiasm markers are reserved for hard aspects reframed as workable; easy aspects get flat confidence.

**2.7 "Frequently" — manufactured history.** "You frequently argue." Frequency adverbs assert a shared
past the app cannot know. Established pairs retrieve confirming instances; new pairs read it as
prophecy. The same word does retrodiction or prediction depending on what the reader brings.

## Part 3: The copy formula (card template)

Paragraph 1 — Definition. The planet's jurisdiction in 1–2 sentences. Verb: determines/rules. Written
once, reused forever. Ends with a colloquial anchor where possible ("It is the mind's planet").

Paragraph 2 — The two snippets. "Your [planet] is in [sign], meaning [closed unit, 2–4 sentences, trait
triad with one softened blade]. Their [planet] is in [sign], meaning [same structure, third person]."
Same-sign pairs merge to plural with "You both."

Paragraph 3 — Verdict. One or two sentences, computed from the sign angle, phrased in the planet's
domain vocabulary. Hard aspects: name the specific friction behavior + optional redemption clause. Soft
aspects: flat absolute affinity. Exclamation point only on redemption.

**Writing checklist per card**

- Sign snippets are closed units, reusable against any partner sign (Marie deviation: ours are bespoke per pair, but each snippet must still stand alone)
- Trait triad present; softener on the harshest trait only
- Dark content subordinated, hedged, and listed — never headline position
- Third-person snippet grants the reader privileged knowledge ("secretly," "seems," "tend to," "would rather")
- Verdict is short, absolute, plural, in-domain, and screenshots cleanly
- Friction verdicts name a behavior; harmony verdicts stay atmospheric
- "Meaning" as connective; "determines/rules" in definitions; no structural hedging

## Where Marie improves on Co-Star (without drifting)

Keep the four-slot skeleton and the planet-locked vocabulary. Upgrade slot 2/3 from trait-lists to lived
moments in the planet's subject (Marie voice, direct to the reader), and replace the canned verdict with
the specific collision scene — but the collision must still be in the planet's domain and pass the
planet-swap test.
