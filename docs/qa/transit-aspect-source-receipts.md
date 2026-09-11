# Transit aspect source receipts

The September 11 repair builds on PR #759. That release removed the generic
transit-template link for composed Personal Transit readings. The follow-up
fixes missing dependencies for the Neptune notes, exact aspect inserts and
repeat-pass notes, and distinguishes an absent article from an article that
exists only in the bundled package.

## Shared reader and editor contract

The Node resolver, browser source and shipped artifact return ordered paragraph
receipts. Each receipt identifies the content key, selected body field and
audience. Headline sources are separate. Studio validates the full rendered
body against these paragraphs and validates the source fields against its
request-scoped eligible catalog. Published receipts include row identity,
version and publication revision; bundled receipts include package version.
Missing or malformed receipts do not expose editing links.

Personal Transits retains sign, houses, aspect, natal point and audience while
opening sources and Variables. Optional variant, pass, motion and timing are
preserved in the route and API. These manually selected values are labeled as
examples. Calculation remains the source of live event facts.

The exact-passage action queries the specific key, independently of the loaded
inventory. It opens a saved row when present. Otherwise, an existing package
record opens its complete original wording as an unapproved draft, preserving
`packageOriginalRecord`. Only a key absent from both sources opens a blank new
exact passage. Failed lookups offer retry. Saving does not approve or publish.
Source opening uses a fresh row/version and rejects superseded requests.

No source prose, eligibility rule, calculation, database schema or publication
approval is changed by this repair. Retired composition keys remain blocked.
The generic template path also reports the vocabulary and hooks used in its
slots; it is not substituted for a selected authored source.

## Verification inventory

| Aspect family | Actual source path | Verification |
| --- | --- | --- |
| Transit to natal, You and Friends Active | Shared `renderTransitAspect` / `renderTransitReturn`; paragraph sources open the identified field | 30,240 selectable cases across all 12 signs, 14 transit bodies, 18 natal bodies/angles, five aspects and two audiences; Node/browser/dist parity. 29,184 render; 1,056 explicit source gaps. Additional variant/pass/motion/timing cases and isolated dependency edits. |
| Natal aspects | Exact `natal-aspect-lived` row, forward or reverse lookup; finder opens that saved key | Existing exact-source finder, actual-handler publication/reader tests, and Natal Aspects browser flow. This is a separate exact-row path, not the Personal Transit composition. |
| Synastry / compatibility | `synastry-pair` exact or hard/soft family row; forward `body_you`, reverse `body_they` | Actual API admission and complete reader-copy roundtrip for both directions; compatibility workspace/browser source navigation. |
| Friends Between you two | `renderBondTransit` selects exact/family/variant `bond-effect` key; second paragraph is calculated facts | Source inventory checked separately; the workspace explains the effect of shared family/variant edits. No new per-occurrence editor is introduced. |
| Current Sky aspects | `renderSkyAspectCard` chooses one reviewed sign/exact/pair row and returns its key | Existing current-Sky source status checks and actual Sky editor save/version/receipt browser tests. No generic prose reconstruction. |
| Calendar aspects | Governed Calendar article identity and saved package record | Existing 439-row exact Calendar status/identity checks, actual-handler revision/publication tests and Calendar Aspects editor navigation. |
| Aspect patterns | Separate knowledge-engine writeup records, selected record/template IDs and versioned admin handler | Existing actual-handler CRUD/conflict suite and pattern reader runtime tests. The old fallback resolver's `renderAspectPattern` has no application caller in this checkout; it is not a live Studio source-link path. |

The exhaustive Personal Transit matrix is not an exhaustive content-quality
certification of the other families. The 1,056 explicit gaps identify missing
eligible writing, not broken CRUD. Completing those passages requires separate
owner writing and approval.

## Regression commands

- `npm run test:content-studio-api` includes the full source matrix plus the
  actual preview and generated-content handlers. Isolated create/reopen/update,
  stale conflict, publication, archive and restore cases cover exact articles,
  shared hooks, vocabulary and appended sources.
- `node scripts/test-transit-source-receipts.mjs` checks Node/browser/dist,
  supporting dependencies, shared fields, variants, pass hooks and the generic
  template path without mutating the package.
- The Content Studio browser suite covers Lilith, Friends audience, Neptune
  notes, Sun–Midheaven inserts, package-only exact articles, empty exact drafts,
  save/reopen, field focus, route context, stale requests and malformed responses.
- `tests/visual/sky-you-transit-parity.spec.ts` checks complete calculated
  Sun–North Node paragraphs in Sky and You, including reload and content refresh,
  at desktop/mobile sizes in both themes.

Run the required API CI check on the exact PR head. Production verification must
identify the main merge deployment and distinguish deployed-asset tests with
isolated writes from read-only checks against real saved owner content.
