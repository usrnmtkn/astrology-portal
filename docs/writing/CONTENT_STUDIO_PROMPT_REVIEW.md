# Content Studio prompt review

Use this workflow when changing Studio generation prompts or writer instructions.
The project skills are authoring and evaluation references:

- [Prompt Engineer](../../.agents/skills/prompt-engineer/SKILL.md) diagnoses prompt
  defects and defines comparisons and test cases. Load only the references needed
  for the task.
- [Writing for Agents](../../.agents/skills/writing-for-agents/SKILL.md) clarifies
  workflow order, source roles, context pointers and completion criteria.
- [Advanced Evaluation](../../.agents/skills/advanced-evaluation/SKILL.md) handles
  draft comparison, judge bias and calibration against scoped owner labels.
- [TLDR Astro Skill Testing](../../.agents/skills/tldr-astro-skill-testing/SKILL.md)
  supplies baseline/candidate tests and human review. Follow
  [the evaluation workflow](SKILL_EVALUATION_WORKFLOW.md) when testing a change;
  preparation and fixture checks do not authorize paid comparisons.

The [canonical writer](../../skills/tldr-astro-writer/SKILL.md) and the target
surface's workflow govern source authority, owner voice and exact prose approval.
External skill examples, suggested model settings and generic scoring thresholds
are reference material, not changes to those contracts. Complete protected owner
passages remain intact even when a generic optimization reference suggests
shortening examples.

## Review workflow

1. Trace the owner action through its handler to the actual provider request.
   Record the surface, editable fields, source roles, variables, schema,
   validators and existing retry budget. Finish when each has a source location.
2. Capture the current request with injected calculation, storage and provider
   fixtures. Identify a concrete conflict or missing instruction from that
   assembled request. Preserve complete source units and saved profile values.
3. Make the smallest prompt change that resolves the identified problem.
   Keep calculations, evidence selection, model settings and output schemas
   unchanged unless the task explicitly includes them. Keep new process
   guidance here rather than duplicating it across every writing skill.
4. Verify the actual handler and both provider request formats where supported.
   Check valid inputs, incomplete inputs, invalid returned fields, variable
   handling and authorization. Run the existing surface regressions and the
   Content Studio API gate. A prompt assertion proves delivery; a validator
   assertion proves the checked contract. Neither proves literary improvement.
5. Deliver the changed files, before/after findings, test results and remaining
   uncertainty. Live comparison needs a separately authorized generation run and
   the owner's review of exact prose. Saving a prompt does not approve prose.

## Runtime inventory

| Owner action / surface | Prompt and instruction sources | Contract to preserve |
| --- | --- | --- |
| Rewrite/write a reusable Sky article | `api/admin/sky-article-writing.ts`; `skyArticleTemplateSlotPrompt` in `api/_lib/content-generation.ts` | Existing article context, owner direction, calculated placement validation, reusable transit/season scope; provider `slotValues.articleDraft` becomes the existing `draft` response. |
| Fill unfinished dated/template fields | `api/admin/sky-article-template-slots.ts`; the same slot prompt builder | Fixed template prose is immutable; return only requested field values, preserving only the separately licensed reader variables. |
| Horoscope writing profiles | `src/astro-writing/horoscopeWritingProfiles.mjs`; `horoscopePromptVariables.mjs`; `horoscopeDraftInput.mjs` | Exact saved profile revision, four required variables, five optional run variables, complete evidence hashes, audience convention and period-specific output schema. |
| Reusable lunar readings / dated lunar articles | `src/astro-writing/lunationWritingProfile.mjs`; `lunationDraftInput.mjs`; `lunationArticleInput.mjs` | Surface-specific lunar authority, calculated facts, exact saved guidance and the corresponding draft schema. |
| Shared generation / writer roles | `buildPrompt` in `api/_lib/content-generation.ts`; `src/astro-writing/generateDraft.mjs`; `openAIResponses.cjs` | Canonical role instructions, source boundaries, governed output schema and owner review state. |
| Approved Saturn voice-style reference | `src/astro-writing/approvedVoiceStyle.mjs` | Complete approved passage and receipt hashes, voice-only use, current owner rules and surface constraints. All existing calls and receipts are retained. |
| Personal Transit audience writing | `api/_lib/personal-transit-writer-context.ts` and the dedicated context path in `generateSkyArticleTemplateSlots` | Approved private meaning and complete voice inputs; receipt hashes; existing audience fields. The general slot prompt is bypassed. |

