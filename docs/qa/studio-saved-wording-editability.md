# Studio saved-wording editing

Reusable wording must be readable and editable from the main authoring view.
An assembly token alone is not an editing surface. Calculated facts retain
their calculation and inspection controls.

The generic template editor now shows the complete assembled sample and direct
actions for its saved sources. Opening a source retains the unsaved parent
template; draft save and publication keep their existing separate actions.
Source discovery loads reader fields and declared resolver dependencies while
excluding insertion-only suggestions. Metadata identifies the exact source
before its full document loads; missing and empty sources remain explicit.

Custom variables show their complete context-selected value and open the existing
shared-value/override form in a separate tab. Background refresh updates the
library without remounting an already-open form or replacing its opened version.
The primary editor also exposes library loading, empty and failure states. Retry
uses the existing library request, keeps the unsaved draft, and retains complete
cached values if a refresh fails. Built-in facts alone do not open the custom
wording panel. The private preview resolves custom wording without changing
source tokens, saved metadata, publication snapshots or calculated facts.

Sky placement article previews open the complete phrase editor when saved wording
is selected. This works with the variable picker closed and with either a new or
existing phrase library. Linked shared wording follows the existing source-scope
and integrity checks. Calendar's shared-wording workspace is preserved from main. Integration checks
cover its top-level source editor and date/popup flow alongside this change.

## Acceptance evidence

The isolated checks use synthetic content and actual Studio handlers for writes.
They do not change production content or establish editorial approval.

- The four generic browser cases cover 390/1440 widths in both themes, exact
  metadata-to-document hydration, complete opening/final text, direct source
  edit, draft save, publish, return, unsaved parent retention and save/reload.
- Error coverage holds all three established safe-read attempts at 503, retains
  the settled error through parent editing, then requires explicit Retry and a
  completed successful document body. Source and custom-variable races preserve
  unsaved text and reject stale saves. Empty/untraceable sources stay explicit.
- Three additional library cases cover initial failure followed by explicit
  retry, a successful empty library and a cached-value refresh failure. They check
  completed response bodies, exact request counts, draft retention, built-in-only
  drafts and no writing or provider calls with the insertion disclosure closed.
- Two Calendar fixture repairs keep page and popup publication-ledger requests
  on the same isolated handler store, canonical schema and ETag. Assertions stay
  unchanged; production storage is never the fixture source. The failed prior
  production run and trace evidence remain in protected QA records.
- Eight Sky phrase cases cover both widths/themes and automatic/existing
  libraries. Two existing Sky library cases cover their normal editing path.
- Static coverage includes both application typechecks, CSS/token contracts,
  composition selection, actual-handler custom-variable CRUD, variable request
  reliability, article-variable contracts and inventory partition boundaries.
- The strict browser storage fixture implements the actual UUID `gte` range
  comparator. The partition regression compares all 4,805 PostgreSQL UUID rows,
  including exact boundary IDs, without allowing unsupported filters to succeed.
- Screenshots cover the new panels and error/empty states. Rendered checks assert
  heading roles, body typography, complete multiline wording and horizontal fit.

Local results, the final tested commit, unfiltered API gate, hosted CI and deployed
frontend verification must be recorded in the release PR. Browser/handler fixture
success does not replace read-only verification of real saved-row hydration.

## Measured bundle allocation

Independent `npm ci` worktrees compare frozen Calendar/Daily source
`40f6d4a1a8dace3e9d3caabd5d8cb998afbec96e` with the integrated feature, using native ARM
Node v22.20.0 and identical synthetic workflow settings. The original
`d266750` comparison is retained in the budget history as preintegration evidence.

| Admin JavaScript bytes | Calendar/Daily baseline | Integrated feature | Added |
| --- | ---: | ---: | ---: |
| Complete startup, raw | 815,051 | 816,995 | 1,944 |
| Complete startup, gzip | 236,474 | 237,060 | 586 |
| Aggregate, gzip | 859,513 | 863,419 | 3,906 |

The initial implementation pulled the source-family table into startup. Keeping
the small predicate separate removed unnecessary startup bytes before the first
comparison. The remaining cost supplies the requested editing UI, complete source
hydration, library recovery, refresh and stale-edit behavior.

Preserve the existing allocation of 2,000 raw entry/largest bytes, 600 startup
gzip bytes and 4,000 aggregate gzip bytes above the upstream ceilings. The
complete startup graph uses the same ceilings; splitting startup cannot hide its
cost. Deferred modules, reader/Web budgets, CSS, memory graph and forbidden-payload
guards remain enforced. Earlier failed runs remain failures. Final local,
exact-head hosted and production checks must pass on the integrated revision.

## Web aggregate allocation

The public Web build also emits the deferred Studio editor modules. Matched
independent native ARM builds on the same frozen Calendar/Daily source and
synthetic Playwright flags measure aggregate JavaScript at 3,683,123 bytes for
the baseline and 3,687,045 for this feature: 3,922 added gzip bytes. The unchanged
3,684,050-byte gate initially failed by 2,995 bytes; that failure is retained.

The two new panels contribute 1,345 and 1,531 gzip bytes and stay outside startup.
App boot measures 396,379/396,369 bytes and reader boot 454,731/454,721; these
10-byte output shifts are not a performance improvement. Startup CSS stays
58,352 bytes, and aggregate CSS stays 143,985. The earlier predicate split already
removed avoidable startup imports. No concrete reduction of 2,995 bytes preserves
the requested editing behavior.

A reviewed 3,100-byte aggregate-only allocation sets the ceiling to 3,687,150,
leaving 105 measured bytes. Preserve every existing rationale and all other
startup, CSS, individual-chunk, dependency, source-payload, deferred-boundary and
runtime guards. Final rebase requires fresh measurement; this records the editing
feature cost and does not authorize further increases.

## Final verified-main rebase

The final release replays only the editor feature onto verified-live main
`02599d697abffdc8752d2362acc19f26e34e17b8`. All application and fixture bytes match
`149a9fc`; the Daily predecessor's three later changes do not overlap the feature.
The stable 30-case rendered evidence is retained, with exact-head hosted checks
and deployed-asset regressions required before completion.

Fresh, independently installed native ARM builds use Node v22.20.0 and the
same isolated configuration per application. Numeric ceilings and earlier
rationale remain unchanged.

| Gzip bytes unless marked raw | Main | Final feature | Added |
| --- | ---: | ---: | ---: |
| Admin startup, raw | 815,051 | 816,995 | 1,944 |
| Admin startup | 236,484 | 237,053 | 569 |
| Admin aggregate | 859,503 | 863,350 | 3,847 |
| Web aggregate | 3,683,091 | 3,687,134 | 4,043 |
| Web App boot | 396,383 | 396,386 | 3 |
| Web reader boot | 454,735 | 454,738 | 3 |
| Web startup CSS | 58,352 | 58,352 | 0 |

Output hash/compression shifts are not a performance improvement. Both saved-wording
panels remain deferred from Web startup. The existing source-payload, CSS,
individual-chunk, privacy, runtime and required-check boundaries stay enforced.
