# Sky Calendar collective rewrite, 2026-09-07

This review packet contains a full collective-register rewrite of the **379 exact aspects currently present in the owner-approved Sky / Calendar projection**.

The problem being corrected is register, not aspect identity. Calendar is a `current_sky` collective surface, but much of the current exact corpus speaks as though a transit-to-transit aspect knows the reader's specific argument, decision, history, insecurity, relationship, or next action. The candidate passages keep the writing direct and human while moving the astrology back to its correct scope: the collective condition first, with chart-specific meaning reserved for personal transit surfaces.

## What is included

Eight candidate payload files cover all 379 current exact keys:

| File | Rows |
| --- | ---: |
| `candidate-payloads-01.json` | 45 |
| `candidate-payloads-02.json` | 42 |
| `candidate-payloads-03.json` | 50 |
| `candidate-payloads-04.json` | 37 |
| `candidate-payloads-05.json` | 40 |
| `candidate-payloads-06.json` | 60 |
| `candidate-payloads-07.json` | 55 |
| `candidate-payloads-08.json` | 50 |
| **Total** | **379** |

The uneven classic-body counts are intentional. The source projection does not contain 11 otherwise possible exact keys: Mercury opposition / square / trine Venus, Sun opposition / sextile / square / trine Mercury, and Sun opposition / sextile / square / trine Venus. This packet matches the current source projection exactly instead of inventing those gaps.

A selective reader-address pass is stored in `reader-address-overlay.json`. It replaces the body for **40 of the 379 keys** while preserving their collective summaries. The overlay is editorial, not quota-driven: it uses `you` only where a direct turn toward the reader makes the passage warmer or easier to recognize. The remaining 339 candidate bodies stay fully collective.

The effective review candidate is therefore:

1. load the 379 base entries from the eight candidate payloads;
2. apply `reader-address-overlay.json` by exact key;
3. review that merged 379-key projection as the proposed Calendar copy.

## What changed editorially

The candidate contract is documented in `collective-register-contract.md`. In practical terms:

- collective condition first;
- aspect mechanism second;
- recognizable complication or consequence;
- useful distinction or perspective at the end;
- summaries stay collective by default;
- second person is optional in the body for possibility, observation, or reflection;
- no invented personal circumstances, history, motives, relationships, or events;
- no mechanical `you` quota;
- no generic flattening into detached textbook language.

Representative collective direction:

**Sun sextile Mars**

> Momentum is easier to find when intention and action point in the same direction. When the Sun sextiles Mars, initiative gets more support, making decisions, conversations, and plans easier to move from consideration into action. The ease is useful, but speed can start looking more convincing than the purpose behind it. Momentum is strongest when the reason is already clear and the remaining problem is execution rather than another round of planning.

**Mars opposition Lilith**

> Questions of authority become harder to ignore when pressure to act meets a refusal to be managed. When Mars opposes Lilith, a disagreement can keep circling the details while the deeper issue is who gets to decide and whose refusal is being treated as negotiable. Compromise works only when everyone involved still has agency. Exhausting one side until it gives in may end the argument without creating agreement.

**Mars square Saturn**

> Momentum meets resistance when action runs into rules, deadlines, delays, or limits that will not move on demand. When Mars squares Saturn, the push to act can make every constraint feel like a personal obstruction even when the restriction is simply part of the structure. More force is unlikely to make a fixed limit disappear. The useful question is which constraint is fixed, which one can change, and where effort can still produce movement.

Representative reader-address direction:

**Mercury square Neptune**

> Mixed messages, missing context, or a story that keeps changing can make certainty feel harder to reach than usual. When Mercury squares Neptune, thought and imagination blur together, making assumptions and emotionally satisfying explanations easier to mistake for facts. If you catch yourself filling in the missing pieces, notice how much of the conclusion is actually confirmed. One missing fact can matter more than ten theories about what it might mean.

The distinction is intentional: the word `you` is allowed when the sentence remains conditional or observational. Unsupported personalization is not.

## Governance state

This packet is deliberately **non-serving**:

- base candidate `reviewStatus`: `needs_review`
- reader-address overlay `reviewStatus`: `needs_review`
- overlay `directionApproved`: `true`
- `ownerApproved`: `false`
- `promotionAuthorized`: `false`
- canonical `packages/astro-knowledge/data/transits/*.json` files are unchanged
- Content Studio serving rows are unchanged

The owner approved the collective direction, the original sample corrections, a random ten-row review sample, and the selective reader-address direction. Unseen exact wording still requires exact-text review before promotion under the repository's author-final governance rules.

## Validation

Run the base validator:

```bash
node scripts/test-sky-calendar-collective-rewrite-20260907.mjs
```

It requires:

- exactly 8 payload files;
- exactly 379 unique candidate keys;
- exact key-set parity with the current 379-row owner projection;
- no candidate keys for intentional source gaps;
- every body begins with its exact summary;
- every body names the aspect mechanism;
- the base payload layer remains fully collective;
- no em dashes;
- no `whether` construction;
- candidate governance remains `needs_review` and non-promotable.

Run the reader-address overlay validator:

```bash
node scripts/test-sky-calendar-reader-address-overlay-20260907.mjs
```

It requires:

- exactly 40 overlay keys;
- every overlay key already exists in the 379-row base projection;
- overlay summaries remain identical to the collective base summaries;
- every overlay body begins with its summary;
- direct reader address appears only in the body;
- each reader turn uses conditional or possibility-based language;
- no sentence-start hard personal assertions such as `You are`, `You have been`, or `Your X is`;
- reader address is normally limited to one sentence per passage;
- no em dashes or `whether` construction;
- overlay governance remains `needs_review` and non-promotable.

After editorial review, promotion should merge the reader-address overlay over the base candidate projection, update the canonical exact `readerCopy` source, and then re-run the existing Calendar / Sky exact routing, integrity, Content Studio, typecheck, and build gates.
