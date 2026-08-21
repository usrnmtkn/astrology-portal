# Friends pattern-copy editorial review - 2026-08-21

Status: **needs review; not serving**

The owner supplied an editorial pass covering Friends daily copy, Do/Don't
items, three synastry explanations, and the natal Ascendant architecture. The
active rule distilled from those notes is
`tldr-astro-phrasebank/TLDR-HUMAN-PATTERN-AND-RELATIONSHIP-COPY-RULING-OWNER.md`.

This record deliberately does not overwrite the current rows. Ten of the
eleven affected source snapshots are `approved`; the Venus-Midheaven row is
`reviewed`. The JSON companion locks the current copy hashes and keeps every
candidate `ownerApproved: false`, `promotionAuthorized: false`, and
`canonical: false`.

## Decisions implemented in the writing system

- Relationship copy names the connection instead of using a room as the
  metaphorical container for the relationship.
- Synastry remains directional and proportional: one person acts, the other
  responds, and astrology explains the pattern without excusing the behavior.
- A Do item that uses a transitive verb names its object. Do and Don't columns
  keep parallel grammar within each column.
- Full natal placement detail moves from placement function to sign mechanism,
  lived evidence, consequence, complication, and mature expression.
- Short natal-pattern cards lead with the human pattern and keep astrology
  taxonomy secondary.
- Copy becomes more specific after the opening and does not make unsupported
  claims about worth, history, wounds, motives, or outcomes.

## Source rows held for exact-wording review

| Content key | Current state | Required decision |
|---|---|---|
| `fallback-hook/pair-daily/bond-clause/hard/saturn` | approved | Exact natural replacement for the relationship-room metaphor |
| `fallback-hook/pair-daily/close/hard` | approved | Exact plan/schedule and flexibility wording |
| `fallback-hook/bond-effect-square/saturn` | approved | Complete directional payload for the shorter natural-language ending |
| `fallback-hook/synastry-pair/mercury/venus/conjunction` | approved | Directional template mapping and exact wording |
| `fallback-hook/synastry-pair/venus/saturn/soft` | approved | Directional template mapping and exact wording |
| `fallback-hook/synastry-pair/venus/midheaven/soft` | reviewed | Directional template mapping and exact wording |
| `fallback-hook/angle-intro/ascendant` | approved | Family-level template and exact wording; resolve the remaining room metaphor |
| `fallback-vocab/dodont-reward/jupiter` | approved | Exact object after `Ask for more` |
| `fallback-vocab/dodont-shadow/moon/sagittarius` | approved | Owner choice between escaping and avoiding |
| `fallback-vocab/dodont-moon-dont/scorpio` | approved | Review only as part of the parallel Don't set |
| `fallback-vocab/dodont-friction/moon` | approved | Review only as part of the parallel Don't set |

Approval of this document alone does not promote any candidate. Promotion
requires an exact payload for every runtime direction plus a resolvable owner
approval record.
