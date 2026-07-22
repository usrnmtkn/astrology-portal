# Owner lunation + transit article templates (reference library)

Supplied by the owner in chat 2026-07-21. These are AUTHORING GUIDES for future article writing, not machine templates: they never render. The machine-composable parts have been extracted into rows and renderer structure (see notes at the bottom). Bracketed slots are for a human (or future authoring session) to fill from real ephemeris facts.

## New Moon in [Sign] article structure

1. **Opening energy statement** — fresh cycle for [core theme]; Sun and Moon joined in [Sign]; focus on [sign qualities] over the next six months; elemental nature and what it creates ground for.
2. **Key aspects to the New Moon** — each aspecting planet: [Planet] in [Sign] [aspect] the Moon and Sun, bringing [tone/opportunity/challenge]; what the configuration sets the tone for.
3. **Archetype and essence** — the sign's mythic image; what the energy asks; two supportive tendencies.
4. **Collective influence** — what the sign governs socially; what the New Moon invites the collective to envision.
5. **Shadow and conditioning** — sign-specific limiting patterns; where they come from (family, culture, peers, media); awareness gives choice.
6. **Purpose and work** — 3-5 intentions to plant; the sign's higher qualities they grow toward.
7. **Reflection questions** — 4, keyed to sign themes.
8. **Closing alignment** — the sign's higher vibrations; personal alignment ripples into the collective.

## Aspects article structure (New Moon / Full Moon / Transit)

Per aspect: [Planet 1] in [Sign] exact [aspect] [Planet 2] in [Sign], blending [quality 1] with [quality 2]; what it supports; what each planet brings; what together they encourage; ideal applications. Optional: exact date/time/degrees, third/fourth planets and patterns (grand trine, T-square) with real-world examples and 2-3 reflection questions. Close: what the configuration creates, why the exactness of degree matters, "This Moon invites us to" (up to 5 shifts; transits pick ONLY 2), integration of polarities, optional house activation and practical application, closing statement on the sign's higher principle.

Aspect language by type: conjunction = merging, concentrating, unifying. Trine = flowing, harmonizing, graceful. Sextile = opening doors, inviting participation. Square = catalyzing, pushing beyond comfort, breakthrough. Opposition = balancing, integrating, bridging.

Planet qualities: Sun identity/vital force; Moon emotional needs/unconscious patterns; Mercury communication/mind; Venus values/relationships/resources; Mars action/desire/drive; Jupiter expansion/meaning/optimism; Saturn structure/responsibility/mastery; Uranus innovation/freedom/awakening; Neptune spirituality/imagination/dissolution; Pluto transformation/power/regeneration.

## Transit / Retrograde / Ingress article structure (see also the Saturn-ingress sample)

Opening energy statement -> key aspects and planetary influences (with exact date/time, active range, degrees) -> archetype and essence -> shadow and conditioning -> historical reflection (last time this planet crossed this degree: personal memory, family memory, world events, inherited patterns) -> planetary mechanics and tensions -> collective and personal influence (who feels it: placements within orb) -> body memory and ancestral patterns -> purpose and work (pick TWO shifts only) -> optional house activation -> practical application -> reflection questions -> closing alignment.

The owner's Saturn-ingress-in-Aries sample (chat 2026-07-21) is the register model: you-voice opening movement, mechanics paragraph with real date/time and continuity from the previous sign, trap/shadow paragraph, "with [planet] in the mix" practice paragraph, collective "we" close, and a two-part sign-off blessing ("Unshakable foundations and brave beginnings,").

## Eclipse rules (canon, differs from regular lunations)

- Eclipses are NOT regular lunations: they close and open chapters building for months, often outside anyone's control.
- Reference the eclipse family: shifts began at the last eclipse in the sign/axis and echo until the final one.
- Nodal axis: North Node = growth direction, South Node = release.
- Fated redirection framing: notice and allow, do not force outcomes.
- **Skip manifestation and release rituals entirely.** No intention-setting at the alignment. Observe and integrate.

## Per-rising horoscope structures

- **Lunation horoscope**: house illuminated (number + life areas) -> what it reveals -> aspects in play (Moon-side, Sun-side, extras tied to the rising sign's chart) -> Release/Shift (three concrete lower-vibration patterns, recognizable like "staying silent to keep the peace") -> why (what releasing opens) -> higher path (alignment + collective ripple).
- **Eclipse horoscope**: house + "this is not a regular Moon" -> what is being revealed -> nodal axis influence -> fated redirection -> higher path -> reflection questions -> important note: skip rituals.

## What is already machine-built from this library

- Owner's authored per-sign New Moon and Full Moon sections: 26 cards (`authored/sky-newmoon/*`, `authored/sky-fullmoon/*`, `authored/sky-newmoon/capricorn-year-end`, `authored/sky-eclipse/solar-virgo`) with structured `intention` / `ritual` / `energy` / `axis` / `completion` fields. Rendered inside `renderSkyLunation` (authored-first).
- Eclipse canon rows: `sky-eclipse-opener/{solar,lunar}`, `sky-eclipse-node`, `sky-eclipse-close`; `renderSkyLunation` accepts `kind: "eclipse-solar" | "eclipse-lunar"` + `northSign`/`southSign`.
- Ingress article structure: `renderSkyPlacement` (you-opener, mechanics, lore, trap, practice, aspect events, element close, blessing sign-off); authored ingress articles at `authored/sky-ingress/{planet}/{sign}` render verbatim.
- NOT yet built: the Release/Shift + Higher Path per-rising lunation horoscope enrichment (current `renderSkyHoroscope` covers jurisdiction + events only) and the historical-reflection / ancestral sections (need per-cycle facts; authored-only for now).
