# AC Reference Integration

AC is available as a non-serving editorial knowledge source and an individual-word vocabulary reference.

## Imported scope

- 172 long-form or doctrine-oriented articles.
- 239,405 extracted words.
- Article titles, publication metadata, categories, topic labels, search terms, word counts, and content hashes are stored in the checked-in index.
- Full article bodies remain in the owner-provided local mirror and are not copied into the repository.
- 1,196 daily forecast posts are excluded so historical date copy does not dominate the knowledge or vocabulary lanes.

## Source label

All sourcing uses `AC`. The expanded author name is not used in manifests, prompts, reports, or generated sourcing.

## Knowledge policy

AC material is source testimony, not verified fact. A local query may retrieve short relevant excerpts for editorial research, but every excerpt is labeled `UNVERIFIED REFERENCE LANE`.

The following never flow from AC into production facts:

- dates or times;
- planetary positions;
- numerical claims;
- historical assertions;
- doctrine that has not been independently checked;
- phrases, metaphors, or signature constructions.

Runtime astronomy remains the responsibility of the app's ephemeris and calculation layer.

## Vocabulary policy

The writer prompts may receive individual words that already occur in Marie's corpus and also recur in AC. This is lexical overlap, not voice transfer. AC-only words remain in an owner-review list and are not injected automatically.

Marie remains the authority for syntax, rhythm, phrasing, interpretation, and final approval.

## Local commands

Rebuild and verify the metadata-only index:

```sh
npm run build:ac-reference-index
npm run test:ac-reference-index
```

Search article metadata:

```sh
node scripts/judge-editorial-source-bank.js --ac-query "Saturn Capricorn"
```

Build a short, explicitly unverified local research context:

```sh
node scripts/judge-editorial-source-bank.js --ac-context "Venus retrograde desire"
```

The context command is an editorial research aid. It does not add facts to the reference fact bank and does not authorize publication.
