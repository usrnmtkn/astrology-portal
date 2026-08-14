# Sky aspect surface contract

Updated: 2026-08-12

This document protects the reader-facing contract for the aspect section on
the Sky page. Read it before changing aspect content selection, hydration,
visibility, grouping, card interaction, or fallback behavior.

## Product contract

The Sky aspect section is an editorial reading surface, not a calculation
debugger.

- Every calculated aspect appears in the normal aspect-card list with its
  engine facts.
- Every visible aspect card is clickable and opens its detail page. An
  interpretation appears only when approved reader copy exists.
- Aspects keep the established Gifts/Lessons grouping and card treatment.
- Do not move aspects into a disclosure, accordion, collapsed folder, or
  alternate card class without explicit product approval. The established
  aspect row may retain engine facts when interpretation copy is unavailable.
- Do not infer permission for a UX change from a content migration, review-gate
  change, performance task, or missing exact generated row.

Editorial state answers **which prose may serve**. It does not answer **how the
aspect section should be redesigned**.

## Required content precedence

Resolve each calculated Sky aspect in this order:

```text
1. Owner-approved sign-specific Sky aspect copy for the current signs
2. Owner-approved exact-aspect reader copy from the canonical transit corpus
3. Approved exact or pair-specific Sky aspect phrasebook hook
4. Explicitly approved generated write-up for the current planet/aspect/sign facts
5. SOURCE_GAP
```

Owner-approved sign-specific and exact-aspect copy is author-final and immutable. A generated
row must never replace it, even when the generated row is more sign-specific,
newer, or judge-scored. Generated content is an enhancement only when no
approved exact or phrasebook unit exists, and it must be labeled as generated
in application provenance rather than `authored`.

The app should render approved local copy immediately. It may never replace
owner-approved exact or phrasebook copy with generated prose. A network
request for generated content must not replace usable specific copy with a
loading-only state. When no approved specific or generated unit exists, the
interpretation fails closed. The calculated aspect remains visible through its
existing factual detail row: bodies, aspect, timing, and orb, with no prose
body.

## Content-key rule

Specific phrasebook output identifies itself with a `contentKey`, for
example:

```text
fallback-hook/sky-aspect-pair/sun/jupiter/conjunction
```

The retired general compositor used the template key
`fallback-template/sky.aspect-card`. That key is not reader-eligible on the
collective Sky or Calendar aspect surfaces after the owner ruling of
2026-08-12. Adapters accept approved specific content keys, approved exact
registry content, and explicitly approved generated units. They never treat a
generic template key as sufficient authority to serve prose.

## Layer responsibilities

### Calculation layer

Supplies the planets or points, signs, aspect, orb, exact date, timing window,
and applying/separating state. These facts must come from the configured
ephemeris and canonical Sky profile.

### Content resolver

Selects an exact approved unit. It owns content precedence and returns complete
reader copy or `SOURCE_GAP`; it does not assemble generic aspect prose.

### React

Renders the established card list and opens the detail article. React must not:

- invent interpretation copy;
- reject a valid resolver result based only on its key prefix;
- turn review failures into a new information architecture;
- create a second facts-only aspect collection outside the established aspect rows;
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
2. Owner-approved sign-specific copy wins over generic exact corpus copy for the matching signs.
3. Owner-approved exact corpus copy wins over generic phrasebook, generated, and general fallback copy.
4. Pair/exact phrasebook hooks win over approved generated copy and the general template.
5. A combination with no approved specific, exact, phrasebook, or generated unit returns `SOURCE_GAP`; its established factual detail remains visible without an interpretation body.
6. The retired `fallback-template/sky.aspect-card` path cannot reach reader output.
7. Generated sections are never labeled `authored` in application provenance.
8. Lilith, Chiron, and node combinations exercise approved specific copy or fail closed.
9. The app contains no unapproved collapsed or substitute aspect collection; source-gap rows contain only engine facts.
10. Clicking any calculated aspect opens its detail page; approved copy appears when available and is otherwise absent.
11. Generated-content loading or failure leaves approved specific cards visible and does not reveal generic substitute prose.
12. Typecheck, the production web build, and the content test suite pass.

The focused regression lives in:

```text
scripts/test-reviewed-sky-aspect-phrasebook.mjs
scripts/test-calendar-exact-sky-aspect-routing.mjs
```

Keep the canonical matrix assertion in that test. A test that covers only
specific phrasebook keys is insufficient because it can miss a broken adapter
boundary.

### Calendar exact-copy parity and intentional gaps

Current Sky and Calendar must use the same precedence selector and the same
approved exact-aspect lookup. The Calendar parity gate runs all 215
reader-eligible exact records in both planet orders. It fails if any of those
430 routes reaches the general compositor instead of approved specific copy.

The separate exact-copy gap list remains intentionally unfilled except for
the owner-approved Saturn square Lilith record shipped on 2026-08-11: 66 Chiron
targets, 71 remaining Lilith targets, 60 node-axis targets, and 42
classical-planet quincunxes (239 combinations total). For these combinations, the
exact lookup fails closed: it must not invent, import, or relabel generic copy
as an approved exact record. The resolver may continue only to approved
phrasebook or explicitly approved generated tiers. Otherwise it returns
`SOURCE_GAP`. Adding exact prose for any gap is a separate governed editorial
change.

## Change-review checklist

Before approving a Sky aspect change, answer these questions explicitly:

- Does this alter copy eligibility only, or does it also alter the UX?
- Does every visible card resolve approved specific, exact, phrasebook, or generated copy?
- Can the retired `fallback-template/sky.aspect-card` key reach React or Calendar output?
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

At the time, the corrective rule restored the general template. The owner
superseded that copy-eligibility decision on 2026-08-12 after the template was
shown to use direct second person on a collective surface. The UX rule remains:
preserve the established card interaction for every calculated aspect. The new
copy rule is fail closed when no approved specific unit exists; retain the
existing factual detail and do not replace the missing prose with another
information architecture.

## Owner ruling: generic compositor retirement, 2026-08-12

The owner authorized the recommended next sequence beginning with failing the
generic Sky-aspect compositor closed. The owner then clarified the visible
detail contract: if an aspect exists, show the aspect in the details; if no
write-up exists, do not restore generic prose or weaken the test.

- The collective Sky surface never receives direct-address prose from the
  retired generic compositor.
- Calendar follows the same aspect-copy eligibility boundary.
- Approved sign-specific, exact, phrasebook, and generated units retain their
  precedence and behavior.
- Missing approved copy produces `SOURCE_GAP` for interpretation only. The
  calculated aspect remains visible with its factual title, timing, and orb,
  and no interpretation paragraph.
