# Sky Sun revision architecture audit

Date: 2026-09-05
Base: `6368877d5b9f7d425d495911c19614cec6dafde8`
Reviewed stale PR: #450 `content(sky): stage reviewed V4 Sun corpus`

## Decision

Do not rebase or merge PR #450.

PR #450 predates the current canonical Sky V4 architecture by hundreds of commits and now conflicts with the repository's active fallback and governance contracts. Preserve the current serving Sky corpus unchanged. Any future Sun copy refinement must be staged as a new non-serving revision proposal against current `main`.

## What PR #450 duplicated or bypassed

### 1. It added a second Sky V4 resolver

PR #450 introduced `resolver/skyPlacementV4Stage.mjs` with its own page, article, fallback, condition, URL, and preview logic.

Current `main` has the canonical resolver at:

- `apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs`

The canonical resolver owns package validation, Content Studio records, explicit owner-approval ledgers, serving release boundaries, contextual overlays, continuous corrections, lunations, aspects, and distribution state. A new Sun revision must not introduce a parallel resolver.

### 2. It revived the retired hook/lived/turn placement stack

PR #450 defined the fallback template as:

```text
{{placementHook}}

{{placementLived}}

{{placementTurn}}
```

and stored three bespoke fallback sentences on every Sun record.

Current `FALLBACK-ARCHITECTURE.md` and `RESOLVER-SPEC.md` explicitly prohibit this for continuous Sky Placements. The current resolution order is:

1. exact authored article
2. eligible `sky-placement-continuous-v2` unit
3. eligible complete standalone `fallback-hook/sky-placement-sign/{planet}/{sign}`
4. `SOURCE_GAP`

The standalone hook renders whole as one paragraph. It must not be combined with the retired placement hook/lived/turn/moves stack.

### 3. It created local templates instead of using the canonical template libraries

The repository already preserves `TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md` and normalized `slot-template/*` rows. Relevant Sky families include:

- `6A` — collective planet in sign: compact card
- `6B` — collective planet in sign: inner planet
- `6C` — collective planet in sign: social planet
- `6D` — collective planet in sign: outer planet
- `6M` — ingress

These are the canonical Mad-Lib reference shapes. They demonstrate the correct separation between calculated fact slots and source-backed interpretive slots. They are not permission to bypass the stricter continuous-Sky resolution order above.

### 4. It used a one-off `{{entryDate}}` token

Only the Gemini article in #450 used `{{entryDate}}`.

The repository's canonical Sky fact vocabulary already includes fields such as:

- `ingress_date_display`
- `ingress_time_display`
- `start_date_display`
- `end_date_display`
- `exit_date_display`
- `timezone_display`

Future Sun article work should use the canonical date/fact vocabulary when a rendered date belongs in the article or page. Do not introduce a Sun-only date token.

### 5. It mixed unrelated content families into one Sun review PR

PR #450 staged 37 records in one package:

- 12 Sun articles
- 12 seasonal-context records
- 4 local templates
- 9 retrograde records

Current `main` has independent canonical governance for these roles. A Sun copy revision should contain only the 12 Sun article keys plus review metadata. Seasonal context, templates, and retrograde modifiers must stay in their existing canonical families unless separately reviewed.

### 6. It materialized its own dashboard rows

PR #450 added materializer logic specifically for its stage package. Current Sky V4 Content Studio rows are produced through the canonical package adapter and `skyV4ContentStudioRecords`. A Sun revision must feed the canonical review lane rather than create a second dashboard materialization path.

## Later history that supersedes #450

The repository subsequently recorded explicit owner approval for all 120 continuous Sky placement article keys, including all 12 `sky-placement/article/sun/*` keys, while keeping them serving-disabled at that approval step.

That approval explicitly did **not** infer approval for fallback hook/lived/turn fields.

A later owner-approved serving correction package (`SKY-V4-CONTINUOUS-CORPUS-CORRECTION-OWNER-APPROVED-2026-09-01`) updates TLDR/fallback fields for all 120 continuous records and is currently serving.

Therefore this audit does not mutate or revoke the existing owner approval or serving release. It establishes the architecture for a future Sun revision requested on 2026-09-05.

## Owner authoring authority for the next Sun pass

Use:

- `apps/web/src/content/fallbackArchitectureV3/admin/OWNER-LUNATION-TEMPLATE-LIBRARY.md`
- the owner-corpus MarieSatori.com reference surfaces under `packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/reference-surfaces/`

The owner ingress guide is an **authoring guide**, not a renderer. It should shape the editorial completeness of a full Sun/season article: opening movement, mechanics/timing where relevant, sign essence, shadow/conditioning, collective/personal implications, practical work, reflection, and closing alignment. Not every optional section must be forced into every article, but the article should be authored from this source structure rather than from the stale #450 four-paragraph draft alone.

## Rebuild contract for the Sun revision proposal

The replacement proposal must:

- contain exactly the 12 `sky-placement/article/sun/{sign}` keys;
- remain `serving_enabled=false` and must not alter current serving records;
- introduce no new astrology prose during the architecture pass;
- introduce no fallback `hook`, `lived`, or `turn` fields;
- introduce no new resolver or dashboard materializer;
- use the canonical Sky V4 resolver and existing distribution gates;
- treat `TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md` as the compositional reference system;
- obey the stricter continuous-Sky fallback order from `FALLBACK-ARCHITECTURE.md` / `RESOLVER-SPEC.md`;
- use canonical calculated date slots rather than `{{entryDate}}`;
- keep current serving copy as the immutable baseline until a later exact-wording owner approval explicitly replaces it.

## Editorial review wall

This architecture audit does **not** approve, rewrite, or release any Sun wording.

Next editorial phase, after this architecture scaffold is accepted:

1. retrieve each current Sun article and the strongest relevant MarieSatori.com owner-corpus sources;
2. author/refine one sign at a time using the owner ingress guide;
3. present exact full article + TLDR fields in chat for owner review;
4. record exact-wording approval by key;
5. only after all intended revisions are approved, build a separate serving release with copy-drift checks.
