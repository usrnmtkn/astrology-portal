# Lunation card: assembly spec

Paste this to Codex whole, together with the three JSON files named in section 0.
It supersedes earlier lunation card notes. Decisions below are settled unless
marked OPEN.

---

## 0. Ingest first. Nothing below works until this is done.

Codex is correct that `book-ritual-and-the-moon` and `horoscope-madlib.json` are not
in the repository. They have never been ingested. That is the first task, ahead of
everything else in this document.

Three files are supplied with this spec:

| File | Contents | Becomes |
|---|---|---|
| `ritual-and-the-moon-lunation-horoscopes.json` | 266 lunation horoscopes, verbatim | the `book-ritual-and-the-moon` store |
| `book-sections.json` | 645 typed, sign-tagged sections from the same book | polar axis, light & shadow, actions & intentions, rituals, tarotscopes |
| `horoscope-madlib.json` | house and sign tables derived from the original 265-entry extraction; the recovered 6th-house entry does not change its canonical domains | house domains, rulers, arcana, opposite-house map |

### This book is not third-party corpus

The standing rule that third-party books never enter the repo, and that the 41 titles
stay in `~/Downloads/Resources`, **does not apply here.** *Ritual and the Moon* is the
owner's own book. It is owner-authored source, it is the intended body text of the
lunation card, and it belongs in the repo with a canonical ID.

Do not refuse ingest on corpus-rule grounds. If the rule as written blocks it, amend
the rule to distinguish owner-authored books from third-party ones, and say so.

### Canonical IDs

```
authored/book-ritual-and-the-moon/lunation-horoscope/{kind}/{sign}/rising-{rising}/house-{n}
authored/book-ritual-and-the-moon/polar-axis/{signA}-{signB}
authored/book-ritual-and-the-moon/light-shadow/{sign}
authored/book-ritual-and-the-moon/actions-intentions/{kind}/{sign}
authored/book-ritual-and-the-moon/ritual/{kind}/{sign}
authored/book-ritual-and-the-moon/tarotscope/{kind}/{sign}/rising-{rising}
```

`contentKey` is already present on every entry in the horoscopes file. Preserve it.

### Authority and approval

Authority class: owner-authored. The owner has explicitly approved the book entries
as serving copy. Preserve that approval during ingest and record its provenance. This
approval applies to the verbatim book entries; newly authored hooks, bridges,
closings, excerpts, and dynamic rows still require their own row-level approval.

### Index

Adding these invalidates the knowledge index. Reindex as part of the ingest, and
expect in-flight runs to halt with `KNOWLEDGE_INDEX_STALE`. Do not partially ingest
and leave the index stale.

### Acceptance checks

Assert these after ingest and report the numbers back:

- 266 `lunation-horoscope` entries
- 266 distinct `(kind, sign, rising)` cells out of a possible 288, with 22 absent:
  the entire Taurus new moon set (12), four other Scorpio-rising new moons, five
  Scorpio-rising full moons, and the Aquarius full moon for Virgo rising
- 645 sections in `book-sections.json`, typed as: horoscope 339, tarotscopes 162,
  horoscope-set 41, ritual 31, actions-intentions 25, polar-axis 12, ritual-timing 12,
  light-shadow 9, affirmations 8, journaling 6
- `horoscope-madlib.json` schema `horoscope-madlib/v1`, 12 houses, 12 signs

### Reconciliation completed

`book-sections.json` reports 339 sections of type `horoscope`, but those are not 339
distinct lunation cells. They collapse to 126 unique bodies and include duplicated
partials, container headings, page markers, and headings parsed as bodies. The
dedicated horoscope file remains the canonical cell source.

The reconciliation recovered one real passage omitted by the original cell
extractor: Aquarius New Moon, Virgo rising, 6th house. Its heading says "Scorpio
Rising," but its Virgo sign tag, 6th-house placement, body, and position in the
Aquarius sequence identify it as Virgo rising. It has been added to the canonical
file with recovery provenance, bringing coverage from 265 to 266. Do not ingest
`type: horoscope` rows from `book-sections.json` as additional cells.

---

## 1. What changes

The lunation horoscope card stops being assembled from generic `fallback-hook/lunation-*`
rows and becomes: the owner's book entry for that exact cell, plus a small number of
calculated blocks. A per-user natal contact may be added in Phase 2.

