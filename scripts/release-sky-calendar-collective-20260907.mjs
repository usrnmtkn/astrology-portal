#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRelative = "packages/astro-knowledge/review/sky-calendar-collective-rewrite-2026-09-07";
const candidateRoot = path.join(repoRoot, candidateRelative);
const releaseRelative = "packages/astro-knowledge/review/sky-calendar-collective-approved-2026-09-07";
const releaseRoot = path.join(repoRoot, releaseRelative);
const editorialAuthorizationRelative = `${releaseRelative}/owner-batch-authorization.json`;
const servingAuthorizationRelative = `${releaseRelative}/owner-serving-authorization.json`;
const sourceProjectionRelative = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-06-final-83/current-owner-payloads.json";
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const candidateFiles = [
  "candidate-payloads-01.json",
  "candidate-payloads-02.json",
  "candidate-payloads-03.json",
  "candidate-payloads-04.json",
  "candidate-payloads-05.json",
  "candidate-payloads-06.json",
  "candidate-payloads-07.json",
  "candidate-payloads-08.json",
];
const overlayFile = "reader-address-overlay.json";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return crypto.createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

function wordCount(value) {
  return String(value ?? "").trim().split(/\s+/u).filter(Boolean).length;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: expected source text was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected source text was not unique.`);
  }
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

function replaceRegexOnce(source, pattern, after, label) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches.length}.`);
  return source.replace(pattern, after);
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(repoRoot, relativePath), content);
}

const editorialAuthorization = readJson(path.join(repoRoot, editorialAuthorizationRelative));
const servingAuthorization = readJson(path.join(repoRoot, servingAuthorizationRelative));
const sourceProjectionRaw = fs.readFileSync(path.join(repoRoot, sourceProjectionRelative), "utf8");
const sourceProjection = JSON.parse(sourceProjectionRaw);

assert(editorialAuthorization.type === "bounded_contextual_owner_batch_authorization", "Unexpected editorial authorization type.");
assert(editorialAuthorization.authority === "owner" && editorialAuthorization.decision === "approve", "Owner editorial approval is required.");
assert(editorialAuthorization.batchId === "sky-calendar-collective-approved-2026-09-07", "Unexpected editorial batch id.");
assert(editorialAuthorization.approvalEffect === "exact_wording_approval", "Exact-wording approval is required.");
assert(editorialAuthorization.memberCount === 379, "Editorial authorization must bind exactly 379 rows.");
assert(editorialAuthorization.readerAddressOverlayCount === 40, "Editorial authorization must bind the 40-row selective reader-address overlay.");
assert(editorialAuthorization.sourceProjectionPath === sourceProjectionRelative, "Source projection path drifted.");
assert(gitBlobSha(sourceProjectionRaw) === editorialAuthorization.sourceProjectionBlobSha, "Source projection blob drifted from the approved candidate basis.");
assert(sourceProjection.rowCount === 379, "Source projection must contain exactly 379 rows.");
assert(sourceProjection.payloadSetSha256 === editorialAuthorization.sourceProjectionPayloadSetSha256, "Source projection payload-set hash drifted.");

assert(servingAuthorization.type === "bounded_contextual_owner_batch_authorization", "Unexpected serving authorization type.");
assert(servingAuthorization.authority === "owner" && servingAuthorization.decision === "approve", "Owner serving approval is required.");
assert(servingAuthorization.sourceEditorialBatchId === editorialAuthorization.batchId, "Serving authorization does not point to the editorial approval.");
assert(servingAuthorization.sourceEditorialAuthorizationPath === editorialAuthorizationRelative, "Serving authorization evidence path drifted.");
assert(servingAuthorization.memberCount === 379, "Serving authorization must bind exactly 379 rows.");
assert(servingAuthorization.runtimeEligible === true, "Serving authorization must be runtime eligible.");
assert(servingAuthorization.contentStudioEditable === true, "Serving authorization must require Content Studio editability.");
assert(servingAuthorization.contentStudioSignedOffExactOverridesCanonicalBaseline === true, "Signed-off exact Content Studio versions must be authorized to override their canonical baseline.");
for (const capability of ["batch_generation", "serving", "content_studio_sync"]) {
  assert(servingAuthorization.capabilities?.includes(capability), `Serving authorization is missing ${capability}.`);
}

