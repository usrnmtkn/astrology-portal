"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const productionAdapter = require("./productionEvidenceAdapter.cjs");
const knowledgeResolver = require("../../packages/astro-knowledge/scripts/knowledge-resolver.js");
const phraseResolver = require("../../packages/astro-knowledge/scripts/phrase-resolver.js");

const repoRoot = path.resolve(__dirname, "..", "..");
const GOVERNED_SURFACES_FLAG = "WRITING_KERNEL_GOVERNED_SURFACES";
const SKY_CANARY_PERCENT_FLAG = "WRITING_KERNEL_SKY_CANARY_PERCENT";
const SKY_GLOBAL_ENABLE_FLAG = "WRITING_KERNEL_SKY_GLOBAL_ENABLE";
const TELEMETRY_FLAG = "WRITING_KERNEL_TELEMETRY";
const MIGRATION_READY_SURFACES = new Set(["sky"]);
const MODEL_ROLES = new Set(["MEANING_PLANNER", "WRITER", "COLD_REVIEWER", "REVIEWER", "REVISER"]);
const DRAFT_ROLES = new Set(["COLD_REVIEWER", "REVIEWER", "REVISER"]);
const sha256 = (value) => crypto.createHash("sha256")
  .update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value))
  .digest("hex");

function inputIdentity(input) {
  return sha256({
    contentKey: input?.contentKey,
    surface: input?.surface,
    mode: input?.mode,
    eventType: input?.eventType,
    facts: input?.facts ?? {},
    knowledgeIds: input?.knowledgeIds ?? [],
    sourceSnapshot: input?.sourceSnapshot ?? {},
    voiceNotes: input?.voiceNotes ?? "",
    reportPayload: input?.reportPayload ?? null
  });
}

function selectedSurfaces(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return new Set();
  return new Set(normalized.split(",").map((entry) => entry.trim()).filter(Boolean));
}

function telemetryEnabled(env) {
  return ["1", "true"].includes(String(env?.[TELEMETRY_FLAG] ?? "").trim().toLowerCase());
}

function telemetry(event, input, details, env = process.env, force = false) {
  if (!force && !telemetryEnabled(env)) return;
  console.info("WRITING_KERNEL_TELEMETRY", JSON.stringify({
    schemaVersion: 1,
    event,
    surface: input?.surface ?? null,
    contentKeySha256: sha256(String(input?.contentKey ?? "")),
    legacyIdentifierSha256: (input?.knowledgeIds ?? []).map((id) => sha256(String(id))),
    providerCallPrevented: event === "blocked",
    ...details
  }));
}

function skyCanary(input, governedSurfaces, env) {
  const eligible = governedSurfaces.has("sky") && input?.surface === "sky";
  const globalEnabled = String(env?.[SKY_GLOBAL_ENABLE_FLAG] ?? "").trim() === "1";
  if (input?.surface !== "sky") {
    return {
      eligible: false,
      percent: 0,
      bucket: null,
      globalEnabled: false,
      selected: false,
      rollback: `${SKY_CANARY_PERCENT_FLAG}=0 and ${SKY_GLOBAL_ENABLE_FLAG}=0`
    };
  }
  const rawPercent = String(env?.[SKY_CANARY_PERCENT_FLAG] ?? "0").trim();
  const percent = Number(rawPercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error(`PRODUCTION_SKY_CANARY_INVALID: ${rawPercent}. No provider call is allowed.`);
  }
  const bucket = Number.parseInt(sha256(String(input?.contentKey ?? "")).slice(0, 8), 16) % 100;
  return {
    eligible,
    percent,
    bucket,
    globalEnabled,
    selected: eligible && (globalEnabled || bucket < percent),
    rollback: `${SKY_CANARY_PERCENT_FLAG}=0 and ${SKY_GLOBAL_ENABLE_FLAG}=0`
  };
}

