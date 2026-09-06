import fs from "node:fs";

const generationPath = "api/_lib/content-generation.ts";
let source = fs.readFileSync(generationPath, "utf8");

const schemaMarker = "const bannedUserFacingPhrases = [";
if (!source.includes(schemaMarker)) throw new Error("schema insertion marker missing");

if (!source.includes("const friendTransitReadingGeneratedContentSchema = {")) {
  const friendSchema = `const friendTransitReadingGeneratedContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "tldr", "summary", "body", "action", "timing", "sections", "sceneLock", "astrologyDrilldown"],
  properties: {
    headline: { type: "string" },
    tldr: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
    action: { type: "string" },
    timing: { type: "string" },
    sections: {
      type: "array",
      maxItems: 0,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body"],
        properties: {
          heading: { type: "string" },
          body: { type: "string" }
        }
      }
    },
    sceneLock: { type: "null" },
    astrologyDrilldown: { type: "null" }
  }
} as const;

function generatedContentSchemaForInput(input: GenerateContentInput) {
  return isFriendTransitReadingInput(input)
    ? friendTransitReadingGeneratedContentSchema
    : generatedContentSchema;
}

`;
  source = source.replace(schemaMarker, friendSchema + schemaMarker);
}

if (!source.includes("schema: generatedContentSchemaForInput(input)")) {
  const needle = "schema: generatedContentSchema";
  if (!source.includes(needle)) throw new Error("OpenAI writer schema marker missing");
  source = source.replace(needle, "schema: generatedContentSchemaForInput(input)");
}

if (!source.includes("input_schema: generatedContentSchemaForInput(input)")) {
  const needle = "input_schema: generatedContentSchema";
  if (!source.includes(needle)) throw new Error("Claude writer schema marker missing");
  source = source.replace(needle, "input_schema: generatedContentSchemaForInput(input)");
}

const qualityStart = source.indexOf("function validateGeneratedContentQuality");
const qualityEnd = source.indexOf("function validateAstrologyDrilldownQuality", qualityStart);
if (qualityStart < 0 || qualityEnd < 0) throw new Error("quality function boundaries missing");
let quality = source.slice(qualityStart, qualityEnd);
if (!quality.includes("if (isFriendTransitReadingInput(input)) {\n    return;\n  }")) {
  const bodyGate = `  if (content.body.trim().length < 180) {
    throw new Error("Generated body is too thin for editorial review.");
  }
`;
  if (!quality.includes(bodyGate)) throw new Error("Friends quality-return insertion marker missing");
  quality = quality.replace(bodyGate, `${bodyGate}
  if (isFriendTransitReadingInput(input)) {
    return;
  }
`);
  source = source.slice(0, qualityStart) + quality + source.slice(qualityEnd);
}

const validationStart = source.indexOf("function validateGeneratedContentForInput");
const validationEnd = source.indexOf("function parseResponseJson", validationStart);
if (validationStart < 0 || validationEnd < 0) throw new Error("validation function boundaries missing");
let validation = source.slice(validationStart, validationEnd);
validation = validation.replace("  validateAstrologyDrilldownQuality(content);\n\n", "");
if (!validation.includes("validateAstrologyDrilldownQuality(content);")) {
  const natalMarker = "  if (isNatalAspectGenerationContext(input)) {";
  if (!validation.includes(natalMarker)) throw new Error("drilldown reinsertion marker missing");
  validation = validation.replace(natalMarker, `  validateAstrologyDrilldownQuality(content);\n\n${natalMarker}`);
}
source = source.slice(0, validationStart) + validation + source.slice(validationEnd);
fs.writeFileSync(generationPath, source);

const testPath = "scripts/test-friend-transit-reading-request-render.mjs";
let test = fs.readFileSync(testPath, "utf8");
const generationDecl = `const generationSource = fs.readFileSync("api/_lib/content-generation.ts", "utf8");\n`;
if (!test.includes(generationDecl)) {
  const apiDecl = `const apiSource = fs.readFileSync("api/generate-user-content.ts", "utf8");\n`;
  if (!test.includes(apiDecl)) throw new Error("test api source marker missing");
  test = test.replace(apiDecl, apiDecl + generationDecl);
}

if (!test.includes("friendTransitReadingGeneratedContentSchema")) {
  const marker = `assert.match(apiSource, /requestSubjectType === "friend_transit_reading"[\\s\\S]{0,220}This paid reading is currently unavailable/u);\n`;
  if (!test.includes(marker)) throw new Error("test assertion insertion marker missing");
  const additions = String.raw`
assert.match(generationSource, /const friendTransitReadingGeneratedContentSchema = \{[\s\S]*sceneLock: \{ type: "null" \}[\s\S]*astrologyDrilldown: \{ type: "null" \}/u);
assert.match(generationSource, /schema: generatedContentSchemaForInput\(input\)/u);
assert.match(generationSource, /input_schema: generatedContentSchemaForInput\(input\)/u);
const qualityStart = generationSource.indexOf("function validateGeneratedContentQuality");
const qualityEnd = generationSource.indexOf("function validateAstrologyDrilldownQuality", qualityStart);
const qualitySource = generationSource.slice(qualityStart, qualityEnd);
assert.ok(qualitySource.indexOf("content.body.trim().length < 180") >= 0);
assert.ok(qualitySource.indexOf("if (isFriendTransitReadingInput(input))") > qualitySource.indexOf("content.body.trim().length < 180"));
assert.ok(qualitySource.indexOf("if (isPrimaryNatalPlacementGeneration(input))") > qualitySource.indexOf("if (isFriendTransitReadingInput(input))"));
const validationStart = generationSource.indexOf("function validateGeneratedContentForInput");
const validationEnd = generationSource.indexOf("function parseResponseJson", validationStart);
const validationSource = generationSource.slice(validationStart, validationEnd);
assert.ok(validationSource.indexOf("validateGeneratedContentQuality(content, input)") >= 0);
assert.ok(validationSource.indexOf("if (isFriendTransitReadingInput(input))") > validationSource.indexOf("validateGeneratedContentQuality(content, input)"));
assert.ok(validationSource.indexOf("validateAstrologyDrilldownQuality(content)") > validationSource.indexOf("if (isFriendTransitReadingInput(input))"));
`;
  test = test.replace(marker, marker + additions);
}
fs.writeFileSync(testPath, test);
