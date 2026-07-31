# Sky Placement Articles — `sky-article-v1`

> Article-tier section order, header behavior, conditional history/retrograde
> blocks, and public rising-sign horoscopes are superseded by
> [`TLDR-Sky-Article-Structure-FINAL.md`](./TLDR-Sky-Article-Structure-FINAL.md).
> This document remains authoritative for registry validity windows, archive
> serving, surface-scoped vocabulary, and ephemeris validation.

The fallback article assembly now follows the owner-supplied Sky Placement
Template V3 contract. The 42 `sky-placement`, `sky-placement-you`, and
`sky-placement-practice` rows are approved slot-tier inputs. Planet-sign
article modules such as `fallback-hook/sky-sign-copy/sun/{sign}` are staged
separately and remain invisible to readers while `needs_review`; preview and
Content Book tooling may resolve them with `allowUnreviewed`.

Updated: 2026-07-29

Sky placement pages are deterministic assemblies. The resolver selects approved
Content Book rows and combines them with dates, degrees, motion, station windows,
and aspects supplied by the ephemeris. It does not invent prose.

## Serving order

1. Select `sky-article/{planet}/{sign}/{entryYear}` only when it declares
   `article_structure: "final-v1"`, its validity window contains the
   engine-supplied date, and it is not archive-only.
2. Otherwise serve the approved V3 placement pair/frame rows.
3. Otherwise return `SOURCE_GAP`.

Expired or explicitly archive-only articles never serve as current sky. They are
available only from `sky/archive/{planet}/{sign}/{entryYear}` routes.

An article with `article_variant: "retrograde"` serves only while the
ephemeris reports retrograde motion or an active shadow phase. Outside that
window the page returns to the frame tier even when the sign-level validity
window still contains the current date.

## Article order

`TLDR-Sky-Assembly-Spec-V2.md` supersedes the earlier assembly order:

1. Title and current window.
2. First-pass preview, when the ephemeris reports one.
3. Planet-in-sign opening.
4. What this looks like in real life.
5. The useful expression.
6. The distortion.
7. Current exact aspects.
8. Key dates.
9. Personal chart layer.
10. Historical lookback, when useful.
11. Practical close.

The article registry, validity-window serving, scoped vocabulary, and import
validation rules in this document remain in force.

## Registry fields

A structured registry row may expose:

- `contentKey`
- `planet`
- `sign`
- `entry_year`
- `valid_from`
- `valid_to`
- `archive_only`
- `article_variant`
- `preview_note`
- `core_theme`
- `sign_jurisdiction`
- `lived_experience`
- `rulership_twist`
- `history_echo`
- `closing_charge`
- `key_dates`
- `key_dates_mode`
- `rising_horoscopes`

Current serving requires a matching planet/sign pair, a valid engine date, and a
non-archive row whose inclusive validity window contains that date. Archive
serving requires the exact registry key.

## Conditional modules

Preview copy renders only when the engine reports a prior brief ingress,
retrograde passage, or active shadow. An authored preview is not sufficient by
itself.

History copy renders:

- always for Uranus, Neptune, Pluto, Chiron, and the lunar nodes;
- for Saturn on its long recurrence and Jupiter on its 12-year recurrence;
- for Mercury, Venus, or Mars only during a retrograde;
- never for routine direct Sun or Moon placements.

## Surface-scoped vocabulary

Sky article/template assembly reads:

- `fallback-vocab/sky-planet-function/{planet}`
- `fallback-vocab/sky-sign-style/{sign}`

It must never resolve these slots from shared
`fallback-vocab/planet-function/{planet}` or
`fallback-vocab/sign-style/{sign}` rows. Those shared banks remain unchanged for
natal and other surfaces.

Existing approved placement families remain the V3 fallthrough:

- `fallback-hook/sky-placement-tagline/{planet}/{sign}`
- `fallback-hook/sky-placement-hook/{planet}/{sign}`
- `fallback-hook/sky-placement-lived/{planet}/{sign}`
- `fallback-hook/sky-placement-turn/{planet}/{sign}`
- `fallback-hook/sky-placement-moves/{planet}/{sign}`
- `fallback-hook/sky-placement-you/{planet}`
- `fallback-hook/sky-placement/{planet}`
- `fallback-hook/sky-placement-frame/{planet}`
- `fallback-hook/sky-placement-retro-frame/{planet}`
- `fallback-hook/sky-placement-practice/{planet}`

The date-anchored 42-row V3 supersede and both sky-scoped vocabulary banks were
owner-approved on July 29, 2026. Production assembles them with the existing
planet-in-sign rows rather than replacing those rows. The frame order is:
computed window and planet frame, planet-in-sign opening, lived pattern, useful
expression and distortion, computed aspect paragraphs, personal frame, and
practice close. Existing planet-sign moves continue to render. Fast-mover
frames do not render a separate Key Dates block.

The direct three-beat frame explains what the planet does, its useful
expression, and its distortion. For Mercury through Chiron, the approved
retrograde twin replaces only this module from shadow entry through shadow
exit. The direct twin resumes after the post-retrograde shadow.

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

## Key dates and fact boundary

Entry and exit dates, current degree, retrograde/shadow state, station facts, and
live aspect dates are ephemeris facts. Current articles receive these through
engine fields.

An authored archive may carry a `key_dates` block only when every date, sign, and
degree has passed the ephemeris import gate. A mismatch fails the import.
Editorial exemplars are not trusted as an independent fact source.

For current authored articles, Key Dates retain the older rule and position:
ingresses, stations, re-entries, shadow boundaries, and exits only, rendered
after the article body and before the closing charge.

Lunar-node placement content takes its sign, ingress, and egress directly from
the True Node ephemeris result (`SE_TRUE_NODE`). The South Node is derived at
the exact opposite longitude. No editorial date may override the computed
axis. The article registry still applies its validity guard, so an old-axis
article cannot leak across a computed ingress.

## Voice

- Direct, diagnostic, pragmatic, and boundary-aware.
- Concrete behavior before textbook jargon.
- No spiritual bypassing or generic motivational filler.
- Contractions are allowed when present in approved authored copy.
- Approved authored prose is immutable.
