# Reader typography audit — October 26, 2026

The Reports item in the main navigation sheet rendered at **19px**, while its peers rendered at **15px**. Reports is inserted through a deferred notification wrapper. The menu's direct-child selectors missed that button, leaving it with the inherited body size.

The two shared menu selectors now style `[role="menuitem"]` descendants. Reports and the other menu actions use the same UI family and 15px size, including wrapped actions. No typography tokens, reader prose, heading scale, badge scale, publication behavior or dependencies changed.

## Verification

- **68 distinct scenarios have passing latest results**, covering main-page and report navigation, body paragraphs, cards, headings, metadata, highlighted text, accessible font mode and font/glyph separation. Coverage includes Sky and placement readers, Calendar day/week/month, Horoscopes, You transits/natal, Friends and saved charts, Guide articles, Learn, Settings and Reports, with applicable light/dark and phone/tablet/desktop variants.
- This comprises **52 passing main-audit cases plus 16 final focused cases**, not one uninterrupted 68-case run. [Latest results](../../test-results/font-audit-2026-10-26/latest-results.json), [main run](../../test-results/font-audit-2026-10-26/main-audit.json), [focused completion](../../test-results/font-audit-2026-10-26/completion.json).
- The eight menu cases cover guest/member contexts, navigation into the separate Reports route, reload and return to Sky. Guests without a profile retain their existing menu availability; the standalone Reports menu is also checked. Every rendered navigation label uses 15px system UI text.
- A negative control against the previous built artifact detects **Reports at 19px**. [Regression evidence](../../test-results/font-audit-2026-10-26/negative-control.log).
- Earlier checks referring to the retired Sky-controls dialog, old empty-search message and the blog search wrapper were updated to check the current date-panel roles, query-aware empty state and actual visible search input. No runtime behavior was changed for those assertions. Initial diagnostic runs remain in the evidence folder.
- TypeScript, CSS/token audit, full-detail copy integrity, whitespace and web bundle checks pass. Aggregate CSS is **136,450 / 136,575 gzip bytes**, with all existing limits unchanged. [Bundle output](../../test-results/font-audit-2026-10-26/bundle.log).
- Live localhost inspection confirms 15px menu labels in both themes. The user's light theme was restored. [Light screenshot](../../test-results/menu-font-refined-live.png), [dark screenshot](../../test-results/menu-font-refined-dark-live.png).

These are isolated fixture and local read-only UI checks, not deployment verification. Narrative text retains the shared 19px Newsreader body role; headings, metadata, glyphs and responsive UI titles retain their established roles.

## Provenance

Worktree `<local-checkouts>/tldrastro-ui-integration-20261026`, branch `codex/ui-integration-20261026`, HEAD `947523bfc7459c0a5d002f07d170e7e5e04619f5` plus preserved working changes. Refreshed `origin/main` is `2802df63eae1d30d6189fe027466d4fbe9852b44`: **0 ahead / 8 behind**. [Source hashes](../../test-results/font-audit-2026-10-26/source-manifest.json).

All **198 original worktree hashes remain unchanged**. No commit, push, deployment, owner-content write, generation or dependency change was performed.
