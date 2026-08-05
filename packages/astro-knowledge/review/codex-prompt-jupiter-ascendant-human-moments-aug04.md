# Codex prompt — store approved Jupiter–Ascendant human-moment beats and register the field

Copy everything below the line into Codex. This supplies the editorial data identified as the
blocking gap in the Jupiter–Ascendant packet review (all three targets failed closed on
`missing-human-moment-beat`). The beat wording below is exact owner-approved semantic input.
No billed calls; no reader copy is written, revised, approved, or promoted.

---

Three Jupiter–Ascendant synastry targets fail closed in the aspect warmth harvest because their
governed entries have no human-moment beat. The owner has given exact approval for one beat per
aspect group. Store them and register the field. Work on a fresh branch off `main`
(suggest `codex/jupiter-ascendant-human-moments`).

## 1. Store the approved beats

Add a `humanMoment` field to each entry in `packages/astro-knowledge/data/synastry/aspects/`,
placed directly after `plainTranslation`. Use these strings exactly, byte for byte, including the
`{{holder1}}`/`{{holder2}}` placeholders. Do not rewrite, trim, or "improve" them.

`A-jupiter_B-ascendant_conjunction.json`:

```json
"humanMoment": "Around {{holder1}}, {{holder2}} may feel more confident and at ease than usual, but can start relying on that encouragement to feel sure of themselves."
```

`A-jupiter_B-ascendant_square.json`:

```json
"humanMoment": "What begins as encouragement from {{holder1}} can leave {{holder2}} feeling pushed to promise more, take on more, or act more certain than they really are."
```

`A-jupiter_B-ascendant_trine.json`:

```json
"humanMoment": "{{holder2}} feels accepted around {{holder1}}, making it easy to show up without overthinking."
```

Opposition and sextile entries are out of scope; no beat has been approved for them.

## 2. Register the field

`humanMoment` is read by the harvest (`extractHumanMoment`) but was never registered with
validation, so entries carrying it currently fail `validate.js` with `unexpected field humanMoment`.

- `packages/astro-knowledge/scripts/validate.js`, `synastryAspect` shape: add `"humanMoment"` to
  `optional` and `humanMoment: "string"` to `types`.
- `packages/astro-knowledge/schema/synastry-aspect.schema.json`: add
  `"humanMoment": { "type": "string" }` to `properties` (the schema sets
  `additionalProperties: false`, so this is required).

No other schema, shape, or surface changes.

## 3. Expected packet behavior (verify, do not "fix")

Run the deterministic packet builder against each entry
(`build-aspect-writing-packet.js --surface synastry-aspect --format full-card --entry-file …`):

- Conjunction: `status: ready`, `generationAllowed: true`, `harvest_mode: matched`, one to three
  owner foundation lines supplied.
- Square: `status: ready`, `generationAllowed: true`, `harvest_mode: matched`, one to three owner
  foundation lines supplied.
- Trine: `status: ready`, `generationAllowed: true`, `harvest_mode: none_found`, carrying the
  non-blocking `owner-corpus-warmth-none-found` flag.

The trine `none_found` result is correct and owner-accepted under OV-042 (the corpus is never a
quota): the card runs in plain register with no invented warmth line. Do not reword the beat, add
corpus material, or alter `FEELING_FAMILIES` to force a match. The known matcher word-form gap
(literal family lookup misses inflections such as "accepted") is a separate follow-up and out of
scope here.

## 4. Verify

- `astro-knowledge` schema validation passes with no `humanMoment` errors and no new errors of any
  kind.
- Aspect warmth-harvest regression suite, exact-aspect pipeline, full Current Sky aspect suite
  (including cron entrypoint), and reader-facing content contract all pass.
- Pinned corpus counts are untouched: 240 targets, 198 ready full-card (198 matched, 0 none_found),
  42 fail-closed, 225 owner calibration entries. These synastry entries are not part of that corpus
  and must not shift it.
- Blocked-packet scale-rule behavior from PR #49 is unchanged.
- `git diff --check` is clean.

## Out of scope

- Any Jupiter–Ascendant card copy: nothing is written, rewritten, approved, or promoted.
- Approval state, serving priority, dashboard rows, and production content are unchanged.
- Opposition and sextile beats.
- `FEELING_FAMILIES` inflection coverage and the "comfort zone" false-positive (separate prompt).
- No billed model or judge calls.
