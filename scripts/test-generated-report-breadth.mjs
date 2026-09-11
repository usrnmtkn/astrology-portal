import assert from "node:assert/strict";
import { build } from "esbuild";
import fs from "node:fs";

assert.match(fs.readFileSync("api/_lib/content-generation.ts", "utf8"), /friendTransitReadingPrompt\(\{ brief, headline \}\),\s*generatedReportWritingContract\(\)/u,
  "The legacy Friends prompt path must load the same contract.");

// Test the real judge schema, prompt assembly, and release decision. Replace
// only provider transport/config and global instructions; no billed calls.
const bundle = await build({
  // Bundled CommonJS dependencies need Node's require even inside a data URL.
  banner: { js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(import.meta.url)});` },
  entryPoints: ["api/_lib/transit-reading-judge.ts"],
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "breadth-fixture", setup(builder) {
    builder.onResolve({ filter: /report-model-client\.js$/ }, () => ({ path: "transport", namespace: "fixture" }));
    builder.onResolve({ filter: /productionPreCallGate\.cjs$/ }, () => ({ path: "gate", namespace: "fixture" }));
    builder.onResolve({ filter: /report-fulfillment-config\.js$/ }, () => ({ path: "config", namespace: "fixture" }));
    builder.onResolve({ filter: /openAIResponses\.cjs$/ }, () => ({ path: "instructions", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "transport"
      ? `export const callReportCalibrationModel = async (input) => { await input.beforeProviderCall(); return globalThis.reportBreadthFixture(input); };`
      : path === "gate"
        ? `export const prepareProductionPreCallGate = () => ({}); export const assertProductionPreCallGate = () => true;`
      : path === "config"
        ? `export const REPORT_JUDGE_THRESHOLD = 0.85; export const reportFulfillmentConfig = () => ({judgeProvider: "fixture", judgeModel: "fixture"});`
        : `export const instructionsForRole = () => "Fixture canonical review instructions";`
    }));
  }}]
});
const { judgeGeneratedTransitReading, GENERATED_REPORT_JUDGE_SCHEMA } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const scores = Object.fromEntries(GENERATED_REPORT_JUDGE_SCHEMA.properties.scores.required.map((key) => [key, 4]));
assert.ok(GENERATED_REPORT_JUDGE_SCHEMA.properties.findings.items.properties.category.enum.includes("over_specification"));
const previous = globalThis.reportBreadthFixture;
let response;
try {
  globalThis.reportBreadthFixture = async (input) => {
    assert.ok(input.prompt.includes("Weekly progression and contextual owner corrections"));
    assert.ok(input.prompt.includes("what is happening → where it hits → trap → what to do"));
    assert.ok(input.prompt.includes("A New Moon label alone does not authorize"));
    assert.ok(input.prompt.includes("EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE"));
    assert.ok(input.prompt.includes("BROADEN BEFORE SPECIFYING"));
    assert.ok(input.prompt.includes("OVER-SPECIFICATION FAIL"));
    assert.ok(input.prompt.includes("5–8 distinct possible manifestations"));
    assert.ok(input.prompt.includes("Approved fixture rule"));
    input.validateResponse(response);
    return { value: response, provider: "fixture", model: "fixture" };
  };
  const judge = () => judgeGeneratedTransitReading({
    surface: "friends", reportKind: "friend_transit_reading",
    brief: { source: "locked fixture" },
    draft: { headline: "Fixture", tldr: "Fixture", summary: "Fixture", body: "Fixture" },
    productionInput: { surface: "friends", contentKey: "fixture", eventType: "transit", facts: { friendTransitsBrief: { source: "locked fixture" } }, knowledgeIds: ["fixture"], sourceSnapshot: {} }, ownerEvidence: ["Approved fixture rule"]
  });
  for (const outcome of ["breakup", "job loss", "move", "major financial loss", "illness", "quitting"]) {
    response = { scores, findings: [{ category: "over_specification", location: "body paragraph 2", finding: `Unsupported ${outcome} inferred from a broad category.` }] };
    const result = await judge();
    assert.equal(result.ownerVoiceEvidence.sources.length, 3);
    assert.equal(result.result.overall, 1);
    assert.equal(result.result.verdict, "below_threshold", `${outcome} must block even with perfect scores`);
    assert.equal(result.result.findings[0].category, "over_specification");
  }
  for (const [category, finding] of [
    ["narrative_repetition", "The body opening repeats the TLDR without developing the observation."],
    ["unsupported_interpretation", "Home/family evidence is used to infer reduced sociability without support."],
    ["unsupported_interpretation", "Renegotiation is prescribed although the brief supports change only."],
    ["unsupported_interpretation", "A temporary difficulty becomes a categorical sign stereotype."],
    ["unsupported_timing", "A six-month duration is absent from the supplied brief."],
    ["owner_language", "The metaphorical asking construction repeats a contextual owner correction."],
    ["owner_language", "Real is used as vague emphasis rather than a factual distinction."]
  ]) {
    assert.ok(GENERATED_REPORT_JUDGE_SCHEMA.properties.findings.items.properties.category.enum.includes(category));
    response = { scores, findings: [{ category, location: "body", finding }] };
    const result = await judge();
    assert.equal(result.result.overall, 1);
    assert.equal(result.result.verdict, "below_threshold", category);
  }
  // Grounded examples and negated outcomes are not blocked by a word blacklist.
  response = { scores, findings: [] };
  assert.equal((await judge()).result.verdict, "pass");
  response = { scores: { ...scores, owner_voice: 3 }, findings: [] };
  assert.equal((await judge()).result.verdict, "below_threshold", "Breadth does not waive voice floors");
  response = { scores, findings: [{ category: "unknown_category", location: "body", finding: "Invalid result" }] };
  await assert.rejects(judge(), /invalid finding/);
} finally {
  if (previous === undefined) delete globalThis.reportBreadthFixture;
  else globalThis.reportBreadthFixture = previous;
}
console.log("Generated report breadth: actual judge schema/prompt, outcome hard blocks, voice floors, and malformed findings passed.");
