#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const voiceIndexPath = path.join(packageRoot, "voice", "tldr-astro", "satori-writer", "voice-index.json");
const manifestPath = path.join(packageRoot, "voice", "tldr-astro", "fixtures", "sky-article-longform", "owner-corpus", "manifest.json");
const reviewRoot = path.join(packageRoot, "review");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath, files);
    else files.push(absolutePath);
  }
  return files;
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function auditExistingCorpus() {
  const voiceIndexBytes = fs.readFileSync(voiceIndexPath);
  const manifestBytes = fs.readFileSync(manifestPath);
  const voiceIndex = JSON.parse(voiceIndexBytes);
  const manifest = JSON.parse(manifestBytes);
  const sameSurfaceSlugs = new Set([
    ...manifest.cohorts.calibrationCandidates,
    ...manifest.cohorts.diagnosticSameSurface
  ].map((entry) => entry.sourceSlug));
  const writerInputPaths = walk(reviewRoot)
    .filter((filePath) => {
      const repoPath = relative(filePath);
      return repoPath.includes("/sky-placement") && (
        /model-input.*\.md$/u.test(filePath)
        || /writer-request.*\.json$/u.test(filePath)
        || filePath.endsWith("packet.json")
      );
    })
    .sort((left, right) => relative(left).localeCompare(relative(right)));
  const writerInput = writerInputPaths.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");

  const candidates = voiceIndex.entries
    .filter((entry) => {
      const match = String(entry.sourceId || "").match(/^owner-article:([^:]+):p\d+$/u);
      const wordCount = String(entry.text || "").trim().split(/\s+/u).filter(Boolean).length;
      return match
        && sameSurfaceSlugs.has(match[1])
        && entry.surface === "sky-article-longform"
        && entry.authorityClass === "owner_authored_final"
        && entry.ownerAuthored === true
        && entry.ownerApproved === true
        && wordCount >= 20;
    })
    .map((entry) => {
      const exposedBySourceId = writerInput.includes(entry.sourceId);
      const exposedByExactText = writerInput.includes(entry.text);
      return {
        sourceId: entry.sourceId,
        sourcePath: entry.sourcePath,
        sourceSha256: entry.sourceSha256,
        wordCount: entry.text.trim().split(/\s+/u).length,
        exposedToStoredWriterInput: exposedBySourceId || exposedByExactText,
        exposureMatch: exposedBySourceId ? "source-id" : exposedByExactText ? "exact-text" : null
      };
    })
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId, undefined, { numeric: true }));

  const bySourcePath = {};
  for (const candidate of candidates) {
    const summary = bySourcePath[candidate.sourcePath] || { candidates: 0, exposed: 0, unexposed: 0 };
    summary.candidates += 1;
    summary[candidate.exposedToStoredWriterInput ? "exposed" : "unexposed"] += 1;
    bySourcePath[candidate.sourcePath] = summary;
  }
  const exposed = candidates.filter((entry) => entry.exposedToStoredWriterInput).length;

  return {
    schemaVersion: 1,
    auditId: "sky-placement-writer-existing-owner-corpus-audit-v2",
    surface: "sky-placement",
    sourceManifest: relative(manifestPath),
    sourceManifestSha256: sha256(manifestBytes),
    voiceIndex: relative(voiceIndexPath),
    voiceIndexSha256: sha256(voiceIndexBytes),
    storedWriterInputArtifactCount: writerInputPaths.length,
    storedWriterInputArtifactsSha256: sha256(writerInputPaths.map((filePath) => `${relative(filePath)}:${sha256(fs.readFileSync(filePath))}`).join("\n")),
    ownerAuthoredSameSurfacePassageCount: candidates.length,
    exposedToStoredWriterInputCount: exposed,
    unexposedToStoredWriterInputCount: candidates.length - exposed,
    targetEvaluationFixtureCount: 20,
    newOwnerWritingRequired: false,
    evaluationSubsetFrozen: false,
    billedEvaluationsRun: false,
    governance: {
      conclusion: "The repository already contains enough owner-authored same-surface writing to curate the evaluation set.",
      selectionRule: "Existing passages remain candidates until an exact 20-piece subset is frozen under a new evaluation-set version.",
      exposureRule: "Absence from stored writer inputs is necessary but does not erase the manifest's whole-article diagnostic-exposure record.",
      promotionRule: "This audit grants no model, wording, or serving approval."
    },
    bySourcePath,
    candidates
  };
}

function markdown(report) {
  const rows = Object.entries(report.bySourcePath)
    .map(([sourcePath, counts]) => `| ${sourcePath} | ${counts.candidates} | ${counts.exposed} | ${counts.unexposed} |`)
    .join("\n");
  return `# Sky Placement writer existing owner-corpus audit v2\n\nThe repository already contains **${report.ownerAuthoredSameSurfacePassageCount}** substantial owner-authored, same-surface passages across the governed Sky article corpus. Against **${report.storedWriterInputArtifactCount}** stored Sky writer inputs, **${report.unexposedToStoredWriterInputCount}** exact passages were not exposed and **${report.exposedToStoredWriterInputCount}** were exposed.\n\n**No new owner writing is required.** The next deterministic step is to freeze an exact 20-piece evaluation subset from the existing corpus under a new evaluation-set version. This audit does not perform that selection, authorize billed calls, or promote a model. The corpus manifest records whole-article diagnostic exposure, so paragraph-level non-exposure is necessary evidence, not automatic held-out approval.\n\n| Source | Candidates | Exposed | Unexposed |\n|---|---:|---:|---:|\n${rows}\n`;
}

function main() {
  const report = auditExistingCorpus();
  const outputJson = path.join(packageRoot, "review", "sky-placement-writer-existing-owner-corpus-audit-v2.json");
  const outputMarkdown = path.join(packageRoot, "review", "sky-placement-writer-existing-owner-corpus-audit-v2.md");
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMarkdown, markdown(report));
  console.log(`Audited ${report.ownerAuthoredSameSurfacePassageCount} owner passages: ${report.unexposedToStoredWriterInputCount} unexposed across ${report.storedWriterInputArtifactCount} stored Sky writer inputs. No billed calls.`);
}

module.exports = { auditExistingCorpus, markdown };
if (require.main === module) main();
