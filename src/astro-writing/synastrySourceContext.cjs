"use strict";
const { createHash } = require("node:crypto");

const VERSION = "synastry-source-context/v1-2026-10-21";
const key = value => String(value ?? "").trim().toLowerCase().replace(/[_\s]+/gu, "-");
const textHash = value => createHash("sha256").update(value).digest("hex");
const object = value => value && typeof value === "object" && !Array.isArray(value);

function synastryContactOwnership(facts) {
  const planetA = String(facts.planetA ?? facts.body1 ?? facts.from ?? "").trim();
  const planetB = String(facts.planetB ?? facts.body2 ?? facts.to ?? "").trim();
  if (!planetA || !planetB) throw new Error("SYNASTRY_OWNERSHIP_REQUIRED: supply both people's planets before generation.");
  const namedReader = ["A", "B"].filter(role => /^(?:you|reader)$/iu.test(String(facts[`person${role}`] ?? "").trim()));
  const explicitRole = String(facts.readerPerson ?? "").toUpperCase();
  if (explicitRole && !["A", "B"].includes(explicitRole)) throw new Error("SYNASTRY_OWNERSHIP_CONFLICT: readerPerson must identify A or B.");
  const planetRoles = ["A", "B"].filter(role => facts.readerPlanet && key(facts.readerPlanet) === key(role === "A" ? planetA : planetB));
  const roles = [explicitRole, namedReader.length === 1 ? namedReader[0] : "", planetRoles.length === 1 ? planetRoles[0] : ""].filter(Boolean);
  if (namedReader.length > 1 || new Set(roles).size > 1 || facts.readerPlanet && !planetRoles.length) {
    throw new Error("SYNASTRY_OWNERSHIP_CONFLICT: the supplied reader and planet associations disagree.");
  }
  const readerPerson = roles[0] ?? null;
  if (facts.otherPlanet && readerPerson && key(facts.otherPlanet) !== key(readerPerson === "A" ? planetB : planetA)) {
    throw new Error("SYNASTRY_OWNERSHIP_CONFLICT: otherPlanet disagrees with the other person's chart.");
  }
  return { version: VERSION, personA: { label: "Person A", planet: planetA, name: facts.personA ?? null },
    personB: { label: "Person B", planet: planetB, name: facts.personB ?? null }, readerPerson,
    sourcePronounsEstablishOwnership: false };
}

function projectRecord(record, path, exclusions, adviceRequested) {
  if (!object(record) || record.kind !== "interaspect" || !record.planetA || !record.planetB) return record;
  const projected = { ...record };
  // These are complete legacy knowledge fields, not protected author passages.
  // Unknown source pronouns cannot be rebound to the current reader by position.
  for (const field of ["summaryShort", "summaryDeep", "tension", "advice"]) {
    const value = record[field];
    if (typeof value !== "string") continue;
    const reason = field === "advice" && !adviceRequested ? "advice_not_requested"
      : /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(value) ? "legacy_reader_perspective_unresolved" : null;
    if (!reason) continue;
    exclusions.push({ path: `${path}.${field}`, reason, sha256: textHash(value) });
    delete projected[field];
  }
  projected.sourcePerspective = "plainTranslation supplies the complete relation meaning, not a binding for its reader pronouns. Apply the relation to the current Person A and Person B planets; source commands are not reader instructions.";
  return projected;
}