function productionValidationContract(input) {
  const event = String(input?.eventType ?? input?.facts?.type ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "-");
  if (input?.reportPayload || input?.mode === "report" || input?.surface === "year_ahead") {
    return { strategyId: "article", validationProfile: "article", register: "second_person" };
  }
  if (input?.surface === "sky") {
    if (input.mode === "article") return { strategyId: "article", validationProfile: "article", register: "collective" };
    if (event.includes("daily") || event.includes("lunar") || event.includes("season")) {
      return { strategyId: "daily", validationProfile: "daily", register: "collective" };
    }
    if (event === "collective-placement-card") {
      return {
        strategyId: "sky-placement",
        validationProfile: "sky-placement",
        register: "collective_with_second_person_close"
      };
    }
    return { strategyId: "sky-placement", validationProfile: "sky-placement", register: "collective" };
  }
  if (input?.surface === "friends" && event.includes("transit")) {
    return { strategyId: "friends-transit", validationProfile: "friends-transit", register: "third_person" };
  }
  if (input?.surface === "you" && event.includes("transit")) {
    return { strategyId: "friends-transit", validationProfile: "friends-transit", register: "second_person" };
  }
  if (["you", "natal"].includes(input?.surface)) {
    return event.includes("placement")
      ? { strategyId: "sky-placement", validationProfile: "sky-placement", register: "second_person" }
      : { strategyId: "generic", validationProfile: "shared-only", register: "second_person" };
  }
  if (["synastry", "composite", "relationship"].includes(input?.surface)) {
    return { strategyId: "synastry", validationProfile: "synastry", register: "second_person" };
  }
  throw new Error(`PRODUCTION_VALIDATION_SURFACE_UNMAPPED: '${input?.surface ?? "undefined"}/${input?.eventType ?? "undefined"}'. No provider call is allowed.`);
}

function assertCatalogPacket(packet) {
  if (packet?.packetKind === "ordered-multi-target") {
    return knowledgeResolver.assertMultiTargetPacket(packet);
  }
  return knowledgeResolver.assertPacket(packet);
}

function catalogPrompt(packet) {
  assertCatalogPacket(packet);
  return packet.packetKind === "ordered-multi-target"
    ? knowledgeResolver.multiTargetPacketToPrompt(packet)
    : knowledgeResolver.packetToPrompt(packet);
}

function reportEvidenceContract(input) {
  const payload = input?.reportPayload;
  if (!payload || payload.schemaVersion !== "report-generation-v3") {
    throw new Error("PRODUCTION_REPORT_EVIDENCE_INVALID: report-generation-v3 payload required. No provider call is allowed.");
  }
  if (payload.outputGovernance?.status !== "DRAFT"
    || payload.outputGovernance?.ownerApproved !== false
    || payload.outputGovernance?.promotionAuthorized !== false
    || payload.outputGovernance?.promotionAllowed !== false) {
    throw new Error("PRODUCTION_REPORT_GOVERNANCE_INVALID: report output must remain owner-review pending. No provider call is allowed.");
  }
  if (!payload.reportDomain || !payload.reportHorizon || !payload.unit?.unitId) {
    throw new Error("PRODUCTION_REPORT_IDENTITY_INVALID: report domain, horizon, and unit ID are required. No provider call is allowed.");
  }
  if ((payload.voiceEvidence ?? []).some((entry) => (
    entry.surface !== "report"
    || entry.eligible !== true
    || entry.sourceType !== "owner_authored_final"
  ))) {
    throw new Error("PRODUCTION_REPORT_VOICE_EVIDENCE_INVALID: report voice evidence is not surface-authorized. No provider call is allowed.");
  }
  const governedTextSources = [
    payload.canonicalOwnerPrompt,
    payload.generationStandard,
    payload.livedProseStandard,
    payload.noClevernessRuling,
    payload.ownerReviewEvidence,
    payload.coldProseRuling,
    ...(payload.voiceEvidence ?? []).map((entry) => ({ sourcePath: entry.sourcePath, text: entry.text }))
  ].filter(Boolean);
  const sourceRecords = governedTextSources.map((source) => {
    const relative = String(source.sourcePath ?? "");
    const absolute = path.resolve(repoRoot, relative);
    if (!relative || (!absolute.startsWith(`${repoRoot}${path.sep}`) && absolute !== repoRoot) || !fs.existsSync(absolute)) {
      throw new Error(`PRODUCTION_REPORT_SOURCE_MISSING: ${relative || "undefined"}. No provider call is allowed.`);
    }
    const bytes = fs.readFileSync(absolute);
    const text = bytes.toString("utf8");
    if (text !== String(source.text ?? "")) {
      throw new Error(`PRODUCTION_REPORT_SOURCE_STALE: ${relative}. No provider call is allowed.`);
    }
    return { path: relative, sourceSha256: sha256(bytes) };
  });
  const canonicalIdentity = `report/${payload.reportDomain}/${payload.reportHorizon}/${payload.unit?.unitId}`;
  const index = knowledgeResolver.assertIndexCurrent();
  const contract = {
    schemaVersion: 1,
    evidenceKind: "governed-report-payload",
    canonicalIdentity,
    surface: "report",
    indexSha256: index.indexSha256,
    sourceRecords,
    factorsSha256: sha256(payload.factors ?? []),
    manifestationSetsSha256: sha256(payload.manifestationSets ?? []),
    sourceGapsSha256: sha256(payload.sourceGaps ?? []),
    voiceEvidenceSha256: sha256(payload.voiceEvidence ?? []),
    governance: payload.outputGovernance
  };
  contract.packetSha256 = sha256(contract);
  return contract;
}

