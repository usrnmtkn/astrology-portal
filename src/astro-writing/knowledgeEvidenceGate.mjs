import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const resolver = require("../../packages/astro-knowledge/scripts/knowledge-resolver.js");

export function canonicalIdFromMeaningInput(input = {}) {
  if (typeof input.canonicalId === "string") return input.canonicalId;
  const contentKey = String(input.contentKey ?? "");
  const transitMatch = /^authored\/transit-aspect\/([^/]+)\/([^/]+)\/([^/]+)$/u.exec(contentKey);
  if (transitMatch) return `transit-aspect/${transitMatch[1]}/${transitMatch[2]}/${transitMatch[3]}`;
  if (input.transiting && input.natal && input.aspect) return `transit-aspect/${input.transiting}/${input.natal}/${input.aspect}`;
  if (input.object && input.sign) return `placement-sign/${input.object}/${input.sign}`;
  if (input.object && input.house) return `placement-house/${input.object}/${input.house}`;
  throw new Error("KNOWLEDGE_TARGET_REQUIRED: supply meaningInput.canonicalId or resolvable target facts. No provider call is allowed.");
}

export function resolvePipelineEvidence({ meaningInput, surface, register, maxChars = 6000, context = null }) {
  const canonicalId = canonicalIdFromMeaningInput(meaningInput);
  return resolver.buildPacket(canonicalId, { surface, register, maxChars, context });
}

export function assertProviderEvidence(packet, { canonicalId = packet?.canonicalId, surface = packet?.surface, register = packet?.register } = {}) {
  return resolver.assertPacket(packet, { canonicalId, surface, register });
}

export function evidenceLedgerFields(packet) {
  assertProviderEvidence(packet);
  return {
    indexSha256: packet.indexSha256,
    packetSha256: packet.packetSha256,
    evidenceSha256: [...packet.evidenceSha256],
    evidenceAuthorityClasses: [...new Set(packet.evidence.map((record) => record.authorityClass))].sort()
  };
}

export function gateModelClient(modelClient, packet, { beforeCall = null, additionalEvidence = null } = {}) {
  if (typeof modelClient !== "function") return modelClient;
  const gated = async (request) => {
    assertProviderEvidence(packet);
    if (beforeCall) beforeCall();
    return modelClient({
      ...request,
      knowledgeEvidence: evidenceLedgerFields(packet),
      knowledgePacket: packet,
      ...(additionalEvidence == null ? {} : { additionalEvidence })
    });
  };
  for (const key of ["provider", "model", "reasoningEffort", "thinkingLevel"]) gated[key] = modelClient[key] ?? null;
  return gated;
}

export function packetPrompt(packet) {
  assertProviderEvidence(packet);
  return resolver.packetToPrompt(packet);
}