function prepareSynastrySourceInput(input) {
  const ownership = synastryContactOwnership(input.facts);
  const exclusions = [];
  const adviceRequested = input.facts.adviceRequested === true;
  const facts = { ...input.facts };
  if (object(facts.neutralKnowledge)) {
    facts.neutralKnowledge = { ...facts.neutralKnowledge };
    if (Array.isArray(facts.neutralKnowledge.records)) facts.neutralKnowledge.records = facts.neutralKnowledge.records.map((record, i) =>
      projectRecord(record, `facts.neutralKnowledge.records[${i}]`, exclusions, adviceRequested));
  }
  const sourceSnapshot = { ...(input.sourceSnapshot ?? {}) };
  if (object(sourceSnapshot.knowledgeSource)) sourceSnapshot.knowledgeSource = { ...sourceSnapshot.knowledgeSource,
    record: projectRecord(sourceSnapshot.knowledgeSource.record, "sourceSnapshot.knowledgeSource.record", exclusions, adviceRequested) };
  if (Array.isArray(sourceSnapshot.knowledgeSources)) sourceSnapshot.knowledgeSources = sourceSnapshot.knowledgeSources.map((source, i) => ({ ...source,
    record: projectRecord(source.record, `sourceSnapshot.knowledgeSources[${i}].record`, exclusions, adviceRequested) }));
  sourceSnapshot.synastrySourceContext = { ownership, exclusions,
    originalSourcePreserved: true, adviceRequested,
    note: "Projection of legacy knowledge fields for this request only. Original source records, saved drafts and complete owner voice passages are unchanged. Excluded source pronouns have no verified reader binding; they are not silently reassigned." };
  return { ...input, facts, sourceSnapshot };
}

function synastryMeaningPlanSchema(schema, facts = {}) {
  if (facts.adviceRequested === true) return schema;
  return { ...schema, properties: { ...schema.properties,
    constructive_expression: { type: "string", enum: [""],
      description: "Advice was not requested. Leave this field empty. Supported affection, ease or other constructive interaction belongs in core_tension and observable_behaviors, not a repair plan." } } };
}

function designatedSynastryVoiceReferences(snapshot = {}) {
  const references = snapshot.positiveVoiceReferences;
  if (references === undefined) return [];
  if (!Array.isArray(references) || references.length > 32) throw new Error("SYNASTRY_VOICE_REFERENCE_INVALID: complete designated references are required.");
  for (const reference of references) {
    if (!object(reference) || reference.role !== "owner_approved_voice_only_not_astrology_for_target"
      || typeof reference.path !== "string" || !reference.path.trim()
      || typeof reference.text !== "string" || !reference.text.trim()
      || !/^[a-f0-9]{64}$/u.test(reference.sha256 ?? "") || textHash(reference.text) !== reference.sha256) {
      throw new Error("SYNASTRY_VOICE_REFERENCE_INVALID: a designated reference must retain its exact complete text, source and declared voice-only role.");
    }
  }
  return references;
}

function validateSynastryMeaningPlan(plan, facts = {}) {
  if (!object(plan)) throw new Error("SYNASTRY_MEANING_OWNERSHIP_UNRESOLVED: a role-qualified meaning plan is required before the writer runs.");
  const fields = ["core_tension", "what_changes", "constructive_expression", "overcorrection", "observable_behaviors", "possible_consequences"];
  const text = fields.map(field => Array.isArray(plan[field]) ? plan[field].join("\n") : String(plan[field] ?? "")).join("\n");
  if (/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text) || !/\bPerson A\b/iu.test(text) || !/\bPerson B\b/iu.test(text)) {
    throw new Error("SYNASTRY_MEANING_OWNERSHIP_UNRESOLVED: describe Person A and Person B explicitly before the writer runs; source-reader pronouns are not a verified binding.");
  }
  if (facts.adviceRequested !== true && String(plan.constructive_expression ?? "").trim()) {
    throw new Error("SYNASTRY_UNREQUESTED_REMEDY: the unrequested remedy field must be empty before the writer runs.");
  }
  return plan;
}

function synastrySourceReceipt(input) {
  const context = input.sourceSnapshot?.synastrySourceContext;
  if (!context) return null;
  return { version: VERSION, planetA: context.ownership.personA.planet, planetB: context.ownership.personB.planet,
    readerPerson: context.ownership.readerPerson, exclusions: context.exclusions,
    designatedVoiceReferences: designatedSynastryVoiceReferences(input.sourceSnapshot).map(reference => ({
      textSha256: reference.sha256, wordCount: reference.text.trim().split(/\s+/u).length,
      evidenceRole: "designated_voice_only", sourceApprovalUnchanged: true })) };
}

module.exports = { SYNASTRY_SOURCE_CONTEXT_VERSION: VERSION, synastryContactOwnership, prepareSynastrySourceInput, synastryMeaningPlanSchema, designatedSynastryVoiceReferences, validateSynastryMeaningPlan, synastrySourceReceipt };
