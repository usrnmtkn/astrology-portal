# TLDR Astro Calculation API v1 Contract

This document defines the first-pass endpoint contracts. Field names use
camelCase to match the existing web app.

## Shared Inputs

### Chart Subject

```json
{
  "name": "Maya",
  "datetime": {
    "date": "1994-04-12",
    "time": "08:35",
    "timeKnown": true,
    "timeZone": "America/New_York"
  },
  "location": {
    "label": "New York, NY",
    "latitude": 40.7128,
    "longitude": -74.006,
    "timeZone": "America/New_York"
  },
  "settings": {
    "houseSystem": "whole_sign",
    "zodiac": "tropical",
    "aspectProfile": "standard"
  }
}
```

### Settings

```json
{
  "houseSystem": "whole_sign",
  "zodiac": "tropical",
  "ayanamsa": null,
  "aspectProfile": "standard",
  "orbs": null
}
```

Every endpoint that touches houses must echo `houseSystem`. Every chart-like
endpoint must echo `zodiac`.

## Shared Objects

### Position

```json
{
  "point": "Venus",
  "glyph": "♀",
  "longitude": 143.42,
  "sign": "Leo",
  "signGlyph": "♌",
  "degree": 23,
  "minute": 25,
  "degreeDecimal": 23.42,
  "house": 9,
  "retrograde": false,
  "motion": "direct",
  "speed": 1.21,
  "declination": 12.4,
  "theme": "desire"
}
```

### Aspect

```json
{
  "from": "Saturn",
  "to": "Venus",
  "type": "square",
  "orb": 0.82,
  "applying": true,
  "phase": "applying",
  "strength": 86,
  "exactAt": "2026-06-18T14:12:00.000Z",
  "fromHouse": 10,
  "toHouse": 7,
  "knowledgeIds": ["saturn-square-venus"]
}
```

### Content Fact Packet

```json
{
  "surface": "you",
  "eventType": "transit-to-natal",
  "headline": "Saturn square Venus",
  "priority": 91,
  "timeSensitivity": "active-now",
  "houseSystem": "whole_sign",
  "zodiac": "tropical",
  "facts": {
    "transitPlanet": "Saturn",
    "aspect": "square",
    "natalPoint": "Venus",
    "orb": 0.82,
    "phase": "applying",
    "natalHouse": 7,
    "transitHouse": 10
  },
  "knowledgeIds": ["transit-natal-saturn-square-venus", "saturn-square-venus"]
}
```

## Endpoints

### `GET /health`

Returns service status and ephemeris availability.

### `GET /reference/config`

Returns supported bodies, house systems, zodiac modes, aspect profiles, timing
systems, and feature flags.

### `GET /houses/systems`

Returns supported house systems with labels and Swiss Ephemeris codes.

### `POST /utils/geocode`

Input:

```json
{ "query": "New York, NY" }
```

Output includes label, latitude, longitude, region, country, and confidence.

### `POST /utils/timezone`

Input:

```json
{
  "latitude": 40.7128,
  "longitude": -74.006,
  "date": "1994-04-12",
  "time": "08:35"
}
```

Output includes IANA timezone, UTC offset minutes, DST flag where available, and
resolved UTC datetime.

### `POST /chart/natal`

Returns:

- Input echo and warnings.
- Positions.
- Angles.
- House cusps.
- Aspects.
- Chart ruler.
- Sect.
- Dignity summary.
- Optional lots needed by timing systems.
- Content fact packets for natal placements and natal aspects.

### `POST /sky/current`

Input includes datetime, location, and settings. Returns:

- Current positions.
- Current aspects.
- Ascendant and midheaven for the requested location.
- Moon status.
- Next lunation.
- Sign transit windows for visible sky placements.
- Content fact packets for sky placements, aspects, retrogrades, and lunar
  events.

### `POST /chart/transits`

Input includes a natal subject plus a transit datetime/location. Returns:

- Transit chart.
- Natal chart summary.
- Transit-to-natal aspects.
- Applying/separating state.
- Exact dates where computable.
- Transit and natal houses.
- Significance score.
- Timing boosts from optional timing context.
- Content fact packets for top transit hits.

### `POST /relationship/synastry`

Input includes two chart subjects. Returns:

- Both natal chart summaries.
- Ranked inter-chart aspects.
- House overlays.
- Directionality: whose planet contacts whose point.
- Content fact packets for synastry contacts and overlays.

### `POST /relationship/composite`

Input includes two chart subjects. Returns:

- Midpoint composite chart.
- Composite positions.
- Composite aspects.
- Composite houses and angles where computable.
- Content fact packets for composite placements and aspects.

### `POST /relationship/compare`

Aggregate endpoint for the Friends relationship surface. Returns:

- Person A natal.
- Person B natal.
- Synastry contacts.
- House overlays.
- Composite chart.
- Ranked relationship themes.
- Relationship timing callouts when transit input is supplied.
- Content fact packets for relationship, synastry, and composite surfaces.

### `POST /moon/status`

Returns:

- Moon sign.
- Moon phase.
- Illumination percent.
- Void-of-course state.
- Next ingress.
- Next new or full moon.
- Content fact packets for lunar cycle surfaces.

### `POST /timing/profections`

Pins to whole-sign by default. Returns annual and monthly profection context:

- Age.
- Activated house.
- Activated sign.
- Lord of the Year.
- Monthly lord.
- Activated natal planets.
- Content fact packets.

### `POST /timing/zodiacal-releasing`

Pins to whole-sign by default. Returns active periods from Fortune and Spirit:

- Lot used.
- L1, L2, and optional L3 periods.
- Peak periods.
- Loosing of the bond.
- Active signs and rulers.
- Content fact packets.

### `POST /timing/firdaria`

Pins to whole-sign by default. Returns:

- Sect.
- Major period lord.
- Subperiod lord.
- Period start/end.
- Content fact packets.

### `POST /timing/personal`

Aggregate endpoint for app use. Returns:

- Profections.
- Zodiacal releasing.
- Firdaria.
- Active timing themes.
- Natal placements activated by timing.
- Transit candidates boosted by timing.
- Content fact packets.

### `POST /content/facts`

Takes chart, sky, relationship, transit, and/or timing results and returns
normalized fact packets. This endpoint should not generate final prose.

Supported v1 fact packet types:

- `natal_placement`
- `natal_aspect`
- `current_sky_aspect`
- `transit_to_natal`
- `synastry_contact`
- `house_overlay`
- `composite_placement`
- `composite_aspect`
- `time_lord_period`
- `relationship_timing`
- `moon_event`