const baseEntries = new Map();
for (const fileName of candidateFiles) {
  const raw = fs.readFileSync(path.join(candidateRoot, fileName), "utf8");
  assert(gitBlobSha(raw) === editorialAuthorization.recordFileBlobs?.[fileName], `${fileName}: approved candidate blob drifted.`);
  const packet = JSON.parse(raw);
  assert(packet.reviewStatus === "needs_review", `${fileName}: historical candidate review state drifted.`);
  for (const [contentKey, payload] of Object.entries(packet.entries ?? {})) {
    assert(!baseEntries.has(contentKey), `${contentKey}: duplicate candidate key.`);
    assert(typeof payload.summary === "string" && payload.summary.trim(), `${contentKey}: missing summary.`);
    assert(typeof payload.body === "string" && payload.body.startsWith(payload.summary), `${contentKey}: body must begin with its summary.`);
    baseEntries.set(contentKey, { ...payload, sourceFile: fileName, readerAddressOverlay: false });
  }
}
assert(baseEntries.size === 379, `Expected 379 base candidates, found ${baseEntries.size}.`);

const overlayRaw = fs.readFileSync(path.join(candidateRoot, overlayFile), "utf8");
assert(gitBlobSha(overlayRaw) === editorialAuthorization.recordFileBlobs?.[overlayFile], "Reader-address overlay blob drifted.");
const overlay = JSON.parse(overlayRaw);
assert(overlay.entryCount === 40 && Object.keys(overlay.entries ?? {}).length === 40, "Reader-address overlay must contain exactly 40 entries.");
let overlayApplied = 0;
for (const [contentKey, payload] of Object.entries(overlay.entries ?? {})) {
  assert(baseEntries.has(contentKey), `${contentKey}: reader-address overlay escaped the approved 379-row key set.`);
  assert(typeof payload.summary === "string" && payload.summary.trim(), `${contentKey}: overlay summary missing.`);
  assert(typeof payload.body === "string" && payload.body.startsWith(payload.summary), `${contentKey}: overlay body must begin with its summary.`);
  const base = baseEntries.get(contentKey);
  baseEntries.set(contentKey, { ...payload, sourceFile: base.sourceFile, readerAddressOverlay: true });
  overlayApplied += 1;
}
assert(overlayApplied === 40, "Exactly 40 selective reader-address passages must be applied.");

const sourceKeys = Object.keys(sourceProjection.payloads ?? {}).sort();
const finalKeys = [...baseEntries.keys()].sort();
assert(sourceKeys.length === 379 && finalKeys.length === 379, "Final/source key count drifted.");
assert(JSON.stringify(sourceKeys) === JSON.stringify(finalKeys), "Final candidate key set must exactly match the approved 379-row source projection.");

const transitIndex = new Map();
for (const fileName of fs.readdirSync(transitRoot).filter((name) => name.endsWith(".json"))) {
  const runtimePath = path.join(transitRoot, fileName);
  const record = readJson(runtimePath);
  if (!record?.transiting || !record?.aspect || !record?.other) continue;
  const key = `sky.${record.transiting}.${record.aspect}.${record.other}`;
  assert(!transitIndex.has(key), `${key}: duplicate runtime exact-aspect identity.`);
  transitIndex.set(key, { fileName, runtimePath, record });
}

fs.mkdirSync(releaseRoot, { recursive: true });
const manifestRows = [];
const approvalRecords = [];
const finalPayloads = {};

