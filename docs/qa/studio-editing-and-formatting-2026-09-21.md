# Content Studio editing and formatting — 2026-09-21

Status: implemented and verified locally; production release requested, deployment pending. No production content was changed.

Verified application base: `4a17443dffb0a01c662c14d416d92ca31f2580f7` (PR #992). Branch: `codex/content-studio-editing`. The earlier composition worktree remains intact. Its changes applied cleanly onto current main, including the recent Calendar interaction fixes. After verification, the branch fast-forwarded to `6303b0fad` (PR #994), 0 behind / 0 ahead of the freshly fetched remote. Those two later upstream commits change only the public last-known-good snapshot and one project-memory decision; application code is identical to the tested base plus this work. Browser write/publication tests use isolated fixtures instead of the public snapshot.

## Owner workflow

- Calendar's colored preview phrases open their exact source editor, overview field, or relevant Variables entry. Combined Moon passages retain separate continuation, season timing, and source-passage targets. Opening an editor does not write content; existing unsaved-change and source-version checks remain in effect.
- Calendar Write-ups has a **Season transitions** view, available from the sidebar, tabs, and preview. Search and filter the ending/beginning season sources, choose a transition, and open its complete passage for editing. This view does not show the unrelated Moon-write-up creation control.
- Astro 101's old `all` text was the internal catch-all category, not a publication state. The editor now shows **Astro 101 · Chapter/Article/etc.** and the saved page's actual **Visible in app / Hidden from app** eligibility.
- **Move to draft** saves pending edits and changes the existing page to DRAFT through the normal version-checked handler. The page disappears from Learn and its direct reader route. **Publish to app** restores it. Saving edits to a live page preserves LIVE; the badge continues to describe the saved publication while the save bar separately reports unsaved changes.
- **Format text** opens bold, italic, bulleted-list, numbered-list, undo, and redo controls in the shared writing field. This applies across Content Studio, including Calendar, Astro 101, article sections, reader variants, and custom variable values. Internal notes and AI instructions remain plain text. **Done formatting** returns to the textarea; the existing Save action persists changes.

## Storage and reader compatibility

Formatting uses Markdown in existing string fields. Tiptap is loaded only when formatting is opened. Merely opening or closing the formatter does not rewrite the saved value. Edits immediately enter the existing draft state, save guards, and API validation. External draft changes also update an open formatter.

The reader renders supported Markdown as React paragraphs, emphasis, and lists. It never injects HTML or activates authored links, attributes, or scripts. Unknown markup stays literal. Plain passages retain their existing paragraph rendering. Linked Calendar/Sky facts keep their existing destination and interaction while formatted summary lists are parsed as a complete passage. Temporary link placeholders exist only during rendering and never enter saved copy.

Structured Astro 101 lists are shown in the editable field instead of the otherwise ignored body. A deliberate edit replaces that block's list with the edited Markdown body; untouched blocks retain their original representation. Exact `{{custom.my_phrase}}` variable identifiers survive Markdown serialization.

No database migration, auth/RLS change, source-bank rewrite, fallback package rebuild, ephemeris change, or publication-gate bypass is introduced. The existing Astro 101 reader query still requires LIVE, serving, and no review hold. Open Learn views subscribe to content changes and the shared focus/reconnect/interval revalidation mechanism; stale overlapping responses cannot replace newer results.

## Verification

All checks use this isolated worktree's own `npm ci` dependencies and locally built knowledge package. Browser runs build the current checkout and start fresh preview servers with synthetic Supabase configuration, never a reused preview or production store.

- Full `npm run test:content-studio-api`: passed. Includes actual-handler Astro 101 chapter/article demotion, full section preservation, stale-write rejection, and republishing.
- `npm run test:reader-copy-boundary`: passed; 19,177 fields inspected, no findings.
- `node --import tsx scripts/test-studio-formatting.mts`: passed. Emphasis, ordered/unordered/nested lists, start numbering, literal unsafe HTML, exact variables, complete copy, and linked inline facts.
- Standalone Studio browser suite: **24 passed** across Calendar preview, exact phrase source links, season transitions, and Moon editing.
- Reader/Studio browser suite: **13 passed** across actual-handler format/save/reopen/Live→Draft→Live, Calendar populated/empty states, and formatted Calendar/Sky summaries with working placement links.
- Both applications typecheck and build. CSS/token audit and browser-suite coverage pass. Web and admin bundle budgets, including new deferred-formatting checks, pass.
- Desktop (1440) and mobile (390), light and dark, populated and empty formatting states were inspected. Computed rich-field font family, size, weight, line height, and tracking match the existing writing field; horizontal overflow and browser errors are checked.

Local evidence is in `test-results/studio-format-*`, `studio-format-empty-*`, `studio-formatted-reader-*`, `calendar-summary-*`, and the Calendar preview/season screenshots. Test fixtures use neutral QA prose or existing exact corpus assertions; they do not publish or edit production rows.

## Dependencies and loading cost

Reviewed against [Tiptap's React setup](https://tiptap.dev/docs/editor/getting-started/install/react), [JSON handling](https://tiptap.dev/docs/guides/output-json-html), and [Markdown API](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage). The lockfile records Tiptap 3.31.3 and reader `marked` 18.0.13 (Tiptap retains its own compatible marked 17.0.6). Installation reported zero known vulnerabilities. No unrelated dependency was upgraded.

The existing publication filters were checked against the [Supabase filter reference](https://supabase.com/docs/reference/javascript/using-filters-eq) and [changelog](https://supabase.com/changelog). No client, database, auth, or RLS upgrade is needed for these controls.

Measured with workflow Supabase placeholders, gzip level 9. Admin was remeasured on `19f6d12ea`; its asset hash and exact sizes match hosted CI:

| Metric | Measured bytes | Limit |
| --- | ---: | ---: |
| Admin entry raw | 740,339 | 740,500 |
| Admin entry gzip | 215,391 | 215,500 |
| Admin aggregate JavaScript gzip | 726,081 | 726,250 |
| Web app boot JavaScript gzip | 457,239 | 457,500 |
| Web reader boot including CSS gzip | 510,026 | 510,250 |
| Web aggregate JavaScript gzip | 3,440,115 | 3,441,000 |

The aggregate allocation includes the requested deferred visual editor. Web's editor chunk is approximately 128.5 kB gzip; parser and formatted-renderer chunks are also deferred. New checks reject these chunks entering reader startup and reject ProseMirror or the editor entering standalone Studio startup. The shared field accessibility fix requires an additional 500 bytes in the raw-entry/largest-admin-chunk allowance; gzip and aggregate limits stay unchanged. CSS limits, memory graph, existing content chunks, and timing contracts are preserved. Narrow startup and aggregate allocations are recorded in the budget files with this feature's rationale.

Release verification: the production prebuild passes; field labels remain separate from formatting controls. The Calendar browser fixture now pins America/New_York for its calculated season boundary. The current inventory/detail fixture and formatting-field structure are covered by the existing save/reload regressions. The final local checks include 32 standalone Calendar cases, 284 broader editor/reader cases, and 19 focused reruns covering the corrected selectors, formatting, publication, and Calendar reader copy. The full Content Studio API contract passes locally and on PR head `19f6d12ea`. Hosted browser checks and production deployment are still pending at the time of this record.
