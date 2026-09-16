# Content Studio theme ownership cleanup — 2026-09-16

This pass removes the duplicate Studio token block from `apps/web/src/styles/theme.css` and makes the ownership chain explicit:

1. `apps/web/src/styles/theme.css` owns shared application primitives and reader-facing design tokens.
2. `apps/admin/src/admin-theme.css` imports those shared primitives and owns Studio-only palette roles, typography overrides, component measurements, categorical variable colors, and the approved layer tokens.
3. `apps/admin/src/studio-system.css` imports only `admin-theme.css` and owns active Content Studio component/layout rules.

The 14 historical admin stylesheets remain disconnected. No legacy sheet is re-imported. The Memory renderer exception remains unchanged.

The architecture audit now rejects Studio-scoped tokens in the reader theme, rejects Studio-specific token names in the reader theme, verifies the admin-theme import chain, and continues to reject duplicate Studio selectors/properties, component-local tokens, inline style bypasses, legacy stylesheet imports, and non-accessibility `!important` rules.

The reader loading illustration previously consumed one token that was added after the original Studio block landed. Its size now resolves directly from the shared `--size-8` primitive, so removing the Studio suffix does not leave an unresolved reader token.

The aggregate CSS budget remains capped at 115,000 gzip bytes, matching the Phase 0 ceiling. The unfiltered CSS design-system workflow added in the preceding cleanup runs `test-studio-layer-tokens`, the CSS audit, admin typecheck, and admin build for every pull request and main push.