The table locates execution inputs. Saved private Studio profiles and feedback
remain separate from repository defaults; this review does not claim to have
inspected or updated those live records.

## October 20, 2026 review

Initial review base: `97d320767252aadfec547f50cabd8adb8982e2d4` from refreshed `origin/main`,
including the approved Saturn voice-reference update.
Branch: `codex/content-studio-prompt-review-20261020`.

### Findings and proposed patch

| Finding in the baseline request | Change in this patch | Preserved contract |
| --- | --- | --- |
| The reusable-article handler requests a complete revision, while the shared prompt declares the existing article immutable and says not to rewrite or return it. | The server marks article text as `existing-draft` context. The prompt explicitly permits the requested revision. Omitted context roles retain fixed-template behavior. | Same HTTP request and response, requested `articleDraft` key, fact boundaries, validators and retry budget. |
| The existing article appears twice: once as template context and again inside voice notes. The latter labels arbitrary caller text owner-authored. | Deliver the complete existing article once under `EXISTING ARTICLE CONTEXT`. Describe it as existing text; verified evidence remains the authority for voice and authorship. | No compression or excerpting of the article; separate eligible voice examples and private correction-memory delivery remain intact. |
| The prompt asks for reader-facing prose without explaining the enclosing object enforced by the provider schema. | Add an `OUTPUT CONTRACT`: the sole top-level field is `slotValues`, with exact requested keys and prose inside string values. | Same OpenAI JSON Schema and Claude forced-tool schema. No added metadata or prose fields. |
| Source roles and completion conditions are spread across the request. | State the distinct fact, meaning, voice and revision-context roles, then finish with a short check of requested keys, licensed variables, field-specific empty values and source coverage. | Existing authority, optional empty ingress sections and publication boundaries. |

For example, a reusable revision formerly received both “Revise one complete
evergreen … article passage” and “The template's fixed prose is immutable. Do not
rewrite it, summarize it, or return it.” The revised request labels the article
as editable revision context. A dated template still receives the original
immutable-prose rule.

The new fixture test failed against the baseline at the missing article-context
distinction and passes after the patch. The baseline handler assembled the complete article
in two places; the revised actual-request test verifies that it arrives once.
This removes duplicated input without establishing model token counts, latency
or prose quality.

### Variable and format preservation

The horoscope profile implementation is unchanged. Required variables remain
`{{period}}`, `{{voiceGuidance}}`, `{{structure}}`, `{{sourceGuidance}}`.
Optional run variables remain `{{primaryOwnerVoiceSources}}`,
`{{supportingOwnerVoiceSources}}`, `{{ownerPositiveComparisons}}`,
`{{ownerCorrections}}`, `{{governedFacts}}`. Expansion still runs once, optional
run variables can appear once, unknown variables fail, and saved source text
and exact hashes remain unchanged.

Slot generation keeps its existing separately supplied `licensedVariables`
inventory. Finished reusable-article fields retain the existing validation
that rejects unresolved placeholders. The generation-control name `articleDraft` is an output
field, never an instruction to emit `{{articleDraft}}` in prose.

### Test cases

| Case | Expected result | Evidence |
| --- | --- | --- |
| Existing reusable article, OpenAI and Claude | One request; complete source text once; editable context; unchanged output schema and draft response. | `scripts/test-studio-prompt-contract.mts` |
| Empty reusable article, both providers | New prose requested without declaring missing article text immutable. | Same actual-handler test. |
| Fixed template with a licensed `{{when}}` reader variable | Fixed text remains context; licensed variable survives inside the requested field. | Same provider-request test. |
| Unexpected returned key, missing key or unlicensed variable | Existing validators reject the response. | Same provider-response test. |
| Unauthorized article request | 401 before provider dispatch. | Same actual-handler test. |
| Private correction-memory delivery and unavailable memory | Both provider inputs receive selected corrections; memory failure precedes generation. | `scripts/test-studio-article-writer.mjs` |
| All four horoscope periods and nine supported variables | Exact saved instructions and complete evidence reach the request once; unknown/missing variables fail. | `scripts/test-horoscope-prompt-variables.mts` |
| Writer workflow, surface-specific instructions and approval state | Existing injected harness assertions pass. | `tests/astro-writing/harness.test.mjs` |
| Reusable-article editor and saved article behavior | Fresh-build desktop/mobile browser checks preserve the existing editor controls and save/reload behavior. | `sky-article-writer-label.spec.ts`, `sky-placement-article-save.spec.ts` |

