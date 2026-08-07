#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { buildIndex } = require("../../../.agents/skills/marie-satori-writer/scripts/build-voice-index.js");
const {
  eligibleEntries,
  selectSix,
  structureFor
} = require("../../../.agents/skills/marie-satori-writer/scripts/compile-writing-packet.js");
const { resolveWriterCandidate } = require("./sky-placement-writer-runtime.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const defaultOut = path.join(packageRoot, "out", "timing-event-reader-copy-pilot-v1");
const reviewedCandidatesPath = path.join(packageRoot, "review", "timing-event-reader-copy-pilot-v2-feedback.json");
const packetVersion = "timing-event-writer-packet-v1:owner-six-minimal";
const surfaceContract = "current-sky-timing-event-reader-copy-v1";

const targets = [
  {
    id: "sky.station.mercury.pisces.retrograde",
    title: "Mercury stations retrograde in Pisces",
    planet: "mercury",
    sign: "pisces",
    sourceId: "src.timing.mercury.station-retrograde",
    eventFamily: "station",
    eventPhrase: "Mercury stations retrograde in Pisces"
  },
  {
    id: "sky.retrograde.venus.scorpio.retrograde_passage",
    title: "Venus retrograde in Scorpio",
    planet: "venus",
    sign: "scorpio",
    sourceId: "src.timing.venus.retrograde-passage",
    eventFamily: "retrograde",
    eventPhrase: "Venus is retrograde in Scorpio"
  },
  {
    id: "sky.station.chiron.taurus.retrograde",
    title: "Chiron stations retrograde in Taurus",
    planet: "chiron",
    sign: "taurus",
    sourceId: "src.timing.outer.station-retrograde",
    eventFamily: "station",
    eventPhrase: "Chiron stations retrograde in Taurus"
  },
  {
    id: "sky.ingress.jupiter.leo",
    title: "Jupiter enters Leo",
    planet: "jupiter",
    sign: "leo",
    sourceId: "src.timing.jupiter.ingress",
    eventFamily: "ingress",
    eventPhrase: "Jupiter enters Leo"
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function unquote(value) {
  const trimmed = value.trim();
  return /^(["']).*\1$/u.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
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
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

function pointPlacementPath(target) {
  return path.join(packageRoot, "data", "points", "placements", "sign", `${target.planet}-${target.sign}.json`);
}

function placementPath(target) {
  const pointPath = pointPlacementPath(target);
  return fs.existsSync(pointPath)
    ? pointPath
    : path.join(packageRoot, "data", "placements", "sign", `${target.planet}-${target.sign}.json`);
}

function verifiedAstrology(target) {
  const timingPacket = readJson(path.join(packageRoot, "data", "timing", "timing-event-sources-v9.json"));
  const timing = timingPacket.sourceRecords.find((record) => record.id === target.sourceId);
  const mapping = timingPacket.concreteMappings.find((record) => record.readerKey === target.id);
  if (!timing || timing.status !== "REVIEWED" || timing.serving !== false) throw new Error(`Approved timing source missing for ${target.id}`);
  if (!mapping || mapping.readerStatus !== "needs_review" || mapping.serving !== false) throw new Error(`Non-serving mapping missing for ${target.id}`);

  const signs = readJson(path.join(packageRoot, "data", "primitives", "signs.json"));
  const sign = signs.entries.find((entry) => entry.id === target.sign);
  const placementFile = placementPath(target);
  const placement = readJson(placementFile);
  const planetaryFile = path.join(packageRoot, "data", "planetary", `${target.planet}.json`);
  const planetary = fs.existsSync(planetaryFile) ? readJson(planetaryFile) : null;
  const pointMetadata = target.planet === "chiron"
    ? readJson(path.join(packageRoot, "data", "modifiers", "point-metadata.json")).classes.points.chiron
    : null;
  const retrograde = target.eventFamily === "ingress"
    ? null
    : readJson(path.join(packageRoot, "data", "modifiers", "retrograde-planet-meanings.json")).classes.retrogrades[`${target.planet}-retrograde`];

  return {
    event: {
      title: target.title,
      family: target.eventFamily,
      phrase: target.eventPhrase,
      fact: timing.fact,
      scenes: timing.scenes,
      meaning: timing.meaningNote
    },
    planetFunction: planetary?.overview || pointMetadata?.plainTranslation || placement.tldr,
    signExpression: {
      element: sign.element,
      mode: sign.mode,
      ruler: sign.traditionalRuler,
      keywords: sign.keywords
    },
    combinedMeaning: {
      tldr: placement.tldr,
      body: placement.body,
      gift: placement.gift || placement.business || null,
      challenge: placement.challenge || placement.shadow || null
    },
    retrogradeMeaning: retrograde?.plainTranslation || null,
    boundary: [
      "Write collective Current Sky copy, never natal or transit-to-natal advice.",
      "The ephemeris supplies dates, degrees, duration, direction, and exact event times. Do not write them.",
      target.eventFamily === "ingress"
        ? "This is pass-neutral ingress copy. Do not call it an initial ingress, re-entry, return, or final pass."
        : "Do not turn a review period into a prediction that every plan, purchase, promise, or relationship will fail.",
      "Use the sign to describe style and subject only. Do not infer a house or unsupported life domain.",
      "Chiron is an optional modern body, not a planet or a traditional timing factor."
    ]
  };
}

function ownerPassages(index, target) {
  return selectSix(eligibleEntries(index, target), { ...target, beat: "body" }).map((entry) => ({
    sourceId: entry.sourceId,
    sourcePath: entry.sourcePath,
    articleBeat: entry.articleBeat,
    paragraphStructure: structureFor(entry),
    authorityClass: entry.authorityClass,
    text: entry.text
  }));
}

function buildPacket(index, release, target) {
  if (release.provider !== "openai" || release.model !== "gpt-5.6-sol" || release.reasoningEffort !== "xhigh" || release.laneId !== "writer:sky-placement") {
    throw new Error(`Writer route mismatch: ${release.provider}/${release.model}/${release.reasoningEffort}/${release.laneId}`);
  }
  const packet = {
    schemaVersion: 1,
    packetVersion,
    routing: {
      laneId: release.laneId,
      releaseId: release.releaseId,
      requestedModel: release.model,
      requestedReasoningEffort: release.reasoningEffort,
      promptVersion: "timing-event-writer-v1:owner-six+v9-meaning"
    },
    provenance: {
      compositionSourceIds: verifiedAstrologyProvenance(target),
      meaningLayerStatus: "approved",
      readerCopyStatus: "needs_review",
      serving: false
    },
    surface: {
      contractId: surfaceContract,
      output: "One two-paragraph body. The first two complete sentences become the collapsed-card preview.",
      length: "140 to 220 words, normally 7 to 10 sentences.",
      person: "we, someone, a named group, or the actual subject; never generic people or second person",
      hardRules: [
        "Begin with recognizable behavior, a decision, or a consequence.",
        "Make the first two sentences complete, strong, and immediately clear because the card truncates after them.",
        "Build one advancing lived sequence rather than an inventory of examples.",
        "Mention the exact event naturally by the third sentence at the latest.",
        "Use normal English. Do not make an abstract noun perform a human action.",
        "Do not use em dashes, cryptic slogans, advocacy-default subject matter, corporate language, or a second conclusion.",
        "End with the clearest behavioral truth, then stop."
      ]
    },
    verifiedAstrology: verifiedAstrology(target),
    task: `Write one Current Sky timing-event card for ${target.title}. Return only the complete body.`,
    ownerPassages: ownerPassages(index, target)
  };
  validateWritingPacket(packet);
  return packet;
}

function verifiedAstrologyProvenance(target) {
  const timingPacket = readJson(path.join(packageRoot, "data", "timing", "timing-event-sources-v9.json"));
  const mapping = timingPacket.concreteMappings.find((record) => record.readerKey === target.id);
  if (!mapping) throw new Error(`Timing provenance missing for ${target.id}`);
  return mapping.compositionSourceIds;
}

function validateWritingPacket(packet) {
  const passages = packet.ownerPassages;
  if (passages.length !== 6) throw new Error(`Writing packet must contain exactly six owner passages; found ${passages.length}.`);
  if (passages.some((entry) => entry.authorityClass !== "owner_authored_final")) {
    throw new Error("Writing packet contains a non-owner-authored passage.");
  }
  if (new Set(passages.map((entry) => entry.sourcePath)).size < 3) throw new Error("Writing packet needs at least three owner sources.");
  if (new Set(passages.map((entry) => entry.paragraphStructure)).size < 3) throw new Error("Writing packet needs at least three paragraph structures.");
  if (passages.filter((entry) => entry.articleBeat === "body").length < 2) throw new Error("Writing packet needs at least two passages matching the body beat.");
}

function renderModelInput(packet) {
  const passages = packet.ownerPassages
    .map((entry, index) => `OWNER PASSAGE ${index + 1}\n${entry.text}`)
    .join("\n\n");
  return [
    "You are writing one original TLDR Astro Current Sky timing-event card.",
    "Read the six owner-authored Marie Satori passages for sentence register and paragraph movement. Use the verified astrology as the complete meaning boundary.",
    "Make it quotable and immediately clear. Write normal English. Name the pressure, what someone does, and what changes because of it.",
    "The first two sentences are the collapsed-card preview, so they must stand alone without sounding like a summary template.",
    "Do not copy or analyze the owner passages. Do not return options, commentary, a source map, or a style explanation.",
    "Use collective language. Never use people, you, your, yours, yourself, or yourselves.",
    "Return only strict JSON with exactly one key: body.",
    "",
    "VERIFIED ASTROLOGY",
    JSON.stringify(packet.verifiedAstrology, null, 2),
    "",
    "SURFACE REQUIREMENTS",
    JSON.stringify(packet.surface, null, 2),
    "",
    "EXACT TASK",
    packet.task,
    "",
    passages
  ].join("\n");
}

function sentences(body) {
  return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(body)]
    .map((entry) => entry.segment.trim())
    .filter(Boolean);
}

function normalizedWords(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/gu) || [];
}

function sourceOverlap(body, sourceLines, size = 6) {
  const bodyWords = normalizedWords(body);
  const bodyWindows = new Map();
  for (let index = 0; index <= bodyWords.length - size; index += 1) {
    bodyWindows.set(bodyWords.slice(index, index + size).join(" "), index);
  }

  for (const sourceLine of sourceLines) {
    const sourceWords = normalizedWords(sourceLine);
    for (let index = 0; index <= sourceWords.length - size; index += 1) {
      const phrase = sourceWords.slice(index, index + size).join(" ");
      if (bodyWindows.has(phrase)) return phrase;
    }
  }
  return null;
}

function deterministicChecks(target, body, packet) {
  const findings = [];
  const add = (checkId, detail, sentence = "") => findings.push({ checkId, detail, sentence });
  const bodySentences = sentences(body);
  const paragraphs = body.split(/\n\s*\n/u).map((value) => value.trim()).filter(Boolean);
  const words = body.trim().split(/\s+/u).filter(Boolean).length;
  const preview = bodySentences.slice(0, 2).join(" ");
  if (words < 140 || words > 220) add("length", `Expected 140-220 words; found ${words}.`);
  if (paragraphs.length !== 2) add("paragraph-shape", `Expected two paragraphs; found ${paragraphs.length}.`);
  if (bodySentences.length < 7 || bodySentences.length > 10) add("sentence-shape", `Expected 7-10 sentences; found ${bodySentences.length}.`);
  if (!body.startsWith(bodySentences[0] || "") || bodySentences.length < 2) add("preview", "The first two complete sentences could not be derived as a body prefix.");
  const prohibited = body.match(/\b(?:you|your|yours|yourself|yourselves|people)\b/iu);
  if (prohibited) add("current-sky-person", `Prohibited Current Sky term: ${prohibited[0]}.`);
  if (body.includes("—")) add("em-dash", "Em dash is prohibited.");
  const movingFact = body.match(/(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b|\b\d{4}\b|\d+°|\b(?:until|through)\s+(?:tomorrow|next\s+(?:week|month|year)|the\s+end\s+of))/u);
  if (movingFact) add("timing-fact-leak", `Moving fact belongs to the ephemeris: ${movingFact[0]}.`);
  const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(body);
  const eventNamedByThird = bodySentences.slice(0, 3).join(" ");
  if (!new RegExp(`\\b${target.planet}\\b`, "iu").test(eventNamedByThird) || !new RegExp(`\\b${target.sign}\\b`, "iu").test(eventNamedByThird)) {
    add("event-not-grounded", "Planet and sign must appear by the third sentence.");
  }
  if (
    target.eventFamily === "station"
    && !/(?:station(?:s|ing|ed)?\s+retrograde|slows?\s+to\s+a\s+stop[^.]*?(?:starts?\s+moving\s+backward|revers))/iu.test(eventNamedByThird)
  ) add("event-not-grounded", "Station-retrograde action is missing by sentence three.");
  if (target.eventFamily === "retrograde" && !/retrograde/iu.test(eventNamedByThird)) add("event-not-grounded", "Retrograde passage is missing by sentence three.");
  if (target.eventFamily === "ingress" && !/(?:enters?|moves? into|in)\s+Leo/iu.test(eventNamedByThird)) add("event-not-grounded", "Ingress is missing by sentence three.");
  if (target.eventFamily === "ingress") {
    const passClaim = body.match(/\b(?:initial|first pass|final pass|re-?entry|returns? to|back into)\b/iu);
    if (passClaim) add("pass-type-invention", `Pass type is not calculated: ${passClaim[0]}.`);
  }
  if (/\b(?:right now|this energy|trust the process|the universe|alignment|delve|holistic)\b/iu.test(body)) add("banned-register", "Banned or generic editorial register detected.");
  const overlap = sourceOverlap(body, [
    packet.verifiedAstrology.event.fact,
    packet.verifiedAstrology.event.meaning
  ]);
  if (overlap) {
    const overlapSentence = bodySentences.find((sentence) => normalizedWords(sentence).join(" ").includes(overlap)) || "";
    add("source-record-overlap", `Reader copy repeats six or more source-record words: ${overlap}.`, overlapSentence);
  }
  return {
    passed: findings.length === 0 && !secondPerson,
    wordCount: words,
    sentenceCount: bodySentences.length,
    paragraphCount: paragraphs.length,
    preview,
    findings
  };
}

function applyBatchScaffoldChecks(cards) {
  const prefixes = new Map();
  for (const card of cards) {
    for (const sentence of sentences(card.body)) {
      const words = normalizedWords(sentence);
      if (words.length < 3) continue;
      const prefix = words.slice(0, 3).join(" ");
      const entries = prefixes.get(prefix) || [];
      entries.push({ card, sentence });
      prefixes.set(prefix, entries);
    }
  }

  for (const [prefix, entries] of prefixes) {
    if (new Set(entries.map((entry) => entry.card.id)).size < 2) continue;
    for (const { card, sentence } of entries) {
      if (card.deterministicChecks.findings.some((finding) => finding.checkId === "batch-scaffold" && finding.detail.includes(prefix))) continue;
      card.deterministicChecks.findings.push({
        checkId: "batch-scaffold",
        detail: `Sentence scaffold is repeated across the batch: ${prefix}.`,
        sentence
      });
      card.deterministicChecks.passed = false;
    }
  }
}

function parseWriter(raw) {
  const text = String(raw || "").trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const value = JSON.parse(text);
  if (Object.keys(value).join("|") !== "body" || typeof value.body !== "string" || !value.body.trim()) {
    throw new Error("Writer response must contain exactly one non-empty body field.");
  }
  return value.body.trim();
}

async function openAi(requestBody) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI request failed with ${response.status}.`);
  if (payload.status !== "completed") throw new Error(`OpenAI response was ${payload.status || "not completed"}.`);
  return payload;
}

function judgePrompt(cards) {
  return [
    "Judge four untouched TLDR Astro Current Sky timing-event cards. Do not rewrite, approve, or promote them.",
    "Score 3 when the card is immediately clear, natural, event-specific, concrete, and recognizably Marie Satori in sentence movement.",
    "Score 2 for one localized editorial weakness. Score 1 when a central sentence requires decoding, the astrology drifts, the event could be swapped, or the prose is flat or templated.",
    "Technically grammatical slogans fail natural English when their subject, action, or causal meaning requires interpretation.",
    "Every failed check requires one exact offending sentence copied from that card and one concise rationale. Evidence checkId values must exactly match failedChecks. If there is no failed check, return empty failedChecks and evidence arrays.",
    "At batch level, fail cross-card-scaffold when two cards reuse the same sentence scaffold or close with the same maxim formula. Cite the exact sentence on every affected card.",
    "Allowed check IDs: natural-english, astrology-drift, current-sky-person, scene-shape, timing-fact-leak, pass-type-invention, stacked-ending, generic-swap, flat-voice, cross-card-scaffold.",
    "",
    "CARDS AND DETERMINISTIC RESULTS",
    JSON.stringify(cards.map((card) => ({ id: card.id, title: card.title, body: card.body, deterministicChecks: card.deterministicChecks })), null, 2)
  ].join("\n");
}

function validateJudgeEvidence(card, review) {
  const failures = [];
  const allowedChecks = new Set(["natural-english", "astrology-drift", "current-sky-person", "scene-shape", "timing-fact-leak", "pass-type-invention", "stacked-ending", "generic-swap", "flat-voice", "cross-card-scaffold"]);
  const failed = new Set(review.failedChecks || []);
  const evidence = Array.isArray(review.evidence) ? review.evidence : [];
  if ((review.score === 3) !== (failed.size === 0)) failures.push("score-failure contradiction");
  if (review.score < 3 && failed.size === 0) failures.push("missing failedChecks");
  if (review.score === 3 && review.verdict !== "in-voice") failures.push("score-verdict contradiction");
  if (review.score === 2 && review.verdict !== "borderline") failures.push("score-verdict contradiction");
  if (review.score === 1 && review.verdict !== "off-voice") failures.push("score-verdict contradiction");
  for (const checkId of failed) {
    if (!allowedChecks.has(checkId)) failures.push(`unsupported failed check ${checkId}`);
    const matches = evidence.filter((entry) => entry.checkId === checkId);
    if (matches.length !== 1) failures.push(`missing or duplicate evidence for ${checkId}`);
  }
  for (const item of evidence) {
    if (!failed.has(item.checkId)) failures.push(`evidence ID ${item.checkId} is not failed`);
    if (!item.sentence || !card.body.includes(item.sentence)) failures.push(`evidence sentence is not exact for ${item.checkId}`);
  }
  return { valid: failures.length === 0, failures };
}

function reviewMarkdown(cards, writer, judge) {
  const pilotVersion = cards.some((card) => card.revision) ? "V2" : "V1";
  const ownerApproved = cards.every((card) => card.ownerApproved === true);
  const sections = cards.map((card, index) => [
    `## ${index + 1}. ${card.title}`,
    "",
    `Key: \`${card.id}\``,
    "",
    card.body,
    "",
    `Collapsed-card preview: ${card.preview}`,
    "",
    `Deterministic checks: ${card.deterministicChecks.passed ? "pass" : "review required"}. Judge: ${card.judge?.score ?? "n/a"}/3 (${card.judge?.verdict ?? "not run"}).`,
    card.judge?.rationale ? `Judge rationale: ${card.judge.rationale}` : ""
  ].filter(Boolean).join("\n")).join("\n\n---\n\n");
  return [
    `# Timing-event reader-copy pilot ${pilotVersion}`,
    "",
    `Status: \`${ownerApproved ? "approved" : "needs_review"}\`. Serving: \`false\`. Owner approval: \`${ownerApproved}\`. Promotion authorized: \`false\`.`,
    "",
    `Writer route: ${writer.model} / ${writer.reasoningEffort}. Judge route: ${judge.model} / ${judge.reasoningEffort}.`,
    "The copy contains no generated dates, degrees, or event windows. Those remain ephemeris facts.",
    "",
    sections,
    "",
    ownerApproved ? "## Approval boundary" : "## Review decision requested",
    "",
    ownerApproved
      ? "The owner approved these exact four bodies. This does not authorize reader import, serving, calendar wiring, or production promotion."
      : "Review the exact wording of each card. Meaning-layer approval does not approve any of this reader copy."
  ].join("\n");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const plan = args.has("--plan");
  const authorizeLive = args.has("--authorize-live");
  const judgeExisting = args.has("--judge-existing");
  const assembleExisting = args.has("--assemble-existing");
  const assembleReviewed = args.has("--assemble-reviewed");
  if ([plan, authorizeLive, judgeExisting, assembleExisting, assembleReviewed].filter(Boolean).length !== 1) {
    throw new Error("Choose exactly one of --plan, --authorize-live, --judge-existing, --assemble-existing, or --assemble-reviewed.");
  }
  const outArg = process.argv.find((value) => value.startsWith("--out="));
  const outDir = outArg ? path.resolve(outArg.slice(6)) : defaultOut;
  const index = buildIndex();
  const writer = resolveWriterCandidate();
  const judge = {
    ...writer,
    laneId: "judge:sky-placement:sol-owner-authorized",
    authorization: "owner-explicit-sol-generation-and-judging"
  };
  if (judge.provider !== "openai" || judge.model !== "gpt-5.6-sol" || judge.reasoningEffort !== "xhigh") {
    throw new Error(`Judge route mismatch: ${judge.provider}/${judge.model}/${judge.reasoningEffort}/${judge.laneId}`);
  }

  const packets = targets.map((target) => ({ target, packet: buildPacket(index, writer, target) }));
  for (const { target, packet } of packets) {
    const packetDir = path.join(outDir, "packets", target.id);
    writeJson(path.join(packetDir, "packet.json"), packet);
    fs.writeFileSync(path.join(packetDir, "model-input.md"), renderModelInput(packet), "utf8");
  }
  writeJson(path.join(outDir, "_plan.json"), {
    schemaVersion: 1,
    status: "needs_review",
    serving: false,
    calls: { writer: targets.length, judge: 1, total: targets.length + 1 },
    writer: { releaseId: writer.releaseId, model: writer.model, reasoningEffort: writer.reasoningEffort, laneId: writer.laneId },
    judge: { releaseId: judge.releaseId, model: judge.model, reasoningEffort: judge.reasoningEffort, laneId: judge.laneId, authorization: judge.authorization },
    targets: targets.map((target) => target.id)
  });
  if (plan) {
    console.log(`Timing-event pilot plan compiled at ${path.relative(repoRoot, outDir)}. No model call was made.`);
    return;
  }

  if (authorizeLive || judgeExisting) {
    loadLocalEnv();
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  }
  const reviewedCandidates = assembleReviewed ? readJson(reviewedCandidatesPath) : null;
  const cards = [];
  for (const { target, packet } of packets) {
    let payload;
    const originalCardPath = path.join(defaultOut, `${target.id}.json`);
    const originalCard = assembleReviewed && fs.existsSync(originalCardPath)
      ? readJson(originalCardPath)
      : null;
    if (judgeExisting || assembleExisting || assembleReviewed) {
      const savedRoot = assembleReviewed ? defaultOut : outDir;
      const savedPath = path.join(savedRoot, `${target.id}.writer-provider-response.json`);
      if (!fs.existsSync(savedPath)) throw new Error(`Saved writer response missing for ${target.id}.`);
      payload = readJson(savedPath);
    } else {
      payload = await openAi({
        model: writer.model,
        input: renderModelInput(packet),
        reasoning: { effort: writer.reasoningEffort },
        max_output_tokens: 5000,
        text: {
          format: {
            type: "json_schema",
            name: "timing_event_card",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["body"],
              properties: { body: { type: "string", minLength: 500, maxLength: 1800 } }
            }
          }
        }
      });
    }
    const actualModel = payload.model || writer.model;
    const actualEffort = payload.reasoning?.effort || writer.reasoningEffort;
    if (actualModel !== writer.model || actualEffort !== writer.reasoningEffort) throw new Error(`Writer routing mismatch for ${target.id}.`);
    const writerOutput = typeof payload.outputText === "string" ? payload.outputText : outputText(payload);
    const reviewedBody = reviewedCandidates?.cards?.find((entry) => entry.id === target.id)?.body;
    const body = assembleReviewed
      ? String(reviewedBody || "").trim()
      : parseWriter(writerOutput);
    if (!body) throw new Error(`Reviewed body missing for ${target.id}.`);
    const checks = deterministicChecks(target, body, packet);
    const card = {
      schemaVersion: 1,
      id: target.id,
      title: target.title,
      status: assembleReviewed && reviewedCandidates?.ownerApproved === true ? "approved" : "needs_review",
      serving: false,
      ownerApproved: assembleReviewed && reviewedCandidates?.ownerApproved === true,
      promotionAuthorized: false,
      canonical: false,
      body,
      preview: checks.preview,
      sourceId: target.sourceId,
      writer: originalCard?.writer || {
        responseId: payload.id || payload.responseId || null,
        releaseId: writer.releaseId,
        model: actualModel,
        reasoningEffort: actualEffort,
        laneId: writer.laneId,
        packetVersion,
        promptVersion: packet.routing.promptVersion,
        retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
        usage: payload.usage || null
      },
      ...(assembleReviewed ? {
        revision: {
          source: path.relative(packageRoot, reviewedCandidatesPath).replaceAll(path.sep, "/"),
          reviewClass: reviewedCandidates?.ownerApproved === true
            ? "exact_owner_approved"
            : "directional_feedback_not_exact_approval",
          originalWriterResponseId: payload.id || payload.responseId || null
        }
      } : {}),
      deterministicChecks: checks
    };
    if (!judgeExisting && !assembleExisting && !assembleReviewed) {
      writeJson(path.join(outDir, `${target.id}.writer-provider-response.json`), {
        responseId: payload.id || null,
        status: payload.status,
        model: payload.model,
        reasoning: payload.reasoning,
        usage: payload.usage,
        outputText: writerOutput
      });
    }
    cards.push(card);
  }
  applyBatchScaffoldChecks(cards);

  if (assembleExisting || assembleReviewed) {
    for (const card of cards) {
      card.judge = {
        score: null,
        verdict: "not_run",
        failedChecks: [],
        evidence: [],
        rationale: assembleReviewed
          ? "This revised wording has not received a completed judge response. The judge-only retry remains blocked because the OpenAI account has no credits remaining."
          : "The first judge response was incomplete. The judge-only retry was blocked because the OpenAI account had no credits remaining.",
        evidenceStatus: "human_review_required",
        evidenceFailures: ["no completed judge response"],
        model: judge.model,
        reasoningEffort: judge.reasoningEffort,
        laneId: judge.laneId,
        responseId: null
      };
      writeJson(path.join(outDir, `${card.id}.json`), card);
    }
    const blockedSummary = {
      schemaVersion: 1,
      status: assembleReviewed && reviewedCandidates?.ownerApproved === true ? "approved" : "needs_review",
      serving: false,
      ownerApproved: assembleReviewed && reviewedCandidates?.ownerApproved === true,
      promotionAuthorized: false,
      canonical: false,
      generatedAt: new Date().toISOString(),
      calls: { writer: cards.length, writerCallsThisRun: 0, judgeAttempts: 2, completedJudgeCalls: 0, totalApiAttempts: cards.length + 2 },
      writer: assembleReviewed
        ? cards[0]?.writer || { releaseId: writer.releaseId, model: writer.model, reasoningEffort: writer.reasoningEffort, laneId: writer.laneId }
        : { releaseId: writer.releaseId, model: writer.model, reasoningEffort: writer.reasoningEffort, laneId: writer.laneId },
      judge: {
        releaseId: judge.releaseId,
        model: judge.model,
        reasoningEffort: judge.reasoningEffort,
        laneId: judge.laneId,
        authorization: judge.authorization,
        status: "blocked_no_credits"
      },
      cards: cards.map((card) => ({
        id: card.id,
        deterministicPassed: card.deterministicChecks.passed,
        judgeScore: null,
        judgeVerdict: "not_run",
        judgeEvidenceStatus: "human_review_required"
      }))
    };
    writeJson(path.join(outDir, "_summary.json"), blockedSummary);
    const reviewFileName = assembleReviewed
      ? "TLDR-Timing-Event-Reader-Copy-Pilot-V2-REVIEW.md"
      : "TLDR-Timing-Event-Reader-Copy-Pilot-V1-REVIEW.md";
    const reviewWriter = assembleReviewed ? cards[0]?.writer || writer : writer;
    fs.writeFileSync(path.join(outDir, reviewFileName), `${reviewMarkdown(cards, reviewWriter, judge)}\n`, "utf8");
    console.log(JSON.stringify(blockedSummary, null, 2));
    return;
  }

  const judgePayload = await openAi({
    model: judge.model,
    input: judgePrompt(cards),
    reasoning: { effort: judge.reasoningEffort },
    max_output_tokens: 12000,
    text: {
      format: {
        type: "json_schema",
        name: "timing_event_pilot_review",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["reviews"],
          properties: {
            reviews: {
              type: "array",
              minItems: targets.length,
              maxItems: targets.length,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "score", "verdict", "failedChecks", "evidence", "rationale"],
                properties: {
                  id: { type: "string" },
                  score: { type: "integer", minimum: 1, maximum: 3 },
                  verdict: { type: "string", enum: ["in-voice", "borderline", "off-voice"] },
                  failedChecks: { type: "array", items: { type: "string" } },
                  evidence: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["checkId", "sentence"],
                      properties: { checkId: { type: "string" }, sentence: { type: "string" } }
                    }
                  },
                  rationale: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  });
  const judgeActualModel = judgePayload.model || judge.model;
  const judgeActualEffort = judgePayload.reasoning?.effort || judge.reasoningEffort;
  if (judgeActualModel !== judge.model || judgeActualEffort !== judge.reasoningEffort) throw new Error("Judge routing mismatch.");
  const judgeResult = JSON.parse(outputText(judgePayload));
  for (const card of cards) {
    const review = judgeResult.reviews.find((entry) => entry.id === card.id);
    if (!review) {
      card.judge = { evidenceStatus: "human_review_required", failures: ["missing review"] };
      continue;
    }
    const evidenceValidation = validateJudgeEvidence(card, review);
    card.judge = {
      ...review,
      evidenceStatus: evidenceValidation.valid ? "validated" : "human_review_required",
      evidenceFailures: evidenceValidation.failures,
      model: judgeActualModel,
      reasoningEffort: judgeActualEffort,
      laneId: judge.laneId,
      responseId: judgePayload.id || null
    };
    writeJson(path.join(outDir, `${card.id}.json`), card);
  }
  writeJson(path.join(outDir, "_judge-provider-response.json"), {
    responseId: judgePayload.id || null,
    status: judgePayload.status,
    model: judgePayload.model,
    reasoning: judgePayload.reasoning,
    usage: judgePayload.usage,
    outputText: outputText(judgePayload)
  });
  const summary = {
    schemaVersion: 1,
    status: "needs_review",
    serving: false,
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    generatedAt: new Date().toISOString(),
    calls: {
      writer: cards.length,
      writerCallsThisRun: judgeExisting ? 0 : cards.length,
      judgeAttempts: judgeExisting ? 2 : 1,
      totalApiAttempts: cards.length + (judgeExisting ? 2 : 1)
    },
    writer: { releaseId: writer.releaseId, model: writer.model, reasoningEffort: writer.reasoningEffort, laneId: writer.laneId },
    judge: { releaseId: judge.releaseId, model: judgeActualModel, reasoningEffort: judgeActualEffort, laneId: judge.laneId, authorization: judge.authorization },
    cards: cards.map((card) => ({
      id: card.id,
      deterministicPassed: card.deterministicChecks.passed,
      judgeScore: card.judge?.score || null,
      judgeVerdict: card.judge?.verdict || null,
      judgeEvidenceStatus: card.judge?.evidenceStatus || "human_review_required"
    }))
  };
  writeJson(path.join(outDir, "_summary.json"), summary);
  fs.writeFileSync(path.join(outDir, "TLDR-Timing-Event-Reader-Copy-Pilot-V1-REVIEW.md"), `${reviewMarkdown(cards, writer, judge)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
