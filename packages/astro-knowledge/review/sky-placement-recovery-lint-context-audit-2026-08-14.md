# Sky placement recovery: lint context audit

> **Superseded for content totals.** `CODEX-SKY-PLACEMENT-MASTER-BRIEF.md` v2
> is the controlling recovery record. This report preserves the harness diagnosis
> that produced ED-031; its copy-failure totals describe the earlier checkout and
> must not be used as the current recovery ledger.

Date: 2026-08-14  
Scope: the 84 four-slot recovery candidates (Jupiter, Uranus, Neptune, Pluto,
Chiron, North Node, and South Node in all twelve signs). No copy was rewritten
for this audit.

## Finding

The reported regression was principally an audit-contract error. The public
`lintArticle(article)` function read `planet`, `sign`, and `factContext` only
from the article object. A caller using the natural form
`lintArticle(article, { planet, sign })` appeared to supply the context, but the
second argument was silently ignored. The resulting audit could:

- report reviewed cycle facts as `untraced-duration` because `planet` was null;
- skip sign-specific scene checks because `sign` was null;
- still return an ordinary score, making an invalid audit look authoritative.

Before the fix, the contextless and ignored-second-argument runs were identical:
84 of 84 pages failed, with 189 total failures under the full current policy.
That included 64 `untraced-duration` findings. Supplying planet and sign inside
the article reduced the duration count from 64 to 17.

## Fix

`lintArticle` now accepts context in either supported form:

```js
lintArticle({ ...copy, planet: "jupiter", sign: "aries" })
lintArticle(copy, { planet: "jupiter", sign: "aries" })
```

The two forms are regression-tested to produce identical findings. Missing or
conflicting planet/sign context now returns `auditValid: false`, `score: null`,
and explicit `contextErrors`. It does not manufacture duration findings. The CLI
uses exit status 2 for invalid audit context.

The reproducible audit is
`packages/astro-knowledge/scripts/audit-sky-placement-lint-context.js`.

## Correctly contextualized results

The recovery ledger intentionally exempts the July fragment taglines while the
family awaits rewriting. Under that same comparison:

| Scenario | Valid pages | Scored pages with failures | Total failures | Breakdown |
|---|---:|---:|---:|---|
| Active policy, planet/sign supplied | 84 | 46 | 58 | CF-001 34; untraced-duration 17; CF-002 6; CF-018 1 |
| Diagnostic CF-001 exemption, planet/sign supplied | 84 | 20 | 24 | untraced-duration 17; CF-002 6; CF-018 1 |
| Full current policy, including the newer full-sentence tagline rule | 84 | 84 | 142 | CF-006 84; CF-001 34; untraced-duration 17; CF-002 6; CF-018 1 |

The 17 duration findings are present in the source currently checked out. They
are transit-window claims such as `over a decade`, `nearly two years`, and `a
year and a half`; they are not the seven planet-education facts awaiting owner
ruling. The 84-candidate source contains zero `{{entryDate}}` or `{{exitDate}}`
rows, so this worktree does not contain the converted text Claude measured. The
conversion itself cannot be assessed from this branch until that exact diff is
available.

## CF-001 governance conflict

CF-001 is now the largest valid-context failure class: 34 findings across the
84 candidates. The active recovery brief and active policy still prohibit
`people` on Sky placement. A later, currently unmerged owner ruling says:

> "people is allowed in the collective, just use it sparingly."

That later ruling exists in historical commit
`1878149ea64d8d78dd44fce45794e312da4124d6` and changes CF-001 from a hard word
ban to semantic redundancy review. The diagnostic exemption above shows its
exact effect, but this branch does not silently choose between the conflicting
governance records. Reapplying that ruling to this recovery branch requires an
explicit owner instruction because the recovery brief declares itself the
newest single source of truth and still names CF-001 as active.

## Separate ED-028 drift found

The ED-028 decision correctly permits reader address on Sky placement, but the
active Sky placement spec, writer prompt, judge instruction, and tests still
said the surface was collective-only. Those active instructions were aligned to
ED-028. Calendar Sky aspect copy remains collective. Historical audit and review
documents were left unchanged.

## Verification

- Editorial decision suite: PASS, including embedded context, separate context,
  missing context, and contradictory context regressions.
- The 84-page audit script: PASS and reproducible.
- Placement pipeline: reaches the open ED-030 conflict in the frozen
  Saturn/Capricorn review bundle; the new punctuation policy and protected copy
  need the recorded owner sign-off before that suite can pass.
- Satori writer suite: stops at the corresponding ED-029 conflict in protected
  batch-3 copy before reaching the updated prompt assertions. This is not a
  baseline failure; it is an unresolved consequence of activating ED-029.
