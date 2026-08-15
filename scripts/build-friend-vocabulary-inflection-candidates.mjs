#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
const jsonPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/friend-vocabulary-person-inflection-candidates-2026-08-15.json"
);
const markdownPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/friend-vocabulary-person-inflection-candidates-2026-08-15.md"
);

const proposedBodyTheyByKey = new Map(Object.entries({
  "fallback-vocab/house-jurisdiction/1": "their body, their look, and how they come across",
  "fallback-vocab/house-jurisdiction/3": "conversations, errands, and their daily circles",
  "fallback-vocab/house-jurisdiction/7": "relationships and the people who match them",
  "fallback-vocab/house-jurisdiction/11": "friends, community, and the roles they've outgrown",
  "fallback-vocab/house-jurisdiction/12": "rest, privacy, and what they keep to themselves",
  "fallback-vocab/planet-excess/sun": "ego inflation, or needing the spotlight to feel like they matter",
  "fallback-vocab/planet-productive/sun": "confidence, warmth, and being seen for who they are",
  "fallback-vocab/planet-function/sun": "identity, vitality, and where they're meant to shine",
  "fallback-vocab/planet-function/moon": "emotional needs, moods, and what makes them feel safe",
  "fallback-vocab/planet-function/mercury": "thinking, communication, and how they process",
  "fallback-vocab/planet-function/venus": "love, pleasure, taste, and what they value",
  "fallback-vocab/planet-excess/jupiter": "overdoing, over-promising, or believing their own hype",
  "fallback-vocab/planet-function/chiron": "the insecurities they carry and slowly make peace with",
  "fallback-vocab/planet-productive/north-node": "stretching toward what they're here to develop",
  "fallback-vocab/planet-productive/south-node": "the fall-back skills they can lean on",
  "fallback-vocab/house-pressure/1": "how they start and show up",
  "fallback-vocab/placement-gerund/chiron/aries/0": "learning to accept themselves as they are",
  "fallback-vocab/placement-gerund/chiron/gemini/0": "learning to trust how they speak, slowly",
  "fallback-vocab/placement-gerund/chiron/leo/0": "learning their right to be seen without performing",
  "fallback-vocab/placement-gerund/chiron/virgo/0": "learning to accept themselves without fixing everything first",
  "fallback-vocab/placement-gerund/chiron/libra/0": "learning their worth inside relationships",
  "fallback-vocab/placement-gerund/chiron/scorpio/0": "learning to let people close on their own terms",
  "fallback-vocab/placement-gerund/chiron/sagittarius/0": "learning to trust their own view",
  "fallback-vocab/placement-gerund/chiron/aquarius/0": "learning their difference is not a defect",
  "fallback-vocab/placement-gerund/chiron/pisces/0": "learning they are allowed to matter",
  "fallback-vocab/dodont-do/mercury/libra": "Write the thank-you",
  "fallback-vocab/dodont-do/mercury/aquarius": "Back up their files",
  "fallback-vocab/dodont-moon-dont/taurus": "Buying comfort they'll return",
  "fallback-vocab/dodont-moon-do/gemini": "Make the call they've been texting around",
  "fallback-vocab/dodont-moon-do/cancer": "Check on their person",
  "fallback-vocab/dodont-moon-dont/libra": "Polling everyone they know",
  "fallback-vocab/empty-house-ruler-jurisdiction/2": "money and what they value",
  "fallback-vocab/sky-planet-function/chiron": "old bruises they stop hiding and slowly learn to hold",
  "fallback-vocab/sky-planet-function/jupiter": "growth, patience, and where they bet on themselves",
  "fallback-vocab/sky-planet-function/mercury": "talking, planning, and how they process raw data",
  "fallback-vocab/sky-planet-function/moon": "moods, gut signals, and what helps their nervous system settle",
  "fallback-vocab/sky-planet-function/north-node": "the unfamiliar step that levels them up",
  "fallback-vocab/sky-planet-function/south-node": "autopilot skills and habits they have outgrown",
  "fallback-vocab/sky-planet-function/sun": "vitality, purpose, and where they stop editing themselves"
}));

const rulings = new Map([
  [
    "fallback-vocab/placement-gerund/chiron/capricorn/0",
    "Owner wording required: the literal inflection 'learning their worth is not their resume' reads heavy."
  ],
  [
    "fallback-vocab/dodont-reward/moon",
    "Owner wording required: this row reaches Friends do/don't through the shared renderer; do not guess at the imperative/reflexive form."
  ]
]);

const secondPersonPattern = /\b(?:you|your|yours|yourself|yourselves|you(?:'re|'ve|'ll|'d))\b/iu;
const actualPronounPattern = /(?:^|[\s,.;:!?()])(?:you|your|yours|yourself|yourselves|you(?:'re|'ve|'ll|'d))(?=$|[\s,.;:!?()])/iu;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const detectedRows = source.vocabularyRows.filter((row) => secondPersonPattern.test(row.body ?? ""));

