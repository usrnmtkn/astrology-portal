# Executable information tree

```text
Home
├── Daily horoscope
├── Today's Moon forecast
│   ├── Moon phase
│   └── Moon sign
└── Planetary horoscopes
    ├── current body/sign list
    └── current body/sign personalized by rising-sign house

Transits
├── Short-term themes
└── Long-term themes

Me / Natal
├── Placements
│   ├── body in sign
│   ├── house synthesis
│   ├── day/night sect when eligible
│   ├── natal retrograde when applicable
│   ├── dignity when applicable
│   ├── ruler bridge
│   └── supportive/challenging aspects
├── Angles
└── Natal aspects

Sky
├── Collective planet in sign
├── Current-sky aspects
├── Retrogrades and stations
└── Ingresses and calendar events
```

## Resolver invariants

- `Sun in Cancer` on Sky is collective.
- `Sun in Cancer` under Home planetary horoscopes is personalized through the user's rising-sign house.
- A personalized planetary horoscope is not a generic transit-through-house article and is not a natal placement.
- Moon phase and Moon sign are separate modules with separate sources and actions.
- Personalized transit interpretation begins with the exact aspect-pair source. A house locates the scene; it does not emit a keyword paragraph.
- Natal placement synthesis is ordered and conditional. It must not become independent sign, house, ruler, dignity, and sect definitions pasted together.
- Courses and audio are outside this update.

