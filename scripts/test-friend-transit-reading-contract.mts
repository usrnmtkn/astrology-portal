import assert from "node:assert/strict";
import {
  assertFriendTransitReadingBrief,
  friendTransitReadingCanGenerate,
  friendTransitReadingKnowledgeIds,
  friendTransitReadingMeaningPlan,
  friendTransitReadingPrompt,
  friendTransitReadingRequestLock,
  validateFriendTransitReadingDraft
} from "../api/_lib/friend-transit-reading.ts";

const rawBrief = {
  schema: "tldr.friend-transits-brief.v1",
  friendName: "Alex",
  dateLabel: "September 6, 2026",
  primaryThemes: [{
    id: "mars-moon",
    title: "Mars trine Moon",
    durationLabel: "A few days",
    rangeLabel: "Sep 5-8",
    timingLabel: "Active now",
    summary: "It is easier for Alex to act on what they are feeling without turning every reaction into a larger problem.",
    orb: "1°",
    detailAvailable: true,
    evidence: {
      transitPlanet: "Mars",
      transitSign: "Aries",
      aspect: "trine",
      natalPoint: "Moon",
      natalSign: "Sagittarius",
      natalHouse: 7,
      direction: "applying",
      score: 80,
      significance: "major",
      timingBonuses: ["tight orb"],
      contentKeys: ["authored/transit-aspect/mars/moon/soft"]
    }
  }],
  relationshipActivations: [{
    id: "bond-1",
    headline: "A shared pressure point is active",
    effectBody: "The connection may need more patience than usual today.",
    activationBody: "The useful part is seeing what needs a slower answer.",
    transitPlanet: "Saturn"
  }],
  houseContext: [{
    id: "saturn-2",
    contentKey: "transit-house/saturn/2",
    transitPlanet: "Saturn",
    title: "Saturn through Alex's 2nd house",
    durationLabel: "Long cycle",
    timingRange: "Aug 1-Oct 20",
    rowSummary: "Money and what Alex can rely on may need more deliberate structure.",
    termLabel: "Long-term",
    keywords: ["Money", "Values"],
    house: 2,
    houseLabel: "2nd house",
    detailAvailable: true
  }],
  daily: {
    forecast: {
      headline: "Something is easier to name today.",
      body: "Alex can say what needs attention without turning it into a bigger problem.",
      moonContext: { sign: "Cancer", houseLabel: null, topic: null }
    },
    doItems: ["Name the plan", "Keep it practical", "Leave room"],
    dontItems: ["Force an answer", "Assume the worst", "Overpromise"]
  },
  longerCycles: [{
    id: "pluto-sun",
    title: "Pluto square Sun",
    durationLabel: "Long cycle",
    rangeLabel: "Aug-Nov",
    timingLabel: "Background",
    summary: "A longer pressure cycle is changing what Alex is willing to keep carrying just to preserve the old plan.",
    orb: "2°",
    detailAvailable: true,
    evidence: {
      transitPlanet: "Pluto",
      transitSign: "Aquarius",
      aspect: "square",
      natalPoint: "Sun",
      natalSign: "Scorpio",
      natalHouse: 6,
      direction: "separating",
      score: 72,
      significance: "major",
      timingBonuses: [],
      contentKeys: ["authored/transit-aspect/pluto/sun/hard"]
    }
  }],
  activePatterns: [],
  hasAnyTransit: true,
  counts: { primaryThemes: 1, relationshipActivations: 1, houseContext: 1, longerCycles: 1, activePatterns: 0 }
};

