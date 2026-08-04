"use strict";

const { readRegistry, resolveCandidateRelease } = require("./editorial-model-registry.js");
const { PACKET_VERSION, RELEASE_ID } = require("../../../.agents/skills/marie-satori-writer/scripts/compile-writing-packet.js");

function resolveWriterCandidate(registry = readRegistry()) {
  return resolveCandidateRelease({ role: "writer", surface: "sky-placement", releaseId: RELEASE_ID, registry });
}

function assertRoutingMatch({ packet, actualModel, actualReasoningEffort, actualLaneId }) {
  const expected = resolveWriterCandidate();
  const failures = [];
  if (packet?.packetVersion !== PACKET_VERSION) failures.push("packetVersion");
  if (packet?.routing?.laneId !== expected.laneId || actualLaneId !== expected.laneId) failures.push("laneId");
  if (packet?.routing?.requestedModel !== expected.model || actualModel !== expected.model) failures.push("model");
  if (packet?.routing?.requestedReasoningEffort !== expected.reasoningEffort || actualReasoningEffort !== expected.reasoningEffort) failures.push("reasoningEffort");
  if (packet?.routing?.promptVersion !== expected.promptVersion) failures.push("promptVersion");
  if (failures.length) throw new Error(`Sky Placement writer routing mismatch: ${[...new Set(failures)].join(", ")}. Artifact rejected.`);
  return {
    requestedModel: packet.routing.requestedModel,
    actualModel,
    requestedReasoningEffort: packet.routing.requestedReasoningEffort,
    actualReasoningEffort,
    laneId: actualLaneId,
    promptVersion: packet.routing.promptVersion,
    packetVersion: packet.packetVersion,
    retrievedOwnerSourceIds: packet.ownerPassages.map((entry) => entry.sourceId),
    warmthOwnerSourceIds: packet.ownerCorpusWarmthEvidence.sourceIds,
    routingMatchStatus: "matched"
  };
}

module.exports = { assertRoutingMatch, resolveWriterCandidate };
