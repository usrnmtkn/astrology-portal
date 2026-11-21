# Complete Deeper Insights combination inventory

The requested next model is one complete, separately editable reading per topic
combination and audience. The combination editor and exact reader matching are implemented locally.
This does not create the full writing library, approve prose, or deploy it.

`scripts/audit-natal-insight-combinations.mjs` enumerates the existing reader's
discrete selection states through `natalInsightCompositionPlan`. It deduplicates
planets that occupy multiple roles and verifies unique selection signatures.
It never reads account or birth data, writes database rows, or calls a model.

## Counts and their limits

These are **structural upper bounds**, not counts of astronomically reachable
charts or approved writing requests. The current reader accepts sign-level
facts. An ephemeris reachability catalogue has not been established. In
particular, Mercury/Venus proximity and Ascendant/Midheaven geometry constrain
some apparent permutations. Do not order a paid batch using these totals.

| Topic | Matching facts | States per audience | Separate You + Friends readings |
| --- | --- | ---: | ---: |
| Approach, timed | Rising; chart ruler sign/house; Sun sign | 1,596 | 3,192 |
| Approach, untimed | Sun and Moon signs | 144 | 288 |
| Emotional needs | Moon and Sun signs | 144 | 288 |
| Home & belonging | Fourth-house sign; ruler sign/house | 144 | 288 |
| Creativity & pleasure | Fifth-house sign; ruler sign/house; Venus sign | 1,464 | 2,928 |
| Style, timed | Venus and Moon signs; fifth-house sign | 1,728 | 3,456 |
| Style, untimed | Venus and Moon signs | 144 | 288 |
| Money & resources | Second-house sign; ruler sign/house | 144 | 288 |
| Work, with Midheaven | Linked second/sixth/tenth houses; three ruler signs/houses; MC sign | 248,832 | 497,664 |
| Work, MC unavailable | Same three house-ruler chains; no MC interpretation | 20,736 | 41,472 |
| Total upper bound | Includes untimed/MC-unavailable variants | 275,076 | 550,152 |

Whole-sign house signs determine the Ascendant and one another. A ruler's sign
then determines its destination house; it is not another independent factor of
12. The traditional ruler is determined by the source sign. Leo rising uses the
Sun in both roles, while a Taurus or Libra fifth house uses Venus in both roles.
Work's three traditional rulers are distinct. Emotional needs uses the same
identity regardless of birth-time availability.

House-based Home, Creativity, Money and Work remain unavailable without birth
time. The current Work MC-unavailable variant is counted separately from an
unknown birth time. Shared identities do not currently include degrees,
aspects, house occupants, motion, sect or a complete condition assessment.
Adding those changes the editorial scope and invalidates this inventory.

## Existing content versus full-combination coverage

The current Deeper Insights implementation selects whole passages and a topic
template. A source existing is not evidence of a complete authored combination.
The 2,016 synthetic cases in `test-natal-insight-composition.mjs` exercise the
source families; they are not an exhaustive full-combination inventory.

Run the audit with metadata from the authorized shared natal library to compare
saved sources with runtime dependencies. Keep this live inventory outside Git.
Missing optional contextual overrides are distinct from missing required
sources and missing complete readings. No draft is treated as published.

The existing Natal Chart placement resolver is also not a whole-chart authored
matrix. It prefers exact complete placement units where supplied, and otherwise
uses governed sign and house sections. Verify source, generated package and
runtime separately before making a broader coverage claim.

## First bounded inventory

Home, Money and Emotional needs total 432 topic combinations, or 864 separate
You/Friends readings. The private report enumerates all 864 proposed records,
their matching facts and existing source references. Every body is null and
every state is `not-authored`. These are planning entries, not empty rows saved
to Studio and not approved writing outlines.

The `cms/natal-insight/complete/v1/` namespace is now recognized by the reader
and publication boundary through a strict canonical identity parser. Keep it separate from guides, legacy
passages and private chart-specific overrides. Do not import these planning
entries as reader content.

