# Editable Sky detriment/fall summary

## Editorial location

Content Studio → Sky Write-Ups → Daily Sky Summary → Things may take more
effort right now. The existing `SkyDebilityStudio` is mounted immediately after
the Daily Sky Summary editor. Read-through, Composition map, and Full template
share the same working sources and the production assembler.

## Count-first refinement (2026-09-17)

The owner requested the explanation to begin with the qualifying count out of
the seven classical planets, name the planets, explain detriment or fall, and
then connect their functions to everyday experience and matched responses.
The exact supplied three-planet paragraph is protected by the independent
regression fixture `tests/fixtures/sky-effort-count-first.ts`. Fixtures are not
imported by production code.

Only the shared context paragraph, its new singular/plural explanation fields,
and Venus in Scorpio's function phrase (`connect with others`) change. The
heading, first experience paragraph, other 71 placement phrases, calculated
positions, dignity lookup, example ordering and publication gates are preserved.
No saved CMS rows are overwritten. Existing connecting-phrase overrides remain
available for recovery and older explicitly saved paragraph templates.

## Complete coverage and facts

`apps/web/src/services/planetSignDignity.mjs` is the only dignity authority.

| Planet | Detriment | Fall |
| --- | --- | --- |
| Sun | Aquarius | Libra |
| Moon | Capricorn | Scorpio |
| Mercury | Sagittarius, Pisces | Pisces |
| Venus | Aries, Scorpio | Virgo |
| Mars | Taurus, Libra | Cancer |
| Jupiter | Gemini, Virgo | Capricorn |
| Saturn | Cancer, Leo | Aries |

Mercury in Pisces retains both conditions but counts once. The denominator is
computed from the seven traditional bodies, including Sun and Moon; outer
planets, Chiron, angles, nodes and peregrine conditions do not enter this card.
The card requires all seven calculated positions and is hidden when facts are
incomplete or no planets qualify. A zero count is not an easy-day prediction.

## Source fields and grammar

One matched set per qualifying planet/sign provides:

- `livedExperienceClause`: completes `You may…`
- `situationPhrase`: a singular situation including its article
- `planetFunctionVerbPhrase`: completes `it takes more effort to…`; older
  paragraph templates may use `how we…`
- `responseClause`: completes `It may help to…`

These fields remain at `cms/sky-debility/placement/{planet}/{sign}/{fieldName}`.
They are not aliases for full dignity passages such as `placementDignityMeaning`.
Phrases have no final punctuation or nested variables. Complete explanation
sentences, in contrast, include their final punctuation.

## Full paragraph templates

The editor and reader use the established single-brace syntax.

`experienceTemplate` (unchanged):

```text
You may {livedExperienceList}. {situationList} can take more out of you than you expected.
```

`contextTemplate`:

```text
{countWord} out of the {totalWord} classical planets {countVerb} currently in detriment or fall: {planetList}. {dignityExplanationSentence} With {planetReference} involved, you may notice that it takes more effort to {planetFunctionList}. It may help to {responseList}.
```

`dignityExplanationOne`:

```text
This means it is moving through {signTitle}, a sign that makes it harder for it to do its usual work.
```

`dignityExplanationMany`:

```text
This means they are moving through signs that make it harder for them to do their usual work.
```

The two new sentences are editable under **Card template, heading, and example
order**, or by clicking their wording in Composition map. Clicking
`{dignityExplanationSentence}` in Full template reveals the selected sentence's
source. One planet selects the singular sentence and its calculated sign;
multiple planets select the plural sentence.

| Slot | Contract |
| --- | --- |
| `count` / `total` | Existing numeric strings used in the header |
| `countWord` | Qualifying count in sentence-initial English, e.g. `Three` |
| `totalWord` | Calculated classical-body total in lowercase English |
| `countVerb` | `is` for one qualifying planet, otherwise `are` |
| `planetReference` | `this planet` or `these planets` |
| `planetList` | All qualifying planets, joined with `and` |
| `dignityExplanationSentence` | Editable complete sentence selected by count |
| `planetFunctionList` | All qualifying planets' saved function phrases |
| `responseList` | Responses from the selected matched examples |

Number words are formatting of the same snapshot used by the header, not a
second count or a hardcoded example. Template words stay editable; calculated
counts, identities, signs, and grammar values remain read-only in the map.

## Compatibility and publication

A saved `contextTemplate` containing `{signConditionClause}` is validated
against its original four-slot contract and uses the existing
`signConditionOne/Many` sources. It is never spliced together with the new
explanation sentences. Mixed old/new contracts are rejected. The default
count-first template does not consume the older connecting fragments.

`skyDebilityTemplateSlots` exposes the exact active contract to the source
editor. All required variables must occur exactly once. Missing, unknown,
repeated or malformed variables block the affected composition and publication.

The dynamic field registry and `skyDebilityContentKeys` include both new
explanation sources. Only eligible current LIVE rows replace the shipped
baseline. Drafts do not replace reader copy; missing, stale or retired published
revisions fail closed instead of silently reviving the baseline. No runtime AI
or string-level paraphrasing is used.

## Matched examples

One to three qualifying planets each receive a matched experience, situation
and response. Above three, saved `exampleOrder` selects three whole sets. All
qualifying planets still appear in the count, planet/function sentence and
placement links. Default ordering is editorial, not a severity ranking.

All 18 placement sets remain editable. Selecting or editing one experience does
not substitute another placement's response. Preview placements are explicitly
editorial examples, never saved astronomical facts.

## Verification

- `scripts/test-sky-debility-copy.mts`: all 84 traditional planet/sign lookups,
  all 6,912 normalized content states, exact approved example, singular/plural
  grammar, preserved legacy overrides, and draft/live/stale/retired behavior.
- `scripts/test-sky-debility-composition.mts`: byte parity with the reader and
  exact source routing across the same states, including calculated count tokens.
- `tests/visual/sky-debility-composition.spec.ts`: full read-through, clickable
  new sentences/variables, keyboard access, source edits, and draft/publish/reopen
  with isolated mock storage on desktop/mobile and actual Studio light/dark themes.
- `tests/visual/sky-debility-reader.spec.ts`: exact paragraph and placement links
  in the rebuilt Sky reader using its ephemeris for a fixed regression instant.

6,912 is a Cartesian-product content-state count, not a claim that all tuples
occur together in the physical sky. A CI pass is distinct from a deployment;
production delivery must be verified separately after merge.
