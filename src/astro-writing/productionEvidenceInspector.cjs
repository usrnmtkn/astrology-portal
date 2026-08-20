"use strict";

const crypto = require("node:crypto");
const {
  prepareProductionPreCallGate,
  assertProductionPreCallGate
} = require("./productionPreCallGate.cjs");

const sha256 = (value) => crypto.createHash("sha256")
  .update(typeof value === "string" ? value : JSON.stringify(value))
  .digest("hex");

const SECRET_HEADERS = new Set(["authorization", "x-api-key", "x-goog-api-key"]);

function requestPreview(request) {
  if (!request) return null;
  if (!request.endpoint || !request.method || !request.body) {
    throw new Error("PRODUCTION_INSPECTOR_REQUEST_INCOMPLETE: endpoint, method, and exact body are required.");
  }
  const headers = Object.fromEntries(Object.entries(request.headers ?? {}).map(([name, value]) => {
    if (SECRET_HEADERS.has(name.toLowerCase())) {
      if (value !== "[REDACTED]") {
        throw new Error(`PRODUCTION_INSPECTOR_SECRET_REJECTED: ${name} must be supplied as [REDACTED].`);
      }
      return [name, "[REDACTED]"];
    }
    return [name, value];
  }));
  const preview = {
    provider: request.provider ?? null,
    model: request.model ?? request.body.model ?? null,
    endpoint: request.endpoint,
    method: request.method,
    headers,
    body: request.body
  };
  return { ...preview, requestSha256: sha256(preview) };
}

function packetsFor(gate) {
  const packet = gate.evidence.packet;
  if (gate.evidence.kind === "report") return [];
  return packet.packetKind === "ordered-multi-target" ? packet.packets : [packet];
}

function inspectProductionEvidence({ input, env = {}, role = "WRITER", draftValidation = null, providerRequest = null }) {
  const gate = prepareProductionPreCallGate(input, env);
  const assertion = assertProductionPreCallGate(gate, { role, input, draftValidation });
  const packets = packetsFor(gate);
  const inspection = {
    schemaVersion: 1,
    generatedBy: "productionEvidenceInspector.cjs",
    input: {
      contentKey: input.contentKey,
      surface: input.surface,
      mode: input.mode,
      eventType: input.eventType,
      legacyKnowledgeIds: input.knowledgeIds ?? []
    },
    canonical: {
      evidenceSurface: gate.evidenceSurface,
      canonicalIds: gate.canonicalIds,
      mappings: gate.evidence.mapped?.mappings ?? [],
      contentKeyMapping: gate.evidence.mapped?.contentKeyMapping ?? null
    },
    selectedEvidence: packets.flatMap((packet) => packet.evidence.map((record) => ({
      canonicalId: packet.canonicalId,
      targetUsage: packet.targetUsage ?? "primary",
      temporality: record.temporality,
      authorityClass: record.authorityClass,
      usage: record.usage,
      surfacePermission: record.surfacePermission,
      store: record.store,
      path: record.path,
      field: record.field,
      rowKey: record.rowKey,
      sourceSha256: record.sourceSha256,
      evidenceSha256: record.evidenceSha256,
      text: record.text
    }))),
    exclusions: packets.map((packet) => ({
      canonicalId: packet.canonicalId,
      exclusions: packet.exclusions,
      licenses: packet.licenses,
      voiceExemplars: packet.voiceExemplars
    })),
    phraseIsolation: gate.phraseEvidence,
    validation: {
      ...gate.validation,
      role,
      draftValidation,
      rulesRun: draftValidation?.rulesRun ?? null
    },
    hashes: {
      gateSha256: gate.gateSha256,
      evidencePacketSha256: gate.evidence.packet.packetSha256,
      knowledgeIndexSha256: gate.evidence.packet.indexSha256,
      phraseIndexSha256: assertion.phraseIndexSha256
    },
    governedPrompt: {
      enabled: gate.governedPromptEnabled,
      surface: gate.governedPromptSurface,
      text: gate.governedPrompt
    },
    activation: {
      canary: gate.canary,
      telemetryEnabled: gate.telemetryEnabled
    },
    providerRequest: requestPreview(providerRequest),
    governance: gate.governance
  };
  inspection.inspectionSha256 = sha256(inspection);
  return inspection;
}

module.exports = { inspectProductionEvidence, requestPreview };
