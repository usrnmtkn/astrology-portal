# Writing Surface Source Map

This document describes the current reader-facing writing inventory and its Content Studio ownership.

The executable source of truth is [`apps/admin/src/writingSurfaceSourceMap.ts`](../apps/admin/src/writingSurfaceSourceMap.ts). Composition Map renders that registry directly. When this summary and the registry disagree, the registry is authoritative.

## Scope

The inventory covers prose shown to readers. It does not make calculated chart facts editable. Planet positions, aspects, dates, houses, names, counts, and other runtime facts remain calculated; the templates and saved phrases that surround those facts are editable.

The current contract contains 23 reader-facing surfaces plus one internal composition system. Every reader-facing surface has at least one Content Studio edit route. The focused surface-map gate fails if a reader-facing surface is added without an editable route.

## Content Layers

Reader prose may come from two governed layers:

1. Reviewed or authored source copy shaped for the surface.
2. A reviewed template or fallback phrase filled with calculated facts.

Raw vocabulary, editor instructions, placeholder text, and unrelated source rows must not appear on a reader surface.

## Friends

| Surface ID | Reader location | Content Studio owner |
| --- | --- | --- |
| `friends-compatibility-planet-cards` | Friends > Compatibility > planet cards | Compatibility |
| `friends-compatibility-exact-dynamics` | Friends > Compatibility > exact dynamics | Compatibility |
| `friends-synastry-contact` | Friends > Synastry > aspect row/detail | Content Library |
| `friends-house-overlays` | Friends > Synastry > house overlays | Content Library |
| `friends-composite` | Friends > Composite chart | Composite Review |
| `friends-pair-daily` | Friends > selected person > Today between you two | Fallback Articles & Passages > Friends |

The retired Friends Circle feed and compatibility-highlight prototype are not reader surfaces and must not be presented as editable app coverage.

## Natal Chart

| Surface ID | Reader location | Content Studio owner |
| --- | --- | --- |
| `natal-placement-detail` | You/Friends > Birth chart > placement detail | Natal Chart |
| `natal-aspect-detail` | You/Friends > Birth chart > aspect detail | Natal Chart |
| `natal-aspect-patterns` | You/Friends > chart patterns and Active Now | Aspect Patterns |
| `chart-placement-row-microcopy` | You/Friends > chart rows/tooltips | Content Library CMS overrides |
| `natal-empty-house` | You/Friends > empty-house card/detail | Content Library CMS overrides |

Soul Roadmap and Career Archetype prototypes are not mounted reader surfaces and are intentionally excluded.

## Sky, Calendar, And Horoscopes

| Surface ID | Reader location | Content Studio owner |
| --- | --- | --- |
| `sky-placement-detail` | Sky > placement article and Rising-sign horoscope | Sky Write-ups / Articles |
| `sky-aspect-detail` | Sky > aspect detail | Sky Write-ups / Content Library |
| `sky-retrograde-summary` | Sky > retrograde summary | Content Library CMS override |
| `personal-transit-detail` | Sky/You/Friends > personal transit aspect | Content Library CMS override |
| `sky-daily-timing` | Today/You > daily timing write-up | Content Library |
| `daily-at-a-glance` | You/Friends > Daily At-a-Glance | Fallback Articles & Passages / Slots |
| `sky-calendar-event-cards` | Calendar > event cards | Content Library |
| `sky-lunar-day-editorial` | Calendar > lunar day detail | Content Library / lunar fallbacks |
| `sky-calendar-day-cards` | Calendar > day cards | Content Library CMS overrides |
| `sky-horoscopes` | Sky/You > daily and weekly horoscope summaries | Content Library CMS overrides |

## Personal Transits

| Surface ID | Reader location | Content Studio owner |
| --- | --- | --- |
| `personal-transit-house` | You/Friends > transit-through-house rows | Content Library CMS overrides |

## Purchased Reports

| Surface ID | Reader location | Content Studio owner |
| --- | --- | --- |
| `generated-reports` | Purchased report cover, TL;DR, chapters, and key dates | Report Fulfillment |

Delivered report corrections are staged privately. Saving a correction does not change the live report; an editor must explicitly publish it.

## Internal Composition System

`surface-specs-builders` represents phrasebank specifications, templates, slots, and builders. It is editable in Templates and Slots, but it is not itself a reader surface.

## Adding A Surface

When new reader-facing prose is added:

1. Add a `WritingSurface` entry with its renderer, source path, required slots, fallback behavior, and known risks.
2. Add a `writingSurfaceAdminAccess` entry with an actual editor route.
3. Add or extend a reader preview that uses coherent example facts.
4. Add an end-to-end Content Studio flow that opens and edits the atomic source.
5. Run `npm run test:admin-surface-map`, `npm run qa:admin-flows`, `npm run typecheck`, `npm run build:admin`, and `npm run build:web`.

## Guardrails

- A title or preview may not imply that one source row powers a surface when the runtime selects another.
- An editor route may not be labeled editable unless it can save the exact displayed source.
- Reader previews must distinguish calculated facts from editable copy.
- Retired or unmounted components do not count as reader surfaces.
- Code-composed prose must either resolve an editable CMS/fallback source or be identified as a calculated fact rather than editable writing.
