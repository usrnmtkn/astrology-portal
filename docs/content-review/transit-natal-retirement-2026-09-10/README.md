# Personal transit replacement inventory

Audited September 10, 2026 against main `14cd3437`. Source rows, the generated transit partition, and the shipped resolver were checked independently. This is a retirement work queue, not new reader copy or an approval record.

## Scope and findings

| Scope | Identities | Authored aspects | Authored returns | Fallback compositions | Missing returns |
|---|---:|---:|---:|---:|---:|
| All supported Personal Transits Studio selections | 1,218 | 817 | 7 | 392 | 2 |
| Existing You coverage audit's natal-axis scope | 938 | 728 | 7 | 201 | 2 |

An identity is one transiting body, natal point, and aspect. These counts do not count dates, signs, motions, or repeated passes as new articles. A shared authored hard/soft article may cover several identities. They are routing fixtures, not simultaneous or necessarily physically reachable chart events.

The broader Studio scope includes South Node, Descendant, Midheaven, and Imum Coeli selections omitted by the existing You coverage audit's deduplicated natal-axis scope. The original 392 figure was the complete Studio selection inventory, not 392 unique old articles appearing in You.

The 378 existing authored aspect records match their generated partition exactly. The preceding read-only production audit found all 378 published, with three later Studio You revisions selected correctly (Sun–Venus soft, Sun–Mars soft, Chiron–Jupiter hard). No database synchronization or writing changes were performed.

None of the 394 pending exact keys has a personal-transit source in the current source rows or bundled transit partition. Fifty-four have an exact-order Calendar/collective reference in the knowledge library. Those are a different subject and approval scope; their existence does not authorize a personal-transit replacement.

An old prompt references `tldr-astro-phrasebank/TLDR-Transit-Return-Pass-Candidates-REVIEW.md`. That file is absent from current main and has no recorded history on main at this audit. The prompt is historical reference, not an instruction to reconstruct or approve its missing contents.

## Technical repair

The old dynamic Content Studio admission policy allowed exact natal placements and natal aspects, but not newly authored personal-transit aspect or return keys. Publishing a new exact article could therefore fail reader eligibility even after review.

The repair admits validated `authored/transit-aspect/{transiting}/{natal}/{aspect}` and eligible `authored/transit-return/{planet}` identities carrying `full_copy`, `reader_only: true`, and `render_policy: personal-transit-exact-v1`. Existing publication, lane, review, and retirement checks still apply. Ordinary conjunction keys cannot substitute for eligible returns; unsupported natal Lilith aspects and malformed identities are rejected.

Personal Transits gains **Open exact passage**. It loads an existing source first, including a saved draft, or opens an empty non-serving draft under the canonical reader key. It never copies the old fallback into a new approved article. The source applies to both Sky Placement and You Transit when approved and published.

No existing approved passage, resolver prose, or retired composition is modified. No new real passage is approved or published by this change. Synthetic isolated-storage tests prove replacement selection without production writes.

## Editorial work order

1. The four Sun-to-node fallback identities that relate directly to the reported mismatch: Sun opposite/square North Node and Sun opposite/square South Node.
2. Sun return and Uranus return, which currently have no eligible return passage.
3. The remaining fallback identities in the existing You reader audit scope.
4. The remaining Studio-only coverage identities.

The complete machine-readable queue is [inventory.json](inventory.json); the sortable worksheet is [replacement-queue.csv](replacement-queue.csv). Every pending record retains its current selected source, canonical replacement key, priority, and available cross-surface references. Removing active fallback dependencies before their replacements are approved would create additional missing passages.

## Authoring prerequisite

The canonical writer requires an owner-approved argument before drafting and a recorded structural spine for the family. `src/astro-writing/spineRegistry.mjs` currently records placement article spines only and lists aspects as missing. Its shared meaning-plan builder also requires a sign and sign mechanics, while these exact aspect articles must remain independent of sign and house. A sign must not be invented to satisfy that interface.

The proposed first batch is documented in [first-batch-review.md](first-batch-review.md). It is an editorial work proposal, not approval of prose, a fabricated argument-gate result, or a request to delete live writing. The aspect-specific writing path needs to preserve the personal-transit contract rather than borrowing the Sky placement article schema.

## Reproduce

Run `node --import tsx scripts/audit-transit-natal-retirement.mts` to rebuild the inventory from the current local source and shipped reader. It performs no database or model calls. The script records the source commit and does not mark missing work complete when a generic composition renders.

## Validation

- Full local `npm run test:content-studio-api` passed. Added actual-handler publication cases for a previously absent Sun–South Node opposition and both missing returns, followed by real dashboard loading and shipped-resolver rendering.
- The preview contract verifies empty draft creation, approved exact selection, draft/reference/review exclusion, retirement, and invalid identities.
- Four fresh-build browser cases passed (1440/390 pixels, light/dark), including exact-source creation, non-serving save, and reopen with the complete saved passage.
- Admin build, unchanged bundle budgets, CSS audits, production-style Node startup, and existing Studio transit resolver checks passed.
- No approved source rows, serving projection, or resolver artifact changed. The static package remains `v3-2026-09-10f`; the change extends the external publication admission policy and Studio authoring controls.
