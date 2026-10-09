#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const deployment = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const functionRules=Object.keys(deployment.functions??{});
assert.equal(functionRules.at(-1),'api/**/*.ts','The API catch-all must follow specific function rules so Vercel can match each endpoint.');
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
  "api/admin/personal-transit-writing.ts",
  "api/admin/horoscope-writing.ts",
  "api/admin/lunation-writing.ts",
  "api/admin/calendar-lunation-writing.ts",
  "api/admin/calendar-daily-writing.ts",
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

const horoscopeFiles=new Set(fs.globSync(deployment.functions['api/admin/horoscope-writing.ts'].includeFiles));
for(const source of ['data/writing/OWNER_APPROVED_EXAMPLES.jsonl','data/writing/owner-register-gold.json','data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl','data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl','packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json','packages/astro-knowledge/data/primitives/houses.json','tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json']) {
  assert.ok(horoscopeFiles.has(source),`Horoscope writer is missing deployed evidence: ${source}`);
}

console.log("Article writer deployment assets passed: both production endpoints package every configured correction source and writing registry.");

const lunarFiles=new Set(fs.globSync(deployment.functions['api/admin/lunation-writing.ts'].includeFiles));
for(const source of ['src/astro-writing/lunationArticleInput.mjs','src/astro-writing/lunationArticleWriting.mjs','data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl','data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl','packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json','tldr-astro-phrasebank/phrasebank/cc-moon-reviewed.json','tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json']) assert.ok(lunarFiles.has(source),`Missing lunation writer source: ${source}`);
assert.ok([...lunarFiles].some(source=>source.endsWith('.wasm')),'Lunation writer must package its ephemeris.');
