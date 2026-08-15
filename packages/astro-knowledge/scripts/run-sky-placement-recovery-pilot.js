#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { callOpenAIResponses } = require("../../../src/astro-writing/openAIResponses.cjs");
const { lintArticle, lintBatchRepetition } = require("./lint-placement-voice.js");
const { resolveWriterCandidate } = require("./sky-placement-writer-runtime.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const reviewRoot = path.join(repoRoot, "packages", "astro-knowledge", "review", "sky-placement-recovery");
const outputRoot = path.join(reviewRoot, "pilot-rerun-2026-08-14");
const manifestPath = path.join(reviewRoot, "PILOT-EVIDENCE-PACKETS.json");
const evidenceIndexPath = path.join(repoRoot, "packages", "astro-knowledge", "review", "writing-pipeline-v3", "shared-evidence-index-v1.json");
const approvedRowsPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "sky-placement-owner-approved-fallbacks-v1.json");
const cycleFactsPath = path.join(repoRoot, "packages", "astro-knowledge", "data", "modifiers", "planet-cycle-facts.json");

const targets = [
  { planet: "jupiter", sign: "aries", tier: "A" },
  { planet: "uranus", sign: "taurus", tier: "B" },
  { planet: "pluto", sign: "capricorn", tier: "C" }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function title(value) {
  return String(value).split("-").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(" ");
}

function unquote(value) {
  const trimmed = value.trim();
  return /^['"].*['"]$/u.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
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
      process.env[key] = unquote(trimmed.slice(separator + 1));
    }
    return;
  }
}

function outputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || []).flatMap((item) => item.content || []).map((item) => item.text).filter(Boolean).join("\n");
}

function parseCard(raw) {
  const cleaned = String(raw || "").trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const card = JSON.parse(cleaned);
  const expected = ["tagline", "hook", "lived", "turn"];
  if (Object.keys(card).sort().join("|") !== expected.sort().join("|")) throw new Error("Writer output must contain exactly tagline, hook, lived, and turn.");
  for (const slot of expected) if (typeof card[slot] !== "string" || !card[slot].trim()) throw new Error(`Writer output has an invalid ${slot}.`);
  return Object.fromEntries(expected.map((slot) => [slot, card[slot].trim()]));
}

function countSentences(text) {
  return (String(text).match(/[^.!?]+[.!?]+/gu) || []).length;
}

function extraShapeChecks(card) {
  const wordCount = Object.values(card).join(" ").split(/\s+/u).filter(Boolean).length;
  const nonAscii = Object.values(card).join(" ").match(/[^\x00-\x7F]/gu) || [];
  const failures = [];
  const taglineWords = card.tagline.split(/\s+/u).filter(Boolean).length;
  if (taglineWords < 6 || taglineWords > 18) failures.push({ rule: "tagline-6-to-18-words", actual: taglineWords });
  if (countSentences(card.tagline) !== 1) failures.push({ rule: "tagline-clear-full-sentence", actual: countSentences(card.tagline) });
  if (countSentences(card.hook) < 2 || countSentences(card.hook) > 4) failures.push({ rule: "hook-2-to-4-sentences", actual: countSentences(card.hook) });
  if (countSentences(card.lived) < 2 || countSentences(card.lived) > 4) failures.push({ rule: "lived-2-to-4-sentences", actual: countSentences(card.lived) });
  if (countSentences(card.turn) < 2 || countSentences(card.turn) > 5) failures.push({ rule: "turn-2-to-5-sentences", actual: countSentences(card.turn) });
  const turnSentences = String(card.turn).match(/[^.!?]+[.!?]+/gu) || [];
  const finalWords = (turnSentences.at(-1) || "").trim().split(/\s+/u).filter(Boolean).length;
  if (finalWords >= 22) failures.push({ rule: "final-sentence-under-22-words", actual: finalWords });
  let shortEndingRun = 0;
  for (let index = turnSentences.length - 1; index >= 0; index -= 1) {
    if (turnSentences[index].trim().split(/\s+/u).filter(Boolean).length <= 11) shortEndingRun += 1;
    else break;
  }
  if (shortEndingRun >= 3) failures.push({ rule: "no-stacked-short-ending", actual: shortEndingRun });
  if (nonAscii.length) failures.push({ rule: "ascii-only", actual: [...new Set(nonAscii)] });
  const threeItemLists = countThreeItemLists(card);
  if (threeItemLists.count > 0) failures.push({ rule: "no-three-item-lists", actual: threeItemLists.count, matches: threeItemLists.matches });
  return { wordCount, targetWordCount: "roughly 250", finalSentenceWords: finalWords, shortEndingRun, threeItemLists, failures, passed: failures.length === 0 };
}

