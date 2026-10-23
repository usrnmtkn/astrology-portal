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
    answer: "Use the second attachment: Ten Synastry Readings (Recommended)" }
];
const hash = text => createHash("sha256").update(text).digest("hex");
const fail = () => { throw new Error("SYNASTRY_APPROVED_VOICE_UNAVAILABLE: provision the complete approved voice references in protected document storage before generation."); };

// This store is server-only. Its approval provenance is provisioned from the
// owner's exact decision, never inferred from generated content or feedback.
function withApprovedSynastryVoice(input) {
  if (designatedSynastryVoiceReferences(input.sourceSnapshot).length) return input;
  const collections = COLLECTIONS.map(readApprovedCollection);
  const references = collections.flatMap(collection => collection.references);
  if (new Set(references.map(reference => reference.caseId)).size !== references.length) return fail();
  return { ...input, sourceSnapshot: { ...input.sourceSnapshot,
    positiveVoiceReferences: references,
    protectedSynastryVoice: { sources: collections.map(collection => collection.receipt), referenceCount: references.length }
  } };
}

function readApprovedCollection(collection) {
  let body;
  try { body = readPrivateReportDocument(collection.sourceId); } catch { return fail(); }
  let bundle;
  try { bundle = JSON.parse(body); } catch { return fail(); }
  const approval = bundle?.approval;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../data/writing/synastry-voice-approval-${collection.date.replaceAll("-", "")}.json`), "utf8")); } catch { return fail(); }
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
  const references = bundle.entries.map(entry => ({
    role: "owner_approved_voice_only_not_astrology_for_target", path: collection.sourceId,
    caseId: entry.caseId, text: entry.text, sha256: entry.sha256,
    sourceUri: approval.sourceUri, sourceDate: approval.sourceDate,
    approvalToolCall: approval.toolCall, approvalStatement: approval.exactOwnerAnswer
  }));
  try { designatedSynastryVoiceReferences({ positiveVoiceReferences: references }); } catch { return fail(); }
  return { references, receipt: { sourceId: collection.sourceId, documentSha256: hash(body),
    approvalToolCall: approval.toolCall, referenceCount: references.length } };
}

module.exports = { withApprovedSynastryVoice, SYNASTRY_APPROVED_VOICE_SOURCE: SOURCE };
