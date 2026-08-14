# Writing pipeline v3 implementation report

Date: 2026-08-13  
Status: implemented locally, uncommitted, owner review pending  
Billed API calls: **0**

## Scope

Changes 1 through 4 of the owner-approved 2026-08-12 plan are implemented. The preference
fine-tune is out of scope and untouched. No generation, staging, serving, approval, content
row, manifest, or package-version change was made.

## 1. Argument gate

- Added a ten-field, one-line structured argument outline with a stable SHA-256.
- The first pipeline run returns `argument-review-pending`, `draft: null`, and zero billed calls.
- Exact owner approval is required and bound to the outline hash.
- A changed outline fails with `ARGUMENT_OUTLINE_DRIFT`.
- The approved outline, its hash, and the spine ID are attached to any eventual generated page.
- The writer cannot be called before approval.

## 2. Spine requirement

The recorded slow-mover article spine is enforced as:

`planet -> condition -> job -> thesis -> lived evidence -> failure -> strategy -> handoff -> recurrence -> collective test -> close`

Families currently lacking a recorded spine:

- cards
- lunations
- aspects
- house cores

Those families fail closed with `RECORDED_CONTENT_SPINE_REQUIRED:{family}` before the writer
call. The fast-mover spine was owner-approved as amended on 2026-08-13 and is now recorded.
The Venus in Libra v2 outline is still owner-review-pending, so no prose was drafted.

## 3. Before/after pairs in the prompt

- Combined source: 20 original corrections plus 44 mined critiques.
- Deduplicated by normalized bad text: **57 unique corrections**.
- Each generation prompt receives 6 to 10 direct pairs; default **8**.
- Every pair contains before, after, category, family, rule when present, and the owner's
  stated reason.
- Ranking order: exact content family; same surface family; explicitly requested failure
  modes; that family's historical category frequency; adjacent family; stable source order.
- The whole correction corpus is never inserted into one prompt.

The Venus in Libra proof selected eight sky-placement pairs: four natural-language, three
abstraction-over-consequence, and one constructed-sentence correction.

## 3a. Governed scene evidence

Scene evidence now has its own retrieval lane and is not treated as register evidence.

- Primary: approved same-planet-sign house-horoscope cores. Venus in Libra has 12; all 12
  are present in the packet audit.
- Secondary: 47 approved serving rows across 12 indexed families at the
  three-distinct-scene-noun threshold.
- Tertiary: 41 unique higher-governance matrix rows at the two-distinct-scene-noun threshold.
  The 143 lower-precedence rows stay inventoried and do not displace this governed tier.
- Hard precondition: if approved same-planet-sign scene material exists in any governed scene
  source and none reaches the packet, the run returns `failed-retrieval` before credentials or
  the writer.
- House boundary: a houseless placement article may learn the observable actions, objects,
  costs, and follow-up work, but may not import the house interpretation.

The Venus audit also records every approved family still outside the writer's current
register, matrix, and scene lanes. No family is silently treated as eligible.

## 3b. Shared four-role evidence index

`shared-evidence-index-v1.json` indexes content in place by planet-sign and role. It contains
3,455 meaning entries, 483 register entries, 112 scene entries, and 56 argument entries. Every
article packet must contain all four roles. The current approved article is argument-and-close
evidence only; it cannot silently become a register source. Generation metadata records the
packet IDs by role so the owner's reviewer can trace scenes and report owner-approved sentences
that were available but unused.

## 4. Deterministic layer

Implemented:

- synonym redundancy inside one sentence/list (initial governed pair:
  `visibility` / `being seen`);
- scene-noun frequency across 12-item sets for `meeting`, `message`, `decision`, `answer`,
  and `plan`;
- opening-syntax and known anchor-construction repetition, cap 3;
- register by content family and surface, including the 2026-08-12 direct-address exception
  for `sky-placement-page`;
- placeholder and protected-line integrity (blocking, existing contracts preserved);
- vocabulary outside the owner corpus (advisory forever; not a ban).

The new repetition, synonym, scene-noun, and vocabulary checks are advisory in this version.
They do not become gates from this implementation.

### Audit against existing owner-approved evidence

- Approved examples tested: **11,386**
- Owner-corpus files used for vocabulary: **48**
- Owner-corpus vocabulary tokens: **7,328**
- Register findings: **0**
- Placeholder-integrity findings: **0**
- Protected-line-integrity findings: **0**
- Synonym-redundancy findings: **6** (**0.05%** potential false-positive rate)
- Vocabulary-outside-corpus findings: **8,592** (**75.46%** potential false-positive rate)
- Twelve-entry groups tested: **966**
- Scene-noun concentration: **225 groups** (**23.29%**)
- Opening-syntax repetition: **350 groups** (**36.23%**)
- Anchor-construction repetition: **14 groups** (**1.45%**)

The high approved-corpus rates confirm why vocabulary and batch repetition must remain hints,
not automatic edit instructions. Full samples are in `deterministic-audit.json`.

## Model prose judgment

`runWritingPipeline.mjs` no longer imports or calls the semantic reviewer or automatic
reviser. A successful deterministic pass returns `OWNER_GATE_REQUIRED`; it does not produce
a prose verdict. Historical reviewer modules and calibration fixtures remain preserved for
lineage, but they have no authority in pipeline v3.

## Verification

- `npm run prepare:writing-pipeline-v3-sample`: PASS, 0 billed calls
- `npm run audit:writing-pipeline-v3`: PASS
- `npm run test:astro-writing`: PASS
- `npm run test:content`: PASS (after building the clean worktree's local
  `@tldr/astro-knowledge` workspace dependency)
- Mocked unit-test writer calls are not API calls and incurred no spend.

## Review gate

The first proof target is Venus in Libra, a fast-mover sky-placement article with approved
coverage. Only its argument outline was prepared. No prose exists. The exact review artifact
is `venus-libra-fast-mover-argument-outline-v2.md`. The earlier v1 outline remains preserved
as `superseded-unapproved` and was never approved.

## 2026-08-13 spine-slot and negation-pivot amendment

Spine fields now carry `semantic_presence_not_reader_facing_template`. The writer prompt says
that the outline and spine are internal checks and bars automatic structural announcements.
The deterministic layer reports named scaffold phrases for owner review and reports their
repetition across a set.

Negation pivots are no longer a categorical banned construction. They remain available under
the owner cap: one per page, three per twelve-item set. Page and set results include counts,
and over-cap generated copy fails deterministically. The approved-evidence audit contains
11,386 evidence records rather than a deduplicated inventory of reader pages; within that
audit it found 186 pivot occurrences in 181 records, five page records above the page cap,
and five twelve-record groups above the set cap. Those historical findings are not automatic
rewrite instructions for settled owner copy.

The earlier Venus output remains a failed diagnostic. The next request is now a partial
rewrite with three byte-protected owner anchors. The job sentence is cut without replacement;
the first protected paragraph already satisfies the spine check. The model may return only
the replacement `development` lived section. The protected tension opening reserves the
page's one pivot, leaving zero pivots for generated prose. The request has zero authorized
calls and estimates one call if the owner later authorizes it.
