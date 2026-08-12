# Friend natal voice pass 2: active implementation plan

Date: 2026-08-11  
Status: **ACTIVE, REVIEW-GATED — VERDICTS APPLIED; SERVING CHANGES NOT AUTHORIZED**

## Activation update — 2026-08-11

The repaired-main importer accepted all 43 verdicts atomically. Candidate state is now 2 owner-approved candidates (`fallback-vocab/planet-function/moon` and `fallback-vocab/planet-function/venus`) and 41 discarded candidates. All three OwnerDecisions are recorded in `friend-natal-owner-verdict-application-2026-08-11.json`. The split approach is explicitly authorized, so pass 2 has started with governed candidate files and `contracts/FRIEND-NATAL-SLOT-GRAMMAR-V2.json`.

No pass-2 wording has been promoted or made reader-eligible. Candidate rows remain review-gated; canonical serving rows, generated artifacts, self voice, `element-pattern/*`, auto-publish, and writer promotion are unchanged.

## Authority and current state

This plan is subordinate to:

- `tldr-astro-phrasebank/TLDR-FRIEND-NATAL-VOICE-RULING-OWNER.md`
- `packages/astro-knowledge/review/friend-natal-candidates-owner-review-2026-08-11.md`
- `packages/astro-knowledge/review/friend-natal-voice-audit-v1.json`

Round 1 remains candidate-only: 41 of 43 candidates were cut. The two clean rows, `fallback-vocab/planet-function/moon` and `fallback-vocab/planet-function/venus`, are `owner_approved_candidate`; the other 41 are `discarded`. All 43 retain `promotionAuthorized: false`, so no serving state changed.

Pass 2 must not start until all three gates in `friend-natal-pass-2-scaffold-v1.json` are true:

1. the populated verdict workbook has passed `scripts/import_friend_natal_owner_verdicts.py` as one atomic 43-row import;
2. all three `OwnerDecisions!D2:D4` rulings have been imported;
3. the owner has separately and explicitly authorized the split approach below. **Satisfied 2026-08-11** by the owner statement `i pass-2 authorization`, recorded against the four-part scope in the scaffold.

The importer does not infer gate 3 from a workbook ruling. All three gates are now independently satisfied. Pass 2 has started with governed, zero-row candidate sources and the slot-grammar contract; wording is added only with composed-output evidence. Auto-publish remains off, writer promotion remains unauthorized, and the eventual scope PR remains ordered by the serving-content merge queue.

## 2A. Authored placement path

Future governed source file:

`apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-authored-placement-candidates-v2.json`

Source of meaning and provenance:

`packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json`

Only its 301 `OwnerApproved=TRUE` rows may be consulted. For this pass, the applicable source keys are `planet|sign` and `planet|Nth house`; the 713 unapproved LL rows remain excluded. Candidate rows will preserve the existing target keys:

- `fallback-hook/placement-sentence/{planet}/{sign}`
- `fallback-hook/placement-house-sentence/{planet}/{house}`

