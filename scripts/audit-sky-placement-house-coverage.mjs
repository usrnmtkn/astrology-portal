#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ownerRejectedExactTexts } from "../src/astro-writing/ownerEvidenceRejections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/sky-placement-house-coverage-2026-08-22");
const jsonPath = path.join(reviewRoot, "coverage.json");
const markdownPath = path.join(reviewRoot, "README.md");
const checkOnly = process.argv.includes("--check");
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readJsonl = (filePath) => fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/[_\s]+/gu, "-");
const normalizePlanet = (value) => normalized(value).replace(/^black-moon-lilith$/u, "lilith");
const ordinal = (house) => `${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"}`;

const corrections = [
  ...readJsonl(path.join(repoRoot, "data/writing/owner-corrections.jsonl")),
  ...readJsonl(path.join(repoRoot, "data/writing/owner-feedback-corpus.jsonl"))
];
const rejectedTexts = ownerRejectedExactTexts(corrections);
const manifest = readJson(path.join(packageRoot, "authored-inputs/sky-placement-serving-manifest-v1.json"));
const matrix = readJson(path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/satori-writer/knowledge-matrix-v9/knowledge-matrix-v9-owner-approved-rows.json"));
const transitRows = readJson(path.join(packageRoot, "source-rows/transit-synastry-rows-v1.json")).authoredCards;

const exactRows = fs.readdirSync(path.join(packageRoot, "source-rows"))
  .filter((fileName) => /house-cores-v\d+\.json$/u.test(fileName))
  .sort()
  .flatMap((fileName) => (readJson(path.join(packageRoot, "source-rows", fileName)).rows ?? []).map((row) => ({
    ...row,
    sourceFile: `apps/web/src/content/fallbackArchitectureV3/source-rows/${fileName}`
  })));

const placementKeys = [...new Set((manifest.releases ?? [])
  .filter((release) => release.distribution_state === "serving")
  .flatMap((release) => release.approved_keys ?? [])
  .filter((contentKey) => contentKey.startsWith("fallback-hook/sky-sign-copy/"))
  .map((contentKey) => contentKey.replace("fallback-hook/sky-sign-copy/", "")))].sort();

function exactCoreOptions(planet, sign, house) {
  const contentKey = `house-horoscope-core/${planet}/${sign}/house-${house}`;
  return exactRows
    .filter((row) => row.contentKey === contentKey)
    .map((row) => ({
      contentKey,
      text: row.body_you ?? row.body ?? "",
      reviewStatus: row.review_status ?? null,
      readerEligible: ["approved", "approved_reuse", "reviewed"].includes(String(row.review_status ?? "").toLowerCase())
        && !rejectedTexts.has(String(row.body_you ?? row.body ?? "").trim()),
      source: row.sourceFile
    }));
}

function matrixOptions(planet, sign, house, event = "ingress") {
  const candidates = matrix.house_activations.filter((row) => (
    normalizePlanet(row.Planet) === planet
    && normalized(row["Transit sign"]) === sign
    && Number(row.House) === house
    && normalized(row.Event) === event
    && row.Governance === "owner-approved"
    && !String(row.Experience ?? "").startsWith("[EXCLUDE FROM FALLBACK]")
    && !rejectedTexts.has(String(row.Experience ?? "").trim())
  ));
  return [...new Map(candidates.map((row) => [row.Experience, {
    text: row.Experience,
    event: row.Event,
    sourceRow: row.source_row,
    source: row.Source,
    governance: row.Governance
  }])).values()];
}

function transitOptions(planet, sign, house) {
  const keys = [
    `authored/transit-house-sign/${planet}/${house}/${sign}`,
    `authored/transit-house/${planet}/${house}`,
    `authored/transit-house-intro/${planet}/${house}`
  ];
  return transitRows.filter((row) => keys.includes(row.contentKey) && (
    ["approved", "approved_reuse", "reviewed"].includes(String(row.review_status ?? "").toLowerCase())
    && !rejectedTexts.has(String(row.body_you ?? row.body ?? "").trim())
  )).map((row) => ({
    contentKey: row.contentKey,
    text: row.body_you ?? row.body ?? "",
    reviewStatus: row.review_status,
    source: row.source_keys ?? []
  }));
}

const placements = placementKeys.map((placementKey) => {
  const [planet, sign] = placementKey.split("/");
  if (planet === "nodes") {
    return {
      placementKey,
      status: "specialized-paired-axis-required",
      readerReadyHouses: 0,
      candidateHouses: 0,
      ambiguousHouses: 0,
      missingHouses: 12,
      houses: [],
      note: "The paired Nodes article needs axis-aware house passages and cannot use the single-planet ingress resolver."
    };
  }
  const houses = Array.from({ length: 12 }, (_, index) => index + 1).map((house) => {
    const exact = exactCoreOptions(planet, sign, house);
    const matrixIngress = matrixOptions(planet, sign, house);
    const transit = transitOptions(planet, sign, house);
    const readerReady = exact.some((option) => option.readerEligible);
    const status = readerReady
      ? "reader-ready"
      : matrixIngress.length === 1
        ? "one-owner-approved-matrix-candidate"
        : matrixIngress.length > 1
          ? "multiple-owner-approved-matrix-candidates"
          : transit.length
            ? "older-transit-source-candidate"
            : "missing";
    return { house, status, exact, matrixIngress, transit };
  });
  const readerReadyHouses = houses.filter((house) => house.status === "reader-ready").length;
  const candidateHouses = houses.filter((house) => [
    "one-owner-approved-matrix-candidate",
    "older-transit-source-candidate"
  ].includes(house.status)).length;
  const ambiguousHouses = houses.filter((house) => house.status === "multiple-owner-approved-matrix-candidates").length;
  const missingHouses = houses.filter((house) => house.status === "missing").length;
  return {
    placementKey,
    status: readerReadyHouses === 12 ? "complete-reader-ready" : "incomplete-reader-ready",
    readerReadyHouses,
    candidateHouses,
    ambiguousHouses,
    missingHouses,
    houses
  };
});

const counts = {
  servingPlacements: placements.length,
  completeReaderReady: placements.filter((placement) => placement.status === "complete-reader-ready").length,
  incompleteReaderReady: placements.filter((placement) => placement.status === "incomplete-reader-ready").length,
  specializedPairedAxis: placements.filter((placement) => placement.status === "specialized-paired-axis-required").length,
  readerReadyHousePassages: placements.reduce((sum, placement) => sum + placement.readerReadyHouses, 0),
  deterministicCandidateHouses: placements.reduce((sum, placement) => sum + placement.candidateHouses, 0),
  ambiguousCandidateHouses: placements.reduce((sum, placement) => sum + placement.ambiguousHouses, 0),
  missingCandidateHouses: placements.reduce((sum, placement) => sum + placement.missingHouses, 0)
};

const artifact = {
  schema: "tldrastro-sky-placement-house-coverage-v1",
  generatedAt: "2026-08-22",
  servingChanged: false,
  copyChanged: false,
  selectionPolicy: {
    readerReady: "Only an approved exact house-horoscope-core row can serve.",
    candidates: "Matrix and transit rows are inventory for owner review only. The audit never promotes or rewrites them.",
    ambiguity: "More than one distinct owner-approved ingress passage for a house requires an owner choice.",
    rejection: "Exact texts revoked in the owner correction ledger are removed from reader and positive-evidence eligibility."
  },
  counts,
  placements
};

const table = placements.map((placement) => (
  `| ${placement.placementKey} | ${placement.readerReadyHouses}/12 | ${placement.candidateHouses} | ${placement.ambiguousHouses} | ${placement.missingHouses} | ${placement.status} |`
)).join("\n");
const rejectedHouse = placements
  .find((placement) => placement.placementKey === "venus/libra")
  ?.houses.find((house) => house.house === 5);
const markdown = `# Sky placement house-horoscope coverage\n\nStatus: audit and staged review inventory only. No candidate in this report is authorized to serve.\n\n## Result\n\n- Serving placement articles: **${counts.servingPlacements}**\n- Complete 12-house reader sets: **${counts.completeReaderReady}**\n- Incomplete reader sets: **${counts.incompleteReaderReady}**\n- Paired-axis sets needing their own resolver: **${counts.specializedPairedAxis}**\n- Exact reader-ready house passages: **${counts.readerReadyHousePassages}**\n- Houses with one review candidate: **${counts.deterministicCandidateHouses}**\n- Houses with multiple distinct candidates: **${counts.ambiguousCandidateHouses}**\n- Houses with no candidate: **${counts.missingCandidateHouses}**\n\nThe app previously had exact reader rows only for Sun in Leo and Venus in Libra, while its resolver hard-coded those two pairs. The resolver is now content-driven, but new passages remain dark until an exact house-core set is selected and approved.\n\nThe rejected Venus in Libra ${ordinal(5)}-house passage is **${rejectedHouse?.status ?? "not found"}** and is excluded from reader serving and positive writer evidence.\n\n## Placement inventory\n\n| Placement | Reader-ready | Single candidates | Ambiguous | Missing | State |\n|---|---:|---:|---:|---:|---|\n${table}\n\n## Rules\n\n- An approved exact \`house-horoscope-core/{planet}/{sign}/house-{n}\` row is reader-ready.\n- Knowledge-matrix and older transit rows remain source candidates. They are not interchangeable templates.\n- A complete set requires twelve exact reader-ready rows.\n- The paired Nodes article requires an axis-aware set.\n- Exact candidate bodies and provenance are preserved in \`coverage.json\` for owner review.\n`;

if (checkOnly) {
  const currentJson = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf8") : "";
  const currentMarkdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf8") : "";
  if (currentJson !== `${JSON.stringify(artifact, null, 2)}\n` || currentMarkdown !== markdown) {
    console.error("Sky placement house coverage is stale. Run npm run audit:sky-placement-house-coverage.");
    process.exit(1);
  }
  console.log(`Sky placement house coverage is current (${counts.completeReaderReady}/${counts.servingPlacements} complete sets).`);
} else {
  fs.mkdirSync(reviewRoot, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(markdownPath, markdown);
  console.log(JSON.stringify(counts, null, 2));
}
