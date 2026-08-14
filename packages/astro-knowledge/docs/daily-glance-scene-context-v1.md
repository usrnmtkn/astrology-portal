# Daily Glance scene-context compiler v1

Status: non-serving writer-input pilot. Four v1 licenses were approved as
revised by the owner on 2026-08-11. The Moon-conjunction-North-Node mechanism
and the revised House-4 arena were approved on 2026-08-14. All six are
`writerEligible: true` and remain `renderEligible: false`; approval authorizes
candidate construction, not serving reader copy. Approved source evidence never
automatically approves a normalization.

## Cross-surface provenance rule

The provenance architecture applies to every chart-personalized surface. A
writer receives only the factors the owning surface calculates and exposes,
then uses separately governed licenses for those exact factors. Daily Glance is
the first pilot, not a prerequisite for other surfaces.

Friends natal may proceed independently when its surface exposes enough natal
context. Its licenses must be keyed to the calculated natal planet, sign, and,
when reliable birth-time data exists, house inputs. It may not reuse Daily
Glance licenses merely because the prose describes a similar human moment.

## Boundary

Daily Glance remains a transiting-Moon surface. Calculation first selects the
Moon's tightest applying contact within five degrees at local noon. If none
qualifies, it checks for a supported contact that becomes exact inside that
local civil day. Only when neither qualifies does calculation select the Moon's
whole-sign house, and only when the house fact is reliable.

The scene compiler does not calculate placements and does not write prose. It
accepts a compact calculated context, retrieves only eligible meaning evidence,
applies separately reviewed semantic licenses, and returns a restricted packet
for an offline writer candidate. It never changes a source row or review status.

## Provenance precedence

1. Exact owner-doctrine ruling for a reviewed normalization.
2. Exact approved LL aspect or placement record.
3. Approved pair-store mechanism plus aspect-group record.
4. Approved planet-in-house or planet-in-sign LL record.
5. Approved house primitive.
6. Approved sign primitive.
7. Approved planet primitive.

The narrowest source must support the complete claim. A broader primitive may
supplement an exact source but cannot re-derive its compound behavior. An
unapproved LL row grants zero executable scene permission.

## Independent axes

- Exact aspect or pair meaning controls what happens.
- Aspect group controls relationship grammar.
- Transit house licenses the trigger arena.
- Natal house licenses the affected arena.
- Transit sign modifies today's reaction style.
- Natal sign modifies the contacted natal function's durable style.
- Houses and signs never create a new planetary function.

Conjunction permits an actor only as observable input. The combined state must
still saturate the reader. Square remains self-friction, opposition may
externalize the polarity, and soft aspects preserve availability rather than
manufacturing conflict.

## Resolution contract

When an applying aspect exists:

```text
approved two-house intersection
→ approved natal-house variant
→ approved transit-house variant
→ approved base aspect/target card
```

When no qualifying applying aspect exists:

```text
approved Moon-house card
```

A house card is never a weaker substitute after an aspect has been selected.

Contextual reader copy is represented by a sparse, reference-only override
registry. The registry stores calculated predicates and canonical content-key
references, never duplicated headline or body strings. Its deterministic
selection order is:

```text
approved two-house intersection
→ approved natal-house override
→ approved transit-house override
→ greater sign specificity inside the same house tier
→ approved base aspect/target card
```

The registry-wide serving switch is false in v1. A matching record can be
inspected in review mode, but it cannot serve until the owner approves the
exact referenced headline and body, the approval source is recorded, both
canonical rows are reader-eligible, and the serving switch is explicitly
enabled in a separately reviewed release.

When house reliability is unavailable, both house values and all house-derived
licenses are removed. An aspect resolves to its approved base card; a house-only
context fails closed.

## License governance

Every normalized license contains exact evidence, source IDs, semantic-class
permissions, value-level provenance, and its own approval object. A normalized
grant that relies on owner doctrine must cite the dedicated `owner-doctrine:`
source ID; a matrix passage cannot be cited for language or scope it did not
grant. `inheritsSourceApproval` is always false. Production compilation accepts
only licenses with explicit owner approval and `writerEligible: true`. A license
is never reader prose, so `renderEligible` remains false. Review compilation can
expose `review_needed` licenses for owner inspection but grants no executable
writer permissions; its output remains `UNAPPROVED` and cannot serve.

Scope boundaries are structural, not suggestions: an aspect license may carry
mechanism but no arena; a house license may carry arena, roles, settings, objects,
and arena activities but no behavioral mechanism; a sign license may carry manner
but no domains, roles, settings, objects, or consequences. Every value-level
provenance grant records the matching scope role (`mechanism`, `arena`, or `manner`).

A house license may be narrowed by an exact aspect `contextGuard`. Such a license
must carry its causal guard and cannot execute for a different planet, aspect,
target, or an unreliable house calculation. The compiled writer boundary carries
both the causal guard and the owner-ruled disallowed inferences.

Evidence can also be retained as a `supporting-reference`. Supporting references
are drift-checked but may not appear in value-level provenance or grant executable
meaning. The approved Moon-conjunction-North-Node license uses this distinction:
the authored transit row remains visible as context while the executable grants
come only from the dedicated 2026-08-14 owner-doctrine source.

The active Daily Glance writer lane also requires a calculation-resolved chart
context for every requested key. If either the context or explicitly approved
licenses are missing, packet compilation stops before any billed call.

The chart context uses the same civil-day Moon driver as the reader surface.
If serving has already selected a driver, callers can construct context from
that exact selection instead of recalculating it. Content IDs normalize spaces
to hyphens, so `North Node` resolves the canonical `north-node` key.

## Specificity lint

The candidate declares semantic claims and source IDs. The validator checks
those declarations and independently scans the rendered headline and body for
known domains, roles, settings, objects, activities, behaviors, and consequences. A recognized term without a
matching permission blocks. The pilot uses a deliberately closed domain
vocabulary; an unknown concrete phrase also blocks for owner review.

The declaration is diagnostic. Omitting a claim never permits a term detected
in rendered prose.

## Deterministic CLI

```bash
npm run compile:daily-glance-scene-context -w @tldr/astro-knowledge -- \
  --context /tmp/daily-glance-chart-context.json \
  --mode review \
  --candidate /tmp/daily-glance-candidate.json \
  --out /tmp/daily-glance-scene-report.json
```

The command makes no model calls. `--authorize-live` is rejected.
