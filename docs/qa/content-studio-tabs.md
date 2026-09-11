# Content Studio tab semantics and reference styling

Date: 2026-09-11.

Checkout: `/Users/mprez/Code/tldrastro-studio-grid`, branch `codex/studio-grid-spacing`, base `b0926a0e40039a581cc3b0c208e3af94be6f6bf9`. A fresh fetch found `origin/main` at `9cce3fd536f2fca07fc3e6fa5f1ee16a0916cd16`, 47 commits ahead. Existing uncommitted redesign changes were preserved. Upstream changes in the dashboard concern other loading and editor paths, not the tab sections changed here. No retired history was integrated.

## Implementation

- Removed the conflicting selected-button fill from actual tabs. Tab strips use equal desktop columns, regular label typography, neutral surfaces, and the primary-color underline shown in the supplied reference.
- Added one `StudioTabs` implementation for Sky workspaces, Sky placement composition, Lunar views, and Composition scope/views. It owns unique IDs, a labelled panel, one keyboard entry point, manual arrow/Home/End navigation, Enter/Space activation, and visible focus. Narrow strips scroll horizontally instead of wrapping.
- Reclassified collection/status/family and diagnostics choices as labelled button groups with pressed state. Vocabulary categories retain their addressable links with current-page state.
- Kept all existing content, selection callbacks, reader rules, and publication behavior.

## Verification

- Full fresh-build standalone Studio suite: 200 passed (2.4 minutes).
- Fresh main-web-app tab checks: four passed in light/dark at 1440px and 390px.
- TypeScript, CSS token audit, and whitespace/diff checks passed.
- Local Chrome preview confirms the selected Sky tab is underlined and its content is exposed as a labelled tabpanel.
- Visual review caught a partly clipped focused tab on mobile; explicit focus scrolling was added and the focused-tab bounds assertion was added to the final targeted pass: four checks passed (22.6 seconds).

Evidence: `outputs/studio-style/tabs-*.png`, `/private/tmp/studio-tabs-tests.log`, `/private/tmp/studio-tabs-web.log`, and `/private/tmp/studio-tabs-focus-final.log`. Browser flows use isolated test fixtures; this does not establish production data availability or verify new API behavior. No deployment, content publication, or Git commit was performed.
