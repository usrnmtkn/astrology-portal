import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/calendar-quarter-phase-sign-candidates-v1.json",
);
const runtimeRoot = path.join(repoRoot, "apps/web/src");
const sourcePaths = [
  path.join(
    repoRoot,
    "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json",
  ),
  path.join(
    repoRoot,
    "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
  ),
];

const signs = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const phases = ["first-quarter", "last-quarter"];
const phaseTitles = {
  "first-quarter": "First Quarter",
  "last-quarter": "Last Quarter",
};

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const flattenRows = (value) =>
  Object.values(value).flatMap((entry) => (Array.isArray(entry) ? entry : []));

const artifact = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const candidates = artifact.candidates ?? [];
const sourceRows = sourcePaths.flatMap((sourcePath) =>
  flattenRows(JSON.parse(fs.readFileSync(sourcePath, "utf8"))),
);
const sourceByKey = new Map(sourceRows.map((row) => [row.contentKey, row]));

if (artifact.serving_status !== "non_serving_review_artifact") {
  fail("review artifact must be explicitly non-serving");
}

for (const [field, expected] of Object.entries({
  review_status: "needs_review",
  ownerApproved: false,
  promotionAuthorized: false,
  canonical: false,
  render_eligible: false,
})) {
  if (artifact.governance?.[field] !== expected) {
    fail(`top-level governance ${field} must be ${JSON.stringify(expected)}`);
  }
}

if (candidates.length !== 24) {
  fail(`expected 24 candidates; found ${candidates.length}`);
}

const keys = new Set();
for (const candidate of candidates) {
  const { contentKey, phase, moonSign, body_you: body } = candidate;
  const slug = String(moonSign ?? "").toLowerCase();
  const expectedKey = `fallback-hook/moon-phase/${phase}/${slug}`;
  const expectedPhrase = `${phaseTitles[phase]} Moon in ${moonSign}`;

  if (!phases.includes(phase)) fail(`${contentKey}: invalid phase ${phase}`);
  if (!signs.includes(moonSign)) fail(`${contentKey}: invalid Moon sign ${moonSign}`);
  if (contentKey !== expectedKey) fail(`${contentKey}: expected key ${expectedKey}`);
  if (keys.has(contentKey)) fail(`${contentKey}: duplicate candidate key`);
  keys.add(contentKey);

  for (const [field, expected] of Object.entries({
    review_status: "needs_review",
    render_eligible: false,
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
  })) {
    if (candidate[field] !== expected) {
      fail(`${contentKey}: ${field} must be ${JSON.stringify(expected)}`);
    }
  }

  if (typeof body !== "string" || !body.includes(expectedPhrase)) {
    fail(`${contentKey}: body must name “${expectedPhrase}”`);
    continue;
  }

  const wordCount = body.trim().split(/\s+/).length;
  if (wordCount < 35 || wordCount > 75) {
    fail(`${contentKey}: expected 35–75 words; found ${wordCount}`);
  }

  const prohibitedPatterns = [
    [/\b(?:you|your|yours|we|our|ours)\b/i, "unsupported personal or collective claim"],
    [/\b(?:may|might|will)\b/i, "predictive hedge or outcome"],
    [/\b(?:plan|project|harvest)\b/i, "rejected generic framing"],
    [/\bput\s+down\b/i, "rejected generic release instruction"],
    [/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/i, "unstable time claim"],
    [/\b\d+(?:\.\d+)?°/, "unstable degree claim"],
  ];
  for (const [pattern, label] of prohibitedPatterns) {
    if (pattern.test(body)) fail(`${contentKey}: contains ${label}`);
  }

  const expectedSources = [
    `fallback-hook/moon-phase/${phase}`,
    `authored/calendar-weekly-moon/${slug}`,
    `fallback-hook/lunation-sign-compact/new-moon/${slug}`,
    `fallback-hook/lunation-sign-compact/full-moon/${slug}`,
  ];
  for (const sourceKey of expectedSources) {
    if (!candidate.source_keys?.includes(sourceKey)) {
      fail(`${contentKey}: missing provenance source ${sourceKey}`);
    }
    const source = sourceByKey.get(sourceKey);
    if (!source) {
      fail(`${contentKey}: provenance source not found: ${sourceKey}`);
    } else if (!["approved", "approved_reuse"].includes(source.review_status)) {
      fail(
        `${contentKey}: provenance source lacks an accepted approval status: ${sourceKey}`,
      );
    }
  }
}

for (const phase of phases) {
  for (const sign of signs) {
    const expectedKey = `fallback-hook/moon-phase/${phase}/${sign.toLowerCase()}`;
    if (!keys.has(expectedKey)) fail(`missing matrix candidate ${expectedKey}`);
  }
}

const runtimeFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (/\.(?:js|mjs|cjs|ts|tsx|json)$/.test(entry.name)) runtimeFiles.push(target);
  }
};
walk(runtimeRoot);

const artifactName = path.basename(candidatePath);
for (const runtimeFile of runtimeFiles) {
  if (fs.readFileSync(runtimeFile, "utf8").includes(artifactName)) {
    fail(`non-serving review artifact is referenced by runtime file ${runtimeFile}`);
  }
}

if (!process.exitCode) {
  console.log(
    "PASS: 24 exact First/Last Quarter Moon-in-sign candidates are complete, source-traceable, non-serving, and gated for owner review.",
  );
}