function phraseIsolation(canonicalIds, evidenceSurface) {
  const ids = canonicalIds.length ? canonicalIds : ["report/governed-payload"];
  return ids.map((canonicalId) => {
    const selection = phraseResolver.selectPhrases(canonicalId, { surface: evidenceSurface });
    phraseResolver.assertPhraseEvidence(selection);
    if ((selection.availableLines ?? []).length
      || (selection.components?.exact ?? []).length
      || (selection.components?.related ?? []).length) {
      throw new Error(`PRODUCTION_VOICE_EVIDENCE_LEAK: phrase evidence is not approved for ${evidenceSurface}. No provider call is allowed.`);
    }
    return {
      canonicalId,
      phraseIndexSha256: selection.phraseIndexSha256,
      excludedReason: selection.excludedReason
    };
  });
}

function prepareProductionPreCallGateUnchecked(input, env = process.env) {
  const validation = productionValidationContract(input);
  const governedSurfaces = selectedSurfaces(env[GOVERNED_SURFACES_FLAG]);
  const unsupportedPromotions = [...governedSurfaces].filter((surface) => !MIGRATION_READY_SURFACES.has(surface));
  if (unsupportedPromotions.length) {
    throw new Error(`PRODUCTION_SURFACE_PROMOTION_UNAUTHORIZED: ${unsupportedPromotions.join(", ")}. No provider call is allowed.`);
  }

  let evidence;
  let canonicalIds;
  let evidenceSurface;
  let governedPrompt = "";
  const canary = skyCanary(input, governedSurfaces, env);
  if (input?.reportPayload) {
    const contract = reportEvidenceContract(input);
    evidence = { kind: "report", packet: contract, mapped: null };
    canonicalIds = [contract.canonicalIdentity];
    evidenceSurface = "report";
  } else {
    const catalog = productionAdapter.buildProductionCatalogEvidence(input);
    assertCatalogPacket(catalog.packet);
    evidence = { kind: "catalog", packet: catalog.packet, mapped: catalog.mapped };
    canonicalIds = catalog.mapped.canonicalIds;
    evidenceSurface = catalog.mapped.evidenceSurface;
    governedPrompt = canary.selected ? catalogPrompt(catalog.packet) : "";
  }

  const phraseEvidence = phraseIsolation(canonicalIds, evidenceSurface);
  const gate = {
    schemaVersion: 1,
    inputIdentitySha256: inputIdentity(input),
    contentKey: input.contentKey,
    surface: input.surface,
    evidenceSurface,
    canonicalIds,
    evidence,
    validation,
    phraseEvidence,
    governedPrompt,
    governedPromptEnabled: Boolean(governedPrompt),
    governedPromptSurface: governedPrompt ? input.surface : null,
    canary,
    telemetryEnabled: telemetryEnabled(env),
    governance: { servingChanged: false, ownerApproved: false, servingEligible: false }
  };
  gate.gateSha256 = sha256({
    inputIdentitySha256: gate.inputIdentitySha256,
    evidencePacketSha256: gate.evidence.packet.packetSha256,
    validation: gate.validation,
    phraseIndexSha256: [...new Set(phraseEvidence.map((entry) => entry.phraseIndexSha256))],
    governedPromptEnabled: gate.governedPromptEnabled,
    canary: gate.canary
  });
  return gate;
}

