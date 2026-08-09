# TLDR Astro writing harness v1: implementation report

Date: 2026-08-09

Status: implemented and verified; generated copy remains `needs_review` until the owner explicitly approves its exact wording.

## 1. Files created or modified

Routing and commands:

- `AGENTS.md`
- `skills/tldr-astro-writer/SKILL.md`
- `package.json`

Canonical owner sources:

- `docs/writing/ASTROLOGY_CONTRACT.md`
- `docs/writing/VOICE_CONTRACT.md`
- `docs/writing/LITERAL_LANGUAGE_RULES.md`
- `docs/writing/BANNED_PATTERNS.md`
- `docs/writing/REVIEW_RUBRIC.md`
- `docs/writing/OWNER_CORRECTIONS.md`
- `data/writing/OWNER_CORRECTIONS.jsonl`
- `data/writing/OWNER_APPROVED_EXAMPLES.jsonl`

Pipeline:

- `src/astro-writing/buildMeaningPlan.mjs`
- `src/astro-writing/retrieveOwnerContext.mjs`
- `src/astro-writing/generateDraft.mjs`
- `src/astro-writing/reviewDraft.mjs`
- `src/astro-writing/reviseDraft.mjs`
- `src/astro-writing/validateCopy.mjs`
- `src/astro-writing/runWritingPipeline.mjs`
- `src/astro-writing/canonicalInstructions.mjs`
- `src/astro-writing/canonicalInstructions.cjs`
- `src/astro-writing/canonicalInstructions.d.ts`
- `src/astro-writing/reviewDraft.d.ts`
- `src/astro-writing/policyData.generated.mjs`
- `src/astro-writing/index.mjs`

Build, run, and evaluation:

- `scripts/build-writing-harness-data.mjs`
- `scripts/build-writing-harness-instructions.mjs`
- `scripts/run-astro-writing-harness.mjs`
- `scripts/run-astro-writing-evals.mjs`
- `tests/astro-writing/harness.test.mjs`

Existing OpenAI call sites bound to the canonical instructions:

- `api/_lib/content-generation.ts`
- `packages/astro-knowledge/scripts/generate-sky-aspect-cards.js`
- `packages/astro-knowledge/scripts/judge-daily-glance.js`
- `packages/astro-knowledge/scripts/run-daily-glance-judged.js`
- `packages/astro-knowledge/scripts/run-daily-glance-writer-pilots.js`
- `packages/astro-knowledge/scripts/run-sky-placement-judge-ab-evaluation.js`
- `packages/astro-knowledge/scripts/run-sky-placement-writer-sample.js`

Review provenance:

- `packages/astro-knowledge/review/writing-harness-v1/TLDR-Writing-Harness-Owner-Spec.md`
- `packages/astro-knowledge/review/writing-harness-v1/TLDR-Owner-Writing-Doctrine.md`
- `packages/astro-knowledge/review/writing-harness-v1/TLDR-Horoscope-Template-Canonical.md`
- `packages/astro-knowledge/review/writing-harness-v1/TLDR-Owner-Corrections-Seed.jsonl`
- `packages/astro-knowledge/review/writing-harness-v1/implementation-report.md`

## 2. API generation path

The application OpenAI path now:

1. builds the existing governed fact prompt;
2. retrieves at most four examples from `data/writing/OWNER_APPROVED_EXAMPLES.jsonl`, filtered by content family and register;
3. sends the canonical writing instructions on the request itself;
4. parses and validates the structured draft;
5. sends the draft and governed facts to a separate reviewer request with the canonical review instructions;
6. if the reviewer returns `REVISE`, sends only the named field instructions into one surgical retry;
7. reviews the retry again and fails closed if it still needs revision;
8. stores generated copy as `DRAFT`, never owner-approved.

The standalone harness follows the same six stages through `src/astro-writing/runWritingPipeline.mjs`. It has no implicit network call. `scripts/run-astro-writing-harness.mjs` requires `--authorize-live` and an API key before any billed request.

## 3. Reviewer path

`src/astro-writing/reviewDraft.mjs` runs deterministic checks, then a separate model review against the required machine-readable rubric. Every rubric field is `PASS` or `REVISE`; any field marked `REVISE` blocks the overall pass. Hard failures named by the owner are always revision failures. After a surgical revision, the reviewer runs again. Deterministic validation is the final gate.

The application reviewer uses `gpt-5.6-terra` at low reasoning by default and can be overridden only through the existing review-model environment configuration.

