# Between You Two V2

Status: **DARK DESIGN / OWNER REVIEW REQUIRED**  
Date: 2026-09-05  
Serving effect: **none**

## Why V2 exists

The current Pair Daily surface is technically sound but editorially inverted. It starts with the reader's personal daily driver, then the friend's personal daily driver, then introduces the first genuinely shared condition. This can produce grammatical prose without answering the reader's actual question: **what is happening between us today?**

The controlled V1 render audit in `v1-render-audit.json` confirms five recurring problems:

1. **Relationship evidence arrives too late.** In bond-transit cases, the strongest relationship-specific evidence appears only after two independent personal clauses.
2. **Independent daily clauses can create accidental narratives.** A spending example for one person can sit beside a workload or home example for the other even when those facts do not describe the relationship.
3. **The shared bridge can dilute stronger copy.** The 139 directional bond-effect rows already contain concrete, owner-authored relationship scenes. Generic bridge language can make those scenes less precise rather than more useful.
4. **The paragraph can become too long.** The audit produced bond examples at 79 and 92 words before any expanded detail is opened.
5. **V1 can imply a relationship reading with no shared relationship condition.** If both individual daily clauses exist and `shared.kind` is null, V1 still renders a two-person sentence. That is grammatically valid but evidentially misleading.

## What V1 got right and V2 must preserve

- deterministic daily selection and refresh stability;
- the same reader/friend identity and handle rules;
- source-key provenance;
- fail-closed behavior for missing governed copy;
- no invented astrology;
- exact owner-approved directional bond effects remain immutable;
- the existing ranked bond-transit selection remains the factual authority for which relationship transit leads;
- shared-Moon fallback is allowed only when the Moon genuinely supplies a shared condition for both charts.

## V2 governing rule

**Shared relationship evidence leads. Individual daily weather is supporting context only.**

The lead reading must never be constructed by pretending that two unrelated personal transits automatically describe the relationship.

## Evidence tiers

### Tier 1: direct active bond transit

When `selectedBondTransitCards[0]` exists:

1. The top-ranked bond transit is the lead relationship condition.
2. Its exact owner-approved directional `effectBody` is the core body and must remain verbatim.
3. A short V2 headline may be authored for the transiting-planet + effect-family mechanism.
4. One optional practical move may be authored from that same relationship mechanism.
5. Reader and friend daily drivers may appear only as clearly labeled supporting context. They may not be spliced into the lead paragraph.
6. Remaining bond transits stay available as the deeper `What's driving this` / active relationship-transits list.

### Tier 2: shared Moon condition, no bond transit

When there is no active bond transit but the current Moon is a qualifying shared condition for both charts:

1. Serve a short explicitly daily relationship note.
2. The sentence must identify the Moon as the temporary shared condition rather than implying a durable relationship pattern.
3. The note may include one bounded consequence or useful response.
4. It must not import unrelated reader/friend daily scenes into the shared claim.

### Tier 3: no shared condition

When there is no direct bond transit and no qualifying shared Moon condition:

**Do not render a Between You Two daily synthesis.**

The reader's and friend's separate daily forecasts can continue to exist on their own surfaces. Two individual forecasts are not evidence of a relationship condition.

## Proposed reader hierarchy

### Compatibility tab

`Between you two · Today`

**Headline**  
Plain relationship thesis keyed to the shared mechanism.

**Body**  
Tier 1: exact owner-approved bond effect body.  
Tier 2: approved shared-Moon V2 paragraph.

**What each of you is carrying today** (optional, subordinate UI)  
- You: existing approved reader daily clause
- Friend: existing approved friend daily clause

This context must be visually and semantically separate from the relationship body. It is explanatory weather, not evidence for the lead claim.

**One useful move** (optional)  
A single approved response tied to the shared mechanism. No generic Do/Don't pair.

### Transits tab

Keep the existing bond-transit cards and exact detail pages. The first/top-ranked active bond transit can be visually designated as the lead condition; additional cards explain `What's driving this` rather than competing as unrelated summaries.

V2 must not duplicate or rewrite the 139 canonical bond-effect bodies.

## Proposed data contract

```ts
type BetweenYouTwoDailyV2 = {
  dateLabel: string;
  evidenceTier: "bond" | "shared-moon";
  headline: string;
  body: string;
  move?: string | null;
  readerContext?: string | null;
  friendContext?: string | null;
  primaryBondTransitId?: string | null;
  sourceKeys: string[];
};
```

### Provenance requirements

For Tier 1, `sourceKeys` must include:
- the exact directional bond-effect content key used by the top-ranked bond card;
- any V2 headline key;
- any V2 move key;
- reader/friend daily clause keys only when those subordinate contexts are actually displayed.

For Tier 2, `sourceKeys` must include the approved shared-Moon V2 key and the factual Moon condition used to select it.

## Candidate key families

New V2 copy is small and mechanism-specific:

- `fallback-hook/between-you-two-v2/headline/{hard|soft}/{transiting}`
- `fallback-hook/between-you-two-v2/move/{hard|soft}/{transiting}`
- `fallback-hook/between-you-two-v2/shared-moon/{fire|earth|air|water}`

Do **not** create new body rows for Tier 1. The existing exact owner-approved bond-effect body is the body authority.

## Editorial contract

A V2 headline or move must:

- state the relationship problem/support plainly;
- be understandable without astrology jargon;
- remain true for the complete directional bond-effect family it represents;
- avoid predicting an outcome;
- avoid generic therapy language;
- prefer concrete stakes: time, plans, money, messages, affection, effort, responsibility, access, recognition;
- avoid implying romance when the relationship context is not explicitly romantic;
- avoid repeating the first sentence of the bond effect in weaker words;
- use at most one practical move, not a list of advice;
- never treat two personal daily drivers as proof of a shared relationship condition.

## Pilot review wall

The pilot in `pilot-review.json` contains five direct-bond examples and one shared-Moon example. All new headline/move/Moon wording is `proposed`, not approved, and has no serving authority.

No renderer or production row should change until the owner approves the V2 structure and exact pilot wording (or supplies replacements).
