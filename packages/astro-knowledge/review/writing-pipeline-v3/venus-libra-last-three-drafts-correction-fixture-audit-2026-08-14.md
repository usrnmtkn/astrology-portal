# Venus in Libra: last-three-drafts correction-fixture audit

Date: 2026-08-14

Scope: the three most recent Venus in Libra generated artifacts:

1. `venus-libra-v2-failed-retrieval/rendered-output.md`
2. `venus-libra-v2-rendered-cold-read.md`
3. `venus-libra-partial-rewrite-rendered-cold-read-v1.md`

The audit compares owner review instructions against the 20-fixture runtime correction file,
the 44-row mined owner-feedback corpus, and the canonical deterministic rules as they existed
before the 2026-08-14 fix. It does not infer new owner-approved corrections.

## Draft 1: failed retrieval

### Correctly recorded outside the correction corpus

- The run had no positive voice evidence and did not sound like the owner. This is retrieval
  governance rather than a sentence-level before/after pair. It is recorded as
  `failed-retrieval`, and the empty/below-floor evidence preconditions now block that failure
  before billing.

### Review correction not preserved as a reusable fixture

- **Bad:** `one collaboration`, `one person`, `the other`, and generic `follow-up work or an
  added cost` standing in for lived evidence.
- **Owner direction:** name the actual decision, actual cost, and actual follow-up work.
- **Current coverage:** enforced in the Venus request's `literalEvidenceRequirements`, but
  absent as a reusable before/after correction fixture.
- **Suggested category for a future owner ruling:** `abstract_scene_placeholder`.

## Draft 2: full rewrite

### Review corrections not preserved as exact reusable fixtures

1. **Bad:** `The job of Venus in Libra is not simply to produce agreement.`
   **Owner direction:** cut the job sentence; the protected opening already carries the job.
   **Current coverage:** the canonical spine-slot rule and `spine_scaffold_grammar` detect the
   family, and a separate `This is a period for...` fixture exists, but this exact correction
   pair is absent.

2. **Bad:** the five-page website/custom-build scenario carrying the entire lived section.
   **Owner direction:** replace it with two or three quick ordinary situations from approved
   same-placement scene evidence; no niche professional scenario carries the argument alone.
   **Current coverage:** request-scoped scene preconditions and evidence retrieval, but no
   before/after correction fixture for the one-scripted-professional-scene failure.
   **Suggested category for a future owner ruling:** `single_scripted_scene`.

3. **Bad:** `A real compromise needs two stated positions.`
   **Owner direction:** remove it; `real` is an empty intensifier.
   **Current coverage:** `empty_intensifier` already exists as a category through a different
   Saturn example, but this exact Venus correction was never added as a fixture.

4. **Bad family:** `a connection can stay easy` / `the connection can hold honesty`.
   **Owner direction:** reject the vague outcome construction; “a connection staying easy is
   weird.”
   **Current coverage after this task:** now recorded as `vague_outcome_clause` and enforced by
   the deterministic family check.

### Already covered without a new fixture

- Every instance of `whether` already fails the global deterministic ban.
- The website row's `one person` / `the other` placeholders were already caught by the
  request-scoped literal-evidence gate, though the reusable fixture gap above remains.

## Draft 3: partial rewrite

### Newly recorded in this task

- **Bad:** `Honesty shows whether the connection can stay warm once your answer has equal
  weight.`
- **Correction:** cut it and end on the concrete consequence.
- **Category:** `vague_outcome_clause`.
- **Owner reason:** `a connection staying easy is weird`.

### Review correction not preserved as an exact reusable fixture

- **Bad:** `their response shows whether they will reopen the decision and share the revisions
  or expect you to keep carrying out the original plan`.
- **Owner direction:** `their response tells you which one it was: they reopen the decision and
  split the revisions, or they expect you to keep carrying the plan you never picked.`
- **Current coverage:** the banned-word rule catches the original sentence and the new
  deterministic vague-outcome family catches `shows/tells whether X can stay Y`; this exact
  before/after pair is not yet in the correction corpus.
- **Suggested category for a future owner ruling:** `vague_outcome_clause`.

## Result

- One newly authorized correction fixture was added.
- Four earlier exact review corrections remain absent as reusable fixtures:
  `abstract_scene_placeholder`, `the job of` cut, `single_scripted_scene`, and the Venus
  `real compromise` empty-intensifier line.
- One additional exact before/after pair from the current review remains absent: the response
  sentence rewritten from an abstract outcome test into two named outcomes.
- No unapproved fixture wording was added for those five findings. They await an owner ruling
  if they should become permanent correction pairs.
