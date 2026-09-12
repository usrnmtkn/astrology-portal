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

## Release integration

Rebased the redesign onto main `6f8258e9`. The integrated checkout passed the full Content Studio API suite, admin/web typechecks, CSS and form typography audits, the 26-case shared-control/tab/color/container matrix, and eight actual-handler Calendar/Review Queue browser workflows. Current-main Memory feedback, transit source receipts, stale-write recovery, station controls, and deferred review panels were retained.

Release checks now inspect the canonical stylesheet, accessible table rows, the selected-surface control, and top-of-page recovery banner. Retired stylesheet imports and fixed graph-overlay dimensions are no longer the expected presentation. The Sky placement composition preview uses the same three categorical color tokens in its legend and source passages.

The Studio entry remains within its existing 625,000-byte raw and 178,000-byte gzip limits after deferring imported summary provenance until a new summary editor needs it (621,290 raw / 177,690 gzip). Reader startup CSS includes the new canonical theme tokens: measured 49,586 gzip bytes, with a 49,750 cap (1,500 bytes above the former cap). Memory now loads the shared deferred Studio sheet instead of its retired dedicated sheet: measured 22,595 gzip bytes, with a 22,800 cap. JavaScript, aggregate CSS, and combined reader startup caps are unchanged; the manifest check still rejects private Memory code or styles in the reader startup graph.
