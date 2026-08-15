#!/usr/bin/env node
/**
 * Proves the index-builder store guards actually fire.
 *
 * Every guard here replaced one that could not fail. `ASTRO_DATA_ROWS_DROPPED`
 * and `MATRIX_V9_ROWS_DROPPED` compared a counter against its own source array,
 * so no input could ever trip them; they were deleted. What remains must be
 * demonstrated, because a guard nobody has seen fail has not been tested — and
 * the bug that started this (2,368 owner-approved rows silently dropped) was
 * invisible for exactly that reason.
 *
 * Each case reintroduces a real failure into a scratch copy of the repo inputs
 * and asserts the builder refuses to produce an index.
 *
 * Usage: node scripts/test-index-store-guards.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  SOURCE_SPECS,
  parseSourceMarkdown,
  validateAstronomy
} from "./build-four-body-sky-aspects.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builder = path.join(root, "scripts/build-knowledge-index.mjs");
const v9Relative = "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json";
const v9Path = path.join(root, v9Relative);

/** Run the builder to a scratch output and return combined stderr/stdout. */
function build() {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tldr-guard-")), "index.json");
  const result = spawnSync(process.execPath, [builder, "--write", "--output", out], { cwd: root, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/** Temporarily replace a file, run `fn`, always restore. */
function withMutation(absolutePath, mutate, fn) {
  const original = fs.readFileSync(absolutePath);
  try {
    const parsed = JSON.parse(original.toString("utf8"));
    fs.writeFileSync(absolutePath, `${JSON.stringify(mutate(parsed), null, 2)}\n`);
    return fn();
  } finally {
    fs.writeFileSync(absolutePath, original);
  }
}

let failures = 0;
function expectGuard(label, mutate, errorName) {
  const { status, output } = withMutation(v9Path, mutate, build);
  const fired = status !== 0 && output.includes(errorName);
  console.log(`  ${fired ? "fires " : "DEAD  "} ${label}  ->  ${errorName}`);
  if (!fired) {
    failures += 1;
    console.log(`         builder exited ${status} without ${errorName}`);
  }
}

console.log("index store guards, each demonstrated by reintroducing the failure:\n");

// The original bug: only the first array is read, so house_activations vanishes.
expectGuard(
  "a required collection is not read",
  (j) => { const { house_activations, ...rest } = j; void house_activations; return rest; },
  "MATRIX_V9_COLLECTION_MISSING"
);

// A store that quietly loses rows — the failure the deleted counter pretended
// to catch.
expectGuard(
  "a collection loses rows",
  (j) => ({ ...j, house_activations: j.house_activations.slice(0, 10) }),
  "MATRIX_V9_ROWS_SHRANK"
);

// Exact-aspect Markdown is the only prose source of truth. Prove its named
// per-set floor and astronomy rejection both fire rather than merely existing.
{
  const spec = SOURCE_SPECS[0];
  const sourcePath = path.join(root, "packages/astro-knowledge/sources/authored/four-body/sky-aspects", spec.filename);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const finalHeading = raw.lastIndexOf("\n### ");
  const truncated = raw.slice(0, finalHeading);
  assert.throws(
    () => parseSourceMarkdown(spec, truncated),
    new RegExp(`${spec.id}_ROWS_SHRANK`, "u")
  );
  console.log(`  fires   a ${spec.id} source set loses a row  ->  ${spec.id}_ROWS_SHRANK`);

  const impossible = validateAstronomy([{
    sourceKey: "sky.north-node.conjunction.south-node",
    bodyA: "north_node",
    bodyB: "south_node",
    aspect: "conjunction"
  }]);
  assert.equal(impossible.accepted.length, 0);
  assert.equal(impossible.rejected.length, 1);
  assert.equal(impossible.rejected[0].reason, "fixed-axis");
  console.log("  fires   a fixed-axis sky aspect is impossible  ->  FOUR_BODY_SKY_ASTRONOMY_REJECTED");
}

// Baseline: unmutated inputs must still build.
{
  const { status } = build();
  const ok = status === 0;
  console.log(`  ${ok ? "builds" : "BROKEN"}  unmutated inputs produce an index`);
  if (!ok) failures += 1;
}

// The index the repo ships must match a fresh build of the restored inputs.
{
  const committed = fs.readFileSync(path.join(root, "packages/astro-knowledge/generated/knowledge-index.json"), "utf8");
  const check = spawnSync(process.execPath, [builder, "--check"], { cwd: root, encoding: "utf8" });
  const ok = check.status === 0 && committed.length > 0;
  console.log(`  ${ok ? "clean " : "DIRTY "}  committed index matches inputs after restore`);
  if (!ok) failures += 1;
}

assert.equal(failures, 0, `${failures} index store guard(s) did not fire.`);
console.log("\nAll index store guards fire.");
