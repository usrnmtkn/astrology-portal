# Content Studio theme ownership cleanup — 2026-09-16

This pass removes the duplicate Studio token block from `apps/web/src/styles/theme.css` and makes the ownership chain explicit:

1. `apps/web/src/styles/theme.css` owns shared application primitives and reader-facing design tokens.
2. `apps/admin/src/admin-theme.css` imports those shared primitives and owns Studio-only workspace geometry, palette roles, typography overrides, component measurements, categorical variable colors, and the approved layer tokens.
3. `apps/admin/src/studio-system.css` imports only `admin-theme.css` and owns active Content Studio component/layout rules.

Phase 0 found 14 disconnected admin stylesheets. This cleanup promotes `admin-theme.css` into the canonical token layer; the other 13 historical sheets remain disconnected and no legacy component sheet is re-imported. The Memory renderer exception remains unchanged.

The architecture audit now rejects Studio-scoped tokens and `--workspace-*` ownership in the reader theme, verifies the admin-theme import chain, and continues to reject duplicate Studio selectors/properties, component-local tokens, inline style bypasses, legacy stylesheet imports, and non-accessibility `!important` rules.

The token-integrity release gate now matches runtime ownership: it scans every reader stylesheet plus the two active admin sheets (`admin-theme.css` and `studio-system.css`). The 13 disconnected historical admin sheets are deliberately excluded from the "active token" gate; the architecture audit remains responsible for proving that application entry points cannot load them. This removes false unresolved-token failures from dead CSS without weakening checks on shipped styles.

The reader loading illustration previously consumed one token that was added after the original Studio block landed. Its size now resolves directly from the shared `--size-8` primitive, so removing the Studio suffix does not leave an unresolved reader token.

The aggregate CSS budget remains capped at 115,000 gzip bytes, matching the Phase 0 ceiling. The CSS design-system workflow runs the CSS architecture and token audits and verifies the approved Studio layer values when Studio or reader styles change. Admin typecheck, production build, and JavaScript bundle budgets stay in their existing Studio workflows so this CSS gate does not duplicate those minute-heavy jobs.
