import assert from "node:assert/strict";
import fs from "node:fs";
import {
  askTldrEvidenceFromPersonalTiming,
  askTldrEvidenceFromReportWindow,
  combineAskTldrCalculatedEvidence
} from "../api/_lib/ask-tldr-evidence-adapter.ts";
import {
  buildAskTldrAnswerPacket,
  compileEvergreenAskPlan,
  compileFreeTextAskPlan,
  rankAskTldrEvidence
} from "../api/_lib/ask-tldr-model.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");

const personalTiming = {
  natal: {
    ...reportWindow.natal,
    aspects: [{
      from: "Venus",
      to: "Saturn",
      type: "square",
      orb: 1.2,
      strength: 91,
      fromHouse: 5,
      toHouse: 7,
      knowledgeIds: ["natal-venus-square-saturn"]
    }]
  },
  profections: {
    annual: {
      level: "annual",
      age: 47,
      house: 12,
      sign: "Taurus",
      ruler: "Venus",
      startsAt: "2026-02-18T00:00:00Z",
      endsAt: "2027-02-18T00:00:00Z"
    }
  },
  timingBoostedTransits: [{
    boostedScore: 130,
    baseScore: 110,
    boostReasons: ["annual-ruler"],
    hit: {
      id: "jupiter-opposition-midheaven",
      transitPlanet: "Jupiter",
      transitSign: "Leo",
      transitHouse: 3,
      natalPoint: "Midheaven",
      natalSign: "Aquarius",
      natalHouse: 9,
      aspect: "opposition",
      orb: 0.8,
      applying: true,
      phase: "applying",
      strength: 95,
      score: 110,
      exactAt: "2026-09-15T00:00:00Z",
      knowledgeIds: ["transit-natal-jupiter-opposition-midheaven"]
    }
  }],
  topTransits: [
    {
      id: "jupiter-opposition-midheaven",
      transitPlanet: "Jupiter",
      transitSign: "Leo",
      transitHouse: 3,
      natalPoint: "Midheaven",
      natalSign: "Aquarius",
      natalHouse: 9,
      aspect: "opposition",
      orb: 0.8,
      strength: 95,
      score: 110,
      exactAt: "2026-09-15T00:00:00Z",
      knowledgeIds: ["transit-natal-jupiter-opposition-midheaven"]
    },
    {
      id: "moon-home-fixture",
      transitPlanet: "Moon",
      transitSign: "Cancer",
      transitHouse: 4,
      natalPoint: "Moon",
      natalSign: "Scorpio",
      natalHouse: 6,
      aspect: "trine",
      orb: 2.1,
      strength: 62,
      score: 35,
      knowledgeIds: ["fixture-unrelated-home"]
    }
  ]
};

const active = askTldrEvidenceFromPersonalTiming(personalTiming);
const activeMc = active.find((item) => item.id === "active:jupiter-opposition-midheaven");
assert.ok(activeMc, "Personal Timing must produce the active Jupiter-Midheaven evidence item.");
assert.equal(active.filter((item) => item.id === "active:jupiter-opposition-midheaven").length, 1, "Boosted and top-transit copies of one current hit must dedupe.");
assert.equal(activeMc.temporalState, "active");
assert.ok(activeMc.houses.includes(10), "Midheaven evidence must canonicalize to house 10 even when the calculator payload reports natalHouse 9.");
assert.ok(activeMc.angles.includes("Midheaven"));
assert.equal(activeMc.importance, "major");
assert.deepEqual(activeMc.knowledgeIds, ["transit-natal-jupiter-opposition-midheaven"]);
assert.equal(activeMc.provenance.calculator, "tldrastro-api:/timing/personal");
assert.equal(activeMc.facts.natalHouse, 9, "Raw calculator facts must remain unchanged even when retrieval coordinates are canonicalized.");

