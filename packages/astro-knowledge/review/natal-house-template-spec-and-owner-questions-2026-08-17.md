# Natal house mechanism wave 2: corrected template specification and owner questions

Date: 2026-08-17  
Revised: 2026-08-20  
Status: advisory owner-review record only  
Serving impact: none

## Owner ruling recorded 2026-08-20

The owner authorized the canonical `fallback-hook/house-meaning/{house}` You-surface bridge as the opening prose unit of every natal house section. The exact-key planet-specific candidate follows it in direct reader voice and may not begin with explanatory chart language such as `Mars in the 6th house is...`. Serving copy remains unchanged until the owner reviews the fully rendered samples. Friend copy remains separately authored.

Authority: `tldr-astro-phrasebank/TLDR-NATAL-HOUSE-BRIDGE-RULING-OWNER.md`.

This ruling supersedes the earlier proposed `housePlacementOpener` slot. The bridge is the opener. It also means the existing `placementHouseSentences` row is a serving baseline and comparison input, not sentence structure for the new candidate.

## Review wall

This record specifies a possible composition contract. It does not authorize reader-facing prose, template implementation, approval changes, or serving changes. All owner-decision fields remain blank.

## Reproduction record

The repository resolver and source rows were imported before revising this specification.

- The inventory is 360 sections: 192 planet-in-sign sections and 168 planet-in-house sections.
- The current resolver places generic `sign-lived` and `house-lived` rows on the same null-coalescing chain as exact placement rows. That confirms the precedence defect in executable code, not only in an audit description.
- On the audited 360-section snapshot, 130 sign sections use 11 generic bodies and 57 house sections use six generic bodies. Those 187 sections do not name the placement planet.
- Sixty-three house sections currently reach `fallback-template/natal.house-context`; their median rendered length is 76 words.
- The slot medians reproduce from the source rows after ordinary whole-word rounding: `houseMeaning` 22, `placementHouseSentences` 56, `planetIntro` 17, preferred `planet-lived` 98, `planetBest` 16, and `planetExcess` 7.
- The current `verify-fallback-architecture.mjs` baseline reproduces at 912 failures.
- The already verified precedence-fix stack, which is not present or implemented in this task, reports zero blanked sections, zero new SOURCE_GAP results, 98 of 192 sign sections on the sign template, sign sections naming their planet increasing from 60 to 168, and sections in the 120-180 band increasing from 8 to 74.

The source inventory hash remains `8e3af69a1e0acddcdd8b706eb1ff8e7fe8ea8bbe0f7a42868c99d6337d5168d8`.

## Wave-2 mechanism result

The canonical house grid contains 168 `planet|Nth house` keys. Wave 1 reviewed 48 keys with a `fallback-hook/placement-house-lived/*` row. Wave 2 covers the remaining 120 keys.

- 108 keys have page-located source support for both the house-topic mechanism and an occupation or life outcome.
- Twelve keys remain source gaps: all `lilith|Nth house` keys. The owner Lilith boundary establishes the general function but does not supply acceptable page-located evidence for each exact house and its outcomes.
- No reader-facing copy was drafted. Proposed AstrologySupport text remains internal, unsigned, and non-serving.

Correcting the template slot overlap changes **none of the 108 extracted mechanisms**. A dependency scan found zero mechanisms that begin with an antecedent such as `this`, `that`, or `it`, or otherwise depend on a preceding `planetIntro`. Each mechanism names its planet, exact house, topical domain, and supported outcome. The mechanisms can therefore feed a house-only opener/outcome/closer contract without re-scoping. This conclusion does not approve their wording.

Canonical evidence remains in `natal-house-canonical-mechanisms-review-wave-2-2026-08-17.json` and the companion workbook.

## Step 0 dependency: render precedence

The template cannot solve the house surface until exact rows, composed templates, and generic fallbacks are ordered correctly.

The current generic `fallback-hook/house-lived/{house}` path short-circuits 57 house sections before `natal.house-context` is consulted. It also drops dignity, retrograde, and sect modifiers. The equivalent sign path causes 130 generic sign renders.

The separately developed precedence fix is therefore a hard prerequisite:

1. exact placement-lived row;
2. composed exact-key template path;
3. generic sign or house copy only as the final fallback when composition genuinely cannot complete.

This task does not implement that change and does not edit `renderFallback.mjs`.

## Owner-authorized non-serving template specification

Target: `fallback-template/natal.house-context`. This specification has no prose-slot overlap with `fallback-template/natal.planet-in-sign`.

The sign template consumes `planetIntro`, `placementSentences`, `placementGerundText`, `planetExcess`, `planetBest`, and, for nodes, `nodeJourney`. It also receives `modifierSentences`. None of those slot names or content rows may be consumed by the house section on the same page.

