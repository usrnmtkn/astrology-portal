#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manuscriptPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : "/Users/mprez/Downloads/[Shorten] RatM-Part1-no-natal.md";
const governedSourcePath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/lunation-card-assembly-v1/source/solar-eclipse-house-layer-v1.json"
);
const runtimePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-house-layers-v1.json"
);

const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const wordCount = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const manuscript = fs.readFileSync(manuscriptPath, "utf8");
const manuscriptSha256 = sha256(manuscript);

const houseOneMixedSentence = "As the 1st house corresponds to the emergence of self and the human experience, including your mannerisms and perceptions, it's a time to manifest intentions to redefine the self and cultivate a new self-image.";
const houseOneRetainedSentence = "The 1st house corresponds to the emergence of self and the human experience, including your mannerisms and perceptions.";
const declaredOmissions = new Map([
  [2, ["Thus, the new moon's energy in the second house is ideal for intentions related to self-worth and financial stability."]],
  [4, ["The new moon in the fourth house favors intentions relating to belonging and feeling rooted, nurturing family relationships, healing family and ancestral wounds, and other home-related matters (i.e., finding your home and home improvements)."]],
  [5, ["The new moon in the fifth house calls for intentions related to leadership, boldness, and self-expression that taps into creativity."]],
  [6, ["The new moon in the sixth house makes intentions regarding your diet, fitness, health, routines, and daily habits that promote healthy balance especially powerful."]],
  [7, ["At the new moon in the 7th house, set intentions around relationships of all kinds regarding growth, partnership, and notions of intimacy."]],
  [8, ["The new moon in the eighth house is a powerful time for intentions related to occult studies, paying off debt, or collecting money owed to you is significant during the New Moon in the eighth house."]],
  [9, [
    "At this new moon, intentions related to education, spiritual practices, and travel are relevant.",
    "This might mean setting an intention on a trip you would like to take, a language you would like to learn, or even earning favor with a teacher or, in a legal case."
  ]],
  [10, ["Set intentions to help you face fears and achieve authenticity, or to bolster yourself in matters relating to career, authority figures, life path, social media, public recognition, long-term professional growth, career goals, work, and accomplishments."]],
  [11, ["Intentions that seek to impact your community, both globally and locally, and that will help move the collective toward its greater potential are favored."]],
  [12, ["At this new moon, set intentions for the spiritual journey, healing, therapy, meditation, secrets, open and honest acceptance, and working on and replenishing yourself."]]
]);

function cleanMarkdownBody(value) {
  const beforeTable = value.split(/^\|/mu, 1)[0];
  return beforeTable
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" "))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function sourceBodyForHouse(house) {
  const headingPattern = new RegExp(
    `^#### \\*\\*${house}(?:st|nd|rd|th) house new moon intentions[^\\n]*$`,
    "imu"
  );
  const heading = headingPattern.exec(manuscript);
  if (!heading) throw new Error(`Missing New Moon intention heading for house ${house}.`);
  const tail = manuscript.slice(heading.index + heading[0].length);
  const nextHeading = /^#### \*\*\d+(?:st|nd|rd|th) house new moon intentions[^\n]*$/imu.exec(tail);
  const fullMoonHeading = /^### Full Moon Intentions Through the 12 Zodiac Houses$/imu.exec(tail);
  const boundaries = [nextHeading?.index, fullMoonHeading?.index].filter(Number.isFinite);
  if (boundaries.length === 0) throw new Error(`Missing end boundary for house ${house}.`);
  return cleanMarkdownBody(tail.slice(0, Math.min(...boundaries)));
}

const sourceEntries = [];
for (let house = 1; house <= 12; house += 1) {
  const sourceBody = sourceBodyForHouse(house);
  let body = sourceBody;
  const transforms = [{ type: "strip_trailing_markdown_table", applied: true }];
  const omittedSentences = declaredOmissions.get(house) ?? [];
  for (const sentence of omittedSentences) {
    const count = body.split(sentence).length - 1;
    if (count !== 1) throw new Error(`House ${house} declared omission matched ${count} times.`);
    body = body.replace(sentence, "");
  }
  if (omittedSentences.length > 0) {
    transforms.push({
      type: "omit_owner_approved_direct_intention_sentences",
      count: omittedSentences.length,
      sentences: omittedSentences
    });
  }
  if (house === 1) {
    const count = body.split(houseOneMixedSentence).length - 1;
    if (count !== 1) throw new Error(`House 1 mixed sentence matched ${count} times.`);
    body = body.replace(houseOneMixedSentence, houseOneRetainedSentence);
    transforms.push({
      type: "retain_factual_clause_remove_manifestation_instruction",
      before: houseOneMixedSentence,
      after: houseOneRetainedSentence,
      compositionEdit: "Removed sentence-initial 'As' so the retained factual clause is a complete sentence.",
      ownerApprovedAt: "2026-08-24"
    });
  }
  body = body
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.replace(/ {2,}/gu, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  if (/\| -----|set intentions|time to manifest intentions/iu.test(body)) {
    throw new Error(`House ${house} retained a table or direct intention instruction.`);
  }
  sourceEntries.push({
    house,
    sourceSet: "new-moon-intention",
    sourceBodySha256: sha256(sourceBody),
    body,
    bodySha256: sha256(body),
    charCount: body.length,
    wordCount: wordCount(body),
    transforms
  });
}

const governedSource = {
  schema: "solar-eclipse-house-layer/v1",
  status: "owner-approved-reuse",
  ownerApprovalDate: "2026-08-24",
  rationale: "A solar eclipse is an amplified New Moon. Reuse the owner's New Moon house passages after removing only declared direct intention-setting instructions. House 1 retains its factual clause and removes the attached manifestation instruction.",
  source: {
    title: "Ritual and the Moon, Part 1 manuscript",
    importedFrom: path.basename(manuscriptPath),
    sha256: manuscriptSha256
  },
  count: sourceEntries.length,
  entries: sourceEntries
};
const governedSourceText = `${JSON.stringify(governedSource, null, 2)}\n`;

const sourceRecordPath = path.relative(repoRoot, governedSourcePath);
const authoredCards = sourceEntries.map((entry) => ({
  contentKey: `authored/lunation-eclipse-house-layer/solar/house-${entry.house}`,
  content_role: "full_copy",
  body: entry.body,
  review_status: "approved_reuse",
  owner_authored: true,
  lunation_kind: "eclipse-solar",
  house: entry.house,
  source_keys: [sourceRecordPath],
  source_release: "solar-eclipse-house-layer-v1",
  approval: {
    approvalLevel: "exact_owner_approved",
    recordPath: sourceRecordPath,
    payloadSha256: entry.bodySha256,
    approvedAt: "2026-08-24"
  },
  promotion_authorized: true,
  protected_content: {
    policy: "owner-approved-source-reuse-with-declared-omissions",
    body_sha256: entry.bodySha256,
    word_count: entry.wordCount,
    char_count: entry.charCount,
    template_slots: []
  }
}));

fs.writeFileSync(governedSourcePath, governedSourceText);
fs.writeFileSync(runtimePath, `${JSON.stringify({
  schema: "lunation-eclipse-house-layers/v1",
  version: "solar-eclipse-house-layer-v1",
  status: "owner-approved-reuse",
  source_artifact: sourceRecordPath,
  source_sha256: sha256(governedSourceText),
  count: authoredCards.length,
  authoredCards
}, null, 2)}\n`);

console.log(`Wrote ${sourceEntries.length} governed solar eclipse house layers.`);