const natalAspect = active.find((item) => item.id === "natal-aspect:venus:square:saturn");
assert.ok(natalAspect);
assert.equal(natalAspect.kind, "natal_aspect");
assert.equal(natalAspect.temporalState, "natal");
assert.equal(natalAspect.importance, "major");
assert.deepEqual(natalAspect.knowledgeIds, ["natal-venus-square-saturn"]);

const future = askTldrEvidenceFromReportWindow(reportWindow, now);
const futureMc = future.find((item) => item.factorKey === "transit:jupiter:opposition:midheaven");
assert.ok(futureMc);
assert.equal(futureMc.temporalState, "upcoming");
assert.ok(futureMc.houses.includes(10));
assert.ok(futureMc.angles.includes("Midheaven"));

const augustEclipse = future.find((item) => item.id === "eclipse:lunar-eclipse-2026-08-28");
assert.ok(augustEclipse);
assert.equal(augustEclipse.temporalState, "annual", "A past eclipse from the annual window must not be relabeled active.");
assert.ok(augustEclipse.houses.includes(10));

const februaryEclipse = future.find((item) => item.id === "eclipse:solar-eclipse-2027-02-06");
assert.ok(februaryEclipse);
assert.equal(februaryEclipse.temporalState, "upcoming");
assert.ok(februaryEclipse.houses.includes(9));
assert.ok(februaryEclipse.houses.includes(10), "Midheaven contact must add canonical house 10 while preserving the eclipse's activation house 9.");
assert.ok(februaryEclipse.angles.includes("Midheaven"));

const profection = future.find((item) => item.id === "profection:annual:12");
assert.ok(profection);
assert.deepEqual(profection.houses, [12]);
assert.deepEqual(profection.points, ["Venus"]);
assert.equal(profection.temporalState, "annual");

const solarReturnVenus = future.find((item) => item.id === "solar-return-overlay:venus:house-10");
assert.ok(solarReturnVenus);
assert.equal(solarReturnVenus.kind, "solar_return_overlay");
assert.deepEqual(solarReturnVenus.houses, [10]);
assert.deepEqual(solarReturnVenus.points, ["Venus"]);

const combined = combineAskTldrCalculatedEvidence(active, future);
assert.ok(combined.length > active.length);

const recognition = career.questions.find((question) => question.id === "career.recognition");
const recognitionPlan = compileEvergreenAskPlan({ model, pillar: career, question: recognition });
const rankedCareer = rankAskTldrEvidence({ model, plan: recognitionPlan, candidates: combined, now });
assert.equal(rankedCareer[0].id, "active:jupiter-opposition-midheaven", "Current Personal Timing evidence should beat the future copy of the same Jupiter-Midheaven factor.");
assert.equal(rankedCareer.filter((item) => item.factorKey === "transit:jupiter:opposition:midheaven").length, 1, "Current and future copies of one factor must collapse to one answer role.");

const packet = buildAskTldrAnswerPacket({ model, plan: recognitionPlan, candidates: combined, now });
assert.equal(packet.generationAllowed, true);
assert.equal(packet.evidence[0].provenance.sourceId, "jupiter-opposition-midheaven");
assert.equal(packet.evidence[0].facts.natalPoint, "Midheaven", "Ranked answer evidence must retain the exact calculated fact payload for the future writer.");

const lovePattern = compileFreeTextAskPlan({
  model,
  pillarId: "love",
  questionText: "Why does the same relationship problem keep happening?",
  classification: { primaryIntent: "relationship", secondaryIntents: ["pattern", "commitment"], questionTypes: ["pattern"] }
});
assert.equal(rankAskTldrEvidence({ model, plan: lovePattern, candidates: combined, now })[0].id, "natal-aspect:venus:square:saturn", "A strong natal relationship aspect should be able to lead a pattern question.");

console.log(`Ask TLDR calculated evidence adapter passed: ${active.length} Personal Timing candidates + ${future.length} Report Window candidates normalize into one provenance-preserving ranking pool.`);
