import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  NATAL_QA_RUBRIC_PATH,
  NATAL_QA_RUBRIC_SHA256,
  NATAL_QA_VERSION,
  validateNatalQaContract,
  validateNatalQaPacket
} from "./validate-natal-chart-content-qa.mjs";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rendered = {
  you: "You notice the missed detail first, then keep working until the problem is handled.",
  friend: "They notice the missed detail first, then keep working until the problem is handled."
};

function passage(surface) {
  const pairedSurface = surface === "you" ? "friend" : "you";
  return {
    passageId: `moon-6th-${surface}`,
    comparisonGroupId: "moon-6th",
    surface,
    family: "placement-house",
    route: surface === "you" ? "/#you/placement/moon-scorpio-6h" : "/#friends/moon-scorpio-6h",
    renderKey: `moon|6th-house|${surface}`,
    renderedText: rendered[surface],
    renderedTextSha256: hash(rendered[surface]),
    sourceKeys: ["moon|6th-house"],
    productionCorrectness: { verdict: "PASS", notes: "Fixed natal placement." },
    youFriendComparison: {
      verdict: "PASS",
      pairedPassageId: `moon-6th-${pairedSurface}`,
      equivalenceNotes: "Equivalent placement meaning in the surface's natural voice."
    },
    sentenceWritingQuality: { verdict: "PASS", violations: [], revisionInstruction: "" },
    wholePassageReview: {
      judgeInputMode: "rendered_text_only",
      coreMessage: "The person notices practical problems and stays with them until they are resolved.",
      verdict: "PASS",
      flowDiagnosis: "The passage develops one behavior and consequence.",
      problemLines: [],
      revisionInstruction: "",
      hardFailureCodes: []
    },
    visualReview: { verdict: "PASS", viewports: ["desktop", "mobile"], notes: "Fully visible." },
    candidateState: "unchanged-approved"
  };
}

const validPacket = {
  schemaVersion: NATAL_QA_VERSION,
  generatedAt: "2026-08-12T16:30:00.000Z",
  rubric: { path: NATAL_QA_RUBRIC_PATH, sha256: NATAL_QA_RUBRIC_SHA256 },
  scope: { surfaces: ["you", "friend"] },
  governance: { advisoryOnly: true, servingChanges: false, autoPublish: false, writerPromotion: false },
  passages: [passage("you"), passage("friend")]
};

assert.equal(validateNatalQaContract().version, NATAL_QA_VERSION);
assert.deepEqual(validateNatalQaPacket(validPacket), { comparisonGroups: 1, passages: 2 });

const assembledPass = structuredClone(validPacket);
assembledPass.passages[0].wholePassageReview.hardFailureCodes = ["assembled_not_written"];
assert.throws(() => validateNatalQaPacket(assembledPass), /cannot PASS with a whole-passage hard failure/u);

const missingMessage = structuredClone(validPacket);
missingMessage.passages[0].wholePassageReview.coreMessage = "";
assert.throws(() => validateNatalQaPacket(missingMessage), /must not be empty/u);

const unpaired = structuredClone(validPacket);
unpaired.passages = [unpaired.passages[0], { ...unpaired.passages[0], passageId: "moon-6th-you-copy" }];
assert.throws(() => validateNatalQaPacket(unpaired), /duplicate you coverage/u);

const promotion = structuredClone(validPacket);
promotion.governance.writerPromotion = true;
assert.throws(() => validateNatalQaPacket(promotion));

console.log("Natal Chart Content QA contract passed: cold core-message gate, whole-passage hard failures, You/Friend pairing, hashes, and non-promotion governance.");
