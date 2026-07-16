# TLDR Astro — Consolidation Manifest

_Generated 2026-07-16 from `phrasebank/` ground truth. Every count is read live._


## Natal — placements

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Planet in sign | 120 | REVIEWED | `—` |
| Planet in house | 120 | REVIEWED | `—` |
| Planet on the angles | 48 | REVIEWED | `—` |
| Moon detail | 20 | REVIEWED | `—` |
| Lunar nodes | 24 | REVIEWED | `—` |
| Chiron (placement + aspect) | 49 | REVIEWED | `—` |
| Natal aspects (own-chart, 45 pairs) | 214 | REVIEWED | `resolver/natal_aspect.py` |
| Asteroids / points | 64 | REVIEWED | `—` |
| Ruler-sign clause lookup (support) | 120 | REVIEWED | `build_ruler_sign_clauses` |
| Chart-ruler advice (batches 1-2, verbatim) | 24 | CONFIRMED | `—` |
| Chart-ruler advice (batches 3-4, drafts) | 24 | SESSION_APPROVED_DRAFT | `—` |

**Natal — placements subtotal: 827 records**

## Natal — chart patterns

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Stelliums | 24 | REVIEWED | `—` |
| Intercepted signs | 12 | REVIEWED | `—` |
| Empty houses (composer model) | 82 | REVIEWED | `resolver/empty_house.py` |
| Natal retrogrades | 9 | REVIEWED | `resolver/natal_retrograde.py` |

**Natal — chart patterns subtotal: 127 records**

## Transits

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Transit-to-natal aspect bank | 470 | REVIEWED | `—` |
| Long-term house transit (84 bespoke) | 84 | REVIEWED | `resolver/transit_house.py` |
| Transit activation composer (model) | 5 | REVIEWED | `resolver/transit_activation.py` |
| Planetary horoscope (current sky by rising) | 60 | REVIEWED | `resolver/planetary_horoscope.py` |

**Transits subtotal: 619 records**

## Sky / horoscope surfaces

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Collective Sky — card | 21 | REVIEWED | `resolver/sky_collective.py` |
| Collective Sky — detail | 21 | REVIEWED | `resolver/sky_collective.py` |
| Sky events (ingress/lunation/etc.) | 23 | REVIEWED | `—` |
| Historical lookback (admin-gated) | 6 | REVIEWED | `resolver/admin_settings.py` |
| Horoscope surface templates | 6 | REVIEWED | `—` |
| Marie site voice lines + templates | 27 | REVIEWED | `—` |
| Lunation by sign (authored) | 20 | REVIEWED | `—` |
| Lunation by sign (Marie verbatim) | 16 | CONFIRMED | `—` |

**Sky / horoscope surfaces subtotal: 140 records**

## Relationships

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Synastry — inter-aspects + generic overlays | 1457 | REVIEWED | `—` |
| Synastry — house overlays (10x12) | 120 | REVIEWED | `resolver/synastry_overlay.py` |
| Composite — planet in sign/house | 130 | REVIEWED | `—` |
| Composite — aspects, single-voice (fallback) | 225 | REVIEWED | `resolver/composite_aspect.py` |
| Composite — aspects, 7 relationship types (partial: 6/45 pairs) | 882 | REVIEWED | `resolver/composite_typed.py` |

**Relationships subtotal: 2814 records**

## Marie corpus (verbatim)

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Confirmed pull-quotes | 191 | CONFIRMED | `—` |
| Article quotes | 15 | CONFIRMED | `—` |

**Marie corpus (verbatim) subtotal: 206 records**

## Authored library (fallback / slot / vocab)

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| Authored fallback hooks (daily + event-fallback + fallback templates) | 447 | REVIEWED | `tests/build_authored_library.py` |
| Mustache slot templates (1A..6O, verbatim) | 63 | REVIEWED | `tests/build_authored_library.py` |
| Authored vocabulary (planet-in-sign, lived-behaviors, career, phrases, ...) | 1086 | REVIEWED | `tests/build_authored_library.py` |
| Remaining authored records (transit/lunation/synastry/house-theme/...) | 1109 | REVIEWED | `tests/build_authored_library.py` |
| Moon-phase scene/action fills (2A-2H, Marie lunation frame) | 30 | REVIEWED | `tests/build_moon_phase_bank.py` |
| Slot -> source resolution map (235 slots) | 306 | REVIEWED | `tests/build_slot_resolution.py` |

**Authored library (fallback / slot / vocab) subtotal: 3041 records**

## Support / reference

