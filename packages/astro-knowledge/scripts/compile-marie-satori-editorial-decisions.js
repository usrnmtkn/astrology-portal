#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const voiceRoot = path.join(packageRoot, "voice");
const editorialRoot = path.join(voiceRoot, "tldr-astro");
const sourcePath = path.join(editorialRoot, "marie-satori-editorial-decisions.yaml");
const relativeSourcePath = path.relative(packageRoot, sourcePath).replaceAll(path.sep, "/");
const generatedPaths = {
  writer: path.join(editorialRoot, "writer-policy.generated.json"),
  judge: path.join(editorialRoot, "judge-policy.generated.json"),
  linter: path.join(editorialRoot, "linter-policy.generated.json"),
  vocabulary: path.join(editorialRoot, "vocabulary-policy.generated.json"),
  regression: path.join(editorialRoot, "regression-cases.generated.json"),
  report: path.join(editorialRoot, "editorial-propagation-report.generated.md")
};

const TARGETS = ["writer", "judge", "linter", "vocabulary_retrieval"];
const STATUSES = new Set(["approved", "unresolved", "retired", "superseded"]);

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadDecisionSource() {
  const raw = fs.readFileSync(sourcePath, "utf8");
  let source;
  try {
    source = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Decision source must remain JSON-compatible YAML 1.2: ${error.message}`);
  }
  return { raw, source, sourceSha256: sha256(raw) };
}

function validateDecisionSource(source) {
  const errors = [];
  if (source.schema_version !== 1) errors.push("schema_version must be 1");
  if (!Array.isArray(source.decisions) || source.decisions.length === 0) errors.push("decisions must be a non-empty array");
  const ids = new Set();
  const regressionIds = new Set();
  for (const [index, decision] of (source.decisions || []).entries()) {
    const at = `decisions[${index}]`;
    for (const field of ["id", "status", "scope", "normalized_rule", "rationale", "owner_source", "effective_date", "supersedes", "examples_allowed", "examples_rejected", "enforcement"]) {
      if (!Object.hasOwn(decision, field)) errors.push(`${at}.${field} is required`);
    }
    if (!decision.id || !/^[A-Z]{2,4}-\d{3}$/u.test(decision.id)) errors.push(`${at}.id must be a stable uppercase ID`);
    if (ids.has(decision.id)) errors.push(`duplicate decision id ${decision.id}`);
    ids.add(decision.id);
    if (!STATUSES.has(decision.status)) errors.push(`${decision.id}: invalid status ${decision.status}`);
    if (decision.status === "approved" && !decision.effective_date) errors.push(`${decision.id}: approved decisions need effective_date`);
    if (!Array.isArray(decision.supersedes)) errors.push(`${decision.id}: supersedes must be an array`);
    if (!Array.isArray(decision.examples_allowed) || !Array.isArray(decision.examples_rejected)) errors.push(`${decision.id}: example fields must be arrays`);
    for (const target of TARGETS) {
      if (typeof decision.enforcement?.[target] !== "boolean") errors.push(`${decision.id}: enforcement.${target} must be boolean`);
    }
    if (!Array.isArray(decision.enforcement?.regression_tests)) errors.push(`${decision.id}: enforcement.regression_tests must be an array`);
    if (decision.status !== "approved" && TARGETS.some((target) => decision.enforcement?.[target] === true)) {
      errors.push(`${decision.id}: ${decision.status} decisions cannot be active in generated enforcement`);
    }
    const localRegressionIds = new Set((decision.regression_cases || []).map((entry) => entry.id));
    for (const id of decision.enforcement?.regression_tests || []) {
      if (!localRegressionIds.has(id)) errors.push(`${decision.id}: regression test ${id} has no case`);
    }
    for (const entry of decision.regression_cases || []) {
      if (!entry.id) errors.push(`${decision.id}: regression case id is required`);
      if (regressionIds.has(entry.id)) errors.push(`duplicate regression case id ${entry.id}`);
      regressionIds.add(entry.id);
    }
  }
  if (errors.length) throw new Error(`Editorial decision validation failed:\n- ${errors.join("\n- ")}`);
}

function scopeLabels(scope) {
  return [...(scope.surfaces || []), ...(scope.prohibited || []), ...(scope.conditional || [])];
}

function policyDecision(decision) {
  return {
    id: decision.id,
    category: decision.category,
    scope: decision.scope,
    rule: decision.normalized_rule,
    rationale: decision.rationale,
    effect: decision.effect,
    examplesAllowed: decision.examples_allowed,
    examplesRejected: decision.examples_rejected
  };
}

function firstCallDecision(decision) {
  return {
    id: decision.id,
    scope: decision.scope,
    rule: decision.normalized_rule
  };
}

function baseArtifact(kind, source, sourceSha256) {
  return {
    schemaVersion: 1,
    artifact: kind,
    generatedBy: "scripts/compile-marie-satori-editorial-decisions.js",
    decisionSource: relativeSourcePath,
    decisionSourceId: source.source_id,
    decisionSourceSha256: sourceSha256
  };
}

function compilePolicies(source, sourceSha256) {
  const active = source.decisions.filter((decision) => decision.status === "approved");
  const unresolved = source.decisions.filter((decision) => decision.status === "unresolved");
  const inactive = source.decisions.filter((decision) => ["retired", "superseded"].includes(decision.status));
  const forTarget = (target) => active.filter((decision) => decision.enforcement[target]);

  const writerDecisions = forTarget("writer");
  const writer = {
    ...baseArtifact("writer-policy", source, sourceSha256),
    architecture: [
      "Verified astrology supplies meaning.",
      "Sol writes one original draft.",
      "Deterministic checks catch hard violations.",
      "Terra judges the untouched draft afterward.",
      "Only the owner approves exact wording."
    ],
    firstCallAllowedInputs: ["surface contract", "verified astrology facts", "four to six exact owner-authored affinity passages", "up to two owner voice devices", "required output fields", "applicable universal hard constraints"],
    firstCallForbiddenInputs: ["rejected AI drafts", "assistant rewrites", "Terra commentary", "judge scores", "calibration reports", "governance reports", "approval metadata", "full negative-example inventory", "full owner-feedback audit"],
    firstCallConstraints: writerDecisions.filter((decision) => decision.writer_prompt_exposure === "first_call").map(firstCallDecision),
    compilerOnlyDecisions: writerDecisions.filter((decision) => decision.writer_prompt_exposure !== "first_call").map(policyDecision)
  };

  const judge = {
    ...baseArtifact("judge-policy", source, sourceSha256),
    role: "Classify and explain final acceptability of the untouched draft. Never rewrite, approve, or promote it.",
    compactRubric: [
      "Read-aloud rule: does every central sentence sound natural and literal when spoken?",
      "Morning-reader test: do the early sentences stay short, carry one idea each, and make sense on one tired read without reparsing?",
      "Does the draft name a recognizable pressure, action, and consequence?",
      "Is the subject matter supported by the verified astrology?",
      "Does the draft follow the applicable surface contract?",
      "Does it resemble the owner passages rather than generic astrology, institutional prose, therapy copy, corporate advice, or a polished slogan?",
      "Would any central sentence need to be translated into ordinary English?"
    ],
    decisions: forTarget("judge").map(policyDecision),
    prohibitedActions: ["rewrite the draft", "grant approval", "promote content", "treat calibration-only approval as writer evidence"]
  };

  const linterDecisions = forTarget("linter");
  const linter = {
    ...baseArtifact("linter-policy", source, sourceSha256),
    rules: linterDecisions.map((decision) => ({
      ...policyDecision(decision),
      mechanical: decision.mechanical || null
    })),
    nonMechanicalDecisions: linterDecisions.filter((decision) => !decision.mechanical).map((decision) => decision.id)
  };

  const vocabulary = {
    ...baseArtifact("vocabulary-policy", source, sourceSha256),
    decisions: forTarget("vocabulary_retrieval").map((decision) => ({
      ...policyDecision(decision),
      preferredExamples: decision.examples_allowed,
      excludedExamples: decision.examples_rejected
    })),
    exclusions: forTarget("vocabulary_retrieval").flatMap((decision) => (decision.vocabulary_exclusions || []).map((term) => ({
      term,
      decisionId: decision.id,
      scope: decision.scope
    }))),
    rule: "Vocabulary evidence is a menu, never a quota, and cannot override a surface rule."
  };

  const allCases = source.decisions.flatMap((decision) => (decision.regression_cases || []).map((entry) => ({
    ...entry,
    decisionId: decision.id,
    decisionStatus: decision.status,
    active: decision.status === "approved" && decision.enforcement.regression_tests.includes(entry.id)
  })));
  const regression = {
    ...baseArtifact("regression-cases", source, sourceSha256),
    cases: allCases,
    activeCaseCount: allCases.filter((entry) => entry.active).length,
    unresolvedCaseCount: allCases.filter((entry) => entry.decisionStatus === "unresolved").length
  };

  const artifacts = { writer, judge, linter, vocabulary, regression };
  verifyPropagation({ active, unresolved, inactive, artifacts });
  return { active, unresolved, inactive, artifacts };
}

function artifactIds(artifact) {
  return new Set([
    ...(artifact.decisions || []).map((entry) => entry.id),
    ...(artifact.rules || []).map((entry) => entry.id),
    ...(artifact.firstCallConstraints || []).map((entry) => entry.id),
    ...(artifact.compilerOnlyDecisions || []).map((entry) => entry.id)
  ]);
}

function verifyPropagation({ active, unresolved, inactive, artifacts }) {
  const errors = [];
  for (const [target, artifactName] of [["writer", "writer"], ["judge", "judge"], ["linter", "linter"], ["vocabulary_retrieval", "vocabulary"]]) {
    const ids = artifactIds(artifacts[artifactName]);
    for (const decision of active.filter((entry) => entry.enforcement[target])) {
      if (!ids.has(decision.id)) errors.push(`${decision.id} missing from generated ${artifactName} policy`);
    }
    for (const decision of [...unresolved, ...inactive]) {
      if (ids.has(decision.id)) errors.push(`${decision.id} (${decision.status}) leaked into active ${artifactName} policy`);
    }
  }
  const activeCases = new Set(artifacts.regression.cases.filter((entry) => entry.active).map((entry) => entry.id));
  for (const decision of active) {
    for (const id of decision.enforcement.regression_tests) {
      if (!activeCases.has(id)) errors.push(`${decision.id} regression ${id} missing from active regression artifact`);
    }
  }
  if (errors.length) throw new Error(`Editorial propagation verification failed:\n- ${errors.join("\n- ")}`);
}

function runtimeRuleInventory() {
  const rules = [];
  const placementPath = path.join(editorialRoot, "sky-placement.json");
  const placement = readJson(placementPath);
  for (const severity of ["fail", "warn"]) {
    for (const entry of placement.outputBans?.[severity] || []) {
      rules.push({ source: "voice/tldr-astro/sky-placement.json", selector: `outputBans.${severity}`, term: entry.term });
    }
  }
  for (const entry of placement.conditionalBans || []) {
    rules.push({ source: "voice/tldr-astro/sky-placement.json", selector: "conditionalBans", term: entry.term });
  }
  const bannedWords = readJson(path.join(voiceRoot, "banned-words.json")).bannedWords || [];
  for (const entry of bannedWords) rules.push({ source: "voice/banned-words.json", selector: "bannedWords", term: typeof entry === "string" ? entry : entry.term });
  const constructions = readJson(path.join(voiceRoot, "banned-constructions.json")).bannedConstructions || [];
  for (const entry of constructions) rules.push({ source: "voice/banned-constructions.json", selector: "bannedConstructions", term: entry.pattern || entry.term || entry.family || "[unnamed construction]" });
  return rules;
}

function traceRuntimeRules(source) {
  const active = source.decisions.filter((decision) => decision.status === "approved");
  const keys = new Map();
  for (const decision of active) {
    const candidates = [decision.mechanical?.pattern, ...(decision.mechanical?.terms || []), ...(decision.mechanical?.existing_terms || [])].filter(Boolean);
    for (const candidate of candidates) {
      const key = String(candidate).toLowerCase();
      if (!keys.has(key)) keys.set(key, new Set());
      keys.get(key).add(decision.id);
    }
  }
  return runtimeRuleInventory().map((entry) => ({ ...entry, tracedBy: [...(keys.get(String(entry.term).toLowerCase()) || [])] }));
}

function renderReport(source, sourceSha256, compiled) {
  const runtime = traceRuntimeRules(source);
  const untraced = runtime.filter((entry) => entry.tracedBy.length === 0);
  const lines = [
    "# Marie Satori editorial propagation report",
    "",
    `Decision source: \`${relativeSourcePath}\``,
    `Source SHA-256: \`${sourceSha256}\``,
    `Approved active decisions: ${compiled.active.length}`,
    `Unresolved decisions: ${compiled.unresolved.length}`,
    `Retired or superseded decisions: ${compiled.inactive.length}`,
    `Active regression cases: ${compiled.artifacts.regression.activeCaseCount}`,
    "",
    "## Generated artifacts",
    "",
    ...Object.entries(generatedPaths).filter(([name]) => name !== "report").map(([, filePath]) => `- \`${path.relative(packageRoot, filePath).replaceAll(path.sep, "/")}\``),
    "",
    "## Unresolved conflicts",
    "",
    ...(compiled.unresolved.length ? compiled.unresolved.map((entry) => `- \`${entry.id}\`: ${entry.normalized_rule}`) : ["- None."]),
    "",
    "## Retired and superseded records",
    "",
    ...(compiled.inactive.length ? compiled.inactive.map((entry) => `- \`${entry.id}\` (${entry.status})${entry.superseded_by ? ` → \`${entry.superseded_by}\`` : ""}: ${entry.normalized_rule}`) : ["- None."]),
    "",
    "## Runtime traceability",
    "",
    `Runtime rules inspected: ${runtime.length}`,
    `Traced to an approved authoritative decision: ${runtime.length - untraced.length}`,
    `Not yet traced to an approved authoritative decision: ${untraced.length}`,
    "",
    ...runtime.map((entry) => `- ${entry.tracedBy.length ? "TRACED" : "UNTRACED"} \`${entry.source}#${entry.selector}\` \`${entry.term}\`${entry.tracedBy.length ? ` ← ${entry.tracedBy.map((id) => `\`${id}\``).join(", ")}` : ""}`),
    "",
    "## Propagation invariants",
    "",
    "- Unresolved, retired, and superseded decisions are absent from every active generated policy.",
    "- Every approved decision marked for a target is present in that target's artifact.",
    "- Every active regression reference resolves to one generated case.",
    "- `--check` fails when a generated artifact is missing or differs from compiled output.",
    "- The owner-feedback audit is not a writer or judge prompt input."
  ];
  return lines.join("\n");
}

