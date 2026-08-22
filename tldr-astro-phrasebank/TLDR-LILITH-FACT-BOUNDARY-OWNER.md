# TLDR Astro — Black Moon Lilith fact boundary (APPROVED 2026-08-09)

Status: owner-approved doctrine. This document supplies the meaning boundary for Lilith writing; it is not serving copy. Lilith rewrites compose from this boundary the same way Chiron copy composes from "insecurities" rather than wound language.

Calculation ownership is recorded separately in `packages/astro-knowledge/review/tldr-astro-lilith-fact-boundary.md`. The completed True Lilith implementation and verification are recorded in `packages/astro-knowledge/review/lilith-true-apogee-migration-2026-08-09.md`.

## 1. Usable facts (shared astronomical and astrological doctrine, safe in any copy)

- Black Moon Lilith is a calculated point, not a physical body. The Moon's orbit around Earth is an ellipse with two focus points: one is Earth, the other is Black Moon Lilith, sitting near the lunar apogee, the Moon's farthest distance from Earth.
- Two calculations exist. Mean Lilith averages the orbit's wobble and moves steadily forward. True Lilith tracks the exact position, stations retrograde roughly monthly, and zigzags across the same degrees for months. Neither is more correct; the choice belongs to the practice.
- Lilith spends about nine months in a sign and about nine years cycling the zodiac.
- The mythic figure predates the Hebrew Bible; the earliest records are Sumerian, around 2000 BCE. The "first wife of Adam" story comes from the medieval Alphabet of Ben Sira: made from the same soil, she claimed equal standing, refused, and left. Mythology is public domain and freely usable.
- Broadly shared astrological meaning, common across the field and safe to use: where a person refuses to comply, anger that carries information, autonomy, the experience of being an outsider, desire and self-possession that will not negotiate for approval.

## 2. Excluded framing (the source's distinctive editorial voice, never reuse)

- Coined labels: "the cosmic wild one," "untamable feral spirit," "inner feral one," "shapeshifter" as an epithet, "ungovernable as the dirt."
- The systemic-oppression register as Lilith's primary meaning: "cultures of supremacy," "systems of supremacy," "protector of all those on the margins." The generic fact that Lilith themes involve feeling like an outsider is usable; the political-editorial framing of it is the source's voice.
- "Personal signature of defiance" and similar coined summaries.
- Any app-feature or promotional context from the source articles.

## 3. Approved owner framing (parallel to Chiron = insecurities)

Lilith = refusals. The place in the chart where a person stops apologizing, the no they keep swallowing and eventually say, the anger that shows up when a limit has been crossed and keeps being crossed. Copy talks about what the reader refuses, tolerates too long, or finally walks away from, in the life area the house owns. No medicine language, no liberation rhetoric, no mythology in reader-facing copy unless the surface is explicitly educational.

Template register example (not approved copy): "Black Moon Lilith moving through your 2nd house presses on what you tolerate about money and being underpaid. The no you have been swallowing at work may be getting louder."

## 4. Owner decisions

1. DECIDED (owner, 2026-08-09) and IMPLEMENTED: the app uses True Black Moon Lilith. Browser and API calculations use the Swiss Ephemeris osculating apogee (`SE_OSCU_APOG`, body 13), expose monthly retrograde/direct stations and repeat visits, and disclose `lilithType: "true"` in calculation provenance.
2. DECIDED (owner, 2026-08-09): Section 3 framing approved verbatim. Lilith = refusals: where you stop apologizing, the no you've been swallowing, anger as information about a crossed limit.
3. RESOLVED: the two Lilith rows in the knowledge matrix are unfrozen and regenerated source-safe from Sections 1 and 3.

## 5. Migration outcome

- The repeat-safe station wording was promoted into the owner-approved v9 knowledge matrix. That matrix row is the canonical exact wording and must not be edited here.
- The twelve sign-placement cards were superseded by the owner-approved V5 package at `packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-owner-package.md`.
- The twelve house-transit passages already have approved canonical rows under `authored/transit-house/lilith/{house}` in `apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json`.
- Unapproved base, retrograde, direct, house, and natal candidates from the early rewrite pack were not promoted. They remain ineligible for serving or positive voice evidence.
