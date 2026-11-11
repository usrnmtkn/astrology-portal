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
    raise 'No API shard may be optional' if matrix.key?('if') || matrix.key?('continue-on-error')
    raise 'API matrix must retain all three complete shards' unless matrix.fetch('strategy').fetch('matrix').fetch('shard') == [1, 2, 3]
    raise 'A failing API shard must not cancel peer evidence' unless matrix.fetch('strategy')['fail-fast'] == false
    raise 'API matrix must keep its existing bounded timeout' unless matrix.fetch('timeout-minutes') == 35
    raise 'Required API gate must depend on every contract shard' unless gate.fetch('needs') == 'content-studio-api-contracts'
    raise 'Required API gate must inspect failed peers' unless gate.fetch('if') == '${{ !cancelled() }}'
    raise 'Required API gate cannot admit a failed or skipped shard' unless gate.fetch('steps').any? { |step| step['run'] == 'test "$API_CONTRACT_RESULT" = success' && step.fetch('env', {})['API_CONTRACT_RESULT'] == '${{ needs.content-studio-api-contracts.result }}' }
    raise 'Every API shard must run its full knowledge prerequisite' unless matrix.fetch('steps').any? { |step| step['run'] == 'npm run pretest:content-studio-api && node scripts/run-content-studio-api-shard.mjs --shard ${{ matrix.shard }}' && !step.key?('if') }
    raise 'Every API shard must test the exact PR head' unless matrix.fetch('steps').any? { |step| step['uses'] == 'actions/checkout@v6' && step.fetch('with', {})['ref'] == '${{ github.event.pull_request.head.sha || github.sha }}' }
    ['node scripts/test-content-studio-publication-concurrency.mjs', 'node scripts/test-weekly-checkpoint-postgres.mjs', 'npm run test:studio-variables'].each do |command|
      raise 'Existing database and variable contracts must remain required' unless matrix.fetch('steps').any? { |step| step['run'] == command && step['if'] == 'matrix.shard == 1' && !step.key?('continue-on-error') }
    end
  end
  if file.end_with?('/visual-smoke.yml')
    jobs = workflow.fetch('jobs')
    gate = jobs.fetch('browser-release-gate')
    raise 'Browser gate must depend on every job, including matrices' unless gate.fetch('needs').sort == (jobs.keys - ['browser-release-gate']).sort
    raise 'Browser gate must inspect failures without blocking workflow cancellation' unless gate.fetch('if') == '${{ !cancelled() }}'
    reader = jobs.fetch('reader-surface-suites')
    overlays = jobs.fetch('reader-overlays')
    [reader, overlays].each do |job|
      raise 'Reader and overlay coverage must retain all three shards' unless job.fetch('strategy').fetch('matrix').fetch('shard') == [1, 2, 3]
      raise 'Reader job budgets must remain bounded' unless job.fetch('timeout-minutes') == 30
    end
    overlay_command = 'tests/visual/overlay-viewport.spec.ts'
    raise 'Overlay checks must run independently of reader shards' if reader.fetch('steps').any? { |step| step.fetch('run', '').include?(overlay_command) }
    raise 'Overlay job must execute its full viewport suite' unless overlays.fetch('steps').any? { |step| step.fetch('run', '').include?(overlay_command) && step['run'].include?('--shard=${{ matrix.shard }}/3') }
    triggers = workflow['on'] || workflow[true] # YAML 1.1 parses on as true.
    raise 'Required browser gate must report on every pull request' unless triggers.key?('pull_request') && triggers['pull_request'].nil?
  end
end
puts "PASS #{files.length} workflow YAML documents and condition integrity"
