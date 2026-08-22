#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ownerRejectedExactTexts } from "../src/astro-writing/ownerEvidenceRejections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const outputPath = path.join(packageRoot, "source-rows/sky-placement-house-templates-v1.json");
const checkOnly = process.argv.includes("--check");
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readJsonl = (filePath) => fs.readFileSync(filePath, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);
const normalize = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[_\s]+/gu, "-");
const normalizePlanet = (value) => normalize(value).replace(/^black-moon-lilith$/u, "lilith");

const servingManifest = readJson(path.join(packageRoot, "authored-inputs/sky-placement-serving-manifest-v1.json"));
const matrixPath = path.join(
  repoRoot,
  "packages/astro-knowledge/voice/tldr-astro/satori-writer/knowledge-matrix-v9/knowledge-matrix-v9-owner-approved-rows.json"
);
const matrix = readJson(matrixPath);
const transitPath = path.join(packageRoot, "source-rows/transit-synastry-rows-v1.json");
const transitRows = readJson(transitPath).authoredCards ?? [];
const fallbackSourcePath = path.join(packageRoot, "source-rows/fallback-source-rows-v3.json");
const fallbackSource = readJson(fallbackSourcePath);
const fallbackTemplatePath = path.join(packageRoot, "templates/fallback-templates-v3.json");
const fallbackTemplates = readJson(fallbackTemplatePath).templates ?? [];
const ownerInventoryPath = path.join(repoRoot, "data/content-inventory/content-inventory-v1.json");
const ownerInventoryRows = (readJson(ownerInventoryPath).records ?? []).filter((row) => (
  row.contentFamily === "house-horoscope-core"
  && row.status === "owner-approved"
  && String(row.approvalVersionDate ?? "").includes("Owner-authored verbatim in Content Studio")
  && typeof row.wording?.body_you === "string"
));
const corrections = [
  ...readJsonl(path.join(repoRoot, "data/writing/owner-corrections.jsonl")),
  ...readJsonl(path.join(repoRoot, "data/writing/owner-feedback-corpus.jsonl"))
];
const rejectedTexts = ownerRejectedExactTexts(corrections);
const eligibleStatuses = new Set(["approved", "approved_reuse", "reviewed"]);

const manifestPlacementKeys = (servingManifest.releases ?? [])
  .filter((release) => release.distribution_state === "serving")
  .flatMap((release) => release.approved_keys ?? [])
  .filter((contentKey) => contentKey.startsWith("fallback-hook/sky-sign-copy/"))
  .map((contentKey) => contentKey.replace("fallback-hook/sky-sign-copy/", ""))
  .flatMap((placementKey) => {
    if (!placementKey.startsWith("nodes/")) return [placementKey];
    const [, axis = ""] = placementKey.split("/");
    const [northSign, southSign] = axis.split("-");
    return northSign && southSign
      ? [`north-node/${northSign}`, `south-node/${southSign}`]
      : [];
  });
const recurringPlacementKeys = fallbackSource.hookRows
  .filter((row) => /^fallback-hook\/sky-placement-hook\/(?:moon|lilith)\/[a-z-]+$/u.test(row.contentKey))
  .map((row) => row.contentKey.replace("fallback-hook/sky-placement-hook/", ""));
const placementKeys = [...new Set([...manifestPlacementKeys, ...recurringPlacementKeys])]
  .sort();

function sourceRank(row) {
  const source = String(row.Source ?? "");
  if (source.startsWith("today/current-sky/")) return 0;
  if (source.startsWith("ml/astrologyblog/")) return 1;
  return 2;
}

function matrixCandidates(planet, sign, house) {
  return [...new Map(matrix.house_activations
    .filter((row) => (
      normalizePlanet(row.Planet) === planet
      && normalize(row["Transit sign"]) === sign
      && Number(row.House) === house
      && normalize(row.Event) === "ingress"
      && row.Governance === "owner-approved"
      && !String(row.Experience ?? "").startsWith("[EXCLUDE FROM FALLBACK]")
      && !rejectedTexts.has(String(row.Experience ?? "").trim())
    ))
    .map((row) => [String(row.Experience).trim(), row])).values()]
    .sort((left, right) => (
      sourceRank(left) - sourceRank(right)
      || String(left.Source ?? "").localeCompare(String(right.Source ?? ""))
      || Number(left.source_row ?? 0) - Number(right.source_row ?? 0)
    ));
}

