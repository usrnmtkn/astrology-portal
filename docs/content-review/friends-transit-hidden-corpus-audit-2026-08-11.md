# Friends transit detail hidden-corpus audit

Date: 2026-08-11
Scope: deterministic inventory only; no prose was written or revised.

## Policy boundary

Friends transit detail articles now show an explanatory paragraph only when the resolved content row carries `approval.approvalLevel: "exact_owner_approved"`. A legacy `review_status: "approved"` value is not exact-wording provenance and does not pass the gate.

The gate applies to the expanded detail article opened from Friends > Charts > Transits. The list-row previews are unchanged. The You transit surfaces also remain unchanged because this policy was authorized specifically for Friends detail cards.

Titles, timing, orb information, and the factual "What this looks like in space" block remain visible on aspect-transit details. House-transit details retain their existing title and timing metadata; they do not currently have an orb or mechanics block because a house crossing is not an exact aspect.

## Inventory and approval state

All counts below come from the current governed source files on `main`:

- `apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json`
- `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json`

| Reader-copy family | Key prefix | Rows/source units | Legacy status | Structured exact approval | Friends detail result |
| --- | --- | ---: | --- | ---: | --- |
| Exact/grouped transit-to-natal cards | `authored/transit-aspect/` | 377 | 377 approved | 0 | hidden |
| Transit-to-natal inserts | `authored/transit-aspect-insert/` | 2 | 2 approved | 0 | hidden |
| Soft transit effect bank | `fallback-hook/transit-effect-soft/` | 202 | 202 approved | 0 | hidden |
| Hard transit effect bank | `fallback-hook/transit-effect-hard/` | 202 | 202 approved | 0 | hidden |
| Legacy complete house-transit cards | `authored/transit-house/` | 108 | 108 approved | 0 | hidden |
| Layered house-transit introductions | `authored/transit-house-intro/` | 84 | 84 approved | 0 | hidden |
| Planet/sign/house layers | `authored/transit-house-sign/` | 1,008 | 1,008 approved | 0 | hidden |
| Generic planet-through-house effects | `fallback-hook/transit-effect-house/` | 13 | 13 approved | 0 | hidden |
| Retrograde house overlays | `fallback-hook/transit-house-retro-overlay/` | 5 | 5 approved | 0 | hidden |
| Exact-event house frames | `fallback-hook/transit-house-event-frame/` | 6 | 6 approved | 0 | hidden |
| Exact-event planet/sign wants | `fallback-hook/transit-house-event-wants/` | 169 | 169 approved | 0 | hidden |
| Exact-event natal-point clauses | `fallback-hook/transit-house-event-natal/` | 18 | 18 approved | 0 | hidden |
| Exact-event scenes | `fallback-hook/transit-house-event-scenes/` | 2 | 2 approved | 0 | hidden |

Totals:

- Transit-to-natal: 783 untraced source units.
- House-transit: 1,413 untraced source units.
- Combined hidden corpus: 2,196 untraced source units.
- Directional bond effects: 139 exact-owner-approved rows remain visible.

The source-unit total is not a card count. The renderer combines and reuses some units across many chart facts.

## Consuming surfaces

### Transit-to-natal

- Friends chart transit list: uses the same normalized copy for the short preview; unchanged by this detail-only gate.
- Friends transit detail: explanatory sections are now provenance-gated and the 783 untraced units do not render there.
- You transit list, daily transit links, and You transit detail: use `normalizePersonalTransitSurface`; unchanged by this Friends-only gate.
- Friends relationship timing helpers also use personal-transit previews; unchanged.

### House-transit

- Friends house-transit list: uses the normalized house copy for its preview; unchanged by this detail-only gate.
- Friends house-transit detail: explanatory sections are now provenance-gated and the 1,413 untraced units do not render there.
- You house-transit cards/details: use `normalizeTransitHouseSurface`; unchanged by this Friends-only gate.

### Bond effects

- Friends connection-transit list and detail use `renderBondTransit`.
- The canonical 139 directional rows carry exact approval records and continue to render on detail cards.
- The lazy relationship bundle is pinned to those canonical rows so an older reviewed bond pass cannot overwrite their prose or provenance.

