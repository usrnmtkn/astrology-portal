#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import {
  BANNED_FRIEND_SENTENCES,
  observableSentenceProfile,
  validateBatchCadence,
  validateCrossRowUniqueness,
  validateFriendPair,
  validatePassageShape
} from "../src/astro-writing/natalBatchGuards.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v5Relative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v5-two-voice-candidates.json";
const friendRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v6-authored-friend.json";
const outputRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v6-two-voice-candidates.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const SELF_SENTENCE_REVISIONS = new Map([
  ["Hope becomes expensive when it starts repainting facts that need to stay unpleasant.", "You pay for hope when you use it to repaint facts that need to stay unpleasant."],
  ["Familiarity can make the lesson easier to receive without making the circumstances easy.", "You may receive the lesson sooner because the situation feels familiar, even when the circumstances remain difficult."],
  ["Guidance becomes valuable when another person can see what the chase is taking from your body, time, money, or relationships.", "A coach earns your attention by showing what the chase is taking from your body, time, money, or relationships."],
  ["Old friction with authority makes learning unnecessarily expensive.", "You spend extra time fighting the authority before you can use the instruction."],
  ["Put the facts on the page separately so imagination does not quietly become evidence.", "Write the facts on a separate page and keep the image or hunch from taking their place."],
  ["Another person's resistance keeps the mind moving long after the useful part of the argument is over.", "You may keep arguing long after another person's resistance has shown you the useful part is over."],
  ["Guidance becomes harder to dismiss when it keeps arriving through people who see the same pattern from outside you.", "A mentor becomes harder to dismiss after several people describe the same pattern from outside you."],
  ["Let familiarity make the lesson easier to receive without turning it into automatic agreement.", "Use the familiar tone to receive the lesson, then check the teacher's claim before agreeing."],
  ["Excitement, worry, irritation, or tenderness can show up in your expression, posture, or voice while you are still trying to keep the interaction neutral.", "Other people can see excitement, worry, irritation, or tenderness in your expression, posture, or voice while you are still trying to keep the interaction neutral."],
  ["Emotional sensitivity becomes visible through the work, especially in roles built around care, hospitality, public trust, or responsiveness.", "Clients see your emotional sensitivity through work built around care, hospitality, public trust, or responsiveness."],
  ["Emotional guidance becomes harder to dismiss when another person gives you live footage of the response.", "A teacher is harder to dismiss after showing you live footage of your emotional response."],
  ["Pride can protect a vulnerable feeling by changing the subject to how impressive, competent, or generous you are.", "You may protect a vulnerable feeling by changing the subject to how impressive, competent, or generous you are."],
  ["Achievement becomes one of the places where values get tested in public.", "A promotion tests your values where coworkers can see the decision."],
  ["Relationship makes spiritual direction practical because somebody else's life is affected by your choices.", "A partner makes spiritual direction practical because somebody else's life is affected by your choices."]
]);

