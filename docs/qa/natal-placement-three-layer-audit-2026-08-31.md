# Natal placement three-layer audit

Date: 2026-08-31
Status: review doctrine and repair plan; no reader-serving copy approved by this document
Branch baseline: `b8fdefcd7d3498a7ef3f430b00a7100906dc6933`

## Owner direction

Natal planet placements use three distinct interpretation layers:

| Layer | Example | Purpose |
|---|---|---|
| Sign baseline | Venus in Capricorn | Complete birth-time-independent interpretation of how the planet operates through the sign. |
| Planet-house baseline | Venus in the 6th house | Complete interpretation of how that specific planet operates in that natal house. |
| Exact synthesis | Venus in Capricorn in the 6th house | What becomes distinctive when this sign expression operates through this house. |

The exact synthesis must add information. It must not mechanically restate or concatenate the two baselines.

This architecture is for natal placements. It is not a Sky Placement authoring rule.

## Positive structural precedent

The existing Chiron and Lilith complete-placement families are the strongest structural precedent for Layer 3. Their value is not their emotional intensity or length. The transferable feature is that the placement is treated as one developed pattern rather than a sign paragraph followed by a generic house paragraph.

Use the current natal writing contract for developed placements: placement function -> sign mechanism -> lived evidence -> consequence -> complication -> mature expression. Chiron and Lilith are structural evidence, not wording templates.

## Natal planet-in-house reference

The owner supplied Myrna Lofthus, *A Spiritual Approach to Astrology* (1983) as a reference for what planets in houses mean in natal charts. The repository already carries extracted source material from this book under keys such as:

`book/201419935-a-spiritual-approach-to-astrology/{planet}-in-the-houses/{house}`

The book supports a planet-specific house layer rather than a generic house-definition layer. Its sections separately interpret Mars in the houses, Venus in the houses, Mercury in the houses, Moon in the houses, Sun in the houses, Pluto in the houses, Jupiter in the houses, Saturn in the houses, Uranus in the houses, and Neptune in the houses.

Examples of the semantic distinction:

- Sun in a house describes where the Sun's conscious identity, visibility, direction, and development become active in natal life.
- Mars in a house describes where assertion, effort, action, impatience, conflict, pursuit, and initiative operate.
- Jupiter in a house describes where confidence, growth, opportunity, belief, generosity, and excess operate.
- Saturn in a house describes where responsibility, limits, endurance, standards, consequences, and sustained effort operate.
- Uranus in a house describes where independence, disruption, experimentation, nonconformity, and change operate.

The book is semantic reference material, not a style source. Dated medical claims, deterministic predictions, fixed gender or family assumptions, karmic certainty, and career-only interpretations do not become TLDR Astro doctrine merely because they appear in the source. Current owner contracts govern translation into reader prose.

## Current architecture finding

The current admin source map already exposes four groups: exact, sign, house, and structure. The reader resolver also has an exact complete-placement override family under:

`fallback-hook/natal-you-placement-complete-final/{planet}/{sign}/{house}`

This means the repository already contains most of the selection primitives needed for the three-layer model. The main editorial problem is the quality and role clarity of the composed fallback.

### Layer 1: sign baseline

Current sign composition still depends on broad reusable pieces such as:

- `planet-intro/{planet}`
- `planet-verb/{planet}`
- `sign-adverb/{sign}`
- `sign-need/{sign}`
- `placement-sentence/{planet}/{sign}`
- `planet-excess/{planet}`
- `planet-best/{planet}`

The placement-specific sentence can be strong, but generic planet-wide challenge and strength endings can flatten or contradict the sign-specific argument. These shared endings are a priority architecture review area.

### Layer 2: planet-house baseline

Current house composition uses both:

- `house-meaning/{house}`
- `placement-house-sentence/{planet}/{house}`

Many `placement-house-sentence` rows are already planet-specific and were authored from the Lofthus planet-in-house material plus house evidence. The generic `house-meaning` introduction is the larger structural problem: it can make a strong planet-house passage feel like a textbook add-on.

The repair goal is therefore not to discard the entire 180-unit planet-house inventory. Review each unit for KEEP / SURGICAL FIX / REWRITE, while separately evaluating whether the generic house intro should remain in the rendered natal placement at all.

### Layer 3: exact synthesis

Exact complete placements already have precedence when an approved unit exists. The stronger Chiron and Lilith families prove the product can support this model.

For conventional planets, Layer 3 should be progressively authored as a new exact-placement enrichment program. Until an approved exact synthesis exists, the reader should receive a strong Layer 1 + strong Layer 2 fallback.

## Review tests for each layer

### Sign baseline

A sign baseline passes only if it:

1. makes complete sense without a birth time or house;
2. describes the planet's function changed by the sign rather than a zodiac adjective profile;
3. contains recognizable behavior and consequence;
4. does not borrow the sign's traditionally associated house as its dominant life domain; and
5. does not end in generic planet copy that could contradict the sign-specific argument.

### Planet-house baseline

A planet-house baseline passes only if it:

1. describes this planet operating in this house, rather than defining the house;
2. stays valid across all twelve signs;
3. names plausible behavior, circumstances, decisions, or consequences in that life area;
4. avoids invented motives, personal history, medical claims, and deterministic outcomes; and
5. remains a natal recurring pattern, not a transit or Sky forecast.

### Exact synthesis

An exact synthesis passes only if it:

1. adds information neither baseline gives independently;
2. shows how the sign changes the way the planet carries out the house function;
3. develops a recognizable cause-and-consequence pattern rather than keyword-combining;
4. does not repeat the sign baseline or planet-house baseline in slightly different words; and
5. remains review-gated until the owner approves the complete exact wording.

## Midheaven doctrine

Midheaven means what the person becomes known for, not their job. Career is one possible expression.

MC interpretation must work for students, stay-at-home parents, people who are unemployed or outside the workforce, disabled people outside conventional employment, unpaid community or creative contributors, retirees, and people with conventional careers.

Blocking test: would the interpretation still make complete sense if the reader had no employer, no job title, and no intention of getting one?

- Conjunction MC: the planet becomes part of what the person is known for, how they contribute visibly, and the responsibility or authority associated with them.
- Square MC: recurring friction between the planetary function and visible direction, reputation, recognition, responsibility, or authority.
- Opposition MC: author from the IC. The interpretation belongs to home, roots, family, belonging, privacy, inherited roles, and private foundation rather than generic career tension.

## Natal aspect personalization doctrine

Keep the reusable aspect mechanism separate from chart-specific personalization:

- canonical row: Planet A + Planet B + aspect mechanism;
- waxing: activity and behavioral expression;
- waning: ideas and meaning-making;
- houses: where the pattern operates in the person's life;
- applying/separating: separate fact and never a substitute for waxing/waning;
- signs and houses: personalize after canonical row selection rather than being baked into the 237 reusable aspect rows.

Waxing/waning remains fail-closed for Ascendant, Midheaven, North Node, and South Node until a separate phase rule exists for non-planet endpoints.

## First repair order

1. Preserve exact owner-approved complete Chiron and Lilith passages byte-for-byte.
2. Audit generic sign-template glue, especially `planet-excess` and `planet-best`, before rewriting good planet-sign passages.
3. Audit `house-meaning/{house}` as a global natal composition layer. Determine whether the generic house intro should be removed from composed natal placements while retaining the house facts elsewhere in the product.
4. Review all planet-house passages as planet-specific natal units against the Lofthus source material and current owner writing contracts. Classify KEEP / SURGICAL FIX / REWRITE. Do not change approved wording without exact owner approval.
5. Stage revised Layer 1 and Layer 2 candidates as `needs_review`; do not promote or serve them from model judgment.
6. Add exact Layer 3 synthesis units progressively, using the Chiron/Lilith structural standard while preserving the emotional register of the actual planet.
7. Keep You and Friend semantically equivalent while authoring natural third-person Friend prose rather than global pronoun substitution.
8. Review MC/angle content under the separate MC doctrine rather than treating it as ordinary 10th-house or career copy.
9. Review natal aspects only after the fact pipeline retains both house numbers and distinguishes waxing/waning from applying/separating.

## Immediate weak-area findings from the existing planet-house inventory

The source inventory already shows several rows that need current-standard review even though some were approved under earlier owner review. Examples include:

- Sun in the 7th: broad claims such as instinctively thinking "we rather than me" and being a "natural peacemaker" are not sufficiently planet-specific and can conflict with the sign baseline.
- Sun in the 10th: ambition and success language is narrower than the current public-contribution / reputation / responsibility doctrine.
- Jupiter, Mars, Uranus, Neptune, and Pluto in the 10th: several rows reduce the 10th house to career or conventional work and need review against the wider public-life standard.
- Uranus in the 6th: claims such as doing more than most people or ideally having no boss overstate the placement.
- Uranus in the 7th: claiming the person is "fairly conventional" and has an "old wound" invents traits/history that the house placement alone cannot establish.
- Saturn in the 7th: "take forever to commit" and "wish for the perfect partner" are too absolute for a house-only baseline.
- Neptune in the 8th and similar rows: source-derived psychic certainty and deterministic consequence language require current-standard filtering.

These are review findings, not authorization to alter approved reader copy.

## Change boundary

This audit authorizes architecture clarification and review work only. It does not grant owner approval to revise any existing `approved` reader row. New or revised prose remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until the owner approves the exact wording.