for (const contentKey of finalKeys) {
  const payload = baseEntries.get(contentKey);
  const parts = contentKey.split(".");
  assert(parts.length === 4 && parts[0] === "sky", `${contentKey}: invalid candidate key.`);
  const [, transiting, aspect, other] = parts;
  const runtime = transitIndex.get(contentKey);
  assert(runtime, `${contentKey}: matching canonical transit file is missing.`);
  assert(runtime.record.transiting === transiting && runtime.record.aspect === aspect && runtime.record.other === other, `${contentKey}: runtime identity mismatch.`);
  assert(runtime.record.status === "LIVE", `${contentKey}: release may update only an existing LIVE exact source.`);

  const previousReaderCopy = runtime.record.readerCopy ?? null;
  const previousReaderCopySha256 = sha256(JSON.stringify(previousReaderCopy));
  const readerCopy = {
    summary: payload.summary,
    body: payload.body,
    approvedVia: `bounded owner-approved collective Calendar batch ${editorialAuthorization.batchId}; ${editorialAuthorizationRelative}; serving and Content Studio authorized by ${servingAuthorizationRelative}`,
  };

  const released = {
    ...runtime.record,
    base: payload.summary,
    voiceNeutral: true,
    status: "LIVE",
    readerCopy,
  };
  fs.writeFileSync(runtime.runtimePath, `${JSON.stringify(released, null, 2)}\n`);

  const payloadHash = sha256(JSON.stringify({ summary: payload.summary, body: payload.body }));
  const canonicalKey = `sky.aspect.${transiting}.${aspect}.${other}`;
  finalPayloads[contentKey] = {
    sha256: payloadHash,
    payload: { summary: payload.summary, body: payload.body },
  };
  const record = {
    contentKey: canonicalKey,
    legacyProjectionKey: contentKey,
    surface: editorialAuthorization.surface,
    approvedFields: editorialAuthorization.approvedFields,
    approvalLevel: "exact_owner_approved",
    authority: "owner",
    decision: "approve",
    approvedAt: editorialAuthorization.approvedAt,
    ownerStatement: editorialAuthorization.ownerStatement,
    decisionContext: editorialAuthorization.decisionContext,
    editorialAuthorizationPath: editorialAuthorizationRelative,
    servingAuthorizationPath: servingAuthorizationRelative,
    sourceCandidateFile: `${candidateRelative}/${payload.sourceFile}`,
    readerAddressOverlay: payload.readerAddressOverlay,
    summarySha256: sha256(payload.summary),
    summaryWordCount: wordCount(payload.summary),
    bodySha256: sha256(payload.body),
    bodyWordCount: wordCount(payload.body),
    payloadSha256: payloadHash,
    summary: payload.summary,
    body: payload.body,
  };
  approvalRecords.push(record);
  manifestRows.push({
    contentKey: canonicalKey,
    legacyProjectionKey: contentKey,
    runtimeFile: path.relative(repoRoot, runtime.runtimePath),
    sourceCandidateFile: record.sourceCandidateFile,
    readerAddressOverlay: payload.readerAddressOverlay,
    summarySha256: record.summarySha256,
    summaryWordCount: record.summaryWordCount,
    bodySha256: record.bodySha256,
    bodyWordCount: record.bodyWordCount,
    previousReaderCopySha256,
    releasedReaderCopySha256: sha256(JSON.stringify(readerCopy)),
  });
}

const payloadSetSha256 = sha256(JSON.stringify(
  Object.entries(finalPayloads)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 })),
));

fs.writeFileSync(path.join(releaseRoot, "current-owner-payloads.json"), `${JSON.stringify({
  schemaVersion: 3,
  name: "Complete 379-row owner-approved collective Sky Calendar exact-aspect payload projection",
  rowCount: 379,
  readerAddressOverlayCount: 40,
  sourceCandidatePath: candidateRelative,
  sourceProjectionPath: sourceProjectionRelative,
  editorialAuthorizationPath: editorialAuthorizationRelative,
  servingAuthorizationPath: servingAuthorizationRelative,
  payloadSetSha256,
  payloads: finalPayloads,
}, null, 2)}\n`);

