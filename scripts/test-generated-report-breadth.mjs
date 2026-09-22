import assert from "node:assert/strict";
import { build } from "esbuild";
import fs from "node:fs";

assert.match(fs.readFileSync("api/_lib/content-generation.ts", "utf8"), /friendTransitReadingPrompt\(\{ brief, headline \}\),\s*generatedReportWritingContract\(\)/u,
  "The legacy Friends prompt path must load the same contract.");

// Test the real judge schema, prompt assembly, and release decision. Replace
// only provider transport/config and the catalog gate; no billed calls.
const bundle = await build({
  // Bundled CommonJS dependencies need Node's require even inside a data URL.
  banner: { js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(import.meta.url)});` },
  entryPoints: ["api/_lib/transit-reading-judge.ts"],
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "breadth-fixture", setup(builder) {
    builder.onResolve({ filter: /report-model-client\.js$/ }, () => ({ path: "transport", namespace: "fixture" }));
    builder.onResolve({ filter: /productionPreCallGate\.cjs$/ }, () => ({ path: "gate", namespace: "fixture" }));
    builder.onResolve({ filter: /report-fulfillment-config\.js$/ }, () => ({ path: "config", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "transport"
      ? `export const callReportCalibrationModel = async (input) => { await input.beforeProviderCall(); return globalThis.reportBreadthFixture(input); };`
      : path === "gate"
        ? `export const prepareProductionPreCallGate = () => ({}); export const assertProductionPreCallGate = () => true;`
      : `export const REPORT_JUDGE_THRESHOLD = 0.85; export const reportFulfillmentConfig = () => ({judgeProvider: "fixture", judgeModel: "fixture"});`
    }));
  }}]
});
const { judgeGeneratedTransitReading, GENERATED_REPORT_JUDGE_SCHEMA } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const scores = Object.fromEntries(GENERATED_REPORT_JUDGE_SCHEMA.properties.scores.required.map((key) => [key, 4]));
const evidence = { draftQuote: "Fixture", sourcePath: null, sourceQuote: null, ownerComparisons: [] };
const scoreCategory = {
  over_specification: "factual_traceability", unsupported_interpretation: "factual_traceability",
  unsupported_timing: "astrology_chronology", narrative_repetition: "interpretive_movement", owner_language: "owner_voice"
};
assert.ok(GENERATED_REPORT_JUDGE_SCHEMA.properties.findings.items.properties.category.enum.includes("over_specification"));
const previous = globalThis.reportBreadthFixture;
let response;
let ownerComparison;
try {
  globalThis.reportBreadthFixture = async (input) => {
    for (const name of ['V3', 'V3.2', 'V3.3', 'V3.4']) {
      const path = `tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-${name}-OWNER.md`;
      assert.ok(input.prompt.includes(`SOURCE_PATH: ${path}`));
      // Every approved non-transport section survives byte-for-byte.
      for (const section of fs.readFileSync(path, 'utf8').split(/(?=^## )/mu)) {
        if (!/^## Output (?:contract|and verdict)\s*$/mu.test(section)) assert.ok(input.prompt.includes(section));
        else assert.ok(!input.prompt.includes(section));
      }
    }
    assert.ok(input.prompt.includes('fixed product headline is metadata'));
    assert.ok(input.prompt.includes('no defect is supported'));
    assert.ok(input.prompt.includes('4/4 owner_voice and natural_language release floors remain unchanged'));
    assert.doesNotMatch(input.prompt, /ASSUME THERE IS A DEFECT|Return PASS or REVISE only|## Output contract/u);
    const passage = input.prompt.match(/OWNER PASSAGE ([^\n]+)\nFUNCTION: [^\n]+\nREFERENCE FORMAT: [^\n]+\nSOURCE SECTION: [^\n]+\n([\s\S]+?)\nEND OWNER PASSAGE/u);
    assert.ok(passage, 'Comparison passage identifiers and supplied functions must reach the judge.');
    ownerComparison = { evidenceId: passage[1], quote: passage[2], difference: 'Synthetic diagnostic comparing the supplied passage with the candidate.' };
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
    productionInput: { surface: "friends", contentKey: "fixture", eventType: "transit", facts: { friendTransitsBrief: { primaryThemes: [], longerCycles: [], relationshipActivations: [], houseContext: [], activePatterns: [], daily: null } }, knowledgeIds: ["fixture"], sourceSnapshot: {} }, ownerEvidence: ["Approved fixture rule"]
  });
  response = { scores, findings: [{ category: "over_specification", location: "body", finding: "Unsupported outcome.", ...evidence }] };
  await assert.rejects(judge(), /finding contradicts a perfect category score/,
    "Contradictory diagnostics must not enter the correction loop.");
  for (const outcome of ["breakup", "job loss", "move", "major financial loss", "illness", "quitting"]) {
    response = { scores: { ...scores, factual_traceability: 3 }, findings: [{ category: "over_specification", location: "body", finding: `Unsupported ${outcome} inferred from a broad category.`, ...evidence }] };
    const result = await judge();
    assert.ok([3, 4].includes(result.ownerVoiceEvidence.sources.length));
    assert.deepEqual(result.ownerVoiceEvidence.target, { surface: "friends", horizon: "current" });
    assert.ok(result.result.overall >= 0.85);
    assert.equal(result.result.verdict, "below_threshold", `${outcome} must block even when the aggregate score passes`);
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
    response = { scores: { ...scores, [scoreCategory[category]]: 3 }, findings: [{ category, location: "body", finding, ...evidence }] };
    const result = await judge();
    assert.ok(result.result.overall >= 0.85);
    assert.equal(result.result.verdict, "below_threshold", category);
  }
  // Grounded examples and negated outcomes are not blocked by a word blacklist.
  response = { scores, findings: [] };
  assert.equal((await judge()).result.verdict, "pass");
  response = { scores: { ...scores, owner_voice: 3 }, findings: [] };
  await assert.rejects(judge(), /below-floor owner_voice score has no diagnostic evidence/);
  response.findings = [{ category: "owner_voice", location: "body", finding: "The wording fails the supplied voice rubric.", ...evidence }];
  await assert.rejects(judge(), /lacks eligible comparison evidence/);
  response.findings[0].ownerComparisons = [ownerComparison];
  assert.equal((await judge()).result.verdict, "below_threshold", "Breadth does not waive voice floors");
  response = { scores, findings: [{ category: "unknown_category", location: "body", finding: "Invalid result" }] };
  await assert.rejects(judge(), /malformed finding/);
} finally {
  if (previous === undefined) delete globalThis.reportBreadthFixture;
  else globalThis.reportBreadthFixture = previous;
}
console.log("Generated report breadth: actual judge schema/prompt, outcome hard blocks, voice floors, and malformed findings passed.");
