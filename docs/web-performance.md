# Web performance

## Current production boundary

The reader app starts its JavaScript and stylesheet requests in parallel. Large
fallback-content snapshots are emitted as independent cache chunks so code-only
releases do not invalidate every content asset:

- `fallback-content-core-*`
- `fallback-content-relationships-*`
- `fallback-content-sky-*`
- `fallback-content-manifest-*`

The core, Sky, and generated manifest chunks are synchronous dependencies of
`App`. The transit/relationship chunk is deferred on the initial Sky route and
installed when You, Calendar, Friends, or another non-Sky route activates it.
A dashboard-installed full package always wins a race with the local deferred
bundle.

The generated manifest retains all 7,175 governed package keys, hashes, and the
package version without importing the 3.2 MB transit source snapshot. Run
`npm run build:fallback-manifest` after an intentional fallback-package content
change; the performance contract fails when this artifact is stale.

The fallback runtime receives a reader-eligible bundle before it creates its
renderers. Renderer construction must not repeat the full review-state filtering
pass; the startup performance contract guards this boundary.

## Budgets

Run a production build before checking the bundle:

```bash
npm run build:web
npm run qa:bundle
```

The report measures:

- the static JavaScript graph needed to evaluate `App`;
- the complete reader boot graph, including styles awaited before mount;
- reader startup CSS separately from lazy admin CSS;
- the App chunk, largest JavaScript chunk, total JavaScript, and total CSS.

The August 1, 2026 baseline is:

| Measurement | Gzip |
| --- | ---: |
| Reader boot, including awaited CSS | 879.7 kB |
| Static App JavaScript graph | 815.5 kB |
| Reader startup CSS | 64.3 kB |
| App code chunk | 159.3 kB |

The governed domain split reduced reader boot from 1.34 MB to 879.7 kB gzip,
about 34%. The 488 kB transit/relationship chunk remains available on demand
but is prohibited from re-entering the static App graph by the budget check.

Budgets live in `scripts/web-bundle-budgets.json` and run in the visual-smoke
workflow. Raise a budget only with an intentional, documented product change.

## Domain-deferral contracts

True route/domain deferral must preserve these contracts:

1. The local bundled package and dashboard-installed package use the same
   review-state precedence and package-manifest validation.
2. Every calculated major Sky aspect remains visible as a normal aspect card.
   Reviewed or live copy may replace fallback copy, but loading cannot hide the
   card hierarchy or introduce a secondary facts-only surface.
3. Content and judge updates remain independent of code deployment. A delayed
   domain chunk must rerender after installation without requiring a page reload.
4. Sky, You, Calendar, and Friends parity tests compare eager and deferred
   renderers before a content chunk leaves the initial graph.
5. The reader-boot budget must decrease by a measured amount; moving bytes to an
   immediately requested chunk does not count as a first-visit improvement.

The next candidates are route-specific reader CSS and finer subdivision of the
core fallback snapshot. Either change must pass the same eager/deferred parity
and content-precedence requirements.
