import crypto from "node:crypto";

export const REALIZATION_FIELDS = [
  "supportive_realizations",
  "neutral_realizations",
  "shadow_realizations",
];

const aspectRealizationPriority = {
  conjunction: ["neutral", "supportive", "shadow"],
  opposition: ["neutral", "shadow", "supportive"],
  square: ["shadow", "neutral", "supportive"],
  trine: ["supportive", "neutral", "shadow"],
  sextile: ["supportive", "neutral", "shadow"],
};

const shadowSignals = /\b(?:against|cannot|conflict|consequence|control|cost|delay|denied|difficult|disappear|dismiss|erase|exclude|fail|fight|harder|hidden|ignore|limit|lose|loss|overlook|pressure|punish|refus|reject|risk|surrender|unequal|unsafe|withhold|without)\w*\b/iu;
const supportiveSignals = /\b(?:accept|available|benefit|clear|closer|connect|credit|deliver|dependable|fair|help|include|improve|maintain|open|opportun|protect|recogniz|repair|reliable|support|trust survives|useful|workable)\w*\b/iu;

function fieldForType(type) {
  return `${type}_realizations`;
}

export function emptyTypedRealizations() {
  return Object.fromEntries(REALIZATION_FIELDS.map((field) => [field, []]));
}

export function classifyRealization(value) {
  if (shadowSignals.test(value)) return "shadow";
  if (supportiveSignals.test(value)) return "supportive";
  return "neutral";
}

export function typeRealizations(values, overrides = {}) {
  const typed = emptyTypedRealizations();
  for (const value of values) {
    const type = overrides[value] ?? classifyRealization(value);
    const field = fieldForType(type);
    if (!Object.hasOwn(typed, field)) throw new Error(`Unknown realization type ${type}`);
    typed[field].push(value);
  }
  return typed;
}

export function addTypedRealizations(record) {
  if (REALIZATION_FIELDS.every((field) => Array.isArray(record[field]))) return record;
  const values = [record.reader_effect, record.conflict_behavior, record.movement_bias].filter(Boolean);
  const typed = emptyTypedRealizations();
  if (record.reader_effect) typed.neutral_realizations.push(record.reader_effect);
  if (record.conflict_behavior) typed.shadow_realizations.push(record.conflict_behavior);
  if (record.movement_bias) typed.supportive_realizations.push(record.movement_bias);
  if (values.length !== REALIZATION_FIELDS.reduce((total, field) => total + typed[field].length, 0)) {
    throw new Error(`${record.key}: failed to classify mechanism realizations`);
  }
  return { ...record, ...typed };
}

function deterministicIndex(seed, length) {
  if (length <= 1) return 0;
  const digest = crypto.createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) % length;
}

function firstAvailableType(unit, priorities) {
  return priorities.find((type) => unit[fieldForType(type)]?.length > 0) ?? null;
}

export function selectRealizationForAspect(unit, aspect, seed = unit.key) {
  const priorities = aspectRealizationPriority[aspect];
  if (!priorities) throw new Error(`${unit.key}: unsupported aspect ${aspect}`);
  const type = firstAvailableType(unit, priorities);
  if (!type) throw new Error(`${unit.key}: no typed realization is available`);
  const values = unit[fieldForType(type)];
  const value = values[deterministicIndex(`${seed}|${unit.key}|${aspect}|${type}`, values.length)];
  return { type, value };
}

export function realizationSchemaReport(rows) {
  const missing = [];
  const legacy = [];
  const countShapes = new Map();
  const emptyAll = [];
  for (const row of rows) {
    if (Object.hasOwn(row, "reader_manifestations")) legacy.push(row.key);
    const counts = {};
    for (const field of REALIZATION_FIELDS) {
      if (!Array.isArray(row[field])) missing.push({ key: row.key, field });
      counts[field] = Array.isArray(row[field]) ? row[field].length : 0;
    }
    if (Object.values(counts).every((count) => count === 0)) emptyAll.push(row.key);
    const shape = REALIZATION_FIELDS.map((field) => counts[field]).join("/");
    countShapes.set(shape, (countShapes.get(shape) ?? 0) + 1);
  }
  return {
    reviewedUnits: rows.length,
    legacyReaderManifestationFields: legacy,
    missingTypedArrays: missing,
    emptyTypedUnits: emptyAll,
    countShapeDistribution: [...countShapes.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([shape, units]) => ({ shape, units })),
    positionalTemplatePrevented: legacy.length === 0 && missing.length === 0 && emptyAll.length === 0,
  };
}

export function assertTypedRealizationSchema(rows) {
  const report = realizationSchemaReport(rows);
  if (!report.positionalTemplatePrevented) {
    throw new Error(`Typed realization schema failed: ${JSON.stringify(report)}`);
  }
  if (report.countShapeDistribution.length < 2) {
    throw new Error("Typed realization arrays still carry one fixed count pattern");
  }
  return report;
}