function countThreeItemLists(card) {
  const text = Object.values(card).join("\n");
  const matches = [];
  for (const sentence of text.match(/[^.!?]+[.!?]+/gu) || []) {
    const match = sentence.match(/\b([^,.;:!?]{1,60}),\s+([^,.;:!?]{1,60}),\s+(?:and|or)\s+([^,.;:!?]{1,60})/iu);
    if (match) matches.push(match[0].trim());
  }
  return { count: matches.length, matches };
}

function exactTargetEntries(entries, planet, sign, role) {
  return entries.filter((entry) => entry.planet === planet && entry.sign === sign && entry.role === role);
}

function resolveSelected(entries, planet, sign, role, excerpts) {
  return excerpts.map((excerpt) => {
    const matches = exactTargetEntries(entries, planet, sign, role).filter((entry) => entry.text.startsWith(excerpt));
    if (!matches.length) throw new Error(`${planet}/${sign}: selected ${role} excerpt did not resolve: ${excerpt}`);
    matches.sort((a, b) => String(a.governanceTier).localeCompare(String(b.governanceTier)) || String(a.id).localeCompare(String(b.id)));
    const entry = matches[0];
    return {
      sourceId: entry.id,
      sourcePath: entry.sourcePath,
      contentKey: entry.contentKey,
      governanceTier: entry.governanceTier,
      family: entry.family,
      role,
      text: entry.text
    };
  });
}

function voiceEvidence() {
  const rows = readJson(approvedRowsPath).rows;
  const saturn = rows.find((row) => row.contentKey === "fallback-hook/sky-sign-copy/saturn/capricorn");
  const venus = rows.find((row) => row.contentKey === "fallback-hook/sky-sign-copy/venus/libra");
  if (!saturn || !venus || saturn.review_status !== "approved" || venus.review_status !== "approved") {
    throw new Error("Current owner-approved Saturn/Capricorn and Venus/Libra voice rows are required.");
  }
  const records = [
    [saturn, "opening", saturn.opening.split("\n\n").at(-1)],
    [saturn, "tension", saturn.tension.split("\n\n")[0]],
    [saturn, "development", saturn.development],
    [saturn, "close", saturn.close],
    [venus, "opening", venus.opening.split("\n\n")[0]],
    [venus, "tension", venus.tension],
    [venus, "development", venus.development.split("\n\n")[1]],
    [venus, "close", venus.close]
  ];
  return records.map(([row, slot, text]) => ({
    sourceId: `approved:${row.contentKey}:${slot}`,
    sourcePath: path.relative(repoRoot, approvedRowsPath),
    contentKey: row.contentKey,
    governanceTier: "owner-approved-exact-copy",
    family: "sky-placement-continuous-v2",
    role: "register",
    slot,
    text
  }));
}

function buildPacket(target, manifest, index, cycleFacts) {
  const pageKey = `${target.planet}/${target.sign}`;
  const item = manifest.find((entry) => entry.page_key === pageKey);
  if (!item) throw new Error(`Missing pilot manifest entry for ${pageKey}.`);
  const expected = item.evidence_packet.counts;
  const available = Object.fromEntries(["meaning", "register", "scene", "argument", "phrase"].map((role) => [role, exactTargetEntries(index.entries, target.planet, target.sign, role).length]));
  for (const role of Object.keys(expected)) {
    if (available[role] !== expected[role]) throw new Error(`${pageKey}: ${role} availability ${available[role]} does not match manifest ${expected[role]}.`);
  }
  const selected = {
    meaning: resolveSelected(index.entries, target.planet, target.sign, "meaning", item.evidence_packet.meaning),
    scene: resolveSelected(index.entries, target.planet, target.sign, "scene", item.evidence_packet.scene),
    argument: resolveSelected(index.entries, target.planet, target.sign, "argument", item.evidence_packet.argument),
    register: voiceEvidence()
  };
  const sourceIds = Object.values(selected).flat().map((entry) => entry.sourceId);
  if (!sourceIds.length || !selected.register.length) throw new Error(`${pageKey}: positive sourceIds are empty.`);
  const cycle = cycleFacts.planets[target.planet];
  if (!cycle) throw new Error(`${pageKey}: missing reviewed planet cycle facts.`);
  return {
    schemaVersion: 1,
    target,
    status: "ready_for_one_authorized_writer_call",
    outputStatus: "needs_review",
    evidenceAvailability: available,
    expectedEvidenceAvailability: expected,
    sourceIds,
    selectedEvidence: selected,
    cycleFacts: {
      status: cycleFacts.status,
      sourcePath: path.relative(repoRoot, cycleFactsPath),
      zodiacCircuit: cycle.zodiacCircuit,
      typicalSignStay: cycle.typicalSignStay,
      variabilityNote: cycle.variabilityNote
    },
    exclusions: [
      "July four-slot placement rows: reference-only and not transmitted",
      "Daily evidence: not transmitted as voice evidence",
      "Unapproved generated copy: excluded"
    ],
    unsupportedFactsWithheld: ["calendar dates", "biography", "motives", "specific historical events", "durations beyond the reviewed cycle facts"]
  };
}

