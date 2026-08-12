import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const NATAL_QA_VERSION = "natal-chart-content-qa-v1";
export const NATAL_QA_RUBRIC_PATH = "tldr-astro-phrasebank/TLDR-NATAL-CHART-WHOLE-PASSAGE-FLOW-JUDGE-OWNER.md";
export const NATAL_QA_RUBRIC_SHA256 = "df7ca21789ea4f12a8460ca2521f75ecba0d66f451f85f4c55d01ce984d25589";
export const NATAL_QA_PROTOCOL_PATH = "docs/qa/natal-chart-content-qa.md";
export const NATAL_QA_SCHEMA_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-v1.schema.json";

export const NATAL_QA_VERDICTS = new Set(["PASS", "EDIT", "CUT", "SOURCE_GAP"]);
export const NATAL_QA_HARD_FAILURES = new Set([
  "core_message_missing",
  "competing_core_messages",
  "central_subject_changed_without_bridge",
  "example_does_not_support_message",
  "conclusion_not_earned",
  "idea_level_repetition",
  "requires_astrology_context",
  "assembled_not_written"
]);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requireString(value, field) {
  assert.equal(typeof value, "string", `${field} must be a string.`);
  assert.ok(value.trim(), `${field} must not be empty.`);
}

function requireVerdict(value, field) {
  assert.ok(NATAL_QA_VERDICTS.has(value), `${field} must be PASS, EDIT, CUT, or SOURCE_GAP.`);
}

function sentenceCount(value) {
  return value.trim().split(/(?<=[.!?])\s+/u).filter(Boolean).length;
}

export function validateNatalQaContract() {
  const rubric = read(NATAL_QA_RUBRIC_PATH);
  const protocol = read(NATAL_QA_PROTOCOL_PATH);
  const schema = JSON.parse(read(NATAL_QA_SCHEMA_PATH));

  assert.equal(sha256(rubric), NATAL_QA_RUBRIC_SHA256, "Natal whole-passage rubric changed without a version/hash update.");
  assert.match(rubric, /Read only the rendered passage\./u);
  assert.match(rubric, /Before judging the prose, write one plain sentence/u);
  assert.match(rubric, /The You and Friend passages should communicate equivalent astrology without needing identical sentence structure\./u);
  assert.match(rubric, /PASS \/ EDIT \/ CUT \/ SOURCE_GAP/u);
  assert.match(rubric, /A passage cannot receive PASS if any of the following is true:/u);

  const orderedStages = [
    "Production correctness",
    "Complete You/Friend comparison",
    "Sentence-level writing quality",
    "Whole-passage concept and flow review",
    "Visual review",
    "Governed audit packet"
  ];
  let previousIndex = -1;
  for (const stage of orderedStages) {
    const index = protocol.indexOf(stage);
    assert.ok(index > previousIndex, `Natal QA protocol is missing or reorders stage: ${stage}.`);
    previousIndex = index;
  }
  assert.match(protocol, /No billed judge call is authorized/u);
  assert.match(protocol, /Approved copy remains byte-identical/u);

  assert.equal(schema.properties.schemaVersion.const, NATAL_QA_VERSION);
  assert.equal(schema.properties.rubric.properties.path.const, NATAL_QA_RUBRIC_PATH);
  assert.equal(schema.properties.rubric.properties.sha256.const, NATAL_QA_RUBRIC_SHA256);
  assert.deepEqual(schema.properties.scope.properties.surfaces.prefixItems.map((entry) => entry.const), ["you", "friend"]);
  assert.equal(schema.properties.governance.properties.advisoryOnly.const, true);
  assert.equal(schema.properties.governance.properties.servingChanges.const, false);
  assert.equal(schema.properties.governance.properties.autoPublish.const, false);
  assert.equal(schema.properties.governance.properties.writerPromotion.const, false);

  return {
    rubricPath: NATAL_QA_RUBRIC_PATH,
    rubricSha256: NATAL_QA_RUBRIC_SHA256,
    schemaPath: NATAL_QA_SCHEMA_PATH,
    version: NATAL_QA_VERSION
  };
}

