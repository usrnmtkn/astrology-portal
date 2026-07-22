# Friends Circle feed — product logic (v1)

Owner decision 2026-07-21: the feed is YOU AND YOUR PEOPLE. Reader-inclusive stories rank first; the reader's stake appears in the headline layer whenever the reader qualifies.

## What makes a story (triggers, in priority order)

A story exists only when a real shared condition exists. If nothing qualifies, show nothing. An empty day beats a manufactured story (same principle as SOURCE_GAP).

1. **Sky event hitting multiple charts** (highest, because time-bound): a Full Moon, New Moon, eclipse, or station that lands meaningfully (whole-sign house or aspect within the standard orb gates) for 2+ circle members. Example: "The Full Moon on the 29th lands in your 12th, Alisa's 9th, and Jose's 4th."
2. **Shared cycles**: same profection-year house, overlapping returns (two members both in Saturn return), a retrograde touching several members' charts in the same window.
3. **Standing synastry between members** (evergreen; use sparingly, only when no timely story exists): a strong bond pattern between circle members worth spotlighting, rendered via `renderSynastryAspect`.

## Grouping rules

- Minimum 2 people per story (the reader counts as a person).
- Reader-inclusive stories outrank friends-only stories with the same trigger tier.
- No person appears in more than one live story at a time; the tightest/timeliest story claims them.
- Displayed names: up to three in full; four or more show two + "and N more". Charts without a display name (or only an initial) render as "a friend", never a raw initial or blank. `formatCircleNames` implements this; do not reimplement it app-side.

## Ranking and cadence

score = trigger tier x coverage (member count) x novelty
- Novelty: the same theme for the same group cannot repeat within 30 days.
- At most one NEW story per day enters the feed.
- A story stays visible while its real window is active (lunation ~3 days around exact, retrograde for its duration, profection year evergreen but capped by novelty), then expires.

## Card copy structure

1. **Headline**: the shared theme in plain words (current style is right: "Some things need privacy before they make sense").
2. **Subtitle**: theme label + who ("12th house years - You, Alisa P + 1").
3. **Shared-condition paragraph**: state the shared thing plainly, ONE hedge maximum. Never double-hedge ("may all be dealing with something they may still be processing" is the failure case).
4. **Per-person sections**: one per member, authored-first exactly like every other surface. Reader's section renders in you-voice; friends render via the resolvers' voice parameter (body_they path), NEVER pronoun substitution (see DECOMMISSION-OLD-FALLBACKS.md, confirmed live bug).
5. **Close**: the group question (already in the current build; keep it).

## Feed hygiene (bugs visible in the 2026-07-21 dev build)

- Strip `[FALLBACK]` / debug tags from all reader-facing card previews.
- Exclude QA fixture accounts ("QA Grand Square", "QA Kite", "QA No Supported Pattern") from feed generation entirely.
- Card preview text = first sentence of the shared-condition paragraph, not the raw body dump.

## Renderer notes

Per-person content comes from the existing package renderers (natal, transit, profection copy as available), selected authored-or-v3-or-SOURCE_GAP per person. The feed engine composes; it never writes prose. Group connective sentences (shared-condition paragraph, group question) are template rows and follow all style rules in CONTENT-ROLE-CONTRACT.json styleRules.

## Render API (built 2026-07-21)

`renderCircleStory(facts)` in `renderTransitSynastry` (mjs + browser.ts, parity-verified) returns `{ headline, subtitle, names, body, sections, question, parts, templateKey, contentKey }`.

- `facts.trigger`: `profection` (+ `house` 1-12) | `lunation` (+ `kind` full/new, `sign`, `dateLine` like "on July 29") | `retro` (+ `planet`, real `window` like "Until July 23") | `return` (+ `planet`; saturn and jupiter have bespoke rows, others use the generic) | `synastry` (+ `nameA/nameB`, `planetA/planetB`, `aspect`; headline is built as astrology, same rule as synastry cards).
- `facts.names`: friend display names only; `includesReader: true` adds reader-first "You" and fixes mid-sentence casing and both/all grammar automatically.
- `facts.members`: `[{ name, body, isReader }]` pre-rendered per-person sections, passed through in order. Render each through the package renderers with the correct voice; never pronoun-substitute. For profection stories use `renderProfectionYear({ house, sign, voice })` (in `renderFallback`, dual-voice, all 12 houses). Pass `sign` (the sign on the profected house) to include the year-ruler paragraph (time lord); the result also carries a `note` field with the profections explainer for first-time viewers.
- Known limitation: the synastry spotlight (tier 3) fully renders only when the READER is in the pair, because `renderSynastryAspect` is reader-directed. For friends-only pairs, use the `circle-synastry` opener + question without a per-pair body until a third-person synastry surface is authored.
- Copy rows: `fallback-hook/circle-profection/1..12`, `circle-lunation/{full,new}`, `circle-cycle-retro`, `circle-cycle-return/{saturn,jupiter,generic}`, `circle-synastry/{soft,hard,conjunction}` (21 rows, each with headline + shared-condition body + group question). Anything else is SOURCE_GAP: show nothing.
