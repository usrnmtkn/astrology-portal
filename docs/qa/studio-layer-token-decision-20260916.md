# Content Studio layer token decision — 2026-09-16

Phase 1 preserved the existing Content Studio stacking order. The later Studio layout pass added `--studio-layer-page-header` at `4` for the sticky page header, between the memory canvas and memory panels, without reordering the overlay stack.

| Token | Preserved value | Current role |
| --- | ---: | --- |
| `--studio-layer-memory-canvas` | `0` | Memory graph renderer root |
| `--studio-layer-page-header` | `4` | Sticky Studio page header |
| `--studio-layer-memory-panel` | `6` | Memory match/detail panels |
| `--studio-layer-create-backdrop` | `50` | Create-menu dismissal backdrop |
| `--studio-layer-create-menu` | `51` | Create menu |
| `--studio-layer-editor-backdrop` | `70` | Editor sheet backdrop |
| `--studio-layer-editor-panel` | `71` | Editor sheet |
| `--studio-layer-variables-rail` | `73` | Variables rail above the editor |
| `--studio-layer-help-popover` | `75` | Help popover |
| `--studio-layer-source-repair-backdrop` | `80` | Source-repair modal/backdrop |
| `--studio-layer-toast` | `90` | Save/status toast |

The values are scoped to `.admin-dashboard` in `apps/admin/src/admin-theme.css`. That theme imports the shared application primitives from `apps/web/src/styles/theme.css`, while Studio-only colors, typography overrides, component measurements, and layer values remain admin-owned. `studio-system.css` consumes the named layer tokens and does not define component-local layer values. The disconnected legacy admin stylesheets remain disconnected and are not used as a token source.