## Representative problem copy

These are quotations from the hidden source corpus, not replacement proposals.

### Family A: authored transit-to-natal cards

1. `authored/transit-aspect/mercury/ascendant/hard`

   > The talk runs ahead of the listening. Enough words and people start disagreeing just to make you pause; analyses of other people, said out loud, cut deeper than intended.

   Problem: the opener is an abstraction, the behavior chain is hard to parse, and the card moves into lawyer/doctor/partner scenes without establishing one recognizable interaction.

2. `authored/transit-aspect/venus/mars/soft`

   > The direct ask lands without offending anyone. Wanting something and staying warm stop being opposites: the first move at a party, the honest request, the first date that actually goes well.

   Problem: it guarantees social reception and stacks unrelated examples instead of explaining the transit's direction.

3. `authored/transit-aspect/venus/ascendant/soft`

   > The shyness stays home today. First impressions run almost guaranteed favorable, the party goes your way, and children are genuinely good company.

   Problem: personified shorthand, outcome guarantees, and unrelated claims make the transit sound predictive rather than explanatory.

### Family B: grouped fallback transit effects

1. `fallback-hook/transit-effect-hard/chiron`

   > {{natalArea}} brush against an old sore spot, and reactions can run bigger than the moment deserves. Pay attention to the sting, because it points directly to where healing wants to happen.

   Problem: generic wound/healing language, coaching, and no specific behavior.

2. `fallback-hook/transit-effect-soft/neptune`

   > {{natalArea}} soften at the edges, and imagination feeds them instead of confusing them. Good days for creative work and real rest.

   Problem: metaphor replaces the mechanism and the ending is a generic recommendation.

3. `fallback-hook/transit-effect-hard/pluto`

   > {{natalArea}} come under unyielding pressure, drawing hidden control struggles into the open. Whatever you have been gripping too tightly is asking for a softer touch.

   Problem: stock pressure/control language ends in a personified reassurance rather than a concrete consequence.

### Family C: complete and layered house-transit cards

1. `authored/transit-house/chiron/4`

   > The past does not have to be your permanent home. This transit helps you build a living space and private life that reflect who you are today, even if your family does not fully get it.

   Problem: the card shifts from a broad list of family scenarios into a slogan and treatment advice.

2. `authored/transit-house/neptune/7`

   > For a long stretch, one-to-one relationships run on guesswork: hidden resentments, idealized readings of each other, words meant one way that landed another.

   Problem: it presents several possible relationship problems as one fixed condition, then turns into legal and relationship advice.

3. `authored/transit-house/pluto/2`

   > The lean part is a phase, not a sentence. Let the old way of earning end when it is ending. What funds the next part of your life usually appears after you stop propping up the old one.

   Problem: slogan-like reassurance and an unsupported promise about future income replace a bounded explanation.

### Family D: house-transit assembly hooks

1. `fallback-hook/transit-effect-house/chiron`

   > {{houseTopic}} touch an old sore spot. What stings in this area is pointing at something worth healing, not just something that hurts.

   Problem: the same wound/healing template is applied to every house without showing what happens in that house.

2. `fallback-hook/transit-house-event-natal/sun`

   > your Sun holds the plot of who you are becoming

   Problem: a compressed metaphor is used as a detachable noun clause rather than a plain description.

3. `fallback-hook/transit-house-event-scenes/mars/neptune/hard`

   > Caught in the middle, clarity evaporates right at the point of impact: useless arguments, random fatigue, and suspicions that dissolve on contact with reality. Focus on what is concrete; moving toward a clear vision beats fighting the mist.

   Problem: several metaphors, unrelated symptoms, and coaching are assembled into one scene that does not survive a single read.

## Replacement-writing boundary

No replacement copy is proposed here. A later writing scope should decide separately whether to replace:

1. exact transit-to-natal cards;
2. grouped fallback effect banks;
3. complete house-transit cards; and
4. layered house-transit components.

That work should create exact owner-approval records before any paragraph becomes eligible for Friends transit detail rendering.