export function validateNatalQaPacket(packet) {
  assert.equal(packet?.schemaVersion, NATAL_QA_VERSION, "Unexpected Natal QA packet version.");
  assert.ok(!Number.isNaN(Date.parse(packet.generatedAt)), "generatedAt must be an ISO date-time.");
  assert.deepEqual(packet.rubric, { path: NATAL_QA_RUBRIC_PATH, sha256: NATAL_QA_RUBRIC_SHA256 });
  assert.deepEqual(packet.scope?.surfaces, ["you", "friend"], "A full Natal QA packet must cover You and Friend.");
  assert.deepEqual(packet.governance, {
    advisoryOnly: true,
    servingChanges: false,
    autoPublish: false,
    writerPromotion: false
  });
  assert.ok(Array.isArray(packet.passages) && packet.passages.length >= 2, "A Natal QA packet needs at least one paired You/Friend passage.");

  const passageIds = new Set();
  const comparisonGroups = new Map();

  for (const passage of packet.passages) {
    const prefix = `passage ${passage?.passageId ?? "<missing>"}`;
    requireString(passage.passageId, `${prefix}.passageId`);
    assert.ok(!passageIds.has(passage.passageId), `Duplicate passageId: ${passage.passageId}.`);
    passageIds.add(passage.passageId);
    requireString(passage.comparisonGroupId, `${prefix}.comparisonGroupId`);
    assert.ok(["you", "friend"].includes(passage.surface), `${prefix}.surface must be you or friend.`);
    requireString(passage.family, `${prefix}.family`);
    requireString(passage.route, `${prefix}.route`);
    requireString(passage.renderKey, `${prefix}.renderKey`);
    requireString(passage.renderedText, `${prefix}.renderedText`);
    assert.equal(sha256(passage.renderedText), passage.renderedTextSha256, `${prefix} rendered text hash mismatch.`);
    assert.ok(Array.isArray(passage.sourceKeys) && passage.sourceKeys.length > 0, `${prefix}.sourceKeys must not be empty.`);

    for (const stage of ["productionCorrectness", "youFriendComparison", "sentenceWritingQuality", "visualReview"]) {
      assert.ok(passage[stage] && typeof passage[stage] === "object", `${prefix}.${stage} is required.`);
      requireVerdict(passage[stage].verdict, `${prefix}.${stage}.verdict`);
    }

    const whole = passage.wholePassageReview;
    assert.ok(whole && typeof whole === "object", `${prefix}.wholePassageReview is required.`);
    assert.equal(whole.judgeInputMode, "rendered_text_only", `${prefix} whole-passage judge must receive rendered text only.`);
    requireString(whole.coreMessage, `${prefix}.wholePassageReview.coreMessage`);
    assert.equal(sentenceCount(whole.coreMessage), 1, `${prefix} core message must be exactly one sentence.`);
    requireVerdict(whole.verdict, `${prefix}.wholePassageReview.verdict`);
    requireString(whole.flowDiagnosis, `${prefix}.wholePassageReview.flowDiagnosis`);
    assert.ok(Array.isArray(whole.problemLines), `${prefix}.wholePassageReview.problemLines must be an array.`);
    assert.ok(Array.isArray(whole.hardFailureCodes), `${prefix}.wholePassageReview.hardFailureCodes must be an array.`);
    assert.equal(new Set(whole.hardFailureCodes).size, whole.hardFailureCodes.length, `${prefix} hard-failure codes must be unique.`);
    for (const code of whole.hardFailureCodes) {
      assert.ok(NATAL_QA_HARD_FAILURES.has(code), `${prefix} has unknown hard-failure code: ${code}.`);
    }
    if (whole.verdict === "PASS") {
      assert.equal(whole.hardFailureCodes.length, 0, `${prefix} cannot PASS with a whole-passage hard failure.`);
      assert.equal(whole.problemLines.length, 0, `${prefix} cannot PASS with material problem lines.`);
    } else {
      requireString(whole.revisionInstruction, `${prefix}.wholePassageReview.revisionInstruction`);
    }

    assert.ok(["unchanged-approved", "needs_review", "discarded", "source_gap"].includes(passage.candidateState), `${prefix} has an invalid candidateState.`);
    const surfaces = comparisonGroups.get(passage.comparisonGroupId) ?? new Set();
    assert.ok(!surfaces.has(passage.surface), `${passage.comparisonGroupId} has duplicate ${passage.surface} coverage.`);
    surfaces.add(passage.surface);
    comparisonGroups.set(passage.comparisonGroupId, surfaces);
  }

  for (const passage of packet.passages) {
    assert.ok(passageIds.has(passage.youFriendComparison.pairedPassageId), `${passage.passageId} references a missing paired passage.`);
    const paired = packet.passages.find((candidate) => candidate.passageId === passage.youFriendComparison.pairedPassageId);
    assert.notEqual(paired.surface, passage.surface, `${passage.passageId} must pair You with Friend.`);
    assert.equal(paired.comparisonGroupId, passage.comparisonGroupId, `${passage.passageId} paired passage must share comparisonGroupId.`);
  }

  for (const [groupId, surfaces] of comparisonGroups) {
    assert.deepEqual([...surfaces].sort(), ["friend", "you"], `${groupId} must contain exactly one You and one Friend record.`);
  }

  return { comparisonGroups: comparisonGroups.size, passages: packet.passages.length };
}

function main() {
  const packetFlag = process.argv.indexOf("--packet");
  const contract = validateNatalQaContract();

  if (packetFlag < 0) {
    console.log("Natal Chart Content QA contract passed", contract);
    return;
  }

  const packetPath = process.argv[packetFlag + 1];
  requireString(packetPath, "--packet path");
  const packet = JSON.parse(fs.readFileSync(path.resolve(packetPath), "utf8"));
  console.log("Natal Chart Content QA packet passed", validateNatalQaPacket(packet));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
