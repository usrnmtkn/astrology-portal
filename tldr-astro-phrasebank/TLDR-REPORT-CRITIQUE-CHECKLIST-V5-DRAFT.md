# Report critique checklist v5 draft

**Status:** `needs_review`
**Version:** `report-critique-checklist-v5-draft`
**Owner approved:** `false`
**Active in production:** `false`
**Promotion authorized:** `false`
**Baseline:** `report-critique-checklist-v4-draft`
**Amendment source:** Cold Rendered Prose Rule, owner ruling 2026-08-11.
**Governance:** Proposed replacement. V3 remains active. This draft requires explicit SHA-pinned owner approval before activation.

The critique returns findings only. Each finding uses an existing governed defect category, the smallest exact location and sentence scope, a quote, evidence, and a bounded correction instruction. It never writes replacement prose.

## Required reading order

### 1. Cold read first

Read only `RENDERED_UNIT` exactly as a reader encounters it. Do not consult facts, prompts, source notes, astrology logic, owner comparison passages, intended meaning, drafting context, or validator results to make the prose understandable.

Ask, line by line:

- Does it make sense on the first read?
- Does it flow naturally from the sentence before it and into the sentence after it?
- Is the wording normal and everyday?
- Does it sound written rather than assembled?
- Does it name the intended behavior, circumstance, decision, or consequence directly?
- Does a pronoun or phrase such as `it`, `this`, `that`, or `the change` have one unmistakable referent?
- Does the paragraph stop after the point lands?

Flag:

- abrupt jumps between ideas
- individually grammatical sentences that do not connect
- vague referents
- report-heavy transitions
- clever compression
- abstract summaries replacing observable life
- repeated setup or explanation
- sentences that sound assembled
- unnecessarily formal vocabulary
- a strong sentence followed by another sentence explaining the same point

Route vague referents, assembled sentences, and formal vocabulary to `unnatural_phrasing` or `owner_voice_drift`; repetition and explain-after-landing to `density_violation`; abrupt or disconnected multi-paragraph movement to `interpretive_gap`; clever compression and substituted abstraction to `unlived_abstraction` or `owner_voice_drift`. Do not invent a cold-prose category.

Run the no-cleverness-tax four questions during this same cold read. Second person remains the report register; distinguish abstract second person from recognizable second person.

### 2. Accuracy read second

Only after recording cold-prose findings, consult `UNIT_FACTS`, the attribution line, governed interpretations, manifestation records, owner comparison passages, and deterministic validator results. Use them to verify astrology, dates, factual traceability, specificity, and owner-voice comparison. Do not delete or soften a cold-prose finding because the facts reveal what the writer meant.

The attribution remains part of the unit and may carry technical astrology. Do not require prose to repeat astrology the attribution already carries accurately.

## Finding discipline

- A critique may use only governed categories.
- `owner_voice_drift` must cite eligible same-function comparison evidence.
- `interpretive_gap` applies only when the unit contains at least two substantive prose paragraphs.
- Multiple categories describing one underlying defect collapse to the narrowest causal finding unless they require materially different corrections.
- A correction instruction names the defect and permitted scope; it does not supply replacement prose.

## Cold-read stop test

Before returning `no_defects`, ignore what the writer intended and read only the rendered copy. If any line produces "Wait, what does that mean?", "Why are we suddenly talking about this?", or "A normal person would say this more simply," return a bounded governed finding.

## Output contract

The v4 structured-output contract remains unchanged: `result`, movement `applicability`, and `defects`, with each defect carrying `id`, `category`, `location`, `sentence_index`, inclusive `scope_start` and `scope_end`, `quote`, `evidence`, `evidence_ids`, and `instruction`. The revise call may change only named scopes.

## Activation wall

This draft is inactive. The production critique remains `TLDR-REPORT-CRITIQUE-CHECKLIST-V3-OWNER.md` until the owner approves the exact replacement SHA and separately authorizes activation.
