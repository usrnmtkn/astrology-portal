# Fallback library and editor card verification

Local work on 2026-09-11 in `codex/studio-grid-spacing`, based on `b0926a0e40039a581cc3b0c208e3af94be6f6bf9` plus the existing uncommitted Studio redesign. Freshly fetched remote refs show 47 commits behind and 0 ahead of `origin/main` at `9cce3fd536f2fca07fc3e6fa5f1ee16a0916cd16`.

The fallback library now has one controls surface containing its introduction, category choices, search, and sort. The duplicate inner title retains its semantic heading through the shared screen-reader-only treatment. Search and sort share a desktop row and stack on mobile. Result groups own their cards without a second padded parent. Empty and populated cards have matching insets. Selected category buttons retain their tonal fill while hovered.

The shared editor groups name and summary fields in a section card. Individual passage fields and guidance use the same surface family as review status. Guidance expands without another padded card inside it. Mobile action buttons use two equal columns, with status and publishing actions spanning the row, preserving DOM order and existing handlers.

Targeted browser coverage verifies both themes at 1440px and 390px, filter/search behavior, empty results, visible title hierarchy, selected hover state, card boundaries, editor field values, regular-weight labels, responsive action geometry, close behavior, scrolling-body boundaries, and absence of horizontal overflow or browser errors. Rendered screenshots are in `outputs/studio-style/fallback-*.png`.

The checks use isolated fixtures. No production publication, reader-copy changes, API, or resolver changes are part of this pass.

Validation results: all 212 fresh-build standalone Studio browser checks passed (2.5 minutes) before the final scoped mobile action-grid adjustment. Eight main-web checks passed on that final adjustment (29.3 seconds). Admin TypeScript, CSS consistency/token integrity audits, and diff whitespace checks passed. Rendered populated/empty library and editor screenshots were inspected in both themes and viewport sizes.

The final standalone rebuild passed all 12 focused fallback-card, editor-header, and container checks (26.4 seconds), including the mobile action grid. The rebuilt output is available to the local port-4286 preview; refresh the page to load it.