fs.writeFileSync(path.join(releaseRoot, "exact-approval-records.json"), `${JSON.stringify({
  schemaVersion: 1,
  batchId: editorialAuthorization.batchId,
  rowCount: approvalRecords.length,
  readerAddressOverlayCount: overlayApplied,
  editorialAuthorizationPath: editorialAuthorizationRelative,
  servingAuthorizationPath: servingAuthorizationRelative,
  records: approvalRecords,
}, null, 2)}\n`);

fs.writeFileSync(path.join(releaseRoot, "shipping-manifest.json"), `${JSON.stringify({
  schemaVersion: 3,
  name: "Sky Calendar collective exact-aspect serving release",
  batchId: editorialAuthorization.batchId,
  approvedAt: editorialAuthorization.approvedAt,
  ownerStatement: editorialAuthorization.ownerStatement,
  surface: editorialAuthorization.surface,
  rowCount: manifestRows.length,
  readerAddressOverlayCount: overlayApplied,
  runtimeStatus: "LIVE",
  contentStudioEditable: true,
  contentStudioSignedOffExactOverridesCanonicalBaseline: true,
  preserveUnchangedSouthNodeRows: true,
  sourceCandidatePath: candidateRelative,
  editorialAuthorizationPath: editorialAuthorizationRelative,
  servingAuthorizationPath: servingAuthorizationRelative,
  payloadSetSha256,
  rows: manifestRows,
}, null, 2)}\n`);

fs.writeFileSync(path.join(releaseRoot, "README.md"), `# Sky Calendar collective exact-aspect serving release\n\nThis release promotes the hash-bound 379-row collective Calendar exact-aspect package approved by the owner on 2026-09-07. Forty passages use selective, scope-safe second person; the remaining passages stay fully collective.\n\nThe canonical transit corpus is the production baseline. All 379 updated exact aspects are also mirrored into Content Studio as published, editable Summary/Body rows. A later Content Studio edit becomes reader-eligible only after Sign Off returns that exact row to LIVE; the signed-off Studio exact version then overrides the canonical baseline at the exact tier. Sign-specific/composed copy keeps its existing higher product precedence.\n\nThe existing 60 pole-specific South Node runtime records are outside this rewrite and remain byte-preserved by this release. The post-merge Content Studio synchronization therefore continues to expose 439 exact rows in total: 379 updated historical exact aspects plus 60 South Node rows.\n\nSee \`shipping-manifest.json\` and \`exact-approval-records.json\` for hash-bound release evidence.\n`);

// Make signed-off exact Content Studio edits genuinely reader-authoritative at the exact tier.
const skyContentRelative = "apps/web/src/services/skyAspectContent.ts";
let skyContent = fs.readFileSync(path.join(repoRoot, skyContentRelative), "utf8");
if (!skyContent.includes("const southNodeAspectForNorthNodeAspect")) {
  skyContent = replaceOnce(
    skyContent,
    "\n\nfunction canonicalCollectiveSkyPoint(value: string) {",
    `\n\nconst southNodeAspectForNorthNodeAspect: Record<string, string> = {\n  conjunction: "opposition",\n  sextile: "trine",\n  square: "square",\n  trine: "sextile",\n  opposition: "conjunction"\n};\n\nfunction canonicalCollectiveSkyPoint(value: string) {`,
    "Content Studio node-axis aspect mapping",
  );
}

