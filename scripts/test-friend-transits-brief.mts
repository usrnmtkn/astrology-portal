import assert from "node:assert/strict";
import { buildFriendTransitsBrief } from "../apps/web/src/features/friends/friendTransitsBrief.ts";

const evidence = (transitPlanet: string, score: number) => ({
  transitPlanet,
  transitSign: "Aries",
  aspect: "square",
  natalPoint: "Moon",
  natalSign: "Cancer",
  natalHouse: 7,
  direction: "applying" as const,
  score,
  significance: "high",
  timingBonuses: ["tight orb"],
  contentKeys: [`personal-transit/${transitPlanet.toLowerCase()}/moon/square`]
});

const transit = (id: string, detailAvailable: boolean, score: number, term: "short" | "long" = "short") => ({
  id,
  title: `${id} title`,
  durationLabel: term === "short" ? "A few days" : "Long cycle",
  rangeLabel: "Sep 5–9",
  timingLabel: "Building",
  summary: `${id} summary`,
  orb: "1°",
  detailAvailable,
  evidence: evidence(id, score)
});

const brief = buildFriendTransitsBrief({
  friendName: "Alex",
  dateLabel: "September 6, 2026",
  personalTransitGroups: [
    {
      key: "short",
      label: "Short-term themes",
      transits: [
        transit("Saturn", true, 98),
        transit("Mars", false, 80),
        transit("Venus", true, 70)
      ]
    },
    {
      key: "long",
      label: "Long-term themes",
      transits: [transit("Pluto", true, 92, "long")]
    }
  ],
  bondTransits: [{
    id: "bond-1",
    headline: "A shared pressure point is active",
    effectBody: "The relationship is carrying extra weight.",
    activationBody: "Give the important part time.",
    transitPlanet: "Saturn"
  }],
  houseTransits: [
    {
      id: "house-saturn",
      contentKey: "transit/saturn/2h",
      transitPlanet: "Saturn",
      title: "Saturn through Alex's 2nd house",
      durationLabel: "Long cycle",
      timingRange: "Aug 1–Oct 20",
      rowSummary: "Resources require deliberate structure.",
      termLabel: "Long-term",
      keywords: ["Money", "Values"],
      house: 2,
      houseLabel: "2nd house",
      detailAvailable: true
    },
    {
      id: "house-mercury",
      contentKey: "transit/mercury/1h",
      transitPlanet: "Mercury",
      title: "Mercury through Alex's 1st house",
      durationLabel: "Short cycle",
      timingRange: "Sep 5–7",
      rowSummary: "",
      termLabel: "Short-term",
      keywords: ["Self"],
      house: 1,
      houseLabel: "1st house",
      detailAvailable: false
    }
  ],
  dailyForecast: {
    headline: "Something is easier to name today.",
    body: "Alex can say what needs attention without turning it into a bigger problem.",
    moonContext: { sign: "Cancer", houseLabel: "7th house", topic: "partnership" }
  },
  dailyDoItems: ["Name the plan", "Keep it practical", "Leave room"],
  dailyDontItems: ["Force an answer", "Assume the worst", "Overpromise"],
  patternItems: [
    { id: "active-pattern", activationCopy: "This pattern is active." } as any,
    { id: "inactive-pattern", activationCopy: "" } as any
  ]
});

assert.equal(brief.schema, "tldr.friend-transits-brief.v1");
assert.equal(brief.friendName, "Alex");
assert.deepEqual(brief.primaryThemes.map((item) => item.id), ["Saturn", "Venus"], "The brief must preserve upstream order while failing closed on unavailable copy.");
assert.deepEqual(brief.longerCycles.map((item) => item.id), ["Pluto"]);
assert.deepEqual(brief.houseContext.map((item) => item.id), ["house-saturn"], "House context must fail closed when reader detail is unavailable.");
assert.deepEqual(brief.relationshipActivations.map((item) => item.id), ["bond-1"], "Relationship activations must remain a distinct lane.");
assert.deepEqual(brief.activePatterns.map((item) => item.id), ["active-pattern"]);
assert.deepEqual(brief.daily?.doItems, ["Name the plan", "Keep it practical", "Leave room"]);
assert.deepEqual(brief.daily?.dontItems, ["Force an answer", "Assume the worst", "Overpromise"]);
assert.equal(brief.primaryThemes[0]?.evidence.score, 98);
assert.deepEqual(brief.counts, {
  primaryThemes: 2,
  relationshipActivations: 1,
  houseContext: 1,
  longerCycles: 1,
  activePatterns: 1
});
assert.equal(brief.hasAnyTransit, true);

const incompleteGuidance = buildFriendTransitsBrief({
  friendName: "Alex",
  dateLabel: "September 6, 2026",
  personalTransitGroups: [],
  bondTransits: [],
  houseTransits: [],
  dailyForecast: null,
  dailyDoItems: ["One", "Two"],
  dailyDontItems: ["One", "Two", "Three"],
  patternItems: []
});
assert.equal(incompleteGuidance.daily, null, "Partial Do/Don't sets must not create a daily brief lane.");
assert.equal(incompleteGuidance.hasAnyTransit, false);

console.log("Friends transits brief fixtures passed.");
