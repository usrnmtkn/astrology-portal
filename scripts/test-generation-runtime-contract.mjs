import assert from "node:assert/strict";
import fs from "node:fs";

const source = (path) => fs.readFileSync(path, "utf8");
const deployment = JSON.parse(source("vercel.json"));
const memoryConfig = JSON.parse(source("config/agent-memory-sources-v1.json"));

for (const endpoint of ["api/admin/sky-article-writing.ts", "api/admin/sky-article-template-slots.ts"]) {
  const pattern = deployment.functions[endpoint]?.includeFiles ?? "";
  assert.ok(pattern, `${endpoint} needs an explicit production bundle.`);
  assert.match(pattern, /data\/writing/u, `${endpoint} must package writing memory.`);
  assert.match(pattern, /jsonl/u, `${endpoint} must package JSONL writing memory.`);
  const packaged = new Set(fs.globSync(pattern));
  for (const spec of memoryConfig.sources.filter((item) => item.kind === "correction")) {
    assert(packaged.has(spec.path), `${endpoint} is missing ${spec.path} from its production bundle.`);
  }
}

const articleWriter = source("api/admin/sky-article-writing.ts");
assert.doesNotMatch(articleWriter, /templateBody:\s*[`'"]\{\{articleDraft\}\}/u,
  "The article writer must not seed its immutable context with its own generation-control placeholder.");
assert.match(articleWriter, /Never output \{\{articleDraft\}\}/u,
  "The article writer must explicitly reject generation-control placeholders.");

const readiness = source("api/_lib/generation-readiness.ts");
for (const required of [
  "content_studio", "generated_reports", "premium_reports",
  "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "currentSkyFacts", "stale-running"
]) {
  assert.ok(readiness.includes(required), `Generation readiness is missing ${required}.`);
}
const readinessEndpoint = source("api/admin/generation-readiness.ts");
assert.match(readinessEndpoint, /requireReportAdmin/u, "Generation readiness must remain owner-only.");
assert.match(readinessEndpoint, /generationReadiness/u, "Generation readiness endpoint must execute the shared contract.");

console.log("Generation runtime contract passed: deployed assets, placeholder safety, provider config, database, calculation, and queue readiness are covered.");