## Implementation and authoring contract

1. One immutable matching identity per topic and audience, with a complete
   editable body and ordinary exact-version save/reopen behavior. Friends prose
   is separately authored, not a pronoun conversion.
2. Studio uses dependent selectors and paginated saved-reading search. It must
   not download or materialize the whole Cartesian matrix in the browser.
3. Calculated reader facts derive the exact key. Only signed-off, eligible
   complete rows may serve. Missing combinations remain a visible editorial
   gap; concatenating old passages does not close that gap.
4. Existing source wording, guides, private overrides and publication states
   remain preserved during authoring. A cutover must not replace complete
   existing readings with empty drafts.
5. Authoring follows the current canonical writer contract and current owner
   corrections. Preserve scoped approval and paid-call limits. A count is not
   a meaning plan or permission to generate a whole library.
6. Acceptance covers exact selection, both audiences, draft exclusion,
   missing/invalid facts, failed loads, Studio save/reload and stale-write
   conflicts. Run the required affected Studio API and browser gates before
   reporting the feature complete.

## Reproduce

```sh
node scripts/audit-natal-insight-combinations.mjs \
  --out=/private/path/combination-inventory.json
```

Optionally add `--saved-metadata=/private/path/natal-metadata.json`. The input is
`{ readAt, rows: [{ content_key, status, ...metadata }] }`, limited to shared
`cms/natal-insight/` rows. The audit rejects duplicate keys and input/output
inside this public repository. It needs the checkout's own installed Vite.

Exact tested revisions, live metadata timestamp and private evidence paths
belong in the task handoff. No production deployment is implied by this audit.

## Editor and reader implementation

Open **Natal Chart → Deeper insights → Complete readings**. Choose the topic,
audience and chart factors. A house sign selects its traditional ruler; the
ruler sign determines its whole-sign house. Work's linked house signs are
calculated together. A planet used twice has one selector. Unknown birth time
removes house-dependent combinations and has separate Approach/Style identities.

**Open complete reading** checks the exact saved key before opening a blank
starter. It never copies another audience's wording or assembles source passages
into a supposedly authored draft. The existing editor saves/reopens the whole
body and applies its ordinary conflict and publication checks. Drafts do not serve.
No empty matrix is inserted into storage. Saved readings use 20-row pages by topic
and audience; the main Natal Chart inventory only preloads the legacy guide and
passage families. Its exact selectors find records beyond the displayed page.

Reader precedence is private exact-chart override → published complete topic
combination → existing approved composition. An explicit publication hold or
retirement of the complete record prevents fallback. New drafts without a
publication do not displace existing eligible composition. Missing combinations
remain writing work even when the old composition can still serve. Reader layout,
guides and saved source wording are unchanged.

`natalInsightCombination.ts` holds the discrete identity contract shared by Studio
and the API; `natalInsightCompleteReading.ts` adapts calculated chart facts to it.
A decoder must re-encode the exact same key, rejecting forged rulers/houses,
unknown signs, extra segments and private fingerprints. Complete publications
require a body. Friends readings permit only `{{ownerName}}`, resolved from the
selected chart display name. You readings permit no interpolation variables. This namespace does not
include birth details, account identifiers, degrees, aspects, motion or condition.

Validation includes the inventory's 275,076 unique canonical identities, a
4,032-case focused chart/audience/time test, real-handler CRUD/publication tests,
and fresh browser coverage of save/reload, separate audiences, paging, load
failures, draft exclusion and rendered full-body preservation. Exact run results
are recorded separately; these checks use isolated synthetic fixtures.

The full combination library remains separate editorial work. Draft candidates
are not approved wording and are never published by implementing the editor.
Follow the current writer contract and preserve existing scoped authorizations;
do not infer a paid whole-library batch from these structural counts.