const brief = assertFriendTransitReadingBrief(rawBrief);
assert.equal(brief.friendName, "Alex");
assert.equal(friendTransitReadingCanGenerate(brief), true);
const lockedRequest = friendTransitReadingRequestLock({
  brief: rawBrief,
  subjectId: "friend-123",
  targetDate: "2026-09-06"
});
assert.equal(lockedRequest.contentKey, "friend-transit-reading/friend-123/2026-09-06");
assert.equal(lockedRequest.surface, "friends");
assert.equal(lockedRequest.mode, "in_depth");
assert.equal(lockedRequest.eventType, "friend-transit-reading");
assert.equal(lockedRequest.headline, "What's going on with Alex right now?");
assert.deepEqual(lockedRequest.knowledgeIds, [
  "you-transit-v3-mars-trine-moon",
  "you-transit-v3-pluto-square-sun",
  "house-2"
]);
assert.throws(
  () => friendTransitReadingRequestLock({
    brief: rawBrief,
    subjectId: "friend-123",
    targetDate: "Sep 6"
  }),
  /TARGET_DATE_REQUIRED/u
);
assert.throws(
  () => assertFriendTransitReadingBrief({
    ...rawBrief,
    primaryThemes: [{
      ...rawBrief.primaryThemes[0],
      evidence: { ...rawBrief.primaryThemes[0].evidence, contentKeys: [] }
    }]
  }),
  /PERSONAL_EVIDENCE_INVALID/u
);
assert.deepEqual(friendTransitReadingKnowledgeIds(brief), [
  "you-transit-v3-mars-trine-moon",
  "you-transit-v3-pluto-square-sun",
  "house-2"
]);
const plan = friendTransitReadingMeaningPlan(brief);
assert.equal(plan.rankingAuthority, "brief-order-is-final");
assert.equal(plan.leadLane, "daily");

const prompt = friendTransitReadingPrompt({ brief, headline: "What's going on with Alex right now?" });
assert.match(prompt, /synthesis only/i);
assert.match(prompt, /Do not re-rank the evidence/i);
assert.match(prompt, /Things between you and \${brief\.friendName}|Things between you and Alex/i);
assert.match(prompt, /Do not use you\/your outside relationship context/i);
assert.match(prompt, /Mars trine Moon/);
assert.match(prompt, /TECHNICAL EVIDENCE - FACT LOCK ONLY/);
assert.doesNotMatch(prompt, /score": 80|significance": "major"|timingBonuses/u, "The writer prompt must not expose ranking metadata.");

const valid = validateFriendTransitReadingDraft({
  brief,
  expectedHeadline: "What's going on with Alex right now?",
  draft: {
    headline: "What's going on with Alex right now?",
    tldr: "Alex has more room to act on what they feel today, while a slower cycle is making the old plan harder to carry unchanged.",
    summary: "Alex has more room to act on what they feel today, while a slower cycle is making the old plan harder to carry unchanged.",
    body: "Alex can name what needs attention today without making every reaction bigger than it is. Mars trine Moon supports that quicker emotional follow-through. Things between you and Alex may need a little more patience right now, which is separate from what Alex is dealing with personally.\n\nUnderneath that, Pluto square Sun is a slower pressure cycle. Money and what Alex can rely on also need more deliberate structure while Saturn moves through the 2nd house. The immediate shift and the longer background are different stories, but both point toward handling what is actually changing instead of forcing the old plan to keep working.",
    action: "",
    timing: "",
    sections: []
  }
});
assert.equal(valid.passed, true, JSON.stringify(valid.issues));

const invented = validateFriendTransitReadingDraft({
  brief,
  expectedHeadline: "What's going on with Alex right now?",
  draft: {
    headline: "What's going on with Alex right now?",
    summary: "Alex is dealing with a major shift that deserves attention right now.",
    body: "You should know that Venus square Saturn in Virgo is changing Alex's 10th house on September 20. They usually avoid this kind of pressure.",
    sections: []
  }
});
assert.equal(invented.passed, false);
assert.ok(invented.issues.some((issue) => issue.code === "second_person"));
assert.ok(invented.issues.some((issue) => issue.code === "untraceable_body" && /Venus/u.test(issue.value)));
assert.ok(invented.issues.some((issue) => issue.code === "untraceable_sign"));
assert.ok(invented.issues.some((issue) => issue.code === "untraceable_house"));
assert.ok(invented.issues.some((issue) => issue.code === "untraceable_date"));
assert.ok(invented.issues.some((issue) => issue.code === "standing_trait_language"));

const dailyOnly = assertFriendTransitReadingBrief({ ...rawBrief, primaryThemes: [], longerCycles: [] });
assert.equal(friendTransitReadingCanGenerate(dailyOnly), false, "V1 must fail closed without at least one content-approved personal transit.");

console.log("Friend transit reading contract tests passed.");
