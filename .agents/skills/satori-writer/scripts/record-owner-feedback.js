#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { repoRoot } = require("./build-voice-index.js");

const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const datasetPath = path.join(packageRoot, "voice", "tldr-astro", "satori-writer", "contrastive-edits.json");
const FEEDBACK_KINDS = new Set([
  "rejection",
  "directional_approval",
  "preferred_version",
  "exact_wording_approval",
  "calibration_only_approval",
  "governed_content_promotion_approval"
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = { apply: false, confirmExact: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") options.apply = true;
    else if (token === "--confirm-exact-approval") options.confirmExact = true;
    else if (token === "--input") options.input = argv[++index];
    else if (token === "--out") options.out = argv[++index];
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!options.input) throw new Error("--input is required.");
  return options;
}

function slug(value) {
  return String(value || "feedback").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 72);
}

function validatePayload(payload, options) {
  if (!FEEDBACK_KINDS.has(payload.feedbackKind)) throw new Error(`Unknown feedbackKind '${payload.feedbackKind}'.`);
  for (const key of ["surface", "articleBeat", "ownerStatement", "sourcePaths"]) {
    if (!payload[key] || (key === "sourcePaths" && !Array.isArray(payload[key]))) throw new Error(`${key} is required.`);
  }
  if (payload.feedbackKind === "governed_content_promotion_approval") {
    throw new Error("Governed-content promotion must use the content approval/import workflow; this voice-memory command cannot promote content.");
  }
  if (["exact_wording_approval", "calibration_only_approval"].includes(payload.feedbackKind)) {
    if (!options.confirmExact) throw new Error("Exact approval recording requires --confirm-exact-approval.");
    if (!/\bI explicitly approve\b/iu.test(payload.ownerStatement)) throw new Error("Exact approval requires an owner statement containing 'I explicitly approve'.");
    if (!payload.after) throw new Error("Exact approval requires exact after wording.");
  }
  if (payload.feedbackKind === "rejection" && !payload.before) throw new Error("Rejection requires rejected before wording.");
  if (["directional_approval", "preferred_version"].includes(payload.feedbackKind) && !payload.after) throw new Error(`${payload.feedbackKind} requires candidate after wording.`);
}

function approvalLevel(kind) {
  if (kind === "rejection") return "owner_rejected";
  if (kind === "exact_wording_approval") return "exact_owner_approved";
  if (kind === "calibration_only_approval") return "exact_owner_approved_calibration_only";
  if (kind === "preferred_version") return "owner_revised_candidate";
  return "positive_direction_not_approved";
}

function proposalFor(payload) {
  const id = payload.id || `${slug(payload.surface)}-${slug(payload.planet || payload.sign || payload.articleBeat)}-${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 10)}`;
  return {
    id,
    surface: payload.surface,
    ...(payload.planet ? { planet: payload.planet } : {}),
    ...(payload.sign ? { sign: payload.sign } : {}),
    articleBeat: payload.articleBeat,
    before: payload.before || "[no prior wording supplied]",
    beforeIsRejected: payload.beforeIsRejected !== false,
    after: payload.after || "[rejected without replacement]",
    whatChanged: payload.whatChanged || "Owner feedback recorded; transformation description pending human review.",
    ownerReason: payload.ownerReason || payload.ownerStatement,
    reasonSource: "explicit_owner_feedback",
    failureTags: payload.failureTags || [],
    approvalLevel: approvalLevel(payload.feedbackKind),
    sourcePaths: payload.sourcePaths,
    provenance: `${payload.feedbackKind}: ${payload.ownerStatement}`,
    feedbackKind: payload.feedbackKind,
    exactApprovalScope: payload.feedbackKind === "calibration_only_approval" ? "calibration_only" : payload.feedbackKind === "exact_wording_approval" ? (payload.approvalScope || "exact_wording_only") : "not_exact_approval"
  };
}

function main() {
  const options = parseArgs();
  const payload = JSON.parse(fs.readFileSync(path.resolve(repoRoot, options.input), "utf8"));
  validatePayload(payload, options);
  const proposal = proposalFor(payload);
  const preview = {
    mode: options.apply ? "apply" : "dry-run",
    target: path.relative(repoRoot, datasetPath).replaceAll(path.sep, "/"),
    authorityEffect: proposal.approvalLevel,
    approvalInferred: false,
    proposedRecord: proposal,
    nextCommands: [
      "node .agents/skills/satori-writer/scripts/build-voice-index.js",
      "git diff -- packages/astro-knowledge/voice/tldr-astro/satori-writer"
    ]
  };
  if (options.apply) {
    const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
    if (dataset.records.some((record) => record.id === proposal.id)) throw new Error(`Feedback record '${proposal.id}' already exists.`);
    const stored = { ...proposal };
    delete stored.feedbackKind;
    if (stored.exactApprovalScope === "not_exact_approval") delete stored.exactApprovalScope;
    dataset.records.push(stored);
    fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`);
  }
  const serialized = `${JSON.stringify(preview, null, 2)}\n`;
  if (options.out) {
    const out = path.resolve(repoRoot, options.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, serialized);
    console.log(`Feedback preview: ${path.relative(repoRoot, out)}`);
  } else process.stdout.write(serialized);
}

module.exports = { approvalLevel, proposalFor, validatePayload };

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