skyContent = replaceRegexOnce(
  skyContent,
  /export function resolveSkyAspectContentStudioExact\(options: ResolveSkyAspectContentOptions\) \{[\s\S]*?\n\}\n(?=\nexport function skyAspectGeneratedContentKeys)/gu,
  `function contentStudioExactRow(\n  generatedContent: Map<string, LiveGeneratedContent>,\n  expected: Pick<ExpectedSkyAspectFacts, "a" | "b" | "aspect">\n) {\n  const contentKey = \`sky.aspect.\${expected.a}.\${expected.aspect}.\${expected.b}\`;\n  const content = generatedContent.get(contentKey);\n  const source = content?.sourceSnapshot ?? {};\n  const identity = recordField(source.exactSkyAspectIdentity);\n  const body = content ? skyAspectBody(content) : "";\n\n  if (\n    !content\n    || source.contentStudioExactAspect !== true\n    || identity?.a !== expected.a\n    || identity?.b !== expected.b\n    || identity?.aspect !== expected.aspect\n    || !body\n    || !isReaderFacingCopy(body)\n  ) {\n    return null;\n  }\n\n  return { body, content };\n}\n\nexport function resolveSkyAspectContentStudioExact(options: ResolveSkyAspectContentOptions) {\n  const expected = normalizedContentStudioExactSkyAspectFacts(options);\n  if (!expected) return null;\n\n  const primary = contentStudioExactRow(options.generatedContent, expected);\n  if (!primary) return null;\n\n  if (expected.a === "north-node") {\n    const southAspect = southNodeAspectForNorthNodeAspect[expected.aspect];\n    const south = southAspect\n      ? contentStudioExactRow(options.generatedContent, {\n          a: "south-node",\n          b: expected.b,\n          aspect: southAspect\n        })\n      : null;\n\n    if (south) {\n      return {\n        body: [\n          \`North Node (\${expected.aspect}): \${primary.body}\`,\n          \`South Node (\${southAspect}): \${south.body}\`\n        ].join("\\n\\n"),\n        content: primary.content\n      };\n    }\n  }\n\n  return primary;\n}\n`,
  "Content Studio exact resolver",
);

skyContent = replaceRegexOnce(
  skyContent,
  /export function skyAspectGeneratedContentKeys\(options: SkyAspectContentKeyOptions\) \{[\s\S]*?\n\}\n(?=\nexport function resolveSkyAspectGeneratedContent)/gu,
  `export function skyAspectGeneratedContentKeys(options: SkyAspectContentKeyOptions) {\n  const expected = normalizedCollectiveSkyAspectFacts(options);\n  const studioExpected = normalizedContentStudioExactSkyAspectFacts(options);\n  const keys = expected ? skyAspectContentKeysFromExpected(expected, options.targetDate) : [];\n\n  if (studioExpected) {\n    keys.push(\`sky.aspect.\${studioExpected.a}.\${studioExpected.aspect}.\${studioExpected.b}\`);\n\n    if (studioExpected.a === "north-node") {\n      const southAspect = southNodeAspectForNorthNodeAspect[studioExpected.aspect];\n      if (southAspect) keys.push(\`sky.aspect.south-node.\${southAspect}.\${studioExpected.b}\`);\n    }\n  }\n\n  return Array.from(new Set(keys));\n}\n`,
  "Calendar exact Content Studio hydration keys",
);
writeText(skyContentRelative, skyContent);

const lunarRelative = "apps/web/src/features/calendar/LunarCalendar.tsx";
let lunar = fs.readFileSync(path.join(repoRoot, lunarRelative), "utf8");
lunar = replaceOnce(lunar, "exact: exact ?? studioExact,", "exact: studioExact ?? exact,", "Calendar Studio exact precedence");
writeText(lunarRelative, lunar);

const appRelative = "apps/web/src/App.tsx";
let app = fs.readFileSync(path.join(repoRoot, appRelative), "utf8");
app = replaceRegexOnce(
  app,
  /  const loadedExactRegistry = contentRegistryFor\("sky"\);\n\n  if \(\n    studio[\s\S]*?\n  \}\n\n  const registry = contentRegistryFor\("sky"\);/gu,
  `  if (studio) {\n    return {\n      slot: "meaning",\n      required: true,\n      layer: "authored",\n      tier: "content-studio-exact-sky-aspect-v1",\n      sourceKeys: [studio.content.contentKey],\n      heading: studio.content.headline || skyAspectDisplayTitle(aspect),\n      body: studio.body\n    };\n  }\n\n  const registry = contentRegistryFor("sky");`,
  "Sky Studio exact precedence",
);
writeText(appRelative, app);

