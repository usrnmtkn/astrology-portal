#!/usr/bin/env node
//
// Calibration for collective sky-placement judging. This stays separate from
// aspect calibration so the production placement flag cannot be enabled until
// the judge proves it can separate approved placement golds from weak drafts.

const path = require("path");
const { judgeCard, judgeConfig } = require("./judge-sky-voice.js");
const examples = require(path.join("..", "voice", "tldr-astro", "examples.json"));

const mode = "collective-placement-card";
const topperMode = "collective-placement-with-topper";
const baseGoldExemplars = examples.filter(
  (entry) => entry.surface === "sky" && entry.mode === mode && entry.canonical
);
const topperGoldExemplars = examples
  .filter(
    (entry) => entry.surface === "sky" && entry.mode === "collective-placement-topper" && entry.canonical
  )
  .flatMap((topper) => {
    const base = baseGoldExemplars.find((entry) => entry.sourceId === topper.baseSourceId);

    return base
      ? [{
          ...topper,
          body: `${topper.body}\n\n${base.body}`,
          judgeMode: topperMode
        }]
      : [];
  });
const goldExemplars = [
  ...baseGoldExemplars.map((entry) => ({ ...entry, judgeMode: mode })),
  ...topperGoldExemplars
];
const knownWeak = [
  "The Sun is now in Leo, bringing powerful energy and transformation. You are invited to shine your brightest and step into your power. Trust the journey and let the universe guide you. Everything is aligning for your highest good.",
  "Venus in Virgo makes relationships practical. We may focus on details and want to improve things. This placement can be good or bad depending on how we use the energy. Remember to communicate, practice self-care, and stay open to growth. Love is the answer. Choose it every day.",
  "Pluto in Aquarius is a time of change for technology and society. Innovation accelerates and old systems transform. The gift is progress; the shadow is control. We must adapt or get left behind. Change is here. Change demands courage.",
  "Chiron in Aries means you have a wound around identity and assertion. You may struggle to stand up for yourself, but this challenge is also your greatest gift. Heal your inner child, release what no longer serves you, and become the warrior you were meant to be."
];

function assertCalibrationTarget({
  expectedProvider = process.env.SKY_PLACEMENT_CALIBRATION_PROVIDER,
  expectedModel = process.env.SKY_PLACEMENT_CALIBRATION_MODEL
} = {}) {
  const actual = judgeConfig();
  const normalizedProvider = String(expectedProvider ?? "").trim().toLowerCase();
  const normalizedModel = String(expectedModel ?? "").trim();

  if (!normalizedProvider || !normalizedModel) {
    throw new Error(
      "Set SKY_PLACEMENT_CALIBRATION_PROVIDER and SKY_PLACEMENT_CALIBRATION_MODEL to the production placement-judge target."
    );
  }

  if (actual.provider !== normalizedProvider || actual.model !== normalizedModel) {
    throw new Error(
      `Calibration target mismatch: judge resolves to ${actual.provider}/${actual.model}, expected ${normalizedProvider}/${normalizedModel}.`
    );
  }

  return actual;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }
  );

  await Promise.all(runners);
  return results;
}

async function runPlacementCalibration({
  concurrency = 1,
  judgeFn,
  samples = 5
} = {}) {
  const goldResults = await mapWithConcurrency(goldExemplars, concurrency, async (exemplar) => {
    const result = await judgeCard(exemplar.body, {
      mode: exemplar.judgeMode,
      tier: exemplar.tier || "luminary",
      samples,
      judgeFn
    });

    return {
      id: exemplar.sourceId,
      tier: exemplar.tier || "luminary",
      score: result.score,
      verdict: result.verdict,
      weakest: result.weakest ?? "",
      why: result.why ?? "",
      samples: result.samples,
      gate: result.gate
    };
  });
  const weakResults = await mapWithConcurrency(knownWeak, concurrency, async (draft, index) => {
    const result = await judgeCard(draft, {
      mode,
      samples,
      judgeFn
    });

    return {
      id: `known-weak-${index + 1}`,
      score: result.score,
      verdict: result.verdict,
      weakest: result.weakest ?? "",
      why: result.why ?? "",
      samples: result.samples,
      gate: result.gate
    };
  });
  const goldOffVoice = goldResults.filter((result) => result.score === 1).length;
  const goldsAtThree = goldResults.filter((result) => result.score === 3).length;
  const weakPassedAsThree = weakResults.filter((result) => result.score === 3).length;
  const goldMean = goldResults.reduce((sum, result) => sum + result.score, 0) / goldResults.length;
  const weakMean = weakResults.reduce((sum, result) => sum + result.score, 0) / weakResults.length;
  const separation = goldMean - weakMean;
  const pass = goldOffVoice === 0 && weakPassedAsThree === 0 && separation >= 1.5;

  return {
    pass,
    samples,
    goldMean,
    weakMean,
    separation,
    goldOffVoice,
    goldsAtThree,
    weakPassedAsThree,
    golds: goldResults,
    weakControls: weakResults
  };
}

async function main() {
  const target = assertCalibrationTarget();
  console.log(
    `placement judge target ${target.provider}/${target.model} at temperature ${target.temperature} (matches expected production target).`
  );
  const report = await runPlacementCalibration({ samples: 5 });

  for (const result of report.golds) {
    console.log(
      `${result.score === 3 ? "OK " : result.score === 2 ? "~  " : "!! "} exemplar ${result.id} -> ${result.score} (${result.verdict})`
    );
  }
  for (const result of report.weakControls) {
    console.log(
      `${result.score <= 2 ? "OK " : "!! "} ${result.id} -> ${result.score} (${result.verdict})  ${result.why}`
    );
  }
  console.log(
    `\nplacement exemplar mean ${report.goldMean.toFixed(2)} (${report.goldsAtThree}/${report.golds.length} at 3, ${report.goldOffVoice} off-voice), weak mean ${report.weakMean.toFixed(2)} (${report.weakPassedAsThree} passed as 3), separation ${report.separation.toFixed(2)} (need >= 1.50).`
  );

  if (!report.pass) {
    throw new Error("Placement judge is NOT calibrated: tighten its prompt, not the gate.");
  }

  console.log("Placement judge calibrated: clear separation, no control mis-rated.");
}

module.exports = {
  assertCalibrationTarget,
  goldExemplars,
  knownWeak,
  runPlacementCalibration
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`Placement calibration could not run: ${error.message}`);
    console.error(
      "(Set the expected production provider/model and its API key; keep SKY_PLACEMENT_JUDGE_CALIBRATED false.)"
    );
    process.exit(1);
  });
}