function compiledFiles() {
  const { raw, source, sourceSha256 } = loadDecisionSource();
  validateDecisionSource(source);
  const compiled = compilePolicies(source, sourceSha256);
  const files = new Map([
    [generatedPaths.writer, stableJson(compiled.artifacts.writer)],
    [generatedPaths.judge, stableJson(compiled.artifacts.judge)],
    [generatedPaths.linter, stableJson(compiled.artifacts.linter)],
    [generatedPaths.vocabulary, stableJson(compiled.artifacts.vocabulary)],
    [generatedPaths.regression, stableJson(compiled.artifacts.regression)],
    [generatedPaths.report, `${renderReport(source, sourceSha256, compiled)}\n`]
  ]);
  return { raw, source, sourceSha256, compiled, files };
}

function writeOrCheck({ check = false } = {}) {
  const result = compiledFiles();
  const stale = [];
  for (const [filePath, content] of result.files) {
    if (check) {
      if (!fs.existsSync(filePath) || fs.readFileSync(filePath, "utf8") !== content) stale.push(path.relative(packageRoot, filePath));
    } else {
      fs.writeFileSync(filePath, content);
    }
  }
  if (stale.length) throw new Error(`Generated editorial policy is stale:\n- ${stale.join("\n- ")}\nRun npm run build:marie-editorial-policy.`);
  return result;
}

function main() {
  const check = process.argv.includes("--check");
  const result = writeOrCheck({ check });
  const verb = check ? "Verified" : "Generated";
  console.log(`${verb} Marie Satori editorial policy (${result.compiled.active.length} active, ${result.compiled.unresolved.length} unresolved, ${result.compiled.artifacts.regression.activeCaseCount} active regressions).`);
}

module.exports = { compilePolicies, compiledFiles, generatedPaths, loadDecisionSource, sourcePath, validateDecisionSource, verifyPropagation, writeOrCheck };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
