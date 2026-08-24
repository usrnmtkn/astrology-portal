# Lunation book assembly V1 implementation record

Date: 2026-08-24

## Authority

The owner supplied and approved the source artifacts and the assembly specification
recorded in this directory. The serving unit is the exact `(kind, sign, rising)` book
cell. Every materialized card records its protected-body SHA-256, character count,
word count, source artifact, and approval record.

## Source reconciliation

The dedicated extraction originally contained 265 distinct cells. Reconciliation
against `book-sections-v1.json` recovered the Aquarius New Moon, Virgo rising,
6th-house passage. Its source heading contains a `Scorpio Rising` typo, but the Virgo
sign tag, 6th-house placement, body opening, and surrounding Aquarius sequence agree
on Virgo rising. A trailing page-number artifact was excluded and the recovery is
recorded on the canonical entry.

Final coverage is 266 of 288 cells. The 22 absent cells remain explicit source gaps
and use the existing approved row assembly; they never borrow another book cell.

## Runtime behavior

- The book is a deferred, lunation-only content partition.
- The You-page serves the approved book fallback by default when no date-specific
  Satori card exists; an explicit false feature value remains a rollback switch.
- An exact approved book cell leads the card byte-for-byte.
- Ordinary New Moons append the approved forward cycle sentence.
- Ordinary Full Moons append the engine-verified matching New Moon anchor, including
  the year only across a calendar-year boundary.
- Generic sign compact copy, opposing-house boilerplate, direct-ruler commentary,
  and weekly padding do not render on an exact book cell.
- A retrograde ruler may append only when its exact approved condition rows exist.
- Uranus-only lunation content remains retained and non-serving.
- Dynamic sky-aspect prose remains fail-closed until its new rows and selection rule
  receive separate approval.

## Retired row audit

The five legacy hook families requested by the spec contain 72 retained rows:
12 release, 12 shows, 12 higher-path, 12 intention, and 24 moment rows. Their full
copy, scope, approval state, and source-code references are recorded in
`legacy-lunation-hook-audit.json`. All 72 currently have zero source-code references.

## Bundle boundary

The protected book materializes to a dedicated production chunk named
`fallback-content-lunation-book`. On the first verified production build it measured
790.7 kB raw and 198.1 kB gzip. It does not enter the static App boot graph. The
Friends workspace remained 9.8 kB gzip.

## Verification

- 266 source entries, 266 distinct tuples, 266 distinct content keys
- zero house/key/character-count mismatches
- byte-exact source-to-materialized body checks for all 266 cells
- Node, browser-source, and shipped-dist lunation assembly parity
- explicit recovered-cell and missing-cell fallback regressions
- same-year and cross-year matching New Moon regressions
- web typecheck and production build
- web bundle budget and static-graph assertion
- canonical inventory/export parity at 10,804 records, including all 266 deferred
  book cells in the `authored-deferred` runtime bucket
- fresh-preview Chromium regression that opens the You-page lunation card and
  verifies the protected book opening and final sentence