const seedRelative = "scripts/seed-published-calendar-aspect-content-studio.mjs";
let seed = fs.readFileSync(path.join(repoRoot, seedRelative), "utf8");
seed = replaceOnce(
  seed,
  'const packageVersion = "EXACT-SKY-ASPECT-CONTENT-STUDIO-2026-09-01";',
  'const packageVersion = "EXACT-SKY-ASPECT-CONTENT-STUDIO-2026-09-07-COLLECTIVE";',
  "Content Studio exact package version",
);
writeText(seedRelative, seed);

const publishedTestRelative = "scripts/test-published-calendar-aspect-content-studio.mjs";
let publishedTest = fs.readFileSync(path.join(repoRoot, publishedTestRelative), "utf8");
publishedTest = replaceOnce(
  publishedTest,
  'assert.match(app, /const loadedExactRegistry = contentRegistryFor\\("sky"\\);[\\s\\S]*!loadedExactRegistry\\.approvedExactSkyAspectCopy\\(aspect\\.from, aspect\\.type, aspect\\.to\\)[\\s\\S]*tier: "content-studio-exact-sky-aspect-v1"/u, "Sky detail may use Studio exact copy only for a true canonical exact gap.");',
  'assert.match(app, /if \\(studio\\) \\{[\\s\\S]*tier: "content-studio-exact-sky-aspect-v1"/u, "Sky detail must prefer a signed-off Studio exact version over the canonical exact baseline.");',
  "Published exact Sky Studio precedence assertion",
);
publishedTest = replaceOnce(
  publishedTest,
  'assert.match(calendar, /exact: exact \\?\\? studioExact/u, "Calendar cards must keep canonical exact copy authoritative over the Studio mirror.");',
  'assert.match(calendar, /exact: studioExact \\?\\? exact/u, "Calendar cards must prefer a signed-off Studio exact version over the canonical exact baseline.");',
  "Published exact Calendar Studio precedence assertion",
);
publishedTest = replaceOnce(
  publishedTest,
  'assert.equal(mercuryMars.readerCopy.body.startsWith("A direct conversation can clear a problem that has been taking far more mental energy than the actual solution requires."), true);',
  'assert.equal(mercuryMars.readerCopy.body.startsWith(mercuryMars.readerCopy.summary), true);',
  "Mercury Mars exact-copy structural assertion",
);
publishedTest = replaceOnce(
  publishedTest,
  'assert.equal(sunMercury.readerCopy.body.startsWith("Your thoughts can feel unusually personal when saying what you mean also feels like saying who you are."), true);',
  'assert.equal(sunMercury.readerCopy.body.startsWith(sunMercury.readerCopy.summary), true);',
  "Sun Mercury exact-copy structural assertion",
);
writeText(publishedTestRelative, publishedTest);

const authorityTestRelative = "scripts/test-sky-placement-exact-aspect-authority.mjs";
let authorityTest = fs.readFileSync(path.join(repoRoot, authorityTestRelative), "utf8");
authorityTest = replaceOnce(
  authorityTest,
  "assert.match(calendar, /exact: exact \\?\\? studioExact/u);",
  "assert.match(calendar, /exact: studioExact \\?\\? exact/u);",
  "Sky placement Calendar Studio precedence assertion",
);
authorityTest = replaceOnce(
  authorityTest,
  'assert.match(app, /const loadedExactRegistry = contentRegistryFor\\("sky"\\);[\\s\\S]*studio[\\s\\S]*loadedExactRegistry[\\s\\S]*!loadedExactRegistry\\.approvedExactSkyAspectCopy/u);',
  'assert.match(app, /if \\(studio\\) \\{[\\s\\S]*tier: "content-studio-exact-sky-aspect-v1"/u);',
  "Sky placement Studio exact authority assertion",
);
writeText(authorityTestRelative, authorityTest);

