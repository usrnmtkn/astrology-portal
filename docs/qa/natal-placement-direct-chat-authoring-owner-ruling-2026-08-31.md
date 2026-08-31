# Natal placement direct-chat authoring owner ruling

Date: 2026-08-31
Scope: natal planet-placement repair on `agent/natal-placement-three-layer-audit`
Status: owner process direction; does not approve any replacement prose by itself

## Owner direction

The owner directed that the natal placement repair reuse the successful natal angle-aspect workflow:

**ChatGPT is the writer/editor. Codex is implementation-only.**

Codex is not the prose generator for this project. ChatGPT and the owner develop, review, revise, audit, and freeze the reader copy first. Codex receives the finished, SHA-bound copy only after the owner has approved it for implementation.

The owner explicitly chose this workflow because the Codex writing engine has produced flatter prose than the collaborative ChatGPT editing process used successfully on prior natal work.

## Editorial workflow

### 1. Establish doctrine before drafting

Define the astrology mechanism, surface, register, owner voice evidence, and content-family rules before producing reader prose.

For natal placements:

- write a recurring natal pattern, never a transit or event forecast;
- the reader should learn something concrete about how they operate;
- mechanism comes before generic astrology language;
- recognizable behavior and consequences matter more than keyword coverage;
- use concrete stakes such as time, money, work, home, relationships, responsibility, recognition, access, privacy, and ordinary decisions when the placement supports them;
- keep sign and house jurisdiction distinct;
- use natural prose rather than coaching scaffolds.

### 2. Write from mechanism, not old prose

Current serving copy may be inspected for defects and protected-text integrity, but it is not the drafting source for a replacement. Semantic meaning comes from governed astrology evidence, including the owner-supplied natal references. Owner writing supplies vocabulary, sentence movement, examples, and tone.

For planet-in-house baselines, Myrna Lofthus, *A Spiritual Approach to Astrology*, is an approved semantic reference. It is not a voice source. Dated medical claims, deterministic outcomes, fixed gender/family assumptions, karmic certainty, and career-only interpretations must be filtered out unless separately supported by current owner doctrine.

### 3. Draft in bounded batches

ChatGPT drafts a small planet/house or planet/sign batch after the evidence receipt and meaning plan are complete. The owner and ChatGPT review the writing conversationally before scaling.

Approval state must remain explicit:

- proposed;
- partial owner approval;
- exact owner-approved;
- reopened after doctrine change.

Collaboratively drafted copy does not become `owner_authored` merely because the owner approves it.

### 4. Batch-level voice audit

After individual drafts are viable, reread the set for generated repetition and flattening. Check repeated openings, repeated pivots, repeated paragraph architecture, generic coaching language, interchangeable examples, and sentences that reveal the template instead of the person.

De-template only where needed. Do not rewrite strong copy merely for variation.

### 5. Manual natal audit

Read every row line by line as an enduring natal interpretation.

Questions include:

- Would this still be true if nothing were happening today?
- Does the opening describe a recurring pattern rather than an event?
- Is an example illustrating the placement rather than creating the interpretation?
- Is the planet behaving like the planet?
- Is the sign behaving like the sign rather than its traditionally associated house?
- Is the house changing where/how the planetary function operates rather than appending a textbook definition?
- Does the text avoid unsupported biography, motive, medical certainty, or external reaction?

### 6. First-sentence audit

Review the opening sentence of every final candidate separately. It must make normal grammatical sense, immediately tell the reader something meaningful about themselves, establish the natal pattern, and not rely on the next sentence to explain what the first sentence meant.

### 7. Preserve exact approvals and verify version integrity

Never trust a status label alone. Before consolidation, verify the actual text of every owner-approved unit. Approved passages and protected calibration material must remain byte-identical. Stale earlier drafts may not silently replace later owner-approved versions.

### 8. Assemble the complete canonical candidate batch

Only after the editorial work is complete should the batch be consolidated into one canonical candidate artifact. Runtime keys remain the existing runtime keys; authoring doctrine must not invent alternate keys merely to describe semantic logic.

### 9. Mechanical QA follows editorial QA

After prose is stable, run deterministic checks for expected key count, duplicate sentences, banned or flagged constructions, structural requirements, protected hashes, cross-corpus reuse, and near duplicates.

Mechanical PASS is not prose approval. Mechanical WARNs are reviewed by a human and do not automatically trigger rewrites.

### 10. Occupancy audit before implementation

Before Codex writes to governed content or Content Studio, it must check the exact target keys for existing LIVE/serving/protected content. Occupied protected keys are a hard review wall, not an overwrite opportunity.

### 11. Old-versus-new review for occupied keys

For every occupied protected key, return the current LIVE body and proposed new body, old/new SHA, approval metadata, provenance, source authority, and classification. The owner decides whether that exact protected key may be replaced.

`newer file wins` is never an authority rule.

### 12. Final owner approval is SHA-bound

The final candidate artifact receives a SHA-256. Owner approval references the exact artifact, exact SHA, exact approved row set, and any explicit authority to replace protected content. A changed SHA requires a new approval decision.

### 13. Codex receives a handoff package, not a writing prompt

Codex implementation input should contain the frozen copy plus manifest, preflight/occupancy audit, approval record, and implementation instructions.

Codex must be told:

- do not rewrite or improve prose;
- do not invent metadata;
- preserve exact runtime keys;
- use the existing governed content family and schema;
- perform live occupancy/provenance checks;
- stop on conflicts;
- use the normal package -> Content Studio materialization path;
- prove no unrelated reader-copy drift.

### 14. Implementation remains staged through review walls

Implementation, Content Studio materialization, Git integration, merge, and deployment are separate decisions. One approval never implies the next.

### 15. Clean integration is separate from authoring

If the authoring branch contains unrelated work or current main has moved materially, apply the focused approved implementation onto a clean branch from current `origin/main`, rerun the relevant checks, and stop again at the Git/merge review wall.

## What remains governed

This process change does not weaken the editorial or serving gates:

- semantic meaning must remain grounded in supplied natal sources;
- owner-authored Chiron and Lilith material remains positive structural evidence for developed natal placement writing;
- current owner writing standards, correction ledger, do-not-use rules, sign/house separation, literal-language rules, and cold rendered prose review still apply;
- ChatGPT retrieves and uses owner-authored prose evidence before drafting rather than writing from astrology notes alone;
- existing protected `approved` copy remains byte-identical until the owner authorizes the exact replacement;
- new ChatGPT-authored candidates remain `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until the owner approves their complete exact wording;
- no candidate is promoted or served because ChatGPT recommends it.

## Placement architecture

The three-layer natal placement hierarchy remains binding:

1. **Sign baseline:** complete birth-time-independent planet-in-sign interpretation.
2. **Planet-house baseline:** complete interpretation of that specific planet operating in that natal house, valid across signs.
3. **Exact synthesis:** custom planet-in-sign-in-house interpretation that adds information neither baseline supplies independently.

Direct ChatGPT authoring changes the prose-generation method, not the architecture, astrology boundaries, provenance, owner approval wall, implementation wall, or deployment wall.