function transitCandidate(planet, sign, house) {
  const keys = [
    `authored/transit-house-sign/${planet}/${house}/${sign}`,
    `authored/transit-house/${planet}/${house}`,
    `authored/transit-house-intro/${planet}/${house}`
  ];
  for (const key of keys) {
    const candidate = transitRows.find((row) => {
      const body = String(row.body_you ?? row.body ?? "").trim();
      return row.contentKey === key
        && eligibleStatuses.has(String(row.review_status ?? "").trim().toLowerCase())
        && body
        && !rejectedTexts.has(body);
    });
    if (candidate) return candidate;
  }
  return null;
}

function title(value) {
  return String(value ?? "")
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function ordinal(house) {
  if (house === 1) return "1st";
  if (house === 2) return "2nd";
  if (house === 3) return "3rd";
  return `${house}th`;
}

function approvedTemplateCandidate(planet, sign, house) {
  const template = fallbackTemplates.find((row) => row.contentKey === "fallback-template/transit.house");
  const effect = fallbackSource.hookRows.find((row) => (
    row.contentKey === `fallback-hook/transit-effect-house/${planet}`
    && eligibleStatuses.has(String(row.review_status ?? "").trim().toLowerCase())
  ));
  const houseTopic = fallbackSource.vocabularyRows.find((row) => (
    row.contentKey === `fallback-vocab/house-topic/${house}`
    && eligibleStatuses.has(String(row.review_status ?? "").trim().toLowerCase())
  ));
  if (
    !template
    || !effect?.body_you
    || !houseTopic?.body
    || !eligibleStatuses.has(String(template.review_status ?? "approved").trim().toLowerCase())
  ) return null;

  const houseEffect = effect.body_you.replace(/\{\{houseTopic\}\}/gu, houseTopic.body);
  const transitTitle = title(planet);
  const transitRef = `${planet === "moon" ? "the " : ""}${transitTitle} in ${title(sign)}`;
  const timeOpen = planet === "moon" ? "For the next couple of days" : "Currently";
  const body = String(template.body_you ?? template.body ?? "")
    .replace(/\{\{timeOpen\}\}/gu, timeOpen)
    .replace(/\{\{transitRef\}\}/gu, transitRef)
    .replace(/\{\{transitTitle\}\}/gu, transitTitle)
    .replace(/\{\{houseOrdinal\}\}/gu, ordinal(house))
    .replace(/\{\{houseEffect\}\}/gu, houseEffect)
    .trim();
  if (!body || /\{\{/u.test(body) || rejectedTexts.has(body)) return null;
  return {
    body,
    sourceKeys: [template.contentKey, effect.contentKey, houseTopic.contentKey]
  };
}

const selectionCounts = {
  ownerAuthoredInventory: 0,
  matrix: 0,
  legacyApprovedTransit: 0,
  approvedTemplateComposition: 0,
  missing: 0
};
const rows = [];

for (const placementKey of placementKeys) {
  const [planet, sign] = placementKey.split("/");
  for (let house = 1; house <= 12; house += 1) {
    const contentKey = `house-horoscope-core/${planet}/${sign}/house-${house}`;
    const ownerInventoryRow = ownerInventoryRows.find((row) => (
      row.contentKey === contentKey
      && !rejectedTexts.has(String(row.wording.body_you).trim())
    )) ?? null;
    const matrixRows = ownerInventoryRow ? [] : matrixCandidates(planet, sign, house);
    const matrixRow = matrixRows[0] ?? null;
    const transitRow = ownerInventoryRow || matrixRow ? null : transitCandidate(planet, sign, house);
    const templateRow = ownerInventoryRow || matrixRow || transitRow ? null : approvedTemplateCandidate(planet, sign, house);
    const body = String(ownerInventoryRow?.wording.body_you ?? matrixRow?.Experience ?? transitRow?.body_you ?? transitRow?.body ?? templateRow?.body ?? "").trim();

    if (!body) {
      selectionCounts.missing += 1;
      continue;
    }

    const selectedFrom = ownerInventoryRow
      ? "owner-authored-content-studio-inventory"
      : matrixRow
        ? "owner-approved-matrix-ingress"
      : transitRow
        ? "approved-transit-fallback"
        : "approved-template-composition";
    selectionCounts[ownerInventoryRow
      ? "ownerAuthoredInventory"
      : matrixRow
        ? "matrix"
      : transitRow
        ? "legacyApprovedTransit"
        : "approvedTemplateComposition"] += 1;
    rows.push({
      contentKey,
      content_role: "house_horoscope_core",
      grammar_frame: "second_person_block",
      render_policy: "sky-placement-house-template-v1",
      body_you: body,
      review_status: "approved_reuse",
      source_keys: ownerInventoryRow
        ? [`${path.relative(repoRoot, ownerInventoryPath)}#${contentKey}`]
        : matrixRow
          ? [`${path.relative(repoRoot, matrixPath)}#house_activations/source_row-${matrixRow.source_row}`]
        : transitRow
          ? [`${path.relative(repoRoot, transitPath)}#${transitRow.contentKey}`]
          : templateRow.sourceKeys,
      approved_via: ownerInventoryRow
        ? ownerInventoryRow.approvalVersionDate
        : matrixRow
          ? "Verbatim reuse of an owner-approved knowledge-matrix ingress passage; no prose changes."
        : transitRow
          ? "Verbatim reuse of an existing approved transit passage; no prose changes."
          : "Deterministic composition of the approved transit.house template, approved planet-house effect, and approved house topic.",
      template_selection: {
        selected_from: selectedFrom,
        candidate_count: ownerInventoryRow ? 1 : matrixRows.length || 1,
        source: ownerInventoryRow
          ? "data/content-inventory/content-inventory-v1.json"
          : matrixRow?.Source ?? transitRow?.contentKey ?? templateRow.sourceKeys.join(" + "),
        source_row: ownerInventoryRow?.contentHash ?? matrixRow?.source_row ?? null
      }
    });
  }
}

const artifact = {
  schema: "tldrastro-sky-placement-house-templates-v1",
  version: "1.0.0",
  generatedFrom: [
    path.relative(repoRoot, matrixPath),
    path.relative(repoRoot, transitPath),
    path.relative(repoRoot, fallbackSourcePath),
    path.relative(repoRoot, fallbackTemplatePath),
    path.relative(repoRoot, ownerInventoryPath),
    "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-placement-serving-manifest-v1.json",
    "data/writing/owner-corrections.jsonl",
    "data/writing/owner-feedback-corpus.jsonl"
  ],
  selectionPolicy: {
    scope: "Twelve house passages for every governed long-form or recurring Sky placement route.",
    copy: "Selected passages are reused byte-for-byte; this materializer never writes or edits prose.",
    priority: [
      "Owner-authored Content Studio passage recorded in the governed content inventory.",
      "Owner-approved matrix ingress passage from today/current-sky.",
      "Owner-approved matrix ingress passage from the published archive.",
      "Existing approved transit house/sign passage when the matrix has no eligible passage.",
      "Approved transit.house template composition when no complete approved passage exists."
    ],
    rejection: "Any exact text in the owner correction ledger is ineligible."
  },
  placementCount: placementKeys.length,
  rowCount: rows.length,
  selectionCounts,
  rows
};
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Sky placement house templates are stale. Run npm run content:materialize-sky-placement-houses.");
    process.exit(1);
  }
  console.log(`Sky placement house templates are current (${rows.length} rows across ${placementKeys.length} placements).`);
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(JSON.stringify({ placementCount: placementKeys.length, rowCount: rows.length, selectionCounts }, null, 2));
}