const southNodeTestRelative = "scripts/test-calendar-south-node-serving.mjs";
let southNodeTest = fs.readFileSync(path.join(repoRoot, southNodeTestRelative), "utf8");
southNodeTest = replaceOnce(
  southNodeTest,
  "assert.equal(studioNorth?.body, marsNorth.body);\nassert.equal(studioSouth?.body, marsSouth.body);",
  "assert.ok(studioNorth?.body.includes(marsNorth.body));\nassert.ok(studioNorth?.body.includes(marsSouth.body));\nassert.match(studioNorth?.body ?? \"\", /North Node \\(square\\):/u);\nassert.match(studioNorth?.body ?? \"\", /South Node \\(square\\):/u);\nassert.equal(studioSouth?.body, marsSouth.body);",
  "South Node Studio dual-pole assertion",
);
writeText(southNodeTestRelative, southNodeTest);

const surfaceContractRelative = "docs/content-management/SKY-ASPECT-SURFACE-CONTRACT.md";
let surfaceContract = fs.readFileSync(path.join(repoRoot, surfaceContractRelative), "utf8");
surfaceContract = replaceOnce(
  surfaceContract,
  `1. Owner-approved sign-specific Sky aspect copy for the current signs\n2. Owner-approved exact-aspect reader copy from the canonical transit corpus\n3. Approved exact or pair-specific Sky aspect phrasebook hook\n4. Explicitly approved generated write-up for the current planet/aspect/sign facts\n5. SOURCE_GAP`,
  `1. Owner-approved sign-specific Sky aspect copy for the current signs\n2. Governed LIVE Content Studio exact-aspect version for the exact identity after Sign Off\n3. Owner-approved exact-aspect reader copy from the canonical transit corpus as the baseline\n4. Approved exact or pair-specific Sky aspect phrasebook hook\n5. Explicitly approved generated write-up for the current planet/aspect/sign facts\n6. SOURCE_GAP`,
  "Sky aspect documented precedence",
);
surfaceContract = replaceOnce(
  surfaceContract,
  "Owner-approved sign-specific and exact-aspect copy is author-final and immutable. A generated\nrow must never replace it, even when the generated row is more sign-specific,\nnewer, or judge-scored. Generated content is an enhancement only when no\napproved exact or phrasebook unit exists, and it must be labeled as generated\nin application provenance rather than `authored`.",
  "Owner-approved sign-specific copy and the canonical exact-aspect baseline remain author-final historical sources. A signed-off Content Studio exact row is a separately approved version of the same exact identity, not a mutation of that historical baseline. DRAFT or pending-review Studio rows are never reader-eligible. A generated row must never replace an approved sign-specific, signed-off exact Studio, or canonical exact unit, even when the generated row is more sign-specific, newer, or judge-scored. Generated content is an enhancement only when no approved exact or phrasebook unit exists, and it must be labeled as generated in application provenance rather than `authored`.",
  "Sky aspect author-final versioning rule",
);
writeText(surfaceContractRelative, surfaceContract);

const contentReadmeRelative = "docs/content-management/README.md";
let contentReadme = fs.readFileSync(path.join(repoRoot, contentReadmeRelative), "utf8");
contentReadme = replaceOnce(
  contentReadme,
  "On the Sky aspect surface, approved sign-specific copy wins for its exact sign\ncombination. Otherwise, an exact-aspect `readerCopy` with `status: \"LIVE\"` in\nthe canonical transit corpus is the authored unit. Both must be selected before\ngeneric phrasebook, generated, or general fallback prose. A DRAFT transit",
  "On the Sky aspect surface, approved sign-specific copy wins for its exact sign\ncombination. Otherwise, a governed LIVE Content Studio exact row that has been\nSigned Off is the current approved version for that exact identity. If no such\nStudio version exists, an exact-aspect `readerCopy` with `status: \"LIVE\"` in\nthe canonical transit corpus is the authored baseline. These exact tiers must be\nselected before generic phrasebook, generated, or general fallback prose. A DRAFT transit",
  "Content management exact Sky precedence",
);
writeText(contentReadmeRelative, contentReadme);

console.log("Released 379 owner-approved collective Calendar exact aspects.", {
  rows: manifestRows.length,
  readerAddressOverlayRows: overlayApplied,
  payloadSetSha256,
  contentStudioEditable: true,
  contentStudioExactAuthority: "signed-off Studio exact > canonical exact baseline",
  southNodeRowsTouched: 0,
});
