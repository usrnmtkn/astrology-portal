# Placement pass Key dates: held verification

Status: owner-approved implementation and addendum verified after rebasing onto current `main`.

## Engine and rendering invariants

- Every verified residency pass is exposed by the ephemeris service.
- The page header selects the pass containing the page's reference date.
- `{{exitDate}}` resolves to the final exit of the complete verified residency.
- Single-pass residencies render one date range with no pass label.
- Station rows render only when the event falls inside a verified pass.
- Sun and Moon never produce station rows.
- Invalid or incomplete pass/station facts are omitted; no date or pass is guessed.
- Browser and Node renderers produce identical Key-date records.
- The exact owner-approved true-Lilith explanatory line renders once above its pass list and for no other body.
- Core content rows are unchanged.

## Fixed engine fixtures

- Lilith in Capricorn at 2026-08-09: 15 verified passes; first entry in 2026;
  current header pass 2026-07-31 through 2026-08-17; final exit 2027-08-13.
- Mercury in Cancer: one residency range; retrograde station 2026-06-29 and
  direct station 2026-07-23.
- Sun in Leo: one residency range and no station row.
- Venus in Virgo: one residency range and no station row.

## Generated package

- Package version: `v3-2026-08-10a`.
- `dist/tldr-content.js`, fallback manifests, bundled partitions, and
  `content-book.html` regenerated from source.

## Verification results

- `npm test`: PASS after the true-Lilith addendum (full content suite,
  astro-writing harness, typecheck, and production web build).
- `npm run test:performance-contracts`: PASS.
- Production web build: PASS; no bundle-budget change required.
- Current-sky engine probe at the fixed 2026-08-10 sample: about 897 ms on
  this branch versus 752 ms on clean main (approximately 145 ms additional).
- Fallback manifest: 7,209 keys; zero key additions or removals; only the
  package-version stamp changed.
- Approved source rows: no files changed, so all previously approved bodies
  remain byte-identical.
- Live/API calls: zero.

One pre-1800 boundary was made explicit: Pluto's earlier Aquarius residency is
outside the shipped Swiss planetary file. That historical lookup now returns
no fact instead of allowing Swiss Ephemeris to fall back to Moshier. Current
residency passes and stations remain Swiss-verified.