const SELF_OBSERVABILITY_ADDITIONS = Object.freeze({
  "jupiter|square|ascendant":"The restaurant bill and another person's untouched plate make that imbalance visible.",
  "jupiter|square|south_node":"A repeated morning message gives you something concrete to answer differently.",
  "jupiter|trine|midheaven":"A client letter or office policy shows who benefited after the platform grew.",
  "mars|conjunction|pluto":"The project file and exhausted coworker reveal when endurance has crossed into force.",
  "mars|opposition|ascendant":"The scorecard and kitchen chore both show when comparison has taken over.",
  "mars|opposition|neptune":"A credit line in the report and a later email expose the exaggeration.",
  "mars|square|neptune":"The unfinished application and closed notebook are still one result, not a verdict.",
  "mars|trine|ascendant":"A stalled car or crowded doorway gives that courage somewhere visible to act.",
  "mars|trine|pluto":"A repaired machine and signed checklist show what controlled power actually finished.",
  "mars|trine|south_node":"A familiar invitation and the Saturday calendar record the different choice.",
  "mercury|opposition|south_node":"The old sentence reappears in a new email and produces the same reply.",
  "mercury|opposition|uranus":"The meeting notes and next day's message show when the borrowed idea became yours.",
  "mercury|square|saturn":"The deadline remains on the calendar while one paragraph receives another hour.",
  "mercury|square|south_node":"A second message thread at the kitchen table gives you a place to try a different explanation.",
  "mercury|trine|south_node":"A notebook margin can hold the old assumption beside the corrected fact.",
  "mercury|trine|uranus":"A whiteboard sketch and working tool keep the unusual idea attached to evidence.",
  "moon|opposition|north_node":"A counselor's notes and the next family dinner make the repeated response observable.",
  "moon|square|uranus":"A canceled appointment and changed dinner plan show what the sudden mood moved.",
  "moon|trine|ascendant":"A kitchen doorway and another person's face give the openness a visible scene.",
  "moon|trine|uranus":"A rescheduled train and updated calendar make adaptation more than a trait claim.",
  "neptune|conjunction|midheaven":"A client brief and finished image let other people check the intuitive contribution.",
  "neptune|conjunction|north_node":"A dated dream notebook gives the teacher and the impression something testable.",
  "neptune|conjunction|south_node":"A written record and later phone call keep familiarity from becoming proof.",
  "neptune|opposition|north_node":"The offer letter and bank balance make the intuitive decision materially consequential.",
  "neptune|opposition|south_node":"A saved message and appointment time help separate the impression from its interpretation.",
  "neptune|square|midheaven":"The abandoned report and busy service desk show which work actually draws effort.",
  "neptune|trine|ascendant":"A crowded café and a friend's unfinished sentence make the sensitivity observable.",
  "north_node|conjunction|ascendant":"A changed job, room, or boundary lets friends see the direction in ordinary life.",
  "north_node|conjunction|midheaven":"A staff budget and public signature show which values survived the promotion.",
  "north_node|opposition|midheaven":"The family calendar and employment contract put both sides of the choice on paper.",
  "north_node|square|ascendant":"A bank statement and weekly schedule show which identity receives material support.",
  "north_node|square|midheaven":"The offer letter and missed dinner make the public conflict measurable.",
  "north_node|trine|midheaven":"The project budget and protected evening show the career supporting the deeper direction.",
  "pluto|conjunction|ascendant":"The interview chair and missing document give the intensity a specific target.",
  "pluto|conjunction|south_node":"A returned letter and kitchen argument supply new evidence against the old story.",
  "pluto|opposition|south_node":"A repeated phone call and locked office door show where the control pattern returned."
});

function revisedSelf(row) {
  const sentences = row.self.copy.split(/(?<=[.!?])\s+/u).map((sentence) => SELF_SENTENCE_REVISIONS.get(sentence) || sentence);
  const addition = SELF_OBSERVABILITY_ADDITIONS[row.rowKey];
  return `${sentences.join(" ")}${addition ? ` ${addition}` : ""}`;
}

