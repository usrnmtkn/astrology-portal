# Surface → rich content map (the prose already exists)

The primary content for each surface is Marie's already-composed rich prose in the phrasebank. The
mustache templates + emergency floor are only the safety net *beneath* these. Serve the rich file
first; fall to the floor only when a specific row is missing.

| App surface | Primary rich file (serve this) | records |
|---|---|---|
| Natal aspects | `cc-natal-aspect.json` (experience/guidance/paragraphs) | 214 |
| Transit-to-natal aspects | `cc-aspect-pair-reviewed*.json` (fast/jupiter/saturn/outer/angles/chiron) | ~470 |
| Transit through house | `cc-transit-house.json` (bespoke readings) | 84 |
| Planet in sign | `cc-planet-in-sign-reviewed.json` (natal story + collective shift) | 120 |
| Planet in house | `cc-planet-in-house-reviewed.json` | 120 |
| Natal angles | `cc-natal-angle-reviewed.json` | 48 |
| Moon / nodes / Chiron | `cc-moon-reviewed`, `cc-node-reviewed`, `cc-chiron-reviewed` | 20 / 24 / 49 |
| Chart-ruler advice (CC + Aesop) | `cc-ruling-planet-advice.json` (+ `-drafts`) | CC + Aesop batches |
| Composite (type-aware) | `cc-composite-typed.json` | 882 |
| Composite aspects / placements | `cc-composite-aspect.json`, `cc-composite-reviewed.json` | 225 / 130 |
| Synastry | `cc-synastry-reviewed.json`, `cc-synastry-overlay-full.json` | 99 / 120 |
| Sky — collective placement | `cc-sky-collective-card/detail-reviewed.json` | 21 / 21 |
| Sky — events (ingress/lunation/etc.) | `cc-sky-events-reviewed.json`, `cc-lunation-by-sign-authored.json` | 23 / 20 |
| Retrograde (whole per-planet) | authored-content `transit/retrograde` (9) + `ms-*` confirmed | 9 |
| Planetary horoscope | `cc-planetary-horoscope.json` | 60 |
| Stelliums / intercepts / retro | `cc-stellium-authored`, `cc-intercepted-authored`, `cc-natal-retrograde-authored` | 24 / 12 / 9 |
| Marie verbatim quotes | `marie-confirmed-quotes.json`, `ms-*-confirmed.json` | 127 + |

## Emergency floor (only when the rich row above is missing)
`cc-fallback-hooks.json` (447), `cc-slot-templates.json` (63 mustache), `cc-vocab.json` (1,086),
`cc-authored-content.json` (1,109), `cc-moon-phase-bank.json` (30), routed by
`runtime_key_bridge` in `tldr-astro-authored-library-COMPLETE.json`, resolved via
`cc-slot-resolution-map.json`. Where the floor has a whole Marie piece (retrograde, ingress,
aspect-pair, planet-through-house, planet-in-sign), the bridge serves it whole (`prefer: record`);
it only shreds into a template for the handful of surfaces with no bespoke piece.

## CRITICAL: natal vs sky vs horoscope use DIFFERENT fields of the same record
Several rich records serve multiple surfaces from **different fields** — never cross them, or you get
sky/seasonal language on a natal page (the bug fixed here). Each record's `surfaces` array is the
authority:

| Record | `surfaces` | Natal field | Sky / horoscope field |
|---|---|---|---|
| `cc-planet-in-sign-reviewed` | `me.natal_placement`, `sky.planet_sign` | `natal_sign_story` | `collective_shift` |
| `cc-planet-in-house-reviewed` | `me.natal_placement`, `home.planetary_horoscope` | `house_integration` | `home_scene` |

- **Natal placement** (`you.natal-placement`, `you.natal-house-placement`): use `natal_sign_story`
  + `house_integration`. NEVER `collective_shift` / `home_scene` / `vocab/planet-in-sign` (those are
  "Aquarius Season begins with a bang" seasonal copy — wrong on a birth chart).
- **Sky placement / season** (`sky.seasonal-current`, `sky.planetary-placement`, `sky.lunar-cycle`):
  use `collective_shift`.
- **Planetary horoscope** (`home.planetary_horoscope`): use `home_scene`.

The runtime should route by the record's `surfaces` field + the surface's domain, not by a hand map.

## Serving order (precedence)
1. Exact approved rich row for the surface (the files in the table), when LIVE.
2. Emergency floor whole-piece (bridge `prefer: record`).
3. Emergency floor template (mustache), slots resolved + fallbacks.
4. `SOURCE_GAP` (should be unreachable given the guide-phrase net).

Nothing here invents copy; it all traces to Marie's composed phrasebank.
