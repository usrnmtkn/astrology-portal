"use strict";
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { readPrivateReportDocument } = require("./private-report-documents.cjs");
const { designatedSynastryVoiceReferences } = require("../../src/astro-writing/synastrySourceContext.cjs");

const SOURCE = "private:writing/synastry/approved-sample-20261022";
const COLLECTIONS = [
  { sourceId: SOURCE, date: "2026-10-22", count: 8,
    toolCall: "call_523ff83c43574e3eab4fe2bdeb55d597", answer: "Approve all eight as written" },
  { sourceId: "private:writing/synastry/approved-ten-20261023", date: "2026-10-23", count: 10,
    toolCall: "call_dbde683ecad34036a709b8b3520b50fb",
    answer: "Use the second attachment: Ten Synastry Readings (Recommended)" },
  { sourceId: "private:writing/synastry/approved-next-ten-20261023", date: "2026-10-23", count: 10,
    toolCall: "call_1cde9e68fd9b4d94a73fc0c522236b91", answer: "Approve these ten for publication",
    manifestFile: "synastry-voice-approval-20261023-next-ten.json" }
];
const hash = text => createHash("sha256").update(text).digest("hex");
const fail = () => { throw new Error("SYNASTRY_APPROVED_VOICE_UNAVAILABLE: provision the complete approved voice references in protected document storage before generation."); };

// This store is server-only. Its approval provenance is provisioned from the
// owner's exact decision, never inferred from generated content or feedback.
function withApprovedSynastryVoice(input) {
  const primary = readPrimarySynastryStyle();
  const supplied = input.sourceSnapshot?.primarySynastryStyleReferences;
  if (supplied !== undefined && JSON.stringify(supplied) !== JSON.stringify(primary)) {
    throw new Error("SYNASTRY_PRIMARY_STYLE_UNAVAILABLE: the designated natal benchmarks changed.");
  }
  if (supplied === undefined) input = { ...input, sourceSnapshot: { ...input.sourceSnapshot, primarySynastryStyleReferences: primary } };
  if (designatedSynastryVoiceReferences(input.sourceSnapshot).length) return input;
  const collections = COLLECTIONS.map(readApprovedCollection);
  const references = collections.flatMap(collection => collection.references);
  if (new Set(references.map(reference => reference.caseId)).size !== references.length) return fail();
  return { ...input, sourceSnapshot: { ...input.sourceSnapshot,
    positiveVoiceReferences: references,
    protectedSynastryVoice: { sources: collections.map(collection => collection.receipt), referenceCount: references.length }
  } };
}

