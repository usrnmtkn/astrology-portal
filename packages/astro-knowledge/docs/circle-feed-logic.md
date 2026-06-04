# TLDR Astro Circle Feed Knowledge Logic

This document defines the product logic for ranking and rendering knowledge-backed feed items. It is a knowledge and scoring contract, not a UI specification.

## Product Formula

Every feed item should follow this logic:

```text
sky event + personal chart activation + timing relevance + life area + social context = feed-worthy insight
```

The product goal is not astrology for astrology's sake. The app should use astrology as timing, context, and language for what people are already feeling.

## Core Questions

The feed should answer:

- What is happening in the sky today, this week, or this month?
- Why does this matter for this person specifically?
- Who in the user's circle is feeling something similar?
- What is happening between two people right now?

## Signal Pipeline

Each candidate insight should move through this pipeline:

1. Detect the sky event.
2. Check personal chart activation.
3. Apply Hellenistic relevance modifiers.
4. Check relationship activation.
5. Check circle-wide repetition.
6. Map to theme and life area.
7. Score and rank.
8. Render as a card.
9. Apply privacy rules.
10. Allow save, journal, share, or discuss.

## Signal Types

### Sky Events

Collective events include ingresses, exact or near-exact aspects, lunations, stations, retrogrades, and major Moon contacts.

Sky events are not automatically feed-worthy. They become feed-worthy when they are exact, personally relevant, socially relevant, or part of a larger pattern.

### Personal Activations

High-priority personal contacts include:

- Sun, Moon, Ascendant, and Midheaven
- chart ruler
- Mercury, Venus, and Mars
- lord of the year
- activated profection house ruler
- natal aspect patterns

Personal transit cards should require whole-sign house context when the user chart is available.

### Relationship Activations

Relationship relevance increases when current astrology touches both charts, an existing synastry aspect, a composite planet or angle, a house overlay, or an existing pressure point between two charts.

Dynamic relationship timing belongs in relationship surfaces. Static compatibility belongs in compatibility surfaces.

High-signal relationship timing includes:

- a current transit to composite Sun, Moon, Venus, Mars, Saturn, Ascendant, or Midheaven
- a current transit to a close synastry contact already ranked as important
- the same sky event hitting both people's personal planets or angles
- a current transit activating one person's relationship houses and the other's personal planet
- Saturn, Mars, Venus, Moon, or Jupiter contacts that become exact by transit, progression, or lunation

Composite timing should describe what the relationship is being asked to deal with now. Synastry timing should describe how one person is activating the other now.

### Circle Activations

Circle relevance increases when multiple people share a house activation, planet theme, lord of the year, profection house, or similar relationship pressure.

Privacy rules determine whether names, anonymous counts, or general labels are shown.

## Hellenistic Relevance Layer

This layer should mostly work under the hood. Technical terms should be optional.

- Whole-sign houses determine where a transit lands.
- Annual profections boost the activated house, its ruler, planets inside it, and the lord of the year.
- Sect modifies Mars and Saturn tone.
- Angularity boosts 1st, 4th, 7th, and 10th house activations, plus Ascendant and Midheaven contacts.
- Aversion can support blind spot cards.
- Dignity and planetary condition modify tone, confidence, and difficulty.
- Lots of Fortune and Spirit can add advanced context.
- Time-lord stacking can add a "Louder Than Usual" label when three or more timing layers agree.

## Ranking Scores

### Transit Importance

| Signal | Points |
| --- | ---: |
| Outer planet transit to natal placement | 35 |
| Lunation | 30 |
| Exact sky aspect | 25 |
| Personal planet transit to natal planet | 20 |
| Moon aspect | 10 |
| Ingress | 10 |
| Background placement | 3 |

### Orb Tightness

| Orb | Points |
| --- | ---: |
| 0 to 0.5 degrees | 30 |
| 0.5 to 1 degree | 20 |
| 1 to 2 degrees | 10 |
| 2 to 3 degrees | 5 |

### Personal Relevance

| Activation | Points |
| --- | ---: |
| Sun, Moon, Ascendant, Midheaven | 35 |
| Chart ruler | 35 |
| Lord of the year | 35 |
| Mercury, Venus, Mars | 25 |
| Jupiter, Saturn | 18 |
| Outer natal planet | 12 |
| Angular house | 20 |
| Profected house | 20 |
| Lot of Fortune or Spirit | 15 |

### Relationship Relevance

| Signal | Points |
| --- | ---: |
| Transit activates composite Sun, Moon, Venus, Saturn, Ascendant, or Midheaven | 35 |
| Transit activates major synastry aspect | 35 |
| Same transit hits both users | 30 |
| Transit activates one person's chart ruler and the other's personal planet | 25 |
| Transit activates relationship house overlay | 20 |
| Transit activates composite Mars, Mercury, Jupiter, Uranus, Neptune, or Pluto | 15 |
| Transit activates a close Moon, Venus, Jupiter, Mars, or Saturn synastry contact | 15 |

### Traditional Relationship Modifiers

| Signal | Points |
| --- | ---: |
| Close Moon contact between charts | 20 |
| Close Venus or Jupiter contact to personal planet or angle | 15 |
| Close Saturn or Mars contact to personal planet or angle | 15 |
| Contact to Ascendant, Midheaven, or angular house | 15 |
| Contact involves Lot of Fortune or Spirit | 8 |
| Dignity or sect supports the planet's condition | 5 |
| Dignity or sect makes the planet harder to use | -5 |

### Circle Relevance

| Signal | Points |
| --- | ---: |
| Affects 3 or more circle members | 20 |
| Affects 5 or more circle members | 35 |
| Repeated house theme | 15 |
| Repeated planet theme | 15 |
| Multiple people share same profection house | 20 |
| Multiple people share same lord of the year | 20 |

### Fatigue And Novelty

| Condition | Points |
| --- | ---: |
| New theme not shown recently | 10 |
| Same theme shown in last 3 days | -10 |
| Same planet overrepresented this week | -10 |
| User muted theme | -30 |
| User saved similar content before | 10 |

## Theme Taxonomy

Feed items should be organized by human theme, not planet labels.

- Power: control, self-respect, boundaries, influence, agency
- Love: closeness, trust, desire, attachment, partnership
- Work: ambition, responsibility, opportunity, visibility, burnout
- Home: family, privacy, roots, belonging, emotional foundation
- Voice: communication, truth, storytelling, clarity, misunderstanding
- Body: rest, stress, routine, health habits, sustainable energy
- Future: change, risk, freedom, reinvention, disruption
- Creativity: expression, ownership, art, inspiration, visibility

## Copy Contract

Every rendered card should answer:

1. What is happening?
2. Where does it land?
3. Why does it matter?
4. What should the user notice or do?

Titles should sound like human insight, not generated planet labels.

Examples:

- Bad: Uranus facilitating thinking
- Better: A new way to think
- Bad: Sun allowing for responsibility
- Better: A plan can hold today
- Bad: Neptune challenging thinking
- Better: The story may be blurry

Do not overclaim. Avoid deterministic predictions about death, divorce, pregnancy, illness, job loss, legal outcomes, guaranteed money, or abuse accusations.

## Privacy Contract

Default shared content should not expose raw chart data.

Supported sharing levels:

- Private
- Insight only
- Astrology details
- Full chart

Relationship timing requires consent from both people.
