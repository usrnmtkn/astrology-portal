#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import {
  BANNED_FRIEND_SENTENCES,
  observableSentenceProfile,
  validateBatchCadence,
  validateCrossRowUniqueness,
  validateFriendPair
} from "../src/astro-writing/natalBatchGuards.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4-OWNER-STYLE.xlsx";
const packetRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-writing-packets-v2.json";
const v4Relative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v4-two-voice-candidates.json";
const friendRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v5-authored-friend.json";
const outputRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v5-two-voice-candidates.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const SELF_REVISIONS = Object.freeze({
  "mars|opposition|north_node": "A coach watches you add another set after your form has started falling apart and asks what you are trying to prove. That question can show up in other parts of life too, through someone who notices the cost of a pursuit before you do. You can keep counting the goal while overlooking what the pursuit is spending. Guidance becomes valuable when another person can see what the chase is taking from your body, time, money, or relationships.",
  "mercury|trine|jupiter": "You open the document, see the whole argument, and still know which three steps have to happen first. New information can widen your judgment without making you abandon everything you already know. A larger idea becomes useful because you can organize it well enough for someone else to act. Each new source gives you better material for the next plan.",
  "moon|trine|north_node": "A teacher gives you one correction and you trust it enough to try it before building a defense. The tone feels familiar, the lesson lands quickly, and months of unnecessary resistance can disappear because you were willing to use the instruction early. That emotional familiarity may feel older than the relationship. You may learn faster when you trust the teacher, but the result still has to show which ideas were correct.",
  "moon|trine|saturn": "Everybody else is overwhelmed and you are the one making the list, finding the appointment, or keeping track of what has to happen next. You can keep feeling and reason in the same conversation and still stay useful under pressure. The problem is that usefulness can become camouflage. People may assume you are fine because you are still functioning, even when the situation is costing you just as much as anyone else.",
  "pluto|opposition|midheaven": "The impressive title loses some power once you compare it with the private goal you actually care about. You may have access to authority, recognition, or influence and still choose the research, family priority, private project, or work that gives you more control over what you are building. From outside, the choice can look like a retreat from status. You may simply be choosing the kind of power you are willing to live with."
});

function blockingCandidateViolations(copy) {
  return validateCopy(copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } })
    .violations.filter((item) => ["abstract_subject_grammar", "chart_deixis"].includes(item.category));
}

const sourcePath = path.join(repoRoot, sourceRelative);
const sourceRows = readInlineXlsxSheet(sourcePath, "Candidates132");
const packets = JSON.parse(fs.readFileSync(path.join(repoRoot, packetRelative), "utf8"));
const v4 = JSON.parse(fs.readFileSync(path.join(repoRoot, v4Relative), "utf8"));
const friendAuthored = JSON.parse(fs.readFileSync(path.join(repoRoot, friendRelative), "utf8"));
const packetByKey = new Map(packets.rows.map((row) => [row.rowKey, row]));
const v4ByKey = new Map(v4.rows.map((row) => [row.rowKey, row]));
const friendByKey = new Map(friendAuthored.rows.map((row) => [row.rowKey, row.copy]));
if (sourceRows.length !== 132 || packets.summary.ready !== 132 || friendByKey.size !== 132) {
  throw new Error("Batch 1 must contain 132 source rows, compliant packets, and independently authored Friend passages.");
}

