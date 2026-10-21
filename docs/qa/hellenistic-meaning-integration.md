# Hellenistic meaning source integration

The new `hellenistic-meaning-support/v1` reference supplies neutral interpretation
knowledge to future horoscope and article requests. It does not establish voice,
calculate chart facts, approve wording, or publish content. The owner's saved
profiles, scoped corrections, complete eligible passages and existing surface
workflows retain authority.

## Source and interpretation boundaries

`packages/astro-knowledge/data/frameworks/hellenistic-meaning-support.json`
contains 38 bounded interpretation records and 12 historical house references.
Every record identifies the supplied PDF and one-based PDF pages. Seven source
records retain author, language, page count and original PDF SHA-256. The original
PDFs, extracted text and private writing profiles are not repository assets.

The main Brennan source supplied is a Czech translation with translator additions.
The Spanish document is a partial excerpt. Obert, Neely and journal contributors
retain separate attribution. Neely's exaltation proposal is an alternative
hypothesis. Selected technical sections were checked; this is not a cover-to-cover
source audit. Document instructions and quoted examples carry no user authority.

Runtime selection preserves the distinction between planets, signs, houses and
configurations; conditions modify interpretation rather than guarantee outcomes.
Signs cannot supply numbered houses. A house must occur in supplied facts and is
excluded when house reliability is false. Source notes cannot invent exactness,
ruler condition, biography, timing or another person's motives. They do not
replace governed event meanings or existing calculation/orb settings.

Sect, solar thresholds, directed superiority, aversion, reception, formal
bonification/maltreatment, lots, triplicity periods, profections, releasing and
historical house inventories remain reference-only. They require a separately
governed calculation and interpretation path before automatic drafting use.

## Runtime delivery and preservation

- Daily, Weekly, Monthly and Seasonal prose requests receive a distinct neutral
  meaning section. Monthly synthesis and Seasonal mechanism/planning receive it
  as meaning data. Rebuilt Seasonal prose retains it once.
- Shared article/natal writing and template-slot requests receive scoped meaning
  support. The shared OpenAI meaning planner receives the same neutral source.
  Sky placement/aspect card generators retain their existing provider gates and
  append meaning support to the actual writer request.
- The Personal Transit exact-contact writer and relationship projection retain
  their existing reader-meaning boundary. Raw mechanics cannot bypass it.
  Independent voice-review evidence is not expanded with external doctrine.
- Framework and selected-record hashes identify the meaning version separately
  from owner voice evidence. Horoscope and lunar source hashes bind new plans to
  the new source. Previously stored requests retain their original input.
- Knowledge builds validate role flags, page references and historical-house
  scope. The canonical catalog discovers `doc/hellenistic_meaning_support` with
  doctrine-only permission. Full reference material is absent from browser
  runtime knowledge bundles.

There are no changes to saved profiles, complete owner passages, approved reader
rows, calculation settings, model routing, paid-call counts or publication gates.
No paid samples or reader-content regeneration are part of this implementation.
Provider-input tests establish source delivery and preservation, not prose quality.

## Acceptance evidence

Base: `origin/main` at `a7d2d778a3539c800b7ed3d8a1b248ebc4419d69`.
Work branch: `feat/hellenistic-knowledge-20261020`.
Implementation tested: `e8f5d2c5be14ab7229afe675d9c3b4eef7d7cf3c`.

| Criterion | Evidence | Status |
| --- | --- | --- |
| Source roles, authorship, source pages, no missing-house inference, no unsupported techniques | `npm run test:hellenistic-meaning` | Passed locally |
| Both article providers, shared planner and projection boundary | `scripts/test-transit-ingress-meaning-delivery.mts` with intercepted provider transport | Passed locally |
| All four horoscope periods retain complete current guidance and preserved saved copy | `scripts/test-horoscope-latest-instructions.mts` through actual handlers | Passed locally |
| Seasonal mechanism/plan and rebuilt prose retain source; voice review stays separate | `scripts/test-seasonal-composition.mts` through actual handlers | Passed locally |
| Actual server bundle preserves version-checked owner writes | `scripts/test-generated-row-writers.mts` | Passed locally |
| Server type check | `npm run typecheck:server` | Passed locally |
| Full Content Studio API gate | `npm run test:content-studio-api` | Passed locally |
| Fresh production-entry browser profile save/preview/reload journey | `STUDIO_PRODUCTION_ENTRY=1 npx playwright test --config=playwright.horoscope-writing.config.ts` | Passed; five tests |
| Repository and reader-bundle privacy | Protected-policy scan and browser knowledge partition checks | Passed; 11,232 source files and 350 built assets |
| Hosted exact-head checks and production revision | Release workflow | Outside local acceptance; verify current PR/deployment metadata |

All mutation/generation checks use isolated storage and synthetic provider
responses. Existing production copy is not mutated to obtain test evidence.

The complete API command passed after provisioning the prescribed ignored
protected report-reference store. This is a test prerequisite, not a source or
reader-content change. Browser verification used a fresh production-entry build
with `reuseExistingServer: false`, phone/desktop widths and both themes.

No original PDFs, extracted source text, protected report documents, private
profiles or new reader prose are in the commit. This records local acceptance;
current hosted checks and deployment status belong to the PR/deployment metadata.
Hosted checks on the exact head remain required before merge.
