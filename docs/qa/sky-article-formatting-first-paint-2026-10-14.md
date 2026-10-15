# Sky article formatting at first paint — October 14, 2026

Production QA after PR #1257 found that a cold Venus placement article exposed
raw Markdown for about 300 ms before its lazy safe formatter resolved. The same
approved article then displayed its final paragraph/list structure. This was
not a new source publication or a personalization change.

The already-lazy Sky detail module now imports a prepared prose renderer from
the existing formatter module. It uses the existing formatting predicate,
parser, plain-paragraph contract and class names. Other surfaces retain their
existing lazy wrapper. No source prose, calculation, publication admission,
dependency or CSS changes are included.

## Matched build evidence

The baseline is main `ee81545a01e67c185842763758fddf7814baa939` in
`/Users/mprez/Code/tldrastro-sky-format-baseline-20261014`; the candidate is in
`/Users/mprez/Code/tldrastro-sky-article-qa-20261013`. Each checkout has its own
locked `npm ci` installation and local knowledge build. The browser build uses
the unchanged `browserTestWebServer` environment factory, including its empty
publishable-key setting. The default-feature comparison uses the same synthetic
Supabase configuration with natal aspect patterns disabled. Both measurements
use Node 22.23.3 and the official checker's measurement code; the checker and
runtime/lazy-boundary gates are unchanged.

| Gzip metric | Main browser build | Candidate browser build | Delta | Main default-feature build | Candidate default-feature build | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| App boot | 517,709 | 517,756 | +47 | 517,693 | 517,760 | +67 |
| Reader boot | 572,851 | 572,898 | +47 | 572,835 | 572,902 | +67 |
| Sky detail | 6,153 | 6,217 | +64 | 6,151 | 6,215 | +64 |
| All JavaScript | 3,624,894 | 3,625,255 | +361 | 3,624,862 | 3,625,246 | +384 |
| All CSS | 119,040 | 119,040 | 0 | 119,040 | 119,040 | 0 |

The matched browser baseline itself exceeds the old reader cap by one byte.
The scoped allocation adds 100 reader-boot bytes, 50 Sky-detail bytes and 250
aggregate JavaScript bytes, leaving at least 48, 33 and 145 measured bytes of
headroom respectively. App startup, CSS, other chunks, source payloads,
dependencies and runtime-performance limits retain their prior ceilings.
This records a small correctness cost, not a new latency improvement claim.

## Verification and live acceptance

The regression installs an isolated synthetic approved article with emphasis,
multiple paragraphs and a list. It holds the formatter response and checks that
no article body is exposed while the dependency is unavailable. After release,
the first visible animation frame must have the final text and structure, with
no raw Markdown. Mobile, desktop and reload must agree. Unit tests retain exact
plain-text, list, emphasis, variable and HTML-safety behavior.

Required release evidence also includes the full unfiltered local Studio API
and content suites, affected reader and formatting browsers, types, CSS,
privacy, both build configurations, and all applicable exact-head hosted CI.
After automatic main deployment, verify the READY main SHA and alias, repeat
Venus direct/reload/click first/final metadata checks, and verify the retained
Sun speed gain and exact complete content. Live acceptance remains open until
those checks pass. No production content writes are authorized by this QA.

## Standalone Admin matched-build follow-up

Hosted `sky-summary (studio)` job 116187842067 passed all 68 browser
cases (25 + 29 + 14), then rejected aggregate Admin gzip size at 795,561
bytes against the 795,550-byte cap. An unchanged rerun was not used.

Independent own-npm-ci builds of main `ee81545` and candidate `da03435`
used Node 22.23.3 and the workflow's exact visual-smoke Supabase URL and
anonymous-key placeholders. Both optional publishable-key and natal-aspect
flags were unset, and neither checkout had environment files. The official
checker measured main at 795,481 aggregate gzip bytes and candidate at
795,561 (+80), both across 83 JavaScript assets. The candidate exactly
reproduces CI; main has 69 bytes of headroom.

Allocate 100 aggregate Admin gzip bytes to the stable-formatting feature,
setting the cap to 795,650 and leaving 89 measured bytes. All other Admin
limits and lazy/deferred/payload checks remain unchanged. No runtime source
change accompanies this measured allocation. Fresh exact-head hosted CI,
including the full Studio browser phase and both API runs, remains required.
