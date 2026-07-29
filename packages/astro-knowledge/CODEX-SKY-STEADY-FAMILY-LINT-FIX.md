# Codex prompt: fix the conditional "steady" ban to cover the word family

This is a deterministic linter bug, NOT prompt tuning (the ceiling ruling still
holds for the generator). The fresh placement sample exposed it:

- Moon in Capricorn scored a false 3 - it used "steadiness" with "strong" AFTER it
  ("Reliability and steadiness make us strong"), which violates the rule (stable/
  strong/solid must come BEFORE), but the linter missed it.
- Venus in Virgo correctly failed on bare "steady" but looped through all 3 retries
  without escaping.

Root cause: the conditional ban term is `steady`, compiled to `\bsteady\b`, which
matches "steady" but NOT "steadiness" / "steadies" / "steadier". The owner's
documented rule covers the whole family; the linter only implemented one form.

## Fix 1 - conditional ban covers the family (`sky-aspect.json` + linter)

Make the conditional ban match `\bstead(y|ies|iness|ier)\b` (whichever form),
keeping the same `requiresBefore: [stable, strong, solid]` logic and the same
"otherwise use calm/solid/grounded/consistent/sure" reason. After the change:
- Verify all 22 gold exemplars still lint 3/0 (none of them use a bare steady-word
  without an allowed lead, so they should).
- Verify "Reliability and steadiness make us strong" now FAILS (strong is after,
  not before), and "solid, steady work" still PASSES (solid before).

## Fix 2 - conditional-ban retry feeds the substitute

When a card fails on a conditional ban, the signal-fed retry should pass the fix,
not just the term: e.g. "You used 'steadiness' without stable/strong/solid before
it - replace it with calm, solid, grounded, consistent, or sure." Venus looped 3x
because the retry didn't steer it to a substitute. Virgo semantically wants
"steady"; "solid effort" or "consistent effort" is the intended landing.

## Fix 3 - polish the one card the fix now catches

Once the regex is fixed, Moon in Capricorn will fail. One-word polish, owner-style:
"Reliability and steadiness make us strong" -> "Reliability and consistency make us
strong". Everything else in that card stays.

## Not in scope

Sun in Leo (overpacked generic middle) and Mercury in Cancer (borderline invented
detail) remain judge-2s at the model ceiling - those go to the one-line human-polish
queue, not another generator tuning cycle. After Fixes 1-3, report the re-lint of
the 22 golds + the 5-card sample, and enabling placements is the owner's call.
