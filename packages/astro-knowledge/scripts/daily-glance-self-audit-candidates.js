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
const { renderEffectiveRulesForPrompt } = require("../../../src/astro-writing/effectiveRules.cjs");

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
  const marker = "\n---\n\n## Pipeline notes";
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`Self-audit directive is missing its pipeline-notes boundary: ${config.selfAuditDirectivePath}`);
  return source.slice(0, index).trim();
}

const correctionSources = [
  "data/writing/OWNER_CORRECTIONS.jsonl",
  "data/writing/owner-corrections.jsonl",
  "data/writing/owner-feedback-corpus.jsonl"
];

function words(value) {
  return new Set(String(value ?? "").toLowerCase().match(/[a-z][a-z'-]{2,}/gu) || []);
}

function overlapScore(left, right) {
  const rightWords = words(right);
  let matches = 0;
  for (const word of words(left)) if (rightWords.has(word)) matches += 1;
  return matches;
}

function latestApprovalDate(notes) {
  return (String(notes ?? "").match(/20\d{2}-\d{2}-\d{2}/gu) || []).sort().at(-1) || "0000-00-00";
}

function dailyPairs(sourceRows) {
  const pairs = new Map();
  for (const row of sourceRows.hookRows || []) {
    const match = row.contentKey.match(/^fallback-hook\/daily-(headline|body)\/(.+)$/u);
    if (!match) continue;
    const [, kind, rowKey] = match;
    const pair = pairs.get(rowKey) || { key: rowKey };
    pair[kind] = row.body_you;
    pair[`${kind}Status`] = row.review_status;
    pair[`${kind}SourceId`] = row.contentKey;
    pair[`${kind}Notes`] = row.notes || "";
    pairs.set(rowKey, pair);
  }
  return [...pairs.values()].filter((pair) => pair.headlineStatus === "approved"
      && pair.bodyStatus === "approved"
      && pair.headline
      && pair.body);
}

function rankedOwnerCorrections(key, sourceRows, limit = 6) {
  const target = dailyPairs(sourceRows).find((pair) => pair.key === key);
  const [group, subject] = key.split("/");
  const query = `${key} ${target?.headline || ""} ${target?.body || ""}`;
  const deduplicated = new Map();
  for (const sourcePath of correctionSources) {
    const rows = fs.readFileSync(path.join(repoRoot, sourcePath), "utf8").split(/\n/u).filter(Boolean).map(JSON.parse);
    rows.forEach((row, sourceIndex) => {
      const normalizedBad = String(row.bad ?? row.before ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
      if (!normalizedBad) return;
      const candidate = { ...row, sourcePath, sourceIndex };
      const existing = deduplicated.get(normalizedBad);
      if (!existing || sourcePath === "data/writing/owner-feedback-corpus.jsonl") deduplicated.set(normalizedBad, candidate);
    });
  }
  return [...deduplicated.values()].map((entry) => {
    const family = String(entry.family || "");
    const exactSurface = /daily-glance|daily-horoscope/iu.test(family);
    const adjacentHouse = group === "house" && family === "house-horoscope-core";
    const subjectMatch = subject && new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu").test(`${entry.bad || ""} ${entry.corrected || ""} ${entry.why || entry.owner_reason || ""}`);
    const lexicalOverlap = overlapScore(query, `${entry.bad || ""} ${entry.corrected || ""} ${entry.why || entry.owner_reason || ""}`);
    const decisionDate = latestApprovalDate(JSON.stringify(entry));
    const score = (exactSurface ? 120 : 0) + (adjacentHouse ? 90 : 0) + (subjectMatch ? 45 : 0) + Math.min(40, lexicalOverlap * 4) + (decisionDate >= "2026-08-08" ? 10 : 0) + Math.min(9, entry.sourceIndex / 10);
    return {
      ...entry,
      sourceId: `${entry.sourcePath}#L${entry.sourceIndex + 1}`,
      decisionDate,
      ranking: { score, exactSurface, adjacentHouse, subjectMatch, lexicalOverlap, decisionDate, sourceRecencyOrder: entry.sourceIndex }
    };
  }).sort((left, right) => right.ranking.score - left.ranking.score
      || right.decisionDate.localeCompare(left.decisionDate)
      || right.ranking.sourceRecencyOrder - left.ranking.sourceRecencyOrder
      || left.sourcePath.localeCompare(right.sourcePath))
    .slice(0, limit);
}

function approvedGoodExamples(key, sourceRows, limit = 3) {
  const [group, subject] = key.split("/");
  const pairs = dailyPairs(sourceRows);
  const target = pairs.find((pair) => pair.key === key);
  const query = `${target?.headline || ""} ${target?.body || ""}`;
  const ranked = pairs.filter((pair) => pair.key !== key).map((pair) => {
    const [candidateGroup, candidateSubject] = pair.key.split("/");
    const sameGroup = candidateGroup === group;
    const sameSubject = candidateSubject === subject;
    const lexicalOverlap = overlapScore(query, `${pair.headline} ${pair.body}`);
    const approvalDate = [latestApprovalDate(pair.headlineNotes), latestApprovalDate(pair.bodyNotes)].sort().at(-1);
    const score = (sameGroup ? 120 : 0) + (sameSubject ? 90 : 0) + Math.min(60, lexicalOverlap * 3) + (approvalDate >= "2026-08-14" ? 10 : 0);
    return { ...pair, approvalDate, ranking: { score, sameGroup, sameSubject, lexicalOverlap } };
  }).sort((left, right) => right.ranking.score - left.ranking.score
      || right.approvalDate.localeCompare(left.approvalDate)
      || left.key.localeCompare(right.key));
  const examples = [];
  const add = (entry, selectionReason) => {
    if (!entry || examples.some((selected) => selected.key === entry.key) || examples.length >= limit) return;
    examples.push({ ...entry, ranking: { ...entry.ranking, selectionReason } });
  };
  add(ranked.find((entry) => entry.ranking.sameGroup), "closest-same-group-register");
  add(ranked.find((entry) => entry.ranking.sameSubject), "closest-same-subject-meaning");
  for (const entry of ranked) add(entry, "next-highest-combined-score");
  if (examples.length !== limit) throw new Error(`Expected ${limit} ranked approved examples for ${key}; found ${examples.length}.`);
  Object.defineProperty(examples, "ownerCorrections", {
    value: rankedOwnerCorrections(key, sourceRows),
    enumerable: false,
    writable: false
  });
  return examples;
}

function transitMechanism(packet) {
  const facts = packet.verifiedAstrology.map((fact) => String(fact.text).trim()).filter(Boolean).join(" ");
  return `${String(packet.target.groupGuidance).trim()} Verified astrology boundary: ${facts}`;
}

function deterministicLintRules(packet, config) {
  const fixed = [
    { id: "grammar", rule: "Rendered headline and body must pass deterministic pronoun-case and agreement checks." },
    { id: "placeholder-integrity", rule: "Do not emit unresolved or unsupported template placeholders." },
    { id: "SOL-DIRECTIVE-output-schema", rule: "Return strict JSON with exactly transit_key, headline, body, and screenshot_line; transit_key must equal the requested key and every value must be a non-empty string." },
    { id: "SOL-DIRECTIVE-headline", rule: "Headline is one declarative sentence, ends with a period, contains 4–12 words, contains no question or exclamation mark, and is not a Notice/Allow/Pay attention command." },
    { id: "SOL-DIRECTIVE-body-length", rule: "Body contains 50–90 words in 3–5 sentences." },
    { id: "SOL-DIRECTIVE-body-register", rule: "Body uses second person and does not repeat the complete headline." },
    { id: "SOL-DIRECTIVE-one-situation", rule: "Use one concrete situation; stacked interchangeable examples and menu constructions are prohibited." },
    { id: "SOL-DIRECTIVE-formula", rule: "Do not open with a rhetorical question, Notice when, or Pay attention to; do not use the scene → diagnosis → permission → instruction template." },
    { id: "SOL-DIRECTIVE-hedging", rule: "Use may, might, and perhaps at most once in total; never use ironically or usually; do not assert another person's hidden intent." },
    { id: "SOL-DIRECTIVE-screenshot", rule: "screenshot_line must be exactly one complete sentence copied verbatim from the body." }
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
    `### Ranked approved card ${index + 1}: ${example.key}`,
    `Ranking: ${JSON.stringify(example.ranking)}; latest approval date: ${example.approvalDate}`,
    `Headline source ID: ${example.headlineSourceId}`,
    example.headline,
    `Body source ID: ${example.bodySourceId}`,
    example.body
  ].join("\n")).join("\n\n");
}

function renderCorrections(corrections) {
  return corrections.map((entry, index) => [
    `### Owner correction ${index + 1}`,
    `Source ID: ${entry.sourceId}`,
    `Ranking: ${JSON.stringify(entry.ranking)}`,
    `Before: ${entry.bad ?? entry.before}`,
    `After: ${entry.corrected ?? entry.after}`,
    `Reason: ${entry.why ?? entry.owner_reason ?? entry.rule ?? entry.category}`
  ].join("\n")).join("\n\n");
}

function renderSceneContext(sceneContext) {
  if (!sceneContext?.canGenerateContextualCandidate || !sceneContext?.writerBoundary?.enabled) {
    throw new Error("Resolved chart context with explicitly approved scene licenses is required before writer input can be rendered.");
  }
  return JSON.stringify({
    chartContext: sceneContext.chartContext,
    mechanism: sceneContext.mechanism,
    aspectGrammar: sceneContext.aspectGrammar,
    licenses: sceneContext.licenses,
    writerBoundary: sceneContext.writerBoundary
  }, null, 2);
}

function renderSelfAuditWriterInput(packet, config, examples, sceneContext) {
  const directive = loadDirective(config);
  const rules = [
    renderEffectiveRulesForPrompt({ surface: "daily", family: "daily" }),
    "## Exact deterministic implementations",
    deterministicLintRules(packet, config).map((entry) => `- [${entry.tier.toUpperCase()}] ${entry.id}: ${entry.rule}`).join("\n")
  ].join("\n\n");
  const modelInput = directive
    .split("{{TRANSIT_KEY}}").join(packet.target.key)
    .split("{{TRANSIT_MECHANISM}}").join(transitMechanism(packet))
    .split("{{RESOLVED_CHART_CONTEXT}}").join(renderSceneContext(sceneContext))
    .split("{{GOOD_EXAMPLES}}").join(renderExamples(examples))
    .split("{{OWNER_CORRECTIONS}}").join(renderCorrections(examples.ownerCorrections || []))
    .split("{{LINT_RULES}}").join(rules);
  if (/\{\{[A-Z_]+\}\}/u.test(modelInput)) throw new Error(`Unresolved self-audit directive placeholder for ${packet.target.key}.`);
  return modelInput;
}

function selfAuditPacketLint(packet, modelInput, config, examples, currentPair = null, sceneContext = null) {
  const canonical = packetLint(packet, renderModelInput(packet), config);
  const checks = [
    { id: "canonical-packet-preflight", passed: canonical.passed, details: canonical.checks.filter((check) => !check.passed) },
    { id: "effective-prompt-shell-loaded", passed: modelInput.startsWith("# Daily-glance writer candidate (one per call)"), details: config.selfAuditDirectivePath },
    { id: "pipeline-notes-excluded", passed: !modelInput.includes("Pipeline notes") && !modelInput.includes("Best-of-three ="), details: "Non-prompt pipeline notes are absent." },
    { id: "one-candidate-contract", passed: modelInput.includes("Write exactly one UNAPPROVED Daily Glance candidate") && !modelInput.includes("Write 3 candidates"), details: "One candidate per independent call." },
    { id: "exact-output-schema", passed: modelInput.includes('"transit_key"') && modelInput.includes('"screenshot_line"') && !modelInput.includes('"portability_check"'), details: "Four-field owner schema included." },
    { id: "resolved-chart-context", passed: sceneContext?.canGenerateContextualCandidate === true && sceneContext?.writerBoundary?.enabled === true && modelInput.includes("## Resolved chart context and approved scene licenses"), details: sceneContext?.chartContext || "missing" },
    { id: "explicit-scene-license-approval", passed: (sceneContext?.licenses || []).length > 0 && sceneContext.licenses.every((license) => license.approval?.ownerApproved === true && license.approval?.writerEligible === true), details: (sceneContext?.licenses || []).map((license) => license.licenseId) },
    { id: "ranked-current-approved-examples", passed: examples.length === 3 && examples.every((entry) => entry.key !== packet.target.key && entry.headlineStatus === "approved" && entry.bodyStatus === "approved" && Number.isFinite(entry.ranking?.score)), details: examples.map((entry) => ({ key: entry.key, ranking: entry.ranking })) },
    { id: "ranked-owner-corrections", passed: (examples.ownerCorrections || []).length >= 3 && (examples.ownerCorrections || []).every((entry) => Number.isFinite(entry.ranking?.score) && entry.sourcePath), details: (examples.ownerCorrections || []).map((entry) => ({ sourcePath: entry.sourcePath, sourceIndex: entry.sourceIndex, ranking: entry.ranking })) },
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
  const expectedFields = "body|headline|screenshot_line|transit_key";
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
    { id: "SOL-DIRECTIVE-screenshot", passed: screenshotSentences.length === 1 && candidate.body.includes(candidate.screenshot_line.trim()), details: screenshotSentences.length === 1 && candidate.body.includes(candidate.screenshot_line.trim()) ? "Exact body sentence supplied." : "screenshot_line is not one exact body sentence." }
  ]);
  return {
    ...base,
    passed: blockingChecksPassed(checks),
    allChecksPassed: checks.every((check) => check.passed),
    checks,
    directiveCounts: { hedgeCount, screenshotSentences: screenshotSentences.length }
  };
}

function selectLintCleanWinner(candidates, operatingMode, compare) {
  const eligible = candidates.filter((entry) => entry.candidate
    && entry.lint?.passed
    && !entry.judge?.skipped
    && entry.promotionEligible !== false
    && entry.candidatePoolEligible !== false
    && entry.disposition !== "RETAIN_AS_REGISTER_EVIDENCE / DO_NOT_SERVE");
  return eligible.length ? eligible.slice().sort((left, right) => compare(left, right, operatingMode))[0] : null;
}

module.exports = {
  approvedGoodExamples,
  deterministicLintRules,
  lintSelfAuditCandidate,
  loadDirective,
  parseSelfAuditCandidate,
  rankedOwnerCorrections,
  renderSelfAuditWriterInput,
  selectLintCleanWinner,
  selfAuditPacketLint,
  transitMechanism
};
