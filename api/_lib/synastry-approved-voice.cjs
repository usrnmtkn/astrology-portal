"use strict";
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { readPrivateReportDocument } = require("./private-report-documents.cjs");
const { designatedSynastryVoiceReferences } = require("../../src/astro-writing/synastrySourceContext.cjs");

const SOURCE = "private:writing/synastry/approved-sample-20261022";
const hash = text => createHash("sha256").update(text).digest("hex");
const fail = () => { throw new Error("SYNASTRY_APPROVED_VOICE_UNAVAILABLE: provision the complete approved voice references in protected document storage before generation."); };

// This store is server-only. Its approval provenance is provisioned from the
// owner's exact decision, never inferred from generated content or feedback.
function withApprovedSynastryVoice(input) {
  if (designatedSynastryVoiceReferences(input.sourceSnapshot).length) return input;
  let body;
  try { body = readPrivateReportDocument(SOURCE); } catch { return fail(); }
  let bundle;
  try { bundle = JSON.parse(body); } catch { return fail(); }
  const approval = bundle?.approval;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/writing/synastry-voice-approval-20261022.json"), "utf8")); } catch { return fail(); }
  if (bundle?.schema !== "synastry-approved-voice/v1" || !approval
    || approval.sourceUri !== "thread:01a15c03-cf10-71e3-b5e9-798c9f87bd3b"
    || approval.sourceDate !== "2026-10-22"
    || approval.toolCall !== "call_523ff83c43574e3eab4fe2bdeb55d597"
    || approval.exactOwnerAnswer !== "Approve all eight as written"
    || !Array.isArray(bundle.entries) || bundle.entries.length !== 8
    || bundle.entries.some(entry => !entry || typeof entry.caseId !== "string" || !entry.caseId.trim())
    || new Set(bundle.entries.map(entry => entry.caseId)).size !== 8) return fail();
  if (manifest.schema !== "synastry-voice-approval/v1" || manifest.sourceId !== SOURCE
    || manifest.approvalToolCall !== approval.toolCall || manifest.sourceUri !== approval.sourceUri
    || manifest.sourceDate !== approval.sourceDate || manifest.exactOwnerAnswer !== approval.exactOwnerAnswer
    || !Array.isArray(manifest.references) || manifest.references.length !== 8
    || bundle.entries.some(entry => !manifest.references.some(reference => reference.caseId === entry.caseId && reference.textSha256 === entry.sha256))) return fail();
  const references = bundle.entries.map(entry => ({
    role: "owner_approved_voice_only_not_astrology_for_target", path: SOURCE,
    caseId: entry.caseId, text: entry.text, sha256: entry.sha256,
    sourceUri: approval.sourceUri, sourceDate: approval.sourceDate,
    approvalToolCall: approval.toolCall, approvalStatement: approval.exactOwnerAnswer
  }));
  try { designatedSynastryVoiceReferences({ positiveVoiceReferences: references }); } catch { return fail(); }
  return { ...input, sourceSnapshot: { ...input.sourceSnapshot,
    positiveVoiceReferences: references,
    protectedSynastryVoice: { sourceId: SOURCE, documentSha256: hash(body),
      approvalToolCall: approval.toolCall, referenceCount: references.length }
  } };
}

module.exports = { withApprovedSynastryVoice, SYNASTRY_APPROVED_VOICE_SOURCE: SOURCE };
