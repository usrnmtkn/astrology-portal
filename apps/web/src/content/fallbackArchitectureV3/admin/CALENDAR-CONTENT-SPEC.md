# Calendar page — content system + integration plan (v1, 2026-07-21)

Replaces ALL legacy lunar copy on the Calendar page with package-rendered content. References: the owner's calendar files (2026 Astro Calendar, 2025 Weekly Emotional Moon, 2025 Astro Guide aspects, Solstices-Equinoxes, moon ingresses) and the CHANI-style calendar pattern (daily moon sign + phase strip, void-of-course windows, ingress times, season openers, lunation ritual pages).

## Legacy copy to REMOVE (all of it is app-side, none is package content)

1. **The 8-phase sidebar copy** ("The First Need", "The First Boundary", "The Care Test", "The Mirror", "The Aftermath", "The Old Defense", "The Clean Memory", "The First Reach"). Replaced by `renderCalendarPhase`.
2. **Void-of-course card text** ("...drifts unaspected until it enters Leo. Use it for loose ends, rest, and low-traction work."). Replaced by `renderVoidOfCourse`.
3. **Season sidebar prose** ("Cancer Season begins with the question of what needs care...") — replace with `renderSkySeason` opener (already in package) or the season article page.
4. **Moon nicknames** ("the Mother's Daughter Moon"): no authored source in the package. Drop, or supply an authored card set if the owner wants them (SOURCE_GAP rule: never generate).
5. **Lunation sidebar blurbs** — the New/Full Moon side panel should pull the lunation article (`renderSkyLunation`) or its first paragraph as preview, not bespoke copy.

## Package renderers (built, parity-verified)

- `renderCalendarPhase({ phase, sign })` — 8 phases (`new-moon, waxing-crescent, first-quarter, waxing-gibbous, full-moon, disseminating, last-quarter, balsamic`); `sign` = the sign of the CYCLE'S NEW MOON so the whole two-week arc stays themed to its seed (matches the current design's intent). Returns `{ headline, body }`, e.g. New Moon: "The Seed" / "The cycle opens in Cancer. Plant one intention, small and true; new things grow in the dark first."
- `renderVoidOfCourse({ sign, nextSign })` — copy only; the app renders the times chip it already computes.
- `renderSeasonMarker({ which })` — `march-equinox | june-solstice | september-equinox | december-solstice`, hemisphere-aware, condensed from the owner's Solstices-Equinoxes file.
- `renderWeeklyMoon({ sign, variant })` — the owner's authored weekly Moon-sign tone (36 cards ingested from the 2025 Weekly Emotional Moon ics, 2-4 variants per sign) with `focus` and `strategy` fields for chips. Suggested slot: Monday / week-view header. Rotation: `variant = (isoWeek % variantCount) + 1`, stable within a week.
- Already available for calendar days: `renderSkyPlacement` (moon-in-sign day tone; the Moon row states its 2.5-day pace), `renderSkyLunation` (New/Full/eclipse day pages), `renderTransitRetro` (retro rows like "Mercury retrograde in Cancer - until Jul 23"), `renderTransitLabel` (ingress/aspect one-liners), `renderSkySeason` (season header).

## Engine data feed (from the ephemeris/ics layer)

Per day: moon sign + ingress time; phase (8-phase model, plus illumination/lunar day the app already shows); VoC window (start = last aspect, end = next ingress); lunation events with exact times; ingresses; retro windows; solstice/equinox instants; the cycle's New Moon sign (for phase theming); ISO week (for weekly moon variant).

## Assembly (per calendar view)

- **Day page**: phase chip + `renderCalendarPhase` -> moon-in-sign tone (`renderSkyPlacement` moon, or just the headline strip) -> VoC card when active -> event rows (ingresses via `renderTransitLabel`, retro rows, lunation links) -> season sidebar via `renderSkySeason`.
- **Week view**: `renderWeeklyMoon` for the Monday anchor (headline + body, focus/strategy as chips).
- **Lunation days**: link into the full `renderSkyLunation` article (eclipse kinds supported).
- **Solstice/equinox days**: `renderSeasonMarker` card.
- **Two-week arc widget**: dates from engine; phase titles from `renderCalendarPhase` headlines.

## Review status

The 13 new fallback rows (8 phases, 1 VoC, 4 season markers) are `needs_review`. The 36 weekly moon cards are `approved_reuse` (owner's own words; em dashes converted, per-occurrence boilerplate stripped).
