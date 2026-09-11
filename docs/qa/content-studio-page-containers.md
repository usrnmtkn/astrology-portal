# Content Studio page and form containers

## Scope

The canonical Studio stylesheet now assigns explicit surfaces to page headers, Review Queue command/view/filter/status groups, library filter forms, template and vocabulary controls, slot filters, Surface Map cards and supporting catalog, Connection inputs, and relevant empty states. Calendar filters use the same surface primitive. Connected tab panels retain ownership of their surface and inset.

Page-level errors precede the page header. Coverage and Needs attention use contained headers and the shared access card. Memory uses a contained toolbar with its error in the first full-width row; the mobile banner aligns with the toolbar inset.

All styling uses the shared theme tokens and the existing canonical component sheet. No override sheet, local visual token, or inline visual style was introduced. Content, authorization, resolver selection, and publication handlers were not changed by this containment pass.

## Verification coverage

- A route inventory checks 27 main-Studio page/view routes in light and dark themes at 1440px and 390px. It expands native disclosures and hidden filters and checks all five create editors.
- The inventory verifies that visible text and form controls have a surface ancestor and that each page fits horizontally. Dismissal scrims and screen-reader-only content are excluded.
- Separate coverage/access tests verify top-of-page errors in both themes and sizes. Memory tests verify the same placement, full toolbar width, retry, empty state, and search behavior.
- The main web entry receives the same route/form, Memory, and API-error checks through a fresh web build.
- The broader standalone suite exercises typography, native controls, editor interactions, tables, connected tabs, and composition variable colors with isolated API fixtures.

The first full regression run passed 224 of 228 cases. Two historical fixed-pixel library-position assertions were updated to require the complete first row to remain in the viewport; two mobile Memory assertions ran against the bundle built before its final inset change. The final fresh-build targeted run passed all 18 checks, covering those cases plus all route/form inventory and shared form checks. The initial main-entry run used a stale accessible-link test locator; its corrected fresh-build run passed all 12 checks.

CSS consistency, token integrity, Studio stylesheet architecture, admin TypeScript, and whitespace checks pass. The architecture audit reports 462 selectors with no duplicate rules/properties, legacy imports, inline visual styles, local tokens, or styling `!important` declarations. Historical inactive stylesheet aliases remain outside the active Studio import graph.

Screenshots are in `outputs/studio-style/containers-*.png`, `access-error-*.png`, and `grid-memory-*.png`. Results use synthetic data and do not certify production content or deployed behavior.