| Surface | Records | Tier | Composer / source |
|---|---:|---|---|
| House reference data | 48 | REVIEWED | `—` |
| Misc reviewed clauses | 16 | REVIEWED | `—` |
| Transit-house model doc | 27 | REVIEWED | `—` |

**Support / reference subtotal: 91 records**

## Totals

| Tier | Records | Meaning |
|---|---:|---|
| CONFIRMED | 246 | Marie's own words — serve verbatim, never re-linted |
| REVIEWED | 7595 | Composed / authored — **awaiting Marie sign-off** |
| SESSION_APPROVED_DRAFT | 24 | Claude-drafted, Marie-reviewed — **DRAFT, pending dashboard confirmation** |
| **All** | **7865** | |

## Validation status

- _(run `build_all.sh` and pass HARNESS_LOG to embed live results)_

## Marie sign-off checklist (REVIEWED → CONFIRMED)

Each line is a surface whose copy is composed/authored in Marie's voice and rules but has not yet been personally signed off. Signing off flips the tier and exempts it from tone re-linting.

- [ ] **Planet in sign** (Natal — placements) — 120 records
- [ ] **Planet in house** (Natal — placements) — 120 records
- [ ] **Planet on the angles** (Natal — placements) — 48 records
- [ ] **Moon detail** (Natal — placements) — 20 records
- [ ] **Lunar nodes** (Natal — placements) — 24 records
- [ ] **Chiron (placement + aspect)** (Natal — placements) — 49 records
- [ ] **Natal aspects (own-chart, 45 pairs)** (Natal — placements) — 214 records
- [ ] **Asteroids / points** (Natal — placements) — 64 records
- [ ] **Ruler-sign clause lookup (support)** (Natal — placements) — 120 records
- [ ] **Stelliums** (Natal — chart patterns) — 24 records
- [ ] **Intercepted signs** (Natal — chart patterns) — 12 records
- [ ] **Empty houses (composer model)** (Natal — chart patterns) — 82 records
- [ ] **Natal retrogrades** (Natal — chart patterns) — 9 records
- [ ] **Transit-to-natal aspect bank** (Transits) — 470 records
- [ ] **Long-term house transit (84 bespoke)** (Transits) — 84 records
- [ ] **Transit activation composer (model)** (Transits) — 5 records
- [ ] **Planetary horoscope (current sky by rising)** (Transits) — 60 records
- [ ] **Collective Sky — card** (Sky / horoscope surfaces) — 21 records
- [ ] **Collective Sky — detail** (Sky / horoscope surfaces) — 21 records
- [ ] **Sky events (ingress/lunation/etc.)** (Sky / horoscope surfaces) — 23 records
- [ ] **Historical lookback (admin-gated)** (Sky / horoscope surfaces) — 6 records
- [ ] **Horoscope surface templates** (Sky / horoscope surfaces) — 6 records
- [ ] **Marie site voice lines + templates** (Sky / horoscope surfaces) — 27 records
- [ ] **Lunation by sign (authored)** (Sky / horoscope surfaces) — 20 records
- [ ] **Synastry — inter-aspects + generic overlays** (Relationships) — 1457 records
- [ ] **Synastry — house overlays (10x12)** (Relationships) — 120 records
- [ ] **Composite — planet in sign/house** (Relationships) — 130 records
- [ ] **Composite — aspects, single-voice (fallback)** (Relationships) — 225 records
- [ ] **Composite — aspects, 7 relationship types (partial: 6/45 pairs)** (Relationships) — 882 records
- [ ] **Authored fallback hooks (daily + event-fallback + fallback templates)** (Authored library (fallback / slot / vocab)) — 447 records
- [ ] **Mustache slot templates (1A..6O, verbatim)** (Authored library (fallback / slot / vocab)) — 63 records
- [ ] **Authored vocabulary (planet-in-sign, lived-behaviors, career, phrases, ...)** (Authored library (fallback / slot / vocab)) — 1086 records
- [ ] **Remaining authored records (transit/lunation/synastry/house-theme/...)** (Authored library (fallback / slot / vocab)) — 1109 records
- [ ] **Moon-phase scene/action fills (2A-2H, Marie lunation frame)** (Authored library (fallback / slot / vocab)) — 30 records
- [ ] **Slot -> source resolution map (235 slots)** (Authored library (fallback / slot / vocab)) — 306 records
- [ ] **House reference data** (Support / reference) — 48 records
- [ ] **Misc reviewed clauses** (Support / reference) — 16 records
- [ ] **Transit-house model doc** (Support / reference) — 27 records