Source of truth for the body is `book-ritual-and-the-moon`, 266 authored entries.

---

## 2. Phase 1 scope

**In:** exact book-cell lookup, headline, phase-specific frame, one selected major
sky aspect, one conditional ruler state, phase-specific lunar-cycle anchor, one
bridge clause, and closing.

**Out:** per-user natal contact, sect calculation and sect-aware phrasing, Chiron,
minor aspects, essential-dignity modifiers, and applying/separating modifiers.

---

## 3. Card structure

New Moon and Full Moon cards do not share one astronomical frame. The renderer
must select the structure for the actual lunation kind.

### 3.1 New Moon

```
{{hook}}                         headline, not a body sentence

The {{lunationSign}} {{lunationKind}} illuminates your {{lunationHouseOrdinal}}
house of {{lunationHouseDomains}}.

{{bookBody}}                     the exact approved cell entry, verbatim

{{lightShadow}}                  book, sign-scoped, see 6.3

This New Moon begins a cycle that will develop over the next six months.

{{skyAspectBlock}}               conditional, see 5.2
{{rulerBlock}}                   conditional, see 5.3
{{houseBridge}}                  once if any dynamic block renders

{{actionsIntentions}}            book, sign + kind scoped, see 6.3

{{closing}}
```

Do not add a reader-facing explanation that the Sun and Moon are together. That is
assembly logic, not card copy. A New Moon does not render `{{oppositeHouseOrdinal}}`,
`{{oppositeHouseDomains}}`, or `{{polarAxis}}`.

### 3.2 Full Moon

```
{{hook}}                         headline, not a body sentence

The {{lunationSign}} Full Moon illuminates your {{lunationHouseOrdinal}}
house of {{lunationHouseDomains}}, while the Sun sits opposite in your
{{oppositeHouseOrdinal}} house of {{oppositeHouseDomains}}.

{{polarAxis}}                    book, axis-scoped, see 6.3

{{bookBody}}                     the exact approved cell entry, verbatim

{{lightShadow}}                  book, sign-scoped, see 6.3

Six months ago, consciously or not, this lunar cycle began with the New Moon in
{{lunationSign}} on {{matchingNewMoonDate}}.

{{skyAspectBlock}}               conditional, see 5.2
{{rulerBlock}}                   conditional, see 5.3
{{houseBridge}}                  once if any dynamic block renders

{{actionsIntentions}}            book, sign + kind scoped, see 6.3

{{closing}}
```

`{{polarAxis}}` renders only on a Full Moon and sits directly under the frame. A
Full Moon is a polar-axis event and the owner has already written every axis.

`{{matchingNewMoonDate}}` is the date of the preceding New Moon in the same sign.
Include its year only when that New Moon and the Full Moon fall in different
calendar years in the reader's timezone. Store and pass the exact timestamp;
format its month and day with the reader's current-location timezone. Never derive
the reader-facing date by slicing the UTC ISO string, because the local date may be
the preceding or following calendar day.

Never strip the first sentence of `{{bookBody}}` at render time. If the owner later
wants a shorter card excerpt, store that excerpt as a separately approved artifact
with explicit boundaries and provenance.

The dynamic cluster may contain at most one sky-aspect block and one ruler block.
If both concern the same planet, merge them into one approved composition. After
the cluster, render the bridge exactly once if at least one dynamic block rendered:

```
This {{lunationKind}} is in your {{lunationHouseOrdinal}} house of
{{lunationHouseDomains}}. {{bridgeClause}}
```

Do not repeat this bridge after each block.

Phase 2 may insert `{{natalContactBlock}}` into the dynamic cluster only after its
row set and selection rule are separately approved.

### 3.3 Solar and Lunar Eclipses (owner-language candidate)

Eclipses reuse the corresponding exact book cell instead of creating a second
288-cell corpus:

```
eclipse-solar -> new-moon book cell
eclipse-lunar -> full-moon book cell
```

The reader-facing headline retains `Solar Eclipse` or `Lunar Eclipse`. The book
body's first sentence is the sole opening. Do not generate a separate system
opening on either the regular or eclipse path:

```
new-moon      -> exact book opening sentence
full-moon     -> exact book opening sentence
eclipse-solar -> stored, owner-approved solar-eclipse replacement
eclipse-lunar -> stored, owner-approved lunar-eclipse replacement
```

The regular source remains byte-exact. A separate eclipse variant stores the
approved first-sentence replacement and any approved declared-intention omission
spans. The eclipse layer has eight proposed fields: `eclipseNature`,
`eclipseMechanics`, `eclipseKind`, `eclipseVerb`, `eclipseChallenge`,
`eclipseSeason`, `eclipseNoRitual`, and `eclipseAdvice`.

Once the eclipse opening establishes the event, the eclipse-only body does not
keep re-announcing `the Pisces full moon`, `this full moon`, `full moon energy`,
or other product reminders unless a sentence genuinely needs to distinguish the
lunation from another event. Approved continuity edits are stored as exact source
spans, source hashes, and replacement text. This is an editorial rule for review,
never authorization for runtime regex deletion; the regular Full Moon body stays
unchanged.

The reusable structure is an editorial review rubric, not a prose template:

1. house hook — one plain sentence establishing the lived experience;
2. house pattern — what has been building or becoming visible;
3. house truth — what this house asks the reader to confront;
4. boundary or consequence — what cannot keep being carried or managed;
5. lived examples — one to three ordinary manifestations;
6. optional sign bridge — included only when the sign changes how the house story unfolds;
7. closing movement — consequence, distinction, or perspective without re-announcing the lunation.

These labels describe jobs, not required sentences or renderer slots. Jobs may be
combined, and an unsupported job is omitted. The reviewed artifact is one complete
`eclipseHouseBody` with source provenance and an approval hash. Runtime assembly is
limited to `eclipseOpening`, the approved complete `eclipseHouseBody`, the conditional
cycle anchor, the locked recommendation, and the locked eclipse close.

The eclipse book-opening replacement comes first. For all twelve Pisces lunar-
eclipse cards it uses `shines upon`, not `hits`. The default `eclipseNature`
sentence, `Eclipses warp time and shift the course of events in ways you can't
yet see.`, comes second. The other two recorded nature sentences require
separately approved exact contexts and never rotate randomly.

Lunar cards use the approved lunar-scoped mechanics passage beginning `Like a
Full Moon, Lunar eclipses can be a source of illumination.` The both-kinds
mechanics sentence is retained only for a card that needs to distinguish solar
and lunar eclipses.

The observed verbs `hits`, `reveals`, `activates`, `illuminates`, `shows`, and
`demands`, plus the one-use verbs recorded in the source evidence, are evidence,
not a rotation bank. Pisces lunar-eclipse variants use `shines upon` in all twelve
houses. Other eclipse contexts require separately approved assignments.
`eclipseChallenge` renders only from a complete approved habit-and-consequence
pair. `eclipseSeason` receives the axis, corridor dates, and series position from
the calculation layer and may fill only an approved prose frame.

Solar eclipses use the approved solar mechanic and lunar eclipses use the
approved lunar mechanic. A South Node solar eclipse requires a separately
approved reversal modifier. That wording is currently a source gap and must not
be invented by the resolver.

Eclipse cards render the approved recommendation paragraph. The regular book
source stays unchanged. An eclipse variant may omit only an explicit declared
Full Moon intention block stored with owner-approved start/end offsets, exact
text, and SHA-256 hash. Incidental intention language stays. Never pattern-match
or cut sentences at runtime; an affected card without an approved span fails
closed. The two Pisces spans, in houses 4 and 12, were owner-approved on
2026-08-24.