function readPrimarySynastryStyle() {
  let source;
  try { source = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/writing/synastry-primary-style-20261024.json"), "utf8")); }
  catch { throw new Error("SYNASTRY_PRIMARY_STYLE_UNAVAILABLE: complete designated natal benchmarks are required."); }
  if (source.schema !== "synastry-primary-style/v1" || source.sourceUri !== "thread:01a15c03-cf10-71e3-b5e9-798c9f87bd3b"
    || source.sourceDate !== "2026-10-24" || source.exactOwnerStatement !== "review the writing for the natal chart aspects. The writing in the natal chart aspects IS exactly the writing style you need to match"
    || !Array.isArray(source.references) || source.references.length !== 4
    || new Set(source.references.map(reference => reference.caseId)).size !== 4
    || source.references.some(reference => reference.selectionPriority !== "primary_owner_designated_style"
      || reference.sourceSurface !== "natal-aspect" || reference.useForTargetFacts !== false || reference.useAsRequiredStructure !== false
      || reference.sourceUri !== source.sourceUri || reference.sourceDate !== source.sourceDate
      || reference.approvalStatement !== source.exactOwnerStatement)) {
    throw new Error("SYNASTRY_PRIMARY_STYLE_UNAVAILABLE: natal style designation is invalid.");
  }
  designatedSynastryVoiceReferences({ positiveVoiceReferences: source.references });
  return source.references;
}

function synastryVoicePromptReferences(snapshot = {}) {
  const primary = readPrimarySynastryStyle();
  if (JSON.stringify(snapshot.primarySynastryStyleReferences) !== JSON.stringify(primary)) {
    throw new Error("SYNASTRY_PRIMARY_STYLE_UNAVAILABLE: load the designated natal benchmarks before preparing the writer.");
  }
  const hashes = new Set(primary.map(reference => reference.sha256));
  return { primaryNatalStyleBenchmarks: primary,
    supportingSynastryExamples: designatedSynastryVoiceReferences(snapshot).filter(reference => !hashes.has(reference.sha256)) };
}

function readApprovedCollection(collection) {
  let body;
  try { body = readPrivateReportDocument(collection.sourceId); } catch { return fail(); }
  let bundle;
  try { bundle = JSON.parse(body); } catch { return fail(); }
  const approval = bundle?.approval;
  let manifest;
  const manifestFile = collection.manifestFile ?? `synastry-voice-approval-${collection.date.replaceAll("-", "")}.json`;
  try { manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../data/writing/${manifestFile}`), "utf8")); } catch { return fail(); }
  if (bundle?.schema !== "synastry-approved-voice/v1" || !approval
    || approval.sourceUri !== "thread:01a15c03-cf10-71e3-b5e9-798c9f87bd3b"
    || approval.sourceDate !== collection.date
    || approval.toolCall !== collection.toolCall
    || approval.exactOwnerAnswer !== collection.answer
    || !Array.isArray(bundle.entries) || bundle.entries.length !== collection.count
    || bundle.entries.some(entry => !entry || typeof entry.caseId !== "string" || !entry.caseId.trim())
    || new Set(bundle.entries.map(entry => entry.caseId)).size !== collection.count) return fail();
  if (manifest.schema !== "synastry-voice-approval/v1" || manifest.sourceId !== collection.sourceId
    || manifest.approvalToolCall !== approval.toolCall || manifest.sourceUri !== approval.sourceUri
    || manifest.sourceDate !== approval.sourceDate || manifest.exactOwnerAnswer !== approval.exactOwnerAnswer
    || !Array.isArray(manifest.references) || manifest.references.length !== collection.count
    || new Set(manifest.references.map(reference => reference.caseId)).size !== collection.count
    || bundle.entries.some(entry => !manifest.references.some(reference => reference.caseId === entry.caseId && reference.textSha256 === entry.sha256))) return fail();
  if (manifest.ownerStatementSha256 && (typeof approval.exactOwnerStatement !== "string"
    || hash(approval.exactOwnerStatement) !== manifest.ownerStatementSha256
    || approval.sourceSha256 !== manifest.sourceSha256
    || !approval.scope?.includes("positive_voice_references"))) return fail();
  if (manifest.voiceDesignationStatementSha256 && (typeof approval.voiceDesignationStatement !== "string"
    || hash(approval.voiceDesignationStatement) !== manifest.voiceDesignationStatementSha256)) return fail();
  const references = bundle.entries.map(entry => ({
    role: "owner_approved_voice_only_not_astrology_for_target", path: collection.sourceId,
    caseId: entry.caseId, text: entry.text, sha256: entry.sha256,
    sourceUri: approval.sourceUri, sourceDate: approval.sourceDate,
    approvalToolCall: approval.toolCall, approvalStatement: approval.exactOwnerAnswer
  }));
  try { designatedSynastryVoiceReferences({ positiveVoiceReferences: references }); } catch { return fail(); }
  return { references, receipt: { sourceId: collection.sourceId, documentSha256: hash(body),
    approvalToolCall: approval.toolCall, referenceCount: references.length,
    ...(manifest.voiceDesignationStatementSha256 ? { voiceDesignationStatementSha256: manifest.voiceDesignationStatementSha256 } : {}) } };
}

module.exports = { withApprovedSynastryVoice, synastryVoicePromptReferences, SYNASTRY_APPROVED_VOICE_SOURCE: SOURCE };
