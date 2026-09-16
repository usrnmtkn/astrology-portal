# Content Studio layer token decision — 2026-09-16

Phase 1 preserves the existing Content Studio stacking order exactly. No new numeric layer is introduced and no existing surface is reordered.

| Token | Preserved value | Current role |
| --- | ---: | --- |
| `--studio-layer-memory-canvas` | `0` | Memory graph renderer root |
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
