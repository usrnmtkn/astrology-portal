#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13-astrology-support-v1.json");
const matrixPath = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const workbookPath = path.join(repoRoot, artifact.sourceWorkbook);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(artifact.sourceWorkbookSha256, sha256(fs.readFileSync(workbookPath)));
assert.equal(artifact.matrixIdentitySourceSha256, sha256(fs.readFileSync(matrixPath)));
assert.equal(artifact.rows.length, 1014);
assert.equal(artifact.counts.unapprovedV13Rows, 713);
assert.equal(artifact.counts.unapprovedWithSupport, 713);
assert.equal(new Set(artifact.rows.map((row) => `${row.sheet}\u0000${row.key}`)).size, 1014);
assert.ok(artifact.rows.every((row) => row.astrologySupport && row.astrologySupportSha256 === sha256(row.astrologySupport)));
assert.ok(artifact.rows.every((row) => !Object.hasOwn(row, "copy") && !Object.hasOwn(row, "currentCopy") && !Object.hasOwn(row, "priorCopy")));
const identities = new Set(artifact.rows.map((row) => `${row.sheet}\u0000${row.key}`));
assert.ok(matrix.rows.filter((row) => row.ownerApproved !== true).every((row) => identities.has(`${row.sheet}\u0000${row.key}`)));
console.log("LL V13 AstrologySupport registry passed: 1,014 exact identities, 713/713 unapproved rows covered, candidate prose excluded.");