### Corrected slot order

| Order | Proposed house-only slot | Purpose | Exists today | Authoring or implementation needed |
|---|---|---|---|---|
| 1 | `houseMeaning` | Opens part 1 with the canonical `It's in your Nth house, meaning...` bridge. | Yes, 12 owner-approved You rows; median 22 words. | Preserve the selected row exactly. The bridge is reviewed together with the following candidate for repetition and flow. |
| 2 | `housePlacementPassage` | Shows the exact planet operating in the house arena through reader action, evidence, consequence, outcome, and complication. | No approved replacement family exists. The current 168 `placementHouseSentences` rows are serving baselines, not drafting inputs. | Author fresh from the owner-reviewed mechanism and source constraints for each eligible exact key. Reject explanatory openings shaped as `Planet in the Nth house...`. Review and approve the fully composed result before serving. |
| 3 | `houseModifierSentences` | Carries dignity, retrograde, and other authorized modifiers on part 1 without sharing the sign template's `modifierSentences` slot. | Modifier templates and facts already exist. | Resolver-context alias and regression coverage are needed during later implementation; no new modifier copy is authorized here. |

The planet-specific prose is one governed exact-key review unit. Its internal beats follow the natal delineation standard, but they are not assembled from reusable prose fragments. The approved house bridge remains a separate exact row so its provenance and wording stay visible.

### Non-overlap invariant

For a rendered placement page:

`slots(part 0) intersect slots(part 1) = empty set`.

The invariant is checked on the resolved template, including planet-specific sign variants and node variants, not only the default template. Equivalent content under a renamed slot also counts as overlap and must fail.

## Costed length budget

The page contract sets a 120-to-180-word band for the complete house prose. The canonical bridge has a 22-word median. Before modifiers, the median planet-specific candidate therefore has a **98-to-158-word available band**. The exact per-key band is calculated as `120 - bridge words - modifier words` through `180 - bridge words - modifier words`; it is not enforced by padding.

Across 168 keys, the median-sized estimate is approximately **16,464 to 26,544 new reviewed words**. This is a full exact-key authoring program, not a small template-enrichment pass. The current serving passage remains comparison-only and cannot be trimmed to meet the new shape because the author-from-mechanism ruling excludes prior prose from drafting context.

### Recommendation

Use a shared bridge plus an independently authored exact-key passage:

- The bridge preserves governed shared house orientation and makes the transition into the arena consistent.
- The exact-key passage carries the lived planet-specific meaning and outcome without inheriting the old passage's sentence structure.
- If composed-output review finds repetition between bridge and candidate, revise the candidate from its mechanism. Do not edit the approved bridge or pad with generic planet material.

## Lilith house ruling required

All twelve Lilith house keys already have approved `fallback-hook/placement-house-sentence/lilith/{house}` copy. The source gap applies to the proposed expansion mechanism, not to whether approved short copy exists. Three explicit choices are available:

### Option A: keep approved copy as the rendering floor

Continue rendering the existing approved Lilith house sentence while exact-house expansion remains blocked. This avoids a reader-visible regression and preserves approved copy byte-for-byte, but the section remains below the 120-word contract and must be recorded as an explicit launch exception.

### Option B: blank the Lilith house section

Fail closed at the section level. This suppresses copy that currently serves with approval, creates a visible regression, and requires explicit owner authorization. It must not occur as an incidental consequence of a missing expansion row.

### Option C: remove Lilith houses from first-launch scope

Do not offer Lilith house detail pages until exact-house evidence and reviewed expansion copy exist. This preserves a strict no-exception page contract but reduces launch scope.

**Recommendation:** choose Option A if Lilith houses remain in first-launch scope. It preserves approved wording and records the length/evidence limitation honestly. If the owner requires every launched section to meet the full contract, choose Option C instead. Do not choose Option B by default.

Owner decision: ________________________________________________

## Owner question 1: Part of Fortune scope

Wave 1 includes 16 Part of Fortune mechanisms: nine of twelve signs and seven of twelve houses. Part of Fortune is outside the 360-key natal placement grid and its own coverage is partial.

**Ruling requested:** Does Part of Fortune belong on the natal placement surface? If yes, must the missing three sign mechanisms and five house mechanisms be completed before launch?

Owner decision: ________________________________________________

## Owner question 2: construction monotony

Wave 1 found 58 of 111 mechanisms opening with the same `Planet in Position can...` construction. Generic fallbacks currently dilute the rendered rate; the precedence fix exposes the authored distribution.

**Proposed ruling:** No normalized opening construction may exceed 15% of the final rendered set, measured separately for planet-in-sign sections, planet-in-house sections, and the combined 360-section inventory. Normalize planet, sign, and house tokens to placeholders and compare the first independent clause through its first finite verb. Report the five largest normalized opening families. This is an audit threshold, not permission to make arbitrary synonym substitutions.

