# Sky Placement Articles — `sky-article-v1`

Updated: 2026-07-29

Sky placement pages are deterministic assemblies. The resolver selects approved
Content Book rows and combines them with dates, degrees, motion, station windows,
and aspects supplied by the ephemeris. It does not invent prose.

## Serving order

1. Exact approved `authored/sky-ingress/{planet}/{sign}` article.
2. Complete approved Content Book placement assembly.
3. `SOURCE_GAP`.

The legacy three-beat pair rows remain the coverage fallback while the structured
authored family is populated. They must not be rewritten or expanded in the
resolver.

## Article order

1. Window block: computed transit dates and current degree.
2. Preview or shadow note: conditional on a computed retrograde or shadow phase.
3. Core theme.
4. Sign jurisdiction paragraph.
5. Lived experience.
6. Traditional-rulership twist.
7. Historical echo: optional, authored only.
8. Key dates: computed ingress, shadow, station, and exit facts.
9. Closing charge.

Closely applying sky aspects may appear after the article's authored context and
before the computed key-date block.

## Structured authored fields

An `authored/sky-ingress/{planet}/{sign}` row may expose:

- `preview_note`
- `core_theme`
- `sign_jurisdiction`
- `lived_experience`
- `rulership_twist`
- `history_echo`
- `closing_charge`

The first five fields other than `preview_note` are required for a structured
article. `preview_note` renders only during a computed retrograde or shadow
phase. `history_echo` is optional. `closing_charge` renders after the key dates.

## Traditional rulers

| Sign | Ruler |
|---|---|
| Aries | Mars |
| Taurus | Venus |
| Gemini | Mercury |
| Cancer | Moon |
| Leo | Sun |
| Virgo | Mercury |
| Libra | Venus |
| Scorpio | Mars |
| Sagittarius | Jupiter |
| Capricorn | Saturn |
| Aquarius | Saturn |
| Pisces | Jupiter |

Uranus, Neptune, and Pluto may be computed placements or aspect layers. They are
never default sign rulers.

## Existing phrase inventory

Coverage assemblies continue to read these approved families:

- `sky-placement-tagline/{planet}/{sign}`
- `sky-placement-hook/{planet}/{sign}`
- `sky-placement-lived/{planet}/{sign}`
- `sky-placement-turn/{planet}/{sign}`
- `sky-placement-moves/{planet}/{sign}`
- `sky-placement-you/{planet}`
- `sky-placement/{planet}`
- `sky-placement-practice/{planet}`
- `fallback-vocab/sign-style/{sign}`
- `fallback-vocab/sign-does/{sign}`
- `fallback-vocab/planet-function/{planet}`
- `fallback-vocab/planet-topic/{planet}`
- `fallback-vocab/planet-verb/{planet}`
- `fallback-vocab/sign-adverb/{sign}`
- `fallback-vocab/sign-need/{sign}`

## Motion

- Direct motion emphasizes visible execution and outward decisions.
- Retrograde and shadow phases emphasize review, unlearning, stopping leaks, and
  auditing earlier choices.

Motion language must come from an approved authored note or
`fallback-hook/transit-retro/{planet}`. The UI must not synthesize an
interpretation from the motion flag.

## Fact boundary

The following values are always engine-computed:

- entry and exit dates;
- current degree;
- retrograde and shadow state;
- station and shadow dates;
- live aspect dates.

They may appear only in declared fact fields or computed UI blocks. Literal
dates in an editorial exemplar are calibration references, not reusable prose.

## Voice

- Direct, diagnostic, pragmatic, and boundary-aware.
- Concrete behavior before textbook jargon.
- No spiritual bypassing or generic motivational filler.
- Contractions are allowed on this published-article surface when they are part
  of approved copy.
- Approved authored prose is immutable.
