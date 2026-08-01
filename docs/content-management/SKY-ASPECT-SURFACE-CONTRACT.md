# Sky aspect surface contract

Updated: 2026-08-01

This document protects the reader-facing contract for the aspect section on
the Sky page. The product owner approved the authored-only policy and factual
disclosure on August 1, superseding the earlier fallback-card precedent.

## Product contract

The normal Gifts/Lessons aspect lists are editorial reading surfaces:

- Only an exact approved aspect card for the current planets, aspect, and signs
  may appear there.
- Every editorial card remains clickable and opens its full write-up.
- An aspect without exact approved prose appears only in the collapsed
  **All calculated aspects / Facts only** group.
- Factual rows contain calculation output only: planets, aspect, signs, orb,
  and exact date. They do not open an interpretive detail article.
- The retired “Right now…” template and pair/sign phrasebook prose never serve
  as substitutes for an authored card.

## Required content precedence

```text
1. Exact approved authored/generated write-up matching planet/aspect/sign facts
2. FACTUAL_ONLY
```

Generated and owner-authored cards use the existing hard boundary: exact facts,
lint 3/0, judge score 3 with `auto-publish`, and reader-eligible database
state. Review drafts remain hidden. The local fallback resolver may continue to
support non-reader tooling, but React must not use its prose for the Sky aspect
surface.

## Layer responsibilities

### Calculation layer

Supplies planets or points, signs, aspect, orb, exact date, timing window, and
applying/separating state from the configured ephemeris and canonical profile.

### Content resolver

Accepts only the exact approved card and returns it through
`resolveSkyAspectGeneratedContent`. A missing or ineligible row is a content
coverage gap, not permission to assemble prose.

### React

Renders approved cards in Gifts/Lessons and all other calculated aspects in the
collapsed factual group. React must not invent interpretation copy, accept a
template fallback, expose review drafts, or briefly show factual rows while
exact content is still hydrating.

## Editorial path

1. Pair sources and authored cards enter Supabase as review drafts.
2. Dashboard approval is the editorial approval source of truth.
3. Generated cards still pass the deterministic linter and LLM judge.
4. Only rows satisfying the exact reader boundary may serve.
5. New aspects without approved cards remain factual until coverage is ready.

## Required regression checks

1. Exact approved generated copy wins for the current facts.
2. Missing, draft, mismatched, lint-failing, or judge-failing copy stays factual.
3. The canonical matrix exposes all uncovered aspects in the collapsed group.
4. No reader path calls the phrasebook or generic template for Sky aspects.
5. Loading reserves the hierarchy until exact-key hydration completes.
6. Venus square Mars and Sun opposition Pluto remain unchanged.
7. Typecheck, production build, hydration contract, and content tests pass.

The focused checks live in:

```text
scripts/test-reviewed-sky-aspect-phrasebook.mjs
scripts/test-sky-aspect-hydration.mjs
```
