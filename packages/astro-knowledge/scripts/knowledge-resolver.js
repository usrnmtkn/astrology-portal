"use strict";

/**
 * Governed writing evidence resolver.
 *
 * The catalog identifies records. This resolver selects bounded evidence for
 * one surface and register, verifies every source hash, and labels related
 * natal material as mechanism-only. Input status is retained for audit but is
 * never used to establish authority.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const indexPath = path.join(repoRoot, "packages/astro-knowledge/generated/knowledge-index.json");
const AUTHORITY_CLASSES = new Set([
  "factual-evidence", "owner-approved-prose", "voice-exemplar",
  "negative-example", "machine-proposal", "unverified"
]);
const EXEMPLAR_CLASSES = new Set(["owner-approved-prose", "voice-exemplar"]);
// These stores are indexed for discovery/audit only. Serving copy must never
// be imitated and third-party books must be voiced originally rather than
// quoted into a provider prompt.
const NEVER_PROMPT_STORES = new Set(["ac-reference", "book-ms-ca", "book-ms-aasb", "serving"]);
const TEXT_FIELDS = [
  "plainTranslation", "tldr", "body", "summaryDeep", "summaryShort",
  "tension", "advice", "copy", "astrologyBody", "shadow", "business",
  "expanded_narrative", "pull_quote", "supportingQuote", "policy",
  "overview", "summary", "definition", "note", "cycle", "challenge",
  "collectiveGift", "scenarioPolicy",
  // V9 matrix column names. Without these the whole matrix-v9 store resolves to
  // zero readable text: every object sourced only from it returned an empty
  // packet, which stayed hidden because most V9 objects are co-sourced from
  // stores whose field names were already listed. Verified contained — these
  // name appears in no other store.
  "Experience",
  // Owner-approved V9 transit rows use title-case `Copy`. This spelling is
  // contained to the two matrix-v9 stores; without it, real South Node
  // doctrine (and other V9 event records) exists in the catalog but resolves
  // to an empty packet.
  "Copy"
];
const TEMPORALITY = Object.freeze({
  "transit-aspect": "temporary-window",
  "transit-house": "temporary-window",
  "natal-aspect": "lifelong-pattern",
  "placement-sign": "lifelong-pattern",
  "placement-house": "lifelong-pattern",
  "placement-sign-house": "lifelong-pattern",
  "synastry-aspect": "standing-between-two-people",
  "composite-aspect": "standing-between-two-people",
  "composite-placement": "standing-between-two-people",
  "composite-sign": "standing-between-two-people",
  "house-overlay": "standing-between-two-people",
  lunation: "dated-event",
  "lunar-phase": "recurring-phase"
});

const sha256 = (value) => crypto.createHash("sha256")
  .update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value))
  .digest("hex");

let cached = null;
function loadIndex({ verifySources = true } = {}) {
  if (!cached) {
    if (!fs.existsSync(indexPath)) {
      throw new Error("KNOWLEDGE_INDEX_MISSING: run node scripts/build-knowledge-index.mjs --write. No provider call is allowed.");
    }
    const raw = fs.readFileSync(indexPath, "utf8");
    let parsed;
    try { parsed = JSON.parse(raw); } catch (error) {
      throw new Error(`KNOWLEDGE_INDEX_INVALID: ${error.message}. No provider call is allowed.`);
    }
    if (parsed.schemaVersion !== 2 || !Array.isArray(parsed.objects)) {
      throw new Error("KNOWLEDGE_INDEX_INVALID: schemaVersion 2 with objects[] is required. No provider call is allowed.");
    }
    if (parsed.totals?.unresolved !== 0 || parsed.totals?.collisions !== 0) {
      throw new Error(`KNOWLEDGE_INDEX_UNRESOLVED: unresolved=${parsed.totals?.unresolved}, collisions=${parsed.totals?.collisions}. No provider call is allowed.`);
    }
    if (parsed.objects.some((object) => /(?:^|\/)nonagen(?:\/|$)/u.test(object.id))) {
      throw new Error("KNOWLEDGE_ASPECT_IDENTITY_INVALID: nonagen must resolve to semisextile. No provider call is allowed.");
    }
    cached = { meta: parsed, raw, indexSha256: sha256(raw), byId: new Map(parsed.objects.map((object) => [object.id, object])), sourcesVerified: false };
  }
  if (verifySources && !cached.sourcesVerified) verifyAllSourceHashes(cached.meta);
  return cached;
}

function verifyAllSourceHashes(index) {
  const expected = new Map();
  for (const object of index.objects) {
    for (const source of object.sources) {
      if (!AUTHORITY_CLASSES.has(source.authorityClass)) {
        throw new Error(`KNOWLEDGE_AUTHORITY_INVALID: ${object.id} ${source.path} has ${source.authorityClass}. No provider call is allowed.`);
      }
      if (!source.path || !source.sourceSha256 || !Array.isArray(source.surfacePermission)) {
        throw new Error(`KNOWLEDGE_PROVENANCE_INCOMPLETE: ${object.id} has an incomplete source record. No provider call is allowed.`);
      }
      const prior = expected.get(source.path);
      if (prior && prior !== source.sourceSha256) {
        throw new Error(`KNOWLEDGE_SOURCE_HASH_CONFLICT: ${source.path}. No provider call is allowed.`);
      }
      expected.set(source.path, source.sourceSha256);
    }
  }
  for (const [relative, hash] of expected) {
    const absolute = path.join(repoRoot, relative);
    if (!fs.existsSync(absolute)) throw new Error(`KNOWLEDGE_SOURCE_MISSING: ${relative}. No provider call is allowed.`);
    if (sha256(fs.readFileSync(absolute)) !== hash) {
      throw new Error(`KNOWLEDGE_INDEX_STALE: ${relative} changed after the index was built. No provider call is allowed.`);
    }
  }
  cached.sourcesVerified = true;
}

function assertIndexCurrent() {
  const index = loadIndex();
  if (sha256(fs.readFileSync(indexPath)) !== index.indexSha256) {
    throw new Error("KNOWLEDGE_INDEX_STALE: the canonical index changed after it was loaded. No provider call is allowed.");
  }
  verifyAllSourceHashes(index.meta);
  return { indexSha256: index.indexSha256 };
}

function readSource(source) {
  const absolute = path.join(repoRoot, source.path);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(absolute, "utf8")); } catch (error) {
    throw new Error(`KNOWLEDGE_SOURCE_READ_FAILED: ${source.path}: ${error.message}. No provider call is allowed.`);
  }
  const locator = source.locator ?? {};
  let row = doc;
  if (Array.isArray(locator.objectPath)) {
    for (const segment of locator.objectPath) row = row?.[segment];
  } else if (Number.isInteger(locator.index)) {
    const collection = locator.collection == null ? doc : doc?.[locator.collection];
    if (!Array.isArray(collection)) throw new Error(`KNOWLEDGE_LOCATOR_INVALID: ${source.path} ${JSON.stringify(locator)}.`);
    row = collection[locator.index];
  } else if (!locator.document) {
    const lists = [doc.rows, doc.reviewed, doc.entries, doc.items, doc.sections, doc.objects].filter(Array.isArray);
    row = lists.flat().find((item) => item && [item.id, item.key, item.Key, item.contentKey].some((value) => String(value ?? "") === String(source.rowKey ?? source.nativeKey))) ?? doc;
  }
  if (row == null || typeof row !== "object") throw new Error(`KNOWLEDGE_LOCATOR_MISSING: ${source.path} ${JSON.stringify(locator)}.`);
  return row;
}

function looseParse(text) {
  try { return JSON.parse(text); } catch { /* continue */ }
  try { return JSON.parse(String(text).replace(/'/gu, '"')); } catch { return null; }
}

function collectFields(row) {
  const fields = [];
  for (const field of TEXT_FIELDS) {
    const text = row?.[field];
    if (typeof text === "string" && text.trim().length > 20) fields.push({ field, text: text.trim() });
  }
  const slots = typeof row?.slots === "string" ? looseParse(row.slots) : row?.slots;
  if (slots && typeof slots === "object") {
    for (const [name, text] of Object.entries(slots)) {
      if (typeof text === "string" && text.trim().length > 15) fields.push({ field: `slot.${name}`, text: text.trim() });
    }
  }
  for (const field of ["supportedDomains", "unsupportedDomainWarnings"]) {
    const values = row?.[field];
    if (Array.isArray(values) && values.length) {
      fields.push({ field, text: values.map(String).join(" | ") });
    }
  }
  if (row?.modern && typeof row.modern === "object") {
    for (const [name, text] of Object.entries(row.modern)) {
      if (typeof text === "string" && text.trim().length > 15) fields.push({ field: `modern.${name}`, text: text.trim() });
    }
  }
  if (Array.isArray(row?.facts)) {
    row.facts.forEach((fact, index) => {
      if (typeof fact?.text === "string" && fact.text.trim().length > 15) {
        fields.push({
          field: `fact.${index}`,
          text: fact.text.trim(),
          sourceReference: {
            path: typeof fact.sourcePath === "string" ? fact.sourcePath : null,
            selector: typeof fact.selector === "string" ? fact.selector : null,
            match: typeof fact.match === "string" ? fact.match : null
          }
        });
      }
    });
  }
  if (Array.isArray(row?.sections)) {
    row.sections.forEach((section, index) => {
      if (!section || typeof section !== "object") return;
      for (const [name, text] of Object.entries(section)) {
        if (typeof text === "string" && text.trim().length > 20) {
          fields.push({ field: `section.${index}.${name}`, text: text.trim() });
        }
      }
    });
  }
  return fields;
}

function permissionAllows(source, surface, usage) {
  const permissions = source.surfacePermission ?? [];
  if (permissions.includes("doctrine-only")) return usage === "mechanism-reference";
  if (usage === "mechanism-reference" && permissions.includes(`${surface}:mechanism-reference`)) return true;
  return permissions.includes(surface);
}

function resolve(canonicalId, { surface = "friends-transit", usage = "primary" } = {}) {
  const object = loadIndex().byId.get(canonicalId);
  if (!object) return { id: canonicalId, kind: null, temporality: null, records: [], excluded: [], counts: { total: 0, chars: 0 } };
  const records = [];
  const excluded = [];
  for (const source of object.sources) {
    const inSurface = permissionAllows(source, surface, usage);
    const promptAllowed = !NEVER_PROMPT_STORES.has(source.store) && source.authorityClass !== "negative-example";
    if (!inSurface || !promptAllowed) {
      excluded.push({ store: source.store, path: source.path, rowKey: source.rowKey ?? source.nativeKey, reason: !inSurface ? "surface-permission" : "prompt-prohibited" });
      continue;
    }
    for (const selected of collectFields(readSource(source))) {
      const effectiveUsage = source.authorityClass === "unverified" ? "mechanism-reference" : usage;
      const record = {
        authorityClass: source.authorityClass,
        surfacePermission: source.surfacePermission,
        store: source.store,
        path: source.path,
        field: selected.field,
        rowKey: source.rowKey ?? source.nativeKey,
        sourceSha256: source.sourceSha256,
        text: selected.text,
        ...(selected.sourceReference ? { sourceReference: selected.sourceReference } : {}),
        usage: effectiveUsage,
        temporality: TEMPORALITY[object.kind] ?? "reference",
        framingAllowed: effectiveUsage === "primary" && (TEMPORALITY[object.kind] ?? "reference") !== "lifelong-pattern"
      };
      record.evidenceSha256 = sha256({ canonicalId, ...record });
      records.push(record);
    }
  }
  const rank = { "owner-approved-prose": 0, "voice-exemplar": 1, "factual-evidence": 2, "machine-proposal": 3, unverified: 4 };
  records.sort((a, b) => (rank[a.authorityClass] ?? 9) - (rank[b.authorityClass] ?? 9)
    || b.text.length - a.text.length || a.path.localeCompare(b.path) || a.field.localeCompare(b.field));
  return {
    id: canonicalId,
    kind: object.kind,
    temporality: TEMPORALITY[object.kind] ?? "reference",
    records,
    excluded,
    counts: { total: records.length, chars: records.reduce((sum, record) => sum + record.text.length, 0) }
  };
}

function relatedIds(canonicalId, kind) {
  if (kind === "placement-sign") {
    const [, object, sign] = canonicalId.split("/");
    return [
      { id: `body/${object}`, relation: "body-function" },
      { id: `sign/${sign}`, relation: "sign-operation" }
    ];
  }
  if (kind !== "transit-aspect") return [];
  const [, transiting, natal, aspect] = canonicalId.split("/");
  const [first, second] = [transiting, natal].sort();
  return [
    { id: `body/${transiting}`, relation: "transiting-body-function" },
    { id: `body/${natal}`, relation: "natal-body-function" },
    { id: `aspect/${aspect}`, relation: "aspect-operation" },
    { id: `natal-aspect/${first}/${second}/${aspect}`, relation: "same-pair-mechanism" }
  ];
}

function bounded(records, maxChars) {
  const selected = [];
  const seen = new Set();
  let chars = 0;
  for (const record of records) {
    const textHash = sha256(record.text);
    if (seen.has(textHash)) continue;
    if (selected.length > 0 && chars + record.text.length > maxChars) continue;
    selected.push(record);
    seen.add(textHash);
    chars += record.text.length;
    if (chars >= maxChars) break;
  }
  return selected;
}

function buildPacket(canonicalId, {
  surface = "friends-transit",
  register = "card",
  maxChars = 6000,
  includeRelated = true,
  targetUsage = "primary",
  context = null,
  recordFilter = null,
  filterId = null
} = {}) {
  const index = loadIndex();
  if (!['primary', 'mechanism-reference'].includes(targetUsage)) {
    throw new Error(`KNOWLEDGE_TARGET_USAGE_INVALID: ${targetUsage}. No provider call is allowed.`);
  }
  const primary = resolve(canonicalId, { surface, usage: targetUsage });
  if (!primary.kind) throw new Error(`KNOWLEDGE_OBJECT_UNRESOLVED: ${canonicalId}. No provider call is allowed.`);
  if (!primary.records.length) throw new Error(`KNOWLEDGE_EVIDENCE_EMPTY: ${canonicalId}. No provider call is allowed.`);
  const candidates = [...primary.records];
  const related = [];
  if (includeRelated) {
    for (const relation of relatedIds(canonicalId, primary.kind)) {
      const resolved = resolve(relation.id, { surface, usage: "mechanism-reference" });
      related.push({ ...relation, kind: resolved.kind, temporality: resolved.temporality, records: resolved.records.length, excluded: resolved.excluded.length });
      candidates.push(...resolved.records.map((record) => {
        const relatedRecord = { ...record, relation: relation.relation };
        relatedRecord.evidenceSha256 = sha256({ canonicalId, ...Object.fromEntries(Object.entries(relatedRecord).filter(([key]) => key !== "evidenceSha256" && key !== "relation")) });
        return relatedRecord;
      }));
    }
  }
  if (recordFilter != null && (typeof recordFilter !== "function" || typeof filterId !== "string" || !filterId)) {
    throw new Error("KNOWLEDGE_FILTER_INVALID: a named deterministic record filter is required. No provider call is allowed.");
  }
  const filteredCandidates = recordFilter == null ? candidates : candidates.filter(recordFilter);
  const evidence = bounded(filteredCandidates, maxChars);
  if (!evidence.length) throw new Error(`KNOWLEDGE_EVIDENCE_EMPTY: ${canonicalId} had no bounded evidence. No provider call is allowed.`);
  const voiceExemplars = evidence.filter((record) => (
    EXEMPLAR_CLASSES.has(record.authorityClass)
    && record.usage === "primary"
    && record.surfacePermission.includes(surface)
  ));
  const licenses = [];
  if (surface === "friends-transit" && context?.house != null) {
    const license = resolve(`license/friends-transit/house/${context.house}`, { surface, usage: "primary" });
    const executable = license.records.filter((record) => record.authorityClass === "factual-evidence");
    if (!executable.length) throw new Error(`KNOWLEDGE_LICENSE_UNAUTHORIZED: Friends house ${context.house} has no approved executable license. No provider call is allowed.`);
    licenses.push(...executable);
  }
  const packet = {
    schemaVersion: 2,
    canonicalId,
    temporality: primary.temporality,
    surface,
    register,
    ...(targetUsage !== "primary" ? { targetUsage } : {}),
    evidence,
    voiceExemplars,
    licenses,
    exclusions: {
      doNotAssume: evidence.filter((record) => record.field === "policy").map((record) => record.text),
      bannedRegisters: surface === "friends-transit" ? ["permanent-natal-trait", "synastry-standing-pattern"] : [],
      surfaceBans: ["cross-surface prose", "third-party quotations", "unverified voice imitation"],
      excludedRecords: primary.excluded.length,
      filteredRecords: candidates.length - filteredCandidates.length
    },
    related,
    selectionFilterId: filterId,
    indexSha256: index.indexSha256,
    evidenceSha256: evidence.map((record) => record.evidenceSha256),
    totals: {
      recordsIncluded: evidence.length,
      chars: evidence.reduce((sum, record) => sum + record.text.length, 0),
      byAuthority: evidence.reduce((totals, record) => ({ ...totals, [record.authorityClass]: (totals[record.authorityClass] ?? 0) + 1 }), {})
    },
    governance: { ownerApproved: false, servingEligible: false, writerOutputStatus: "PENDING OWNER" }
  };
  packet.packetSha256 = sha256(packet);
  return assertPacket(packet, { canonicalId, surface, register });
}

function buildMultiTargetPacket(canonicalIds, {
  surface = "sky",
  register = "card",
  maxChars = 12000,
  includeRelated = true,
  targetUsages = [],
  contexts = [],
  recordFilter = null,
  filterId = null
} = {}) {
  if (!Array.isArray(canonicalIds) || canonicalIds.length < 1 || canonicalIds.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error("KNOWLEDGE_TARGET_LIST_REQUIRED: supply one or more ordered canonical IDs. No provider call is allowed.");
  }
  if (new Set(canonicalIds).size !== canonicalIds.length) {
    throw new Error("KNOWLEDGE_TARGET_LIST_DUPLICATE: composed packets require distinct ordered targets. No provider call is allowed.");
  }
  const perTargetMaxChars = Math.max(1000, Math.floor(maxChars / canonicalIds.length));
  const packets = canonicalIds.map((canonicalId, index) => buildPacket(canonicalId, {
    surface,
    register,
    maxChars: perTargetMaxChars,
    includeRelated,
    targetUsage: targetUsages[index] ?? "primary",
    context: contexts[index] ?? null,
    recordFilter,
    filterId
  }));
  const index = loadIndex();
  const packet = {
    schemaVersion: 3,
    packetKind: "ordered-multi-target",
    canonicalIds: [...canonicalIds],
    surface,
    register,
    ...(targetUsages.some((usage) => usage && usage !== "primary")
      ? { targetUsages: canonicalIds.map((_, index) => targetUsages[index] ?? "primary") }
      : {}),
    packets,
    indexSha256: index.indexSha256,
    packetSha256ByTarget: packets.map((entry) => entry.packetSha256),
    evidenceSha256: packets.flatMap((entry) => entry.evidenceSha256),
    totals: {
      targets: packets.length,
      recordsIncluded: packets.reduce((sum, entry) => sum + entry.totals.recordsIncluded, 0),
      chars: packets.reduce((sum, entry) => sum + entry.totals.chars, 0)
    },
    governance: { ownerApproved: false, servingEligible: false, writerOutputStatus: "PENDING OWNER" }
  };
  packet.packetSha256 = sha256(packet);
  return assertMultiTargetPacket(packet, { canonicalIds, surface, register });
}

function assertPacket(packet, { canonicalId = packet?.canonicalId, surface = packet?.surface, register = packet?.register } = {}) {
  const index = loadIndex();
  if (sha256(fs.readFileSync(indexPath)) !== index.indexSha256) {
    throw new Error("KNOWLEDGE_PACKET_STALE: the canonical index changed after packet construction. No provider call is allowed.");
  }
  // Recheck source bytes at the actual provider boundary. Packet creation may
  // be separated from a call by a long draft/review workflow.
  verifyAllSourceHashes(index.meta);
  if (!packet || packet.canonicalId !== canonicalId || packet.surface !== surface || packet.register !== register) {
    throw new Error("KNOWLEDGE_PACKET_TARGET_MISMATCH: no provider call is allowed.");
  }
  if (packet.indexSha256 !== index.indexSha256) throw new Error("KNOWLEDGE_PACKET_STALE: index hash mismatch. No provider call is allowed.");
  if (!Array.isArray(packet.evidence) || !packet.evidence.length) throw new Error("KNOWLEDGE_PACKET_EMPTY: no provider call is allowed.");
  if (packet.evidence.some((record) => !AUTHORITY_CLASSES.has(record.authorityClass)
    || !record.evidenceSha256 || !record.sourceSha256 || !permissionAllows(record, surface, record.usage)
    || record.evidenceSha256 !== sha256({ canonicalId, ...Object.fromEntries(Object.entries(record).filter(([key]) => key !== "evidenceSha256" && key !== "relation")) }))) {
    throw new Error("KNOWLEDGE_PACKET_UNAUTHORIZED: evidence authority, provenance, or surface permission failed. No provider call is allowed.");
  }
  if (JSON.stringify(packet.evidenceSha256) !== JSON.stringify(packet.evidence.map((record) => record.evidenceSha256))) {
    throw new Error("KNOWLEDGE_PACKET_UNAUTHORIZED: evidence hash list mismatch. No provider call is allowed.");
  }
  if ((packet.voiceExemplars ?? []).some((record) => record.authorityClass === "unverified" || record.usage !== "primary" || !record.surfacePermission.includes(surface))) {
    throw new Error("KNOWLEDGE_PACKET_CROSS_SURFACE: invalid voice exemplar. No provider call is allowed.");
  }
  if ((packet.licenses ?? []).some((record) => (
    record.authorityClass !== "factual-evidence"
    || !record.surfacePermission.includes(surface)
  ))) {
    throw new Error("KNOWLEDGE_LICENSE_UNAUTHORIZED: invalid scene permission. No provider call is allowed.");
  }
  const expectedPacketSha256 = sha256(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== "packetSha256")));
  if (packet.packetSha256 !== expectedPacketSha256) throw new Error("KNOWLEDGE_PACKET_TAMPERED: packet hash mismatch. No provider call is allowed.");
  return packet;
}

