#!/usr/bin/env node
/**
 * Land the four owner-written Node/Chiron article sources as fail-closed voice
 * exemplars. Markdown remains authoritative; the manifest is deterministic.
 * These records are doctrine-only and explicitly non-retrievable until a
 * later owner surface-permission decision.
 *
 * Usage:
 *   node scripts/build-four-body-voice-exemplars.mjs --import-source <directory> --write
 *   node scripts/build-four-body-voice-exemplars.mjs --check
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destinationDir = path.join(
  repoRoot,
  "packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/adjacent-formats/four-body-promotion"
);
const manifestPath = path.join(destinationDir, "manifest.json");

const SOURCES = Object.freeze([
  Object.freeze({
    filename: "TLDR-Article-Edition-Chiron-Aries-REVIEW.md",
    subjects: ["chiron"],
    canonicalIds: ["placement-sign/chiron/aries"],
    format: "article-edition"
  }),
  Object.freeze({
    filename: "TLDR-Article-Nodes-Aquarius-Leo-REVIEW.md",
    subjects: ["north_node", "south_node"],
    canonicalIds: ["placement-sign/north_node/aquarius", "placement-sign/south_node/leo"],
    format: "article-edition"
  }),
  Object.freeze({
    filename: "TLDR-Article-Template-Chiron-Ingress-REVIEW.md",
    subjects: ["chiron"],
    canonicalIds: [],
    format: "article-template"
  }),
  Object.freeze({
    filename: "TLDR-Article-Template-Nodes-REVIEW.md",
    subjects: ["north_node", "south_node"],
    canonicalIds: [],
    format: "article-template"
  })
]);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const wordCount = (value) => String(value).trim().split(/\s+/u).filter(Boolean).length;

function manifest() {
  const entries = SOURCES.map((source) => {
    const file = path.join(destinationDir, source.filename);
    if (!fs.existsSync(file)) throw new Error(`FOUR_BODY_VOICE_SOURCE_MISSING: ${source.filename}`);
    const bytes = fs.readFileSync(file);
    return {
      ...source,
      byteCount: bytes.length,
      wordCount: wordCount(bytes.toString("utf8")),
      sourceSha256: sha256(bytes),
      authorityClass: "voice-exemplar",
      governanceState: "needs-owner-decision",
      surfacePermission: ["doctrine-only"],
      usage: "register-example",
      retrievable: false,
      writerEligible: false,
      renderEligible: false,
      approvalMarker: "REVIEW_FILENAME_AUDIT_MARKER_ONLY"
    };
  });
  return {
    schemaVersion: 1,
    status: "indexed-fail-closed-no-surface-permission",
    sourceOfTruth: "The four Markdown files are authoritative; this manifest is generated.",
    policy: "Voice evidence only, never astrological fact or serving copy. REVIEW in a filename does not grant approval.",
    expectedEntries: 4,
    entries
  };
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check");
const importRoot = valueAfter(args, "--import-source");
if (write && check) throw new Error("Use --write or --check, not both.");
if (importRoot && !write) throw new Error("--import-source requires --write.");

if (importRoot) {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const source of SOURCES) {
    const external = path.resolve(importRoot, source.filename);
    const bytes = fs.readFileSync(external);
    fs.writeFileSync(path.join(destinationDir, source.filename), bytes);
    console.log(`Imported ${source.filename} byte-for-byte (${bytes.length} bytes, sha256 ${sha256(bytes)}).`);
  }
}

const serialized = `${JSON.stringify(manifest(), null, 2)}\n`;
if (check) {
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8") !== serialized) {
    console.error("STALE: four-body voice-exemplar manifest differs from its Markdown sources.");
    process.exit(1);
  }
  console.log("Four-body voice exemplars are current: 4 sources, all doctrine-only and non-retrievable.");
  process.exit(0);
}

if (write) {
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.writeFileSync(manifestPath, serialized);
  console.log("Wrote the four-body voice-exemplar manifest; no source is surface-retrievable.");
} else {
  console.log("Four voice-exemplar sources modelled. Use --write or --check.");
}
