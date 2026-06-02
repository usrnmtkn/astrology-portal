# Timing Engine

This folder is app logic, not authored meaning.

Use it to answer: "Which active transit should the app care about for this user right now?"

Use the knowledge bundle to answer: "What does that transit mean?"

## What It Does

- Computes annual profection context from age or birth/current dates.
- Uses traditional sign rulers for Lord of the Year.
- Identifies natal planets in the profected sign.
- Checks aspect/orb activation.
- Applies same-moment aspect validity rules separately from transit-to-natal lookups.
- Calculates Moon phase and basic ritual timing gates.
- Scores planetary condition through dignity, sect, angularity, and solar condition.
- Adds benefic/malefic testimony adjustments.
- Detects major lifecycle windows for Jupiter, Saturn, Uranus, Chiron, nodes, and progressed lunation.
- Applies modern-point display and callout rules.
- Scores candidate transits by body, aspect, target, orb, applying/separating phase, angles, and annual activation.
- Returns ranked transits with plain priority labels.

## What It Does Not Do

- It does not calculate planetary positions.
- It does not create interpretations.
- It does not choose a house system.
- It does not turn a score into a guaranteed event.
- It does not replace the app's ephemeris, chart, or progression calculations.

The chart engine should calculate natal placements and active transit candidates first. This timing engine ranks those candidates. The app then pulls meaning from `dist/`.

## Example

```js
const {
  buildAnnualTimingContext,
  rankTransits
} = require("@yourorg/astro-knowledge/timing-engine");

const timing = buildAnnualTimingContext({
  birthDate: "1994-04-12",
  currentDate: "2026-06-02",
  ascendantSign: "scorpio",
  natalPlanets: [
    { planet: "venus", sign: "leo" },
    { planet: "mars", sign: "aquarius" }
  ]
});

const ranked = rankTransits([
  {
    transitingPlanet: "saturn",
    natalTarget: "venus",
    aspect: "opposition",
    orbDegrees: 0.8,
    phase: "applying",
    house: 10,
    sign: "leo"
  },
  {
    transitingPlanet: "moon",
    natalTarget: "jupiter",
    aspect: "trine",
    orbDegrees: 1.2,
    phase: "separating",
    house: 3,
    sign: "capricorn"
  }
], timing);
```

## Recommended App Flow

```text
chart engine -> timing engine -> significance ranking -> knowledge lookup -> voice renderer
```

Keep this folder reusable between the web app and mobile app. If this grows beyond lightweight ranking, move it into a separate shared app package.
