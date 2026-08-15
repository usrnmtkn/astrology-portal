"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const configPath = path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-pilot-v1.json");
const batch1ConfigPath = path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-batch-1-v1.json");
const batch2ConfigPath = path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-batch-2-v1.json");
const batch3ConfigPath = path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-batch-3-v1.json");
const voiceIndexPath = path.join(packageRoot, "voice", "tldr-astro", "satori-writer", "voice-index.json");
const bannedWordsPath = path.join(packageRoot, "voice", "banned-words.json");
const placementVoicePath = path.join(packageRoot, "voice", "tldr-astro", "sky-placement.json");
const servingLintPolicyPath = path.join(packageRoot, "config", "daily-glance-writer-lint-policy-v3.json");
const { POLICY_CLASSES, findingForEntry, normalizePolicyEntry } = require("./banned-word-policy.js");
const knowledgeResolver = require("./knowledge-resolver.js");

function readJson(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!parsed.$extends) return parsed;
  const parent = readJson(path.resolve(path.dirname(filePath), parsed.$extends));
  const merged = {
    ...parent,
    ...parsed,
    routing: { ...parent.routing, ...parsed.routing },
    authorities: [...new Set([...(parent.authorities || []), ...(parsed.authorities || [])])],
    referencePassages: [...(parent.referencePassages || []), ...(parsed.referencePassagesAppend || [])]
  };
  delete merged.$extends;
  delete merged.referencePassagesAppend;
  return merged;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getPath(value, selector) {
  return String(selector).split(".").reduce((current, part) => current?.[part], value);
}

function wordCount(value) {
  return (String(value).match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu) || []).length;
}

function lintTierForRule(ruleId, { batch = false, policy = readJson(servingLintPolicyPath) } = {}) {
  if (batch) return policy.batchRuleTiers[ruleId] || policy.governance.unknownRuleDefault;
  const aliases = {
    "DG-R2": "DG-R2-register",
    "B1-L2": "B1-L2-may-inner-states-only",
    "B1-L3": "B1-L3+L4-headline-group-grammar",
    "B1-L4": "B1-L3+L4-headline-group-grammar",
    "SOL-DIRECTIVE-body-length": "P4-body-word-count"
  };
  const normalizedRuleId = /-BAN-\d+$/u.test(ruleId)
    ? "global+VC-016+DG+SM-output-bans"
    : aliases[ruleId] || ruleId;
  const failureCount = policy.baseline.ruleFailureCounts[normalizedRuleId];
  if (failureCount === undefined) return policy.governance.unknownRuleDefault;
  return failureCount / policy.baseline.cardCount > policy.baseline.advisoryWhenFailureRateGreaterThan
    ? "advisory"
    : "blocking";
}

function applyLintTiers(checks, options = {}) {
  return checks.map((check) => {
    const tier = lintTierForRule(check.id, options);
    return { ...check, tier, advisory: tier === "advisory" };
  });
}

function blockingChecksPassed(checks) {
  return checks.every((check) => check.passed || check.tier === "advisory");
}

function isGovernedBatch(config) {
  return /daily-glance-writer-sol-xhigh-batch-\d+/u.test(config.configId);
}

function isBatch2(config) {
  return /batch-(?:2|3)/u.test(config.configId);
}

