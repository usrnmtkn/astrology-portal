# Web Performance

## Production Bundle Boundary

The web app uses large, reviewed fallback-content snapshots to guarantee that
reader-facing cards do not go blank. Those snapshots remain synchronous inputs
to the fallback resolver, but they are emitted as independent production
chunks:

- `fallback-v3-core-content-*`: placement and core fallback content.
- `fallback-v3-transit-relationships-*`: transit and relationship content.

Separating immutable editorial data from application code gives browsers an
independent cache boundary. A code-only release no longer forces the browser to
download a newly hashed copy of both datasets, and the main application module
can be parsed independently. It does not defer either dataset from initial page
loading; doing that safely requires making the fallback resolver asynchronous
or partitioning it by route.

## Budget

Every web production build runs:

```bash
node scripts/check-web-performance-budget.mjs
```

The check fails if:

- the application entry exceeds 800 KB raw;
- the core fallback chunk is missing or exceeds 4.5 MB raw; or
- the transit/relationship fallback chunk is missing or exceeds 3.8 MB raw.

Run `npm run build:web` to create the production assets and enforce the budget.
Run `npm run qa:web-performance` to check an existing build.

## Baseline

The July 31, 2026 production baseline and the first optimized build were:

| Asset | Before | After |
| --- | ---: | ---: |
| Application entry, raw | 7,271.68 KB | 605.98 KB |
| Application entry, gzip | 1,092.85 KB | 160.92 KB |
| Core fallback content, raw | Included in entry | 3,622.26 KB |
| Transit/relationship fallback content, raw | Included in entry | 3,043.73 KB |

Future route-level deferral should be measured separately. It must preserve the
content-precedence and non-blank fallback contracts before it replaces this
synchronous boundary.
