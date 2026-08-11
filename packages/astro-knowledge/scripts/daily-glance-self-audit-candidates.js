"use strict";

const fs = require("fs");
const path = require("path");
const {
  applyLintTiers,
  blockingChecksPassed,
  lintOutput,
  lintTierForRule,
  outputBanRules,
  packetLint,
  renderModelInput,
  sha256,
  wordCount
} = require("./daily-glance-writer-runtime.js");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

function sentences(value) {
  return (String(value).match(/[^.!?]+[.!?]+(?:["'”’])?|[^.!?]+$/gu) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function loadDirective(config) {
  const sourcePath = path.join(repoRoot, config.selfAuditDirectivePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const marker = "\n---\n\n## Pipeline notes (not part of Sol's packet)";
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`Self-audit directive is missing its pipeline-notes boundary: ${config.selfAuditDirectivePath}`);
  return source.slice(0, index).trim();
}

function approvedGoodExamples(key, sourceRows, limit = 3) {
  const group = key.split("/")[0];
  const pairs = new Map();
  for (const row of sourceRows.hookRows || []) {
    const match = row.contentKey.match(/^fallback-hook\/daily-(headline|body)\/(.+)$/u);
    if (!match) continue;
    const [, kind, rowKey] = match;
    const pair = pairs.get(rowKey) || { key: rowKey };
    pair[kind] = row.body_you;
    pair[`${kind}Status`] = row.review_status;
    pair[`${kind}SourceId`] = row.contentKey;
    pairs.set(rowKey, pair);
  }
  const examples = [...pairs.values()]
    .filter((pair) => pair.key !== key
      && pair.key.split("/")[0] === group
      && pair.headlineStatus === "approved"
      && pair.bodyStatus === "approved"
      && pair.headline
      && pair.body)
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(0, limit);
  if (examples.length !== limit) throw new Error(`Expected ${limit} approved same-group examples for ${key}; found ${examples.length}.`);
  return examples;
}

function transitMechanism(packet) {
  const facts = packet.verifiedAstrology.map((fact) => String(fact.text).trim()).filter(Boolean).join(" ");
  return `${String(packet.target.groupGuidance).trim()} Verified astrology boundary: ${facts}`;
}

function deterministicLintRules(packet, config) {
  const fixed = [
    { id: "SOL-DIRECTIVE-output-schema", rule: "Return strict JSON with exactly transit_key, headline, body, screenshot_line, and portability_check; transit_key must equal the requested key and every value must be a non-empty string." },
    { id: "SOL-DIRECTIVE-headline", rule: "Headline is one declarative sentence, ends with a period, contains 4–12 words, contains no question or exclamation mark, and is not a Notice/Allow/Pay attention command." },
    { id: "SOL-DIRECTIVE-body-length", rule: "Body contains 50–90 words in 3–5 sentences." },
    { id: "SOL-DIRECTIVE-body-register", rule: "Body uses second person and does not repeat the complete headline." },
    { id: "SOL-DIRECTIVE-one-situation", rule: "Use one concrete situation; stacked interchangeable examples and menu constructions are prohibited." },
    { id: "SOL-DIRECTIVE-formula", rule: "Do not open with a rhetorical question, Notice when, or Pay attention to; do not use the scene → diagnosis → permission → instruction template." },
    { id: "SOL-DIRECTIVE-hedging", rule: "Use may, might, and perhaps at most once in total; never use ironically or usually; do not assert another person's hidden intent." },
    { id: "SOL-DIRECTIVE-screenshot", rule: "screenshot_line must be exactly one complete sentence copied verbatim from the body." },
    { id: "SOL-DIRECTIVE-portability", rule: "portability_check must be one sentence of at least five words explaining why the copy fits only this transit key." }
  ];
  const governed = [
    ...packet.styleMarkers.map((entry) => ({ id: entry.id, rule: entry.rule })),
    ...packet.dailyRules.map((entry) => ({ id: entry.id, rule: entry.rule })),
    ...packet.batch1LintGuidance.map((entry) => ({ id: entry.id, rule: entry.rule })),
    ...packet.ownerFinalTests.map((entry) => ({ id: entry.id, rule: entry.rule }))
  ];
  const bans = outputBanRules(config).map((entry, index) => ({
    id: `${entry.id}-BAN-${index + 1}`,
    rule: `The literal/regex output ban ${JSON.stringify(entry.term)} must not match. Reason: ${entry.reason}`
  }));
  return [...fixed, ...governed, ...bans].map((entry) => ({
    ...entry,
    tier: lintTierForRule(entry.id)
  }));
}

function renderExamples(examples) {
  return examples.map((example, index) => [
    `### Approved same-group card ${index + 1}: ${example.key}`,
    `Headline source ID: ${example.headlineSourceId}`,
    example.headline,
    `Body source ID: ${example.bodySourceId}`,
    example.body
  ].join("\n")).join("\n\n");
}

function renderSelfAuditWriterInput(packet, config, examples) {
  const directive = loadDirective(config);
  const rules = deterministicLintRules(packet, config).map((entry) => `- [${entry.tier.toUpperCase()}] ${entry.id}: ${entry.rule}`).join("\n");
  let modelInput = directive
    .replace("- `{{TRANSIT_KEY}}` — e.g. `square/uranus`, `house/8`", `### Transit key\n${packet.target.key}`)
    .replace("- `{{TRANSIT_MECHANISM}}` — one-paragraph description of what this transit specifically does", `### Transit mechanism\n${transitMechanism(packet)}`)
    .replace("- `{{GOOD_EXAMPLES}}` — owner-approved cards. Match their register exactly.", `### Good examples\n${renderExamples(examples)}`)
    .replace("- `{{LINT_RULES}}` — the deterministic lint spec, verbatim. Blocking failures discard the candidate; advisory failures are reported without blocking it.", `### Deterministic lint rules (blocking gates and advisory diagnostics)\n${rules}`);
  modelInput = modelInput.split("{{TRANSIT_KEY}}").join(packet.target.key);
  modelInput = modelInput.split("{{TRANSIT_MECHANISM}}").join("the transit mechanism supplied above");
  modelInput = modelInput.split("{{GOOD_EXAMPLES}}").join("the approved examples supplied above");
  modelInput = modelInput.split("{{LINT_RULES}}").join("the deterministic lint spec supplied above");
  if (/\{\{[A-Z_]+\}\}/u.test(modelInput)) throw new Error(`Unresolved self-audit directive placeholder for ${packet.target.key}.`);
  return modelInput;
}

function selfAuditPacketLint(packet, modelInput, config, examples, currentPair = null) {
  const canonical = packetLint(packet, renderModelInput(packet), config);
  const checks = [
    { id: "canonical-packet-preflight", passed: canonical.passed, details: canonical.checks.filter((check) => !check.passed) },
    { id: "owner-directive-loaded", passed: modelInput.startsWith("# Sol writing directive — daily-glance candidate (one per call)"), details: config.selfAuditDirectivePath },
    { id: "pipeline-notes-excluded", passed: !modelInput.includes("Pipeline notes") && !modelInput.includes("Best-of-three ="), details: "Non-prompt pipeline notes are absent." },
    { id: "one-candidate-contract", passed: modelInput.includes("Write exactly one candidate") && !modelInput.includes("Write 3 candidates"), details: "One candidate per independent call." },
    { id: "exact-output-schema", passed: modelInput.includes('"transit_key"') && modelInput.includes('"screenshot_line"') && modelInput.includes('"portability_check"'), details: "Five-field owner schema included." },
    { id: "same-group-approved-examples", passed: examples.length === 3 && examples.every((entry) => entry.key !== packet.target.key && entry.key.split("/")[0] === packet.target.key.split("/")[0] && entry.headlineStatus === "approved" && entry.bodyStatus === "approved"), details: examples.map((entry) => entry.key) },
    { id: "no-unresolved-placeholders", passed: !/\{\{[A-Z_]+\}\}/u.test(modelInput), details: "All directive inputs resolved." },
    { id: "deterministic-lint-spec", passed: deterministicLintRules(packet, config).every((entry) => modelInput.includes(`- [${entry.tier.toUpperCase()}] ${entry.id}: ${entry.rule}`)), details: `${deterministicLintRules(packet, config).length} exact tiered lint rules included.` },
    { id: "no-current-serving-copy", passed: !currentPair || (!modelInput.includes(currentPair.headline) && !modelInput.includes(currentPair.body)), details: currentPair ? "Target's current headline and body are absent." : "No current pair supplied for this check." },
    { id: "no-audit-or-rejection-input", passed: !/judge why|judge report|rejected (?:copy|example|prose)|current copy/iu.test(modelInput), details: "No audit rationale, rejected prose, or current copy included." }
  ];
  return {
    schemaVersion: 1,
    key: packet.target.key,
    passed: checks.every((check) => check.passed),
    checks,
    canonicalPacketLint: canonical,
    modelInputSha256: sha256(modelInput),
    rulesSha256: sha256(JSON.stringify(deterministicLintRules(packet, config)))
  };
}

function parseSelfAuditCandidate(raw, expectedKey) {
  const clean = String(raw || "").trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const value = JSON.parse(clean);
  const expectedFields = "body|headline|portability_check|screenshot_line|transit_key";
  if (Object.keys(value).sort().join("|") !== expectedFields) throw new Error(`Output must contain exactly ${expectedFields}.`);
  if (Object.values(value).some((entry) => typeof entry !== "string" || !entry.trim())) throw new Error("Every output field must be a non-empty string.");
  if (value.transit_key !== expectedKey) throw new Error(`Output transit_key ${JSON.stringify(value.transit_key)} does not match ${JSON.stringify(expectedKey)}.`);
  return value;
}

function lintSelfAuditCandidate(candidate, key, config) {
  const base = lintOutput({ headline: candidate.headline, body: candidate.body }, key, config);
  const headlineSentences = sentences(candidate.headline);
  const bodySentences = sentences(candidate.body);
  const hedgeCount = (candidate.body.match(/\b(?:may|might|perhaps)\b/giu) || []).length;
  const screenshotSentences = sentences(candidate.screenshot_line);
  const portabilitySentences = sentences(candidate.portability_check);
  const stackedExamples = sentences(candidate.body).filter((sentence) => /^(?:An?|Your|Someone|A friend|A coworker|A partner)\b/iu.test(sentence)).length >= 3;
  const checks = applyLintTiers([
    ...base.checks,
    { id: "SOL-DIRECTIVE-output-schema", passed: candidate.transit_key === key, details: candidate.transit_key },
    { id: "SOL-DIRECTIVE-headline", passed: headlineSentences.length === 1 && candidate.headline.endsWith(".") && wordCount(candidate.headline) >= 4 && wordCount(candidate.headline) <= 12 && !/[?!]/u.test(candidate.headline) && !/^(?:Notice|Allow|Pay attention)\b/iu.test(candidate.headline), details: `${wordCount(candidate.headline)} words; ${headlineSentences.length} sentence(s)` },
    { id: "SOL-DIRECTIVE-body-length", passed: wordCount(candidate.body) >= 50 && wordCount(candidate.body) <= 90 && bodySentences.length >= 3 && bodySentences.length <= 5, details: `${wordCount(candidate.body)} words; ${bodySentences.length} sentences` },
    { id: "SOL-DIRECTIVE-body-register", passed: /\byou(?:r|rs|rself)?\b/iu.test(candidate.body), details: /\byou(?:r|rs|rself)?\b/iu.test(candidate.body) ? "Second-person register present." : "Second-person register absent." },
    { id: "SOL-DIRECTIVE-one-situation", passed: !stackedExamples && !/\b(?:for example|another example|or maybe)\b/iu.test(candidate.body), details: stackedExamples ? "Stacked example-like sentence openers detected." : "No mechanical menu-of-scenes pattern detected." },
    { id: "SOL-DIRECTIVE-formula", passed: !/^\s*(?:Notice when|Pay attention to)\b/iu.test(candidate.body) && !/^\s*[^.!?]*\?/u.test(candidate.body), details: "No prohibited opener detected." },
    { id: "SOL-DIRECTIVE-hedging", passed: hedgeCount <= 1 && !/\b(?:ironically|usually)\b/iu.test(candidate.body) && !/\bjust enough to keep you from leaving\b/iu.test(candidate.body), details: `${hedgeCount} may/might/perhaps usage(s)` },
    { id: "SOL-DIRECTIVE-screenshot", passed: screenshotSentences.length === 1 && candidate.body.includes(candidate.screenshot_line.trim()), details: screenshotSentences.length === 1 && candidate.body.includes(candidate.screenshot_line.trim()) ? "Exact body sentence supplied." : "screenshot_line is not one exact body sentence." },
    { id: "SOL-DIRECTIVE-portability", passed: portabilitySentences.length === 1 && wordCount(candidate.portability_check) >= 5, details: `${wordCount(candidate.portability_check)} words; ${portabilitySentences.length} sentence(s)` }
  ]);
  return {
    ...base,
    passed: blockingChecksPassed(checks),
    allChecksPassed: checks.every((check) => check.passed),
    checks,
    directiveCounts: { hedgeCount, screenshotSentences: screenshotSentences.length, portabilitySentences: portabilitySentences.length }
  };
}

function selectLintCleanWinner(candidates, operatingMode, compare) {
  const eligible = candidates.filter((entry) => entry.candidate && entry.lint?.passed && !entry.judge?.skipped);
  return eligible.length ? eligible.slice().sort((left, right) => compare(left, right, operatingMode))[0] : null;
}

module.exports = {
  approvedGoodExamples,
  deterministicLintRules,
  lintSelfAuditCandidate,
  loadDirective,
  parseSelfAuditCandidate,
  renderSelfAuditWriterInput,
  selectLintCleanWinner,
  selfAuditPacketLint,
  transitMechanism
};
