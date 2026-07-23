# Daily horoscope assembly spec (v1)

How Codex assembles the daily page from the package renderers. Companion to `TLDR-Daily-Transit-Baseline-Spec.md` (the owner's baseline: skeleton, grammars, tone) and `CODEX-TRANSIT-HANDOFF.md` (renderer API). The baseline spec defines WHAT each slot sounds like; this spec defines WHICH renderer fills it, in what order, on which days.

Register note: the baseline's engine-hidden rule (no planet/sign/aspect words on the surface) applies ONLY to the top At-a-Glance slot. Everywhere else, TLDR Astro names the astrology on purpose; that is our house style and the owner has approved it across every shipped surface. Do not strip astrology vocabulary from area sections or labels to imitate Co-Star.

## 1. Surface split (owner decision 2026-07-23)

The daily content splits across TWO surfaces by what drives it:

**You > Transits (chart-based, different per user):**

```
1. AT A GLANCE           headline + body (see section 3)
2. Do / Don't            renderDoDont (see section 4)
3. Special-day section   lunation / eclipse / station / return days only (section 6)
4. AREAS OF YOUR LIFE    renderTransitAspect / renderTransitHouse, one per qualifying transit
5. Headliner deep dive   hand-authored, headliner days only
6. Behind this forecast  renderTransitLabel stack
```

**Calendar page, lunar card (sky-wide, same for everyone):**

```
renderCalendarPhase      daily Moon phase (+ renderVoidOfCourse while a void is active)
renderWeeklyMoon         once per week
renderSeasonMarker       solstice/equinox days
```

The phase and void-of-course cards do NOT appear on You > Transits; they involve no chart and belong with the calendar. On the Calendar's lunar card, `renderCalendarPhase` returns `headline` ("Waxing Gibbous Moon in Scorpio") plus `tagline` ("The Refinement"); show the headline as the label with the tagline small beneath it, never the tagline alone.

Every slot must survive absence. A You > Transits day with no qualifying non-Moon transit renders At a Glance, Do/Don't, and the label stack only; that is a valid page, not an error. At a Glance is the page's lead card and everything else reads quieter than it.

## 2. Day computation

- Compute the transit stack once per user per day at LOCAL NOON for the user's stored location (the baseline's reconstruction used a fixed clock time; noon keeps the Moon's sign/house honest for the majority of the waking day).
- The Moon changes sign mid-day roughly every third day. Use the noon position; do not split the day into two moods.
- 5-day selector window per the baseline skeleton: today plus 4 days ahead, future days computed the same way.

## 3. AT A GLANCE (headline + body)

Driver: the transiting Moon. Its whole-sign house in the user's chart supplies the topic; its tightest applying aspect to a natal planet supplies the emotional charge (square = self-friction, opposition = other-friction, conjunction = saturation, trine/sextile = ease). Baseline sections 2-4 define the grammar.

- SHIPPED (Copy Batch A, 2026-07-23): call `renderDailyGlance({ natal, aspect })` with the Moon's tightest applying aspect to a natal planet; returns `{ headline, body }`, both engine-hidden per the baseline grammars. Aspect groups: conjunction, square, opposition, soft (trine/sextile collapse). If the Moon makes no aspect within 5 degrees, call `renderDailyGlance({ house: moonWholeSignHouse })` for the house fallback. 136 rows: 4 groups x 14 natal targets x 2 slots, plus 12 houses x 2.
- Show the Moon's `renderTransitLabel` in the Behind-this-forecast stack so the driver is still discoverable; the At-a-Glance surface itself never names the astrology.
- Never invent an aphorism headline in the app layer; the resolver returns the only approved copy.

## 4. Do / Don't

- Engine picks the transited natal planet: the tightest qualifying transit whose NATAL target is one of Moon, Venus, Mars, Mercury, Saturn (the seeded set). The transiting MOON COUNTS for Do/Don't (owner decision 2026-07-23; use the same 5-degree gate as other inners). Since the Moon aspects a seeded natal planet most days, Do/Don't appears near-daily and changes with the Moon. Slower transits win the pick only when tighter than the Moon's contact. Call `renderDoDont({ planet, sign: natalSign, house: natalHouse, transiting, weakPlanet?, weakSign? })`.
- If no qualifying transit touches a seeded natal planet that day, OMIT the Do/Don't columns entirely. Per the baseline, the card must survive their absence; never substitute generic lists.
- weakPlanet/weakSign: pass only when the day's derivation record identifies an aggravated natal aspect partner; otherwise omit.
- Render as two parallel columns, exactly 3 items each, no punctuation, never explained.

## 5. AREAS OF YOUR LIFE

- One section per qualifying non-Moon transit. Orb gates: outers + Saturn qualify at <= 3 degrees, inners at <= 5 degrees. Wider transits do not appear.
- Order by orb tightness, tightest first.
- CAP: maximum 4 area sections. Transits 5+ still appear in the Behind-this-forecast stack (section 8) but get no paragraph. If a headliner day (section 6) is active, cap at 3 so the page does not scroll forever.
- Renderer: `renderTransitAspect({ transiting, natal, aspect, window, variant, isRetrograde })` when the transit aspects a natal point; `renderTransitHouse({ planet, house, window })` for sign-ingress/house-emphasis sections with no tight aspect.
- Always pass the real ephemeris `window` phrase ("Through Saturday", "Until August 11"). Speed-based defaults are a fallback, not a habit.
- Variant rotation: `variant = ((userId + transitId) % 3) || undefined` mapped to {undefined, 2, 3}. Stable per user+transit so a reader sees consistent copy within one transit and fresh copy across transits.
- Beat dedupe: never surface two cards sharing a rhetorical beat on one day; pairings live in `editorial_notes` on the affected authored cards. When two collide, keep the tighter orb, demote the other to the label stack.
- Retrograde context: pass `isRetrograde: true` on the aspect card; show `renderTransitRetro` as its own section only on station days (section 6), not every day of the retrograde.

## 6. Special days (override sections)

Priority order when several land on one date; show at most the top TWO, in this order:

1. **Eclipse** (solar or lunar): `renderLunationHoroscope({ kind: "eclipse-solar"|"eclipse-lunar", sign, risingSign })` as slot 4. Suppress the ordinary lunation treatment.
2. **New/Full Moon**: `renderLunationHoroscope({ kind, sign, risingSign })` as slot 4. On these days the Moon is also the headline driver; do not ALSO render a Moon aspect card in At a Glance if the lunation aspect is the same contact (that is the same beat twice). Use the lunation horoscope as the day's main content and keep At a Glance to the interim Moon-house line.
3. **Station on a natal point** (any planet stationing within 1 degree of a natal point): headliner day. `renderTransitRetro` (station retrograde) or the aspect card with real window (station direct), plus the bespoke deep section rule below.
4. **Return** (Sun through Saturn, plus lunar return if the product surfaces it): `renderTransitReturn` as slot 4.
5. **Season markers** (solstices/equinoxes) and sign ingresses: one-line `renderSeasonMarker` / calendar treatment in the strip; not a section.

Headliner gate (baseline section 9): any Saturn-through-Pluto transit at orb <= 1.0 degree, any station on a natal point, or any return upgrades the day. Headliner days earn the bespoke deep section: HAND-AUTHORED against the derivation record, 150-250 words. Codex must never generate a bespoke deep section for a sub-threshold transit, and never machine-writes the deep section at all; it requests one from the owner's authored library or omits the slot.

## 7. Calendar strip

- Every day: `renderCalendarPhase({ phase, sign })`.
- Void-of-course Moon periods overlapping waking hours (local 07:00-23:00): append `renderVoidOfCourse({ sign, nextSign })`. Skip voids that live entirely overnight.
- Monday (or the user's first open of the week, whichever comes first): `renderWeeklyMoon({ sign, variant })` once, at the top of the strip. `variant = (isoWeek % variantCount) + 1`.

## 8. Behind this forecast

- `renderTransitLabel({ transiting, natal, aspect, window })` for EVERY transit in the day's stack that passed the orb gates, including ones capped out of the area sections, ordered soonest-ending first.
- Tapping a label opens the full `renderTransitAspect` page for that contact.
- The Moon's own label appears here too; it is the only place the headline driver is named on interim days.

## 9. Derivation records

Every assembled day keeps its derivation record per baseline section 8: driving transits with orbs and application, house of contact, rulership condition, source grounding. The record lives in the engine's day object, never in reader-facing output. A day whose page cannot be traced to its transit stack fails review.

## 10. Assembly checklist for Codex

1. Compute transit stack at local noon; build the derivation record first.
2. Pick Moon driver -> At a Glance (interim rule until Copy Batch A).
3. Apply orb gates -> qualifying list; apply beat dedupe.
4. Special-day scan -> slot 4 overrides, headliner flag.
5. Do/Don't seeded-planet check -> render or omit.
6. Area sections (cap 4, or 3 on headliner days), tightest first, real windows, variant rotation.
7. Label stack for everything that qualified, soonest-ending first.
8. Calendar lunar card (phase + void + weekly moon) renders on the Calendar page, not You > Transits.
9. Catch `SourceGapError` per surface: hide that surface, never substitute copy, log the gap.
10. All review_status gating stays on, as everywhere else in the package.

## Open items (owner decisions pending)

- Whether lunar returns surface on the daily page or stay calendar-only.
- Weekly horoscope page (separate surface, parked; renderSkyHoroscope exists for season events but the weekly assembly is not specced here).
