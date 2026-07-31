"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const defaultRegistryPath = path.join(__dirname, "..", "config", "editorial-model-registry.json");
const RELEASE_FIELDS = [
  "releaseId",
  "provider",
  "model",
  "promptVersion",
  "rubricVersion",
  "evaluationSetVersion",
  "policyVersion"
];
const PROVIDERS = new Set(["openai", "claude", "local"]);

const sha256 = (value) => crypto.createHash("sha256").update(String(value ?? "")).digest("hex");

function readRegistry(registryPath = defaultRegistryPath) {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function validateRelease(release, label = "release") {
  if (!release || typeof release !== "object" || Array.isArray(release)) {
    throw new Error(`${label} must be an object.`);
  }
  for (const field of RELEASE_FIELDS) {
    if (typeof release[field] !== "string" || !release[field].trim()) {
      throw new Error(`${label}.${field} must be a non-empty string.`);
    }
  }
  if (!PROVIDERS.has(release.provider)) {
    throw new Error(`${label}.provider must be openai, claude, or local.`);
  }
  return release;
}

function validateRegistry(registry) {
  if (registry?.schemaVersion !== 1) throw new Error("Registry schemaVersion must be 1.");
  if (!registry.registryVersion || !registry.policyVersion) {
    throw new Error("Registry version and policy version are required.");
  }
  if (!registry.lanes || typeof registry.lanes !== "object" || Array.isArray(registry.lanes)) {
    throw new Error("Registry lanes are required.");
  }

  for (const [laneId, lane] of Object.entries(registry.lanes)) {
    if (!new Set(["generation", "judge"]).has(lane.role)) throw new Error(`${laneId}.role is invalid.`);
    if (!lane.surface) throw new Error(`${laneId}.surface is required.`);
    if (laneId !== `${lane.role}:${lane.surface}`) {
      throw new Error(`${laneId} must match its role and surface (${lane.role}:${lane.surface}).`);
    }
    validateRelease(lane.active, `${laneId}.active`);
    if (lane.candidate) validateRelease(lane.candidate, `${laneId}.candidate`);
    if (lane.rollback) validateRelease(lane.rollback, `${laneId}.rollback`);
    if (!Array.isArray(lane.history)) throw new Error(`${laneId}.history must be an array.`);
    const ids = [lane.active, lane.candidate, lane.rollback].filter(Boolean).map((release) => release.releaseId);
    if (new Set(ids).size !== ids.length) throw new Error(`${laneId} release IDs must be distinct.`);
  }
  return registry;
}

function laneIdFor(role, surface = "default") {
  return `${role}:${surface || "default"}`;
}

function resolveLane(registry, role, surface = "default") {
  validateRegistry(registry);
  const exact = laneIdFor(role, surface);
  const fallback = laneIdFor(role, "default");
  const laneId = registry.lanes[exact] ? exact : fallback;
  const lane = registry.lanes[laneId];
  if (!lane) throw new Error(`No model lane is registered for ${exact}.`);
  return { laneId, lane };
}

function resolveActiveRelease({ role, surface = "default", registry = readRegistry() }) {
  const { laneId, lane } = resolveLane(registry, role, surface);
  return { laneId, registryVersion: registry.registryVersion, ...lane.active };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextRegistryVersion(current, recordedAt = new Date().toISOString()) {
  const day = recordedAt.slice(0, 10);
  const match = String(current || "").match(new RegExp(`^${day.replace(/-/g, "\\-")}\\.(\\d+)$`));
  return `${day}.${match ? Number(match[1]) + 1 : 1}`;
}

function stageCandidate(registry, laneId, release) {
  const next = clone(validateRegistry(registry));
  const lane = next.lanes[laneId];
  if (!lane) throw new Error(`Unknown model lane '${laneId}'.`);
  validateRelease(release, `${laneId}.candidate`);
  if (release.releaseId === lane.active.releaseId || release.releaseId === lane.rollback?.releaseId) {
    throw new Error("Candidate releaseId must differ from active and rollback releases.");
  }
  lane.candidate = clone(release);
  next.registryVersion = nextRegistryVersion(next.registryVersion);
  return next;
}

function validateCalibrationReport(report, candidateRelease) {
  if (!report || report.status !== "passed") throw new Error("Calibration report status must be 'passed'.");
  if (report.disagreement) throw new Error("A calibration report with disagreement cannot promote a model.");
  const separation = Number(report.separation);
  const minimumSeparation = Number(report.minimumSeparation);
  if (!Number.isFinite(separation) || !Number.isFinite(minimumSeparation) || minimumSeparation <= 0) {
    throw new Error("Calibration report must contain a numeric separation and positive minimumSeparation.");
  }
  if (separation < minimumSeparation) {
    throw new Error("Calibration separation is below the required minimum.");
  }
  if (!report.releaseId || report.releaseId !== candidateRelease.releaseId) {
    throw new Error("Calibration report releaseId does not match the candidate release.");
  }
  return report;
}

function assertPromotionAuthorized() {
  if (process.env.TLDR_ALLOW_MODEL_PROMOTION !== "1") {
    throw new Error("Model promotion is disabled. An authorized admin/CI action must set TLDR_ALLOW_MODEL_PROMOTION=1.");
  }
}

function promoteCandidate(registry, laneId, { approvedBy, calibrationReport, recordedAt = new Date().toISOString() }) {
  assertPromotionAuthorized();
  if (!approvedBy || !String(approvedBy).trim()) throw new Error("approvedBy is required.");
  const next = clone(validateRegistry(registry));
  const lane = next.lanes[laneId];
  if (!lane) throw new Error(`Unknown model lane '${laneId}'.`);
  if (!lane.candidate) throw new Error(`${laneId} has no staged candidate.`);
  validateCalibrationReport(calibrationReport, lane.candidate);
  const previous = lane.active;
  lane.rollback = previous;
  lane.active = lane.candidate;
  lane.candidate = null;
  lane.history.push({
    action: "promote",
    recordedAt,
    approvedBy: String(approvedBy).trim(),
    fromReleaseId: previous.releaseId,
    toReleaseId: lane.active.releaseId,
    calibrationReportSha256: sha256(JSON.stringify(calibrationReport))
  });
  next.registryVersion = nextRegistryVersion(next.registryVersion, recordedAt);
  return next;
}

function rollbackActive(registry, laneId, { approvedBy, recordedAt = new Date().toISOString() }) {
  assertPromotionAuthorized();
  if (!approvedBy || !String(approvedBy).trim()) throw new Error("approvedBy is required.");
  const next = clone(validateRegistry(registry));
  const lane = next.lanes[laneId];
  if (!lane) throw new Error(`Unknown model lane '${laneId}'.`);
  if (!lane.rollback) throw new Error(`${laneId} has no rollback release.`);
  const previous = lane.active;
  lane.active = lane.rollback;
  lane.rollback = previous;
  lane.history.push({
    action: "rollback",
    recordedAt,
    approvedBy: String(approvedBy).trim(),
    fromReleaseId: previous.releaseId,
    toReleaseId: lane.active.releaseId,
    calibrationReportSha256: null
  });
  next.registryVersion = nextRegistryVersion(next.registryVersion, recordedAt);
  return next;
}

function writeRegistry(registry, registryPath = defaultRegistryPath) {
  validateRegistry(registry);
  const temporaryPath = `${registryPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, registryPath);
}

module.exports = {
  assertPromotionAuthorized,
  defaultRegistryPath,
  laneIdFor,
  nextRegistryVersion,
  promoteCandidate,
  readRegistry,
  resolveActiveRelease,
  resolveLane,
  rollbackActive,
  sha256,
  stageCandidate,
  validateCalibrationReport,
  validateRegistry,
  validateRelease,
  writeRegistry
};
