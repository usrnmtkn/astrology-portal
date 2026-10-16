# Moon transit source routing

Owner request: make the 60 existing letter-tagged Moon sources selectable,
including 15 shorthand natal identities, without changing published copy.

## Acceptance

- Every identity in `tests/fixtures/moon-transit-legacy-identities.json` is
  reachable with a canonical natal point and a supported numeric variant.
- Stable reader seeds reach every eligible variant, including `any` families
  and distinct canonical/alias siblings. Unvaried sources remain in rotation.
- Situation and exact-contact priority, pass priority, editorial eligibility,
  retirement, primary/alternate identity and missing-audience refusal remain.
- Node, browser source and shipped resolver select the same complete passage.
- Studio preview and You/Friend readers render the selected source, preserve it
  through reload, and retain the original content key in source/edit links.
- Published primary and alternate text, hashes, source versions and private
  notes remain byte-identical. No content migration or publication is needed.

## Identity contract

The legacy aliases apply only to Moon transit source keys: `a` = Ascendant,
`c` = Chiron, `j` = Jupiter, `m` = Mercury, and `s` = Sun. These identities were
checked against both the original source contact clauses and the published
primary/retained passages. Stored keys are never normalized or merged.

An eligible source's numeric variant is its one-based position in the sorted
matching Moon variant list. The list includes exact-aspect, matching hard/soft
and `any` variants for the canonical point and its legacy alias. Blocked source
identities reserve their slot even when their saved row is unavailable; selecting
that slot reports unavailability instead of shifting to another passage. Selection does
not depend on passage length, audience or availability of an alternate. Changing
writing version therefore never selects another source to fill missing history.
Exact-contact and situation precedence still apply ahead of shared families.

Ordinary reader rotation hashes the existing reader/contact seed across that
list plus the unvaried choice. Other planets retain their previous rotation.

## Verification

Run `npm run test:moon-transit-routing`, then the required content, Studio API,
type, CSS, privacy and fresh-build browser gates. Compare the private final v22
snapshot in memory without copying its prose into fixtures or logs. Deployed
reader acceptance is separate from fixture verification and requires the exact
main deployment to be READY.

The focused suite also invokes the actual authenticated preview handler with
isolated saved rows and publication records. Its storage double checks both
canonical and alias query prefixes; all 60 identities are checked for each
audience and writing version. Authentication denial remains required.

Fresh browser coverage is in `playwright.moon-routing.config.ts`: normal Sky,
You and Friend navigation, full paragraphs, reload stability, Studio variant
choices beyond four, retained versions and opening the original alias source.
These tests use synthetic text and make no content writes.

On the integrated `b375ebe` base, grouping four existing pure astrology helpers
reduces startup JavaScript from 40 files to 38. Measured app/reader gzip totals
are 517,967/573,051 bytes, below the unchanged 518,200/573,350-byte limits.
The separate calculation-engine chunk remains byte-identical. This is packaging
only: no new startup dependency, arithmetic, prose or budget change.
