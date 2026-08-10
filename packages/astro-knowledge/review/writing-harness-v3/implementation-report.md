# Writing harness v3 implementation report

Date: 2026-08-09

Governed documents: `owner_approved`. Active in harness: `true`. Active in production: `false`. Candidate writer active: `false`. Writer promotion authorized: `false`.

## Architecture

The v2 live baseline's seven gold false positives and four negative verdict mismatches are treated as architecture failures. The v3 harness uses complete-card packets, two or three same-surface owner comparison cards, labeled negative evidence, supplied location tokens, findings-only model output, and runtime-computed verdicts. It does not tune a threshold and does not activate the writer.

The card generation boundary now loads `TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md` byte-for-byte. Its section 23 instruction is the top-level writer direction. Its section 22 workflow is represented as an ordered seven-pass chain in both draft and surgical-revision packets: astrology integrity, doctrine removal, voice, lived consequence, cut, full-family comparison, and full-file consistency. Missing family context is named in the packet, so a single-card call cannot claim family-level completion.

`TLDR-CARD-CRITIQUE-CHECKLIST-V3-DRAFT.md` implements the owner's fifteen-question section 21 editorial test, finding routing, direct correction notes, and paired before/after controls. It is owner-approved and supplied to the card judge and writer chain as a CARD-scoped governed document. Question 13 routes to `specificity_ceiling`, which runtime maps to `FAIL`. `DO_NOT_ASSUME` remains internal: deterministic validation rejects the label, leaked guard text, and reader-facing disclaimers without treating the internal data field as prose.

Low reasoning is the documented suspect in the v2 false-positive rate. The proposed live runner is fixed to `gpt-5.6-terra` at `high` reasoning and cannot run from a generic CLI authorization switch.

## Card-scoped categories

| Category | Definition | Runtime action |
| --- | --- | --- |
| `astrology_integrity` | Contradicts the supplied astrology facts or astrological function. | `FAIL` |
| `shared_ban` | Violates a shared register ban. | `FAIL` |
| `specificity_ceiling` | Invents an unsupported event, motive, status, or outcome. | `FAIL` |
| `house_bleed` | Replaces a sign mechanism with its associated house domain. | `REVISE` |
| `stock_trope` | Uses a familiar shortcut in place of the mechanism. | `REVISE` |
| `example_proves_astrology` | Uses an example that does not demonstrate the mechanism. | `REVISE` |
| `metaphor_requires_translation` | Makes the reader translate compression into ordinary events. | `REVISE` |
| `tagline_stands_alone` | Leaves a hook undeveloped by the complete card. | `REVISE` |
| `owner_voice_drift` | Observably drifts from supplied card exemplars; evidence IDs required. | `REVISE` |

## Paired fixture contracts

These are the frozen contracts for the separately authorized 20-call live evaluation.

| Pair | Positive | Negative | Named dimension | Target categories | Verdict contract |
| --- | --- | --- | --- | --- | --- |
| Aries generic prop | `gold-lilith-aries-v5` | `neg-aries-dishes` | Generic example replaces mechanism | `stock_trope`, `example_proves_astrology` | PASS / REVISE |
| Capricorn house bleed | `gold-lilith-capricorn-v5` | `neg-capricorn-career` | Associated house replaces sign mechanism | `house_bleed` | PASS / REVISE |
| Sagittarius house bleed | `gold-lilith-sagittarius-v5` | `neg-sagittarius-9th` | Associated house replaces sign mechanism | `house_bleed` | PASS / REVISE |
| Pisces untranslated metaphor | `gold-lilith-pisces-v5` | `neg-pisces-well` | Consequence replaced by untranslated metaphor | `metaphor_requires_translation` | PASS / REVISE |
| Taurus undeveloped hook | `gold-lilith-taurus-v5` | `neg-taurus-tagline` | Earned tagline replaced by undeveloped hook | `tagline_stands_alone` | PASS / REVISE |
| Aquarius generic empowerment | `gold-lilith-aquarius-v5` | `neg-aquarius-selfhelp` | Mechanism replaced by generic self-help | `stock_trope`, `owner_voice_drift` | PASS / REVISE |
| Gemini advocacy abstraction | `gold-lilith-gemini-v5` | `neg-gemini-advocacy` | Observable card voice replaced by abstraction | `owner_voice_drift`, `example_proves_astrology` | PASS / REVISE |
| Virgo clinical shorthand | `gold-lilith-virgo-v5` | `neg-virgo-clinical` | Mechanism replaced by therapy shorthand | `stock_trope` | PASS / REVISE |

The remaining four gold cards run as additional positive contracts, producing the proposed 12 gold plus 8 negative call set. Each pair shares the same non-candidate packet and comparison set; the degradation changes only its named card field.

## Governance and authorization

The owner-approved source hashes for the surface ruling, critique checklist, and rubric are pinned in their approval headers and contract-tested. The exact owner card-writing standard remains SHA-locked. All three governed v3 documents are active in the harness and inactive in production. The model schema contains findings only; runtime maps category actions to PASS, REVISE, or FAIL. The one-use environment token names the owner-authorized 20-call budget, allows no retries, and is rejected after the run artifact exists.

## Approval and authorization record

On 2026-08-09 the owner:

1. approved the register-per-surface ruling at source SHA-256 `db48c5b42df2afee30faea6141a3417ca1e1d69fc3110586281bdd79e72d29e2`;
2. approved the card critique checklist v3 at source SHA-256 `3507f41f6c29b6b9abb2216e9f2acddf63be519866b4c88259c852791cbad043`;
3. approved the card judge rubric v3 at source SHA-256 `c7426929d5868847bea263b3c8b7eb3830304657dde2f6f54ebb7b417268e983`;
4. approved routing editorial-test question 13 to `specificity_ceiling` with runtime `FAIL`; and
5. authorized one live evaluation of exactly 20 calls, `gpt-5.6-terra`, high reasoning, zero retries, using the frozen 12 gold and 8 paired negative fixtures.

The authorization does not activate or promote the candidate writer. Production activation and promotion remain off.
