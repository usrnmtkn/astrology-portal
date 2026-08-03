#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  readRegistry,
  resolveCandidateRelease,
  sha256
} = require("./editorial-model-registry.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const { judgeExactAspect } = require("./judge-sky-exact-aspect.js");
const {
  bodyFor,
  classicalPairSource,
  readerEligibleOwnerCorpus
} = require("./sky-exact-aspect-corpus.js");

const LANE_ID = "judge:sky-exact-aspect";
const DEFAULT_OUT = path.join("out", "editorial-calibration", "gpt-5.6-sol-sky-exact-aspect-owner-225-smoke-v1.json");

function parseArgs(argv) {
  const options = { samples: 1, concurrency: 4, limit: 0, out: DEFAULT_OUT };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--plan") options.plan = true;
    else if (token === "--authorize-live") options.authorizeLive = true;
    else if (token.startsWith("--samples=")) options.samples = Number(token.slice(10));
    else if (token.startsWith("--concurrency=")) options.concurrency = Number(token.slice(14));
    else if (token.startsWith("--limit=")) options.limit = Number(token.slice(8));
    else if (token.startsWith("--out=")) options.out = token.slice(6);
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!Number.isInteger(options.samples) || options.samples < 1) throw new Error("--samples must be a positive integer.");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error("--concurrency must be a positive integer.");
  return options;
}

function weakControls() {
  const corpus = new Map(readerEligibleOwnerCorpus().map((entry) => [entry.id, entry]));
  const get = (id) => {
    const entry = corpus.get(id);
    if (!entry) throw new Error(`Missing weak-control base ${id}.`);
    return entry;
  };
  const sunMoon = get("sky.sun.sextile.moon");
  const sunMoonTrine = get("sky.sun.trine.moon");
  const sunMars = get("sky.sun.opposition.mars");
  const sunJupiter = get("sky.sun.trine.jupiter");
  const sunSaturn = get("sky.sun.conjunction.saturn");
  const sunUranus = get("sky.sun.square.uranus");
  const sunNeptune = get("sky.sun.square.neptune");
  const sunPluto = get("sky.sun.square.pluto");
  const controls = [
    {
      ...sunMoon,
      id: "weak.generic-fallback",
      humanMoment: "Growth and emotion work together under a supportive cosmic influence.",
      developmentDetail: "This can be a good time for creativity and rest.",
      planetaryDynamic: "The Sun brings identity while the Moon brings feelings.",
      aspectMechanic: "The sextile creates positive energy.",
      conditionalConsequence: "Good things may happen when everyone stays open."
    },
    {
      ...sunMoonTrine,
      id: "weak.natal-second-person",
      humanMoment: "You finally say what has been on your mind.",
      developmentDetail: "Your message helps you understand your purpose.",
      planetaryDynamic: "The Sun is your identity and Mercury is your communication style.",
      aspectMechanic: "The trine makes your thoughts flow easily.",
      conditionalConsequence: "Trust your voice and use it wisely."
    },
    {
      ...sunMars,
      id: "weak.wrong-aspect-mechanic",
      humanMoment: "A supervisor gives an order and the work begins immediately.",
      developmentDetail: "Everyone moves in the same direction without disagreement.",
      planetaryDynamic: "The Sun sets the goal while Mars carries it out.",
      aspectMechanic: "The opposition lets authority and action reinforce each other without resistance.",
      conditionalConsequence: "The result arrives quickly because nobody challenges the plan."
    },
    {
      ...sunJupiter,
      id: "weak.sign-specific-live-card",
      humanMoment: "This week, a public promise attracts more attention than expected.",
      developmentDetail: "With the Sun in Leo trine Jupiter in Aries, support grows quickly.",
      planetaryDynamic: "The Sun supplies confidence while Jupiter expands the opportunity.",
      aspectMechanic: "The trine keeps the fire moving.",
      conditionalConsequence: "The opening lasts until August 4."
    },
    {
      ...sunSaturn,
      id: "weak.strategy-brief",
      humanMoment: "Stakeholders align around a scalable governance framework.",
      developmentDetail: "The rollout leverages accountability to facilitate durable outcomes.",
      planetaryDynamic: "The Sun activates leadership while Saturn operationalizes structure.",
      aspectMechanic: "The conjunction synergizes both functions.",
      conditionalConsequence: "Success depends on optimizing the implementation landscape."
    },
    {
      ...sunUranus,
      id: "weak.astrology-first",
      humanMoment: "The square between the Sun and Uranus creates friction between identity and freedom.",
      developmentDetail: "Fixed energy clashes with disruptive energy in the collective field.",
      planetaryDynamic: "The Sun rules the self while Uranus rules change.",
      aspectMechanic: "This difficult aspect can bring sudden events.",
      conditionalConsequence: "The cosmos may force everyone to evolve."
    },
    {
      ...sunNeptune,
      id: "weak.moralizing-advice",
      humanMoment: "A beautiful story distracts from a missing fact.",
      developmentDetail: "People share the claim before checking the source.",
      planetaryDynamic: "The Sun protects the image while Neptune blurs the evidence.",
      aspectMechanic: "The square keeps the contradiction active.",
      conditionalConsequence: "Remember to stay grounded, trust intuition, and choose truth over illusion."
    },
    {
      ...sunPluto,
      id: "weak.repetitive-template",
      humanMoment: "A power struggle becomes visible.",
      developmentDetail: "The power struggle becomes more visible.",
      planetaryDynamic: "The Sun brings power while Pluto brings power.",
      aspectMechanic: "The square creates a power struggle.",
      conditionalConsequence: "The power struggle may continue."
    }
  ];
  return controls;
}

