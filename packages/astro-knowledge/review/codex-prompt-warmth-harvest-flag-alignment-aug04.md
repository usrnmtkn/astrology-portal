# Codex prompt — align warmth-harvest flag shape and mode naming with the reference implementation

Copy everything below the line into Codex. This is a naming-only follow-up to the work on
`codex/aspect-corpus-warmth-harvest` (worktree already reviewed and behaviorally approved). No billed
calls; no behavior change.

---

The aspect warmth-harvest implementation is behaviorally correct but diverges from the
marie-satori-writer reference implementation on two names. Align them on the same branch before
commit.

## 1. Flag shape

`aspect-corpus-warmth-harvest.js` currently emits flags as plain strings
(`"no_owner_foundation_line"`, `"missing_human_moment"`). The reference
(`.agents/skills/marie-satori-writer/scripts/compile-writing-packet.js`) emits flag objects. Convert
both flags to that shape:

- Corpus miss (non-blocking) — mirror the reference exactly:
  `{ id: "owner-corpus-warmth-none-found", severity: "info", blocking: false, reason: "No qualifying owner-corpus warmth line is available for this core. Revisit if future owner writing covers it; do not invent imitation warmth." }`
- Missing human-moment beat (fail-closed, editorial):
  `{ id: "missing-human-moment-beat", severity: "editorial", blocking: true, reason: "Aspect entry has no human-moment beat. This is editorial data completeness; flag for editorial work. Do not request new owner prose." }`

`generationAllowed` keeps its current values; the flag objects describe, they do not decide.

## 2. Mode naming

Rename `harvest_mode: "insert_one"` to `"matched"` everywhere (engine, packet builder, generators,
judges, lints, `.d.ts`, tests, docs). The resulting mode set is `["matched", "vocabulary_only",
"none_found"]`, superset-consistent with the reference schema's `["matched", "none_found"]`. The
insert-one-beat semantics stay expressed where they already live (`scaleRule.insertWarmthBeat`,
`maximumWarmthSentences: 1`, insert/placement instructions on matched full cards).

## 3. Verify

- Warmth-harvest regression suite, exact-aspect pipeline, full Current Sky aspect suite (including
  cron entrypoint), and reader-facing content contract all pass.
- Grep confirms no remaining `insert_one` and no string-typed warmth flags.
- Packet output for a corpus miss carries the reference-identical flag object; a missing-core entry
  still fails closed with the editorial flag object.
- Counts unchanged: 198 harvested, 42 fail-closed, 117 matched / 108 none_found on the existing
  corpus, 225 owner calibration entries intact.

Out of scope: any behavior change, any reader copy, approvals, serving, or promotion. Changes stay
uncommitted on `codex/aspect-corpus-warmth-harvest`.
