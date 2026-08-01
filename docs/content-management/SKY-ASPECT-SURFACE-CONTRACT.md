# Sky aspect surface contract

Updated: 2026-08-01

This document protects the reader-facing contract for the aspect section on
the Sky page. Read it before changing aspect content selection, hydration,
visibility, grouping, card interaction, or fallback behavior.

## Product contract

The Sky aspect section is an editorial reading surface, not a calculation
debugger.

- Every calculated aspect that resolves approved reader copy appears in the
  normal aspect-card list.
- Every visible aspect card is clickable and opens its full write-up.
- Aspects keep the established Gifts/Lessons grouping and card treatment.
- Do not move aspects into a disclosure, accordion, collapsed folder,
  facts-only list, or alternate card class without explicit product approval.
- Do not infer permission for a UX change from a content migration, review-gate
  change, performance task, or missing exact generated row.

Editorial state answers **which prose may serve**. It does not answer **how the
aspect section should be redesigned**.

## Required content precedence

Resolve each calculated Sky aspect in this order:

```text
1. Exact approved generated write-up for the current planet/aspect/sign facts
2. Exact or pair-specific approved Sky aspect phrasebook hook
3. Approved general Sky aspect template assembled from fallback hooks/vocabulary
4. SOURCE_GAP
```

Generated content is an enhancement over the local approved content package.
It is not a prerequisite for rendering the aspect list.

The app should render approved local fallback copy immediately and replace it
with an exact approved generated unit after hydration when one exists. A
network request for generated content must not replace usable fallback cards
with a loading-only or facts-only state.

## Content-key rule

Specific phrasebook output normally identifies itself with a `contentKey`, for
example:

```text
fallback-hook/sky-aspect-pair/sun/jupiter/conjunction
```

The approved general fallback identifies itself with a `templateKey`:

```text
fallback-template/sky.aspect-card
```

Both are valid resolver results. An adapter must not require a
`fallback-hook/sky-aspect-` content-key prefix, because doing so discards the
general template fallback even when its assembled copy is complete,
reader-facing, and approved.

Validate the completed resolver result and its reader eligibility. Do not use
key shape as a substitute for that validation.

## Layer responsibilities

### Calculation layer

Supplies the planets or points, signs, aspect, orb, exact date, timing window,
and applying/separating state. These facts must come from the configured
ephemeris and canonical Sky profile.

### Content resolver

Selects the exact approved unit or assembles the approved fallback. It owns
content precedence and returns complete reader copy or `SOURCE_GAP`.

### React

Renders the established card list and opens the detail article. React must not:

- invent interpretation copy;
- reject a valid resolver result based only on its key prefix;
- turn review failures into a new information architecture;
- create a second facts-only aspect collection;
- hide approved fallback while exact content hydrates.

## Source gaps

`SOURCE_GAP` is a content-coverage failure, not an invitation to improvise a
new UX. When a genuine source gap appears:

1. record the missing facts/key combination;
2. keep unsafe or incomplete prose hidden;
3. repair the approved hook/template coverage;
4. preserve the existing aspect-section interaction unless the product owner
   explicitly requests a change.

If a proposed remedy changes visibility, grouping, interaction, or card shape,
stop and obtain product approval before implementing it.

## Required regression checks

Any Sky aspect resolver or UI change must verify all of the following:

1. The canonical current-aspect matrix resolves in both Node and browser
   implementations.
2. Exact approved generated copy wins over fallback copy.
3. Pair/sign phrasebook hooks win over the general template.
4. The general template is accepted when no specific phrasebook hook exists.
5. Lilith, Chiron, and node combinations exercise the fallback path.
6. The app contains no unapproved collapsed or facts-only aspect collection.
7. Clicking a fallback-backed aspect opens a reader-facing detail article.
8. Generated-content loading or failure leaves approved fallback cards visible.
9. Typecheck, the production web build, and the content test suite pass.

The focused regression lives in:

```text
scripts/test-reviewed-sky-aspect-phrasebook.mjs
```

Keep the canonical matrix assertion in that test. A test that covers only
specific phrasebook keys is insufficient because it can miss a broken adapter
boundary.

## Change-review checklist

Before approving a Sky aspect change, answer these questions explicitly:

- Does this alter copy eligibility only, or does it also alter the UX?
- Does the resolver still reach the approved general fallback?
- Does React accept both `contentKey` and `templateKey` results?
- What does the page show before generated-content hydration finishes?
- What does it show if hydration fails?
- Was any new disclosure, bucket, grouping, or interaction explicitly requested?
- Did the full current-aspect matrix pass through the same adapter used by the UI?

## Incident record: July 31–August 1, 2026

The canonical-profile work added a collapsed “All calculated aspects / Facts
only” collection for aspects without an exact servable generated unit. A later
adapter attempted to restore reviewed fallback copy but accepted only results
whose `contentKey` began with `fallback-hook/sky-aspect-`.

The general Sky aspect resolver was still producing valid approved template
fallbacks under `fallback-template/sky.aspect-card`. Because those results use
a `templateKey`, the adapter discarded them and the UI moved the affected
aspects into the collapsed collection.

The failure had three parts:

1. review eligibility was incorrectly allowed to change information
   architecture;
2. the adapter treated a key prefix as the fallback safety boundary;
3. tests covered the new phrasebook path but not the entire resolver-to-React
   contract.

The corrective rule is permanent: preserve the established card UX, accept
complete approved template fallback results, and test the full matrix through
the application boundary.
