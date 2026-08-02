# Owner article full-corpus surface audit — August 1, 2026

## Outcome

All 47 astrology HTML files in the owner-provided Marie Satori mirror are now
accounted for. Four were already active long-form fixtures, fifteen formed the
initial diagnostic corpus, and the final twenty-eight have now been extracted,
hashed, and structurally reviewed from their authored `div.rte` bodies.

The final twenty-eight do not provide a blind test for the single-event planet
article judge. Their actual content forms four different editorial surfaces:

| Surface family | Count | Structural character |
| --- | ---: | --- |
| Lunation and eclipse | 16 | One New Moon, Full Moon, or eclipse; event interpretation and usually twelve rising-sign blocks |
| Season and solstice | 6 | A solar-season arc containing several dated events and twelve sign blocks |
| Annual or monthly overview | 3 | Multiple events across a calendar span rather than one planet event |
| Weekly edition | 3 | Several transits organized into a seven-day narrative and weekly sign blocks |

These articles are valuable owner references, but their structures must not be
forced through the current planet-article judge. They are excluded from its
paid evaluation plan and preserved for future surface-specific work.

## Method

The audit extracted each complete authored body, then reviewed its title,
event scope, headings, word count, opening and closing form, and horoscope-block
structure. Page navigation, products, scripts, and Shopify chrome were removed.
No article copy was revised, no dates became engine facts, and no API calls were
made.

Every fixture has both a normalized-body SHA-256 and a source-body-HTML SHA-256
in the [owner corpus manifest](../../voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/manifest.json).

## Twenty-eight newly accounted-for articles

| Article | Surface | Words | Source slug |
| --- | --- | ---: | --- |
| 2025 New and Full Moons | Annual lunation calendar | 6,665 | `2025-new-and-full-moons` |
| 2025 Overview and Horoscopes for All Zodiac Signs | Annual overview | 10,591 | `2025-overview` |
| Aquarius Full Moon 2025 | Full Moon | 2,864 | `aquarius-full-moon-2025` |
| Aquarius Season 2025 | Season | 3,649 | `aquarius-season-2025` |
| Cancer Full Moon and Horoscopes — January 2025 | Full Moon | 4,000 | `cancer-full-moon-horoscopes-january-2025` |
| Cancer New Moon 2025 | New Moon | 3,960 | `cancer-new-moon-2025` |
| First New Moon of 2025: Aquarius New Moon | New Moon | 4,733 | `first-new-moon-of-2025-aquarius-new-moon` |
| Full Moon Eclipse in Pisces 2025 | Eclipse | 2,487 | `full-moon-eclipse-in-pisces-2025` |
| Full Moon in Aries | Full Moon | 4,259 | `full-moon-in-aries` |
| Full Moon in Taurus 2025 | Full Moon | 3,791 | `full-moon-in-taurus` |
| Gemini New Moon 2025 | New Moon | 2,406 | `gemini-new-moon-2025` |
| Gemini Season 2025 | Season | 3,307 | `gemini-season-2025` |
| Leo Full Moon 2025: The Breaking Point | Full Moon | 4,396 | `leo-full-moon-2025` |
| Leo New Moon 2025 | New Moon | 3,270 | `leo-new-moon-2025` |
| Libra New Moon | New Moon | 4,365 | `libra-new-moon` |
| Libra Season & Autumn Equinox | Season | 6,445 | `libra-season-autumn-equinox` |
| Monthly Horoscopes June 2025 | Monthly overview | 2,504 | `monthly-overview-june-2025` |
| New Moon Solar Eclipse in Virgo | Eclipse | 4,214 | `new-moon-solar-eclipse-in-virgo` |
| Pisces New Moon 2025 | New Moon | 5,356 | `pisces-new-moon-2025` |
| Pisces Season 2025 | Season | 7,418 | `pisces-season-2025` |
| Sagittarius Full Moon 2025 | Full Moon | 3,282 | `sagittarius-full-moon-2025` |
| Summer Solstice | Solstice/season | 2,868 | `summer-solstice` |
| This Week's Astrology: August 24th–31st | Weekly edition | 3,733 | `this-weeks-astrology-august-24th-31st` |
| This Week's Astrology: August 30–September 7, 2025 | Weekly edition | 2,123 | `this-weeks-astrology-august-30-september-7-2025` |
| Total Lunar Eclipse in Virgo 2025 | Eclipse | 2,955 | `total-lunar-eclipse-in-virgo` |
| Virgo New Moon August 23rd 2025 | New Moon | 3,144 | `virgo-new-moon-august-23rd-2025` |
| Virgo Season 2025 | Season | 4,310 | `virgo-season-2025` |
| Weekly Horoscopes — September 7th–14th 2025 | Weekly edition | 2,765 | `weekly-horoscopes-sept-7-14-2020` |

## Source-preservation notes

- The 2025 New and Full Moons article contains PT labels. They remain
  historical owner text only; the app continues to compute runtime dates and
  times in the user's local timezone.
- The Cancer and Sagittarius Full Moon articles contain explicit owner edit
  notes correcting earlier aspect interpretations. Those notes remain
  provenance, not canonical engine facts.
- The weekly September 7–14 article's source slug says `2020`, while its page
  title and content say `2025`. The original slug is preserved rather than
  silently corrected.
- Owner-verbatim CC/SD construction matches remain exempt only from the
  anti-imitation check. This does not automatically approve generated copy
  that repeats those constructions.

## Recommended use

The sixteen lunation/eclipse pieces are the strongest next corpus: they are
large enough to define a separate lunation long-form rubric with their own
weak controls and held-out policy. The six season/solstice pieces can then
define a season surface. Annual/monthly and weekly pieces should remain
separate because their multi-event pacing and closes solve different editorial
problems.

None of these references should enlarge the current 14-text planet-article
evaluation or its 70-call five-sample plan.
