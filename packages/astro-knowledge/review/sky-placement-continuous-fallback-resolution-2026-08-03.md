# Sky Placement continuous fallback resolution — 2026-08-03

## Outcome

The current reader does not use the retired five-row `tagline / hook / lived / turn / moves` package for the Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, or the Nodes. It requires one reviewed `sky-placement-continuous-v2` row per planet-sign placement.

The governed Sol writer now targets that current runtime contract directly:

- writer fields: `opening`, `tension`, `development`, `close`, `try_this`;
- engine fields: headline, fact line, entry and exit dates, and approved aspect insert;
- output status: `needs_review`;
- reader eligibility: false;
- owner approval, promotion, and canonical status: false.

Terra reviews the untouched candidate after deterministic checks. Neither model can publish or approve it.

## Existing Resources review files

All five files in `/Users/mprez/Downloads/Resources` pass the structural importer, but they predate the active Current Sky language rules and must not be imported unchanged.

| Review file | Units | Structurally valid | Units failing current lint |
| --- | ---: | ---: | ---: |
| Sun All Signs | 11 | 11 | 11 |
| Mercury All Signs | 12 | 12 | 12 |
| Venus All Signs | 12 | 12 | 11 |
| Mars All Signs | 12 | 12 | 12 |
| Slow Movers Current | 7 | 7 | 7 |
| **Total** | **54** | **54** | **53** |

The repeated conflicts are second person, generic `people`, `the room`, and older AI-shaped phrasing. The files remain `needs_review`; none was imported or approved.

## Reader state

- One continuous row is currently approved: Sun in Leo.
- The Moon and Lilith still use the non-continuous pair fallback. Moon in Scorpio now fails closed because its rejected turn was quarantined.
- Venus in Virgo remains source-gapped in the current continuous reader. Its rejected moves were quarantined for provenance.
- The exact rejected Moon-in-Scorpio turn, its derived tagline, and the rejected Venus-in-Virgo moves are no longer reader-eligible.

## Writer readiness

The full 168-placement grid is audited separately in `sky-placement-fallback-readiness-2026-08-03.json`.

- 12 Jupiter placements can compile a governed writer packet now.
- 108 planet-sign fact files remain `DRAFT` and correctly block writing.
- 12 Lilith files are `LIVE`, but the writer fact packet is incomplete because the governed planetary overview/sign-expression source is missing.
- 36 Chiron and Node combinations have no placement fact file in the writer fact bank.

Draft or missing astrology was not promoted merely to increase coverage.

## Commands

No-call packet preview:

```bash
npm run plan:sky-placement-writer -w @tldr/astro-knowledge -- --planet jupiter --sign capricorn
```

Live use requires explicit owner authorization and produces one Sol draft plus one Terra review:

```bash
npm run write:sky-placement:live -w @tldr/astro-knowledge -- --planet jupiter --sign capricorn
```

Coverage audit:

```bash
npm run audit:sky-placement-fallback-readiness -w @tldr/astro-knowledge
```

## Governance confirmation

No billed model call was made. No review file was imported. No candidate was approved, promoted, made canonical, or added to generation evidence. No active model changed.
