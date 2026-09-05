# Content Studio form-density pass — 2026-09-05

## Scope

Reviewed the shared Content Studio editing and browsing surfaces that use the admin shell, including content tables, the main editor drawer, metadata forms, source finders, Daily Glance selectors, review controls, Composition workspaces, and source-repair dialogs.

## Problems addressed

- Row-selection checkboxes and the bulk-action bar had been re-exposed even though the owner wants them hidden.
- Fixed-width content-table cells could let source metadata, badges, or controls visually run into the next column.
- Several form-like layouts allowed flex/grid children to keep intrinsic minimum widths, which makes long labels, keys, and controls push into neighboring content.
- Helper copy and labels sat too far from their controls in some workspaces, making forms feel taller without making them easier to understand.
- Technical keys and route labels could widen a panel instead of wrapping inside it.

## Changes

- Restored the Content Studio no-checkbox contract globally for row lists and review rows.
- Added a late readability layer that forces form-like grid/flex children to shrink inside their own container.
- Constrained inputs, selects, textareas, pills, source metadata, and edit controls to their own cell or field.
- Made browse-table source, wiring, destination, and content-key metadata ellipsize instead of painting over the next column.
- Kept titles and long technical keys readable with normal wrapping where losing information would be harmful.
- Reduced excess gap and padding in the main editor, metadata panels, selectors, and toolbar/filter groups while preserving the established type scale.
- Kept action buttons from competing with or covering adjacent copy in source cards and Composition rows.

## Validation

The Visual Smoke workflow now runs:

- `node scripts/test-admin-content-readability-contract.mjs`
- `npm run qa:css-audit`
- `npm run qa:form-typography`
- the existing Content Studio Playwright admin flow suite

No reader-facing content, publishing state, content keys, resolver behavior, or serving logic is changed by this pass.
