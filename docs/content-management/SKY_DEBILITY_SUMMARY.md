# Editable Sky detriment/fall summary

## Editorial location and authorization

Content Studio → Sky Write-Ups → Daily Sky Summary. The effort-summary editor
is mounted immediately after the Daily Sky Summary editor by the existing
`GeneratedContentAdminDashboard.tsx` integration. This change expands that
section rather than mounting a duplicate.

The owner requested a complete matched phrase bank, approved wording for this
work, and explicitly requested editing in this location. The Venus/Scorpio,
Mars/Cancer and Saturn/Aries phrase sets are the supplied wording. The other
15 sets are newly authored under that authorization, not represented as
previously published owner sentences. All remain editable through the existing
Save draft / Save & publish workflow. No runtime language model is involved.

## Complete coverage

The only dignity authority is `apps/web/src/services/planetSignDignity.mjs`.
The 18 qualifying planet/sign identities are:

| Planet | Detriment | Fall |
| --- | --- | --- |
| Sun | Aquarius | Libra |
| Moon | Capricorn | Scorpio |
| Mercury | Sagittarius, Pisces | Pisces |
| Venus | Aries, Scorpio | Virgo |
| Mars | Taurus, Libra | Cancer |
| Jupiter | Gemini, Virgo | Capricorn |
| Saturn | Cancer, Leo | Aries |

Mercury/Pisces has one matched set and counts as one planet, retaining both
conditions. No outer-planet, Chiron, angle, node, peregrine, house or aspect
conditions are invented. This is collective Sky copy, not natal copy.

## Writing contract

`skyDebilityPhrases.ts` contains one connected set per qualifying identity:

- `livedExperienceClause`: completes "You may…"
- `situationPhrase`: a singular situation with an article
- `planetFunctionVerbPhrase`: completes "how we…"
- `responseClause`: completes "It may help to…"

These are short-form sources, not aliases for `placementDignityMeaning` or
other complete-sentence/paragraph fields. No phrase contains final punctuation
or nested template tokens. Each source is editable at
`cms/sky-debility/placement/{planet}/{sign}/{fieldName}`.

The shared catalog registers 72 phrase fields, eight active card fields and
five retained legacy fields. Dignity and identity are not authored text.

## Card templates

The actual Sky summary editor uses single-brace tokens, consistent with its
existing parser. The conceptual double-brace Mad-Libs names are unchanged.

Heading: `{openingHook}` (an authored complete heading, resolved separately).

```text
You may {livedExperienceList}. {situationList} can take more out of you than you expected.

{planetList} {signConditionClause} how we {planetFunctionList}. That is what “detriment or fall” describes, not a prediction that things will go badly. It may help to {responseList}.
```

The first paragraph is `experienceTemplate`; the second is `contextTemplate`.
The full heading, singular/plural connecting wording, example order, count line
and count unit can also be edited. All required tokens must appear exactly once.

The assembler joins experiences/situations with "or", responses/functions/names
with "and", capitalizes sentence starts, and selects singular/plural grammar.
It renders Sun and Moon with their article while preserving calculated names.

## Selection and safety

Zero qualifying planets hides the reader card. Missing planet positions also
hide it rather than presenting unknown data as a zero count. One to three
qualifying planets each receive a matched example. Above three, a saved
`exampleOrder` selects three complete sets. Default order is Sun, Moon, Mercury,
Venus, Mars, Jupiter, Saturn; it is editorial ordering, not a severity score.
All qualifying planets remain in the count, names/functions and placement links.

Studio exposes seven preview selectors and names selected and omitted examples.
This composition preview is explicitly not a dated astronomical chart.
Changing an experience never selects another placement's response.

The pure `assembleSkyDebilityCopy` powers both Studio and the reader. It reports
missing/invalid wording and omits the whole reader card instead of rendering
sentence fragments. The shared field validator is already used by the Studio
editor and the generated-content API's publication validation. Required fields
cannot be published with missing tokens, blank phrases, nested variables or
malformed example order.

The reader loader fetches the expanded keys through `skyDebilityContentKeys`.
Only an eligible LIVE row replaces the authorized shipped baseline. Drafts do
not leak into the reader; stale or retired published revisions never silently
fall back to the bundled wording. Legacy title/body keys remain recoverable;
no existing database row is overwritten or deleted by the code installation.

## Verification

Run `node --import tsx scripts/test-sky-debility-copy.mts` or the existing
`npm run test:sky-daily-summary` aggregate. The focused test covers all 84
traditional planet/sign lookups and all 6,912 normalized content states
(including the hidden empty state), plus matched sets, grammar, saved ordering,
CMS overrides, unpublished drafts, stale revisions and retirement.

6,912 is a Cartesian-product test count: each planet can be non-qualifying or
in one qualifying sign. It is not an assertion that every combination occurs
in the physical sky. Real dates and positions remain the ephemeris's job.

The dedicated PR workflow runs the focused test and builds both Studio and the
web reader. A passing combination test alone is not a production deployment
or a browser-level save/reopen test.
