#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const deployment = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const memoryConfig = JSON.parse(fs.readFileSync("config/agent-memory-sources-v1.json", "utf8"));
const correctionSources = memoryConfig.sources
  .filter((source) => source.kind === "correction")
  .map((source) => source.path);

assert.ok(correctionSources.length > 0, "Article writing memory has no configured correction sources.");
for (const source of correctionSources) {
  assert.ok(fs.existsSync(source), `Configured correction source is missing from the repository: ${source}`);
}

for (const endpoint of [
  "api/admin/sky-article-writing.ts",
  "api/admin/sky-article-template-slots.ts",
]) {
  const rule = deployment.functions?.[endpoint];
  assert.ok(rule && typeof rule.includeFiles === "string", `${endpoint} needs an explicit Vercel includeFiles rule.`);
  assert.ok(rule.includeFiles.length <= 256, `${endpoint} includeFiles exceeds Vercel's deployment-safe pattern budget.`);
  const packaged = new Set(fs.globSync(rule.includeFiles));
  for (const source of correctionSources) {
    assert.ok(packaged.has(source), `${endpoint} does not package correction source: ${source}`);
  }
  assert.ok(packaged.has("config/agent-memory-sources-v1.json"), `${endpoint} does not package the memory source registry.`);
  assert.ok(packaged.has("config/writing-effective-rules-v1.json"), `${endpoint} does not package the effective writing-rule registry.`);
}

console.log("Article writer deployment assets passed: both production endpoints package every configured correction source and writing registry.");
