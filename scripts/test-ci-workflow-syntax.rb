require 'yaml'
require 'date'

# Parse real YAML before inspecting expressions. This catches truncation at an
# unquoted hash, which a grep over the raw file cannot detect reliably.
def validate(value, location)
  case value
  when Hash
    value.each do |key, child|
      if key == 'if'
        raise "#{location}: non-string condition" unless child.is_a?(String)
        raise "#{location}: merge text cannot stand in for verified CI" if child.include?('head_commit.message') && child.include?('Merge PR')
        raise "#{location}: incomplete expression" unless child.scan('${{').size == child.scan('}}').size
        # GitHub expressions use single-quoted literals; doubled quotes escape.
        raise "#{location}: unterminated condition string" unless child.gsub("''", '').count("'").even?
      end
      validate(child, "#{location}.#{key}")
    end
  when Array
    value.each_with_index { |child, index| validate(child, "#{location}[#{index}]") }
  end
end

files = Dir['.github/workflows/*.{yml,yaml}'].sort
raise 'No workflows found' if files.empty?
files.each do |file|
  workflow = YAML.safe_load(File.read(file), permitted_classes: [Date, Time], aliases: true)
  raise "#{file}: expected workflow mapping" unless workflow.is_a?(Hash)
  validate(workflow, file)
  if file.end_with?('/content-studio-api.yml')
    jobs = workflow.fetch('jobs')
    matrix = jobs.fetch('content-studio-api-contracts')
    gate = jobs.fetch('content-studio-api')
    triggers = workflow['on'] || workflow[true]
    raise 'API coverage must stay unfiltered on every pull request' unless triggers.key?('pull_request') && triggers['pull_request'].nil?
    raise 'API selection must be required' unless jobs.fetch('scope').fetch('steps').any? { |step| step['run'] == 'node scripts/ci-affected-tests.mjs' }
    raise 'API shards must be controlled by selection' unless matrix.fetch('needs') == 'scope' && matrix.fetch('if') == "needs.scope.outputs.api_needed == 'true'"
    raise 'Selected API shards cannot ignore errors' if matrix.key?('continue-on-error')
    raise 'API matrix must execute the complete selected shard set' unless matrix.fetch('strategy').fetch('matrix').fetch('shard') == '${{ fromJSON(needs.scope.outputs.api_shards) }}'
    raise 'A failing API shard must not cancel peer evidence' unless matrix.fetch('strategy')['fail-fast'] == false
    raise 'API matrix must keep its existing bounded timeout' unless matrix.fetch('timeout-minutes') == 35
    raise 'Required API gate must depend on every contract shard' unless gate.fetch('needs') == ['scope', 'content-studio-api-contracts']
    raise 'Required API gate must inspect failed peers' unless gate.fetch('if') == '${{ !cancelled() }}'
    raise 'Required API gate must validate selection and matrix result' unless gate.fetch('steps').any? { |step| step['run'] == 'node scripts/check-affected-api-gate.mjs' && step.fetch('env', {})['API_SCOPE_RESULT'] == '${{ needs.scope.result }}' && step.fetch('env', {})['API_MATRIX_RESULT'] == '${{ needs.content-studio-api-contracts.result }}' }
    raise 'Every API shard must run its full knowledge prerequisite' unless matrix.fetch('steps').any? { |step| step['run'] == 'npm run pretest:content-studio-api && node scripts/run-content-studio-api-shard.mjs --shard ${{ matrix.shard }}' && !step.key?('if') }
    raise 'Every API shard must test the exact PR head' unless matrix.fetch('steps').any? { |step| step['uses'] == 'actions/checkout@v6' && step.fetch('with', {})['ref'] == '${{ github.event.pull_request.head.sha || github.sha }}' }
    { 'node scripts/test-content-studio-publication-concurrency.mjs' => 'postgres', 'node scripts/test-weekly-checkpoint-postgres.mjs' => 'weeklyPostgres', 'npm run test:studio-variables' => 'variables' }.each do |command, flag|
      raise 'Selected database and variable contracts must remain required' unless matrix.fetch('steps').any? { |step| step['run'] == command && step['if'] == "matrix.shard == 1 && fromJSON(needs.scope.outputs.test_plan).#{flag}" && !step.key?('continue-on-error') }
    end
  end
  if file.end_with?('/visual-smoke.yml')
    jobs = workflow.fetch('jobs')
    gate = jobs.fetch('browser-release-gate')
    raise 'Browser gate must depend on every job, including matrices' unless gate.fetch('needs').sort == (jobs.keys - ['browser-release-gate']).sort
    raise 'Browser gate must inspect failures without blocking workflow cancellation' unless gate.fetch('if') == '${{ !cancelled() }}'
    admin = jobs.fetch('studio-admin-flows')
    raise 'Studio admin coverage must retain all six shards' unless admin.fetch('strategy').fetch('matrix').fetch('shard') == [1, 2, 3, 4, 5, 6]
    raise 'Studio admin deadline must remain bounded' unless admin.fetch('timeout-minutes') == 25
    raise 'Studio admin must run one worker per complete shard' unless admin.fetch('steps').any? { |step| step.fetch('run', '') == 'node scripts/balanced-browser-tests.mjs --config playwright.studio-admin-flows.config.ts ${{ matrix.shard }}/6' }
    reader = jobs.fetch('reader-surface-suites')
    overlays = jobs.fetch('reader-overlays')
    [reader, overlays].each do |job|
      raise 'Reader and overlay coverage must retain all three shards' unless job.fetch('strategy').fetch('matrix').fetch('shard') == [1, 2, 3]
      raise 'Reader job budgets must remain bounded' unless job.fetch('timeout-minutes') == 30
    end
    overlay_command = 'tests/visual/overlay-viewport.spec.ts'
    raise 'Overlay checks must run independently of reader shards' if reader.fetch('steps').any? { |step| step.fetch('run', '').include?(overlay_command) }
    raise 'Overlay job must execute its full viewport suite' unless overlays.fetch('steps').any? { |step| step.fetch('run', '').include?(overlay_command) && step['run'].include?('--shard=${{ matrix.shard }}/3') }
    (jobs.keys - ['scope','browser-release-gate']).each do |name|
      job=jobs.fetch(name)
      raise "#{name}: affected selector missing" unless job.fetch('if') == "needs.scope.outputs.#{name.tr('-', '_')} == 'true'"
      raise "#{name}: revision-bound plan missing" unless job.fetch('env', {})['CI_AFFECTED_TEST_PLAN'] == '${{ needs.scope.outputs.test_plan }}'
      raise "#{name}: browser command bypasses affected selection" if job.fetch('steps').any? { |step| step.fetch('run', '').include?('npx playwright test') }
    end
    triggers = workflow['on'] || workflow[true] # YAML 1.1 parses on as true.
    raise 'Required browser gate must report on every pull request' unless triggers.key?('pull_request') && triggers['pull_request'].nil?
  end
end
puts "PASS #{files.length} workflow YAML documents and condition integrity"
