# Content Studio CSS consolidation

Local worktree: `codex/studio-grid-spacing` at `b0926a0e40039a581cc3b0c208e3af94be6f6bf9`, with the existing uncommitted design-system work preserved. Refreshed `origin/main` is 47 commits ahead. This is local validation, not a deployment record.

## Changes

- Consolidated shared layout memberships and repeated selectors for composition panels, source lists, preview cards, slots, editor metadata, house rows, and connected tab containers.
- Embedded sections are excluded from standalone card defaults, so their padding/background no longer depends on a later reset.
- Selected, tonal, primary, and disabled button states do not compete with ordinary hover styling.
- Removed redundant title typography and repeated responsive sections. Breakpoint rules are grouped after component definitions.
- Added `run-studio-css-architecture-audit.mjs` to `qa:css-audit`. It checks repeated selectors/properties, competing shared layout groups, repeated breakpoints, component-local tokens, inline styles, and legacy CSS imports. Only hidden-content and reduced-motion accessibility declarations can use `!important`.
- Updated the routing regression to require the canonical stylesheet instead of obsolete compatibility layers.

The active component stylesheet imports only `apps/web/src/styles/theme.css`. Both standalone and main-web Studio entries use it. Historical stylesheets remain disconnected; reader routes retain their separate stylesheet. Theme, interaction, and responsive variants remain intentional parts of the component system.

## Validation

- Admin TypeScript check passed.
- CSS consistency, token integrity, and Studio architecture audits passed with no blocking findings. Contextual token aliases reported by the repository-wide token inventory include historical sheets; the active Studio component sheet declares none.
- Reader destination/routing audit passed for all 24 declared surfaces.
- Broad standalone regression run: 212 checks passed before the final redundant-layout and embedded-surface exclusions.
- Final main-web build: 44 browser checks passed across light/dark, 1440px/390px, populated/empty cards, tab keyboard behavior, computed typography, source/house rows, Memory states, and issue guidance.
- Final standalone rebuild: 16 affected layout checks passed; the local sample preview now serves this build.
- Visually inspected the library, empty state, editor field cards and action bar, connected Sky tabs, template workbench, and assembly cards in both themes and widths.

Browser checks use isolated fixtures and freshly built previews with `reuseExistingServer: false`. They do not establish production content or API availability.