function sentences(value) {
  return (String(value).match(/[^.!?]+[.!?]+(?:["'”’])?|[^.!?]+$/gu) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function compilePattern(term, { prefix = false } = {}) {
  const source = String(term);
  const isRegex = /[\\()[\]|?+*{}]/u.test(source);
  if (isRegex) return new RegExp(source, "iu");
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (/^[\p{L}\p{N}-]+$/u.test(source)) {
    return new RegExp(`\\b${escaped}${prefix ? "[\\p{L}]*" : ""}\\b`, "iu");
  }
  return new RegExp(escaped, "iu");
}

function outputBanRules(config = readJson(configPath)) {
  const global = readJson(bannedWordsPath).bannedWords
    .map(normalizePolicyEntry)
    .filter((entry) => [POLICY_CLASSES.HARD_BAN, POLICY_CLASSES.AI_TELL_PREVENTIVE].includes(entry.policyClass))
    .map((entry) => ({
      id: "global",
      term: entry.term,
      reason: entry.reason,
      pattern: compilePattern(entry.term),
      policyEntry: entry
    }));
  const vc016 = readJson(placementVoicePath).outputBans.fail.map((entry) => ({
    id: "VC-016-minus-pronouns",
    term: entry.term,
    reason: entry.reason,
    pattern: compilePattern(entry.term, { prefix: entry.term === "facilitat" })
  }));
  const daily = [
    { id: "SM-DG-5", term: "\\bwhether\\b", reason: "not owner language" },
    { id: "DG-R1", term: "(?:^|[.!?]\\s+)Stop\\s+[A-Za-z]", reason: "fixed Stop + verb advice opener" },
    { id: "DG-R4", term: "\\bit (?:lands|goes better|works out|heals)\\b", reason: "outcome promise" },
    { id: "DG-R5", term: "\\bfuture[-‑]you\\b", reason: "meme/cynicism register" },
    { id: "DG-R5", term: "\\bfor once\\b", reason: "assumes the reader's baseline is failure" },
    { id: "DG-R5", term: "\\bfor a change\\b", reason: "assumes the reader's baseline is failure" },
    { id: "DG-R6", term: "\\b(?:loudest|smartest|quietest|most [a-z]+) (?:person|voice|one) in the room\\b", reason: "room-as-audience family" },
    { id: "DG-R15", term: "(?:^|[.!?]\\s+)(?:Take (?:a|one|two|three|several|some) (?:deep )?breaths?|Breathe|Drink (?:some )?water|Go for a walk|Ground yourself|Check in with yourself|Stretch|Rest)\\b", reason: "somatic or generic-wellness micro-instruction" },
    { id: "DG-R16", term: "\\bIt takes less [^.!?\\n]{1,80} to [^.!?\\n]{1,80} than to [^.!?\\n]{1,100}", reason: "owner-reserved headline construction" },
    { id: "VC-016-minus-pronouns", term: "\\bperform(?:s|ed|ing|ance|ative)?\\b", reason: "performance family" },
    { id: "SM-DG-6", term: "\\bthis energy\\b|\\bthe energy (?!you (?:actually )?have\\b)|\\benergy (?:flows?|is|feels|brings|supports|asks|invites)\\b", reason: "ambient-force energy language" }
  ].map((entry) => ({ ...entry, pattern: new RegExp(entry.term, "iu") }));
  const hidden = config.output.engineHiddenTerms.map((term) => ({
    id: "engine-hidden",
    term,
    reason: "planet, aspect, and house labels do not render on Daily At-a-Glance",
    pattern: compilePattern(term)
  }));
  return [...global, ...vc016, ...daily, ...hidden];
}

function lintTextAgainstBans(text, config) {
  const findings = [];
  for (const rule of outputBanRules(config)) {
    const policyFinding = rule.policyEntry ? findingForEntry(text, rule.policyEntry) : null;
    const match = rule.policyEntry ? null : String(text).match(rule.pattern);
    if (policyFinding) findings.push({ id: rule.id, term: rule.term, reason: rule.reason, match: policyFinding.match, policyClass: policyFinding.policyClass });
    else if (match) findings.push({ id: rule.id, term: rule.term, reason: rule.reason, match: match[0] });
  }
  return findings;
}

function loadOwnerPassages(config, target) {
  const index = readJson(voiceIndexPath);
  const byId = new Map((index.entries || []).map((entry) => [entry.sourceId, entry]));
  const references = new Map(config.referencePassages.map((entry) => [entry.sourceId, entry]));
  const sourceIds = target.ownerPassageSourceIds || config.ownerPassageSourceIds;
  return sourceIds.map((sourceId) => {
    const reference = references.get(sourceId);
    if (reference) {
      const source = fs.readFileSync(path.join(repoRoot, reference.sourcePath), "utf8");
      if (!source.includes(reference.text)) throw new Error(`Reference passage ${sourceId} is no longer byte-exact in ${reference.sourcePath}.`);
      return { ...reference, ownerAuthored: true, useAsPositiveVoiceEvidence: true };
    }
    const entry = byId.get(sourceId);
    if (!entry) throw new Error(`Missing owner passage ${sourceId}.`);
    if (!fs.existsSync(path.join(repoRoot, entry.sourcePath))) throw new Error(`Missing owner fixture ${entry.sourcePath}.`);
    if (sha256(entry.text) !== entry.sourceSha256) throw new Error(`Owner passage ${sourceId} no longer matches its governed fixture hash.`);
    return {
      sourceId: entry.sourceId,
      sourcePath: entry.sourcePath,
      authorityClass: entry.authorityClass,
      approvalScope: "register-only-never-runtime-facts",
      ownerAuthored: entry.ownerAuthored,
      useAsPositiveVoiceEvidence: entry.useAsPositiveVoiceEvidence,
      text: entry.text
    };
  });
}

function verifyFact(fact) {
  const absolute = path.join(repoRoot, fact.sourcePath);
  if (!fs.existsSync(absolute)) throw new Error(`Missing fact source ${fact.sourcePath}.`);
  if (fact.sourcePath.endsWith(".json")) {
    const actual = getPath(readJson(absolute), fact.selector);
    const matches = fact.match === "includes"
      ? typeof actual === "string" && actual.includes(fact.text)
      : actual === fact.text;
    if (!matches) throw new Error(`Fact selector ${fact.selector} no longer matches ${fact.sourcePath}.`);
  } else if (!fs.readFileSync(absolute, "utf8").includes(fact.text)) {
    throw new Error(`Fact text for ${fact.selector} no longer appears in ${fact.sourcePath}.`);
  }
}

function verifyWarmthHarvest(target, config) {
  const harvest = target.warmthHarvest;
  if (!harvest && !isGovernedBatch(config)) {
    return { harvest_mode: "none_found", emotionalCore: target.emotionalCore, ownerFoundationLines: [], sourcesSearched: [], degradationRule: "Legacy pilot packet; warmth harvest not configured." };
  }
  if (!harvest || !["matched", "none_found"].includes(harvest.harvest_mode)) {
    throw new Error(`Missing governed warmth harvest for ${target.key}.`);
  }
  const searchedSources = [
    { lane: "daily-family-authored-clauses", sourcePath: config.harvestSources.reviewedClausesPath },
    { lane: "owner-corpus", sourcePath: config.harvestSources.ownerCorpusRoot },
    { lane: "aphorism-library-themes", sourcePath: config.harvestSources.aphorismLibraryPath, section: config.harvestSources.aphorismLibrarySection }
  ];
  if (harvest.harvest_mode === "none_found") {
    return {
      harvest_mode: "none_found",
      emotionalCore: target.emotionalCore,
      ownerFoundationLines: [],
      sourcesSearched: searchedSources,
      degradationRule: "OV-042: use plain register; do not invent imitation warmth."
    };
  }
  const absolute = path.join(repoRoot, harvest.sourcePath);
  if (!fs.existsSync(absolute)) throw new Error(`Missing warmth source ${harvest.sourcePath}.`);
  if (harvest.recordId) {
    const source = readJson(absolute);
    const record = (source.reviewed || []).find((entry) => entry.id === harvest.recordId);
    if (!record || record.status !== "READER_READY") throw new Error(`Warmth record ${harvest.recordId} is not READER_READY.`);
    const field = getPath(record, harvest.selector);
    if (typeof field !== "string" || !field.includes(harvest.text)) throw new Error(`Warmth record ${harvest.sourceId} is no longer exact.`);
  } else if (!fs.readFileSync(absolute, "utf8").includes(harvest.text)) {
    throw new Error(`Warmth line ${harvest.sourceId} is no longer exact in ${harvest.sourcePath}.`);
  }
  return {
    harvest_mode: "matched",
    emotionalCore: target.emotionalCore,
    ownerFoundationLines: [{
      lane: harvest.lane,
      sourceId: harvest.sourceId,
      sourcePath: harvest.sourcePath,
      selector: harvest.selector,
      originalLine: harvest.text,
      suppliedLine: harvest.text
    }],
    sourcesSearched: searchedSources,
    insertInstruction: "The supplied owner line may open the body, close it, or sit mid-body, or be OMITTED entirely if it does not earn its place (OV-042: absence beats imitation). Preserve its meaning; verbatim preferred when it fits. Never realize reassurance as a sentence opening with \"You don't have to\" or \"You're allowed\"; answer the scene's exact fear in the scene's own words.",
    placementInstruction: "A turn toward the reader, if present, must trace to this line; otherwise omit the turn. Do not place the line in the second-to-last sentence slot; that slot is worn out across prior batches."
  };
}

function verifySceneEvidence(target, config) {
  const scene = target.sceneEvidence;
  if (!scene && !isGovernedBatch(config)) {
    return { mode: "invented_allowed", permission: "OV-028", reason: "Legacy pilot packet.", instruction: "Invent one recognizable daily-scale lived moment from the verified meanings only." };
  }
  if (!scene || !["owner-five-beat", "house-context", "invented_allowed"].includes(scene.mode)) {
    throw new Error(`Missing governed scene evidence for ${target.key}.`);
  }
  if (scene.mode === "invented_allowed") {
    if (scene.permission !== "OV-028") throw new Error(`Invented scene for ${target.key} lacks OV-028 permission.`);
    return {
      mode: scene.mode,
      permission: scene.permission,
      reason: scene.reason,
      instruction: "Invent one recognizable daily-scale lived moment from the verified meanings only. Invent the scene, never astrology; use a moment, not a category."
    };
  }
  const absolute = path.join(repoRoot, scene.sourcePath);
  if (!fs.existsSync(absolute)) throw new Error(`Missing scene source ${scene.sourcePath}.`);
  if (scene.mode === "house-context") {
    const record = readJson(absolute)[scene.recordId];
    if (!record || record.scene !== scene.scene || (scene.refine && record.refine !== scene.refine)) {
      throw new Error(`House context scene ${scene.sourceId} is no longer exact.`);
    }
    return {
      mode: scene.mode,
      sourceId: scene.sourceId,
      sourcePath: scene.sourcePath,
      recordId: scene.recordId,
      scene: scene.scene,
      refine: scene.refine || null,
      instruction: "Use this context to locate one ordinary daily-scale moment. It is scene evidence only, never Marie voice evidence."
    };
  }
  const record = readJson(absolute)[scene.recordId];
  if (!record || record.humanMoment !== scene.humanMoment || record.developmentDetail !== scene.developmentDetail) {
    throw new Error(`Owner five-beat scene ${scene.sourceId} is no longer exact.`);
  }
  return {
    mode: scene.mode,
    sourceId: scene.sourceId,
    sourcePath: scene.sourcePath,
    recordId: scene.recordId,
    humanMoment: scene.humanMoment,
    developmentDetail: scene.developmentDetail,
    instruction: "Use this evidence to ground a recognizable daily-scale middle; do not copy its astrology or enlarge its stakes."
  };
}

function compileDailyPacket(key, config = readJson(configPath)) {
  const target = config.keys.find((entry) => entry.key === key);
  if (!target) throw new Error(`Unknown Daily At-a-Glance writer key: ${key}.`);
  target.facts.forEach(verifyFact);
  const governedEvidence = knowledgeResolver.buildPacket(`daily/${key}`, {
    surface: "daily",
    register: "daily",
    maxChars: 8000,
    includeRelated: false
  });
  const verifiedAstrology = [...governedEvidence.evidence]
    .sort((a, b) => Number(a.field.split(".")[1]) - Number(b.field.split(".")[1]))
    .map((record) => ({
    text: record.text,
    sourcePath: record.sourceReference?.path ?? record.path,
    selector: record.sourceReference?.selector ?? record.field,
    match: record.sourceReference?.match ?? null,
    authorityClass: record.authorityClass,
    evidenceSha256: record.evidenceSha256,
    sourceSha256: record.sourceSha256
    }));
  const ownerPassages = loadOwnerPassages(config, target);
  const warmthHarvest = verifyWarmthHarvest(target, config);
  const sceneEvidence = verifySceneEvidence(target, config);
  const aphorismLine = warmthHarvest.ownerFoundationLines.find((entry) => entry.lane === "aphorism-library-theme");
  const phraseLibraryPath = "packages/astro-knowledge/voice/tldr-astro/phrase-library-batch1.md";
  const phraseLibraryText = fs.existsSync(path.join(repoRoot, phraseLibraryPath))
    ? fs.readFileSync(path.join(repoRoot, phraseLibraryPath), "utf8")
    : null;
  const phraseLibraryTitles = (target.phraseLibraryTitles || []).map((entry) => {
    if (!phraseLibraryText || !phraseLibraryText.includes(entry.text)) {
      throw new Error(`Phrase-library title for ${target.key} is not verbatim in ${phraseLibraryPath}: ${entry.text}`);
    }
    return { text: entry.text, tag: entry.tag || null, note: entry.note || null, sourcePath: phraseLibraryPath };
  });
  return {
    schemaVersion: 1,
    packetVersion: config.packetVersion,
    promptVersion: config.promptVersion,
    target: {
      key: target.key,
      register: target.register,
      emotionalCore: target.emotionalCore,
      groupGuidance: target.groupGuidance || target.register,
      exemplarPolicy: target.exemplarPolicy || "owner reference passages establish register only",
      matchingExemplarSourceIds: target.matchingExemplarSourceIds || [],
      axisEnd: target.axisEnd || null,
      skeleton: target.skeleton || null
    },
    routing: config.routing,
    verifiedAstrology,
    governedEvidence,
    format: config.output,
    styleMarkers: config.styleMarkers,
    dailyRules: config.dailyRules || [],
    batch1LintGuidance: config.batch1LintGuidance || [],
    ownerPromptCore: config.ownerPromptCore || null,
    ownerGuidance: config.ownerGuidance || [],
    ownerFinalTests: config.ownerFinalTests || [],
    specificity: target.specificity || null,
    warmthHarvest,
    sceneEvidence,
    phraseLibraryHeadlineOptions: phraseLibraryTitles,
    ownerVocabulary: config.ownerVocabulary || null,
    aphorismHeadlineOption: aphorismLine ? {
      allowed: true,
      exactText: aphorismLine.suppliedLine,
      sourceId: aphorismLine.sourceId,
      ownerPlacementApprovalRequired: true
    } : { allowed: false },
    outputPolicy: {
      ids: ["global", "VC-016-minus-pronouns", ...(config.dailyRules || []).map((entry) => entry.id), "SM-DG-5", "SM-DG-6", "engine-hidden"],
      pronounsAllowed: ["you", "your", "yours", "yourself", "yourselves"],
      noNegativeExamples: true,
      noJudgeReports: true,
      noRejectedCopy: true
    },
    ownerPassages
  };
}

function renderModelInput(packet) {
  const facts = packet.verifiedAstrology.map((fact) => `- ${fact.text}`).join("\n");
  const markers = packet.styleMarkers.map((marker) => `- ${marker.id}: ${marker.rule}`).join("\n");
  const dailyRules = packet.dailyRules.map((rule) => `- ${rule.id}: ${rule.rule}`).join("\n");
  const passages = packet.ownerPassages.map((entry, index) => [
    `### Passage ${index + 1}`,
    `Source ID: ${entry.sourceId}`,
    entry.text
  ].join("\n")).join("\n\n");
  const batchGuidance = packet.batch1LintGuidance.map((entry) => `- ${entry.id}: ${entry.rule}`).join("\n");
  const ownerGuidance = packet.ownerGuidance.map((entry) => `- ${entry.id}: ${entry.rule}`).join("\n");
  const ownerTests = packet.ownerFinalTests.map((entry) => `- ${entry.id}: ${entry.rule}`).join("\n");
  const warmth = packet.warmthHarvest.harvest_mode === "matched"
    ? packet.warmthHarvest.ownerFoundationLines.map((entry) => `- ${entry.suppliedLine}\n  Source ID: ${entry.sourceId}\n  Source path: ${entry.sourcePath}#${entry.selector}`).join("\n")
    : "- none_found. OV-042 applies: stay plain and do not invent imitation warmth.";
  const scene = packet.sceneEvidence.mode === "owner-five-beat"
    ? `- Human moment: ${packet.sceneEvidence.humanMoment}\n- Development detail: ${packet.sceneEvidence.developmentDetail}\n- Source ID: ${packet.sceneEvidence.sourceId}\n- Source path: ${packet.sceneEvidence.sourcePath}#${packet.sceneEvidence.recordId}`
    : packet.sceneEvidence.mode === "house-context"
      ? `- Scene: ${packet.sceneEvidence.scene}${packet.sceneEvidence.refine ? `\n- Refinement: ${packet.sceneEvidence.refine}` : ""}\n- Source ID: ${packet.sceneEvidence.sourceId}\n- Source path: ${packet.sceneEvidence.sourcePath}#${packet.sceneEvidence.recordId}`
      : `- ${packet.sceneEvidence.permission}: ${packet.sceneEvidence.instruction}\n- Reason: ${packet.sceneEvidence.reason}`;
  const phraseTitles = (packet.phraseLibraryHeadlineOptions || []).length
    ? "## Owner phrase-library title options (owner-authored, verbatim)\n"
      + packet.phraseLibraryHeadlineOptions.map((entry) => `- ${JSON.stringify(entry.text)}${entry.tag ? ` (library tag: ${entry.tag})` : ""}${entry.note ? ` — ${entry.note}` : ""}`).join("\n")
      + "\nOne of these owner lines MAY serve as the headline, quoted verbatim, if it fits this key's register; such use is flagged for owner placement approval. If none fits, write a fresh headline that would survive beside them."
    : "";
  const vocabulary = packet.ownerVocabulary
    ? `## Owner vocabulary palette (register evidence, never a quota)\n${packet.ownerVocabulary.words.join(", ")}\n${packet.ownerVocabulary.rule}`
    : "";
  const aphorism = packet.aphorismHeadlineOption.allowed
    ? `An owner-canon aphorism may be used as the headline only if quoted verbatim: ${JSON.stringify(packet.aphorismHeadlineOption.exactText)}. Such use is flagged in the lint report for owner placement approval.`
    : "No aphorism headline option is supplied for this key.";
  const dailyRuleRange = packet.dailyRules.length
    ? `${packet.dailyRules[0].id} through ${packet.dailyRules.at(-1).id}`
    : "the configured daily rules";
  const skeletonGates = {
    "consequence-close": "- Body: one paragraph, 3 to 6 sentences, 40 to 90 words. Name what happens and what it costs; end on the turn that completes the thought: a consequence, a recognition line, or one concrete move. An instruction is optional.",
    "instruction-first": "- Body: one paragraph, 3 to 6 sentences, 40 to 90 words. Open with the instruction as an attention verb (Notice when..., Watch for..., Expect...), then the scene, and close on the consequence or reframe. No closing instruction.",
    "permission-after-recognition": "- Body: one paragraph, 3 to 6 sentences, 40 to 90 words. Truth first, then its cost, then one reassurance line answering the exact fear in fresh words only if the truth has not already done that work; close on the turn, instruction optional."
  };
  const bodyGate = skeletonGates[packet.target.skeleton] || skeletonGates["consequence-close"];
  return [
    "You are writing one unapproved Daily At-a-Glance candidate for TLDR Astro.",
    "",
    "Return one headline and one body. Write once. Do not return options, analysis, explanations, or a source map.",
    "The owner passages below establish register and sentence movement only. Do not copy their astrology, dates, subjects, or scenarios. The verified facts are the complete astrology boundary for this key; invent no additional astrology.",
    "The surface hides the engine. Do not name planets, points, aspects, houses, natal placements, or transits in the output.",
    "Use second person. Keep the condition mild and limited to the next few hours. Describe availability or friction, never a promised result.",
    "",
    `## Target\nKey: ${packet.target.key}\nRequired register: ${packet.target.register}\nEmotional core: ${packet.target.emotionalCore}\nGroup guidance: ${packet.target.groupGuidance}\nExemplar policy: ${packet.target.exemplarPolicy}${packet.target.axisEnd ? `\nAxis end: ${packet.target.axisEnd}` : ""}${packet.target.skeleton ? `\nAssigned body skeleton: ${packet.target.skeleton}` : ""}`,
    "",
    `## Verified astrology for this key only\n${facts}`,
    "",
    `## Warmth harvest (${packet.warmthHarvest.harvest_mode})\n${warmth}`,
    packet.warmthHarvest.harvest_mode === "matched" ? packet.warmthHarvest.insertInstruction : packet.warmthHarvest.degradationRule,
    packet.warmthHarvest.harvest_mode === "matched" ? packet.warmthHarvest.placementInstruction : "",
    aphorism,
    ...(phraseTitles ? ["", phraseTitles] : []),
    ...(vocabulary ? ["", vocabulary] : []),
    "",
    `## Scene evidence (${packet.sceneEvidence.mode})\n${scene}`,
    packet.sceneEvidence.instruction,
    "The body's middle sentence or sentences must carry the lived moment.",
    "",
    ...(packet.ownerPromptCore ? ["## Owner packet prompt core (verbatim)", packet.ownerPromptCore, ""] : []),
    ...(packet.ownerGuidance.length ? [`## Owner's nine-step guidance\n${ownerGuidance}`, ""] : []),
    ...(packet.ownerFinalTests.length ? [`## Owner's three final tests\n${ownerTests}`, ""] : []),
    "## Approved format gates",
    "- Headline: one complete declarative sentence, sentence case, terminal period, 4 to 16 words. It makes a strong claim and can stand alone.",
    bodyGate,
    "- The body supports the headline without repeating its wording.",
    "",
    `## Owner style markers\n${markers}`,
    "",
    `## Daily-glance rules\n${dailyRules}`,
    "",
    `## Batch-1 lint lessons\n${batchGuidance}`,
    "",
    "## Output constraints",
    `- Pass the governed global output bans, VC-016 with second-person pronouns allowed, ${dailyRuleRange}, the engine-hidden rule, and the SM-DG rules.`,
    `- Keep the opener construction specific to this key; a batch guard compares all ${packet.routing.writerCalls} body openers.`,
    "- Keep the group register and daily scale visible through ordinary behavior, a clear reframe, and one final concrete instruction.",
    "",
    `## Six exact owner passages for register\n${passages}`,
    "",
    "Return only strict JSON with exactly these string keys: headline, body. Stop after the closing brace."
  ].join("\n");
}

function packetLint(packet, modelInput, config = readJson(configPath)) {
  const findings = [];
  const checks = [];
  const add = (id, passed, details) => checks.push({ id, passed, details });
  add("owner-passage-count", packet.ownerPassages.length === 6, `${packet.ownerPassages.length} passages`);
  add("owner-source-diversity", new Set(packet.ownerPassages.map((entry) => entry.sourcePath)).size >= 4, `${new Set(packet.ownerPassages.map((entry) => entry.sourcePath)).size} source files`);
  add("positive-authority-only", packet.ownerPassages.every((entry) => ["owner_authored_final", "exact_owner_approved"].includes(entry.authorityClass) && entry.ownerAuthored && entry.useAsPositiveVoiceEvidence), "Only owner-authored final or exact-owner-approved evidence is allowed.");
  const targetConfig = config.keys.find((entry) => entry.key === packet.target.key);
  const expectedFactCount = targetConfig?.expectedFactCount ?? (packet.target.key.startsWith("house/") ? 1 : 2);
  add("fact-count", packet.verifiedAstrology.length === expectedFactCount, `${packet.verifiedAstrology.length} key facts`);
  add("format-gates", packet.format.headline.maximumWords === 16 && packet.format.body.minimumWords === 40 && [65, 90].includes(packet.format.body.maximumWords) && packet.format.body.maximumInstructions === 1, "P4 headline/body gates present.");
  add("style-markers", packet.styleMarkers.map((entry) => entry.id).join("|") === "SM-DG-1|SM-DG-2|SM-DG-3|SM-DG-4|SM-DG-5|SM-DG-6", "SM-DG-1 through SM-DG-6 present.");
  const dailyRuleIds = packet.dailyRules.map((entry) => entry.id);
  if (isGovernedBatch(config)) {
    const expectedRuleIds = Array.from({ length: config.dailyRules.length }, (_, index) => `DG-R${index + 1}`);
    add("daily-rules", dailyRuleIds.join("|") === expectedRuleIds.join("|"), `${expectedRuleIds[0]} through ${expectedRuleIds.at(-1)} present.`);
  }
  if (isGovernedBatch(config)) {
    add("batch-1-lint-guidance", packet.batch1LintGuidance.map((entry) => entry.id).join("|") === "B1-L1|B1-L2|B1-L3|B1-L4", "Time-anchor, may, headline grammar, and conjunction-isolation lessons present.");
    add("warmth-source-search", packet.warmthHarvest.sourcesSearched.map((entry) => entry.lane).join("|") === "daily-family-authored-clauses|owner-corpus|aphorism-library-themes", "Daily family, owner corpus, and Aphorism Library searched in order.");
    add("warmth-one-max", packet.warmthHarvest.ownerFoundationLines.length <= 1, `${packet.warmthHarvest.ownerFoundationLines.length} supplied line(s)`);
    add("warmth-mode", packet.warmthHarvest.harvest_mode === "matched" ? packet.warmthHarvest.ownerFoundationLines.length === 1 : packet.warmthHarvest.ownerFoundationLines.length === 0 && packet.warmthHarvest.degradationRule.includes("OV-042"), packet.warmthHarvest.harvest_mode);
    add("scene-evidence-lane", packet.sceneEvidence.mode === "owner-five-beat"
      ? Boolean(packet.sceneEvidence.humanMoment && packet.sceneEvidence.developmentDetail && packet.sceneEvidence.sourceId)
      : packet.sceneEvidence.mode === "house-context"
        ? Boolean(packet.sceneEvidence.scene && packet.sceneEvidence.sourceId)
        : packet.sceneEvidence.permission === "OV-028", packet.sceneEvidence.mode);
  }
  if (isGovernedBatch(config)) {
    const exemplarIds = packet.target.matchingExemplarSourceIds;
    const passageIds = new Set(packet.ownerPassages.map((entry) => entry.sourceId));
    const originalConjunction = packet.target.exemplarPolicy === "no-approved-conjunction-exemplar; establish original saturation grammar";
    add("group-exemplar-policy", originalConjunction
      ? exemplarIds.length === 0
      : exemplarIds.length === 2 && exemplarIds.every((sourceId) => passageIds.has(sourceId)),
    originalConjunction ? "Conjunction packet contains no cross-group exemplar." : `${exemplarIds.length} matching group exemplar passages included.`);
  }
  if (isBatch2(config)) {
    add("owner-prompt-core", packet.ownerPromptCore === config.ownerPromptCore && modelInput.includes(`## Owner packet prompt core (verbatim)\n${config.ownerPromptCore}`), "Owner closing instruction is present verbatim as the writing instruction.");
    add("owner-nine-step-guidance", packet.ownerGuidance.filter((entry) => String(entry.id || "").startsWith("OWNER-STEP-")).map((entry) => entry.id).join("|") === "OWNER-STEP-1|OWNER-STEP-2|OWNER-STEP-3|OWNER-STEP-4|OWNER-STEP-5|OWNER-STEP-6|OWNER-STEP-7|OWNER-STEP-8|OWNER-STEP-9", "Nine owner steps present as guidance; PL- phrase-library rules ride alongside.");
    const expectedFinalTests = config.sceneContextGate?.required
      ? "OWNER-TEST-morning-read|OWNER-TEST-screenshot"
      : "OWNER-TEST-specificity|OWNER-TEST-morning-read|OWNER-TEST-screenshot";
    add("owner-final-tests", packet.ownerFinalTests.map((entry) => entry.id).join("|") === expectedFinalTests, config.sceneContextGate?.required ? "Morning-read and screenshot tests present; the retired portability/swap test is absent." : "Specificity, morning-read, and screenshot tests present.");
    if (!config.sceneContextGate?.required) {
      add("specificity-profile", Boolean(packet.specificity && packet.specificity.minimumGroups >= 1 && packet.specificity.cueGroups?.length >= packet.specificity.minimumGroups), "Mechanical swap-test profile present.");
    }
  }
  add("routing", packet.routing.model === "gpt-5.6-sol" && packet.routing.reasoningEffort === "xhigh" && packet.routing.writerCalls === config.keys.length && packet.routing.judgeCalls === 0 && packet.routing.terraEnabled === false, `Sol xhigh writer-only route for ${config.keys.length} calls; Terra disabled.`);
  const forbiddenMetadata = JSON.stringify(packet).match(/(?:ai_candidate|judge report|rejected copy|negative example)/giu) || [];
  add("first-call-exclusions", forbiddenMetadata.length === 0, forbiddenMetadata.length ? forbiddenMetadata : "No candidates, judge reports, rejected copy, or negative examples.");
  let positiveContext = [
    ...packet.ownerPassages.map((entry) => entry.text),
    ...packet.verifiedAstrology.map((entry) => entry.text),
    ...packet.warmthHarvest.ownerFoundationLines.map((entry) => entry.suppliedLine),
    ...(packet.sceneEvidence.mode === "owner-five-beat" ? [packet.sceneEvidence.humanMoment, packet.sceneEvidence.developmentDetail] : []),
    ...(packet.sceneEvidence.mode === "house-context" ? [packet.sceneEvidence.scene, packet.sceneEvidence.refine].filter(Boolean) : [])
  ].join("\n");
  for (const passage of packet.ownerPassages.filter((entry) => [
    "daily-glance-soft-mars-owner-headline",
    "daily-glance-soft-pluto-owner-headline"
  ].includes(entry.sourceId))) {
    positiveContext = positiveContext.split(passage.text).join("");
  }
  findings.push(...lintTextAgainstBans(positiveContext, config));
  add("positive-context-output-ban-self-lint", findings.length === 0, findings.length ? findings : "Owner passages and verified facts contain no output-ban collision.");
  add("model-input-shape", modelInput.includes("Six exact owner passages") && modelInput.includes("Verified astrology for this key only") && modelInput.includes("Warmth harvest") && modelInput.includes("Scene evidence") && modelInput.includes("Batch-1 lint lessons") && (!isBatch2(config) || modelInput.includes("Owner packet prompt core (verbatim)")), sha256(modelInput));
  return {
    schemaVersion: 1,
    key: packet.target.key,
    passed: checks.every((check) => check.passed),
    selfLintScope: "Positive owner passages and verified facts; policy declarations are excluded so named prohibited terms do not self-collide.",
    checks,
    findings,
    modelInputSha256: sha256(modelInput)
  };
}

function parseOutput(raw) {
  const clean = String(raw || "").trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const value = JSON.parse(clean);
  if (Object.keys(value).sort().join("|") !== "body|headline") throw new Error("Output must contain exactly headline and body.");
  if (typeof value.headline !== "string" || typeof value.body !== "string" || !value.headline.trim() || !value.body.trim()) {
    throw new Error("Output headline and body must be non-empty strings.");
  }
  return value;
}

function imperativeCount(body) {
  const command = /(?:^|[,;:]\s+|\b(?:so|then)\s+)(?:Please\s+)?(?:Ask|Call|Choose|Complete|Decide|Do|Give|Keep|Let|Make|Message|Move|Name|Notice|Pause|Pick|Put|Reach|Remove|Replace|Say|Send|Set|Share|Spend|Start|State|Take|Tell|Text|Try|Use|Wait|Write)\b/iu;
  return sentences(body).filter((sentence) => command.test(sentence)).length;
}

function groupRegisterCheck(candidate, key, config) {
  const text = `${candidate.headline} ${candidate.body}`;
  const target = config.keys.find((entry) => entry.key === key);
  const register = target?.register;
  const targetName = key.split("/")[1];
  if (register === "self-friction") {
    const inner = /\b(?:feel|feeling|mood|want|desire|urge|inside|yourself|comfort|permission|shame|truth)\b/iu.test(text);
    return { passed: inner, details: inner ? "Self-friction cue present." : "No detectable self-friction cue." };
  }
  if (register === "other-friction") {
    const other = /\b(?:someone|another person|they|them|friend|partner|coworker|other person)\b/iu.test(text);
    const friction = /\b(?:react|reactive|defens|temper|irritat|anger|angry|conflict|argue|rush|push|pressure|tension|expect|demand|question|judge|recognize|familiar|habit|pattern|retreat)\w*\b/iu.test(text);
    return { passed: other && friction, details: { otherPersonCue: other, otherFrictionCue: friction, target: targetName } };
  }
  if (register === "saturation") {
    const saturation = /\b(?:fills?|full|strong|quick|immediate|intense|every|whole|hard(?:er)? to (?:dismiss|ignore)|difficult to (?:dismiss|ignore)|takes? up|runs? through|all at once|front and center|less distance|same moment|nearly the same moment|again and again|keep encountering|repetition|repeatedly)\b/iu.test(text);
    return { passed: saturation, details: { saturationCue: saturation, target: targetName } };
  }
  if (register === "mild-ease") {
    const ease = /\b(?:easier|ease|room|available|support|steady|steadiness|less effort|less resistance|draw on|open(?:ing)?)\b/iu.test(text);
    return { passed: ease, details: { mildEaseCue: ease, target: targetName } };
  }
  const topic = /\b(?:friend|group|community|hope|future|social|connection|belong|shared plan)\w*\b/iu.test(text);
  return { passed: topic, details: topic ? "House-11 topic cue present." : "No detectable friendship/group/hope/community cue." };
}

function headlineGrammarCheck(headline, key, config) {
  const target = config.keys.find((entry) => entry.key === key);
  const text = String(headline);
  const otherGrammar = /\b(?:someone(?: else's)?|another person|they|their|them|other person)\b/iu.test(text);
  const softGrammar = /\b(?:less (?:energy|effort|resistance)|easier|more available|more room|takes less)\b/iu.test(text);
  const squareGrammar = /\b(?:comfort|avoid(?:ing|ance)?|substitute|instead of|against yourself|what you (?:actually )?(?:want|need))\b/iu.test(text);
  if (target?.register === "other-friction") {
    return { passed: otherGrammar, details: otherGrammar ? "Opposition headline names another-person pressure." : "Opposition headline does not use the approved another-person grammar." };
  }
  if (target?.register === "mild-ease") {
    return { passed: softGrammar && !otherGrammar, details: { softGrammar, otherGrammar } };
  }
  if (target?.register === "self-friction") {
    return { passed: squareGrammar && !otherGrammar && !softGrammar, details: { squareGrammar, otherGrammar, softGrammar } };
  }
  if (target?.register === "saturation") {
    return { passed: !otherGrammar && !softGrammar && !squareGrammar, details: { originalConjunctionGrammar: !otherGrammar && !softGrammar && !squareGrammar, otherGrammar, softGrammar, squareGrammar } };
  }
  return { passed: true, details: "No aspect-group headline grammar applies." };
}

function timeAnchorMatches(body) {
  return String(body).match(/\b(?:today|tonight|this (?:morning|afternoon|evening)|(?:for|over|during|in) the next few hours|for a few hours|within the next few hours)\b/giu) || [];
}

function mayUsageFindings(body) {
  const findings = [];
  const allowed = /^(?:feel|want|need|think|notice|realize|wonder|fear|worry|prefer|hope|remember|resent|wish|believe|doubt|seem|sense|care|love|hate|mind|catch\s+yourself|be\s+(?:ready|unsure|uncertain|irritated|annoyed|angry|sad|afraid|anxious|restless|tired|overwhelmed|drawn|tempted|reluctant|more|less)|get\s+(?:irritated|annoyed|angry|sad|anxious|restless|tired|overwhelmed)|have\s+(?:a feeling|mixed feelings|doubts?|trouble|enough|more|less))\b/iu;
  for (const match of String(body).matchAll(/\bmay\s+([^,;.!?]{1,60})/giu)) {
    if (!allowed.test(match[1].trim())) findings.push(match[0]);
  }
  return findings;
}

function specificityCueMatches(text, profile) {
  if (!profile) return [];
  return (profile.cueGroups || []).filter((group) => new RegExp(group.pattern, "iu").test(String(text))).map((group) => group.id);
}

function specificitySwapCheck(body, key, config) {
  const target = config.keys.find((entry) => entry.key === key);
  if (!target?.specificity) return { passed: true, details: "No mechanical specificity profile configured." };
  const ownMatches = specificityCueMatches(body, target.specificity);
  const ownPassed = ownMatches.length >= target.specificity.minimumGroups;
  const swapScope = target.specificitySwapScope ? new Set(target.specificitySwapScope) : null;
  const advisoryKeys = new Set(target.specificityAdvisoryKeys || []);
  const swaps = config.keys
    .filter((entry) => entry.key !== key && entry.specificity && (!swapScope || swapScope.has(entry.key)))
    .map((entry) => {
      const matches = specificityCueMatches(body, entry.specificity);
      return { key: entry.key, matches, passed: matches.length >= entry.specificity.minimumGroups };
    })
    .filter((entry) => entry.passed);
  const blockingSwaps = swaps.filter((entry) => !advisoryKeys.has(entry.key));
  const advisorySwaps = swaps.filter((entry) => advisoryKeys.has(entry.key));
  return {
    passed: ownPassed && blockingSwaps.length === 0,
    details: {
      own: { key, matches: ownMatches, required: target.specificity.minimumGroups, passed: ownPassed },
      comparisonScope: swapScope ? [...swapScope] : config.keys.filter((entry) => entry.key !== key && entry.specificity).map((entry) => entry.key),
      swappableTo: blockingSwaps,
      advisorySwappableTo: advisorySwaps
    }
  };
}

function screenshotCandidateLines(body, target) {
  const cuePatterns = (target?.specificity?.cueGroups || []).map((group) => new RegExp(group.pattern, "iu"));
  const recognition = /\b(?:but|because|before|after|instead|without|when|while|until|still|already|cost|harder|easier|too much|not|never|rather than|even if)\b/iu;
  return sentences(body).filter((sentence) => {
    const words = wordCount(sentence);
    return words >= 5
      && words <= 22
      && recognition.test(sentence)
      && (cuePatterns.length === 0 || cuePatterns.some((pattern) => pattern.test(sentence)))
      && imperativeCount(sentence) === 0;
  });
}

function lintOutput(candidate, key, config = readJson(configPath)) {
  const headlineSentences = sentences(candidate.headline);
  const bodySentences = sentences(candidate.body);
  const headlineWords = wordCount(candidate.headline);
  const bodyWords = wordCount(candidate.body);
  const instructions = imperativeCount(candidate.body);
  const lintSkeleton = ((config.keys || []).find((entry) => entry.key === key) || {}).skeleton || "consequence-close";
  const lastSentence = bodySentences.at(-1) || "";
  const banFindings = lintTextAgainstBans(`${candidate.headline}\n${candidate.body}`, config);
  const register = groupRegisterCheck(candidate, key, config);
  const headlineGrammar = headlineGrammarCheck(candidate.headline, key, config);
  const timeAnchors = timeAnchorMatches(candidate.body);
  const mayFindings = mayUsageFindings(candidate.body);
  const mayCount = (candidate.body.match(/\bmay\b/giu) || []).length;
  const timeAnchorOpener = timeAnchorMatches(bodySentences[0] || "");
  const specificity = specificitySwapCheck(candidate.body, key, config);
  const target = config.keys.find((entry) => entry.key === key);
  const screenshotLines = screenshotCandidateLines(candidate.body, target);
  const morningReadFailures = bodySentences.filter((sentence) => wordCount(sentence) > 28 || /[;()]/u.test(sentence));
  const shortBluntLines = bodySentences.filter((sentence) => wordCount(sentence) >= 2 && wordCount(sentence) <= 8);
  const biographicalFrames = `${candidate.headline} ${candidate.body}`.match(/\b(?:when you were (?:a child|young|growing up|\d+)|since childhood|your (?:divorce|job loss|layoff|breakup|diagnosis)|at age \d+|in \d{4})\b/giu) || [];
  const quotedDialogueLines = bodySentences.filter((sentence) => /(?:“[^”\n]+”|"[^"\n]+")/u.test(sentence));
  const normalizedHeadline = candidate.headline.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const normalizedBody = candidate.body.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/gu, " ").trim();
  const closer = lastSentence.toLowerCase();
  const closerSlogan = /\b(?:future[-‑]you|you deserve|trust the process|everything happens for a reason|this is your moment)\b/iu.test(closer);
  const outcomePromise = /\b(?:will|always|guarantee[sd]?|definitely|certainly)\b[^.!?]{0,50}\b(?:work|heal|succeed|land|resolve|improve)\w*\b/iu.test(`${candidate.headline} ${candidate.body}`);
  const fixedOpener = /^For the next few hours\b/iu.test(bodySentences[0] || "");
  const enumeratedInstruction = /\bone\b[^.!?]{0,100}\bone\b/iu.test(lastSentence);
  const checks = applyLintTiers([
    { id: "P4-headline-one-declarative-sentence", passed: headlineSentences.length === 1 && candidate.headline.endsWith(".") && !/[?!]/u.test(candidate.headline), details: `${headlineSentences.length} sentence(s)` },
    { id: "P4-headline-word-count", passed: headlineWords >= config.output.headline.minimumWords && headlineWords <= config.output.headline.maximumWords, details: `${headlineWords} words` },
    { id: "P4-body-sentence-count", passed: bodySentences.length >= config.output.body.minimumSentences && bodySentences.length <= config.output.body.maximumSentences, details: `${bodySentences.length} sentences` },
    { id: "P4-body-word-count", passed: bodyWords >= config.output.body.minimumWords && bodyWords <= config.output.body.maximumWords, details: `${bodyWords} words` },
    { id: "P4-one-final-instruction", passed: lintSkeleton === "instruction-first" ? instructions >= 1 : instructions <= 1, details: `skeleton=${lintSkeleton}; instruction optional per D2-3; ${instructions} detected instruction(s); final sentence: ${lastSentence}` },
    { id: "P4-body-supports-without-repeating", passed: !normalizedBody.includes(normalizedHeadline), details: "Body does not repeat the full headline." },
    { id: "global+VC-016+DG+SM-output-bans", passed: banFindings.length === 0, details: banFindings.length ? banFindings : "No prohibited match." },
    { id: "DG-R2-register", passed: register.passed, details: register.details },
    { id: "DG-R3-no-slogan-or-restatement-closer", passed: !closerSlogan && !normalizedHeadline.includes(closer.replace(/[^\p{L}\p{N}\s]/gu, "").trim()), details: closerSlogan ? "Known slogan closer detected." : "No known slogan or full-headline restatement detected." },
    { id: "DG-R4-no-outcome-promise", passed: !outcomePromise, details: outcomePromise ? "Future outcome promise detected." : "No deterministic outcome promise detected." },
    { id: "DG-R7-varied-opener", passed: !fixedOpener, details: fixedOpener ? "Retired fixed body opener detected." : "Body uses a non-fixed opener." },
    { id: "DG-R9-enumerated-instruction-allowed", passed: true, details: enumeratedInstruction ? "One-X/one-Y instruction detected and allowed." : "No enumerated one-X/one-Y instruction present." },
    { id: "B1-L1-time-anchor-max-once", passed: timeAnchors.length <= 1, details: timeAnchors.length ? timeAnchors : "No time-anchor phrase used." },
    { id: "B1-L2-may-inner-states-only", passed: mayFindings.length === 0, details: mayFindings.length ? mayFindings : "Every may clause is an inner state, or may is absent." },
    { id: "B1-L3+L4-headline-group-grammar", passed: headlineGrammar.passed, details: headlineGrammar.details },
    { id: "SM-DG-2-no-diagnostic-history", passed: !/\byou(?:'ve| have) (?:always|never|spent|made yourself|confused)\b/iu.test(`${candidate.headline} ${candidate.body}`), details: "No diagnostic reader-history frame detected." },
    { id: "DG-R11-unhedged-headline", passed: !/\bmay\b/iu.test(candidate.headline), details: /\bmay\b/iu.test(candidate.headline) ? "Headline contains may." : "Headline makes an unhedged claim." },
    { id: "DG-R12-no-time-anchor-opener", passed: timeAnchorOpener.length === 0, details: timeAnchorOpener.length ? timeAnchorOpener : "Body opens inside the scene." },
    { id: "DG-R13-may-max-once", passed: mayCount <= 1, details: `${mayCount} may usage(s)` },
    { id: "DG-R14-scene-not-biographical", passed: biographicalFrames.length === 0, details: biographicalFrames.length ? biographicalFrames : "No biographical anchor detected." },
    { id: "DG-R15-action-repairs-moment", passed: !banFindings.some((finding) => finding.id === "DG-R15"), details: banFindings.filter((finding) => finding.id === "DG-R15") },
    { id: "DG-R16-owner-reserved-construction", passed: !banFindings.some((finding) => finding.id === "DG-R16"), details: banFindings.filter((finding) => finding.id === "DG-R16") },
    { id: "DG-R17-quoted-dialogue-max-one", passed: quotedDialogueLines.length <= 1, details: quotedDialogueLines.length ? quotedDialogueLines : "No quoted-dialogue line used." },
    { id: "DG-R17-quoted-dialogue-earns-place-advisory", passed: true, advisory: true, details: quotedDialogueLines.length === 1 ? "One quoted-dialogue line used; owner review determines whether it earns its place." : "No quoted-dialogue judgment needed." },
    { id: "OWNER-DIRECTIVE-short-blunt-line", passed: !isBatch2(config) || shortBluntLines.length >= 1, details: shortBluntLines.length ? shortBluntLines : "No 2-8 word body sentence found." },
    ...(!config.sceneContextGate?.required ? [{ id: "OWNER-TEST-specificity", passed: !isBatch2(config) || target?.specificityAdvisory || specificity.passed, advisory: Boolean(target?.specificityAdvisory), details: target?.specificityAdvisory ? { measuredPassed: specificity.passed, ...specificity.details } : specificity.details }] : []),
    { id: "OWNER-TEST-morning-read", passed: !isBatch2(config) || morningReadFailures.length === 0, details: morningReadFailures.length ? morningReadFailures : "Every body sentence is 28 words or fewer and avoids semicolons/parentheses." },
    { id: "OWNER-TEST-screenshot", passed: !isBatch2(config) || screenshotLines.length >= 1, details: screenshotLines.length ? screenshotLines : "No candidate body line detected." }
  ]);
  const aphorism = target?.warmthHarvest?.lane === "aphorism-library-theme" && candidate.headline === target.warmthHarvest.text;
  return {
    schemaVersion: 1,
    key,
    passed: blockingChecksPassed(checks),
    allChecksPassed: checks.every((check) => check.passed),
    immutableRawOutput: true,
    revisionsMade: 0,
    ownerPlacementApproval: aphorism ? { required: true, reason: "Owner-canon aphorism used verbatim as headline.", sourceId: target.warmthHarvest.sourceId } : { required: false },
    checks,
    findings: banFindings,
    counts: { headlineWords, headlineSentences: headlineSentences.length, bodyWords, bodySentences: bodySentences.length, instructions, timeAnchors: timeAnchors.length, mayUsages: mayCount, quotedDialogueLines: quotedDialogueLines.length, screenshotCandidateLines: screenshotLines.length }
  };
}

function openerConstruction(body) {
  return (sentences(body)[0]?.toLowerCase().match(/[\p{L}\p{N}’']+/gu) || []).slice(0, 2).join(" ");
}

function batchLint(outputs, { expectedCount = outputs.length, config = null } = {}) {
  const frames = new Map();
  const openers = new Map();
  for (const { key, candidate } of outputs) {
    const opener = openerConstruction(candidate.body);
    if (opener) {
      if (!openers.has(opener)) openers.set(opener, []);
      openers.get(opener).push(key);
    }
    for (const sentence of [candidate.headline, ...sentences(candidate.body)]) {
      const frame = (sentence.toLowerCase().match(/[\p{L}\p{N}’']+/gu) || []).slice(0, 3).join(" ");
      if (!frame) continue;
      if (!frames.has(frame)) frames.set(frame, []);
      frames.get(frame).push(key);
    }
  }
  const repeated = [...frames.entries()].filter(([, keys]) => new Set(keys).size > 2).map(([frame, keys]) => ({ frame, keys }));
  const repeatedOpeners = [...openers.entries()].filter(([, keys]) => new Set(keys).size > 1).map(([frame, keys]) => ({ frame, keys }));
  const specificityResults = config
    ? outputs.map(({ key, candidate }) => ({ key, ...specificitySwapCheck(candidate.body, key, config) }))
    : [];
  const checks = applyLintTiers([
    { id: "batch-output-count", passed: outputs.length === expectedCount, details: `${outputs.length}/${expectedCount} outputs` },
    { id: "DG-R1-recurring-sentence-frame", passed: repeated.length === 0, details: repeated.length ? repeated : "No three-word sentence frame appears in more than two outputs." },
    { id: "DG-R7-opener-variety", passed: repeatedOpeners.length === 0 && openers.size === outputs.length, details: repeatedOpeners.length ? repeatedOpeners : `${openers.size} distinct opener constructions.` },
    ...(config && isBatch2(config) && !config.sceneContextGate?.required ? [{
      id: "OWNER-TEST-specificity-batch",
      passed: specificityResults.every((entry) => config.keys.find((target) => target.key === entry.key)?.specificityAdvisory || entry.passed),
      details: specificityResults
    }] : [])
  ], { batch: true });
  return {
    schemaVersion: 1,
    passed: blockingChecksPassed(checks),
    allChecksPassed: checks.every((check) => check.passed),
    rules: {
      "DG-R1": "A recurring sentence frame may not appear in more than two outputs.",
      "DG-R7": "No body opener construction may repeat within the batch.",
      ...(config && isBatch2(config) && !config.sceneContextGate?.required ? { "OWNER-TEST-specificity": "Every body must match its key profile and fail non-advisory swap profiles; same-target sibling swaps are advisory where configured." } : {})
    },
    checks,
    openerConstructions: outputs.map(({ key, candidate }) => ({ key, frame: openerConstruction(candidate.body) })),
    repeatedFrames: repeated,
    repeatedOpeners,
    specificityResults
  };
}

function normalizeUsage(usage = {}) {
  const inputDetails = usage.input_tokens_details || {};
  const outputDetails = usage.output_tokens_details || {};
  return {
    inputTokens: Number(usage.input_tokens || 0),
    cachedInputTokens: Number(inputDetails.cached_tokens || 0),
    cacheWriteTokens: Number(inputDetails.cache_write_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    reasoningTokens: Number(outputDetails.reasoning_tokens || 0),
    totalTokens: Number(usage.total_tokens || 0)
  };
}

function estimateCost(usage, config = readJson(configPath)) {
  const price = usage.inputTokens > config.pricing.shortContextMaximumInputTokens ? config.pricing.longContext : config.pricing.shortContext;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (uncached * price.input + usage.cachedInputTokens * price.cachedInput + usage.cacheWriteTokens * price.cacheWrite + usage.outputTokens * price.output) / 1_000_000;
}

function outputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || []).flatMap((item) => item.content || []).map((item) => item.text).filter(Boolean).join("\n");
}

function loadLocalEnv() {
  for (const candidate of [path.join(repoRoot, "apps", "web", ".env.local"), path.join(repoRoot, ".env.local")]) {
    if (!fs.existsSync(candidate)) continue;
    for (const line of fs.readFileSync(candidate, "utf8").split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key] !== undefined) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (/^["'].*["']$/u.test(value)) value = value.slice(1, -1);
      process.env[key] = value;
    }
    return;
  }
}

module.exports = {
  batch1ConfigPath,
  batch2ConfigPath,
  batch3ConfigPath,
  batchLint,
  applyLintTiers,
  blockingChecksPassed,
  buildPacket: compileDailyPacket,
  compileDailyPacket,
  configPath,
  estimateCost,
  lintTextAgainstBans,
  lintOutput,
  lintTierForRule,
  loadLocalEnv,
  normalizeUsage,
  outputBanRules,
  outputText,
  packetLint,
  parseOutput,
  readJson,
  renderModelInput,
  servingLintPolicyPath,
  sha256,
  wordCount
};
