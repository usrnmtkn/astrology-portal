# Release queue

One coordinator admits one implementation/release owner at a time. The repository
variable `RELEASE_ACTIVE_PR` identifies that candidate by its numeric PR number.
Main checks remain enabled. Missing admission holds PRs before expensive runner
jobs; the three required aggregate/privacy checks fail closed with `RELEASE_HELD`.
This is a scheduling hold, not a tested application failure or a passing gate.
An admitted browser run first validates the pinned browser environment, native
server imports, and Web, authenticated reader startup and Studio build budgets.
Selected browser jobs start only after that preflight succeeds; their existing
checks remain intact.

When the owner has authorized release coordination, slot assignment, code merge,
main deployment and automatic production acceptance use that recorded authority.
Verify its source once. The coordinator assigns slots; agents do not ask the
human to reconfirm those operational steps. Editorial approval and genuinely
new scope remain governed by their own existing rules.

During a hold, owners report a concrete blocker to the coordinator and remain
queued. They do not solicit a new priority vote merely because CI is waiting.
The coordinator preserves the recorded order unless the human independently
reprioritizes or a concrete release blocker requires advancing another ready PR.

## Release size and turnaround

Owner direction, 2026-11-20, in
`thread:01a1efe7-84fd-7623-8559-23a770f86ad8`: reduce release delay and make this
rule durable. The release unit is a tested candidate containing compatible ready
fixes. A separate PR does not require a separate production release.

- Group compatible ready PRs before expensive validation. Keep source review
  history and scoped approvals, name the included PRs, and assign one integration
  owner. Separate a change only for a recorded dependency, source conflict,
  approval boundary or release risk; a blocked change must not hold ready fixes.
- Build the candidate on current main, resolve integration and fixture issues,
  run the affected preflight, then freeze once. Run the required exact-head
  gates and one main deployment for that candidate. Preserve explicit holds,
  unpublished drafts, protected prose and the normal production acceptance.
- For a simple ready fix, plan one affected validation cycle and one rollout.
  If the plan is expected to exceed 30 minutes, identify the mandatory gate,
  runner queue or dependency that requires it and give a source-based estimate.
  Remove unnecessary work before submission. This is a diagnosis threshold,
  never permission to skip a gate or invent a guaranteed completion time.
- Use affected checks and reuse passing evidence for unchanged relevant inputs
  where revision policy permits. Record the affected-plan or named gate that
  requires a complete suite. A status request, elapsed wait, or test-only commit
  does not itself require restarting successful work.
- Record the wait's deadline before yielding. If a job waits for a runner for
  ten minutes, or exceeds its configured execution deadline by five minutes,
  wake once for an authoritative status/log check and scoped recovery. Report
  the concrete blocker and next milestone once; continue without waiting for
  the human to request status. Keep one observer and remain quiet otherwise.

This supersedes a routine one-PR/one-release drain. Required checks, execution
timeouts, branch protection, editorial authority and privacy remain in force.

1. The coordinator records the next compatible candidate and keeps other
   candidates frozen.
2. After the preceding main deployment passes its affected production acceptance
   and required main workflows finish successfully, set `RELEASE_ACTIVE_PR`
   with `gh variable set RELEASE_ACTIVE_PR --repo usrnmtkn/astrology-portal
   --body candidate-number`. Supply the actual PR number explicitly so the command
   runs noninteractively.
   The variable is scheduling state, not a secret or content approval.
   For a new candidate, reserve its number with a release issue, set admission,
   then [convert that same issue into the PR](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request).
   This lets its first PR event use the assigned slot instead of producing held
   runs that need a second submission. Prepare the branch and review body first.
3. The admitted owner updates once onto current main, regenerates affected
   artifacts, completes the scoped preflight below, then freezes the final head
   before pushing. Source owners supply bounded handoffs; the assigned integration
   owner completes a combined candidate.
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

## Mandatory preflight before CI submission

