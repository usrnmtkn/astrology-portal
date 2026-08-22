#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const scripts = packageJson.scripts ?? {};

assert.equal(
  scripts["prepare:app-test-dependencies"],
  "npm run build -w @tldr/astro-knowledge",
  "Application-test preparation must build the local @tldr/astro-knowledge workspace package."
);

const pretestContent = scripts["pretest:content"] ?? "";
const prerequisiteRegression = "npm run test:isolated-worktree-prerequisite";
const knowledgeBuild = "npm run prepare:app-test-dependencies";
const firstApplicationImport = "node --import tsx scripts/test-natal-exact-copy-routing.mjs";

assert.ok(
  pretestContent.startsWith(`${prerequisiteRegression} && ${knowledgeBuild} && `),
  "pretest:content must verify and build its isolated-worktree dependency before any application test."
);
assert.ok(
  pretestContent.indexOf(knowledgeBuild) < pretestContent.indexOf(firstApplicationImport),
  "The knowledge-package build must run before the first application-test import."
);

console.log("Isolated-worktree application-test prerequisite is enforced before the first app import.");
