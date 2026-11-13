# Affected API and browser checks

The owner requested affected tests on 2026-11-12 to avoid routine complete-suite
reruns. The existing `content-studio-api`, `browser-release-gate` and
`project-privacy` requirements remain in place. Privacy workflows, ruleset,
permissions and bypass settings are unchanged.

## Selection

Both API and browser workflows always report their aggregate checks. Each first
checks out its tested revision, installs its own locked dependencies and verifies
the selector/runner contracts. The plan records the exact head, base, changed
paths, selected API commands, database contracts, browser specs and browser jobs.

PR selection uses the merge base with the PR base. Main pushes use their before
and after commits. Renames are represented as removal plus addition. A manual
dispatch uses the previous commit when no explicit base is supplied. Invalid or
unavailable revision evidence fails selection. It cannot authorize a skipped gate.

API selection follows imports, re-exports, literal worker/fixture paths, nested
npm test scripts and referenced publication migrations. The complete API npm
script remains the command catalog; existing source-only preview API contracts
are also eligible. Selection runs at command granularity. A changed test-only
browser file does not select API tests. Shared styling selects browser surfaces
without selecting API commands. Publication/concurrency, weekly database
and variable contracts are included when their dependencies change.

Browser selection runs at spec granularity. Changed specs select their existing
workflow destinations; dependent helpers select their consumers. Studio source
changes select Studio surfaces, with explicit Natal source ownership for its
previews. Shared or unclassified runtime dependencies conservatively select the
complete affected catalog and record the reason. Dependency and build changes
can therefore affect many tests; that is distinct from running every suite for
a test-only edit. Unchanged runtime code in a CI-policy-only PR needs only the
selector/runner and workflow contracts, plus the ordinary privacy gate.

Use `node scripts/ci-affected-tests.mjs --json` with `PR_BASE_SHA` (or
`AFFECTED_BASE_SHA`) and `HEAD_SHA` to inspect a committed candidate's plan.
The normal CI invocation writes the same plan to job outputs and logs counts.
Local affected execution uses this plan as `CI_AFFECTED_TEST_PLAN`; runners verify
its head against the checkout and reject unknown commands or malformed paths.
Selected API commands retain their knowledge prerequisite. Browser jobs retain
their existing fresh builds/previews, timeouts, assertions and worker limits.

## Execution and merge proof

API matrix jobs run only the planned nonempty shards and selected native database
contracts. The required API gate verifies that selection succeeded and every
planned shard passed. A skipped matrix is accepted only for a validated empty
API plan. It cannot conceal a missing, failed, cancelled or skipped selected shard.

Browser jobs run only when the plan assigns them affected specs. The runner
discovers actual Playwright identities, verifies the complete selected test list
before sharding, and preserves each command's config, project, grep and shard
arguments. Balanced suites keep their original grouping and prove the complete
selected union without duplicates. Empty shard/suite selections are reported
explicitly; they do not start a preview. Selected tests still propagate failure.
The aggregate rejects a selected job that is missing, failed, cancelled or skipped.

The unchanged browser-coverage audit retains every registered suite's workflow
destination. `test-ci-workflow-syntax.rb` checks selection and gate wiring as well
as valid YAML. `test-ci-affected-tests.mjs` exercises real child API execution,
actual Playwright selection/sharding and failure propagation with neutral fixtures
and no application browser, protected input or live service. Earlier test-list
path failures were retained locally; exact-list verification caught the empty
selection before it could become release evidence.

An affected gate proves the recorded selection on its tested revision. Record
that scope in the PR and preserve earlier failures. The complete
`npm run test:content-studio-api` remains available for an explicitly requested
manual audit. A passing focused run is not described as a complete-suite pass.
