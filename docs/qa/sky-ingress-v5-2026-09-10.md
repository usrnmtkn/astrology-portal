# Sky Placement V5 verification and bundle measurements

The September 10 V5 proposal is implemented as an opt-in sentence composition.
No proposed astrology passages or existing approval records are changed.

After rebasing onto main `1dafaf27` (including releases #732 and #733), Studio's
production build under the CI authentication settings measures
609.9 kB raw / 172.7 kB gzip at entry,
within the existing 622.5 kB / 177.0 kB limits. Its largest chunk remains the
entry. Total JavaScript is 368,194 bytes gzip versus main's 320.7 kB measurement.
The total allowance is 371 kB; startup and largest-chunk allowances are unchanged.

The web build measures 2,973,676 aggregate JavaScript gzip bytes, with a
2,976,000 allowance (12 kB above main's aggregate cap). Reader boot is
466.8 kB against the unchanged 467 kB limit; all startup, CSS, and individual
chunk limits remain unchanged.

The added aggregate includes the deferred Swiss loader (20.1 kB gzip),
calculation worker (16.0 kB), occurrence helper (1.2 kB), and composition editor.
Ephemeris data and WASM load only after “Calculate occurrence preview”. Browser
tests assert there are no worker/data requests while merely editing sentences.
The published-reader control opens the exact dated app route; it does not import
the reader's large content libraries into Studio.

The first CI build exposed duplicated structured-draft change tracking at the
entry limit. Sharing that tracking for section layouts and V5 compositions keeps
the build within the existing entry limits. The production Sky comparison was
also regenerated for the new package evidence hashes; its source text, serving
state, and approval records are unchanged.

Verification includes Node/browser-source/shipped resolver parity, API draft and
publish/reopen/removal round trips, the actual published-content loader, a real
reader route with V5 source fixtures, full-article precedence, and independent
Swiss Ephemeris checks for Mercury (July 10) and Venus (October 30, 2026).
Studio tests cover mobile/desktop, both theme settings, reordered sections,
source references, variable insertion, and occurrence calculation. Existing
recovery and editor tests remain in the same browser gate.
The final combined build passes all 27 Studio browser checks, both V5 reader
regressions, both bundle budget checks, and the CSS/token audit.

The full CI reader run exposed a separate You refresh race: transit timing
enrichment imported the ephemeris directly after the natal chart was ready,
starting a second WebAssembly engine in the document. Reload aborted that late
download. The lookup now uses the existing calculation worker. Its regression
waits for a real timing response, rejects main-document Swiss downloads, and
retains the browser-error assertions. Three repeated fresh-build runs pass.

The repository-wide content suite was attempted. Its historical Friends owner
signoff checksum test fails on unchanged inputs from main; those source/approval
files are not rewritten or re-approved by this release. Focused V5 and existing
Studio/reader regression results are recorded with the pull request.

## Wider suite observations

The full-suite continuation ran 85 commands after the historical Friends failure.
The obsolete seven-field Studio assertion was updated to assert the exact ten
editable fields and now passes. These other checks also reported failures; they
are recorded rather than represented as a clean full-app QA result:

- `node scripts/test-reviewed-sky-aspect-phrasebook.mjs`
- `node scripts/test-sky-article-v1.mjs`
- `node --experimental-strip-types scripts/test-sky-article-template-slot-generation.mjs`
- `node --experimental-strip-types scripts/test-admin-sky-writeup-relations.mjs`
- `node --import tsx scripts/test-friends-transit-detail-provenance-gate.mjs`
- `node --experimental-strip-types scripts/test-daily-glance-scene-context.mjs`
- `node scripts/test-empty-house-refinement.mjs`
- `node scripts/test-fallback-refresh-wiring.mjs`
- `node --experimental-strip-types scripts/test-knowledge-matrix-v13-runtime.mjs`
- `node --experimental-strip-types scripts/test-lived-experience-108.mjs`
- `node --experimental-strip-types scripts/test-lilith-78-lived.mjs`
- `node scripts/test-weekly-horoscope-assembly.mjs`
- `node --experimental-strip-types scripts/test-transit-friend-pronoun-grammar.mjs`
- `node scripts/test-jupiter-descendant-trine-owner-copy.mjs`
- `node scripts/test-web-api-house-parity.mjs`
- `npm run test:astro-writing`

The web/API house parity check uses the host Python installation, which fails
loading an ARM pydantic extension into x86 Python. Other failures include old
corpus counts, protected-copy historical hashes, source-text assertions, a data-URL
relative import, and stale writing-harness artifacts. The separate aggregate
Studio QA command stops at its atomic-provenance test (267 entries versus its
39-template expectation). Those unrelated assertions and approval records are
not weakened in this change.
