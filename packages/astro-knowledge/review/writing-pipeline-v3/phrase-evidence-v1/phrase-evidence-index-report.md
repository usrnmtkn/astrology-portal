# Phrase evidence index v1

Status: **implemented; no billed calls**

## Counts

- Voice-bank entries indexed: **87** across **15** themes.
- Phrasebank JSON files inspected: **63**.
- Files containing explicit reader-facing owner-approved material: **5**.
- Reference, working, generated, or still-awaiting-signoff files excluded: **58**.
- Confirmed phrasebank rows examined: **273**.
- Partial, malformed, or joined source fields excluded: **10**.
- Complete eligible phrasebank rows before exact-copy deduplication: **263**.
- Unique complete phrasebank PHRASE records after exact-copy deduplication: **259**.
- Unique PHRASE entries after exact-copy deduplication: **346**.
- Entries missing a theme, subject tag, or failure tag: **0**.

The 87 voice-bank records are the 72 themed one-liners, 10 approved "this instead of that"
choices, and five approved lived-language groups. The 20 longer gold examples remain REGISTER
evidence rather than being relabeled as phrases.

Every retained phrasebank PHRASE record is the complete text field from one confirmed source
row. The builder does not split rows or join segments. The following source rows remain
preserved in the phrasebank but are excluded from PHRASE retrieval because they are not safe
standalone lines:

- `cc/quote/marie/032-pull-quote`: dependent Where-clause without a main clause. Source text: "Where your worth was measured by what you could offer, not who you are."
- `cc/quote/marie/044-pull-quote`: headline fragment rather than a complete line. Source text: "Where work meets worth."
- `cc/quote/marie/058-pull-quote`: noun-phrase fragment without a finite verb. Source text: "A lesson in worth, love, and what must be left behind in order to move forward."
- `cc/quote/marie/059-pull-quote`: heading and sentence joined in one source field. Source text: "Revisiting Past Relationships Love doesn’t always end with finality."
- `cc/quote/marie/065-pull-quote`: damaged coordination with a missing finite verb. Source text: "You are adaptable, you like choices, and a curious mind that enjoys exploring multiple subjects."
- `cc/quote/marie/068-pull-quote`: damaged contrast construction. Source text: "Not failure, failure has never scared you."
- `cc/quote/marie/073-pull-quote`: dependent noun-phrase fragment. Source text: "The ones you said you were done with, but never really left behind."
- `cc/quote/marie/076-pull-quote`: noun-phrase fragment without a finite verb. Source text: "A release of something that was never truly yours."
- `cc/quote/marie/080-pull-quote`: noun-phrase fragment without a finite verb. Source text: "The pressure to always be strong."
- `ms/quote/venus-virgo/daily-practice`: noun-phrase fragment without a finite verb. Source text: "Love as a daily practice of care, attention, and sacred service."

## Theme coverage

| Theme | Total | Voice bank | Phrasebank JSON |
|---|---:|---:|---:|
| authenticity-self-expression | 33 | 14 | 19 |
| boundaries-energy-protection | 18 | 7 | 11 |
| career-business-boundaries | 19 | 2 | 17 |
| channeling-creativity | 9 | 1 | 8 |
| credit-ownership-creative-theft | 8 | 6 | 2 |
| empathy-emotional-labor | 18 | 4 | 14 |
| family-chaos-career-livelihood-boundaries | 10 | 7 | 3 |
| family-roles-accountability-patterns | 8 | 6 | 2 |
| financial-growth-security | 7 | 3 | 4 |
| general-owner-language | 157 | 0 | 157 |
| health | 24 | 2 | 22 |
| relationships-compromise | 19 | 6 | 13 |
| retrograde-review | 21 | 16 | 5 |
| self-worth-earning-power | 11 | 3 | 8 |
| self-worth-personal-power | 29 | 6 | 23 |
| strategy | 23 | 4 | 19 |

## Phrasebank file classification

- `tldr-astro-phrasebank/phrasebank/cc-aspect-leadins.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-angles.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-batch2.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-chiron-angles.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-fast.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-jupiter.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-outer-angles.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-outer.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed-saturn.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-aspect-pair-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-authored-content.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-chiron-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-compatibility-cards.json`: **reference-or-working-excluded**; 0 eligible rows. working or pending-review material
- `tldr-astro-phrasebank/phrasebank/cc-compatibility-writeups.json`: **reference-or-working-excluded**; 0 eligible rows. working or pending-review material
- `tldr-astro-phrasebank/phrasebank/cc-composite-aspect.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-composite-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-composite-typed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-dignity-paragraphs.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-empty-house-model.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/cc-fallback-hooks.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-horoscope-surface-templates.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-intercepted-authored.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-lunation-by-sign-authored.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-marie-site-templates.json`: **mixed-confirmed-lines-included-templates-excluded**; 27 eligible rows. only exact.tier=CONFIRMED lines qualify; REVIEWED_TEMPLATE forms are excluded
- `tldr-astro-phrasebank/phrasebank/cc-moon-phase-bank.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-moon-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-natal-angle-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-natal-angles-authored.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-natal-aspect.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-natal-retrograde-authored.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json`: **reference-or-working-excluded**; 0 eligible rows. working or pending-review material
- `tldr-astro-phrasebank/phrasebank/cc-node-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-planet-in-house-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-planetary-horoscope.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-ruler-bridge.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-ruler-sign-clauses.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-ruling-planet-advice-drafts.json`: **reference-or-working-excluded**; 0 eligible rows. working or pending-review material
- `tldr-astro-phrasebank/phrasebank/cc-ruling-planet-advice.json`: **reader-facing-owner-approved-included**; 24 eligible rows. tier=CONFIRMED and may serve verbatim
- `tldr-astro-phrasebank/phrasebank/cc-sect-paragraphs.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-served-fields.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/cc-sky-collective-card-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-sky-collective-detail-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-sky-events-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-sky-points-authored.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-slot-resolution-map.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/cc-slot-templates.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-stellium-authored.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-synastry-overlay-full.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-synastry-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. working or pending-review material
- `tldr-astro-phrasebank/phrasebank/cc-synastry-web-bundle.json`: **reference-or-working-excluded**; 0 eligible rows. working or pending-review material
- `tldr-astro-phrasebank/phrasebank/cc-tails-reviewed.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-transit-activation-model.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/cc-transit-house-model.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/cc-transit-house.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/cc-vocab.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/houses.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/marie-confirmed-quotes.json`: **reader-facing-owner-approved-included**; 182 eligible rows. tier=CONFIRMED and may serve verbatim
- `tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
- `tldr-astro-phrasebank/phrasebank/ms-lunation-by-sign-confirmed.json`: **reader-facing-owner-approved-included**; 16 eligible rows. tier=CONFIRMED and may serve verbatim
- `tldr-astro-phrasebank/phrasebank/ms-satori-articles-confirmed.json`: **reader-facing-owner-approved-included**; 14 eligible rows. tier=CONFIRMED and may serve verbatim
- `tldr-astro-phrasebank/phrasebank/reviewed-clauses.json`: **reference-or-working-excluded**; 0 eligible rows. support, resolver, model, or reference data rather than approved AVAILABLE LINES
- `tldr-astro-phrasebank/phrasebank/sky-historical-lookback.json`: **reference-or-working-excluded**; 0 eligible rows. reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off
