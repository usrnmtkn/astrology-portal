import assert from "node:assert/strict";
import { build } from "esbuild";
import fs from "node:fs";

assert.match(fs.readFileSync("api/_lib/content-generation.ts", "utf8"), /friendTransitReadingPrompt\(\{ brief, headline \}\),\s*generatedReportWritingContract\(\)/u,
  "The legacy Friends prompt path must load the same contract.");

// Test the real judge schema, prompt assembly, and release decision. Replace
// only provider transport/config and global instructions; no billed calls.
const bundle = await build({
  entryPoints: ["api/_lib/transit-reading-judge.ts"],
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "breadth-fixture", setup(builder) {
    builder.onResolve({ filter: /transit-reading-production\.js$/ }, () => ({ path: "transport", namespace: "fixture" }));
    builder.onResolve({ filter: /report-fulfillment-config\.js$/ }, () => ({ path: "config", namespace: "fixture" }));
    builder.onResolve({ filter: /openAIResponses\.cjs$/ }, () => ({ path: "instructions", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "transport"
      ? `export const prepareTransitReadingProductionKernel = () => ({});
         export const callGovernedTransitReadingModel = (input) => globalThis.reportBreadthFixture(input);`
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
    productionInput: {}, ownerEvidence: ["Approved fixture rule"]
  });
  for (const outcome of ["breakup", "job loss", "move", "major financial loss", "illness", "quitting"]) {
    response = { scores, findings: [{ category: "over_specification", location: "body paragraph 2", finding: `Unsupported ${outcome} inferred from a broad category.` }] };
    const result = await judge();
    assert.equal(result.result.overall, 1);
    assert.equal(result.result.verdict, "below_threshold", `${outcome} must block even with perfect scores`);
    assert.equal(result.result.findings[0].category, "over_specification");
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