const v5 = JSON.parse(fs.readFileSync(path.join(root, v5Relative), "utf8"));
const friend = JSON.parse(fs.readFileSync(path.join(root, friendRelative), "utf8"));
const friendByKey = new Map(friend.rows.map((row) => [row.rowKey, row.copy]));
const rows = v5.rows.map((row) => {
  const selfCopy = revisedSelf(row);
  const friendCopy = friendByKey.get(row.rowKey);
  if (!friendCopy) throw new Error(`${row.rowKey}: missing V6 Friend passage`);
  const selfShape = validatePassageShape(selfCopy, { minSentences: 1, minWords: 1, minDistinctObservableNouns: 2 });
  const friendShape = validatePassageShape(friendCopy);
  const selfAbstract = validateCopy(selfCopy, { plan: { astrologySupport: "present" } }).violations.filter((item) => item.category === "abstract_subject_grammar");
  const friendAbstract = validateCopy(friendCopy, { plan: { astrologySupport: "present" } }).violations.filter((item) => item.category === "abstract_subject_grammar");
  const pair = validateFriendPair({ selfCopy, friendCopy });
  if (!selfShape.passed || !friendShape.passed || selfAbstract.length || friendAbstract.length || !pair.passed) {
    throw new Error(`${row.rowKey}: V6 precheck failure ${JSON.stringify({ selfShape: selfShape.violations, friendShape: friendShape.violations, selfAbstract, friendAbstract, pair: pair.violations })}`);
  }
  return {
    ...row,
    self: { ...row.self, method: SELF_OBSERVABILITY_ADDITIONS[row.rowKey] ? "V5_SELF_METHOD_WITH_TARGETED_OBSERVABILITY_EVIDENCE" : row.self.method, copy: selfCopy, observableSentenceProfile: observableSentenceProfile(selfCopy) },
    friend: { ...row.friend, method: "INDIVIDUALLY_AUTHORED_FROM_MECHANISM_AT_OBSERVER_ENTRY_POINT_NO_SHARED_FRAME_V6", copy: friendCopy, pairStructuralSimilarity: Number(pair.structuralSimilarity.toFixed(3)), observableSentenceProfile: observableSentenceProfile(friendCopy) }
  };
});

const selfRows = rows.map((row) => ({ rowKey: row.rowKey, copy: row.self.copy }));
const friendRows = rows.map((row) => ({ rowKey: row.rowKey, copy: row.friend.copy }));
const selfUniqueness = validateCrossRowUniqueness(selfRows);
const friendUniqueness = validateCrossRowUniqueness(friendRows, { bannedSentences: BANNED_FRIEND_SENTENCES });
const selfCadence = validateBatchCadence(selfRows);
const friendCadence = validateBatchCadence(friendRows);
if (!selfUniqueness.passed || !friendUniqueness.passed || !selfCadence.passed || !friendCadence.passed) throw new Error("V6 batch-level gates failed.");
const sentenceCounts = (voice) => rows.reduce((counts, row) => {
  const count = row[voice].copy.split(/(?<=[.!?])\s+/u).length;
  counts[count] = (counts[count] || 0) + 1;
  return counts;
}, {});
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const words = (copy) => copy.match(/[A-Za-z0-9']+/gu)?.length || 0;
const metrics = Object.fromEntries(["self", "friend"].map((voice) => [voice, {
  sentenceCountDistribution: sentenceCounts(voice),
  medianWords: median(rows.map((row) => words(row[voice].copy))),
  zeroObservableNounRows: rows.filter((row) => row[voice].observableSentenceProfile.zeroObservableNouns).length,
  underTwoObservableNounRows: rows.filter((row) => row[voice].observableSentenceProfile.distinctObservableNounCount < 2).length
}]));
const artifact = {
  ...v5,
  schemaVersion: "ll-v13-wp1-batch-01-v6-two-voice-candidates-v1",
  generatedAt: "2026-08-13T00:00:00.000Z",
  independentFriendAuthoringSource: friendRelative,
  skeletonRetirement: { ...v5.skeletonRetirement, priorV4FramePlusSlotBuilderDeleted: true, sharedFriendFrameAvailableToWriter: false },
  cadence: { self: selfCadence, friend: friendCadence },
  crossRowUniqueness: { self: selfUniqueness, friend: friendUniqueness },
  metrics,
  summary: { ...v5.summary, friendRowsReauthored: 132, selfRowsReauthoredForObservability: Object.keys(SELF_OBSERVABILITY_ADDITIONS).length, blankOwnerVerdicts: true, bannedFriendSentenceFindings: 0 },
  rows
};
fs.writeFileSync(path.join(root, outputRelative), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputRelative, metrics, uniqueness: { self: { ratio: selfUniqueness.uniqueSentenceRatio, score: selfUniqueness.highestNearDuplicatePairScore }, friend: { ratio: friendUniqueness.uniqueSentenceRatio, score: friendUniqueness.highestNearDuplicatePairScore } }, sha256: sha256(JSON.stringify(artifact)) }, null, 2));
