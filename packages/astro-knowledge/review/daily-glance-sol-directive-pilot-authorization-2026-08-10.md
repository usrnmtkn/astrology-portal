# Daily-glance Sol directive pilot authorization

Date: 2026-08-10  
Status: OWNER AUTHORIZED

This record is the governing authorization for the writer-only pilot attached to the
Daily At-a-Glance self-audit lane. It replaces the lane's former citation to
`daily-glance-autonomy-roadmap-2026-08-05.md`; that roadmap remains isolated in PR #153
for separate owner review.

## Authorized scope

- Merge PR #155 after rebasing it independently onto `main` and passing checks.
- Run exactly 12 billed `gpt-5.6-sol` calls at `xhigh` reasoning.
- Keys: `conjunction/neptune`, `soft/chiron`, `square/uranus`, and
  `conjunction/pluto`.
- Three independent one-candidate calls per key.
- Run deterministic lint on every output and report the lint-clean rate per key.
- Report every `NO_LINT_CLEAN_CANDIDATE` result and the total cost.
- Keep every output `UNAPPROVED`.

## Prohibited

- No Terra judging.
- No extension to any other pending key.
- No candidate revision or winner selection.
- No serving-content, bundled-content, or `review_status` change.
- No modification or merge of PR #153 as part of this work.

## Owner authorization, verbatim

> Go ahead: take PR #155 out of draft and merge when the queue clears. Then run a
> billed pilot of the new lane on 4 score-1 keys — conjunction/neptune, soft/chiron,
> square/uranus, conjunction/pluto — three independent Sol calls each (12 billed
> calls). Report lint-clean rate per key, any NO_LINT_CLEAN_CANDIDATE results, and
> cost. Don't run Terra judging or extend to the remaining 8 pending keys until I
> review the pilot. No serving changes; all outputs stay UNAPPROVED.

The owner subsequently directed that PR #155 be decoupled from PR #153 and confirmed:

> After merge, the existing pilot authorization stands unchanged: exactly 12 Sol
> calls across the four keys, outputs UNAPPROVED, no serving changes.
