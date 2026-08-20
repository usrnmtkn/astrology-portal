#!/usr/bin/env node
/**
 * Step-1 inventory for Nodes, Angles, Chiron, and Lilith promotion.
 *
 * This script classifies only. It never copies an external source, changes an
 * approval, changes the knowledge index, or promotes content. Third-party
 * sources are represented by filename/title metadata only; their bytes are
 * never opened.
 *
 * Usage:
 *   node scripts/build-four-body-promotion-inventory.mjs --write
 *   node scripts/build-four-body-promotion-inventory.mjs --check
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { derivableTargets } = require("../src/astro-writing/axisDerivation.cjs");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesRoot = process.env.FOUR_BODY_RESOURCES_DIR
  ? path.resolve(process.env.FOUR_BODY_RESOURCES_DIR)
  : path.join(os.homedir(), "Downloads", "Resources");
const mapPath = path.join(repoRoot, "config/four-body-promotion-map.json");
const reportPath = path.join(repoRoot, "docs/four-body-promotion-inventory.md");
const indexPath = path.join(repoRoot, "packages/astro-knowledge/generated/knowledge-index.json");
const v9Path = path.join(repoRoot, "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json");
const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const check = args.has("--check");

if (write && check) throw new Error("Use --write or --check, not both.");
if (!fs.existsSync(resourcesRoot)) {
  throw new Error(`Fail closed: external inventory root is unavailable: ${resourcesRoot}`);
}

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const BODY = Object.freeze({
  "north-node": "north_node", "north node": "north_node", north_node: "north_node",
  "south-node": "south_node", "south node": "south_node", south_node: "south_node",
  "black-moon-lilith": "lilith", "black moon lilith": "lilith", lilith: "lilith",
  asc: "ascendant", dsc: "descendant", mc: "midheaven", ic: "imum_coeli"
});
const normalizeBody = (value) => BODY[String(value ?? "").toLowerCase()] ?? String(value ?? "").toLowerCase().replace(/-/gu, "_");
const repoRelative = (file) => path.relative(repoRoot, file).split(path.sep).join("/");
const externalPath = (file) => `external://Resources/${path.basename(file)}`;
const words = (text) => (String(text ?? "").match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const safeWordCount = (file, mayRead) => mayRead && /\.(?:md|json|txt)$/iu.test(file) ? words(fs.readFileSync(file, "utf8")) : 0;
const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort();
const isSubjectId = (id) => /(?:north_node|south_node|ascendant|descendant|midheaven|imum_coeli|chiron|lilith)/u.test(id);

function vendoredSourceFor(name) {
  if (name === "TLDR-Node-Chiron-Lilith-House-Transits-FINAL.md") {
    return path.join(repoRoot, "packages/astro-knowledge/sources/authored/four-body", name);
  }
  if (/^TLDR-Sky-(?:Node-Axis|Chiron|Lilith)-Exact-Aspects-V1\.md$/u.test(name)) {
    return path.join(repoRoot, "packages/astro-knowledge/sources/authored/four-body/sky-aspects", name);
  }
  if ([
    "TLDR-Article-Edition-Chiron-Aries-REVIEW.md",
    "TLDR-Article-Nodes-Aquarius-Leo-REVIEW.md",
    "TLDR-Article-Template-Chiron-Ingress-REVIEW.md",
    "TLDR-Article-Template-Nodes-REVIEW.md"
  ].includes(name)) {
    return path.join(
      repoRoot,
      "packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/adjacent-formats/four-body-promotion",
      name
    );
  }
  return null;
}

function subjectsForName(name) {
  const lower = name.toLowerCase();
  const subjects = [];
  if (/node/u.test(lower)) subjects.push("nodes");
  if (/(?:ascendant|descendant|midheaven|imum|\bangle)/u.test(lower)) subjects.push("angles");
  if (/chiron/u.test(lower)) subjects.push("chiron");
  if (/(?:lilith|black[ -]?moon)/u.test(lower)) subjects.push("lilith");
  return sortedUnique(subjects);
}

const SUBJECT_ORDER = ["nodes", "angles", "chiron", "lilith"];
const primarySubject = (subjects) => SUBJECT_ORDER.find((subject) => subjects.includes(subject)) ?? null;

function subjectsForCanonicalIds(ids) {
  const joined = ids.join("\n");
  const subjects = [];
  if (/(?:north_node|south_node)/u.test(joined)) subjects.push("nodes");
  if (/(?:ascendant|descendant|midheaven|imum_coeli)/u.test(joined)) subjects.push("angles");
  if (/chiron/u.test(joined)) subjects.push("chiron");
  if (/lilith/u.test(joined)) subjects.push("lilith");
  return subjects;
}

function levelForName(name) {
  const lower = name.toLowerCase();
  if (/(?:exact-aspects|aspect-|pair.?sources|natal-aspect)/u.test(lower)) return "aspect";
  if (/(?:house-transit|transit-house|in_[0-9]+_house)/u.test(lower)) return "house";
  if (/(?:placement|sign|lilith-[0-9]+sign)/u.test(lower)) return "sign";
  if (/template/u.test(lower)) return "template";
  return "essay";
}

function record(input) {
  const subjects = sortedUnique(input.subjects ?? [input.subject]);
  const subject = input.subject ?? primarySubject(subjects);
  if (!subject) throw new Error(`No subject classification for ${input.assetPath}`);
  return {
    assetPath: input.assetPath,
    subject,
    ...(subjects.length > 1 ? { subjects } : {}),
    inRepo: input.inRepo,
    blockedBy: input.blockedBy,
    currentStore: input.currentStore ?? null,
    destinationStore: input.destinationStore ?? null,
    canonicalIds: sortedUnique(input.canonicalIds ?? []),
    proposedAuthorityClass: input.proposedAuthorityClass,
    proposedSurfacePermission: sortedUnique(input.proposedSurfacePermission ?? []),
    approvalMarker: input.approvalMarker ?? "none",
    evidenceForClass: input.evidenceForClass,
    wordCount: input.wordCount ?? 0,
    level: input.level
  };
}

function parseSkyAspectIds(file) {
  const text = fs.readFileSync(file, "utf8");
  const ids = [];
  for (const match of text.matchAll(/^Key:\s*`sky\.([a-z-]+)\.([a-z-]+)\.([a-z-]+)`/gmu)) {
    const [, first, aspect, second] = match;
    const [a, b] = [normalizeBody(first), normalizeBody(second)].sort();
    ids.push(`sky-aspect/${a}/${b}/${aspect}`);
  }
  return sortedUnique(ids);
}

function parseHouseIds(file) {
  const jsonFile = file.endsWith(".json") ? file : path.join(resourcesRoot, "node-chiron-lilith-house-transits-v1.json");
  if (!fs.existsSync(jsonFile)) return [];
  const rows = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
  return sortedUnique(rows.map((row) => `transit-house/${normalizeBody(row.planet)}/${row.house}`));
}

function parsePairIds(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data.pairs)) return [];
  // Step 2 found that all 32 payloads already exist in astro-knowledge/data
  // and are indexed by the current generic document identity. Record the IDs
  // the catalog actually holds rather than inventing a second pair namespace.
  return sortedUnique(data.pairs.map((pair) => `doc/${String(pair.id).toLowerCase().replace(/[^a-z0-9]+/gu, "_")}`));
}

function parseLilithV5Ids(file) {
  const text = fs.readFileSync(file, "utf8").toLowerCase();
  return SIGNS.filter((sign) => new RegExp(`lilith.{0,20}${sign}|${sign}.{0,20}lilith`, "u").test(text))
    .map((sign) => `placement-sign/lilith/${sign}`);
}

function v9CanonicalIds() {
  const data = JSON.parse(fs.readFileSync(v9Path, "utf8"));
  const targetBodies = new Set(["north_node", "south_node", "chiron", "lilith", "ascendant", "descendant", "midheaven", "imum_coeli"]);
  const ids = [];
  const matchedRows = [];
  const sourceRows = [];
  const skippedRows = [];
  for (const [collection, rows] of [["transit_meanings", data.transit_meanings], ["house_activations", data.house_activations]]) {
    rows.forEach((row) => {
      const body = normalizeBody(row.Planet);
      const ambiguousNodes = /^(?:lunar )?nodes$/u.test(String(row.Planet ?? "").trim().toLowerCase());
      if (!targetBodies.has(body) && !ambiguousNodes) return;
      sourceRows.push({ collection, sourceRow: row.source_row, key: row.Key, body: ambiguousNodes ? "nodes" : body });
      if (ambiguousNodes) {
        skippedRows.push({ collection, sourceRow: row.source_row, key: row.Key, reason: "ambiguous Nodes subject does not identify north_node or south_node" });
        return;
      }
      if (collection === "house_activations") {
        const substantive = String(row.Substantive ?? "").toLowerCase() === "yes";
        const excluded = String(row.Experience ?? "").includes("[EXCLUDE FROM FALLBACK]");
        const house = Number(row.House);
        if (!substantive || excluded || !(house >= 1 && house <= 12)) {
          skippedRows.push({ collection, sourceRow: row.source_row, key: row.Key, reason: "non-substantive, excluded, or missing reusable house" });
          return;
        }
      }
      matchedRows.push({ collection, sourceRow: row.source_row, key: row.Key, body });
      const sign = String(row.Sign ?? row["Transit sign"] ?? "").toLowerCase();
      const house = Number(row.House);
      if (collection === "house_activations" && house >= 1 && house <= 12) ids.push(`house-activation/${body}/${house}`);
      else if (SIGNS.includes(sign)) ids.push(`placement-sign/${body}/${sign}`);
      else if (house >= 1 && house <= 12) ids.push(`transit-house/${body}/${house}`);
      else ids.push(`body/${body}`);
    });
  }
  return { ids: sortedUnique(ids), sourceRows, matchedRows, skippedRows };
}

const inventory = [];
const externalFiles = fs.readdirSync(resourcesRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => path.join(resourcesRoot, entry.name))
  .filter((file) => {
    const name = path.basename(file);
    return subjectsForName(name).length > 0 || /V9-(?:OWNER-APPROVED|PENDING-OWNER-APPROVAL)/iu.test(name);
  })
  .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

const v9 = v9CanonicalIds();
for (const file of externalFiles) {
  const name = path.basename(file);
  const subjects = subjectsForName(name);
  if (!subjects.length && /V9-/iu.test(name)) subjects.push("nodes", "chiron", "lilith");
  const ownerAsset = /^TLDR-/u.test(name) || ["node-chiron-lilith-house-transits-v1.json"].includes(name);
  const exactAspect = /^TLDR-Sky-(?:Node-Axis|Chiron|Lilith)-Exact-Aspects-V1\.md$/u.test(name);
  const houseFinal = /^TLDR-Node-Chiron-Lilith-House-Transits-FINAL\.md$/u.test(name);
  const houseMirror = name === "node-chiron-lilith-house-transits-v1.json";
  const pairImport = name === "TLDR-PairSources-Import-chiron-lilith-nodes.json";
  const approvedV9 = /V9-OWNER-APPROVED-GOVERNANCE-LABELED\.xlsx$/u.test(name);
  const pendingV9 = /V9-PENDING-OWNER-APPROVAL\.xlsx$/u.test(name);
  const article = /^TLDR-Article-/u.test(name);
  const lilithV5 = name === "TLDR-Lilith-12Sign-Owner-V5.md";
  let canonicalIds = [];
  if (exactAspect) canonicalIds = parseSkyAspectIds(file);
  else if (houseFinal || houseMirror) canonicalIds = parseHouseIds(file);
  else if (pairImport) canonicalIds = parsePairIds(file);
  else if (approvedV9 || pendingV9) canonicalIds = v9.ids;
  else if (lilithV5) canonicalIds = parseLilithV5Ids(file);
  else if (name === "TLDR-Article-Edition-Chiron-Aries-REVIEW.md") canonicalIds = ["placement-sign/chiron/aries"];
  else if (name === "TLDR-Article-Nodes-Aquarius-Leo-REVIEW.md") canonicalIds = ["placement-sign/north_node/aquarius", "placement-sign/south_node/leo"];

  let authority = "needs-owner-decision";
  let permission = [];
  let approvalMarker = /REVIEW/iu.test(name) ? "REVIEWED" : /DRAFT/iu.test(name) ? "DRAFT" : "none";
  let evidence = "No provenance field proves an authority class; status-like filename text is retained only as an audit marker.";
  let destination = canonicalIds.length ? "packages/astro-knowledge/data" : null;
  if (!ownerAsset) {
    authority = "factual-evidence";
    permission = ["doctrine-only"];
    destination = "external-reference-title-only";
    evidence = "Third-party title metadata only. File bytes were not opened; prose must never enter the repo, a prompt, or this inventory.";
  } else if (houseFinal || houseMirror) {
    authority = "owner-approved-prose";
    permission = ["doctrine-only"];
    approvalMarker = "exact_owner_approved";
    destination = "astro-knowledge/data";
    evidence = houseFinal
      ? "Document header: AUTHOR-FINAL, owner polish, imports verbatim; source approval does not independently approve any later copy."
      : "Machine mirror of the AUTHOR-FINAL markdown; markdown remains the proposed source of truth.";
  } else if (approvedV9) {
    authority = "owner-approved-prose";
    permission = ["doctrine-only"];
    approvalMarker = "exact_owner_approved";
    destination = "matrix-v9";
    evidence = `Workbook name plus governed in-repo extract; ${v9.matchedRows.length} rows match the four bodies by Planet field. Source approval does not transfer to generated copy.`;
  } else if (pendingV9) {
    approvalMarker = "DRAFT";
    destination = "matrix-v9";
  } else if (article) {
    authority = "voice-exemplar";
    permission = ["doctrine-only"];
    destination = "voice/owner-corpus/adjacent-formats";
    evidence = "Promotion plan identifies TLDR Article editions/templates as the owner voice corpus; REVIEW remains an audit marker, not the authority source.";
  } else if (lilithV5) {
    authority = "owner-approved-prose";
    permission = ["sky"];
    approvalMarker = "exact_owner_approved";
    destination = "astro-knowledge/data/points/signs";
    evidence = "Owner V5 artifact and the decision record identify this as the owner-final sign rewrite chain.";
  } else if (exactAspect) {
    destination = "astro-knowledge/data/points/aspects";
    permission = ["doctrine-only"];
    evidence = "The file contains traceable pair-source notes but labels itself needs_review; provenance does not prove exact owner wording approval.";
  } else if (pairImport) {
    destination = "astro-knowledge/data/pairs";
    permission = ["doctrine-only"];
    evidence = "Import payload cites TLDR editorial and third-party doctrine, but the catalog has no canonical pair-document identity; owner decision is required before classification.";
  }

  const vendored = vendoredSourceFor(name);
  if (vendored && fs.existsSync(vendored) && !fs.readFileSync(vendored).equals(fs.readFileSync(file))) {
    throw new Error(`PROMOTED_SOURCE_DRIFT: ${name} differs from its owner-held source.`);
  }
  const inRepo = Boolean(vendored && fs.existsSync(vendored));
  inventory.push(record({
    assetPath: inRepo ? repoRelative(vendored) : externalPath(file), subjects, inRepo,
    blockedBy: inRepo ? "labelling" : "outside-repo",
    currentStore: inRepo ? (article ? "voice-exemplar" : "authored-source") : null,
    destinationStore: destination, canonicalIds,
    proposedAuthorityClass: authority, proposedSurfacePermission: permission,
    approvalMarker, evidenceForClass: evidence,
    wordCount: safeWordCount(file, ownerAsset), level: levelForName(name)
  }));
}

// Exact-owner-approved Lilith lived records are not catalog sources today.
const lilithRecordsDir = path.join(repoRoot, "packages/astro-knowledge/review/lilith-78-lived-v2/records");
const lilithRecordFiles = fs.readdirSync(lilithRecordsDir).filter((name) => name.endsWith(".json")).sort();
if (lilithRecordFiles.length !== 78) throw new Error(`Expected 78 exact Lilith records, found ${lilithRecordFiles.length}.`);
for (const name of lilithRecordFiles) {
  const file = path.join(lilithRecordsDir, name);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const [rawLilith, aspect, other] = String(data.workbookKey ?? "").split("|");
  const [a, b] = [normalizeBody(rawLilith), normalizeBody(other)].sort();
  const canonicalId = a && b && aspect ? `natal-aspect/${a}/${b}/${aspect}` : null;
  inventory.push(record({
    assetPath: repoRelative(file), subject: "lilith", inRepo: true, blockedBy: "no-canonical-id",
    currentStore: "review/lilith-78-lived-v2", destinationStore: "astro-knowledge/data/points/aspects",
    canonicalIds: canonicalId ? [canonicalId] : [], proposedAuthorityClass: "owner-approved-prose",
    proposedSurfacePermission: ["you-natal"], approvalMarker: data.approvalLevel,
    evidenceForClass: `approvalLevel=${data.approvalLevel}; authorship=${data.authorship}; source workbook row ${data.sourceWorkbook?.row ?? "unknown"}.`,
    wordCount: words(JSON.stringify(data.payload ?? {})), level: "aspect"
  }));
}

// Only the 47 four-body files are in scope, but verify the directive's full
// 162-file audit directory before classifying the subset.
const draftsDir = path.join(repoRoot, "packages/astro-knowledge/out/sky-placement-drafts");
const allDraftFiles = fs.readdirSync(draftsDir).filter((name) => name.endsWith(".json")).sort();
if (allDraftFiles.length !== 162) throw new Error(`Expected 162 machine-draft JSON assets, found ${allDraftFiles.length}.`);
const subjectDrafts = allDraftFiles.filter((name) => /^(?:chiron|lilith|north-node|south-node)-/u.test(name));
for (const name of subjectDrafts) {
  const file = path.join(draftsDir, name);
  const match = /^(chiron|lilith|north-node|south-node)-([a-z]+)\.json$/u.exec(name);
  if (!match) continue;
  const [, body, sign] = match;
  inventory.push(record({
    assetPath: repoRelative(file), subject: /node/u.test(body) ? "nodes" : body,
    inRepo: true, blockedBy: "no-canonical-id", currentStore: "out/sky-placement-drafts",
    destinationStore: "audit-only", canonicalIds: [`placement-sign/${normalizeBody(body)}/${sign}`],
    proposedAuthorityClass: "machine-proposal", proposedSurfacePermission: [], approvalMarker: "none",
    evidenceForClass: "Directive classifies all 162 files in this directory as machine proposals; only the 47 four-body files are inventoried here. Never prompt context.",
    wordCount: safeWordCount(file, true), level: "sign"
  }));
}

// One in-repo review source has no canonical pair-document identity.
const pairReview = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.md");
if (fs.existsSync(pairReview)) {
  inventory.push(record({
    assetPath: repoRelative(pairReview), subjects: ["nodes", "chiron", "lilith"], inRepo: true,
    blockedBy: "no-canonical-id", currentStore: "review", destinationStore: "astro-knowledge/data/pairs",
    canonicalIds: [], proposedAuthorityClass: "needs-owner-decision", proposedSurfacePermission: [],
    approvalMarker: "REVIEWED", evidenceForClass: "REVIEW in the filename is status only; no provenance field proves owner approval, and no pair-document canonical namespace exists.",
    wordCount: safeWordCount(pairReview, true), level: "aspect"
  }));
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const catalogFourBodyObjects = index.objects.filter((object) => isSubjectId(object.id)).length;

// Assets that are already indexed but still unavailable because their
// provenance-derived class is unverified/machine-proposal. The status string
// is retained as an audit marker only and never upgrades the class.
const labelled = new Map();
for (const object of index.objects) {
  if (!isSubjectId(object.id)) continue;
  for (const source of object.sources ?? []) {
    if (!["unverified", "machine-proposal"].includes(source.authorityClass)) continue;
    // These are deterministic JSON mirrors of three already-inventoried
    // Markdown sources. Counting each mirror as a separate source asset makes
    // the inventory grow by 198 whenever the generator succeeds and leaves
    // the actual Markdown falsely marked outside the repo.
    if (source.path.startsWith("packages/astro-knowledge/data/points/aspects/sky/four-body-unverified/")) continue;
    if (!labelled.has(source.path)) labelled.set(source.path, {
      ids: new Set(), classes: new Set(), permissions: new Set(), statuses: new Set(), store: source.store
    });
    const entry = labelled.get(source.path);
    entry.ids.add(object.id);
    entry.classes.add(source.authorityClass);
    for (const permission of source.surfacePermission ?? []) entry.permissions.add(permission);
    if (source.status) entry.statuses.add(source.status);
  }
}
for (const [assetPath, entry] of [...labelled.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const canonicalIds = sortedUnique([...entry.ids]);
  const subjects = subjectsForCanonicalIds(canonicalIds);
  const classes = sortedUnique([...entry.classes]);
  const statuses = sortedUnique([...entry.statuses]);
  const absolute = path.join(repoRoot, assetPath);
  const machineOnly = classes.length === 1 && classes[0] === "machine-proposal";
  const approvalMarker = statuses.some((status) => /reviewed/iu.test(status)) ? "REVIEWED"
    : statuses.some((status) => /draft/iu.test(status)) ? "DRAFT" : "none";
  inventory.push(record({
    assetPath, subjects, inRepo: true, blockedBy: "labelling", currentStore: entry.store,
    destinationStore: entry.store, canonicalIds,
    proposedAuthorityClass: machineOnly ? "machine-proposal" : "needs-owner-decision",
    proposedSurfacePermission: [], approvalMarker,
    evidenceForClass: `Knowledge index derives authorityClass=${classes.join("+")} from provenance. Existing surface labels (${sortedUnique([...entry.permissions]).join(", ") || "none"}) do not override that class; status markers (${statuses.join(", ") || "none"}) are non-authoritative.`,
    wordCount: fs.existsSync(absolute) ? safeWordCount(absolute, true) : 0,
    level: levelForName(assetPath)
  }));
}

const derived = derivableTargets(index.objects.map((object) => object.id));
if (derived.length !== 210) throw new Error(`Expected 210 derivable identities, found ${derived.length}.`);
for (const item of derived) {
  const derivedSubjects = /(?:descendant|imum_coeli)/u.test(item.derivedId)
    ? ["angles"]
    : subjectsForCanonicalIds([item.derivedId]);
  inventory.push(record({
    assetPath: `derived://${item.derivedId}`, subjects: derivedSubjects,
    inRepo: true, blockedBy: "derivable", currentStore: "knowledge-index+axisDerivation",
    destinationStore: "runtime-axis-derivation", canonicalIds: [item.derivedId],
    proposedAuthorityClass: "factual-evidence", proposedSurfacePermission: ["mechanism-reference"],
    approvalMarker: "none", evidenceForClass: `Identity derives exactly from ${item.from}; framingAllowed remains false and prose does not inherit.`,
    wordCount: 0, level: item.derivedId.includes("-aspect/") ? "aspect" : "sign"
  }));
}

for (const sign of SIGNS) {
  inventory.push(record({
    assetPath: `authoring-gap://placement-sign/midheaven/${sign}`, subject: "angles", inRepo: false,
    blockedBy: "no-canonical-id", currentStore: null, destinationStore: "astro-knowledge/data/points/signs",
    canonicalIds: [`placement-sign/midheaven/${sign}`], proposedAuthorityClass: "needs-owner-decision",
    proposedSurfacePermission: [], approvalMarker: "none",
    evidenceForClass: "No source asset exists and latitude prevents derivation from the Ascendant; this is an authoring gap, not a promotion candidate.",
    wordCount: 0, level: "sign"
  }));
}

inventory.sort((a, b) => a.assetPath.localeCompare(b.assetPath));
const duplicatePaths = inventory.filter((item, indexInArray) => indexInArray > 0 && item.assetPath === inventory[indexInArray - 1].assetPath);
if (duplicatePaths.length) throw new Error(`One-record-per-asset invariant failed: ${duplicatePaths[0].assetPath}`);

const claims = new Map();
for (const asset of inventory) for (const id of asset.canonicalIds) {
  if (!claims.has(id)) claims.set(id, []);
  claims.get(id).push(asset.assetPath);
}
const canonicalConflicts = [...claims.entries()]
  .filter(([, assets]) => new Set(assets).size > 1)
  .map(([canonicalId, assets]) => ({ canonicalId, assetPaths: sortedUnique(assets) }))
  .sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));

const counts = (key, memberships = false) => {
  const result = {};
  for (const item of inventory) {
    const values = memberships ? item.subjects ?? [item.subject] : [item[key]];
    for (const value of values) result[value] = (result[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
};

const unclassified = inventory.filter((item) => item.proposedAuthorityClass === "needs-owner-decision" || (!item.destinationStore && item.canonicalIds.length === 0));
const map = {
  schemaVersion: 1,
  status: "inventory-only-no-promotion",
  sourceRoots: ["repository", "external://Resources (owner workstation; third-party titles only)"],
  invariants: {
    catalogFourBodyObjects,
    exactOwnerApprovedLilithRecords: lilithRecordFiles.length,
    allSkyPlacementMachineDrafts: allDraftFiles.length,
    inScopeFourBodyMachineDrafts: subjectDrafts.length,
    derivableObjects: derived.length,
    missingMidheavenSignObjects: SIGNS.length,
    v9FourBodyRowsPresent: v9.sourceRows.length,
    v9FourBodyRowsCanonicalized: v9.matchedRows.length,
    v9FourBodyRowsSkipped: v9.skippedRows.length,
    v9EarlierPlanClaimedRows: 203
  },
  totals: {
    assets: inventory.length,
    bySubjectMembership: counts("subject", true),
    byBlockingCause: counts("blockedBy"),
    byProposedAuthorityClass: counts("proposedAuthorityClass"),
    needsOwnerDecision: unclassified.length,
    canonicalConflicts: canonicalConflicts.length
  },
  canonicalConflicts,
  assets: inventory
};

const json = `${JSON.stringify(map, null, 2)}\n`;
const table = (object) => Object.entries(object).map(([key, value]) => `| ${key} | ${value} |`).join("\n");
const report = `# Four-body promotion inventory\n\n` +
  `Status: inventory only. No source was copied, no authority or approval changed, no asset was promoted, and no provider was called.\n\n` +
  `Generated by \`scripts/build-four-body-promotion-inventory.mjs\`. The machine source is \`config/four-body-promotion-map.json\`.\n\n` +
  `## Scope\n\n` +
  `The map contains **${inventory.length} assets**. A physical file is one record. Shared files carry an additional \`subjects\` array; subject totals below count membership, so they can exceed the physical-asset total. Synthetic \`derived://\` and \`authoring-gap://\` records make the directive's 210 derivable identities and 12 genuine gaps explicit without pretending that prose assets exist.\n\n` +
  `The full machine-draft directory contains **${allDraftFiles.length} JSON files**; **${subjectDrafts.length}** concern these four subjects and are inventoried. Every one is \`machine-proposal\`, audit-only, with no surface permission.\n\n` +
  `## Totals by subject membership\n\n| Subject | Assets |\n|---|---:|\n${table(map.totals.bySubjectMembership)}\n\n` +
  `## Totals by blocking cause\n\n| Cause | Assets |\n|---|---:|\n${table(map.totals.byBlockingCause)}\n\n` +
  `\`derivable\` is included because the directive expressly requires it, even though the example \`blockedBy\` enum omitted it. These entries are geometry references only; no framing or prose is inherited.\n\n` +
  `## Totals by proposed authority class\n\n| Authority class | Assets |\n|---|---:|\n${table(map.totals.byProposedAuthorityClass)}\n\n` +
  `\`needs-owner-decision\` is fail-closed and is included because the directive requires ambiguous provenance to use that value, even though the example authority enum omitted it.\n\n` +
  `## Unclassified or owner-decision assets (${unclassified.length})\n\n` +
  (unclassified.length ? unclassified.map((item) => `- \`${item.assetPath}\`: ${item.evidenceForClass}`).join("\n") : "None.") + `\n\n` +
  `## Canonical-ID conflicts (${canonicalConflicts.length})\n\n` +
  (canonicalConflicts.length ? canonicalConflicts.map((conflict) => `- \`${conflict.canonicalId}\`: ${conflict.assetPaths.map((asset) => `\`${asset}\``).join(", ")}`).join("\n") : "None.") + `\n\n` +
  `Conflicts are inventory findings, not automatic errors. V1/V2/FINAL chains and generated mirrors can legitimately claim the same identity, but step 2 must choose one source of truth and preserve the others as lineage rather than merging prose.\n\n` +
  `## Findings that correct the plan\n\n` +
  `- The directive's data model omitted two states it simultaneously requires: \`blockedBy: derivable\` and \`proposedAuthorityClass: needs-owner-decision\`. The map includes both so it can fail closed.\n` +
  `- A single physical asset can cover several subjects. The requested singular \`subject\` is retained as a deterministic primary value and \`subjects\` records the complete membership without duplicating the asset.\n` +
  `- The earlier inventory incorrectly reported 178 as the V9 source total. The source contains **${v9.sourceRows.length}** four-body rows (${v9.sourceRows.filter((row) => row.collection === "transit_meanings").length} TransitMeanings, ${v9.sourceRows.filter((row) => row.collection === "house_activations").length} HouseActivations). **${v9.matchedRows.length}** canonicalize and **${v9.skippedRows.length}** are deliberate fail-closed exclusions, principally ambiguous \`Nodes\` rows. The previous 178 count described indexable rows, not rows present.\n` +
  `- The earlier map hard-coded 2,929 four-body catalog objects instead of deriving the value. The current explicit subject-token count is **${catalogFourBodyObjects}** and now regenerates from the corrected index.\n` +
  `- The 162-file machine-draft fact describes the whole directory; only ${subjectDrafts.length} files concern Nodes, Chiron, or Lilith. There are no angle files in that directory.\n` +
  `- The exact-aspect assets need a new \`sky-aspect/*\` canonical namespace in step 2. Treating them as natal or transit-to-natal aspects would silently change their meaning.\n\n` +
  `## Third-party boundary\n\nThird-party assets are represented by stable title-only paths. Their files were not opened, their word count is zero, and their prose was not quoted or recorded. They remain external and have doctrine-only permission; that classification does not authorize copying or prompt inclusion.\n`;

function compare(file, expected) {
  return fs.existsSync(file) && fs.readFileSync(file, "utf8") === expected;
}

if (write) {
  fs.mkdirSync(path.dirname(mapPath), { recursive: true });
  fs.writeFileSync(mapPath, json);
  fs.writeFileSync(reportPath, report);
  console.log(`Wrote ${repoRelative(mapPath)} and ${repoRelative(reportPath)} (${inventory.length} assets).`);
} else if (check) {
  const mapMatches = compare(mapPath, json);
  const reportMatches = compare(reportPath, report);
  if (!mapMatches || !reportMatches) {
    console.error(`STALE: promotion inventory drift (map=${mapMatches}, report=${reportMatches}). Run with --write.`);
    process.exit(1);
  }
  console.log(`Four-body promotion inventory is current: ${inventory.length} assets; outputs byte-identical.`);
} else {
  console.log(`${inventory.length} assets modelled; ${unclassified.length} need owner decision; ${canonicalConflicts.length} canonical conflicts.`);
  console.log("Dry run. Use --write to regenerate or --check to fail on drift.");
}