function assertMultiTargetPacket(packet, {
  canonicalIds = packet?.canonicalIds,
  surface = packet?.surface,
  register = packet?.register
} = {}) {
  const index = loadIndex();
  if (!packet || packet.schemaVersion !== 3 || packet.packetKind !== "ordered-multi-target") {
    throw new Error("KNOWLEDGE_MULTI_PACKET_INVALID: no provider call is allowed.");
  }
  if (JSON.stringify(packet.canonicalIds) !== JSON.stringify(canonicalIds)
    || packet.surface !== surface || packet.register !== register) {
    throw new Error("KNOWLEDGE_MULTI_PACKET_TARGET_MISMATCH: no provider call is allowed.");
  }
  if (packet.indexSha256 !== index.indexSha256) {
    throw new Error("KNOWLEDGE_MULTI_PACKET_STALE: index hash mismatch. No provider call is allowed.");
  }
  if (!Array.isArray(packet.packets) || packet.packets.length !== canonicalIds.length) {
    throw new Error("KNOWLEDGE_MULTI_PACKET_INCOMPLETE: no provider call is allowed.");
  }
  packet.packets.forEach((entry, index) => assertPacket(entry, {
    canonicalId: canonicalIds[index],
    surface,
    register
  }));
  if (JSON.stringify(packet.packetSha256ByTarget) !== JSON.stringify(packet.packets.map((entry) => entry.packetSha256))
    || JSON.stringify(packet.evidenceSha256) !== JSON.stringify(packet.packets.flatMap((entry) => entry.evidenceSha256))) {
    throw new Error("KNOWLEDGE_MULTI_PACKET_TAMPERED: nested hash list mismatch. No provider call is allowed.");
  }
  const expectedPacketSha256 = sha256(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== "packetSha256")));
  if (packet.packetSha256 !== expectedPacketSha256) {
    throw new Error("KNOWLEDGE_MULTI_PACKET_TAMPERED: packet hash mismatch. No provider call is allowed.");
  }
  return packet;
}