if (source.vocabularyRows.length !== 720) {
  throw new Error(`Expected 720 vocabulary rows; found ${source.vocabularyRows.length}.`);
}
if (detectedRows.length !== 41) {
  throw new Error(`Expected 41 second-person regex hits; found ${detectedRows.length}.`);
}

const candidates = detectedRows.map((row) => {
  const sourceBodySha256 = sha256(row.body);
  const ruling = rulings.get(row.contentKey);
  const proposedBodyThey = proposedBodyTheyByKey.get(row.contentKey) ?? null;
  const falsePositive = row.contentKey === "fallback-vocab/dodont-do/mercury/libra";

  if (!ruling && proposedBodyThey == null) {
    throw new Error(`${row.contentKey}: missing proposed body_they or ruling.`);
  }

  return {
    contentKey: row.contentKey,
    sourceBody: row.body,
    sourceBodySha256,
    proposedBodyThey,
    proposedBodyTheySha256: proposedBodyThey == null ? null : sha256(proposedBodyThey),
    disposition: ruling
      ? "needs_owner_ruling"
      : falsePositive
        ? "not_a_person_reference"
        : "ready_for_owner_review",
    note: ruling ?? (falsePositive
      ? "The token occurs only inside the lexical item 'thank-you'; no person inflection is required."
      : "Grammatical inflection only; source body is unchanged."),
    ownerVerdict: "",
    ownerEdit: ""
  };
});

const counts = candidates.reduce((result, candidate) => {
  result[candidate.disposition] = (result[candidate.disposition] ?? 0) + 1;
  return result;
}, {});

if (counts.ready_for_owner_review !== 38 || counts.needs_owner_ruling !== 2 || counts.not_a_person_reference !== 1) {
  throw new Error(`Unexpected candidate counts: ${JSON.stringify(counts)}.`);
}

for (const candidate of candidates.filter((item) => item.disposition === "ready_for_owner_review")) {
  if (actualPronounPattern.test(candidate.proposedBodyThey)) {
    throw new Error(`${candidate.contentKey}: proposed body_they still contains a second-person pronoun.`);
  }
}

const artifact = {
  schema: "tldrastro-friend-vocabulary-person-inflection-candidates-v1",
  version: "2026-08-15",
  sourcePath: path.relative(repoRoot, sourcePath),
  sourceFileSha256: sha256(fs.readFileSync(sourcePath)),
  sourceVocabularyRowCount: source.vocabularyRows.length,
  regexHitCount: candidates.length,
  actualChartSubjectReferenceCount: candidates.length - counts.not_a_person_reference,
  counts,
  governance: {
    reviewState: "needs_review",
    ownerApproved: false,
    servingAuthorized: false,
    sourceBodiesChanged: false,
    note: "Candidates are inert review evidence. They must not enter fallback-source-rows-v3.json until the owner approves the exact body_they values."
  },
  candidates
};

const escapeCell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");
const markdown = [
  "# Friend vocabulary person-inflection candidates — 2026-08-15",
  "",
  "Status: **needs review; not serving**",
  "",
  `The 41 audit hits resolve to ${counts.ready_for_owner_review} literal inflections, ${counts.needs_owner_ruling} owner wording decisions, and ${counts.not_a_person_reference} lexical false positive (\`thank-you\`). The canonical \`body\` values and all self rendering remain untouched.`,
  "",
  "| # | Content key | Current approved body | Proposed `body_they` | Disposition | Owner verdict | Owner edit |",
  "|---:|---|---|---|---|---|---|",
  ...candidates.map((candidate, index) => (
    `| ${index + 1} | \`${escapeCell(candidate.contentKey)}\` | ${escapeCell(candidate.sourceBody)} | ${escapeCell(candidate.proposedBodyThey ?? "[OWNER RULING REQUIRED]")} | ${escapeCell(candidate.disposition)} |  |  |`
  )),
  "",
  "## Blocking judgment calls",
  "",
  ...candidates
    .filter((candidate) => candidate.disposition === "needs_owner_ruling")
    .map((candidate) => `- \`${candidate.contentKey}\`: ${candidate.note}`),
  "",
  "Approval of this review table authorizes only the exact proposed `body_they` cells the owner accepts. It does not change `body`, approval state for unrelated fields, auto-publish, or writer promotion.",
  ""
].join("\n");

const expectedJson = `${JSON.stringify(artifact, null, 2)}\n`;
const write = process.argv.includes("--write");

if (write) {
  fs.writeFileSync(jsonPath, expectedJson);
  fs.writeFileSync(markdownPath, markdown);
  console.log(`Wrote ${path.relative(repoRoot, jsonPath)} and ${path.relative(repoRoot, markdownPath)}.`);
} else {
  for (const [targetPath, expected] of [[jsonPath, expectedJson], [markdownPath, markdown]]) {
    if (!fs.existsSync(targetPath) || fs.readFileSync(targetPath, "utf8") !== expected) {
      throw new Error(`${path.relative(repoRoot, targetPath)} is stale; run this script with --write.`);
    }
  }
  console.log("Friend vocabulary inflection candidates: 41 audit hits, 38 review-ready, 2 owner rulings, 1 lexical false positive; artifacts current.");
}
