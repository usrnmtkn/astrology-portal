#!/usr/bin/env node
//
// Calibration for collective sky-placement judging. This stays separate from
// aspect calibration so the production placement flag cannot be enabled until
// the judge proves it can separate approved placement golds from weak drafts.

const path = require("path");
const { judgeCard, judgeConfig } = require("./judge-sky-voice.js");
const examples = require(path.join("..", "voice", "tldr-astro", "examples.json"));

const mode = "collective-placement-card";
const goldExemplars = examples.filter(
  (entry) => entry.surface === "sky" && entry.mode === mode && entry.canonical
);
const knownWeak = [
  "The Sun is now in Leo, bringing powerful energy and transformation. You are invited to shine your brightest and step into your power. Trust the journey and let the universe guide you. Everything is aligning for your highest good.",
  "Venus in Virgo makes relationships practical. We may focus on details and want to improve things. This placement can be good or bad depending on how we use the energy. Remember to communicate, practice self-care, and stay open to growth. Love is the answer. Choose it every day.",
  "Pluto in Aquarius is a time of change for technology and society. Innovation accelerates and old systems transform. The gift is progress; the shadow is control. We must adapt or get left behind. Change is here. Change demands courage.",
  "Chiron in Aries means you have a wound around identity and assertion. You may struggle to stand up for yourself, but this challenge is also your greatest gift. Heal your inner child, release what no longer serves you, and become the warrior you were meant to be."
];

function assertCalibrationTarget() {
  const actual = judgeConfig();
  const expectedProvider = String(process.env.SKY_PLACEMENT_CALIBRATION_PROVIDER ?? "").trim().toLowerCase();
  const expectedModel = String(process.env.SKY_PLACEMENT_CALIBRATION_MODEL ?? "").trim();

  if (!expectedProvider || !expectedModel) {
    throw new Error(
      "Set SKY_PLACEMENT_CALIBRATION_PROVIDER and SKY_PLACEMENT_CALIBRATION_MODEL to the production placement-judge target."
    );
  }

  if (actual.provider !== expectedProvider || actual.model !== expectedModel) {
    throw new Error(
      `Calibration target mismatch: judge resolves to ${actual.provider}/${actual.model}, expected ${expectedProvider}/${expectedModel}.`
    );
  }

  console.log(
    `placement judge target ${actual.provider}/${actual.model} at temperature ${actual.temperature} (matches expected production target).`
  );
}

async function main() {
  assertCalibrationTarget();
  let goldOff = 0;
  let goldThree = 0;
  let goldSum = 0;
  let weakSum = 0;
  let weakFails = 0;

  for (const exemplar of goldExemplars) {
    const result = await judgeCard(exemplar.body, {
      mode,
      tier: exemplar.tier || "luminary",
      samples: 5
    });
    if (result.score === 1) goldOff += 1;
    if (result.score === 3) goldThree += 1;
    goldSum += result.score;
    console.log(
      `${result.score === 3 ? "OK " : result.score === 2 ? "~  " : "!! "} exemplar ${exemplar.sourceId} -> ${result.score} (${result.verdict})`
    );
  }

  for (const [index, draft] of knownWeak.entries()) {
    const result = await judgeCard(draft, {
      mode,
      samples: 5
    });
    const caught = result.score <= 2;
    if (!caught) weakFails += 1;
    weakSum += result.score;
    console.log(
      `${caught ? "OK " : "!! "} known-weak #${index + 1} -> ${result.score} (${result.verdict})  ${result.why || ""}`
    );
  }

  const goldMean = goldSum / goldExemplars.length;
  const weakMean = weakSum / knownWeak.length;
  const separation = goldMean - weakMean;
  const pass = goldOff === 0 && weakFails === 0 && separation >= 1.5;

  console.log(
    `\nplacement exemplar mean ${goldMean.toFixed(2)} (${goldThree}/${goldExemplars.length} at 3, ${goldOff} off-voice), weak mean ${weakMean.toFixed(2)} (${weakFails} passed as 3), separation ${separation.toFixed(2)} (need >= 1.50).`
  );

  if (!pass) {
    console.error("Placement judge is NOT calibrated: tighten its prompt, not the gate.");
    process.exit(1);
  }

  console.log("Placement judge calibrated: clear separation, no control mis-rated.");
}

main().catch((error) => {
  console.error(`Placement calibration could not run: ${error.message}`);
  console.error(
    "(Set the expected production provider/model and its API key; keep SKY_PLACEMENT_JUDGE_CALIBRATED false.)"
  );
  process.exit(1);
});
