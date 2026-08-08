# Codex prompt — correction: the warmth harvest never fails closed on a missing corpus match

Copy everything below the line into Codex. This corrects the wiring specified in
`codex-prompt-aspect-corpus-warmth-aug04.md` and `codex-prompt-calendar-corpus-warmth-aug04.md`.
It implements owner rule OV-042 (owner feedback audit; also recorded in
`docs/editorial-ai/method-corpus-warmth-harvest.md`, section "The corpus is never a quota").
No billed calls; this is wiring and spec work only.

---

The owner has made a permanent, global rule (OV-042): the owner corpus is never a quota. No pipeline
may fail, block, or demand new owner writing because the corpus lacks a matching line. The prior
warmth-harvest wiring treated a missing corpus match as fail-closed. Correct that on every surface
where the harvest runs (aspect cards, calendar/timing, lunations, TLDR lines).

## 1. Packet behavior on a missing corpus match

When the harvest finds no qualifying owner line for an entry's core, the packet compiles anyway with
`harvest_mode: "none_found"` (joining the existing `matched` and `vocabulary_only` modes):

- No foundation lines are supplied and no insert instruction is emitted.
- The entry carries a non-blocking flag (`owner-corpus-warmth-none-found`, severity info,
  `blocking: false`) so it can be revisited if future owner writing covers that core.
- Generation proceeds. Nothing waits on new owner prose.

## 2. Writer behavior under none_found

The register stays plain. The writer does NOT invent a permission, reassurance, benediction, or
turn-toward-the-reader line. Absence of warmth is acceptable; imitation warmth is not.

## 3. Judge behavior under none_found

When the packet supplied no foundation lines, the judge requires no turn toward the reader — a card
with no warmth beat is not penalized for its absence. The existing rule against invented imitation
warmth still applies and still scores 2. The judge additions from the aspect prompt (§5) apply only
`when foundation lines were supplied`; make that condition explicit in the judge spec.

## 4. The only remaining fail-closed case

An aspect entry with no human-moment beat still fails closed — that is editorial data completeness,
not owner writing. It flags for editorial work on the entry; it never demands new owner prose. (The
42 blocked classical quincunxes are the correct current state of this case.)

## 5. Update the prior prompts' implementations

Wherever the aug04 wiring or its output specs say or imply that a missing corpus match blocks
generation, correct them to the behavior above. The two fail modes must be kept distinct:

- missing corpus match → `none_found`, non-blocking, proceed plain
- missing human-moment beat → fail closed, editorial-work flag

## 6. Reference implementation

The placement-article surface already implements this in the marie-satori-writer skill: see
`compile-writing-packet.js` (packet version `corpus-warmth-v2-none-found`, `selectOwnerCorpusWarmthEvidence`
returning a `none_found` evidence object with `editorial_flags`), the `harvest_mode` enum
`["matched", "none_found"]` in `sky-placement-writer-packet-v3.schema.json`, and the none_found
paragraph in the writer contract. Mirror those semantics; do not diverge on flag naming.

## 7. Verify

- A packet built for a core with no corpus match compiles, carries `harvest_mode: none_found`, the
  non-blocking flag, and no foundation lines.
- A generation under none_found produces a plain-register card with no invented warmth line, and the
  judge does not penalize the missing beat.
- An entry with no human-moment beat still fails closed with an editorial-work flag.
- Entries with matches are unchanged: foundation lines, provenance, and the supplied-lines judge
  rules all behave as before.

Out of scope: generating or revising any reader copy, the placement-article surface (already
corrected), owner approvals, and any serving or promotion change.