function packetToPrompt(packet) {
  assertPacket(packet);
  const lines = [
    `CANONICAL OBJECT: ${packet.canonicalId}`,
    `TEMPORALITY: ${packet.temporality}`,
    `SURFACE: ${packet.surface}`,
    "",
    "ASTROLOGICAL TRUTH (meaning and mechanism evidence; not a prose template)"
  ];
  for (const record of packet.evidence) {
    const relation = record.relation ? `; relation=${record.relation}` : "";
    lines.push(`--- [${record.authorityClass}; usage=${record.usage}; temporality=${record.temporality}${relation}]`);
    lines.push(`${record.field}: ${record.text}`);
  }
  lines.push("", "SCENE PERMISSION (approved manifestations only; never sentence slots)");
  if (!packet.licenses.length) lines.push("NONE: use the universal mechanism without an unlicensed life-area scene.");
  for (const record of packet.licenses) {
    lines.push(`--- [${record.authorityClass}; house-scene-license]`);
    lines.push(`${record.field}: ${record.text}`);
  }
  lines.push("", "SOURCE-BOUND VOICE EXEMPLARS (style evidence, not additional astrology claims)");
  if (!packet.voiceExemplars.length) lines.push("NONE");
  for (const record of packet.voiceExemplars) {
    lines.push(`--- [${record.authorityClass}; source=${record.path}]`);
    lines.push(record.text);
  }
  lines.push("", `EXCLUSIONS\n${JSON.stringify(packet.exclusions, null, 2)}`);
  return lines.join("\n").trim();
}

function multiTargetPacketToPrompt(packet) {
  assertMultiTargetPacket(packet);
  return packet.packets.map((entry, index) => [
    `ORDERED TARGET ${index + 1} OF ${packet.packets.length}`,
    packetToPrompt(entry)
  ].join("\n")).join("\n\n");
}

function resetCacheForTests() { cached = null; }

module.exports = {
  resolve,
  buildPacket,
  buildMultiTargetPacket,
  assertPacket,
  assertMultiTargetPacket,
  packetToPrompt,
  multiTargetPacketToPrompt,
  loadIndex,
  assertIndexCurrent,
  resetCacheForTests,
  TEMPORALITY,
  AUTHORITY_CLASSES
};
