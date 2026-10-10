# Articles & Guides

Articles & Guides is the shared long-form destination in Content Studio and the
reader app. Calendar write-ups remain attached to calendar events; reusable Sky
placement writing remains available in Sky Write-ups. Astro 101 retains its
separate Learn organization.

## Content Studio

Open **Write → Articles & Guides** (`/admin/content#articles-guides`). Existing
`#articles` bookmarks still work. The collection includes manual articles,
standalone guides, dated Sky editions and their templates. Filters distinguish
type, editorial status, planet/point and content system. Drafts appear by default.

- **New article** starts an independent article.
- **New guide** starts a standalone guide. Each new article or guide receives a
  unique identity; creating another draft cannot overwrite the previous one.
- **Dated Sky article templates** opens the existing calculated-edition editor
  in this collection. Load facts for the reference date, inspect the shared
  retrograde history, and opt into including that history in generation. The
  same-sign comparison and optional degree comparison remain distinct facts.
  Existing generation, review and publication requirements apply.
- **Save draft** retains unfinished manual writing privately; **Save & publish**
  publishes the exact saved version. **Retire everywhere** removes reader access.

Manual articles and guides accept complete pasted writing. Their title, optional
saved summary and full body are separate fields. Collection cards use only the
saved summary; they do not generate excerpts from the body. This organization
does not generate, import, approve or publish any existing owner draft by itself.

## Reader app

Open **Articles & Guides** in the main navigation or mobile menu (`/#articles`).
Search titles and saved summaries, filter by type, and open a full article. Each
piece has a reloadable link based on its exact content key, including dated Sky
edition identity. Saved historical articles keep their original text; opening
one does not recalculate or relabel it for today.

Only reader-eligible, LIVE, serving rows without review holds and with a matching
publication record can appear. Unpublished, stale and retired versions are
unavailable even when someone retains a direct link. Private editor metadata is
removed by the existing reader projection. A failed collection request displays
an error with retry instead of claiming the collection is empty.

## Implementation and verification

The collection uses the existing generated-content table, publication lifecycle
and `/api/content-reader` handler. Three bounded prefixes are supported:
`article/manual/`, `article/guide/` and `sky-article/`. No schema migration is
required. Studio templates are editor-only and are not included in these reader
queries. The reader feature loads lazily and does not request unrelated fallback
or relationship content.

`scripts/test-article-library.mts` exercises the actual handler with isolated
storage: draft/publish/read/retire, exact body preservation, private metadata,
stale writes and prefix restrictions. `tests/visual/article-library.spec.ts`
checks Studio persistence and publication through the reader, filters, direct
links, reload, errors/retry, empty states and both themes at mobile/desktop sizes.
`tests/visual/retrograde-history.spec.ts` retains the shared-history checks across
the article editor, Sky and Calendar. Fixtures never modify production content
or call a paid writing provider.
