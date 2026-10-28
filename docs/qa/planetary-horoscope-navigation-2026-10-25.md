# Planetary horoscope navigation — October 25, 2026

The owner requested that Horoscopes > Planets open the horoscope for the
planetary placement. The previous cards linked directly to `#sky/placement/…`
and opened the collective Sky write-up.

## Result

- Planet cards now open a dedicated Horoscopes route carrying the calculated
  planet/sign and selected reading sign. Example:
  `#horoscopes?period=monthly&sign=gemini&view=planets&planet=sun&placement=scorpio`.
- The reader shows the complete approved house-horoscope passage for that
  placement and reading sign. Its house is calculated using whole-sign order;
  it does not use a natal placement's house or borrow the collective Sky body.
- Calculated transit/station dates and motion appear beside the placement
  title. Separate sign and Rising chips, the shared sign explorer and the
  existing dated navigation treatment follow the handoff's S3H Planets reading.
- The Planets tab and All planets action return to the list. Adjacent placement
  controls, browser Back, sign selection and direct-link reload stay within
  Horoscopes. Other horoscope periods retain their published-edition behavior.
- A stale/invalid placement has an unavailable state. A missing/retired passage
  has an unpublished state. Source failures show retry; none opens Sky or
  substitutes a collective reading.

## Source and publication boundary

`PlanetaryHoroscope.tsx` reuses `prepareSkyPlacementSources` with the exact
article selection, its publication identity and existing approved bundle
installers. `renderSkyPlacementHouseCore` selects the complete governed
`house-horoscope-core/<planet>/<sign>/house-N` row. The existing loader owns
live revision admission, missing-row refusal, offline recovery and retirement.
The reader refuses a superseded identity and cancels late component updates.

The reader adds no authored prose, source edits, publication state changes or
paid generation. The seven private synastry drafts remain unchanged. The shared
sign explorer was extracted without changing normal reading behavior.

## Acceptance

A fresh production preview on port 4202 builds this checkout with
`reuseExistingServer: false`. Nine browser tests pass:

- Four planetary matrices: 390/1440px in light/dark. Sun in Scorpio card click,
  complete Gemini-house passage, Aries sign change, reload, browser return,
  adjacent Moon reading, All planets, Planets-tab return, Mercury Rx reading,
  calculated dates, unsupported route, semantic heading order, shared font
  metrics and no horizontal overflow.
- Exact published fixture copy loads after a transport failure/retry, survives
  reload, and disappears after retirement without exposing the bundled baseline.
- Four existing horoscope fidelity matrices across all populated/empty periods
  preserve the earlier date header, edition navigation and full-copy behavior.

Log: `/private/tmp/tldrastro-planetary-horoscope-acceptance.log` (9 passed).
The build includes web typecheck. CSS/token audits, existing full-detail copy
integrity and exact Sky house-template/protected-copy checks pass. The React
checklist was applied to the changed components: deferred reader, stable hook
order, cleanup of subscriptions, identity-bound async results and native links.

An unrelated in-progress Friends call/helper type mismatch briefly blocked the
fresh build. The call acquired its required argument through the concurrent
work; this change adds only `?? ""` for a shared chart's missing birth date.
The existing annual-timing guard treats that value as unavailable. The existing
relationship forecast regression passes; no date or chart fact is invented.

Read-only inspection of the actual port-5173 app confirms Sun in Scorpio opens
its Aries 8th-house or Gemini 6th-house horoscope, changes on sign selection,
returns to the planet list and keeps Horoscopes/Planets selected. Screenshot:
`test-results/planetary-horoscope-live-sun-scorpio.png`. The review tab remains
open on the new reader. This is local acceptance, not a production deployment.

## Provenance and limits

The remote was refreshed at the start of this request. Local branch
`codex/frontend-design-system-20261024`, HEAD `2baa1b170`, is 0 ahead / 31 behind
`origin/main` (`ad951d80e`). The checkout contains concurrent work, preserved
without reset, stash or commit.

Reader/test source hashes: `/private/tmp/tldrastro-planetary-horoscope-source.json`,
SHA-256 `7047f50b6ecc5a65cb9585b9b3ee9bdfb59a9d9ea0af755a85df7d69134fdd11`.
Fixture acceptance models the public reader projection and publication ledger;
it is not a new authorization audit of the unchanged API. Existing house-copy
checks cover the source resolver and shipped renderer, and browser checks assert
the new consumer's complete passage. This does not sign off unrelated handoff
screens or promise content for an unpublished placement.

Bundle measurements and the narrowly scoped allowances are recorded under
`planetaryHoroscopeRouting20261025` in `scripts/web-bundle-budgets.json`.
The dedicated reader and shared explorer remain deferred. There are no new
dependencies or changes to startup, CSS, content or calculation ceilings.
