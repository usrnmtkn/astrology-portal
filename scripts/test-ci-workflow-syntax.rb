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
end
puts "PASS #{files.length} workflow YAML documents and condition integrity"