function evidenceSection(label, records) {
  return [`## ${label}`, ...records.map((entry) => [
    `SOURCE ID: ${entry.sourceId}`,
    `PATH: ${entry.sourcePath}`,
    `CONTENT KEY: ${entry.contentKey}`,
    `GOVERNANCE: ${entry.governanceTier}`,
    `FAMILY: ${entry.family}`,
    `TEXT: ${entry.text}`
  ].join("\n"))].join("\n\n");
}

function modelInput(packet) {
  const { planet, sign } = packet.target;
  const planetName = title(planet);
  const signName = title(sign);
  const cycleLines = [packet.cycleFacts.typicalSignStay, packet.cycleFacts.zodiacCircuit, packet.cycleFacts.variabilityNote].filter(Boolean).join("; ");
  return `Write one unapproved Current Sky placement CARD for ${planetName} in ${signName}. Return only the JSON object required by the schema.

This is a card, not an article. Aim for roughly 250 words total across exactly four stored slots:
- tagline: one clear full sentence, 6 to 18 words. It must read naturally on first read, not as a compressed slogan.
- hook: 2 to 4 sentences. The first sentence must be a recognizable human situation before astrology is named.
- lived: 2 to 4 sentences. One coherent recognizable middle, not a menu.
- turn: 2 to 5 sentences. Show where the useful impulse goes wrong and where things stand. No moral, assignment, coaching, or blessing. The final sentence must be under 22 words. Do not end on three or more short sentences in a row.

Binding rules:
- The reader meets a situation before the planet. Astrology explains the message after it lands.
- Make the sign carry the substance. This card must be unmistakably ${signName}.
- Use at most one scene or condition per slot.
- Direct address is allowed. The word people is allowed sparingly.
- Use only supported claims. No dates, biography, motives, predictions, or historical events.
- The only allowed timing facts are: ${cycleLines}. Omit timing if it does not earn its place.
- Prefer literal consequence to metaphor. At most one memorable line in the whole card.
- ${planetName} is not a character. It does not ask, want, refuse, teach, invite, dare, or act on its own.
- ASCII only. No em dash, curly quote, or spaced hyphen used as a dash.
- Do not use a rhetorical question opener.
- Do not use structural labels in prose.
- Do not use three-item lists. If a draft contains A, B, and C or A, B, or C, cut it to two items or rewrite it as a sentence. This applies everywhere, including clauses joined by commas.
- Do not use textbook scaffolding such as "This placement", "This transit", or "${planetName} in ${signName} describes" to introduce meaning.
- The turn must conclude in ordinary words. It must not summarize planet keywords plus sign keywords.
- New copy cannot claim any legacy exception.
- Do not imitate sentence structure from the excluded July copy.

Known July failure to avoid for this target:
${planet === "jupiter" ? "No rhetorical question opener. Do not make Jupiter dare the reader or act like a character." : planet === "uranus" ? "Do not hide behind phrases such as shaking the base of what feels solid. Name the literal shift and who notices." : "Do not use slow-burn, tightening-grip, or control-as-cage personification."}
${planet === "pluto" ? "A strong prior generated line, supplied as diagnostic direction rather than owner voice evidence, was: 'Your complaint enters that chain of command, receives a case number, and closes without changing the policy. The review protects the rule from the complaint.' Keep that level of literal consequence. Do not copy its seven three-item-list constructions or its abstract turn." : ""}

Use evidence by role:
- MEANING establishes the astrology. Do not copy its register automatically.
- SCENE supplies permitted concrete material. Do not stack its alternatives.
- ARGUMENT supplies candidate tensions. Choose one.
- REGISTER is current owner-approved Sky Placement prose. It is the sole voice model. Learn its directness, causal movement, concrete costs, and sentence rhythm. Do not copy its facts or situations into this target.

${evidenceSection("MEANING EVIDENCE", packet.selectedEvidence.meaning)}

${evidenceSection("SCENE EVIDENCE", packet.selectedEvidence.scene)}

${evidenceSection("ARGUMENT EVIDENCE", packet.selectedEvidence.argument)}

${evidenceSection("REGISTER EVIDENCE", packet.selectedEvidence.register)}

Before returning JSON, silently verify the slot sentence counts, ASCII, literal meaning, planet/sign specificity, and absence of unsupported facts. Do not explain your work.`;
}

