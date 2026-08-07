# Leak-family cleanup: before/after sheet (36 validation failures)

Date: 2026-08-04
Prepared by: editorial assistant. Owner green-light to draft: chat, 2026-08-04. Approving a section approves the exact replacement text. Basis: OV-041/BW-015 (permanent leak ban; name the action and consequence), BW-001 (reckoning), NE-031 (the owner-rejected origin line). All replacements avoid em dashes and banned terms.
Not in scope here: the 4 jupiter-libra schema-field errors (structural, placement stream, for Codex) and a wider em-dash audit of the insights records (several shadow fields use em dashes; flagged as follow-up F-1 below).

## L1. The cloned NE-031 construction (22 files, natal-aspect insights)

The clause "you sit on it until it leaks out sideways" (variants: "swallow it until...", "sitting on the feeling until...") appears across 22 `data/insights/natal-aspects/*.json` files in summary, body, shadow, and one dont item. It is near-verbatim NE-031, which the owner explicitly rejected on 2026-08-03.

DISTRIBUTION APPROACH (owner selection, 2026-08-04): the owner supplied a verb menu and chose to distribute verbs across the corpus rather than create a new cloned construction. Verbs assigned by pair family, matched to the owner's own tone matrix; aspect variants within one family share the family verb (one reader only ever sees their own aspect).

| Family (files) | Verb | Replacement clause |
| --- | --- | --- |
| mars-jupiter (conjunction, opposition, sextile, square) | blow up | "...or you sit on it, then blow up at whoever is closest." |
| mars-neptune (conjunction, opposition, sextile, square, trine) | vent on | "...or you sit on it, then vent on the wrong person." |
| mars-saturn (conjunction) | boil over | "...or you sit on it until it boils over." |
| mercury-mars (conjunction, opposition, sextile, trine) | lash out | "...or you sit on it, then lash out at whoever is closest." |
| moon-mars (conjunction, opposition, sextile, square) | turn on | "...or you sit on it, then turn on whoever is closest." |
| sun-mars (conjunction, opposition, sextile, trine) | unload on | "...or you sit on it, then unload on whoever is nearby." |

Rationale for the matches, from the owner's matrix: Jupiter excess takes "blow up" (plain loss of temper); Neptune's indirect route takes "vent on" (emotional dumping); Saturn's held pressure takes "boil over" (transition from sitting on it to losing control); Mercury's speech takes "lash out" (targeted verbal); Moon's close-quarters moods take "turn on" (shock to the person receiving it); Sun's held-for-image temper takes "unload on" (accumulated release).

Special lines (moon family verb):

- moon-square-mars body: "or swallow it, then turn on whoever is closest."
- moon-sextile-mars body: "you might sit on what you feel, then turn on the wrong person."
- moon-sextile-mars shadow: "The trap: sitting on the feeling until you turn on someone who did nothing."
- moon-sextile-mars dont item: "Sit on it until you turn on someone"

Where a shadow sentence used an em dash, the replacement joins with "or", e.g. "The trap: your temper gets ahead of you, you sit on it, then blow up at whoever is closest, or you overreach, overpromise, or talk bigger than you deliver."

APPROVE L1 assignment: APPROVED. (Owner, chat, 2026-08-04: "approve.")

## L2. Individual figurative uses

OWNER-REWRITTEN AND APPROVED (owner supplied this exact table in chat, 2026-08-04; assistant drafts superseded where changed):

