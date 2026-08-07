# Batch 2+ blocker sign-off sheet: four word fixes, two new planetary sources

Clears the six dependency blockers from the batch audit. One decision per section; approving a section
approves the exact text shown. All changes are source-data fixes; nothing here approves reader copy.

## Section A: four banned-token fixes in source rows

| Unit | Current | Proposed |
|---|---|---|
| mercury-scorpio (data/planetary/mercury.json, Scorpio body) | "You uncover truths and delve into deep topics" | "You uncover truths and dig into deep topics" |
| mars-taurus (data/planetary/mars.json, Taurus body) | "Patience and a love for the sensual pleasures of life mark your journey." | "Patience and a love for life's sensual pleasures shape how you get there." |
| mercury-taurus (placement row body) | "ideas have time to settle into something useful and real" | WAIVE: this is the idiomatic settle-into sense the settle rule explicitly allows. If preferred, replace with "ideas have time to become something useful and real." |
| pluto-aquarius (cycle note, locator per Codex's audit) | contains "engine" | Codex restructures to remove the motor metaphor entirely (no engine, motor, or fuel substitutes) and shows the before/after for approval before marking fixed. |

Decision A: apply the two replacements, record the settle waiver (or the alternate), and have Codex
propose the engine rewrite for approval. APPROVED. (Owner, chat, 2026-08-04: "A - proceed.")
Pluto-Aquarius rewrite APPROVED as proposed by Codex, 2026-08-04 (owner, chat: "approve"): "Pluto has an
elliptical orbit, so its time in each sign varies widely. The calculated range for the current sign takes
precedence over the average residency." Codex may mark the unit fixed on applying it.

## Section B: new planetary source - Chiron

New file `data/planetary/chiron.json`, status DRAFT pending owner review, shaped like the existing
planetary files. Composes with data/modifiers/chiron-life-cycle.json and point-metadata.json#chiron;
consistent with the approved retrograde line ("review of old wounds, repair, and the survival
responses built around them"). It does not call Chiron a planet.

- overview: "Chiron describes the wound that teaches: the tender place where an early, unearned hurt
  shaped a survival response, and where healing turns private pain into the ability to help others
  carry theirs. In the myth Chiron is the wounded healer, the mentor whose own injury never fully
  closes, and the talent often grows from the same place as the wound. A slow-moving body orbiting
  between Saturn and Uranus, it works the bridge between what structure can hold and what has to
  change. Chiron does not promise that the wound disappears; it shows how to carry it differently."
- cycle: "Chiron takes about fifty years to move through all twelve signs, spending roughly four to
  nine years in each because its orbit is elliptical. Its yearly retrograde is a regular pause for
  repair, and its return near age fifty marks a life-defining review of the wound and what it
  taught."
- signs (all twelve):
  - aries: "With Chiron in Aries, the wound sits in the sense of self: wanting things, going first,
    and existing without apology. Healing works through acting anyway and learning that the
    discomfort can be survived."
  - taurus: "With Chiron in Taurus, the wound sits in security and worth: having enough, deserving
    comfort, and trusting that safety does not have to be earned through endless proof."
  - gemini: "With Chiron in Gemini, the wound sits in the voice: being heard, being believed, and
    trusting that the words are enough without overexplaining."
  - cancer: "With Chiron in Cancer, the wound sits in belonging: being cared for without earning
    it, and learning that needing comfort is not a debt."
  - leo: "With Chiron in Leo, the wound sits in creative worth: being seen without performing for
    it, and trusting the work matters before anyone applauds."
  - virgo: "With Chiron in Virgo, the wound sits in adequacy: being useful enough, correct enough,
    and learning that imperfection is not failure."
  - libra: "With Chiron in Libra, the wound sits in acceptance: being chosen, being fair, and
    learning that a real self costs some approval."
  - scorpio: "With Chiron in Scorpio, the wound sits in trust: betrayal, power, and learning that
    control cannot substitute for intimacy."
  - sagittarius: "With Chiron in Sagittarius, the wound sits in meaning: lost faith, broken
    certainties, and learning to believe again without borrowing someone else's answer."
  - capricorn: "With Chiron in Capricorn, the wound sits in recognition: achievement as the price
    of love, and learning that worth is not a title."
  - aquarius: "With Chiron in Aquarius, the wound sits in belonging to the group: being the
    outsider, and learning that difference can connect instead of exile."
  - pisces: "With Chiron in Pisces, the wound sits in faith and boundaries: absorbing everything,
    and learning that compassion does not require disappearing."

Provenance: [Greene:Chiron-in-Love — unmerited wound; wounded-healer myth; resentment and compassion
as the wound's two roads — supports Meaning] [Comet:Chiron-creativity — the talent arises from the
same place as the wound — supports Meaning] [Hand Clow:Rainbow-Bridge — Chiron bridges the inner
(Saturn) and outer (Uranus) planets — supports the structure/change line] [Satori:chiron-retrograde-
in-aries — "Chiron doesn't promise that the wound disappears. It shows us how to carry it
differently" — the overview's last line adapts the owner's own sentence — supports Meaning, owner
voice] [data/modifiers/chiron-life-cycle.json + approved retrograde line "review of old wounds,
repair, and the survival responses built around them" — supports cycle] Consistent with
TLDR-Article-Edition-Chiron-Aries-REVIEW and TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.

AC addendum (paraphrase-only, tag AC; his phrasing never enters copy): three working framings for the
record's interpretive notes. (1) Wound-and-remedy-together: Chiron contacts surface old wounds and
supply the means of working with them in the same touch [AC:astrology-20th-26th — "bringing old
wounds to the surface yet offering homeopathic perspectives on the same" — supports Meaning]. (2)
Chiron turns whatever it joins toward healing work; a configuration that includes Chiron becomes
about repair whether or not repair was the plan [AC:jupiter-chiron-neptune-aquarius — "demands the
visionary trip be a healing journey" — supports Meaning]. (3) Honest shadow note: Chiron-centered
configurations can carry a sour, aggrieved tone before they carry a healing one; copy should not
pretend the wound feels gentle [AC:astrology-20th-26th — "the negativity that sometimes infects...
during Chiron-centered configurations" — supports Meaning].

Decision B: add as written, DRAFT, then mark REVIEWED after this sign-off. APPROVED. (Owner, chat, 2026-08-04: "B - mark as reviewed," judge delegated to assistant judgment. Terra skipped: credit-blocked and voice-scoped; assistant ran a provenance check instead, 2026-08-04: Greene "unmerited poisoned wound"/Wounded Healer, Hand Clow Saturn-Uranus bridge and 50-51 year cycle all verified against the folder texts.)

## Section C: new planetary source - the Nodes

New file `data/planetary/lunar-nodes.json` covering both nodes (they move as one axis), status DRAFT,
consistent with the approved north-node-aquarius and south-node-leo placement rows and
nodal-return-cycle.json.

- overview: "The North Node marks the direction of growth: unfamiliar territory that development
  keeps pointing toward, where effort feels awkward at first and pays off anyway. The South Node
  marks the familiar ground already mastered, where real talent lives and where the work is release
  rather than more practice. Tradition calls them the Dragon's Head and the Dragon's Tail. They are
  calculated points, not bodies, always exactly opposite each other, so every step toward the North
  Node is also a letting-go at the South. Taking in the new is a deliberate choice; falling back on
  the old happens by itself."
- cycle: "The nodes complete their cycle in about eighteen and a half years, spending about eighteen
  months in each sign pair and moving backward through the signs. Nodal returns near ages eighteen,
  thirty-seven, and fifty-five mark turning points in the growth story."

Provenance: [Rudhyar:How-to-Interpret-the-Lunar-Nodes — Dragon's Head/Tail; North Node as conscious,
deliberate intake requiring choice, South Node as automatic release; the 18-19 year nodal transit —
supports Meaning and cycle; Dragon's Head/Tail is shared tradition vocabulary, free to use] [Spring:
North-Node-Astrology — the North Node feels unfamiliar at first; growth means leaving comfort zones;
the South Node as mastered past — supports Meaning] [CC:lunar-nodes guide — South Node as "a point
that represents shedding and letting go" — supports the release framing, paraphrased] [Satori:
2025-overview — her standing verb pair, the North Node "asks" and the South Node "challenges you to
release" — supports the asks/release structure, owner voice] [data/modifiers/nodal-return-cycle.json
— return ages — supports cycle] Consistent with TLDR-Article-Nodes-Aquarius-Leo-REVIEW and
TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.
- signs (all six axes, both directions; each North Node body names the growth, each South Node body
  names the developed talent and the release, per the owner's asks/release pattern):
  - north-node-aries: "With the North Node in Aries, growth points toward independent action:
    wanting things directly and going first." / south-node-libra: "The talent for harmony and
    considering the other is already developed. The release is deciding everything through someone
    else."
  - north-node-taurus: "With the North Node in Taurus, growth points toward steadiness: building
    slowly, owning simply, and trusting the body's plain needs." / south-node-scorpio: "The talent
    for depth and crisis is already developed. The release is needing intensity to feel alive."
  - north-node-gemini: "With the North Node in Gemini, growth points toward curiosity: real
    questions, local facts, and both sides of the story." / south-node-sagittarius: "The talent for
    conviction is already developed. The release is arriving with the answer already decided."
  - north-node-cancer: "With the North Node in Cancer, growth points toward feeling: home, care, and
    letting need show." / south-node-capricorn: "The talent for competence and control is already
    developed. The release is achievement standing in for worth."
  - north-node-leo: "With the North Node in Leo, growth points toward personal creative expression:
    being seen by name and meaning it." / south-node-aquarius: "The talent for the group view is
    already developed. The release is hiding inside the crowd's opinion."
  - north-node-virgo: "With the North Node in Virgo, growth points toward craft and service: useful
    detail, daily practice, and work that helps." / south-node-pisces: "The talent for imagination
    and empathy is already developed. The release is drifting instead of choosing."
  - north-node-libra: "With the North Node in Libra, growth points toward partnership: considering
    the other, and letting cooperation count as strength." / south-node-aries: "The talent for
    independence is already developed. The release is the fight-first reflex and doing everything
    alone."
  - north-node-scorpio: "With the North Node in Scorpio, growth points toward depth: shared
    resources, real intimacy, and change that costs something." / south-node-taurus: "The talent for
    stability is already developed. The release is comfort held so tightly it becomes a wall."
  - north-node-sagittarius: "With the North Node in Sagittarius, growth points toward meaning: the
    long view, conviction, and saying what is believed." / south-node-gemini: "The talent for
    information is already developed. The release is gathering one more fact instead of deciding."
  - north-node-capricorn: "With the North Node in Capricorn, growth points toward responsibility:
    structure, authority, and carrying weight on purpose." / south-node-cancer: "The talent for
    feeling and belonging is already developed. The release is mood as the reason and staying the
    one who is taken care of."
  - north-node-aquarius: "With the North Node in Aquarius, development moves away from the personal
    spotlight and toward community, collaboration, and ideas bigger than one name." /
    south-node-leo: "The talent for visibility and self-expression is already developed. The release
    is the need for applause to make anything feel real."
  - north-node-pisces: "With the North Node in Pisces, growth points toward trust: intuition,
    surrender, and ideas shared while still forming." / south-node-virgo: "The talent for analysis
    and precision is already developed. The release is perfectionism and control through fixing."
    [Anchors the owner's own 2025-overview axis reading.]

AC addendum (paraphrase-only, tag AC): three additions for the record's interpretive notes. (1)
Amplify/release polarity: a planet meeting the Dragon's Head gets intensified and fed; a planet
meeting the Tail gets drained toward release - useful for the node-axis aspect entries as well as
this record [AC:july-2017-fire-ceremony — Rahu framing, the Head as the hungry, amplifying point —
supports Meaning; Rahu and Dragon's Head/Tail are shared tradition vocabulary]. (2) Eclipse
continuity device: eclipses at the nodes form question-and-answer pairs across eclipse seasons - one
eclipse poses the question, a later one at the same axis answers it; fact-gated for Calendar copy on
engine-supplied eclipse pairs [AC:astrology-of-tuesday-july-2nd-2019 — "helps to answer the question
posed by the last solar eclipse" — supports the device]. (3) Co-presence note: the South Node sharing
a sign colors every transit through that sign toward depletion and letting-go
[AC:astrology-of-monday-november-25th-2019 — Venus in Capricorn "more difficult than usual" for
sharing the sign with the South Node — supports Meaning].

Decision C: add as written, DRAFT, then mark REVIEWED after this sign-off. APPROVED. (Owner, chat, 2026-08-04: "C - mark as reviewed," judge delegated. Same substitution: provenance verified against Rudhyar (Dragon's Head/Tail; North Node "conscious, deliberate... requires a choice" vs South Node automatic release) and Spring ("isn't comfortable at first... feels unfamiliar"; comfort zones); nodal return ages match the 18.6-year cycle.)

## After sign-off

All six blockers clear. Every remaining unit in the 28 becomes batch-eligible: batch 2 can be the
next seven from the missing-hook list, with the corpus warmth harvest running per the canonical
method and OV-041's no-quota rule. Packet self-lint per unit before any billed call, as always.