const rows = sourceRows.map((row) => {
  const rowKey = row.cells["Row key"];
  const packet = packetByKey.get(rowKey);
  const prior = v4ByKey.get(rowKey);
  const selfCopy = SELF_REVISIONS[rowKey] || prior?.self?.copy;
  const friendCopy = friendByKey.get(rowKey);
  if (!packet?.generationAllowed || packet.packet.authoringTasks?.length !== 2) throw new Error(`${rowKey}: missing two-task compliant packet.`);
  if (!selfCopy || !friendCopy) throw new Error(`${rowKey}: missing V5 candidate copy.`);
  const selfGate = blockingCandidateViolations(selfCopy);
  const friendGate = blockingCandidateViolations(friendCopy);
  const pairGate = validateFriendPair({ selfCopy, friendCopy });
  if (selfGate.length || friendGate.length || !pairGate.passed) {
    throw new Error(`${rowKey}: V5 precheck failure ${JSON.stringify({ selfGate, friendGate, pair: pairGate.violations })}`);
  }
  return {
    rowNumber: row.rowNumber,
    rowKey,
    metadataSha256: row.cells["Metadata SHA-256"],
    astrologySupport: row.cells["AstrologySupport mechanism (source)"],
    astrologySupportSha256: sha256(row.cells["AstrologySupport mechanism (source)"]),
    packetVersion: packet.packet.packetVersion,
    factBoundarySource: packet.packet.factBoundary.sourcePath,
    self: {
      method: SELF_REVISIONS[rowKey] ? "REAUTHORED_FROM_MECHANISM_AFTER_V5_ABSTRACT_SUBJECT_PRECHECK" : prior.self.method,
      copy: selfCopy,
      precheck: "DETERMINISTIC CLEAR ONLY — semantic owner review pending",
      ownerVerdict: "",
      ownerEdit: "",
      observableSentenceProfile: observableSentenceProfile(selfCopy)
    },
    friend: {
      method: "INDIVIDUALLY_AUTHORED_FROM_MECHANISM_AT_OBSERVER_ENTRY_POINT_NO_SHARED_SCAFFOLD",
      derivedFromSelf: false,
      copy: friendCopy,
      precheck: "DETERMINISTIC CLEAR ONLY — semantic owner review pending",
      pairStructuralSimilarity: Number(pairGate.structuralSimilarity.toFixed(3)),
      ownerVerdict: "",
      ownerEdit: "",
      observableSentenceProfile: observableSentenceProfile(friendCopy)
    }
  };
});

const selfBatch = rows.map((row) => ({ rowKey: row.rowKey, copy: row.self.copy }));
const friendBatch = rows.map((row) => ({ rowKey: row.rowKey, copy: row.friend.copy }));
const selfCadence = validateBatchCadence(selfBatch);
const friendCadence = validateBatchCadence(friendBatch);
const selfUniqueness = validateCrossRowUniqueness(selfBatch);
const friendUniqueness = validateCrossRowUniqueness(friendBatch, { bannedSentences: BANNED_FRIEND_SENTENCES });
if (!selfCadence.passed || !friendCadence.passed || !selfUniqueness.passed || !friendUniqueness.passed) {
  throw new Error(`V5 batch gates failed: ${JSON.stringify({ selfCadence, friendCadence, selfUniqueness, friendUniqueness })}`);
}

const artifact = {
  schemaVersion: "ll-v13-wp1-batch-01-v5-two-voice-candidates-v1",
  generatedAt: "2026-08-13T00:00:00.000Z",
  sourceWorkbook: sourceRelative,
  sourceWorkbookSha256: sha256(fs.readFileSync(sourcePath)),
  packetArtifact: packetRelative,
  independentFriendAuthoringSource: friendRelative,
  governance: {
    reviewGatedCandidatesOnly: true,
    ownerVerdictsBlank: true,
    approvalEffect: "none",
    servingEffect: "none",
    autoPublish: false,
    writerPromotion: false
  },
  skeletonRetirement: {
    priorV4FramePlusSlotBuilderDeleted: true,
    sharedFriendFrameAvailableToWriter: false,
    sharedConnectorInventoryAvailableToWriter: false,
    sharedClosingInventoryAvailableToWriter: false
  },
  cadence: { self: selfCadence, friend: friendCadence },
  crossRowUniqueness: { self: selfUniqueness, friend: friendUniqueness },
  summary: {
    rows: rows.length,
    selfCandidates: rows.length,
    friendCandidates: rows.length,
    selfRowsReauthored: Object.keys(SELF_REVISIONS).length,
    selfRowsReauthoredForAbstractSubjectGate: 4,
    selfRowsReauthoredForCrossRowNearDuplicateGate: 1,
    friendRowsReauthored: friendByKey.size,
    sourceGaps: 0,
    blankOwnerVerdicts: true,
    bannedFriendSentenceFindings: friendUniqueness.bannedFindings.length
  },
  rows
};
const outputPath = path.join(repoRoot, outputRelative);
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputRelative, summary: artifact.summary, cadence: artifact.cadence, crossRowUniqueness: {
  self: { sentenceCount: selfUniqueness.sentenceCount, uniqueSentenceCount: selfUniqueness.uniqueSentenceCount, uniqueSentenceRatio: selfUniqueness.uniqueSentenceRatio, highestNearDuplicatePairScore: selfUniqueness.highestNearDuplicatePairScore },
  friend: { sentenceCount: friendUniqueness.sentenceCount, uniqueSentenceCount: friendUniqueness.uniqueSentenceCount, uniqueSentenceRatio: friendUniqueness.uniqueSentenceRatio, highestNearDuplicatePairScore: friendUniqueness.highestNearDuplicatePairScore }
} }, null, 2));