function renderCard(card, target) {
  return `# ${title(target.planet)} in ${title(target.sign)}\n\n## ${card.tagline}\n\n${card.hook}\n\n${card.lived}\n\n${card.turn}\n`;
}

async function makeCall(packet, release) {
  const prompt = modelInput(packet);
  const request = {
    model: release.model,
    input: prompt,
    reasoning: { effort: release.reasoningEffort },
    max_output_tokens: 16000,
    text: {
      format: {
        type: "json_schema",
        name: "sky_placement_recovery_card",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["tagline", "hook", "lived", "turn"],
          properties: {
            tagline: { type: "string", maxLength: 240 },
            hook: { type: "string", maxLength: 900 },
            lived: { type: "string", maxLength: 1400 },
            turn: { type: "string", maxLength: 1000 }
          }
        }
      }
    }
  };
  const result = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "WRITER",
    request,
    taskInstructions: "This request is the owner-authorized sky-placement-recovery card pilot. Its supplied four-slot task contract overrides article-shaped defaults. Do not produce an article, moves list, or extra fields."
  });
  return { ...result, prompt };
}

async function main() {
  const planOnly = process.argv.includes("--plan");
  const live = process.argv.includes("--authorize-live");
  if (planOnly === live) throw new Error("Choose exactly one of --plan or --authorize-live.");
  const manifest = readJson(manifestPath);
  const index = readJson(evidenceIndexPath);
  const cycleFacts = readJson(cycleFactsPath);
  const packets = targets.map((target) => buildPacket(target, manifest, index, cycleFacts));
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const packet of packets) {
    const pageDir = path.join(outputRoot, `${packet.target.planet}-${packet.target.sign}`);
    writeJson(path.join(pageDir, "packet.json"), packet);
    fs.writeFileSync(path.join(pageDir, "model-input.md"), modelInput(packet), "utf8");
  }
  writeJson(path.join(outputRoot, "PLAN.json"), {
    status: planOnly ? "validated_no_calls" : "live_run_started",
    targets,
    plannedCalls: { writer: 3, readerJudge: 0, total: 3 },
    note: "Reader Judge is not run because it would require a second billed call per page, which is not authorized."
  });
  if (planOnly) {
    process.stdout.write(`${JSON.stringify({ status: "validated_no_calls", outputRoot, packets: packets.map((packet) => ({ target: packet.target, counts: packet.evidenceAvailability, sourceIds: packet.sourceIds })) }, null, 2)}\n`);
    return;
  }

  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const release = resolveWriterCandidate();
  if (release.provider !== "openai" || release.model !== "gpt-5.6-sol" || release.reasoningEffort !== "xhigh") {
    throw new Error(`Unexpected writer route: ${release.provider}/${release.model}/${release.reasoningEffort}.`);
  }
  const results = [];
  for (const packet of packets) {
    const pageDir = path.join(outputRoot, `${packet.target.planet}-${packet.target.sign}`);
    const startedAt = new Date().toISOString();
    let callUsage = null;
    try {
      const { response, payload, prompt } = await makeCall(packet, release);
      callUsage = payload.usage || null;
      const providerRecord = {
        responseId: payload.id || null,
        httpStatus: response.status,
        status: payload.status || null,
        incompleteDetails: payload.incomplete_details || null,
        model: payload.model || null,
        reasoning: payload.reasoning || null,
        usage: payload.usage || null,
        outputText: outputText(payload)
      };
      writeJson(path.join(pageDir, "writer-provider-response.json"), providerRecord);
      if (!response.ok) throw new Error(payload.error?.message || `OpenAI request failed with HTTP ${response.status}.`);
      if (payload.status !== "completed") throw new Error(`OpenAI response status was ${payload.status}: ${payload.incomplete_details?.reason || "unknown"}.`);
      if ((payload.model || release.model) !== release.model) throw new Error(`Provider model mismatch: ${payload.model}.`);
      const card = parseCard(outputText(payload));
      const lint = lintArticle({ ...card, planet: packet.target.planet, sign: packet.target.sign, factContext: packet.cycleFacts });
      const shape = extraShapeChecks(card);
      const rendered = renderCard(card, packet.target);
      writeJson(path.join(pageDir, "draft.json"), { status: "needs_review", ownerApproved: false, renderEligible: false, card });
      writeJson(path.join(pageDir, "lint.json"), { placementLint: lint, pilotShapeChecks: shape });
      fs.writeFileSync(path.join(pageDir, "RENDERED-CARD.md"), rendered, "utf8");
      const result = {
        target: packet.target,
        status: "needs_review",
        ownerApproved: false,
        stamped: false,
        servingChanged: false,
        calls: { writer: 1, readerJudge: 0, total: 1 },
        readerJudge: { status: "not_run", advisory: true, reason: "No additional billed call was authorized; the one-call-per-page cap was preserved." },
        routing: { releaseId: release.releaseId, model: payload.model || release.model, reasoningEffort: payload.reasoning?.effort || release.reasoningEffort, laneId: release.laneId },
        usage: payload.usage || null,
        startedAt,
        completedAt: new Date().toISOString(),
        retrieval: { countsByRole: packet.evidenceAvailability, sourceIds: packet.sourceIds, voiceEvidence: packet.selectedEvidence.register },
        unsupportedFactsWithheld: packet.unsupportedFactsWithheld,
        card,
        rendered,
        lint: { score: lint.score, fails: lint.fails, warns: lint.warns, findings: lint.findings, notes: lint.notes, auditValid: lint.auditValid, pilotShapeChecks: shape }
      };
      result.mechanicalChecksPassed = lint.auditValid && lint.score === 3 && shape.passed;
      writeJson(path.join(pageDir, "result.json"), result);
      results.push(result);
    } catch (error) {
      const failure = {
        target: packet.target,
        status: "failed_no_retry",
        calls: { writer: 1, readerJudge: 0, total: 1 },
        usage: callUsage,
        startedAt,
        completedAt: new Date().toISOString(),
        error: error.message
      };
      writeJson(path.join(pageDir, "result.json"), failure);
      results.push(failure);
    }
  }
  const successful = results.filter((result) => result.status === "needs_review");
  const batchRepetition = lintBatchRepetition(successful.map((result) => ({ id: `${result.target.planet}/${result.target.sign}`, article: result.card })));
  const usage = results.reduce((total, result) => {
    for (const key of ["input_tokens", "output_tokens", "total_tokens"]) total[key] += Number(result.usage?.[key] || 0);
    total.reasoning_tokens += Number(result.usage?.output_tokens_details?.reasoning_tokens || result.usage?.reasoning_tokens || 0);
    return total;
  }, { input_tokens: 0, output_tokens: 0, reasoning_tokens: 0, total_tokens: 0 });
  const runRecord = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    status: results.every((result) => result.status === "needs_review")
      ? results.every((result) => result.mechanicalChecksPassed)
        ? "owner_cold_read_required"
        : "owner_cold_read_required_with_mechanical_findings"
      : "completed_with_unretried_failure",
    calls: { writer: 3, readerJudge: 0, total: 3 },
    usage,
    readerJudge: { status: "not_run", reason: "A second billed call per page was not authorized." },
    batchRepetition,
    results
  };
  writeJson(path.join(outputRoot, "RUN-RECORD.json"), runRecord);
  process.stdout.write(`${JSON.stringify({ outputRoot, status: runRecord.status, calls: runRecord.calls, usage, pages: results.map((result) => ({ target: result.target, status: result.status, score: result.lint?.score ?? null, fails: result.lint?.fails ?? null, warns: result.lint?.warns ?? null, error: result.error || null })) }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