| # | File / field | Before | After (owner wording) |
| --- | --- | --- | --- |
| L2a | modifiers/composite-chart.json, mars_neptune.square | "Action confuses or undermines itself, and the energy leaks." | "Action confuses or undermines itself, and momentum fizzles out before anything gets done." |
| L2b | modifiers/nodal-axis-timing-framework.json, neptune.southNode | "Confusion, deception, avoidance, leakage, theft, or substance-related themes need grounded care." | "Confusion, deception, avoidance, slow losses, theft, or substance-related themes need grounded care." |
| L2c | points/aspects/natal/lilith-conjunct-mars.json, shadow | "Anger held in until it leaks or erupts, or force aimed at the self..." | "Anger held in until it boils over, or force aimed at the self..." |
| L2d | points/placements/house/lilith-12.json, shadow | "Self-sabotage from the dark, or repression that leaks out sideways." | "Self-sabotage from the dark, or suppressed feelings slipping out as passive-aggressive behavior." |
| L2e | points/transits/house/lilith-house-12.json, shadow | same as L2d | "Self-sabotage from the dark, or suppressed feelings slipping out as passive-aggressive behavior." |
| L2f | synastry A-mars_B-pluto_sextile.json and A-pluto_B-mars_sextile.json, tension | "...the potential stays unused or leaks out as low-grade tension." | "...the potential stays unused or turns into low-grade resentment." |
| L2g | synastry A-neptune_B-mars_square.json, plainTranslation | "Heat may leak into avoidance or indirect conflict." | "Heat may fizzle into avoidance or indirect conflict." |
| L2h | timing/timing-event-sources-v9.json, sourceRecords[18].provenance | "...Venus retrograde as value-and-relationship reckoning across twelve sign readings..." | "...Venus retrograde as value-and-relationship reassessment across twelve sign readings..." |

APPROVE L2: APPROVED with the owner's exact wording above. (Owner, chat, 2026-08-04.)

L2i (added after the Codex application run surfaced one straggler not in the original 40):

| # | File / field | Before | After (candidate, built from the owner's approved L2a/L2g vocabulary) |
| --- | --- | --- | --- |
| L2i | data/transits/natal/neptune_mars_square.json, plainTranslation | "Energy leaks. Confusion, low drive, passive moves, escapism. Get specific; stop the avoidance." | "You start moving, then lose focus before anything gets finished. Confusion, low drive, indirect action, escapism. Name the next step and stop avoiding it." |

APPROVE L2i: APPROVED with the owner's exact wording above; assistant candidate superseded. (Owner, chat, 2026-08-04.)

## L3. Literal uses (owner scope call; recommended rewordings pass the validator without a rule carve-out)

These three are not the AI-tell metaphor: two plumbing leaks and the journalism sense of leaked information. Your ban statement targeted the AI-tell ("I don't use the word leaks, AI uses the word leaks"). Recommended: reword anyway so the mechanical check stays simple; alternative is a literal-use exception in the validator, which adds rule machinery for three sentences.

| # | File / field | Before | After (recommended) |
| --- | --- | --- | --- |
| L3a | synastry A-mercury_B-neptune_trine.json and A-neptune_B-mercury_trine.json, tension | "...a leaking faucet does not fix itself while you are busy being moved by a sunset." | "...a dripping faucet does not fix itself while you are busy being moved by a sunset." |
| L3b | modifiers/nodal-axis-timing-framework.json, neptune example | "water or leak issue" | "water damage or plumbing failure" |
| L3c | transits/mercury-conjunction-uranus.json, readerCopy.body | "A leak, alert, resignation note, discovery, or technical breakthrough reaches every screen..." | "A whistleblower's document, an alert, a resignation note, a discovery, or a technical breakthrough reaches every screen..." |
| L3d | transits/mercury-square-pluto.json, readerCopy.summary and body | "Two sides use selective leaks and edited messages to control what the public believes happened." | "Two sides feed the press chosen fragments and edited messages to control what the public believes happened." |

APPROVE L3: REJECTED as rewordings. (Owner, chat, 2026-08-04: "do not change the word leak in L3 that is authored approved.") The L3 wording stays exactly as authored. Implementation: the validator gets a SCOPED literal-use allowlist, keyed to these exact file/field pairs only, never a general exception: A-mercury_B-neptune_trine.json tension; A-neptune_B-mercury_trine.json tension; nodal-axis-timing-framework.json neptune examples entry "water or leak issue"; mercury-conjunction-uranus.json readerCopy.body; mercury-square-pluto.json readerCopy.summary and readerCopy.body. Any new leak-family use anywhere else still fails.

## F-1. Follow-up flag, not in this sheet

Several natal-aspect insight fields use em dashes outside the sentences replaced here; OV-010 bans them in reader copy. Recommend a separate mechanical audit pass once this sheet lands.

## After approval

Hand to Codex: apply exactly as approved, re-run validation (expect the 36 term failures cleared; jupiter-libra schema errors remain until the placement stream fixes them), regenerate dist if validation passes, report changed files.