Each candidate will be a complete friend-voice authored unit, not a vocabulary substitution. Required governance fields will include the LL source key, LL governance label, source-row SHA-256, unchanged target key, `review_status: needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `friend_render_mode: authored_unit`. No candidate body is present in the scaffold.

Planned resolver changes, after authorization:

- `apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs`
- `apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts`

Both implementations will add a friend-only exact authored-unit lookup before natal frame assembly. In `renderNatalPlacement`, an eligible `friend_render_mode: authored_unit` sign row becomes the complete sign paragraph, and an eligible house row becomes the complete house paragraph. The generic `natal.planet-in-sign` and `natal.house-context` frames will not wrap those authored units. The `voice: "you"` path will continue using the canonical self rows byte-for-byte. `needs_review` rows remain visible only with `allowUnreviewed`; production fails closed or uses the unchanged approved fallback according to the existing reader guard.

The runtime adapters that assemble row collections must import the future file only after approval wiring is authorized:

- `apps/web/src/content/fallbackArchitectureV3Runtime.ts`
- any package verification/materialization script that enumerates source-row files

Generated manifests, `dist/tldr-content.js`, and `content-book.html` will be regenerated after an authorized serving change; they will never be hand-edited or merged as source.

## 2B. Shared frame rewrite path

Future governed hook file:

`apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-frame-rewrite-candidates-v2.json`

Future governed template file:

`apps/web/src/content/fallbackArchitectureV3/templates/friend-natal-frame-candidates-v2.json`

In-scope hook identifiers are exactly:

- `fallback-hook/planet-intro/*`
- `fallback-hook/angle-intro/*`
- `fallback-hook/angle-sign/*`
- `fallback-hook/aspect-type/*`
- `fallback-hook/aspect-pair/*`
- `fallback-hook/house-cusp/*`
- `fallback-hook/empty-house-ruler-v3/*`
- `fallback-hook/empty-house-ruler`
- `fallback-hook/empty-house-placement`
- `fallback-hook/empty-house-bridge/*`
- `fallback-hook/empty-house-close`
- `fallback-hook/empty-house-explainer`
- `fallback-hook/house-glossary/*`

The corresponding frame candidates are:

- `fallback-template/natal.planet-in-sign`
- `fallback-template/natal.planet-in-sign/*`
- `fallback-template/natal.house-context`
- `fallback-template/natal.angle-in-sign`
- `fallback-template/natal.aspect`

The candidate files will contain `body_they` only. Existing `body`, `body_you`, keys, metadata, PageRef, and source references stay untouched. Resolver selection will be friend-only and review-gated in both Node and browser implementations.

### Slot grammar contracts

Before any prose is written, the contract layer will declare every retained slot's grammatical type. Planned contract path:

`apps/web/src/content/fallbackArchitectureV3/contracts/FRIEND-NATAL-SLOT-GRAMMAR-V2.json`

Required contracts:

- house-topic list slots declare `grammatical_number: plural`; frames may not hard-code a singular verb after them;
- verb-bearing slots declare the allowed inflection (`base`, `third_person_singular`, or a complete finite clause), and frames select the compatible form rather than repairing it at render time;
- complete-sentence and authored-unit slots may not be embedded as noun phrases;
- slot lists declare separators and final-conjunction behavior so composition cannot create duplicate conjunctions;
- optional blocks are omitted whole when absent; no punctuation or dangling connective may remain;
- rendered friend output must be free of unresolved slots, second person, reader management, disguised advice, translation-required language, and duplicate/awkward composition.

No runtime conjugation, global pronoun replacement, or copy repair will be introduced. Invalid grammar contracts fail with `SOURCE_GAP`.

## 2C. Retire `fallback-hook/ruler-method/*`

The 84 `fallback-hook/ruler-method/*` rows will not be repaired. After authorization, `renderNatalEmptyHouse` in both resolver implementations will remove this lookup:

`fallback-hook/ruler-method/{ruler}/{rulerSign}`

Its replacement candidate family is:

`fallback-hook/empty-house-ruler-placement/{ruler}/{rulerSign}`

Future governed source file:

`apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-ruler-placement-candidates-v2.json`

Each replacement will be a complete observational paragraph derived from the exact approved LL V13 `planet|sign` unit, scoped specifically to the ruler-placement movement of an empty-house reading. It will not place a house-topic list in subject position and will not inject a generic sign-manner slot. Until an approved replacement exists for the exact key, the friend empty-house preview/reader path must fail closed rather than fall back to `ruler-method`.

## 2D. Chiron observational batch

Future governed source file:

`apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-chiron-observational-candidates-v2.json`

Target family:

`fallback-vocab/placement-gerund/chiron/*`

This is a new authoring batch, not a mechanical edit of the current slots. Its register must describe recognizable conduct and consequence without coaching. The deterministic gate will reject `assignment`, `prescription`, `rep`, `experiment`, and `the move`, along with the existing second-person, advice, reader-management, and translation-required patterns. The empty scaffold contains no Chiron prose.

## 2E. Explicitly untouched

`fallback-hook/element-pattern/*` is resolved as a reader-addressed comparison surface. Its 16 canonical rows are hash-pinned in the scaffold and remain outside pass 2 under the imported OwnerDecision.

## Planned tests before any approval or serving change

The existing tests remain in force:

- `scripts/test-friend-natal-pronoun-contract.mjs`
- `scripts/test_friend_natal_owner_verdict_import.py`

After pass 2 is authorized, add or extend these exact tests:

1. `scripts/test-friend-natal-pass-2-scaffold.mjs`: remove the empty-row assertion only after recording all three gates; continue pinning excluded families and governance flags.
2. `scripts/test-friend-natal-authored-placement-resolution.mjs`: prove exact LL-key mapping, 301/713 exclusion, friend-only authored-unit precedence, `allowUnreviewed` preview, serving fail-closed behavior, and Node/browser parity.
3. `scripts/test-friend-natal-frame-grammar.mjs`: enumerate every rewritten frame against every compatible slot; assert plural house-topic agreement, declared verb selection, no unresolved slots, and no optional-block punctuation leaks.
4. `scripts/test-friend-natal-ruler-method-retirement.mjs`: prove the old 84-row family is never selected on the friend path, exact replacements are required, and missing replacements return `SOURCE_GAP`.
5. `scripts/test-friend-natal-chiron-observational-register.mjs`: enumerate all Chiron candidates and composed outputs; reject the coaching vocabulary and all ruling-level voice defects.
6. Extend `scripts/test-friend-natal-pronoun-contract.mjs` to regenerate composed samples for every new candidate and require a body or stable render key/hash for every owner-review row.
7. Add byte-drift assertions for canonical self fields, all out-of-scope approved rows, and the 16 `element-pattern/*` rows.

Before any eventual merge: run the focused tests above, `npm run test:content`, `npm run typecheck`, `npm run build:web`, generated-artifact verification, reader-guard checks, and an approved-row byte-diff. No current file in this plan changes serving behavior.
