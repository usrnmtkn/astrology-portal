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

1. The coordinator records the queue and keeps other candidates frozen.
2. After the preceding main deployment passes its affected production acceptance
   and required main workflows finish successfully, set `RELEASE_ACTIVE_PR`
   with `gh variable set RELEASE_ACTIVE_PR --repo usrnmtkn/astrology-portal
   --body candidate-number`. Supply the actual PR number explicitly so the command
   runs noninteractively.
   The variable is scheduling state, not a secret or content approval.
3. The admitted owner updates once onto current main, regenerates affected
   artifacts, completes the scoped preflight below, then freezes the final head
   before pushing. Existing unmerged source work remains with its implementation
   owner.
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
  browser setup, then start a fresh preview from this checkout's build. Verify the
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
rerun its original pull-request workflow runs once after setting the variable.
Manual dispatch in these PR-validation workflows is limited to main. Candidate
validation uses pull-request runs; dispatch-only checks do not replace the
pull-request checks required by branch protection. Other manual publication and
calibration workflows retain their existing scopes and authorization rules.
The legacy Personal Transit source archive is now an explicit manual dispatch
on its original feature branch, rather than an automatic job on every push.

Run `node scripts/test-ci-release-admission.mjs` and
`ruby scripts/test-ci-workflow-syntax.rb` after changing admission or workflow
conditions. Neither scheduling nor cancellation waives an exact-head gate.