Run after `npm ci` in the isolated checkout:

```sh
npm run test:content-studio-api
node tests/astro-writing/harness.test.mjs
npx playwright test -c playwright.sky-article.config.ts sky-article-writer-label.spec.ts sky-placement-article-save.spec.ts
```

The API command builds the local knowledge package before its tests. Do not run
another knowledge build concurrently. Fixtures use synthetic provider responses;
no live writing comparison, private profile migration or production release is
part of this patch. Record executed results separately from these expectations.

## Skill provenance

The original Prompt Engineer and Writing for Agents copies include `UPSTREAM.json`
with their source commit, original path and SHA-256 inventory, plus the upstream license. Keep the source files
unchanged; project-specific guidance belongs in this workflow and `AGENTS.md`.
The project-folder copies and repository copies were verified against the same
pinned sources. Upstream material is authoring guidance, not positive owner
voice evidence and not a prompt automatically appended to generation calls.

Advanced Evaluation and TLDR Astro Skill Testing are project-local adaptations.
Their `UPSTREAM.json` records pin the original source and license hashes, identify
the retained concepts and intentional changes, and inventory the adapted files.
They preserve TLDR's separate execution, prose-approval and publication decisions.

## Local verification — October 20, 2026

The runtime, test, skill and configuration source fingerprint is
`65fda12a0c73fa7f80e591478250eae769995b5041c87c4ef679ae12beee3eae`.
It hashes sorted changed/new paths outside `docs/`, each followed by a NUL,
its complete file bytes and another NUL. The base revision is recorded above;
this fingerprint identifies the tested source independently of commit and
deployment metadata. Release evidence is recorded on the release PR.

| Executed check | Result |
| --- | --- |
| New actual-handler/provider prompt contract | Passed for both providers: existing and empty article, immutable template, licensed variable, invalid output and denied access. |
| Existing article-memory/writer and horoscope-variable regressions | Passed. Required profile variables, optional run variables and complete saved evidence remain intact. |
| Approved voice-style reference | Four tests passed after integration with the updated main branch: exact complete passage, current-rule/fact/register boundaries, integrity failure and dedicated-workflow isolation. |
| Writer harness and unfinished-template regression | Passed with injected model clients; zero billed calls in the harness. |
| Fresh admin build and browser regressions | Six passed: mobile/light and desktop/dark writer controls plus archived/legacy draft save, publication and reload. Screenshots inspected. The later voice-reference update leaves these editor UI sources unchanged; its provider inputs are rechecked separately. |
| Skill provenance and project installation | All pinned upstream files and licenses match in the repository and the saved project folder. |
| Memory source/index contract | Workflow full text and hashes are searchable, covered by deployment file patterns and excluded from positive writer evidence. |
| Changed-source and built-admin privacy scans | Passed for 22 changed/new files and 100 built admin files. |
| Full Content Studio API gate | Passed on the combined patch based on `97d320767`: `npm run test:content-studio-api` exited 0 with protected fixtures and local IPC available. |
| Full repository privacy scan | Passed after the gate completed; no privacy findings. |

The full API gate also needs the existing protected report reference store.
Supply it through `PRIVATE_REPORT_DOCUMENTS` or the documented ignored local
store, following [project privacy](../security/project-privacy.md). This run
reads the existing protected store and supplies it through the process
environment; no private document is copied into Git. Local test execution must
permit the IPC pipe used by the existing `tsx` CLI test. These prerequisites do
not authorize a provider request.

## Release integration — October 21, 2026

The release patch is rebased onto `e1a80ef9a4d566df7b0be1d26a96785f255316c1`,
which includes the Content Studio Ghostwriter integration from PR #1301.
Its runtime craft guidance, source precedence and regression checks are retained.
The API gate includes both the upstream Ghostwriter test and the new prompt-contract
test. Required reader variables, output schemas and owner approval boundaries
remain unchanged.

The integrated runtime/test/configuration source fingerprint, using the same
changed-path algorithm as above, is
`e2d51c866548a422409767e17308b3afe156038292bd95694dcc81d398ba109b`. The earlier verification table records the initial reviewed
source; exact-head rerun and production verification evidence belongs to
[release PR #1302](https://github.com/usrnmtkn/astrology-portal/pull/1302).