Owner direction, 2026-11-19, in
`thread:01a1efe7-84fd-7623-8559-23a770f86ad8`: catch integration, test-maintenance,
build and runner failures together before submitting another candidate to CI.
This applies to new and replacement candidates, including test-only changes.

After the final base update, use the [affected test plan](affected-ci.md) to
identify the changed behavior, its consumers and the required runtime/build
profiles. Run cheap prerequisite and contract checks before builds and browser
journeys. Collect independent failures in one preflight and repair them as a
batch; a broken prerequisite must be repaired before dependent checks can run.
Keep the scope affected; this rule does not require a routine complete-suite run.

- **Server integration:** exercise affected handlers and their transitive imports
  in the deployed runtime mode. Server paths must load without browser-only
  authentication or browser globals. For native Node functions, verify the built
  module imports and startup as native modules; a bundled or TypeScript test can
  hide an invalid production import.
- **Test setup and maintenance:** run complete affected specs and helper consumers
  in every selected profile, including default/native variants. Check fixture IDs
  and schemas against their consumers, including True Node motion cases. Route
  reload tests to the intended API handlers, validate response type and payload,
  and wait for explicit article readiness before asserting rendered content.
  Inspect screenshots against the current approved UI and contact inventory;
  update an obsolete expectation only after verifying the intended behavior.
- **Build budgets:** build every affected hosted profile, including ordinary Web,
  authentication startup and standalone Studio where applicable, with the pinned
  CI toolchain and locked dependencies. Check the actual output against existing
  bundle limits using their recorded build profiles. Keep fixture-specific
  functional profiles separate from those measurement inputs. Even a two-byte
  excess in the applicable profile is a failure; a budget change needs its
  existing measured-cost approval rather than an automatic cap increase.
- **Runner and preview readiness:** validate the selected Playwright image and
  browser setup. For local checks, verify the actual launcher's Node architecture
  matches its native dependencies, including subprocesses launched by Python.
  Then start a fresh preview from this checkout's build. Verify the
  intended app and API are ready within the existing deadline before running
  dependent assertions. A listening port or an HTML response from an API URL is
  insufficient. Diagnose startup failures from their phase and logs before
  changing a timeout or submitting another head.
- **User journey:** complete the affected navigation, action and reload flow,
  including relevant loading/error/recovery states and complete article text.
  Apply the existing visual and content acceptance rules; preserve approved copy
  and assertions that protect it.

Before freezing, record the public candidate revision/tree, base, selected
checks/profiles, results and any justified non-applicable items. Keep private
inputs and raw QA evidence with the authorized worker. Preflight is complete only
when every selected check passes and no prerequisite or readiness gap remains.
Resolve all known preflight failures before the next CI-triggering push. After a
correction, rerun affected checks and their dependents, retaining valid evidence
for unchanged inputs. Freeze the corrected candidate once; every required hosted
gate must still pass on that exact head. Local preflight and the hosted build
preflight do not replace those gates or deployed production acceptance.

If a frozen, already-pushed head becomes admitted without any source update,
rerun its original pull-request workflows in full once after setting the actual
PR number. A failed-jobs-only rerun leaves the previously skipped scope planner
skipped and cannot validate the candidate. Reserve failed-job reruns for an
isolated failure after the planner and prerequisites completed, with unchanged
relevant inputs and repository policy permitting reuse. Preserve the first result.
Manual dispatch in these PR-validation workflows is limited to main. Candidate
validation uses pull-request runs; dispatch-only checks do not replace the
pull-request checks required by branch protection. Other manual publication and
calibration workflows retain their existing scopes and authorization rules.
The legacy Personal Transit source archive is now an explicit manual dispatch
on its original feature branch, rather than an automatic job on every push.

Run `node scripts/test-ci-release-admission.mjs` and
`ruby scripts/test-ci-workflow-syntax.rb` after changing admission or workflow
conditions. Neither scheduling nor cancellation waives an exact-head gate.