function prepareProductionPreCallGate(input, env = process.env) {
  try {
    return prepareProductionPreCallGateUnchecked(input, env);
  } catch (error) {
    telemetry("blocked", input, {
      stage: "prepare",
      errorCode: String(error?.message ?? "PRODUCTION_PRECALL_PREPARE_FAILED").split(":", 1)[0]
    }, env);
    throw error;
  }
}

function assertProductionPreCallGateUnchecked(gate, {
  role,
  input,
  draftValidation = null
}) {
  if (!MODEL_ROLES.has(role)) {
    throw new Error(`PRODUCTION_MODEL_ROLE_UNKNOWN: ${role}. No provider call is allowed.`);
  }
  if (!gate || gate.inputIdentitySha256 !== inputIdentity(input)) {
    throw new Error("PRODUCTION_PRECALL_INPUT_MISMATCH: no provider call is allowed.");
  }
  if (gate.evidence.kind === "catalog") {
    assertCatalogPacket(gate.evidence.packet);
  } else {
    const rebuilt = reportEvidenceContract(input);
    if (rebuilt.packetSha256 !== gate.evidence.packet.packetSha256) {
      throw new Error("PRODUCTION_REPORT_EVIDENCE_STALE: no provider call is allowed.");
    }
  }
  for (const selection of gate.phraseEvidence) {
    const current = phraseResolver.selectPhrases(selection.canonicalId, { surface: gate.evidenceSurface });
    phraseResolver.assertPhraseEvidence(current);
    if (current.phraseIndexSha256 !== selection.phraseIndexSha256) {
      throw new Error("PRODUCTION_PHRASE_EVIDENCE_STALE: no provider call is allowed.");
    }
  }
  if (DRAFT_ROLES.has(role) && draftValidation?.passed !== true) {
    const reportRepairInput = gate.evidence.kind === "report" && draftValidation?.checked === true;
    if (!reportRepairInput) {
      const details = (draftValidation?.violations ?? []).map((entry) => `${entry.category}:${entry.detail}`).join("; ");
      throw new Error(`PRODUCTION_DRAFT_VALIDATION_FAILED: ${details || "deterministic validation did not pass"}. No provider call is allowed.`);
    }
  }
  return {
    gateSha256: gate.gateSha256,
    role,
    evidencePacketSha256: gate.evidence.packet.packetSha256,
    knowledgeIndexSha256: gate.evidence.packet.indexSha256,
    phraseIndexSha256: [...new Set(gate.phraseEvidence.map((entry) => entry.phraseIndexSha256))],
    validationProfile: gate.validation.validationProfile,
    governedPromptEnabled: gate.governedPromptEnabled
  };
}

function assertProductionPreCallGate(gate, options) {
  try {
    const result = assertProductionPreCallGateUnchecked(gate, options);
    if (gate?.telemetryEnabled) {
      telemetry("provider-call-cleared", options?.input, {
        role: options?.role ?? null,
        gateSha256: result.gateSha256,
        evidencePacketSha256: result.evidencePacketSha256,
        validationProfile: result.validationProfile,
        canarySelected: gate.canary?.selected === true
      }, process.env, true);
    }
    return result;
  } catch (error) {
    if (gate?.telemetryEnabled) {
      telemetry("blocked", options?.input, {
        stage: "assert",
        role: options?.role ?? null,
        gateSha256: gate?.gateSha256 ?? null,
        evidencePacketSha256: gate?.evidence?.packet?.packetSha256 ?? null,
        validationProfile: gate?.validation?.validationProfile ?? null,
        errorCode: String(error?.message ?? "PRODUCTION_PRECALL_ASSERT_FAILED").split(":", 1)[0]
      }, process.env, true);
    }
    throw error;
  }
}

module.exports = {
  GOVERNED_SURFACES_FLAG,
  SKY_CANARY_PERCENT_FLAG,
  SKY_GLOBAL_ENABLE_FLAG,
  TELEMETRY_FLAG,
  MIGRATION_READY_SURFACES,
  MODEL_ROLES,
  productionValidationContract,
  reportEvidenceContract,
  prepareProductionPreCallGate,
  assertProductionPreCallGate
};