## 4. Exact instructions loaded into API calls

Every writing request receives this exact `instructions` value:

```text
CODEX INSTRUCTION (owner-designated canonical form): Translate every astrological idea into lived cause and consequence. Begin with the specific human experience, behavior, conflict, decision, or consequence the astrology describes. Use concrete stakes such as work, money, home, body, time, access, recognition, and relationships. For aspects, show one force acting on another. For synastry, show one person doing something and the other reacting. For placements, describe the recurring behavior and need rather than predicting an event. Add perspective, warmth, or advice only after the truth has been clearly named. Never make the reader decode astrology language to understand what is happening.

Concrete does not mean adding a random object or domestic scene. Concrete means naming the observable behavior, circumstance, decision, or consequence produced by the astrology. Paraphrase test: could a reader paraphrase the sentence literally after one read? If not, rewrite it.

Do not confuse a sign with its traditionally associated house. A sign-only placement can use concrete examples from many life domains, but one life domain must not become the definition of the sign. Capricorn is not automatically career. Scorpio is not automatically debt/shared finances. Cancer is not automatically home. Virgo is not automatically work and health. Aquarius is not automatically friendship. Pisces is not automatically relationships or retreat.

Do not invent the character's motive when the observable behavior is enough. Prefer "Someone kept the work private because being openly proud of it felt risky" over a more specific psychological claim that has not been earned.

Maintain register consistently. These sign cores are collective third person. Do not introduce isolated second person such as "the person in front of you."

Do not compress natural prose for cleverness. If a sentence becomes strange in order to be shorter, restore the normal sentence. "The conversation finally happens, angry" is not stronger than "The conversation finally happens, and the frustration has years behind it."

Before accepting a line, run three tests:

1. Can a reader understand literally what happened on the first read?
2. Does the behavior prove this sign's Lilith mechanism rather than merely decorate it?
3. Would the interpretation still make sense if the traditional house association were removed?

If any answer is no, revise the line.

House bleed can survive even when the prose is good. Do not judge sign-house separation by how natural the paragraph sounds. Inspect the nouns. Apply the same noun-level test to every sign before PASS.

Governance: Never label generated or refined wording as owner-authored, owner-approved, exact, settled, or locked until the owner explicitly approves that exact wording.
```

Every review request receives the same text above plus this exact review suffix:

```text
Act as an editorial reasoner for TLDR Astro. Do not rewrite by instinct. Reason from the astrology first, preserve the interpretation, then refine surgically at the sentence level.

Use Marie Satori's owner-authored corpus and explicit owner edits as the voice authority. Do not treat assistant-generated copy as a voice benchmark unless that exact wording has been explicitly approved.

A failure on astrology_integrity, sign_house_separation, literal_first_read_clarity, example_proves_astrology, invented_motive, stock_trope, or metaphor_requires_translation must produce REVISE.

Decision may only be PASS or REVISE. Return machine-readable results. Do not grant owner approval.
```

No call uses `previous_response_id`; instructions are supplied independently on every Responses API request.

## 5. Evaluation results

- 13/13 owner-correction regressions recognized their known failure category.
- 13/13 owner corrections cleared their original failure category.
- 6,425 serving owner-approved examples indexed.
- 481 owner-approved v8 locked examples indexed.
- 6,906 total governed positive examples.
- All 12 signs covered by the noun-level house-bleed regression.
- Mocked six-stage pipeline: first review `REVISE`, one surgical field revision, second review `PASS`, deterministic lint `PASS`.
- Inconsistent reviewer regression: a `REVISE` field with a mistaken overall `PASS` is blocked.
- Seven pre-existing direct Responses API files verified to attach canonical instructions; the new standalone harness does the same.
- `npm run test:astro-writing`: PASS.
- `npm run eval:astro-writing`: PASS.
- `npm test`: PASS.
- `npm run qa:bundle`: PASS.

## 6. Remaining known gaps

- Subjective live-model grading is implemented behind the harness's explicit live authorization gate but was not billed or run in this change. Deterministic, mocked-review, and repository-wide evaluations passed.
- The canonical example index is a generated repository artifact. It must be rebuilt when a new exact owner approval becomes eligible for serving or when the locked v8 tier changes.
- This harness governs OpenAI-generated astrology prose. The existing Anthropic generation path retains its existing provider-specific behavior and is outside this owner request's OpenAI integration requirement.
- No generated passage was promoted, served, or marked owner-approved by this implementation.
