# Sky Write-up variable import

Use this contract for any spreadsheet of planet, sign, or placement phrases.
There is no `writing-library/planet/sun#planetDescriptor` content key. Those
fields live on Sky Placement records.

## Canonical keys

| Scope | Spreadsheet key | Where it is stored |
| --- | --- | --- |
| Planet phrase | `sky-placement/article/{planet}/aries#ingress.sources.{field}` | Share host. Other signs of that planet should link to this source, not duplicate it. |
| Sign phrase | `sky-placement/article/sun/{sign}#ingress.sources.{field}` | Share host. Other planets in that sign should link to it. |
| Zodiac season | `fallback-hook/zodiac-season/{sign}#body` | Shared season row, not a Writing Library content key. |
| Polar axis | `fallback-hook/zodiac-season-polar-axis/{sign}#body` | Same. |
| Placement phrase | `sky-placement/article/{planet}/{sign}#ingress.sources.{field}` | Local placement source. |
| Article sections | `sky-placement/article/{planet}/{sign}#tldrWhat` (also `tldrTakeaway`, `placementArticle`) | Record fields, not `ingress.sources`. |

Leave `placementDignityMeaning` empty. Traditional seven planets may fill
`placementDignityMechanism` (independent clause, no period, follows “Here,”)
and `placementDignityExpression` (verb phrase, no leading `to`, no period).
Uranus, Neptune, Pluto, the nodes, Chiron, and Lilith leave those empty.

Do not write these cells into `fallback-vocab/planet-function/*`. That family
also feeds natal/Friends vocabulary.

## Sample and validator

- Sample spreadsheet: `docs/content-management/fixtures/sky-writeup-variable-import-sample.csv`

```sh
npm run test:sky-writeup-variable-import
node scripts/validate-sky-writeup-variable-import.mjs path/to/import.csv
node scripts/validate-sky-writeup-variable-import.mjs --remap path/to/old.csv --out path/to/remapped.csv
CONTENT_GENERATION_SECRET=... node scripts/import-sky-writeup-variables.mjs path/to/import.csv
CONTENT_GENERATION_SECRET=... node scripts/import-sky-writeup-variables.mjs path/to/import.csv --apply
CONTENT_GENERATION_SECRET=... node scripts/import-sky-writeup-variables.mjs path/to/import.csv --publish
```

The importer groups cells by content key, writes a `continuous-placement`
`packageRecord` for new Sky Placement drafts, forks released LIVE Sky V4 /
season rows with a slim `packageDraft`, and skips any other LIVE row instead of
demoting it. Empty import shells from an earlier pass are deleted and recreated
so ingress is editable in the Variables panel. It does not approve or publish.

Every new or remapped cell stays `needs_review`. `skip_if_present` keeps live
approved copy. This validator does not publish, approve, or serve copy.

Copy the sample, keep the header row, and fill `text`. If a phrase field has a
second sentence, the validator moves it to `heldBackText` instead of importing
a permission slip into a noun phrase.
