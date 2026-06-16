# TLDR Astro Calculation API v1 Plan

This plan defines the first pass of the TLDR Astro astrology API. The goal is
not to clone a broad public astrology platform. The goal is to give the TLDR
Astro app a reliable backend chart engine that returns calculation results and
content-ready astrology facts.

## Product Goal

The v1 API should power these app experiences:

- What is my chart?
- What is happening in the sky now?
- What is happening for me today?
- Why does this transit matter for me?
- What is happening between me and another person?
- What larger timing chapter am I in?
- What facts should the TLDR Astro content engine write from?

## Architecture

```text
birth data / current date / relationship pair
        ↓
calculation API
        ↓
normalized astrology facts
        ↓
@tldr/astro-knowledge + generated content
        ↓
TLDR Astro UI
```

The API owns calculation correctness. The app owns accounts, saved charts,
settings persistence, billing, notifications, and UI rendering. The existing
content system owns final prose.

## V1 Endpoint Set

### Platform

- `GET /health`
- `GET /reference/config`
- `GET /houses/systems`

### Utilities

- `POST /utils/geocode`
- `POST /utils/timezone`

### Core Charts

- `POST /chart/natal`
- `POST /sky/current`
- `POST /chart/transits`
- `POST /moon/status`

### Relationships

- `POST /relationship/synastry`
- `POST /relationship/composite`
- `POST /relationship/compare`

### Time Lords

- `POST /timing/profections`
- `POST /timing/zodiacal-releasing`
- `POST /timing/firdaria`
- `POST /timing/personal`

### Content Fact Extraction

- `POST /content/facts`

## Build Phases

### Phase 1: Calculation Foundation

Deliver a backend engine that can replace the browser-side Swiss Ephemeris work
currently done in `apps/web/src/services/ephemeris.ts`.

- Install and validate Swiss Ephemeris access.
- Resolve local birth date/time to UTC with historical timezone data.
- Calculate tropical planetary positions.
- Calculate angles and house cusps.
- Support `whole_sign` first, with request/response fields ready for more house
  systems.
- Return position data with sign, degree, minute, longitude, speed,
  retrograde, house, and display glyph metadata.
- Calculate major aspects with configurable orb profiles.
- Return a response shape compatible with existing chart UI needs.

### Phase 2: TLDR Astro App Aggregates

Add endpoints that match current app surfaces.

- `POST /sky/current` for Sky Today.
- `POST /chart/transits` for You Today and friend timing.
- `POST /moon/status` for sign, void-of-course, ingress, and lunation status.
- Include `knowledgeIds` and fact packets where useful, but keep final prose in
  the existing content system.

### Phase 3: Relationships

Add relationship endpoints as first-class v1 features.

- `POST /relationship/synastry` for inter-chart aspects and house overlays.
- `POST /relationship/composite` for midpoint composite positions and aspects.
- `POST /relationship/compare` as the app-friendly aggregate response for the
  Friends/relationship surface.

### Phase 4: Time Lords

Add timing context as a first-pass differentiator.

- Annual and monthly profections.
- Zodiacal releasing from Fortune and Spirit.
- Firdaria periods.
- `POST /timing/personal` to aggregate active periods and boost relevant
  transits.

Time-lord techniques should pin to whole-sign by default. An advanced
`respectHouseSystem` override can exist, but should default to `false`.

### Phase 5: Content Facts

Add content-ready fact extraction after the calculation endpoints are stable.

- Return `surface`, `eventType`, `headline`, `facts`, `knowledgeIds`,
  `priority`, `timeSensitivity`, `houseSystem`, and `zodiac`.
- Support fact packet types for natal, sky, transits, relationship, composite,
  moon, and timing events.
- Keep generated prose in `api/_lib/content-generation.ts`.

## Explicitly Deferred

These should not block v1:

- Astrocartography
- Horary
- Electional scoring
- Birth-time rectification
- Primary directions
- Harmonic charts
- Draconic charts
- Heliocentric charts
- Fixed stars
- Broad asteroid catalog support
- Server-side wheel rendering

## Success Criteria

The v1 API is successful when the app can:

- Create a natal chart without client-side ephemeris calculation.
- Show current sky without client-side ephemeris calculation.
- Rank personal transits using backend-calculated candidates.
- Show synastry and composite relationship views from backend facts.
- Show profection, zodiacal releasing, and firdaria timing context.
- Generate TLDR Astro content from structured astrology facts without redoing
  calculation logic in the content generator.