function pairSourceFor(entry) {
  return classicalPairSource(entry.planetA, entry.planetB).sourceText;
}

async function pool(items, concurrency, fn, onResult) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const result = await fn(items[index], index);
      await onResult(result, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function writeJsonAtomic(filePath, value) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, resolved);
}

function saveResult(entry, result) {
  return {
    id: entry.id,
    sourceSha256: sha256(bodyFor(entry)),
    score: result.score,
    verdict: result.verdict || "",
    weakestField: result.weakestField || "",
    why: result.why || "",
    disagreement: Boolean(result.disagreement),
    contractViolation: Boolean(result.contractViolation)
  };
}

function configureCandidate(release) {
  const previous = {};
  const values = {
    EDITORIAL_JUDGE_CANDIDATE_RELEASE_ID: release.releaseId,
    OPENAI_JUDGE_MODEL: release.model,
    OPENAI_JUDGE_REASONING_EFFORT: release.reasoningEffort || "none",
    TLDR_ALLOW_LIVE_LLM_JUDGE: "1",
    TLDR_ALLOW_LIVE_LLM_CALIBRATION: "1"
  };
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

async function run(options) {
  const registry = readRegistry();
  const release = resolveCandidateRelease({
    role: "judge",
    surface: "sky-exact-aspect",
    releaseId: registry.lanes[LANE_ID].candidate.releaseId,
    registry
  });
  let approved = readerEligibleOwnerCorpus();
  if (options.limit > 0) approved = approved.slice(0, options.limit);
  const weak = weakControls();
  if (options.plan) {
    return {
      laneId: LANE_ID,
      releaseId: release.releaseId,
      model: release.model,
      approvedEntries: approved.length,
      weakControls: weak.length,
      samples: options.samples,
      totalJudgeCalls: (approved.length + weak.length) * options.samples,
      liveAuthorizationRequired: true,
      mutatesProduction: false
    };
  }
  if (!options.authorizeLive) throw new Error("Use --plan or explicitly pass --authorize-live.");
  const restore = configureCandidate(release);
  try {
    const configured = judgeConfig("sky-exact-aspect");
    if (configured.releaseId !== release.releaseId || configured.model !== release.model || configured.registryState !== "candidate") {
      throw new Error("Exact-aspect judge did not resolve the staged Sol candidate.");
    }
    const work = [
      ...approved.map((entry) => ({ cohort: "approved", entry })),
      ...weak.map((entry) => ({ cohort: "weak", entry }))
    ];
    const rows = [];
    await pool(work, options.concurrency, async ({ cohort, entry }) => {
      const result = await judgeExactAspect(entry, {
        pairSource: pairSourceFor(entry),
        samples: options.samples,
        calibration: true
      });
      return { cohort, entry, result };
    }, async ({ cohort, entry, result }) => {
      rows.push({ cohort, ...saveResult(entry, result) });
      process.stderr.write(`${rows.length}/${work.length} ${cohort} ${entry.id} -> ${result.score}\n`);
    });
    const approvedRows = rows.filter((row) => row.cohort === "approved").sort((a, b) => a.id.localeCompare(b.id));
    const weakRows = rows.filter((row) => row.cohort === "weak").sort((a, b) => a.id.localeCompare(b.id));
    const approvedMean = mean(approvedRows.map((row) => row.score));
    const weakMean = mean(weakRows.map((row) => row.score));
    const disagreement = rows.some((row) => row.disagreement || row.contractViolation);
    const status = disagreement
      ? "needs-human-review"
      : approvedRows.every((row) => row.score === 3) && weakRows.every((row) => row.score <= 2) && approvedMean - weakMean >= 1
        ? "passed"
        : "failed";
    const report = {
      schemaVersion: 1,
      recordedAt: new Date().toISOString(),
      laneId: LANE_ID,
      registryVersion: release.registryVersion,
      releaseId: release.releaseId,
      provider: release.provider,
      model: release.model,
      reasoningEffort: release.reasoningEffort || null,
      promptVersion: release.promptVersion,
      rubricVersion: release.rubricVersion,
      evaluationSetVersion: release.evaluationSetVersion,
      policyVersion: release.policyVersion,
      reportKind: approved.length === 214 && options.samples >= 5 ? "calibration" : approved.length === 214 ? "full-corpus-smoke" : "pilot-smoke",
      sampleCount: options.samples,
      promotionEligible: approved.length === 214 && options.samples >= 5,
      status,
      approvedMean,
      weakMean,
      separation: approvedMean - weakMean,
      minimumSeparation: 1,
      disagreement,
      approved: approvedRows,
      weakControls: weakRows
    };
    writeJsonAtomic(options.out, report);
    return report;
  } finally {
    restore();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await run(options);
  console.log(JSON.stringify(report, null, 2));
  if (!options.plan && report.status !== "passed") process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = { LANE_ID, parseArgs, run, weakControls };
