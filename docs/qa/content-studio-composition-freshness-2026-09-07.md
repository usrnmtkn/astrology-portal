# Content Studio composition and freshness audit — 2026-09-07

Audited from refreshed `origin/main` at `85209b47`; implementation branch `codex/studio-composition-freshness`. This continues the CRUD release in PRs #655 and #659.

## Where reader writing is stored

| Store | Consumer and behavior | Freshness boundary |
| --- | --- | --- |
| Checked-in approved reader package, including deferred partitions | `fallbackArchitectureV3Runtime.ts` composes the package before applying eligible Studio overrides. These are real locally bundled passages, not just emergency strings. | A deployment/new page load replaces the package. An already-loaded JavaScript module does not update itself. |
| Saved Studio content | `generatedContent.ts` loads eligible database rows and overlays the matching keys; direct CMS rows have their own reader loaders. | Publishing changes the reader layer; saving a draft does not. |
| Browser localStorage core/Sky overlays | Cache envelopes bind the saved bundle to the installed package version, runtime capability and relevant integrity metadata. | Database revision checks invalidate changed versions. Cached approved content is intentionally retained if the network fails; this is not proof of current live state. |
| Browser memory | Installed overlays, shared generated-content promises, vocabulary, taglines and Calendar caches. | Previously depended on the local Studio update signal or a new page load. |
| `/content-studio-last-known-good.json` | Static snapshot fetched with `cache: no-cache`, used when storage cannot be reached. Refreshed through the repository's scheduled export workflow. | A snapshot is not a live database query. Its `sourceRevision` is the latest included row edit, not a verified-at timestamp. |

No service worker registration was found in the web source. Browser HTTP caching and already-loaded modules still matter.

## Changes

- Every one of the 24 registered surfaces/systems has a source selection panel in Composition Map. It filters by source family and text, shows full loaded copy and Live/Not live status, opens the normal editor, and links loaded templates to their assembly.
- Explicit content-key contracts replace reliance on imported `surface` labels, which often say Sky for natal hooks. A generated-inventory regression covers all 4,843 fallback-hook rows in this checkout. Declared template dependencies add shared vocabulary/hooks to the relevant map.
- An authenticated catalog of shipped source identifiers includes package-only hooks absent from the database. Complete documents load only when selected for editing. Saved Studio rows take precedence over package starters. The catalog is read-only; opening a starter does not publish it.
- Template sample facts are editable. Saved `packageDraft` fields are included in the editorial preview, so a second revision does not display older `packageRecord` writing. These are editorial sample assemblies, not calculations or proof of a live reader rendering.
- Visible online readers revalidate every five minutes, and on focus, visibility return and reconnection. Focus/visibility events coalesce. The existing immediate same-browser Studio signal remains.
- Refreshes clear shared reader caches and reload eligible overlays. Cancelled earlier hydration requests cannot install their old response after a newer refresh.
- A `null` refreshed overlay removes the installed core, Compatibility or Sky layer and recomposes the underlying package. Previously, an empty result could leave a removed override installed in memory. Sky's empty database version also clears its persisted partition cache.
- Last-known-good fetch promises expire after five minutes, so a long-lived page can fetch a newly deployed snapshot.

## Editorial recommendations and remaining limits

1. Keep Composition Map as the main entry point: choose the reader surface, find a source, edit a revision, then publish. Preserve the single primary Live/Not live status, with the reason in details.
2. Distinguish **remove this override** from **retire this passage everywhere**. Archiving/deleting a Studio mirror does not delete its bundled counterpart. Returning to bundled copy after removing an override is existing fallback precedence. Global retirement needs a governed package change or a separately designed retirement manifest consumed by every reader and offline store.
3. Add an explicit release manifest with the published revision, copy hash, verified-at time and retired keys. Synchronize that manifest and the offline package after publishing, and show drift in Studio. This would make the status of old snapshots inspectable instead of treating an old row timestamp as cache freshness.
4. Define an offline freshness policy before removing last-known-good behavior. “Never serve older content” requires withholding copy when current revisions cannot be verified. The current app prioritizes previously approved copy during an outage. This change does not claim a zero-staleness guarantee offline or force-reload readers mid-session.
5. Continue actual publish → reader verification for key content changes. Catalog coverage and a successful save are not substitutes for checking the final rendered assembly.

No owner-authored prose, review approvals, resolver source files, or generated reader package contents were changed. The package version stays `v3-2026-09-07a`; freshness changes are in app hydration and cache management.

## Validation

- Materialized hook coverage, template catalog/source selection, draft preview, and all 24 surface contracts.
- Real Content Studio API lifecycle suite: repeat saves, version conflicts, publish, archive/restore/delete, approval receipts, package starters and complete Uranus reader payload.
- Production-style Node ESM startup for the status/catalog API.
- Runtime overlay installation/removal renders the underlying approved passage again.
- Revalidation interval, focus, reconnect, hidden/offline suppression, event coalescing and cleanup.
- Typecheck, CSS/token audit and fresh-build browser flows. Browser findings and release evidence are recorded in the PR.

Known repository baseline failures from the preceding release remain documented in `content-studio-full-crud-audit-2026-09-07.md`; no budgets or editorial gates were relaxed.
