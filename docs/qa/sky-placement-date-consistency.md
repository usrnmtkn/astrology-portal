# Sky placement date consistency

The September 12, 2026 Sky card displayed Sun in Virgo as August 23–September 23,
while its article header and `entryDate` / `exitDate` variables displayed
August 22–September 22. The card used UTC calendar dates; the article used the
calculated location's time zone.

Placement card and template-slot ranges now use `position.transitTimeZone`, with
the same browser-zone/UTC fallback as article endpoints. Same-day, month, and
year comparisons also use that zone. This preserves the existing compact labels
while correcting the civil dates. Ephemeris calculations, approved prose,
publication records, and article variable resolution are unchanged.

Direct Swiss Ephemeris checks bracket both Sun sign boundaries by one minute for
two transits. Calculated Virgo boundaries are `2026-08-23T02:18:48.999Z` and
`2026-09-23T00:05:13.999Z`: August 22 and September 22 in New York, August 23 and
September 23 in UTC/Tokyo. The Capricorn check crosses 2026/2027 and places its
entry on December 21 in New York/UTC and December 22 in Tokyo.

Verification commands:

- `node --import tsx scripts/test-sky-placement-date-consistency.mts`: real app
  adapters, two direct ephemeris boundary checks, three zones, and local
  day/month/year compression. Added to `npm run test:sky-placements`. The initial
  regression failed on `Aug 23 - Sep 23` versus New York's August 22 entry.
- `npx playwright test tests/visual/sky-placement-dates.spec.ts --workers=1`:
  fresh reader build; Sky card → article, calculated header and date variables,
  reload, and Back. Three scenarios use a browser time zone different from the
  selected Sky location. Editorial rows are synthetic; calculation workers use
  the real ephemeris.
- `node --import tsx scripts/test-sky-placement-engine-facts.mjs` and
  `node --import tsx scripts/test-sky-placement-retrograde.mts`: existing placement
  facts and motion behavior.
- `npm run test:content-studio-api`: full isolated-checkout API contract, plus
  the unfiltered GitHub workflow on the exact PR head before merge.
- CSS contract and staged/repository/built-reader privacy scans.

The PR records the tested commit, results, and main deployment. Live verification
must check the real Sun card and article after that deployment becomes Ready.
