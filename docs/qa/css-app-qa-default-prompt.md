# Default CSS And App QA Prompt

Use this prompt whenever a TLDR Astro CSS QA pass is requested.

Please do a full CSS and app QA pass focused on finding and removing style overrides, conflicting rules, duplicated design logic, and layout regressions across the TLDR Astro app.

Goal:
Make the app styling predictable, centralized, and easier to maintain. I want to know where CSS overrides are fighting each other, where component styles are bypassing the design system, and where recent UI changes may have created visual inconsistencies.

Scope:
- apps/web/src
- global CSS files
- Tailwind config or theme files, if used
- component-level CSS/module files
- inline styles
- className overrides
- CSS variables
- chart rendering styles
- calendar styles
- Sky / You / Friends / Lunar Calendar / Content Dashboard surfaces
- mobile and desktop layouts
- dark mode and light mode
- typography, spacing, color, cards, buttons, tabs, segmented controls, modals, forms, and chart wheels

Do not start by changing large parts of the app. First audit, then patch only the confirmed issues.

Please check for:

1. CSS overrides and conflicts
- Duplicate rules for the same component or surface.
- `!important` usage.
- inline styles that should be tokens/classes.
- one-off classNames that override shared components.
- CSS variables being redefined in multiple places.
- dark mode overrides that do not match light mode structure.
- old styles still applying after component rewrites.
- styles that depend on page-specific parent selectors and break when reused.

2. Design system drift
Look for components that should share the same styling but currently do not:
- cards
- transit cards
- lunar calendar cards
- sky cards
- friend cards
- content dashboard cards
- buttons
- tabs
- segmented controls
- badges/chiclets
- form fields
- modals
- page headers
- section headers
- empty states

Where styles are duplicated, consolidate them into a shared component style or token. Do not create another one-off override.

3. Calendar-specific QA
Review the Lunar Calendar and any calendar-related views for:
- day cell overflow
- text clipping
- inconsistent Moon phase icon sizing
- inconsistent Moon sign label placement
- event tag crowding
- poor spacing between daily events
- mobile wrapping issues
- unreadable badges
- inconsistent selected/today states
- zodiac season header spacing
- week view and day detail layout consistency

4. Chart-specific QA
Review natal, sky, synastry, and composite chart rendering for:
- zodiac wheel placement regressions
- house label positioning
- glyph sizing
- aspect line styling
- dark mode contrast
- unnecessary borders/circles
- layout shifts between chart types
- inconsistent spacing between chart panels and interpretation cards

5. Typography QA
Check that typography is consistent across the app:
- page titles
- section headers
- card titles
- body copy
- metadata labels
- badges
- chart labels
- dashboard tables
- admin forms

Flag any places where font size, weight, line-height, letter spacing, or casing is being manually overridden instead of using the shared system.

6. Responsive QA
Test or inspect:
- mobile width
- tablet width
- desktop width
- wide desktop width

Look for:
- horizontal scroll
- cramped cards
- broken grids
- overlapping buttons
- clipped chart wheels
- nav wrapping
- dashboard tables that become unusable
- modals that exceed viewport height

7. Dark mode / light mode QA
Check:
- text contrast
- card background contrast
- border visibility
- chart visibility
- selected states
- hover states
- disabled states
- form fields
- calendar icons
- Moon phase icons
- zodiac glyphs

Do not fix dark mode with page-specific patches unless absolutely necessary. Prefer shared tokens.

8. Admin dashboard QA
Review Content Dashboard styling for:
- inconsistent table spacing
- mismatched form fields
- broken filters
- cramped columns
- unreadable JSON/template fields
- inconsistent draft/published badges
- local snapshot rows vs CMS rows
- modal and drawer overflow
- buttons that do not match the app style

9. Output required before edits
Before making changes, provide:
- a short audit summary
- a list of files inspected
- a list of confirmed styling problems
- which problems are true CSS conflicts vs intentional component differences
- a patch plan grouped by priority

10. Patch rules
When patching:
- prefer tokens/shared classes over new overrides
- remove dead CSS when safe
- remove duplicated rules when safe
- avoid `!important`
- avoid inline styles unless required by dynamic chart math
- keep chart math/layout logic separate from visual styling
- do not change content logic
- do not change astrology calculations
- do not rewrite copy
- do not redesign the app from scratch

11. Final QA report
After changes, report:
- files changed
- overrides removed
- shared styles created or reused
- components affected
- screenshots or local routes checked if available
- remaining issues that need design decisions
- anything intentionally left unchanged

Priority:
1. Fix broken or conflicting overrides.
2. Restore consistency across shared surfaces.
3. Make calendar, chart, and dashboard layouts stable.
4. Reduce CSS complexity without changing the product direction.

Do this as a careful QA and cleanup pass, not a visual redesign.