**Ruling requested:** Accept the 15% cap and measurement above, or provide a different cap or measurement.

Owner decision: ________________________________________________

## Revised eight-step plan

### Step 0: land the render-precedence prerequisite

The owning session rebases and verifies the already written precedence fix. Exact copy stays first, the composed template runs before generic copy, and generic copy remains the last fallback. Reproduce zero blanking, zero new SOURCE_GAP, modifier preservation, and the recorded path counts before any house-template work merges.

### Step 1: owner reviews mechanisms

Review the 120-row wave-2 workbook as internal factual support only. Approve, edit, reject, or retain source-gap status. No mechanism verdict approves reader copy.

### Step 2: owner resolves scope and construction questions

Record the Lilith option, Part of Fortune scope, and construction-monotony cap before reader authoring begins.

### Step 3: close evidence gaps under the chosen scope

If Lilith remains in scope, preserve its approved floor or obtain acceptable exact-house evidence according to the owner ruling. Complete Part of Fortune evidence only if the owner brings it into scope.

### Step 4: import mechanism decisions atomically

Use a hash-validated importer that rejects partial workbooks, changed keys, changed evidence hashes, and ambiguous verdicts. Mechanism import remains non-serving and does not alter approved reader copy.

### Step 5: implement and author the owner-authorized house-only composition

Implement the corrected slot contract only after Steps 0-4. Compose the exact approved house bridge first, then author the exact-key direct-reader passage from the approved mechanism without exposing prior copy to the writer. Calculate each candidate's available word band after the bridge and modifiers. Keep every candidate review-gated and preserve all current serving rows byte-for-byte until the owner approves the rendered replacement.

### Step 6: owner reviews fully composed sections

Render sign and house sections together so the owner can judge repetition, page flow, meaning, occupation/outcome coverage, and the cost of modifiers. No candidate serves automatically.

### Step 7: run the widened gate and queue the scope PR

Rebase onto current main, regenerate generated artifacts from source, run the complete gate below, verify approved-row byte identity, and open the scope PR through the serving-content queue. Request an owner admin-merge only when the measured gate is green.

## Widened QA gate

The gate covers the complete 360-section inventory and the two-section page composition.

### Sign side: 192 sections

- Every eligible section renders or reaches an explicitly governed fallback.
- Every planet placement names its planet.
- Each section is between 120 and 180 words. Check both floor and ceiling.
- Record every over-ceiling section. On the verified precedence-fix snapshot, 44 sign sections exceed 180 words and the maximum is 244.
- Diagnose `planet-lived` precedence separately. Seven `planet-lived` rows have a 98-word median and currently outrank 17-word `planet-intro` rows; Neptune, Moon, and Mars are the highest-risk page-length contributors.
- Sign content remains standing natal copy, not sky or transit copy.

### House side: 168 sections

- Every eligible section renders or follows the explicit Lilith/scope ruling.
- Every section names its exact planet and house.
- Every section is between 120 and 180 words, including modifiers.
- Every section carries both reader-experienced house meaning and a named occupation or life outcome.
- Every section begins its prose with the exact canonical You-surface house bridge selected for that house.
- No new planet-specific candidate begins with an explanatory `Planet in the Nth house...` construction.
- Prior serving copy is absent from writer input and appears only in downstream comparison evidence.
- Dignity, retrograde, and sect modifiers remain attached when present.

### Two-part page checks

- No content slot or equivalent body is shared between part 0 and part 1.
- The sign section does not repeat its opener, complication, or closer in the house section.
- The house header remains engine-owned; prose does not merely repeat it.
- Combined page flow is reviewed for duplicated doctrine and unbridged transitions.
- You and Friends render with their governed person contracts and no second-person leakage into chart-subject Friend copy.

### Repository failure-count gate

Run `apps/web/src/content/fallbackArchitectureV3/tests/verify-fallback-architecture.mjs` and record the exact failure count; a generic pass/fail label is insufficient.

- Current baseline: 912 failures, reproduced in this worktree.
- Precedence fix alone: 911 recorded failures.
- Precedence fix plus the separate 16-row shared-slot wording proposal: 847 recorded failures.
- The `banned non-everyday word` category must remain at zero on the combined stack.
- Any count above the expected rebased baseline, any new category, or any approved-copy delta is a hard stop unless separately documented and owner-authorized.

## Governance checks

- Owner decision fields remain blank.
- No reader-facing prose was drafted or changed.
- No `owner-exact-wording-approval` record was created.
- No serving source, resolver, template JSON, generated artifact, or approved row was modified.
- `scripts/apply-owner-approval-records.mjs` was not run.
