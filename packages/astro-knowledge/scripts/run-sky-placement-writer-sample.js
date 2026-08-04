#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { buildPacket, renderModelInput } = require("../../../.agents/skills/marie-satori-writer/scripts/compile-writing-packet.js");
const { assertRoutingMatch, resolveWriterCandidate } = require("./sky-placement-writer-runtime.js");
const { lintArticle } = require("./lint-placement-voice.js");
const { judgeArticle } = require("./judge-placement-voice.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
let activeOutDir = null;

function titleToken(value) {
  return String(value).split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function parseCli(argv) {
  const args = argv.slice(2);
  const valueFor = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };
  const positional = args.filter((value, index) => !value.startsWith("--") && (index === 0 || !["--out", "--planet", "--sign", "--engine-facts"].includes(args[index - 1])));
  const planet = String(valueFor("--planet") || positional[0] || "jupiter").trim().toLowerCase();
  const sign = String(valueFor("--sign") || positional[1] || "libra").trim().toLowerCase();
  const outDir = valueFor("--out")
    ? path.resolve(valueFor("--out"))
    : path.join(__dirname, "..", "review", `sky-placement-writer-${planet}-${sign}-candidate`);
  return {
    planet,
    sign,
    outDir,
    engineFactsPath: valueFor("--engine-facts") ? path.resolve(valueFor("--engine-facts")) : null,
    planOnly: args.includes("--plan"),
    authorizeLive: args.includes("--authorize-live"),
    writerOnly: args.includes("--writer-only")
  };
}

function unquote(value) {
  const trimmed = value.trim();
  return /^["'].*["']$/u.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
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

function parseArticle(raw) {
  const text = String(raw || "").trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const article = JSON.parse(text);
  const expected = ["opening", "tension", "development", "close", "try_this"];
  if (Object.keys(article).sort().join("|") !== [...expected].sort().join("|")) {
    throw new Error("Writer response did not contain exactly opening, tension, development, close, and try_this.");
  }
  for (const slot of ["opening", "tension", "development", "close"]) {
    if (typeof article[slot] !== "string" || !article[slot].trim()) throw new Error(`Writer response has an invalid ${slot}.`);
  }
  if (!Array.isArray(article.try_this) || !article.try_this.every((move) => typeof move === "string" && move.trim())) {
    throw new Error("Writer response has invalid try_this actions.");
  }
  return article;
}

function judgeShape(article) {
  return {
    hook: article.opening,
    lived: article.tension,
    turn: `${article.development} ${article.close}`.trim(),
    moves: article.try_this
  };
}

function lintShape(article) {
  return {
    hook: article.opening,
    lived: article.tension,
    turn: article.development,
    close: article.close,
    moves: article.try_this
  };
}

function deterministicChecks(article, { planet, sign, factContext = {} }) {
  const full = [article.opening, article.tension, article.development, article.close, ...article.try_this].join("\n");
  const lint = lintArticle({ ...lintShape(article), planet, sign, factContext });
  const axisMode = planet === "nodes" && sign.includes("-");
  const [northSign, southSign] = axisMode ? sign.split("-") : [null, null];
  const planetPattern = axisMode
    ? /\bNorth Node\b[\s\S]*\bSouth Node\b|\bSouth Node\b[\s\S]*\bNorth Node\b/iu
    : new RegExp(`\\b${titleToken(planet).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu");
  const signPattern = axisMode
    ? new RegExp(`\\b${titleToken(northSign)}\\b[\\s\\S]*\\b${titleToken(southSign)}\\b|\\b${titleToken(southSign)}\\b[\\s\\S]*\\b${titleToken(northSign)}\\b`, "iu")
    : new RegExp(`\\b${titleToken(sign).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu");
  const astrology = {
    passed: planetPattern.test(full) && signPattern.test(full),
    planetNamed: planetPattern.test(full),
    signNamed: signPattern.test(full),
    note: "Deterministic checks verify placement naming and surface rules. Terra reviews semantic fidelity to the verified astrology packet."
  };
  const pronounFinding = lint.findings.find((finding) => finding.source === "current-sky-person");
  const cycleFactMatch = full.match(/\b(?:move|moves|moving|takes?|spends?)\b[^.!?]{0,100}\b(?:all twelve signs|per sign|in each sign)\b/iu);
  return {
    astrology,
    engineSlots: {
      passed: article.opening.includes("{{entryDate}}") && article.close.includes("{{exitDate}}"),
      entryDateInOpening: article.opening.includes("{{entryDate}}"),
      exitDateInClose: article.close.includes("{{exitDate}}")
    },
    pronouns: {
      passed: !pronounFinding,
      prohibitedMatch: pronounFinding?.match || null
    },
    cycleFactsInProse: {
      passed: !cycleFactMatch,
      prohibitedMatch: cycleFactMatch?.[0] || null,
      note: "Reviewed cycle facts render in the engine-owned fact line under the date range, not in writer prose."
    },
    surfaceLint: lint,
    overallPassed: astrology.passed
      && article.opening.includes("{{entryDate}}")
      && article.close.includes("{{exitDate}}")
      && !pronounFinding
      && !cycleFactMatch
      && lint.fails === 0
  };
}

function candidateRow(article, { planet, sign, runId }) {
  const body = [article.opening, article.tension, article.development, article.close].join("\n\n");
  return {
    contentKey: `fallback-hook/sky-sign-copy/${planet}/${sign}`,
    content_role: "fallback_hook",
    grammar_frame: "continuous_editorial_unit",
    render_policy: "sky-placement-continuous-v2",
    fact_line: "{{entryDate}} to {{exitDate}}",
    opening: article.opening,
    tension: article.tension,
    development: article.development,
    aspect_insert: "{{aspectInsert}}",
    close: article.close,
    try_this: article.try_this,
    aspect_units: [],
    body_you: body,
    body_they: body,
    review_status: "needs_review",
    render_eligible: false,
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    source_keys: [runId],
    notes: "Unapproved Sol writer candidate. Owner review is required before any runtime import."
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const cli = parseCli(process.argv);
  if (!cli.planOnly && !cli.authorizeLive) {
    throw new Error("Choose --plan for a no-call packet or --authorize-live for one billed Sol draft and one billed Terra review.");
  }
  if (cli.planOnly && cli.authorizeLive) {
    throw new Error("Choose either --plan or --authorize-live, not both.");
  }
  const { planet, sign, outDir } = cli;
  const engineFacts = cli.engineFactsPath ? JSON.parse(fs.readFileSync(cli.engineFactsPath, "utf8")) : {};
  activeOutDir = outDir;
  fs.mkdirSync(outDir, { recursive: true });

  const task = `Write one complete continuous Current Sky fallback article for ${titleToken(planet)} in ${titleToken(sign)}. Keep the transit as the subject and use lived moments as evidence without letting one invented scenario carry the card. Return only opening, tension, development, close, and try_this.`;
  const packet = buildPacket({ planet, sign, requestedBeat: "full_article", emphasisBeat: "turn", task, engineFacts });
  const modelInput = renderModelInput(packet);
  writeJson(path.join(outDir, "packet.json"), packet);
  fs.writeFileSync(path.join(outDir, "model-input.md"), modelInput, "utf8");
  if (cli.planOnly) {
    const plan = {
      status: "ready_for_owner_authorized_writer_call",
      billedCallsMade: 0,
      plannedCalls: cli.writerOnly ? { writer: 1, judge: 0, total: 1 } : { writer: 1, judge: 1, total: 2 },
      planet,
      sign,
      outDir,
      routing: packet.routing,
      positiveEvidencePoolId: packet.positiveEvidencePoolId,
      retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
      warmthOwnerSourceIds: packet.ownerCorpusWarmthEvidence.sourceIds,
      ownerCorpusWarmthEvidence: packet.ownerCorpusWarmthEvidence,
      factSources: packet.verifiedAstrology.sourcePassages,
      structuralSlots: packet.structuralSlots,
      nextCommand: `node packages/astro-knowledge/scripts/run-sky-placement-writer-sample.js --authorize-live${cli.writerOnly ? " --writer-only" : ""} --planet ${planet} --sign ${sign}${cli.engineFactsPath ? ` --engine-facts ${cli.engineFactsPath}` : ""} --out ${outDir}`
    };
    writeJson(path.join(outDir, "plan.json"), plan);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  loadLocalEnv();
  const release = resolveWriterCandidate();
  if (release.provider !== "openai") throw new Error("The controlled writer sample requires the registered OpenAI candidate.");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

  const routing = assertRoutingMatch({
    packet,
    actualModel: release.model,
    actualReasoningEffort: release.reasoningEffort,
    actualLaneId: release.laneId
  });
  writeJson(path.join(outDir, "routing.json"), { ...routing, provider: release.provider, releaseId: release.releaseId });

  const requestBody = {
    model: release.model,
    input: modelInput,
    reasoning: { effort: release.reasoningEffort },
    max_output_tokens: 12000,
    text: {
      format: {
        type: "json_schema",
        name: "sky_placement_continuous_fallback",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["opening", "tension", "development", "close", "try_this"],
          properties: {
            opening: { type: "string", maxLength: 1000 },
            tension: { type: "string", maxLength: 1000 },
            development: { type: "string", maxLength: 1000 },
            close: { type: "string", maxLength: 400 },
            try_this: { type: "array", minItems: 2, maxItems: 3, items: { type: "string", maxLength: 350 } }
          }
        }
      }
    }
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  const payload = await response.json();
  writeJson(path.join(outDir, "writer-provider-response.json"), {
    responseId: payload.id || null,
    status: payload.status || null,
    incompleteDetails: payload.incomplete_details || null,
    model: payload.model || null,
    reasoning: payload.reasoning || null,
    usage: payload.usage || null,
    outputText: outputText(payload)
  });
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI writer request failed with ${response.status}.`);
  if (payload.status !== "completed") {
    throw new Error(`OpenAI writer response was ${payload.status || "not completed"}: ${payload.incomplete_details?.reason || "unknown reason"}.`);
  }

  const providerReportedModel = payload.model || release.model;
  const providerReportedEffort = payload.reasoning?.effort || release.reasoningEffort;
  if (providerReportedModel !== release.model || providerReportedEffort !== release.reasoningEffort) {
    writeJson(path.join(outDir, "REJECTED-routing-mismatch.json"), {
      requestedModel: release.model,
      providerReportedModel,
      requestedReasoningEffort: release.reasoningEffort,
      providerReportedEffort,
      responseId: payload.id || null
    });
    throw new Error("Provider-reported writer model or reasoning effort did not match the governed route.");
  }

  const rawOutput = outputText(payload);
  const article = parseArticle(rawOutput);
  writeJson(path.join(outDir, "writer-response.json"), {
    responseId: payload.id || null,
    requestedModel: release.model,
    actualModel: providerReportedModel,
    requestedReasoningEffort: release.reasoningEffort,
    actualReasoningEffort: providerReportedEffort,
    laneId: release.laneId,
    promptVersion: packet.routing.promptVersion,
    packetVersion: packet.packetVersion,
    retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
    warmthOwnerSourceIds: packet.ownerCorpusWarmthEvidence.sourceIds,
    ownerCorpusWarmthEvidence: packet.ownerCorpusWarmthEvidence,
    routingMatchStatus: "matched",
    usage: payload.usage || null,
    article
  });

  const checks = deterministicChecks(article, { planet, sign, factContext: engineFacts });
  writeJson(path.join(outDir, "deterministic-checks.json"), checks);

  const runId = path.basename(outDir);
  const row = candidateRow(article, { planet, sign, runId });
  writeJson(path.join(outDir, "fallback-row-candidates.json"), {
    schemaVersion: 1,
    reviewStatus: "needs_review",
    renderEligible: false,
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    rows: [row]
  });

  if (cli.writerOnly) {
    const record = {
      schemaVersion: 1,
      runId,
      recordedAt: new Date().toISOString(),
      status: "needs_review",
      editorialStatus: "writer_candidate_unreviewed",
      ownerApproved: false,
      promotionAuthorized: false,
      canonical: false,
      generationEvidence: false,
      editorialFlags: packet.ownerCorpusWarmthEvidence.editorial_flags,
      calls: { writer: 1, judge: 0, total: 1 },
      target: { planet, sign },
      writerRouting: {
        model: providerReportedModel,
        reasoningEffort: providerReportedEffort,
        laneId: release.laneId,
        promptVersion: packet.routing.promptVersion,
        packetVersion: packet.packetVersion,
        retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
        warmthOwnerSourceIds: packet.ownerCorpusWarmthEvidence.sourceIds,
        harvestMode: packet.ownerCorpusWarmthEvidence.harvest_mode
      },
      judgeRouting: null,
      deterministicChecks: checks,
      terraReview: null,
      article
    };
    writeJson(path.join(outDir, "result.json"), record);
    process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
    return;
  }

  process.env.TLDR_ALLOW_LIVE_LLM_JUDGE = "1";
  const terra = judgeConfig("sky-placement");
  if (terra.provider !== "openai" || terra.model !== "gpt-5.6-terra" || terra.reasoningEffort !== "low" || terra.laneId !== "judge:sky-placement") {
    throw new Error(`Terra judge routing mismatch: ${terra.provider}/${terra.model}/${terra.reasoningEffort}/${terra.laneId}.`);
  }
  const placementSpec = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "voice", "tldr-astro", "sky-placement.json"), "utf8"));
  const tier = Object.entries(placementSpec.planetTierRegister.tiers)
    .find(([, members]) => members.includes(planet))?.[0] || "social";
  const terraReview = await judgeArticle(judgeShape(article), {
    tier,
    planet,
    sign,
    samples: 1,
    deterministicResults: {
      ...checks,
      surfaceContractId: packet.surfaceRequirements.contractId,
      retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
      warmthOwnerSourceIds: packet.ownerCorpusWarmthEvidence.sourceIds,
      ownerCorpusWarmthEvidence: packet.ownerCorpusWarmthEvidence
    }
  });
  writeJson(path.join(outDir, "terra-review.json"), terraReview);

  const record = {
    schemaVersion: 1,
    runId,
    recordedAt: new Date().toISOString(),
    status: "needs_review",
    editorialStatus: "writer_candidate_unreviewed",
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    generationEvidence: false,
    editorialFlags: packet.ownerCorpusWarmthEvidence.editorial_flags,
    calls: { writer: 1, judge: 1, total: 2 },
    target: { planet, sign },
    writerRouting: {
      model: providerReportedModel,
      reasoningEffort: providerReportedEffort,
      laneId: release.laneId,
      promptVersion: packet.routing.promptVersion,
      packetVersion: packet.packetVersion,
      retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
      warmthOwnerSourceIds: packet.ownerCorpusWarmthEvidence.sourceIds,
      harvestMode: packet.ownerCorpusWarmthEvidence.harvest_mode
    },
    judgeRouting: {
      model: terraReview.audit.model,
      reasoningEffort: terraReview.audit.reasoningEffort,
      laneId: terraReview.audit.registryLaneId,
      samples: terraReview.samples
    },
    deterministicChecks: checks,
    terraReview,
    article
  };
  writeJson(path.join(outDir, "result.json"), record);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    if (activeOutDir) {
      fs.mkdirSync(activeOutDir, { recursive: true });
      writeJson(path.join(activeOutDir, "run-failure.json"), {
        recordedAt: new Date().toISOString(),
        status: "failed",
        message: error instanceof Error ? error.message : String(error)
      });
    }
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = { candidateRow, deterministicChecks, judgeShape, lintShape, parseArticle, parseCli };