Card-specific Pisces rulings from 2026-08-24: Card 4's eclipse opening is `The
Pisces lunar eclipse shines upon your 4th house of home, family, and generational
karma.` Card 10 retains the book's Pisces New Moon callback and suppresses the
separate dynamic cycle anchor so the six-month fact appears once.

Owner-approved eclipse recommendation, 2026-08-24:
`Eclipses are not the recommended time for ritual, manifestation, or intention
setting. They happen along the Lunar Nodes, and part of the work is letting the
situation unfold before deciding what it is supposed to become.` Approval of
this shared paragraph does not authorize serving an unapproved complete card.

The proposed layers are recorded in
`source/eclipse-owner-language-v1.json` and in the madlib template. Every sentence
is assembled from exact phrases in four owner-authored eclipse articles. The
source file records page-level provenance and excludes event-specific 2025 dates,
degrees, aspects, stations, retrogrades, node conditions, and rising-sign claims.

The twelve complete proposed eclipse cards remain `needs_review` and non-serving.
Approved component decisions are materialized separately as exact section records:
card-specific opening and evergreen body, plus shared nature, mechanics,
recommendation, and close. These
sections may compose independently because each carries its own exact approval
hash. Unapproved continuity rewrites remain excluded; phrase authorship by itself
does not approve a new section or complete composition.

### Evergreen fail-soft rule

The approved New Moon or Full Moon book cell is the required evergreen base. A
missing, ineligible, or failed eclipse composition never suppresses that base.
Reader lookup order is:

1. verified, approved eclipse opening;
2. approved eclipse nature and mechanics sections;
3. approved eclipse-specific house body, or the exact evergreen New/Full Moon
   body remainder when that body is not approved;
4. the engine-derived cycle anchor when the book body does not already contain it;
5. each eligible dynamic section independently;
6. approved eclipse recommendation and close.

Conditional additions such as eclipse copy, an aspect, ruler condition, timing
note, or other dynamic section fail closed independently. The failed addition is
omitted and the evergreen horoscope remains visible. The render result carries an
internal `needs_review` flag naming the omitted content key and the evergreen
fallback key. Review flags are editorial metadata and never appear in reader copy.
An unreviewed addition is never relabeled as approved merely because its evergreen
fallback is live.

The known eclipse opening is factual framing, not an optional editorial flourish.
When the engine verifies eclipse kind, sign, rising sign, and house and an approved
opening record exists, failure in any later section must not remove that opening.
Likewise, an optional ruler, aspect, or timing section may never throw away the
assembled eclipse frame or evergreen body. Its failure produces one internal flag
for that section and assembly continues.

---

## 4. Cell lookup and the evidence rule

Key: `(lunationKind, lunationSign, risingSign)`. House is derived, not a key.

Canonical ID:
`authored/book-ritual-and-the-moon/lunation-horoscope/{kind}/{sign}/rising-{rising}/house-{n}`

**A cell card may draw book evidence from exactly one `lunation-horoscope` entry: its
own. If that entry does not exist, it draws none.** No same-sign borrowing, no
same-house borrowing, no borrowing from any other entry for any reason.

**This rule governs `lunation-horoscope` entries only.** The book contains other
content types written at other scopes, listed in 6.3. Those are used at their own
scope level and are not cross-cell borrowing. Using the Aries/Libra polar axis
section in an Aries lunation card is correct, because that section was written about
the Aries/Libra axis. Taking a sentence from the Taurus Full Moon horoscope and
putting it in an Aries card is not.

22 cells have no entry:

- all 12 Taurus New Moon rising-sign cells
- Cancer, Leo, Libra, and Capricorn New Moons for Scorpio rising
- Taurus, Cancer, Leo, Libra, and Capricorn Full Moons for Scorpio rising
- Aquarius Full Moon for Virgo rising

Those fall back to row assembly, never to a neighbouring cell.

Enforcement, three layers:

1. **Resolver scope.** Admit only the cell's own key from the book store. Other
   entries are not fetched, not ranked, not truncated into prompt context.
   Violation: `EVIDENCE_SCOPE_VIOLATION`. Fail closed, render from rows alone.
2. **Import-time evidence audit.** Index 8-grams across the canonical cells and
   report suspicious cross-cell phrases before approval. This is an audit signal,
   not a runtime serving gate: approved shared language must not make a valid card
   disappear. Store the exact source-cell ID and source hash on the rendered card.
3. **Judge check, advisory and offline only.** Does this card contain a claim
   belonging to a different house? It advises review and never writes or rewrites
   serving copy.

Known collision: **karma appears in both the 4th and 12th house domains.** House 4
karma is inherited through family, living patterns, childhood, the cycle you break.
House 12 karma is inherited across lifetimes, spiritual debt, dreams, what is hidden.
"Ancestors" appears in both and cannot be fenced by the noun. Fence on the verb:
house 4 uses inherited, passed down, learned, carried forward; house 12 uses receive,
download, channel, surface, come through.

Canonical 4th house domain is **"home, family, and generational karma."**

---

## 5. Selection rules

### 5.1 Aspects are degree-based

Degree orbs, not whole-sign. Sign-gating was considered and rejected.

Phase 1 priority order for what earns a block:

1. Strongest qualifying sky aspect to the lunation. This is what distinguishes
   this year's event.
2. Ruler condition, only when it adds a distinct, qualifying fact.

Per-user natal contacts are a Phase 2 layer and do not participate in Phase 1
ranking.

**Select the strongest, do not list everything.**

### 5.2 Sky aspect selection

Rank, do not take the tightest. A 0.64 degree conjunction beats a 0.47 degree sextile.

```
score = aspectWeight * planetWeight * orbFactor * relevance
orbFactor = (1 - orb/maxOrb) ^ 1.2
```

| Aspect | weight | max orb |
|---|---|---|
| conjunction | 1.00 | 3 |
| opposition | 0.95 | 3 |
| square | 0.90 | 3 |
| trine | 0.80 | 2 |
| sextile | 0.60 | 2 |

Eligible Phase 1 aspect bodies and weights: Saturn 1.00, Pluto 0.95, Uranus 0.95,
Mars 0.90, Jupiter 0.85, Neptune 0.80, North Node axis 0.70, Venus 0.55,
Mercury 0.50. Treat the North and South Nodes as one axis and never produce two
blocks from the same nodal contact. Chiron and minor aspects are out of scope.

Relevance multipliers: rules the lunation x1.25, rules the reader's rising x1.20,
stationing within 3 days x1.30, retrograde x1.10, planet angular for this rising x1.15.

Do not calculate or score applying/separating in Phase 1. Add it only after a
pairwise relative-motion definition and focused tests have been approved.

For a Full Moon, evaluate qualifying aspects to both lights. If the same planet
qualifies against both the Sun and Moon, deduplicate it into one candidate, retain
the higher-scoring contact, and render at most one block for that planet. Do not
infer or describe a compound aspect pattern.

Before these orbs serve, run a coverage report over one complete year of lunations
and all 12 rising signs. Report the percentage of cards receiving a sky-aspect
block, a ruler block, both, or neither, plus the winning aspect/body distribution.
The report is an acceptance check; do not silently widen an orb to increase copy.

### 5.3 Ruler block fires only when

Use traditional rulership: Scorpio is ruled by Mars, Aquarius by Saturn, and Pisces
by Jupiter. A separate ruler block may render only when:

- the ruler is retrograde, or
- stationing within 3 days, or
- changing sign within 3 days while at 29 degrees, or
- the ruler is the planet selected for the sky-aspect block.

If the ruler is the selected aspect body, merge its state into that single dynamic
block rather than rendering a second paragraph. The Sun and Moon do not receive an
independent ruler-state block in Phase 1. Otherwise, omit the ruler entirely; do not
name it merely because it rules the lunation sign.

### 5.4 Ingress

Mention an ingress inside the lunation card only when the ingressing planet rules
the lunation sign **and** the ingress falls within about 3 days. Tighten further:
fire only when the ruler is in the **last degree** at the lunation moment. An
unrelated ingress stays a separate weekly event.

A station of the lunation ruler ranks above an ingress.

### 5.5 Silence

**Omit any block entirely when nothing qualifies. Never render empty template
language.** A short card is correct. A card padded with sky facts is not.

---

## 6. Row sets to author

### 6.1 Phase 1 rows

| Set | Count | Notes |
|---|---|---|
| hook | 24 | 12 houses x 2 kinds. One approved headline per key in Phase 1. |
| bridge clause | 12 | keyed on lunation house alone |
| closing | 24 | 12 houses x 2 kinds, intention format |
| aspect body x house | 108 | 9 eligible bodies/axes x 12 houses. The main authoring job. |
| body nature | 9 | Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, nodal axis |
| ruler condition stem | 3 | retrograde, stationing, last-degree ingress |
| aspect stem | 5 | conjunction, opposition, square, trine, sextile |

The 50 natal-contact meanings, sect rows, dignity modifiers, Chiron rows, and minor
aspect stems are not Phase 1 authoring requirements. Two to three deterministic
hook variants per key may be explored after the first implementation is stable;
they are not required now.

**Hooks must be written fresh, not lifted from a book cell.** A hook lifted from
another cell is a rule 4 violation and imports that cell's sign material.

### 6.2 House definitions come from the book. Always.

**Every house definition and domain phrase on a lunation card is the owner's, taken
from her book. Do not use the app's existing strings and do not write replacements.**

The 12th house is **"karma, subconscious, and endings"**, which is what she uses in
13 of the 16 entries that name it. The app currently says "rest, privacy, and what
you keep to yourself" in at least one place. That string must not appear on the
lunation surface.

Create a lunation-specific namespace such as `lunation-book/house-domain/{n}` and
populate it from `horoscope-madlib.json`. Do not globally replace the shared
`house-jurisdiction` vocabulary: it has non-lunation consumers, and changing it
would alter unrelated transit and synastry surfaces. Any global house-language
change requires a separate impact audit and owner decision.

House domain phrases come from `horoscope-madlib.json`, extracted by frequency from
the canonical entries. For Phase 1, use the `domain` value already marked canonical
for each of the 12 houses. Preserve `domainVariants` as source evidence but do not
rotate or select them at render time.

If a needed phrase does not exist anywhere in the book, stop and ask. Do not
invent one.

---

### 6.3 Three further book content types, already written

Source: `book-sections.json`, 645 typed and sign-tagged sections extracted from the
same book. These are not `lunation-horoscope` entries and are not subject to the
cell-scoping rule. Each is used at the scope it was written at.

| Slot | Book type | Scope | Sections | Coverage | Gaps |
|---|---|---|---|---|---|
| `{{polarAxis}}` | polar-axis | axis | 12 | 6 of 6 axes | none |
| `{{lightShadow}}` | light-shadow | sign | 9 | 9 of 12 signs | aries, taurus, cancer |
| `{{actionsIntentions}}` | actions-intentions | sign + kind | 25 | new moon 12/12, full moon 11/12 | aries full moon |

**These sections are too long to paste.** They run 6,500 to 13,400 characters. Each
needs a card-sized excerpt of roughly 300 to 600 characters, **selected from the
owner's text, not rewritten.** Selecting is an owner task. Do not summarise, do not
paraphrase, do not stitch sentences from different parts of a section together.

Excerpt rows to produce:

| Set | Count | Notes |
|---|---|---|
| polar axis excerpt | 12 | one per lunation sign, drawn from that sign's axis section and written from that sign's side of the axis |
| light & shadow excerpt | 12 | 9 have a source section, 3 need writing |
| actions & intentions excerpt | 24 | 23 have a source section, 1 needs writing |

The polar axis set is 12 rather than 6 because the axis reads differently depending
on which end the lunation is at. An Aries Full Moon puts the Moon in Aries and the
Sun in Libra, so the excerpt leads with Aries. A Libra Full Moon reverses it.

On Full Moon cards, slot `{{polarAxis}}` under the frame. New Moon cards do not
render `{{polarAxis}}`. On both kinds, slot `{{lightShadow}}` after the book body
and `{{actionsIntentions}}` before the closing.

Same silence rule as everywhere: if a sign has no section and no excerpt has been
written, the slot omits. Never substitute the other end of the axis, another sign,
or a generic line. These excerpt slots may remain absent in the first Phase 1
implementation until their exact boundaries have been separately approved.

---

---

## 7. Writing rules for every authored row

1. **Never state a position on its own.** Not "Mars is in Cancer at 29 degrees."
   Name the planet inside a sentence about the reader.
2. **A technical fact only renders if it changes what the reader recognises about
   their week.** "Fall is the sign opposite the exaltation" fails. "It can't move
   directly, so you'll go quiet" passes.
3. **No jargon framing.** Never "what astrologers call". State the term directly or
   drop it.
4. **One state per paragraph.** Do not stack retrograde, stationing and ingress into
   one sentence.
5. **Length follows novelty.** A planet parked in a sign for 18 years making a routine
   sextile gets one paragraph. A lunation ruler stationing on the day can receive a
   fuller treatment.
6. **Distinguish condition from trigger.** The lunation does not put Neptune in the
   12th house. It switches the lights on over something already there. Say both.
7. **When the chart supplies no deadline, urgency or villain, do not add one.**
8. **The owner's language wins on the lunation surface.** Where the lunation card has
   its own phrasing for a house, sign, or planet, use the book source. Do not blend
   it with a shared app definition or write a third version.
9. **No em-dashes.**

---

## 8. Compute and store

Per lunation, store on the record:

- exact lunation moment, Moon and Sun degree
- eligible Phase 1 body positions, speed, retrograde, and stationing within 3 days
- sign ingress and egress dates for eligible ruler bodies
- qualifying major-aspect list with orb and score; no applying/separating field
- `matchingNewMoon`, for Full Moons only: the preceding New Moon in the same sign,
  which for a fixed rising falls in the same house. This is the New Moon that began
  the six-month lunar cycle and supplies `{{matchingNewMoonDate}}`. Include the year
  in the displayed date only when the matching New Moon and Full Moon fall in
  different calendar years.
- New Moons do not use a prior-lunation callback. They render the fixed approved
  line: "This New Moon begins a cycle that will develop over the next six months."

Use the app's existing bundled Swiss Ephemeris/WASM path. `seas_18.se1` is already
included in the bundle, but Chiron remains intentionally out of Phase 1. Lilith and
sect are also out of Phase 1 and require no compute or storage work.

---

## 9. Governance: the per-user block is auto-approved. DECIDED.

Layer 3, the per-user natal contact, is computed at request time. It cannot be
pre-generated or individually reviewed, because it does not exist until a reader
loads the page.

**Owner decision: the approvable unit is the row plus the selection rule. Once both
are approved, assembled output serves without per-output approval.**

This is a change to the governance model, not a relaxation of it. It holds only
because the output is a pure function of approved inputs. Enforce all five of these
or the decision does not apply:

1. **No model in the render path.** Deterministic assembly only: select rows,
   substitute values, concatenate. If a language model ever writes at request time,
   auto-approval is void and that path fails closed.
2. **Every row in the active path is individually approved.** For Phase 1 this
   includes every selected hook, bridge, closing, aspect stem, condition stem, and
   body-house row. Phase 2 natal-contact rows must meet the same requirement before
   that layer is enabled.
3. **The selection rule is itself an approved artifact,** versioned and hashed like
   any other governed asset. Changing a weight, an orb, or a priority is a change
   requiring re-approval.
4. **Missing or unapproved row means the block omits.** Never substitute a neighbour,
   never fall back to a generic string, never render a partial sentence.
   Fail closed, exactly as elsewhere.
5. **Any change to a row or the selection rule invalidates cached output** and
   re-renders. A card must never contain a row version that is no longer approved.

Under those five, a rendered card cannot contain a word the owner has not approved,
which is what the standing rule was protecting. Individual output approval would add
no safety, only latency.

Log the row IDs and selection-rule version used for every rendered card so any
served output can be traced back to its approved inputs.

---

## 10. Decisions and remaining owner work

1. ~~12th house definition~~ **DECIDED, see section 6.2. The book wins.**
2. **Book copy approval: DECIDED.** The owner explicitly approved the canonical
   book entries as serving copy. Record that bulk approval during ingest.
3. **Canonical Phase 1 house domains: DECIDED.** Use the `domain` value already
   marked canonical for each house in `horoscope-madlib.json`.
4. **Lilith, Chiron, sect, dignity, minor aspects, applying/separating, and natal
   contacts: DEFERRED.** None are Phase 1 dependencies.
5. **Missing cells: OPEN.** Decide whether to author the 22 absent cells. Until
   then they use row fallback and never borrow from another book cell.
6. **Long-section excerpts: OPEN.** The exact boundaries for polar-axis,
   light-shadow, and actions-intentions excerpts require separate approval. Until
   approved, those optional slots omit.

---

## 11. Second task, after ingest

Dump these five row families with full body text as JSON:

```
fallback-hook/lunation-release/*
fallback-hook/lunation-shows/*
fallback-hook/lunation-higher-path/*
fallback-hook/lunation-intention/*
fallback-hook/lunation-moment/*
```

For each: contentKey, body_you, house or sign scoping in the key, approval status,
and the count of code references. All five families are believed to have zero code
references. Verify that rather than assuming it.

Some of these may already cover the bridge, closing, or body-house slots. Check
before writing 108 new rows.

---
