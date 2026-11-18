# Release queue

One coordinator admits one implementation/release owner at a time. The repository
variable `RELEASE_ACTIVE_PR` identifies that candidate by its numeric PR number.
Main checks remain enabled. Missing admission holds PRs before expensive runner
jobs; the three required aggregate/privacy checks fail closed with `RELEASE_HELD`.
This is a scheduling hold, not a tested application failure or a passing gate.
An admitted browser run first builds Web and Studio under the pinned runner
profile and checks both existing bundle limits. Selected browser jobs start
only after that preflight succeeds; their existing checks remain intact.

When the owner has authorized release coordination, slot assignment, code merge,
main deployment and automatic production acceptance use that recorded authority.
Verify its source once. The coordinator assigns slots; agents do not ask the
human to reconfirm those operational steps. Editorial approval and genuinely
new scope remain governed by their own existing rules.

During a hold, owners report a concrete blocker to the coordinator and remain
queued. They do not solicit a new priority vote merely because CI is waiting.
The coordinator preserves the recorded order unless the human independently
reprioritizes or a concrete release blocker requires advancing another ready PR.

1. The coordinator records the queue and keeps other candidates frozen.
2. After the preceding main deployment passes its affected production acceptance
   and required main workflows finish successfully, set `RELEASE_ACTIVE_PR`
   with `gh variable set RELEASE_ACTIVE_PR --repo usrnmtkn/astrology-portal
   --body candidate-number`. Supply the actual PR number explicitly so the command
   runs noninteractively.
   The variable is scheduling state, not a secret or content approval.
3. The admitted owner updates once onto current main, regenerates affected
   artifacts and freezes the final head before pushing. Existing unmerged source
   work remains with its implementation owner.
4. Required API, browser and privacy checks must pass on that exact head. Reuse
   local evidence only for unchanged relevant inputs when repository gates allow
   it. A new push cancels unfinished checks for the superseded PR revision;
   completed results and failures remain recorded.
5. Use one quiet terminal-event wait through completion, concrete failure or
   required action. Repair a concrete failure before submitting a replacement.
6. Merge, let the main Git integration deploy, and verify the affected production
   journeys automatically. Record commit, deployment and acceptance outcomes,
   then hand the slot to the next owner after the required main workflows pass.
   Clear the variable when the queue ends.

If a frozen, already-pushed head becomes admitted without any source update,
rerun its original pull-request workflow runs once after setting the variable.
Manual dispatch in these PR-validation workflows is limited to main. Candidate
validation uses pull-request runs; dispatch-only checks do not replace the
pull-request checks required by branch protection. Other manual publication and
calibration workflows retain their existing scopes and authorization rules.

Run `node scripts/test-ci-release-admission.mjs` and
`ruby scripts/test-ci-workflow-syntax.rb` after changing admission or workflow
conditions. Neither scheduling nor cancellation waives an exact-head gate.
