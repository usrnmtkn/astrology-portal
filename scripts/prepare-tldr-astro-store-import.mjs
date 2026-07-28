#!/usr/bin/env node
import crypto from "node:crypto";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultInput = `${os.tmpdir()}/tldrastro-handoff-v17/tldr-astro-records.json`;
const defaultOutDir = path.join(repoRoot, "scripts", "generated");
const defaultPhrasebankDir = path.join(repoRoot, "tldr-astro-phrasebank");

export const allowedIncomingStatuses = new Set([
  "CONFIRMED",
  "APPROVED",
  "DRAFT",
  "REFERENCE_ONLY",
  "RAW_QUARANTINE",
  "MANUAL_ONLY",
  "DEPRECATED",
  "REVIEWED",
  "SESSION_APPROVED_DRAFT"
]);

export const allowedActions = new Set([
  "MATCH_EXISTING",
  "NEW_CANONICAL_KEY",
  "REFERENCE_ONLY",
  "CONFLICT",
  "UNMAPPED",
  "SKIP"
]);

const aspectAliases = new Map([
  ["conjunct", "conjunction"],
  ["conjunction", "conjunction"],
  ["sextile", "sextile"],
  ["square", "square"],
  ["trine", "trine"],
  ["opposite", "opposition"],
  ["opposition", "opposition"],
  ["quincunx", "quincunx"]
]);

const runtimeFallbackHooks = new Set([
  "fallback-hook/sky.seasonal-current",
  "fallback-hook/sky.lunar-cycle",
  "fallback-hook/sky.planetary-placement",
  "fallback-hook/sky.ingress",
  "fallback-hook/sky.ingress.sun",
  "fallback-hook/sky.ingress.moon",
  "fallback-hook/sky.ingress.mercury",
  "fallback-hook/sky.ingress.venus",
  "fallback-hook/sky.ingress.mars",
  "fallback-hook/sky.ingress.jupiter",
  "fallback-hook/sky.ingress.saturn",
  "fallback-hook/sky.ingress.uranus",
  "fallback-hook/sky.ingress.neptune",
  "fallback-hook/sky.ingress.pluto",
  "fallback-hook/sky.aspect-detail",
  "fallback-hook/sky.aspect-sign-context",
  "fallback-hook/sky.retrograde",
  "fallback-hook/sky.station",
  "fallback-hook/sky.retrograde-section",
  "fallback-hook/you.natal-placement",
  "fallback-hook/you.natal-house-placement",
  "fallback-hook/you.natal-angle-placement",
  "fallback-hook/you.natal-aspect",
  "fallback-hook/you.transit-to-natal",
  "fallback-hook/you.transit-through-house",
  "fallback-hook/you.transit-to-angle",
  "fallback-hook/you.daily-timing",
  "fallback-hook/friends.synastry-contact",
  "fallback-hook/friends.house-overlay",
  "fallback-hook/friends.composite-aspect",
  "fallback-hook/friends.composite-placement",
  "fallback-hook/friends.relationship-timing",
  "fallback-hook/friends.circle-feed",
  "fallback-hook/settings.life-area-focus",
  "fallback-hook/lunar-calendar/day",
  "fallback-hook/lunar-calendar/arc-new-moon",
  "fallback-hook/lunar-calendar/arc-full-moon",
  "fallback-hook/natal/hard-aspect",
  "fallback-hook/natal/chart-contradiction",
  "fallback-hook/natal/free-will-disclaimer",
  "fallback-hook/friends.same-planet"
]);

const skipCategories = new Set([
  "article-structure",
  "1-article-type-comparison-table",
  "2-phrase-record-table-representative-source-backed-rows",
  "3-coverage-table",
  "personalized-template"
]);

const synastryPhraseBlocklist = [
  "Fused this tightly",
  "Magnetic and polarizing",
  "Forever pulling the other back toward the middle",
  "It sits at an easy angle",
  "It flows so naturally",
  "Intoxicating and easy to lose yourself in",
  "Curdles the moment either of you reaches for a leash",
  "The friction grows you up",
  "Neither of you leaves this the same",
  "The softness is the point",
  "The rare kind of solid ground"
];

const flagDefinitions = {
  EDITORIAL_REVIEW_REQUIRED: {
    blocking: false,
    resolution: "Human review before publication."
  },
  PARAPHRASE_PENDING: {
    blocking: true,
    resolution: "Rewrite or paraphrase before any serving use."
  },
  REFERENCE_ONLY_NEVER_SERVE_VERBATIM: {
    blocking: true,
    resolution: "Store only as source/reference material; never publish as reader-facing copy."
  },
  DASH_NORMALIZATION_REQUIRED: {
    blocking: false,
    resolution: "Review proposed dashboard-normalized copy before serving."
  },
  UNMAPPED_KEY: {
    blocking: true,
    resolution: "Add explicit runtime mapping or keep outside the active import."
  },
  KEY_CONFLICT: {
    blocking: true,
    resolution: "Resolve duplicate or semantic conflict manually."
  },
  DUPLICATE_INCOMING_KEY: {
    blocking: true,
    resolution: "Collapse identical rows or choose a canonical source; do not rename with suffixes."
  },
  INVALID_STATUS: {
    blocking: true,
    resolution: "Map to one of the repository-supported statuses."
  },
  INVALID_LANE: {
    blocking: true,
    resolution: "Set lane to serving or reference."
  },
  INVALID_SCOPE: {
    blocking: true,
    resolution: "Repair malformed scope metadata."
  },
  MISSING_PROVENANCE: {
    blocking: true,
    resolution: "Add provenance before import."
  },
  MISSING_SOURCE: {
    blocking: true,
    resolution: "Add source_file/source manifest metadata before import."
  },
  MISSING_SURFACE_MAPPING: {
    blocking: true,
    resolution: "Assign a runtime family and surface eligibility."
  },
  UNSUPPORTED_CONTENT_FAMILY: {
    blocking: true,
    resolution: "Wire a resolver or keep this record out of generated_interpretations."
  },
  BLOCKLIST_MATCH: {
    blocking: true,
    resolution: "Rewrite the flagged phrase before serving."
  },
  CORRUPTED_TEMPLATE_TOKEN: {
    blocking: true,
    resolution: "Repair malformed template token."
  },
  LIVE_ROW_PROTECTED: {
    blocking: true,
    resolution: "Do not overwrite existing LIVE content."
  },
  SKIP_IDENTICAL: {
    blocking: false,
    resolution: "No database write needed."
  },
  DATABASE_COMPARISON_NOT_RUN: {
    blocking: true,
    resolution: "Run the dry run with an existing-row snapshot before execution."
  },
  PHRASEBANK_SUPPORT_FILE_SKIPPED: {
    blocking: false,
    resolution: "Support/reference phrasebank files are intentionally excluded from generated_interpretations import."
  },
  MARIE_SIGNOFF_REQUIRED: {
    blocking: false,
    resolution: "Review in the admin dashboard before flipping the row to LIVE."
  },
  DASHBOARD_CONFIRMATION_REQUIRED: {
    blocking: false,
    resolution: "Confirm the session-approved draft in the admin dashboard before publication."
  }
};

function parseArgs(argv) {
  const argValue = (name) => {
    const found = argv.find((arg) => arg.startsWith(`${name}=`));
    return found ? found.slice(name.length + 1) : null;
  };

  return {
    inputPath: argValue("--input") ?? defaultInput,
    outDir: argValue("--out-dir") ?? defaultOutDir,
    batchId: argValue("--batch-id") ?? `tldr-store-dry-run-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    existingRowsPath: argValue("--existing-rows"),
    phrasebankDir: argValue("--phrasebank-dir") ?? defaultPhrasebankDir,
    phrasebankMode: argv.includes("--phrasebank") || argv.includes("--input-phrasebank"),
    publishApprovedRequested: argv.includes("--publish-approved")
  };
}

export function readStore(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(parsed.records)) {
    throw new Error(`${filePath} must contain a top-level records array.`);
  }

  return parsed.records;
}

export function normalizeRecord(record, index = 0) {
  if (!record || typeof record !== "object") {
    throw new Error(`Record ${index} is not an object.`);
  }

  if (typeof record.key !== "string" || !record.key.trim()) {
    throw new Error(`Record ${index} is missing key.`);
  }

  if (typeof record.text !== "string") {
    throw new Error(`Record ${record.key} is missing text.`);
  }

  return {
    key: record.key.trim(),
    type: record.type ?? "record",
    category: record.category ?? null,
    scope: record.scope && typeof record.scope === "object" ? record.scope : {},
    surfaceEligibility: record.surfaceEligibility ?? null,
    condition: record.condition ?? null,
    facet: record.facet ?? null,
    variant: record.variant ?? null,
    review: record.review ?? null,
    status: record.status ?? "DRAFT",
    lane: record.lane ?? "reference",
    provenance: record.provenance ?? null,
    sourceFile: record.sourceFile ?? null,
    sectionRef: record.sectionRef ?? null,
    text: record.text
  };
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function bodySlug(value) {
  const part = slug(value);
  if (part === "true-node" || part === "north-node") return "north_node";
  if (part === "south-node") return "south_node";
  if (part === "mc") return "midheaven";
  if (part === "ic") return "imum_coeli";
  return part.replace(/-/g, "_");
}

function namespaceForKey(key) {
  return key.split("/")[0] || "unknown";
}

function textHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function titleFromKey(key) {
  return key
    .split("/")
    .filter(Boolean)
    .slice(-3)
    .join(" / ")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDashes(text) {
  return text
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, " - ")
    .replace(/\s+-\s+/g, " - ");
}

function dashTypes(text) {
  const types = [];
  if (text.includes("\u2014")) types.push("em dash");
  if (text.includes("\u2013")) types.push("en dash");
  return types;
}

function malformedTemplateTokens(text) {
  const opens = (text.match(/\{\{/g) ?? []).length;
  const closes = (text.match(/\}\}/g) ?? []).length;
  return opens !== closes || /\{(?!\{)|(?<!\})\}/.test(text.replace(/\{\{[^{}]+\}\}/g, ""));
}

function flag(flag, reason) {
  return {
    flag,
    reason,
    blocking: flagDefinitions[flag]?.blocking ?? true,
    resolution: flagDefinitions[flag]?.resolution ?? "Resolve before import."
  };
}

function recordFlags(record) {
  const flags = [];

  if (!allowedIncomingStatuses.has(record.status)) {
    flags.push(flag("INVALID_STATUS", `Unsupported incoming status: ${record.status}.`));
  }

  if (!["serving", "reference"].includes(record.lane)) {
    flags.push(flag("INVALID_LANE", `Unsupported lane: ${record.lane}.`));
  }

  if (record.lane === "reference" || record.status === "REFERENCE_ONLY") {
    flags.push(flag("REFERENCE_ONLY_NEVER_SERVE_VERBATIM", "Reference lane/source material cannot be served verbatim."));
  }

  if (!["CONFIRMED", "APPROVED"].includes(record.status)) {
    flags.push(flag("EDITORIAL_REVIEW_REQUIRED", `Incoming status ${record.status} requires review before publication.`));
  }

  if (record.review === "paraphrase-pending") {
    flags.push(flag("PARAPHRASE_PENDING", "Record is explicitly marked paraphrase-pending."));
  }

  if (/[\u2013\u2014]/.test(record.text)) {
    flags.push(flag("DASH_NORMALIZATION_REQUIRED", `Text contains ${dashTypes(record.text).join(" and ")} punctuation.`));
  }

  if (!record.provenance) {
    flags.push(flag("MISSING_PROVENANCE", "Record has no provenance string."));
  }

  if (!record.sourceFile) {
    flags.push(flag("MISSING_SOURCE", "Record has no source file."));
  }

  if (malformedTemplateTokens(record.text)) {
    flags.push(flag("CORRUPTED_TEMPLATE_TOKEN", "Template braces are unbalanced or malformed."));
  }

  const blocked = synastryPhraseBlocklist.filter((phrase) => record.text.toLowerCase().includes(phrase.toLowerCase()));
  if (blocked.length > 0) {
    flags.push(flag("BLOCKLIST_MATCH", `Blocked phrase(s): ${blocked.join(", ")}.`));
  }

  return flags;
}

function surfaceEligibilityFor(record) {
  if (record.surfaceEligibility) {
    return Array.isArray(record.surfaceEligibility) ? record.surfaceEligibility : [record.surfaceEligibility];
  }

  if (record.lane === "reference") return ["generation-reference"];

  if (record.category?.startsWith("synastry")) return ["friends-synastry-card", "friends-synastry-detail"];
  if (record.category === "composite") return ["friends-composite-card", "friends-composite-detail"];
  if (record.category === "chart-comparison") return ["friends-relationship-summary"];
  if (record.category?.includes("career") || record.key.startsWith("ms/career") || record.key.startsWith("ms/midheaven")) return ["you-career"];
  if (record.key.startsWith("lunar/")) return ["calendar-lunar-detail"];
  if (record.key.startsWith("modifier/")) return ["composition-modifier"];
  if (record.key.startsWith("fallback/")) return ["unsupported-horoscope-fallback-family"];
  if (record.key.startsWith("template/") || record.key.startsWith("structure/") || record.key.startsWith("table/")) return ["documentation-or-template"];

  return [];
}

function contentFamilyFor(record) {
  if (record.lane === "reference") return "generation-reference";
  if (record.category?.startsWith("synastry") || record.key.includes("synastry")) return "synastry";
  if (record.category === "composite" || record.key.includes("composite")) return "composite";
  if (record.category === "chart-comparison") return "relationship";
  if (record.key.startsWith("lunar/")) return "lunar-calendar";
  if (record.key.startsWith("modifier/")) return "transit-composition";
  if (record.key.startsWith("ms/career") || record.key.startsWith("ms/midheaven") || record.key.startsWith("ms/profection")) return "natal-career";
  if (record.key.startsWith("fallback/")) return "unsupported-horoscope-fallback";
  if (record.key.startsWith("template/") || record.key.startsWith("structure/") || record.key.startsWith("table/")) return "documentation";
  return "unclassified";
}

function relationshipContextFor(record) {
  if (record.key.includes("synastry") || record.category?.startsWith("synastry")) return "synastry";
  if (record.key.includes("composite") || record.category === "composite") return "composite";
  if (record.category === "chart-comparison") return "relationship";
  return null;
}

function targetSurfaceFor(record, family) {
  if (family === "synastry") return "synastry";
  if (family === "composite") return "composite";
  if (family === "relationship") return "relationship";
  if (family === "lunar-calendar") return "sky";
  if (family === "natal-career") return "natal";
  if (family === "transit-composition") return "modifier";
  if (family === "generation-reference") return null;
  return null;
}

function parseAspectKey(key) {
  const match = key.match(/(?:^|\/)([a-z-]+)-(conjunct|conjunction|sextile|square|trine|opposite|opposition|quincunx)-([a-z-]+)(?:\/|$)/);
  if (!match) return null;

  const [, first, aspect, second] = match;
  return {
    first: bodySlug(first),
    aspect: aspectAliases.get(aspect) ?? aspect,
    second: bodySlug(second)
  };
}

function canonicalSynastryKey(record) {
  const aspect = parseAspectKey(record.key);
  if (!aspect) return null;
  return `synastry.aspect.${aspect.first}.${aspect.aspect}.${aspect.second}`;
}

function fallbackHookKey(record) {
  const candidate = `fallback-hook/${record.key.replace(/^fallback\//, "")}`;
  return runtimeFallbackHooks.has(candidate) ? candidate : null;
}

function mapTarget(record) {
  if (record.lane === "reference" || record.status === "REFERENCE_ONLY") {
    return {
      action: "REFERENCE_ONLY",
      targetTable: "public.source_rows",
      existingRuntimeKey: null,
      targetDatabaseKey: `tldr-store/${record.key}`,
      reason: "Reference-lane material belongs in the existing source-row/reference concept, not reader-facing generated_interpretations."
    };
  }

  if (record.status === "DEPRECATED") {
    return {
      action: "SKIP",
      targetTable: null,
      existingRuntimeKey: null,
      targetDatabaseKey: null,
      reason: "Deprecated incoming record is excluded from active import."
    };
  }

  if (record.status === "RAW_QUARANTINE" || record.status === "MANUAL_ONLY") {
    return {
      action: "SKIP",
      targetTable: null,
      existingRuntimeKey: null,
      targetDatabaseKey: null,
      reason: `${record.status} records require human handling and are excluded from active import.`
    };
  }

  if (skipCategories.has(record.category) || record.key.startsWith("table/") || record.key.startsWith("template/") || record.key.startsWith("structure/")) {
    return {
      action: "SKIP",
      targetTable: null,
      existingRuntimeKey: null,
      targetDatabaseKey: null,
      reason: "Template/table/structure material is not a reader-facing generated_interpretations row."
    };
  }

  const hookKey = fallbackHookKey(record);
  if (hookKey) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      existingRuntimeKey: hookKey,
      targetDatabaseKey: hookKey,
      reason: "Incoming fallback key matches an existing runtime fallback hook."
    };
  }

  if (record.category?.startsWith("synastry") || record.key.includes("synastry-aspect")) {
    const canonicalKey = canonicalSynastryKey(record);
    if (canonicalKey) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        existingRuntimeKey: canonicalKey,
        targetDatabaseKey: canonicalKey,
        reason: "Incoming synastry aspect maps to the directional synastry runtime key family."
      };
    }
  }

  return {
    action: "UNMAPPED",
    targetTable: null,
    existingRuntimeKey: null,
    targetDatabaseKey: null,
    reason: "No safe current runtime key or supported canonical family was found."
  };
}

function normalizeDatabaseSnapshot(rows) {
  const byKey = new Map();
  for (const row of rows ?? []) {
    const contentKey = row.content_key ?? row.contentKey;
    if (!contentKey) continue;
    byKey.set(`${contentKey}|${row.target_date ?? row.targetDate ?? ""}|${row.mode ?? "in_depth"}`, row);
  }
  return byKey;
}

export function isImportedGeneratedRowServable(row) {
  if (!row || row.status !== "LIVE") return false;

  const facts = row.facts ?? {};
  const store = facts.tldrStore && typeof facts.tldrStore === "object" ? facts.tldrStore : {};
  const flags = new Set([...(row.flags ?? []), ...(store.flags ?? [])]);
  const sourceStatus = store.sourceStatus ?? row.sourceStatus;
  const review = row.review_state ?? store.review ?? row.review;
  const lane = row.lane ?? store.lane;

  if (lane && lane !== "serving") return false;
  if (review) return false;
  if (["REFERENCE_ONLY", "RAW_QUARANTINE", "MANUAL_ONLY", "DEPRECATED"].includes(sourceStatus)) return false;
  if (flags.has("REFERENCE_ONLY_NEVER_SERVE_VERBATIM")) return false;
  if (flags.has("PARAPHRASE_PENDING")) return false;
  if (flags.has("BLOCKLIST_MATCH")) return false;

  return true;
}

function applyDuplicateAndConflictRules(mappings, existingRows) {
  const byTarget = new Map();

  for (const mapping of mappings) {
    if (!mapping.target_database_key) continue;
    const key = `${mapping.target_database_key}|${mapping.target_table}|${mapping.target_date ?? ""}|${mapping.mode}`;
    const existing = byTarget.get(key) ?? [];
    existing.push(mapping);
    byTarget.set(key, existing);
  }

  for (const entries of byTarget.values()) {
    if (entries.length <= 1) continue;
    const hashes = new Set(entries.map((entry) => entry.incoming_text_hash));
    for (const entry of entries) {
      if (hashes.size === 1) {
        entry.action = "SKIP";
        entry.reason = "Duplicate incoming canonical target with identical text; collapse to one canonical source before import.";
        entry.conflict_result = "SKIP_IDENTICAL_DUPLICATE_SOURCE";
        entry.flags.push(flag("SKIP_IDENTICAL", "Duplicate incoming canonical target has identical content."));
      } else {
        entry.action = "CONFLICT";
        entry.reason = "Multiple incoming records map to the same canonical target with different content.";
        entry.conflict_result = "DUPLICATE_INCOMING_KEY_DIFFERENT_CONTENT";
        entry.flags.push(flag("DUPLICATE_INCOMING_KEY", "Multiple incoming rows target the same canonical identity."));
        entry.flags.push(flag("KEY_CONFLICT", "Duplicate target has different text."));
      }
    }
  }

  for (const mapping of mappings) {
    if (mapping.target_table !== "public.generated_interpretations" || !mapping.target_database_key) continue;
    const existing = existingRows?.get(`${mapping.target_database_key}|${mapping.target_date ?? ""}|${mapping.mode}`) ?? null;

    if (!existing) {
      if (!existingRows) {
        mapping.conflict_result = "DATABASE_COMPARISON_NOT_RUN";
        mapping.flags.push(flag("DATABASE_COMPARISON_NOT_RUN", "No existing generated_interpretations snapshot was supplied."));
      }
      continue;
    }

    const existingHash = textHash(existing.body ?? "");
    mapping.existing_status = existing.status ?? null;
    mapping.existing_text_hash = existingHash;
    mapping.existing_provenance = JSON.stringify(existing.source_snapshot ?? {});

    if (existing.status === "LIVE") {
      mapping.action = "CONFLICT";
      mapping.reason = "Existing LIVE row is protected from overwrite.";
      mapping.conflict_result = "LIVE_ROW_PROTECTED";
      mapping.flags.push(flag("LIVE_ROW_PROTECTED", "A LIVE row already exists for this target."));
    } else if (existingHash === mapping.incoming_text_hash) {
      mapping.action = "SKIP";
      mapping.reason = "Existing DRAFT row has identical body text.";
      mapping.conflict_result = "SKIP_IDENTICAL";
      mapping.flags.push(flag("SKIP_IDENTICAL", "Existing row body matches incoming row."));
    } else {
      mapping.action = "CONFLICT";
      mapping.reason = "Existing non-LIVE row has different content and cannot be overwritten silently.";
      mapping.conflict_result = "DRAFT_CONFLICT_DIFFERENT_TEXT";
      mapping.flags.push(flag("KEY_CONFLICT", "Existing DRAFT row differs from incoming content."));
    }
  }

  for (const mapping of mappings) {
    if (mapping.action === "UNMAPPED") {
      mapping.flags.push(flag("UNMAPPED_KEY", "No target runtime key was assigned."));
    }
    if (!mapping.surface_eligibility.length) {
      mapping.flags.push(flag("MISSING_SURFACE_MAPPING", "No surface eligibility was inferred."));
    }
    if (mapping.action === "UNMAPPED") {
      mapping.flags.push(flag("UNSUPPORTED_CONTENT_FAMILY", mapping.reason));
    }
  }
}

export function mapRecords(records, options = {}) {
  const existingRows = options.existingRows ? normalizeDatabaseSnapshot(options.existingRows) : null;
  const batchId = options.batchId ?? "tldr-store-dry-run-test";
  const sourceManifestVersion = options.sourceManifestVersion ?? "tldr-store-v17";

  const mappings = records.map((input, index) => {
    const record = normalizeRecord(input, index);
    const target = mapTarget(record);
    const family = contentFamilyFor(record);
    const surfaceEligibility = surfaceEligibilityFor(record);
    const flags = recordFlags(record);
    const targetSurface = targetSurfaceFor(record, family);

    return {
      index,
      incoming_key: record.key,
      incoming_type: record.type,
      incoming_category: record.category,
      incoming_scope: JSON.stringify(record.scope),
      existing_runtime_key: target.existingRuntimeKey,
      target_database_key: target.targetDatabaseKey,
      target_table: target.targetTable,
      target_content_family: family,
      surface_eligibility: surfaceEligibility,
      relationship_context: relationshipContextFor(record),
      incoming_status: record.status,
      mapped_status: target.targetTable === "public.generated_interpretations" ? "DRAFT" : null,
      lane: record.lane,
      provenance: record.provenance,
      review: record.review,
      action: target.action,
      reason: target.reason,
      conflict_result: null,
      flags,
      source_file: record.sourceFile,
      section_ref: record.sectionRef,
      text: record.text,
      proposed_normalized_text: normalizeDashes(record.text),
      incoming_text_hash: textHash(record.text),
      source_hash: textHash(JSON.stringify({
        key: record.key,
        text: record.text,
        sourceFile: record.sourceFile,
        sectionRef: record.sectionRef,
        provenance: record.provenance
      })),
      source_manifest_version: sourceManifestVersion,
      import_batch_id: batchId,
      import_source: "tldr-astro-codex-handoff",
      mode: "in_depth",
      target_date: null,
      target_surface: targetSurface,
      existing_status: null,
      existing_text_hash: null,
      existing_provenance: null
    };
  });

  applyDuplicateAndConflictRules(mappings, existingRows);
  return mappings;
}

const phrasebankSupportFiles = new Set([
  "houses.json",
  "cc-ruler-sign-clauses.json",
  "cc-transit-house-model.json",
  "cc-transit-activation-model.json",
  "cc-empty-house-model.json",
  "reviewed-clauses.json"
]);

const phrasebankReferenceFiles = new Set([
  "marie-confirmed-quotes.json",
  "ms-satori-articles-confirmed.json",
  "cc-marie-site-templates.json",
  "cc-horoscope-surface-templates.json",
  "cc-natal-angle-reviewed.json",
  "cc-planetary-horoscope.json",
  "cc-composite-reviewed.json",
  "cc-synastry-reviewed.json"
]);

const phrasebankParkedFiles = new Set([
]);

const authoredLibraryFiles = new Set([
  "cc-fallback-hooks.json",
  "cc-moon-phase-bank.json",
  "cc-slot-templates.json",
  "cc-slot-resolution-map.json",
  "cc-vocab.json",
  "cc-authored-content.json"
]);

const generatedContentSurfaces = new Set([
  "sky",
  "you",
  "natal",
  "synastry",
  "composite",
  "relationship",
  "modifier"
]);

const generatedContentBlockTypes = new Set([
  "sign",
  "house",
  "ruler",
  "aspect",
  "synthesis",
  "essay",
  "natal_aspect",
  "transit_to_natal_aspect",
  "synastry_aspect",
  "composite_aspect",
  "sky_aspect",
  "sky_article",
  "lunar_calendar",
  "fallback_template"
]);

function generatedContentSurfaceForPhrasebank(row, fallback = "modifier") {
  const surface = String(row?.surface ?? fallback);
  return generatedContentSurfaces.has(surface) ? surface : "modifier";
}

function generatedContentBlockTypeForPhrasebank(row, fallback = null) {
  const blockType = row?.block_type ?? fallback;
  if (blockType === "fallback_hook") return "fallback_template";
  if (typeof blockType === "string" && generatedContentBlockTypes.has(blockType)) return blockType;
  return null;
}

const phrasebankRelationshipTypes = [
  "romantic",
  "friendship",
  "family",
  "coworkers",
  "creative",
  "exes",
  "complicated"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function phrasebankTier(fileName, bundle, row) {
  const rawTier = row?.tier ?? bundle.tier ?? bundle._meta?.tier ?? row?.status ?? "REVIEWED";
  const normalized = String(rawTier).toUpperCase();

  if (normalized.includes("SESSION_APPROVED_DRAFT")) return "SESSION_APPROVED_DRAFT";
  if (normalized.includes("CONFIRMED")) return "CONFIRMED";
  return "REVIEWED";
}

function phrasebankReviewState(tier) {
  if (tier === "CONFIRMED") return null;
  if (tier === "SESSION_APPROVED_DRAFT") return "dashboard_confirmation_required";
  return "marie_signoff_required";
}

function phrasebankTierFlags(tier) {
  if (tier === "CONFIRMED") return [];
  if (tier === "SESSION_APPROVED_DRAFT") {
    return [
      flag("EDITORIAL_REVIEW_REQUIRED", "Session-approved draft requires dashboard confirmation before publication."),
      flag("DASHBOARD_CONFIRMATION_REQUIRED", "Session-approved draft is imported as DRAFT only.")
    ];
  }

  return [
    flag("EDITORIAL_REVIEW_REQUIRED", "Reviewed phrasebank copy requires Marie/admin sign-off before publication."),
    flag("MARIE_SIGNOFF_REQUIRED", "Reviewed phrasebank copy remains DRAFT until admin sign-off.")
  ];
}

function phrasebankArray(bundle) {
  if (Array.isArray(bundle.reviewed)) return bundle.reviewed;
  if (Array.isArray(bundle.readings)) return bundle.readings;
  if (Array.isArray(bundle.advice)) return bundle.advice;
  if (Array.isArray(bundle.cards)) return bundle.cards;
  if (Array.isArray(bundle.quotes)) return bundle.quotes;
  if (Array.isArray(bundle.records)) return bundle.records;
  if (Array.isArray(bundle.templates)) return bundle.templates;
  if (Array.isArray(bundle.worked_examples)) return bundle.worked_examples;
  return [];
}

function slotResolutionRows(bundle) {
  const templatesBySlot = new Map();
  const templates = bundle.templates && typeof bundle.templates === "object" && !Array.isArray(bundle.templates)
    ? bundle.templates
    : {};

  for (const [templateId, slots] of Object.entries(templates)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      const list = templatesBySlot.get(slot) ?? [];
      list.push(templateId);
      templatesBySlot.set(slot, list);
    }
  }

  return Object.entries(bundle.resolution ?? {}).map(([slot, entry]) => {
    const kind = entry?.kind ?? "unknown";
    const source = entry?.source && typeof entry.source === "object"
      ? [entry.source.type, entry.source.category].filter(Boolean).join("/")
      : typeof entry?.source === "string"
        ? entry.source
        : null;
    const templateIds = templatesBySlot.get(slot) ?? [];
    const sourceLabel = source ? ` from ${source}` : "";
    const selectLabel = entry?.select ? ` using ${entry.select}` : "";
    const hintLabel = entry?.hint ? ` (${entry.hint})` : "";
    const fallbackLabel = entry?.fallback ? `; fallback ${entry.fallback}` : "";

    return {
      content_key: `slot-resolution/${slot}`,
      surface: "modifier",
      mode: "feed",
      status: "DRAFT",
      event_type: "slot-resolution",
      headline: `Slot resolution / ${slot}`,
      summary: `${kind}${sourceLabel}`,
      body: kind === "gap"
        ? `SOURCE_GAP: ${slot} has no authored source yet.`
        : `${slot} resolves as ${kind}${sourceLabel}${selectLabel}${hintLabel}${fallbackLabel}.`,
      sections: {
        slot,
        kind,
        source: entry?.source ?? null,
        scope_from: entry?.scope_from ?? null,
        select: entry?.select ?? null,
        hint: entry?.hint ?? null,
        fallback: entry?.fallback ?? null,
        templates: templateIds
      },
      facts: {
        slot,
        kind,
        templates: templateIds
      },
      knowledge_ids: [`slot-resolution/${slot}`],
      source_snapshot: {
        contentType: "slot-resolution",
        category: kind,
        slot,
        templateIds,
        version: bundle.version,
        sourceFile: "cc-slot-resolution-map.json"
      },
      prompt_version: bundle.version ?? "slot-resolution-v1",
      block_type: null,
      reviewer_notes: kind === "gap" ? "Known source gap; do not emit a partial rendered card for this slot." : "",
      tier: "REVIEWED"
    };
  });
}

function phrasebankText(row) {
  if (typeof row.__bodyText === "string") return row.__bodyText;
  if (typeof row.text === "string") return row.text;
  if (typeof row.compactClaim === "string") return row.compactClaim;
  if (typeof row.experience === "string") return row.experience;
  if (typeof row.expanded_narrative === "string") return row.expanded_narrative;
  if (typeof row.collective_reading === "string") return row.collective_reading;
  if (typeof row.restrained_sentence === "string") return row.restrained_sentence;
  if (typeof row.reading === "string") return row.reading;
  if (typeof row.natal_sign_story === "string") return row.natal_sign_story;
  if (typeof row.house_integration === "string") return row.house_integration;
  if (typeof row.collective_shift === "string") return row.collective_shift;
  if (typeof row.home_scene === "string") return row.home_scene;
  if (Array.isArray(row.paragraphs)) return renderPhrasebankParagraphs(row.paragraphs, row);
  if (Array.isArray(row.paragraphsPlan)) return renderPhrasebankParagraphs(row.paragraphsPlan, row);
  if (row.slots && typeof row.slots === "object") {
    const slotPriority = [
      "meaning",
      "scene",
      "threshold_shift",
      "recognizable_situation",
      "phase_situation",
      "practical_response"
    ];
    const priorityValues = slotPriority
      .map((key) => row.slots[key])
      .filter((value) => typeof value === "string" && value.trim());
    if (priorityValues.length) return priorityValues.join(" ");
    const values = Object.values(row.slots).filter((value) => typeof value === "string" && value.trim());
    if (values.length) return values.join(" ");
  }
  if (row.clauses && typeof row.clauses === "object") {
    const values = Object.values(row.clauses).filter((value) => typeof value === "string");
    if (values.length) return values.join(" ");
  }
  if (typeof row.body === "string") return row.body;
  if (typeof row.experience === "string") return row.experience;
  return "";
}

function renderPhrasebankParagraphs(paragraphs, row) {
  return paragraphs
    .map((paragraph) => {
      const parts = Array.isArray(paragraph) ? paragraph : [paragraph];
      return parts
        .map((part) => {
          if (typeof part !== "string") return "";
          return row.clauses?.[part] ?? row.slots?.[part] ?? part;
        })
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean)
    .join("\n\n");
}

function phrasebankTitle(row) {
  return nonEmptyString(row.title)
    ?? nonEmptyString(row.heading)
    ?? nonEmptyString(row.headline)
    ?? nonEmptyString(row.name)
    ?? titleFromKey(row.id ?? row.content_key ?? "phrasebank-row");
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function phrasebankSourceKeys(row) {
  if (Array.isArray(row.source_keys)) return row.source_keys;
  if (Array.isArray(row.sourceKeys)) return row.sourceKeys;
  if (Array.isArray(row.sourceIds)) return row.sourceIds;
  if (Array.isArray(row.trace?.sourceKeys)) return row.trace.sourceKeys;
  if (typeof row.source === "string") return [row.source];
  return [];
}

function pairParts(pair) {
  const [first, second] = String(pair ?? "").split("-");
  return first && second ? [bodySlug(first), bodySlug(second)] : [null, null];
}

function phrasebankAspectPairParts(pair, aspect) {
  const pairText = String(pair ?? "").trim();
  const aspectKey = slug(aspect);

  if (!pairText || !aspectKey) return [null, null];

  const hyphenParts = pairText.split("-").map((part) => part.trim()).filter(Boolean);
  if (hyphenParts.length >= 3 && aspectAliases.has(slug(hyphenParts[1]))) {
    return [bodySlug(hyphenParts[0]), bodySlug(hyphenParts.slice(2).join("-"))];
  }

  const spacedAspect = aspectKey.replace(/-/g, "[\\s_-]+");
  const match = pairText.match(new RegExp(`^(.+?)[\\s_-]+${spacedAspect}[\\s_-]+(.+)$`, "i"));
  if (match) {
    return [bodySlug(match[1]), bodySlug(match[2])];
  }

  return [null, null];
}

function canonicalAspectBodies(first, second) {
  const order = [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "north_node",
    "south_node",
    "ascendant",
    "descendant",
    "midheaven",
    "imum_coeli"
  ];
  const firstIndex = order.indexOf(first);
  const secondIndex = order.indexOf(second);

  if (firstIndex >= 0 && secondIndex >= 0) {
    return firstIndex <= secondIndex ? [first, second] : [second, first];
  }

  return first.localeCompare(second) <= 0 ? [first, second] : [second, first];
}

function dotAspect(aspect) {
  return aspectAliases.get(slug(aspect)) ?? bodySlug(aspect);
}

function hyphenPart(value) {
  return bodySlug(value).replace(/_/g, "-");
}

function skyCollectiveContentKey(row) {
  const event = slug(row.event ?? String(row.id ?? "").replace(/^sky\/(?:card|detail)\//, ""));
  const signs = new Set([
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces"
  ]);
  const bodies = [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron"
  ];
  const aspectTokens = ["conjunct", "conjunction", "square", "trine", "sextile", "opposition", "opposite", "quincunx"];
  const parts = event.split("-").filter(Boolean);
  const lastPart = parts.at(-1);

  if (parts.length === 3 && (parts[0] === "new" || parts[0] === "full") && parts[1] === "moon" && signs.has(parts[2])) {
    return `lunar.lunation.${parts[0]}_moon.${parts[2]}`;
  }

  if (parts.length === 3 && (parts[0] === "solar" || parts[0] === "lunar") && parts[1] === "eclipse" && signs.has(parts[2])) {
    return `lunar.lunation.${parts[0]}_eclipse.${parts[2]}`;
  }

  if (parts.length === 2 && signs.has(parts[1])) {
    if (parts[0] === "sun") return `sky-season-${parts[1]}`;
    if (parts[0] === "moon") return `sky-moon-${parts[1]}`;
    if (bodies.includes(parts[0])) return `sky-${parts[0]}-in-${parts[1]}`;
  }

  if (parts.length >= 3 && parts[1] === "retrograde" && bodies.includes(parts[0])) {
    return `sky-retrograde-${parts[0]}`;
  }

  if (parts.length >= 4 && parts[1] === "station" && bodies.includes(parts[0])) {
    const sign = parts.at(-1);
    const direction = parts.slice(2, -1).join("_");
    if (signs.has(sign) && direction) {
      return `sky.retrograde.${bodySlug(parts[0])}.${bodySlug(sign)}.station_${bodySlug(direction)}`;
    }
    return `sky-retrograde-${parts[0]}`;
  }

  if (parts.length === 2 && parts[1] === "season" && signs.has(parts[0])) {
    return `sky-season-${parts[0]}`;
  }

  if (parts.length === 3 && parts[1] === "enters" && bodies.includes(parts[0]) && signs.has(parts[2])) {
    return `sky.ingress.${bodySlug(parts[0])}.${bodySlug(parts[2])}`;
  }

  const aspectIndex = parts.findIndex((part) => aspectTokens.includes(part));
  if (aspectIndex > 0 && aspectIndex < parts.length - 1) {
    const first = bodySlug(parts.slice(0, aspectIndex).join("-"));
    const secondParts = parts.slice(aspectIndex + 1);
    const second = signs.has(lastPart) && secondParts.length > 1
      ? bodySlug(secondParts.slice(0, -1).join("-"))
      : bodySlug(secondParts.join("-"));
    const [canonicalFirst, canonicalSecond] = canonicalAspectBodies(first, second);
    return `sky.aspect.${canonicalFirst}.${dotAspect(parts[aspectIndex])}.${canonicalSecond}`;
  }

  return null;
}

function phrasebankRuntimeMapping(fileName, row) {
  if (row.__targetMapping) {
    return row.__targetMapping;
  }

  const id = String(row.id ?? "");
  const kind = row.kind ?? "";

  if (phrasebankParkedFiles.has(fileName)) {
    return {
      action: "UNMAPPED",
      targetTable: null,
      targetDatabaseKey: null,
      targetSurface: null,
      family: fileName.replace(/\.json$/, ""),
      blockType: null,
      reason: "This phrasebank surface is parked until the app has a runtime key family for it."
    };
  }

  if (authoredLibraryFiles.has(fileName) && row.content_key) {
    const family = row.event_type === "slot-template"
      ? "slot-template"
      : row.event_type === "hook" || row.event_type === "fallback"
        ? "authored-fallback-library"
        : row.event_type === "vocab" || row.event_type === "phrase"
          ? "authored-vocab-library"
          : "authored-content-library";

    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: row.content_key,
      targetSurface: generatedContentSurfaceForPhrasebank(row),
      family,
      blockType: generatedContentBlockTypeForPhrasebank(row),
      mode: row.mode ?? "feed",
      reason: "V5 authored-library row imports directly under its shipped cc/... or slot-template/... content_key."
    };
  }

  if (fileName === "cc-fallback-hooks.json" && row.content_key?.startsWith("fallback-hook/")) {
    return {
      action: runtimeFallbackHooks.has(row.content_key) ? "MATCH_EXISTING" : "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: row.content_key,
      targetSurface: row.surface ?? "modifier",
      family: "fallback-hook",
      blockType: row.block_type ?? "fallback_template",
      mode: row.mode ?? "feed",
      reason: runtimeFallbackHooks.has(row.content_key)
        ? "V2 fallback-hook row maps to a registered runtime fallback route."
        : "V2 fallback-hook row is saved under its shipped content_key; confirm runtime registration before serving."
    };
  }

  if (fileName === "cc-vocab.json" && (row.content_key?.startsWith("fallback-vocab/") || row.content_key?.startsWith("vocab/"))) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: row.content_key,
      targetSurface: row.surface ?? "modifier",
      family: "vocab",
      blockType: row.block_type ?? null,
      mode: row.mode ?? "feed",
      reason: "V2 vocab row uses the shipped dashboard/runtime vocab namespace and structured sections."
    };
  }

  if (fileName === "cc-transit-house.json" && row.eyebrow?.body && row.eyebrow?.house) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `transit.house.${bodySlug(row.eyebrow.body)}.house_${bodySlug(row.eyebrow.house)}`,
      targetSurface: "you",
      family: "transit-house",
      blockType: "transit_to_natal_aspect",
      reason: "Parked under a new transit house runtime key family for future app consumption."
    };
  }

  if (fileName === "cc-planetary-horoscope.json" && row.planet && row.house) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `sky.planetary.${bodySlug(row.planet)}.house_${bodySlug(row.house)}`,
      targetSurface: "sky",
      family: "planetary-horoscope",
      blockType: "sky_article",
      reason: "Parked under a new planetary horoscope key family keyed by transiting planet and rising-derived house."
    };
  }

  if (fileName === "cc-stellium-authored.json" && row.sign) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.pattern.stellium.${bodySlug(row.sign)}`,
      targetSurface: "natal",
      family: "natal-pattern-stellium",
      blockType: "synthesis",
      reason: "Parked under a new natal stellium pattern key family."
    };
  }

  if (fileName === "cc-stellium-authored.json" && (row.house || row.kind === "stellium_house")) {
    const house = row.house ?? id.match(/\/(\d+)$/)?.[1];
    if (house) {
      return {
        action: "NEW_CANONICAL_KEY",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.pattern.stellium.house_${bodySlug(house)}`,
        targetSurface: "natal",
        family: "natal-pattern-stellium",
        blockType: "synthesis",
        reason: "Stellium-by-house rows use the decided natal pattern key family."
      };
    }
  }

  if (fileName === "cc-intercepted-authored.json" && row.sign) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.pattern.intercepted.${bodySlug(row.sign)}`,
      targetSurface: "natal",
      family: "natal-pattern-intercepted",
      blockType: "synthesis",
      reason: "Parked under a new intercepted-sign pattern key family."
    };
  }

  if (fileName === "cc-natal-retrograde-authored.json" && row.body) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.retrograde.${bodySlug(row.body)}`,
      targetSurface: "natal",
      family: "natal-retrograde",
      blockType: "synthesis",
      reason: "Parked under a new natal retrograde key family."
    };
  }

  if (fileName === "cc-planet-in-sign-reviewed.json" && row.body && row.sign) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.sign.${bodySlug(row.body)}.${bodySlug(row.sign)}`,
      targetSurface: "natal",
      family: "natal-sign",
      blockType: "sign",
      reason: "Planet-in-sign phrasebank row maps to the natal sign runtime key."
    };
  }

  if (fileName === "cc-planet-in-house-reviewed.json" && row.body && row.house) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.house.${bodySlug(row.body)}.house_${bodySlug(row.house)}`,
      targetSurface: "natal",
      family: "natal-house",
      blockType: "house",
      reason: "Planet-in-house phrasebank row maps to the natal house runtime key."
    };
  }

  if (fileName === "cc-natal-angle-reviewed.json" && row.angle && row.sign) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.angle.${bodySlug(row.angle)}.${bodySlug(row.sign)}`,
      targetSurface: "natal",
      family: "natal-angle",
      blockType: "house",
      reason: "Natal angle phrasebank row maps to the natal angle runtime key."
    };
  }

  if (fileName === "cc-natal-angles-authored.json" && row.angle && row.sign) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `natal.angle.${bodySlug(row.angle)}.${bodySlug(row.sign)}`,
      targetSurface: "natal",
      family: "natal-angle",
      blockType: "angle",
      reason: "Authored natal angle reading maps to the natal angle runtime key and supersedes the no-prose angle template row."
    };
  }

  if (fileName === "cc-natal-aspect.json" && row.pair && row.aspect) {
    const [first, second] = pairParts(row.pair);
    if (first && second) {
      const [canonicalFirst, canonicalSecond] = canonicalAspectBodies(first, second);
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.aspect.${canonicalFirst}.${dotAspect(row.aspect)}.${canonicalSecond}`,
        targetSurface: "natal",
        family: "natal-aspect",
        blockType: "natal_aspect",
        reason: "Natal aspect phrasebank row maps to the canonical natal aspect runtime key."
      };
    }
  }

  if (fileName.startsWith("cc-aspect-pair-reviewed") && row.pair && row.aspect) {
    const [pairFirst, pairSecond] = phrasebankAspectPairParts(row.pair, row.aspect);
    const transiting = bodySlug(row.transiting_body ?? (row.angle ? row.body : pairFirst));
    const natal = bodySlug(row.natal_body ?? row.angle ?? pairSecond);

    if (transiting && natal) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `transit.aspect.${transiting}.${dotAspect(row.aspect)}.${natal}`,
        targetSurface: "you",
        family: "transit-to-natal-aspect",
        blockType: "transit_to_natal_aspect",
        reason: "Transit aspect phrasebank row maps to the transit-to-natal aspect runtime key."
      };
    }
  }

  if (fileName === "cc-synastry-reviewed.json" && row.their_body && row.your_body && row.aspect) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `synastry.aspect.${bodySlug(row.their_body)}.${dotAspect(row.aspect)}.${bodySlug(row.your_body)}`,
      targetSurface: "synastry",
      family: "synastry-aspect",
      blockType: "synastry_aspect",
      reason: "Synastry inter-aspect row maps to the directional synastry runtime key."
    };
  }

  if (fileName === "cc-synastry-reviewed.json" && row.kind === "synastry_house_overlay" && row.house) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `synastry-planet-house-${row.house}`,
      targetSurface: "synastry",
      family: "synastry-house-overlay",
      blockType: "synastry_aspect",
      reason: "Generic synastry house overlay row maps to the existing synastry house alias family."
    };
  }

  if (fileName === "cc-synastry-overlay-full.json" && row.planet && row.house) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `synastry-${hyphenPart(row.planet)}-house-${row.house}`,
      targetSurface: "synastry",
      family: "synastry-house-overlay",
      blockType: "synastry_aspect",
      reason: "Synastry house overlay row maps to the existing synastry house alias family."
    };
  }

  if ((fileName === "cc-composite-aspect.json" || fileName === "cc-composite-typed.json") && row.pair && (row.aspect || row.canonical_aspect)) {
    const [first, second] = pairParts(row.pair);
    if (first && second) {
      const [canonicalFirst, canonicalSecond] = canonicalAspectBodies(first, second);
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `composite.aspect.${canonicalFirst}.${dotAspect(row.aspect ?? row.canonical_aspect)}.${canonicalSecond}`,
        targetSurface: "composite",
        family: fileName === "cc-composite-typed.json" ? "composite-aspect-typed" : "composite-aspect",
        blockType: "composite_aspect",
        reason: "Composite aspect row maps to the canonical composite aspect runtime key."
      };
    }
  }

  if (fileName === "cc-composite-reviewed.json") {
    if (row.kind === "composite_planet" && row.body) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `composite.${bodySlug(row.body)}`,
        targetSurface: "composite",
        family: "composite-placement",
        blockType: "composite_aspect",
        reason: "Base composite planet meaning maps to the composite point runtime key family."
      };
    }
    if (row.kind === "composite_sign" && row.body && row.slots?.sign) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `composite-${hyphenPart(row.body)}-in-${hyphenPart(row.slots.sign)}`,
        targetSurface: "composite",
        family: "composite-placement",
        blockType: "composite_aspect",
        reason: "Composite placement row maps to the existing composite placement alias family."
      };
    }
    if ((row.kind === "composite_house" || row.kind === "composite_planet_house") && row.body && row.house) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `composite.house.${bodySlug(row.body)}.house_${bodySlug(row.house)}`,
        targetSurface: "composite",
        family: "composite-placement",
        blockType: "composite_aspect",
        reason: "Composite house row maps to the existing composite house alias family."
      };
    }
  }

  if (fileName === "cc-ruling-planet-advice.json" && row.ruler && row.batch === 1) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `vocab.ruling-planet-advice.${bodySlug(row.sign)}.batch_${bodySlug(row.batch)}`,
      targetSurface: "natal",
      family: "natal-ruler-sign-advice",
      blockType: "ruler",
      reason: "Sign-specific chart-ruler advice is parked under a dedicated vocab key family to avoid planet-only natal.ruler collisions."
    };
  }

  if (fileName === "cc-ruling-planet-advice.json" || fileName === "cc-ruling-planet-advice-drafts.json") {
    if (row.sign && row.batch) {
      return {
        action: "NEW_CANONICAL_KEY",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `vocab.ruling-planet-advice.${bodySlug(row.sign)}.batch_${bodySlug(row.batch)}`,
        targetSurface: "natal",
        family: "natal-ruler-sign-advice",
        blockType: "ruler",
        reason: "Sign-specific chart-ruler advice is parked under a dedicated vocab key family to avoid planet-only natal.ruler collisions."
      };
    }

    return {
      action: "UNMAPPED",
      targetTable: null,
      targetDatabaseKey: null,
      targetSurface: null,
      family: "natal-ruler-sign-advice",
      blockType: "ruler",
      reason: "Additional sign/batch-specific ruling-planet advice needs a product decision before it can collapse into planet-only natal.ruler keys."
    };
  }

  if (fileName === "ms-lunation-by-sign-confirmed.json" && row.lunation_type && row.sign) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `lunar.lunation.${bodySlug(row.lunation_type)}.${bodySlug(row.lunation_sign)}.${bodySlug(row.keyed_by)}_${bodySlug(row.sign)}`,
      targetSurface: "sky",
      family: "lunar-calendar-by-sign",
      blockType: "lunar_calendar",
      reason: "By-sign lunation copy is parked under a dedicated user-sign/rising-aware key family."
    };
  }

  if (fileName === "cc-lunation-by-sign-authored.json" && row.lunation_type && row.sign) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `lunar.lunation.${bodySlug(row.lunation_type)}.${bodySlug(row.lunation_sign)}.${bodySlug(row.keyed_by)}_${bodySlug(row.sign)}`,
      targetSurface: "sky",
      family: "lunar-calendar-by-sign",
      blockType: "lunar_calendar",
      reason: "By-sign lunation copy is parked under a dedicated user-sign/rising-aware key family."
    };
  }

  if (fileName === "cc-chiron-reviewed.json" && row.kind === "chiron_placement") {
    const signMatch = id.match(/chiron-in-([a-z-]+)$/);
    if (signMatch) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.sign.chiron.${bodySlug(signMatch[1])}`,
        targetSurface: "natal",
        family: "natal-sign",
        blockType: "sign",
        reason: "Chiron placement row maps to the natal sign runtime key; Chiron is a supported generatedContentKeys body."
      };
    }

    const houseMatch = id.match(/chiron-in-(\d+)-house$/);
    if (houseMatch) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.house.chiron.house_${bodySlug(houseMatch[1])}`,
        targetSurface: "natal",
        family: "natal-house",
        blockType: "house",
        reason: "Chiron house row maps to the natal house runtime key; Chiron is a supported generatedContentKeys body."
      };
    }
  }

  if (fileName === "cc-chiron-reviewed.json" && row.kind === "chiron_aspect" && row.aspect) {
    const [pairFirst, pairSecond] = phrasebankAspectPairParts(row.pair, row.aspect);
    const first = bodySlug(row.transiting_body ?? pairFirst ?? "chiron");
    const second = bodySlug(row.natal_body ?? pairSecond);
    if (first && second) {
      const [canonicalFirst, canonicalSecond] = canonicalAspectBodies(first, second);
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.aspect.${canonicalFirst}.${dotAspect(row.aspect)}.${canonicalSecond}`,
        targetSurface: "natal",
        family: "natal-aspect",
        blockType: "natal_aspect",
        reason: "Chiron aspect row maps to the canonical natal aspect runtime key; Chiron is a supported generatedContentKeys body."
      };
    }
  }

  if (fileName === "cc-node-reviewed.json" && row.kind === "lunar_node") {
    const signMatch = id.match(/cc\/node\/((?:north|south)-node)-in-([a-z-]+)$/);
    if (signMatch) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.sign.${bodySlug(signMatch[1])}.${bodySlug(signMatch[2])}`,
        targetSurface: "natal",
        family: "natal-sign",
        blockType: "sign",
        reason: "Lunar node row maps to the natal sign runtime key; north_node/south_node are supported generatedContentKeys bodies."
      };
    }

    const houseMatch = id.match(/cc\/node\/((?:north|south)-node)-in-(\d+)-house$/);
    if (houseMatch) {
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.house.${bodySlug(houseMatch[1])}.house_${bodySlug(houseMatch[2])}`,
        targetSurface: "natal",
        family: "natal-house",
        blockType: "house",
        reason: "Lunar node house row maps to the natal house runtime key; north_node/south_node are supported generatedContentKeys bodies."
      };
    }
  }

  if (fileName === "cc-tails-reviewed.json" && row.kind === "node_transit" && row.node && row.natal_point) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `transit.aspect.${bodySlug(`${row.node}-node`)}.conjunction.${bodySlug(row.natal_point)}`,
      targetSurface: "you",
      family: "transit-to-natal-aspect",
      blockType: "transit_to_natal_aspect",
      reason: "Node transit row maps to the existing transit-to-natal aspect runtime key."
    };
  }

  if (fileName === "cc-moon-reviewed.json" && row.kind === "moon_phase" && row.phase) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `lunar.card.moon_phase.${bodySlug(row.phase)}`,
      targetSurface: "sky",
      family: "lunar-calendar-card",
      blockType: "lunar_calendar",
      mode: "feed",
      reason: "Moon phase phrasebank row uses the calendar card treatment for lunar phase copy."
    };
  }

  if (fileName === "cc-moon-reviewed.json" && row.kind === "moon_sign" && row.sign) {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `lunar.card.moon_sign.${bodySlug(row.sign)}`,
      targetSurface: "sky",
      family: "lunar-calendar-card",
      blockType: "lunar_calendar",
      mode: "feed",
      reason: "Moon sign phrasebank row uses the calendar card treatment for lunar sign copy."
    };
  }

  if (fileName === "cc-sky-events-reviewed.json" && row.kind === "retrograde" && row.body) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `sky.retrograde.${bodySlug(row.body)}`,
      targetSurface: "sky",
      family: "sky-phrasebank",
      blockType: "sky_aspect",
      reason: "Planet retrograde row maps to the sky retrograde runtime key family."
    };
  }

  if (fileName === "cc-sky-events-reviewed.json" && row.kind === "retro_phase") {
    return {
      action: "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `sky.retrograde-section.${bodySlug(row.phase)}`,
      targetSurface: "sky",
      family: "sky-retrograde-section",
      blockType: "sky_article",
      reason: "Retrograde phase section copy is imported as article/card support under the retrograde-section key family."
    };
  }

  if (fileName === "cc-sky-events-reviewed.json" && row.kind === "ingress" && row.body && row.sign) {
    return {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `sky.ingress.${bodySlug(row.body)}.${bodySlug(row.sign)}`,
      targetSurface: "sky",
      family: "sky-phrasebank",
      blockType: "sky_aspect",
      reason: "Ingress row maps to the sky ingress runtime key family."
    };
  }

  if (fileName === "cc-sky-events-reviewed.json" && row.kind === "ingress" && row.body) {
    const targetDatabaseKey = `fallback-hook/sky.ingress.${bodySlug(row.body)}`;
    return {
      action: runtimeFallbackHooks.has(targetDatabaseKey) ? "MATCH_EXISTING" : "NEW_CANONICAL_KEY",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey,
      targetSurface: "sky",
      family: "fallback-hook",
      blockType: "fallback_template",
      mode: "feed",
      reason: "Generic per-planet ingress copy maps to a fallback-hook template that keeps the destination sign as a render-time slot."
    };
  }

  if (fileName === "cc-sky-collective-card-reviewed.json" || fileName === "cc-sky-collective-detail-reviewed.json") {
    const contentKey = skyCollectiveContentKey(row);
    if (contentKey) {
      const isCalendarLunation = contentKey.startsWith("lunar.lunation.");
      return {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: contentKey,
        targetSurface: "sky",
        family: isCalendarLunation ? "lunar-calendar" : "sky-phrasebank",
        blockType: isCalendarLunation ? "lunar_calendar" : "sky_aspect",
        mode: fileName === "cc-sky-collective-card-reviewed.json" ? "feed" : "in_depth",
        reason: "Sky collective card/detail row maps to the existing sky alias/runtime key family with card as feed and detail as in_depth."
      };
    }

    return {
      action: "UNMAPPED",
      targetTable: null,
      targetDatabaseKey: null,
      targetSurface: null,
      family: "sky-phrasebank",
      blockType: "sky_aspect",
      reason: "Sky collective row did not match a known sky placement, aspect, ingress, moon, season, or retrograde key pattern."
    };
  }

  if (fileName === "sky-historical-lookback.json") {
    const eventSlug = slug(row.attachesToEvent ?? row.eventIdentity?.eventType ?? id.split("/").slice(2, -1).join("-"));
    const period = slug(row.previousCycleDateLabel ?? id.split("/").at(-1));

    if (eventSlug && period) {
      return {
        action: "NEW_CANONICAL_KEY",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `sky.history.${eventSlug}.${period}`,
        targetSurface: "sky",
        family: "sky-history",
        blockType: "sky_article",
        reason: "Historical lookback rows use the decided admin-gated sky history key family."
      };
    }
  }

  if (fileName.startsWith("cc-sky-collective") || fileName === "cc-sky-events-reviewed.json" || fileName === "sky-historical-lookback.json") {
    return {
      action: "UNMAPPED",
      targetTable: null,
      targetDatabaseKey: null,
      targetSurface: null,
      family: "sky-phrasebank",
      blockType: fileName === "sky-historical-lookback.json" ? "sky_article" : "sky_aspect",
      reason: "Sky phrasebank row needs event-specific runtime key mapping before import."
    };
  }

  if (fileName === "cc-horoscope-surface-templates.json" || fileName === "cc-marie-site-templates.json" || fileName === "marie-confirmed-quotes.json" || fileName === "ms-satori-articles-confirmed.json") {
    return {
      action: "UNMAPPED",
      targetTable: null,
      targetDatabaseKey: null,
      targetSurface: null,
      family: "editorial-reference",
      blockType: null,
      reason: "Editorial/template quote material is not directly requested by current reader runtime keys."
    };
  }

  if (["cc-chiron-reviewed.json", "cc-moon-reviewed.json", "cc-node-reviewed.json", "cc-tails-reviewed.json"].includes(fileName) || kind.includes("chiron") || kind.includes("node")) {
    return {
      action: "UNMAPPED",
      targetTable: null,
      targetDatabaseKey: null,
      targetSurface: null,
      family: "natal-specialized-placement",
      blockType: "synthesis",
      reason: "Specialized natal placement row needs a precise runtime key family before import."
    };
  }

  return {
    action: "UNMAPPED",
    targetTable: null,
    targetDatabaseKey: null,
    targetSurface: null,
    family: "unclassified-phrasebank",
    blockType: null,
    reason: "No deterministic phrasebank runtime mapping was found."
  };
}

function phrasebankSections(fileName, row) {
  if (row.__sections && typeof row.__sections === "object") return row.__sections;
  if (row.sections !== undefined) return row.sections;

  if (fileName === "cc-composite-typed.json") {
    return {
      byRelationshipType: {
        [row.relationshipType]: {
          experience: row.experience,
          advice: row.advice,
          astro: row.astro,
          typeLabel: row.typeLabel
        }
      },
      meaning: row.meaning,
      relationshipTypesAvailable: [row.relationshipType]
    };
  }

  const explicitSections = {};
  for (const key of [
    "guidance",
    "note",
    "astro",
    "meaning",
    "advice",
    "expanded_narrative",
    "collective_reading",
    "restrained_sentence",
    "default",
    "weight",
    "context_order",
    "caveat",
    "soft_language",
    "reading",
    "natal_sign_story",
    "collective_shift",
    "house_domain",
    "house_integration",
    "home_scene"
  ]) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      explicitSections[key] = row[key];
    }
  }

  if (Object.keys(explicitSections).length) {
    return {
      ...explicitSections,
      ...(row.fields && typeof row.fields === "object" ? row.fields : {}),
      ...(row.slots && typeof row.slots === "object" ? row.slots : {}),
      ...(row.clauses && typeof row.clauses === "object" ? row.clauses : {}),
      ...(row.trace && typeof row.trace === "object" ? { trace: row.trace } : {})
    };
  }

  if (row.fields && typeof row.fields === "object") return row.fields;
  if (row.slots && typeof row.slots === "object") return row.slots;
  if (row.clauses && typeof row.clauses === "object") return row.clauses;
  if (row.trace && typeof row.trace === "object") return { trace: row.trace };
  return {};
}

function phrasebankBody(fileName, row) {
  if (typeof row.__bodyText === "string") return row.__bodyText;

  if (typeof row.body === "string" && authoredLibraryFiles.has(fileName)) {
    return row.body;
  }

  if (fileName === "cc-composite-typed.json") {
    return row.experience ?? phrasebankText(row);
  }

  if (fileName === "cc-sky-events-reviewed.json" && row.kind === "ingress" && row.body && !row.sign) {
    return row.slots?.threshold_shift ?? phrasebankText(row);
  }

  return phrasebankText(row);
}

function phrasebankFeedBody(fileName, row) {
  if (typeof row.__feedBody === "string") return row.__feedBody;

  if (typeof row.experience === "string" && row.experience.trim()) {
    return row.experience;
  }

  if (Array.isArray(row.paragraphs) && typeof row.paragraphs[0] === "string") {
    return row.paragraphs[0];
  }

  if (typeof row.natal_sign_story === "string") return row.natal_sign_story;
  if (typeof row.house_integration === "string") return row.house_integration;
  if (typeof row.reading === "string") return row.reading;
  if (typeof row.collective_reading === "string") return row.collective_reading;
  if (typeof row.text === "string") return row.text;

  return phrasebankBody(fileName, row);
}

function phrasebankMapping(fileName, bundle, row, index, batchId) {
  const tier = phrasebankTier(fileName, bundle, row);
  const target = phrasebankRuntimeMapping(fileName, row);
  const text = phrasebankBody(fileName, row);
  const sourceKeys = phrasebankSourceKeys(row);
  const flags = phrasebankTierFlags(tier);

  if (/[\u2013\u2014]/.test(text) && tier !== "CONFIRMED") {
    flags.push(flag("DASH_NORMALIZATION_REQUIRED", `Text contains ${dashTypes(text).join(" and ")} punctuation.`));
  }

  return {
    index,
    incoming_key: row.content_key ?? row.id ?? `${fileName}:${index}`,
    incoming_type: fileName.replace(/\.json$/, ""),
    incoming_category: bundle._meta?.surface ?? row.surface ?? row.kind ?? null,
    incoming_scope: JSON.stringify({
      file: fileName,
      tier,
      pair: row.pair,
      aspect: row.aspect ?? row.canonical_aspect,
      relationshipType: row.relationshipType,
      sign: row.sign,
      body: row.body,
      house: row.house
    }),
    existing_runtime_key: target.targetDatabaseKey,
    target_database_key: target.targetDatabaseKey,
    target_table: target.targetTable,
    target_content_family: target.family,
    surface_eligibility: target.targetSurface ? [target.targetSurface] : [],
    relationship_context: row.relationshipType ?? null,
    incoming_status: tier,
    mapped_status: target.targetTable === "public.generated_interpretations" ? "DRAFT" : null,
    lane: "serving",
    provenance: sourceKeys.join(", "),
    review: phrasebankReviewState(tier),
    action: target.action,
    reason: target.reason,
    conflict_result: null,
    flags,
    source_file: `tldr-astro-phrasebank/phrasebank/${fileName}`,
    section_ref: row.id ?? String(index),
    text,
    proposed_normalized_text: tier === "CONFIRMED" ? text : normalizeDashes(text),
    incoming_text_hash: textHash(text),
    source_hash: textHash(JSON.stringify({ fileName, row })),
    source_manifest_version: "tldr-astro-phrasebank-20260714-v8",
    import_batch_id: batchId,
    import_source: "tldr-astro-phrasebank-20260714-v8",
    mode: target.mode ?? "in_depth",
    target_date: null,
    target_surface: target.targetSurface,
    existing_status: null,
    existing_text_hash: null,
    existing_provenance: null,
    generated_headline: nonEmptyString(row.headline) ?? phrasebankTitle(row),
    generated_summary: nonEmptyString(row.summary) ?? nonEmptyString(row.meaning) ?? [
      tier,
      fileName.replace(/\.json$/, ""),
      row.event_type,
      row.source_snapshot?.category
    ].filter(Boolean).join(" · "),
    generated_body: text,
    generated_feed_body: phrasebankFeedBody(fileName, row),
    generated_sections: phrasebankSections(fileName, row),
    generated_block_type: target.blockType,
    generated_facts: {
      phrasebank: {
        file: fileName,
        tier,
        originalId: row.id ?? null,
        relationshipType: row.relationshipType ?? null,
        typeLabel: row.typeLabel ?? null,
        pair: row.pair ?? null,
        aspect: row.aspect ?? row.canonical_aspect ?? null,
        valence: row.valence ?? null,
        body: row.body ?? row.planet ?? null,
        sign: row.sign ?? null,
        house: row.house ?? null,
        generational: row.generational ?? null,
        contentKey: row.content_key ?? null,
        eventType: row.event_type ?? null,
        promptVersion: row.prompt_version ?? null,
        sourceKeys
      }
    },
    generated_knowledge_ids: Array.isArray(row.knowledge_ids) ? row.knowledge_ids : [row.id ?? row.content_key ?? `${fileName}:${index}`, ...sourceKeys],
    generated_source_snapshot: {
      ...(row.source_snapshot && typeof row.source_snapshot === "object" ? row.source_snapshot : {}),
      source: "tldr-astro-phrasebank-20260714-v8",
      file: `tldr-astro-phrasebank/phrasebank/${fileName}`,
      originalId: row.id ?? row.content_key ?? null,
      tier,
      sourceKeys,
      trace: row.trace ?? null,
      importBatchId: batchId,
      servingRule: "Phrasebank rows stay DRAFT. Runtime and RLS require LIVE + lane=serving + review_state IS NULL."
    },
    generated_event_type: row.event_type ?? target.family,
    generated_prompt_version: row.prompt_version ?? "tldr-phrasebank-v2",
    generated_provider: row.provider ?? "manual",
    generated_model: row.model ?? "compiled-phrasebank-import",
    generated_reviewer_notes: row.reviewer_notes ?? `Phrasebank import from ${fileName}. Tier: ${tier}. ${target.reason}`
  };
}

function planetSignSurfaceMappings(fileName, row) {
  if (fileName !== "cc-planet-in-sign-reviewed.json" || !row.body || !row.sign) {
    return null;
  }

  const body = bodySlug(row.body);
  const sign = bodySlug(row.sign);
  const natalBody = typeof row.natal_sign_story === "string" ? row.natal_sign_story : "";
  const skyBody = typeof row.collective_shift === "string" ? row.collective_shift : "";
  const mappings = [];

  if (natalBody) {
    mappings.push({
      ...row,
      id: `${row.id ?? `cc/planet-in-sign/${body}-in-${sign}`}#natal-sign-story`,
      __bodyText: natalBody,
      __feedBody: natalBody,
      __sections: {
        natal_sign_story: natalBody,
        surfaceField: "natal_sign_story",
        sourceSurfaces: row.surfaces ?? []
      },
      __targetMapping: {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.sign.${body}.${sign}`,
        targetSurface: "natal",
        family: "natal-sign",
        blockType: "sign",
        reason: "Planet-in-sign natal field maps to the natal sign runtime key. Do not use collective_shift here."
      }
    });
  }

  if (skyBody) {
    mappings.push({
      ...row,
      id: `${row.id ?? `cc/planet-in-sign/${body}-in-${sign}`}#sky-collective-shift`,
      __bodyText: skyBody,
      __feedBody: skyBody,
      __sections: {
        collective_shift: skyBody,
        surfaceField: "collective_shift",
        sourceSurfaces: row.surfaces ?? []
      },
      __targetMapping: {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `sky.placement.${body}.${sign}`,
        targetSurface: "sky",
        family: "sky-placement",
        blockType: "sky_article",
        reason: "Planet-in-sign sky field maps to the Sky placement runtime key. Do not use natal_sign_story here."
      }
    });
  }

  return mappings;
}

function planetHouseSurfaceMappings(fileName, row) {
  if (fileName !== "cc-planet-in-house-reviewed.json" || !row.body || !row.house) {
    return null;
  }

  const body = bodySlug(row.body);
  const house = bodySlug(row.house);
  const natalBody = typeof row.house_integration === "string" ? row.house_integration : "";
  const horoscopeBody = typeof row.home_scene === "string" ? row.home_scene : "";
  const mappings = [];

  if (natalBody) {
    mappings.push({
      ...row,
      id: `${row.id ?? `cc/planet-in-house/${body}-in-${house}`}#natal-house-integration`,
      __bodyText: natalBody,
      __feedBody: natalBody,
      __sections: {
        house_domain: row.house_domain ?? null,
        house_integration: natalBody,
        surfaceField: "house_integration",
        sourceSurfaces: row.surfaces ?? []
      },
      __targetMapping: {
        action: "MATCH_EXISTING",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `natal.house.${body}.house_${house}`,
        targetSurface: "natal",
        family: "natal-house",
        blockType: "house",
        reason: "Planet-in-house natal field maps to the natal house runtime key. Do not use home_scene here."
      }
    });
  }

  if (horoscopeBody) {
    mappings.push({
      ...row,
      id: `${row.id ?? `cc/planet-in-house/${body}-in-${house}`}#home-scene`,
      __bodyText: horoscopeBody,
      __feedBody: horoscopeBody,
      __sections: {
        house_domain: row.house_domain ?? null,
        home_scene: horoscopeBody,
        surfaceField: "home_scene",
        sourceSurfaces: row.surfaces ?? []
      },
      __targetMapping: {
        action: "NEW_CANONICAL_KEY",
        targetTable: "public.generated_interpretations",
        targetDatabaseKey: `sky.planetary.${body}.house_${house}`,
        targetSurface: "sky",
        family: "planetary-horoscope",
        blockType: "sky_article",
        mode: "feed",
        reason: "Planet-in-house horoscope field maps to the planetary horoscope runtime key. Do not use house_integration here."
      }
    });
  }

  return mappings;
}

function skyPointSurfaceMappings(fileName, row) {
  if (fileName !== "cc-sky-points-authored.json" || !row.point || !row.sign) {
    return null;
  }

  const point = bodySlug(row.point);
  const sign = bodySlug(row.sign);
  const collectiveReading = typeof row.collective_reading === "string" ? row.collective_reading : "";

  if (!collectiveReading) {
    return null;
  }

  return [{
    ...row,
    id: `${row.id ?? `cc/sky-point/${point}-in-${sign}`}#collective-reading`,
    __bodyText: collectiveReading,
    __feedBody: collectiveReading,
    __sections: {
      collective_reading: collectiveReading,
      surfaceField: "collective_reading",
      sourceSurface: row.surface ?? null
    },
    __targetMapping: {
      action: "MATCH_EXISTING",
      targetTable: "public.generated_interpretations",
      targetDatabaseKey: `sky.placement.${point}.${sign}`,
      targetSurface: "sky",
      family: "sky-point-placement",
      blockType: "sky_article",
      reason: "Sky point authored collective_reading maps to the same Sky placement runtime key requested for Chiron/Lilith/node placement pages."
    }
  }];
}

function phrasebankMappingsForRow(fileName, bundle, row, index, batchId) {
  const expandedRows = planetSignSurfaceMappings(fileName, row)
    ?? planetHouseSurfaceMappings(fileName, row)
    ?? skyPointSurfaceMappings(fileName, row);

  if (!expandedRows) {
    return [phrasebankMapping(fileName, bundle, row, index, batchId)];
  }

  return expandedRows.map((expandedRow, offset) => phrasebankMapping(fileName, bundle, expandedRow, index + offset, batchId));
}

function isFeedEligiblePhrasebankMapping(mapping) {
  if (mapping.target_table !== "public.generated_interpretations") return false;
  if (mapping.target_surface === "sky") return false;
  if (!mapping.target_database_key) return false;
  if (mapping.mode !== "in_depth") return false;

  return [
    "sign",
    "house",
    "ruler",
    "natal_aspect",
    "transit_to_natal_aspect",
    "synastry_aspect",
    "composite_aspect",
    "synthesis"
  ].includes(mapping.generated_block_type);
}

function addPhrasebankFeedMappings(mappings) {
  const nextMappings = [...mappings];

  for (const mapping of mappings) {
    if (!isFeedEligiblePhrasebankMapping(mapping)) {
      continue;
    }

    const feedBody = mapping.generated_feed_body ?? mapping.generated_body ?? mapping.text;

    nextMappings.push({
      ...mapping,
      index: nextMappings.length,
      incoming_key: `${mapping.incoming_key}#feed`,
      mode: "feed",
      text: feedBody,
      proposed_normalized_text: mapping.incoming_status === "CONFIRMED" ? feedBody : normalizeDashes(feedBody),
      incoming_text_hash: textHash(feedBody),
      source_hash: textHash(JSON.stringify({
        sourceHash: mapping.source_hash,
        mode: "feed",
        body: feedBody
      })),
      generated_body: feedBody,
      generated_summary: mapping.generated_summary,
      generated_reviewer_notes: `${mapping.generated_reviewer_notes ?? ""} Feed-mode row uses the phrasebank experience/preview field.`.trim(),
      generated_facts: {
        ...(mapping.generated_facts ?? {}),
        phrasebank: {
          ...(mapping.generated_facts?.phrasebank ?? {}),
          modeRole: "feed"
        }
      },
      generated_source_snapshot: {
        ...(mapping.generated_source_snapshot ?? {}),
        modeRole: "feed"
      }
    });
  }

  return nextMappings;
}

function mergeCompositeTypedMappings(mappings) {
  const byKey = new Map();
  const merged = [];

  for (const mapping of mappings) {
    if (mapping.incoming_type !== "cc-composite-typed" || !mapping.target_database_key) {
      merged.push(mapping);
      continue;
    }

    const existing = byKey.get(mapping.target_database_key);
    if (!existing) {
      byKey.set(mapping.target_database_key, mapping);
      merged.push(mapping);
      continue;
    }

    const sections = existing.generated_sections && typeof existing.generated_sections === "object" ? existing.generated_sections : {};
    const nextSections = mapping.generated_sections && typeof mapping.generated_sections === "object" ? mapping.generated_sections : {};
    existing.generated_sections = {
      ...sections,
      byRelationshipType: {
        ...(sections.byRelationshipType ?? {}),
        ...(nextSections.byRelationshipType ?? {})
      },
      relationshipTypesAvailable: Array.from(new Set([
        ...(sections.relationshipTypesAvailable ?? []),
        ...(nextSections.relationshipTypesAvailable ?? [])
      ])),
      meaning: sections.meaning ?? nextSections.meaning
    };
    existing.generated_facts.phrasebank.relationshipTypesAvailable = existing.generated_sections.relationshipTypesAvailable;
    existing.generated_knowledge_ids = Array.from(new Set([
      ...existing.generated_knowledge_ids,
      ...mapping.generated_knowledge_ids
    ]));
    existing.text = [
      existing.text,
      mapping.text
    ].filter(Boolean).join("\n\n");
    existing.incoming_text_hash = textHash(existing.text);
  }

  return merged;
}

function applyCompositeSingleVoiceDefaults(mappings) {
  const singleVoice = new Map(
    mappings
      .filter((mapping) => mapping.incoming_type === "cc-composite-aspect" && mapping.target_database_key)
      .map((mapping) => [mapping.target_database_key, mapping])
  );
  const consumedSingleVoiceKeys = new Set();

  for (const mapping of mappings) {
    if (mapping.incoming_type !== "cc-composite-typed" || !mapping.target_database_key) continue;
    const fallback = singleVoice.get(mapping.target_database_key);
    if (!fallback) continue;

    consumedSingleVoiceKeys.add(mapping.target_database_key);
    mapping.generated_body = fallback.generated_body;
    mapping.generated_sections = {
      ...(mapping.generated_sections ?? {}),
      singleVoiceFallback: {
        body: fallback.generated_body,
        sourceId: fallback.incoming_key
      }
    };
    mapping.text = `${fallback.generated_body}\n\n${JSON.stringify(mapping.generated_sections.byRelationshipType ?? {})}`;
    mapping.incoming_text_hash = textHash(mapping.text);
  }

  for (const mapping of mappings) {
    if (mapping.incoming_type !== "cc-composite-aspect" || !consumedSingleVoiceKeys.has(mapping.target_database_key)) {
      continue;
    }

    mapping.action = "SKIP";
    mapping.reason = "Single-voice composite text is folded into the typed composite row as the default body.";
    mapping.conflict_result = "COMPOSITE_SINGLE_VOICE_MERGED";
    mapping.target_table = null;
    mapping.target_database_key = null;
    mapping.target_surface = null;
    mapping.mapped_status = null;
    mapping.surface_eligibility = [];
  }
}

export function mapPhrasebank(options = {}) {
  const phrasebankDir = options.phrasebankDir ?? defaultPhrasebankDir;
  const phrasebankPath = path.join(phrasebankDir, "phrasebank");
  const existingRows = options.existingRows ? normalizeDatabaseSnapshot(options.existingRows) : null;
  const batchId = options.batchId ?? "tldr-phrasebank-dry-run-test";
  const files = fs.readdirSync(phrasebankPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  const mappings = [];
  let index = 0;

  for (const fileName of files) {
    const filePath = path.join(phrasebankPath, fileName);
    if (phrasebankReferenceFiles.has(fileName)) {
      const bundle = readJson(filePath);
      const rows = phrasebankArray(bundle);

      for (const row of rows) {
        const text = phrasebankText(row);
        const sourceKeys = phrasebankSourceKeys(row);
        mappings.push({
          index: index++,
          incoming_key: row.id ?? `phrasebank-reference/${fileName}:${index}`,
          incoming_type: fileName.replace(/\.json$/, ""),
          incoming_category: "editorial-reference",
          incoming_scope: JSON.stringify({ file: fileName, tier: phrasebankTier(fileName, bundle, row) }),
          existing_runtime_key: null,
          target_database_key: null,
          target_table: null,
          target_content_family: "editorial-reference",
          surface_eligibility: [],
          relationship_context: null,
          incoming_status: "SKIPPED_REFERENCE",
          mapped_status: null,
          lane: "reference",
          provenance: sourceKeys.join(", "),
          review: null,
          action: "SKIP",
          reason: "Editorial quote/template phrasebank row is intentionally excluded from generated_interpretations import.",
          conflict_result: "PHRASEBANK_REFERENCE_FILE_SKIPPED",
          flags: [flag("PHRASEBANK_SUPPORT_FILE_SKIPPED", "Explicit phrasebank editorial quote/template library skip.")],
          source_file: `tldr-astro-phrasebank/phrasebank/${fileName}`,
          section_ref: row.id ?? String(index),
          text,
          proposed_normalized_text: text,
          incoming_text_hash: textHash(text),
          source_hash: textHash(JSON.stringify({ fileName, row })),
          source_manifest_version: "tldr-astro-phrasebank-20260714-v8",
          import_batch_id: batchId,
          import_source: "tldr-astro-phrasebank-20260714-v8",
          mode: "in_depth",
          target_date: null,
          target_surface: null,
          existing_status: null,
          existing_text_hash: null,
          existing_provenance: null
        });
      }

      continue;
    }

    if (phrasebankSupportFiles.has(fileName)) {
      const isReferenceLibrary = phrasebankReferenceFiles.has(fileName);
      const skipped = {
        index: index++,
        incoming_key: `phrasebank-support/${fileName}`,
        incoming_type: fileName.replace(/\.json$/, ""),
        incoming_category: "support-reference",
        incoming_scope: JSON.stringify({ file: fileName }),
        existing_runtime_key: null,
        target_database_key: null,
        target_table: null,
        target_content_family: "support-reference",
        surface_eligibility: [],
        relationship_context: null,
        incoming_status: "SKIPPED_SUPPORT",
        mapped_status: null,
        lane: "reference",
        provenance: null,
        review: null,
        action: "SKIP",
        reason: "Support/reference phrasebank file is intentionally excluded from generated_interpretations import.",
        conflict_result: "PHRASEBANK_SUPPORT_FILE_SKIPPED",
        flags: [flag("PHRASEBANK_SUPPORT_FILE_SKIPPED", "Explicit phrasebank support/model file skip.")],
        source_file: `tldr-astro-phrasebank/phrasebank/${fileName}`,
        section_ref: fileName,
        text: "",
        proposed_normalized_text: "",
        incoming_text_hash: textHash(""),
        source_hash: textHash(fileName),
        source_manifest_version: "tldr-astro-phrasebank-20260714-v8",
        import_batch_id: batchId,
        import_source: "tldr-astro-phrasebank-20260714-v8",
        mode: "in_depth",
        target_date: null,
        target_surface: null,
        existing_status: null,
        existing_text_hash: null,
        existing_provenance: null
      };
      mappings.push(skipped);
      continue;
    }

    const bundle = readJson(filePath);
    const rows = fileName === "cc-slot-resolution-map.json" ? slotResolutionRows(bundle) : phrasebankArray(bundle);

    for (const row of rows) {
      const rowMappings = phrasebankMappingsForRow(fileName, bundle, row, index, batchId);
      mappings.push(...rowMappings);
      index += rowMappings.length;
    }
  }

  const merged = mergeCompositeTypedMappings(mappings);
  applyCompositeSingleVoiceDefaults(merged);
  const withFeedRows = addPhrasebankFeedMappings(merged);
  applyDuplicateAndConflictRules(withFeedRows, existingRows);
  return withFeedRows;
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values) {
  if (!values?.length) return "array[]::text[]";
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

export function generatedRowForMapping(mapping) {
  const generatedFacts = mapping.generated_facts ?? {};
  const generatedSourceSnapshot = mapping.generated_source_snapshot ?? {};
  const generatedKnowledgeIds = mapping.generated_knowledge_ids ?? [mapping.incoming_key];
  const phrasebankFlags = mapping.flags.map((item) => item.flag);

  return {
    content_key: mapping.target_database_key,
    surface: mapping.target_surface,
    mode: mapping.mode,
    status: "DRAFT",
    lane: mapping.lane === "serving" ? "serving" : "reference",
    review_state: mapping.review ?? null,
    event_type: mapping.generated_event_type ?? mapping.target_content_family,
    target_date: null,
    facts: {
      ...generatedFacts,
      tldrStore: {
        originalKey: mapping.incoming_key,
        lane: mapping.lane,
        sourceStatus: mapping.incoming_status,
        review: mapping.review,
        action: mapping.action,
        targetContentFamily: mapping.target_content_family,
        surfaceEligibility: mapping.surface_eligibility,
        importBatchId: mapping.import_batch_id,
        sourceManifestVersion: mapping.source_manifest_version,
        flags: phrasebankFlags
      }
    },
    knowledge_ids: generatedKnowledgeIds,
    source_snapshot: {
      ...generatedSourceSnapshot,
      source: mapping.import_source,
      originalKey: mapping.incoming_key,
      provenance: mapping.provenance,
      sourceFile: mapping.source_file,
      sectionRef: mapping.section_ref,
      sourceHash: mapping.source_hash,
      importBatchId: mapping.import_batch_id,
      servingRule: "Imported rows stay DRAFT. Runtime and RLS require LIVE + lane=serving + review_state IS NULL."
    },
    prompt_version: mapping.generated_prompt_version ?? "tldr-store-v17-dry-run",
    provider: mapping.generated_provider ?? "manual",
    model: mapping.generated_model ?? (mapping.import_source.startsWith("tldr-astro-phrasebank") ? "compiled-phrasebank-import" : "compiled-store-import"),
    headline: mapping.generated_headline ?? titleFromKey(mapping.incoming_key),
    summary: mapping.generated_summary ?? [mapping.incoming_type, mapping.incoming_category, mapping.lane, mapping.incoming_status].filter(Boolean).join(" · "),
    body: mapping.generated_body ?? mapping.text,
    sections: mapping.generated_sections ?? [],
    block_type: mapping.generated_block_type ?? null,
    reviewer_notes: mapping.generated_reviewer_notes ?? `Dry-run mapped from ${mapping.incoming_key}. Action: ${mapping.action}. Reason: ${mapping.reason}`
  };
}

function insertValue(row) {
  return `  (
    ${sqlString(row.content_key)},
    ${sqlString(row.surface)},
    ${sqlString(row.mode)},
    ${sqlString(row.status)},
    ${sqlString(row.lane)},
    ${sqlString(row.review_state)},
    ${sqlString(row.event_type)},
    null,
    ${sqlJson(row.facts)},
    ${sqlTextArray(row.knowledge_ids)},
    ${sqlJson(row.source_snapshot)},
    ${sqlString(row.prompt_version)},
    ${sqlString(row.provider)},
    ${sqlString(row.model)},
    ${sqlString(row.headline)},
    ${sqlString(row.summary)},
    ${sqlString(row.body)},
    ${sqlJson(row.sections)},
    ${sqlString(row.block_type)},
    ${sqlString(row.reviewer_notes)},
    ${sqlTextArray(row.facts.tldrStore.flags)}
  )`;
}

export function eligibleGeneratedMappings(mappings) {
  return mappings.filter((mapping) => {
    if (!["MATCH_EXISTING", "NEW_CANONICAL_KEY"].includes(mapping.action)) return false;
    if (mapping.target_table !== "public.generated_interpretations") return false;
    if (mapping.flags.some((item) => item.blocking)) return false;
    return true;
  });
}

function writeSql(mappings, outDir, batchId) {
  const rows = eligibleGeneratedMappings(mappings).map(generatedRowForMapping);
  const columns = [
    "content_key",
    "surface",
    "mode",
    "status",
    "lane",
    "review_state",
    "event_type",
    "target_date",
    "facts",
    "knowledge_ids",
    "source_snapshot",
    "prompt_version",
    "provider",
    "model",
    "headline",
    "summary",
    "body",
    "sections",
    "block_type",
    "reviewer_notes",
    "flags"
  ];

  const chunks = [];
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    chunks.push(`insert into public.generated_interpretations (${columns.join(", ")})\nvalues\n${batch.map(insertValue).join(",\n")}\non conflict (content_key, target_date, mode) do nothing;`);
  }

  const sql = [
    "-- TLDR Astro Store Import Dry-Run SQL Plan.",
    "-- Generated by scripts/prepare-tldr-astro-store-import.mjs.",
    "-- Mode: DRY RUN. This file was generated only; Codex did not execute it.",
    "-- No imported row is promoted to LIVE.",
    "-- Existing rows are not overwritten: conflict behavior is DO NOTHING.",
    `-- Import batch: ${batchId}`,
    "",
    "begin;",
    "",
    rows.length ? chunks.join("\n\n") : "-- No eligible generated_interpretations inserts. Resolve blocking mapping flags before import.",
    "",
    "-- Verification step for a future execution:",
    `-- select count(*) from public.generated_interpretations where source_snapshot->>'importBatchId' = ${sqlString(batchId)};`,
    "",
    "commit;",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "tldr-astro-store-import.sql"), sql);
  return rows.length;
}

function writeRollbackSql(outDir, batchId) {
  const sql = [
    "-- TLDR Astro Store Import Rollback Plan.",
    "-- Not executed by Codex.",
    "-- Deletes only non-LIVE rows created by this import batch.",
    "",
    "begin;",
    "",
    "delete from public.generated_interpretations",
    `where source_snapshot->>'importBatchId' = ${sqlString(batchId).slice(1, -1) ? sqlString(batchId) : "null"}`,
    "  and status <> 'LIVE';",
    "",
    "-- Optional source-row rollback if reference rows are imported in a future phase:",
    "-- delete from public.source_rows",
    `-- where raw_fields->>'importBatchId' = ${sqlString(batchId)};`,
    "",
    "commit;",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "tldr-astro-store-import-rollback.sql"), sql);
}

function csvValue(value) {
  const text = Array.isArray(value)
    ? value.map((item) => item && typeof item === "object" ? JSON.stringify(item) : String(item ?? "")).join("|")
    : value && typeof value === "object"
      ? JSON.stringify(value)
      : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => first.localeCompare(second)));
}

function flattenFlagRows(mappings) {
  return mappings.flatMap((mapping) => mapping.flags.map((item) => ({
    incoming_key: mapping.incoming_key,
    action: mapping.action,
    lane: mapping.lane,
    status: mapping.incoming_status,
    flag: item.flag,
    reason: item.reason,
    blocking: item.blocking,
    resolution: item.resolution,
    source_file: mapping.source_file,
    section_ref: mapping.section_ref
  })));
}

function reportObject(mappings, options, generatedSqlRows) {
  const flagRows = flattenFlagRows(mappings);
  const blockingRows = mappings.filter((mapping) => mapping.flags.some((item) => item.blocking));

  return {
    mode: "DRY RUN",
    sqlGenerated: true,
    sqlExecuted: false,
    databaseChanged: false,
    inputPath: options.phrasebankMode ? options.phrasebankDir : options.inputPath,
    outputDir: options.outDir,
    importBatchId: options.batchId,
    publishApprovedRequested: options.publishApprovedRequested,
    publishApprovedEnabled: false,
    incomingRecords: mappings.length,
    mappedToExistingKeys: mappings.filter((mapping) => mapping.action === "MATCH_EXISTING").length,
    newCanonicalKeys: mappings.filter((mapping) => mapping.action === "NEW_CANONICAL_KEY").length,
    referenceOnly: mappings.filter((mapping) => mapping.action === "REFERENCE_ONLY").length,
    unmapped: mappings.filter((mapping) => mapping.action === "UNMAPPED").length,
    conflicted: mappings.filter((mapping) => mapping.action === "CONFLICT").length,
    skipped: mappings.filter((mapping) => mapping.action === "SKIP").length,
    skippedIdentical: mappings.filter((mapping) => mapping.flags.some((item) => item.flag === "SKIP_IDENTICAL")).length,
    eligibleDraftInserts: generatedSqlRows,
    eligibleDraftUpdates: 0,
    protectedLiveRows: mappings.filter((mapping) => mapping.flags.some((item) => item.flag === "LIVE_ROW_PROTECTED")).length,
    failedValidation: blockingRows.length,
    byIncomingType: countBy(mappings, (mapping) => mapping.incoming_type),
    byRuntimeFamily: countBy(mappings, (mapping) => mapping.target_content_family),
    byAction: countBy(mappings, (mapping) => mapping.action),
    byIncomingStatus: countBy(mappings, (mapping) => mapping.incoming_status),
    byMappedStatus: countBy(mappings, (mapping) => mapping.mapped_status ?? "not-imported"),
    byLane: countBy(mappings, (mapping) => mapping.lane),
    bySurfaceEligibility: countBy(mappings.flatMap((mapping) => mapping.surface_eligibility), (surface) => surface),
    multipleEligibleSurfaces: mappings.filter((mapping) => mapping.surface_eligibility.length > 1).length,
    noReaderFacingEligibility: mappings.filter((mapping) => mapping.surface_eligibility.length === 0 || mapping.surface_eligibility.includes("generation-reference")).length,
    byFlag: countBy(flagRows, (row) => row.flag),
    rowLevelFlagCount: flagRows.length,
    safetyFinding: options.phrasebankMode
      ? "Phrasebank rows are imported as DRAFT only. CONFIRMED means serve verbatim after admin publication, not serve automatically. REVIEWED and SESSION_APPROVED_DRAFT retain non-null review_state until sign-off."
      : "Runtime serving now needs LIVE plus import guard checks. Reference/paraphrase/manual/quarantine/deprecated rows are blocked by mapping and should be blocked by row guard if ever present.",
    databaseComparison: options.existingRowsPath ? "snapshot supplied" : "not run; existing-row snapshot not supplied"
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdownReport(report, outDir) {
  const lines = [
    "# TLDR Astro Store Import Dry-Run Report",
    "",
    `Generated from \`${report.inputPath}\`.`,
    "",
    "## Import State",
    "",
    `- Mode: ${report.mode}`,
    `- SQL generated: ${report.sqlGenerated ? "yes" : "no"}`,
    `- SQL executed: ${report.sqlExecuted ? "yes" : "no"}`,
    `- Database changed: ${report.databaseChanged ? "yes" : "no"}`,
    `- Import batch: \`${report.importBatchId}\``,
    `- Publish approved requested: ${report.publishApprovedRequested ? "yes" : "no"}`,
    `- Publish approved enabled: ${report.publishApprovedEnabled ? "yes" : "no"}`,
    "",
    "## Accounting",
    "",
    `- Incoming records: ${report.incomingRecords}`,
    `- Mapped to existing keys: ${report.mappedToExistingKeys}`,
    `- New canonical keys: ${report.newCanonicalKeys}`,
    `- Reference-only: ${report.referenceOnly}`,
    `- Unmapped: ${report.unmapped}`,
    `- Conflicted: ${report.conflicted}`,
    `- Skipped: ${report.skipped}`,
    `- Skipped identical: ${report.skippedIdentical}`,
    `- Eligible DRAFT inserts: ${report.eligibleDraftInserts}`,
    `- Eligible DRAFT updates: ${report.eligibleDraftUpdates}`,
    `- Protected LIVE rows: ${report.protectedLiveRows}`,
    `- Failed validation: ${report.failedValidation}`,
    "",
    "## Classification Counts",
    "",
    "### By Content Type",
    ...Object.entries(report.byIncomingType).map(([key, value]) => `- \`${key}\`: ${value}`),
    "",
    "### By Runtime Family",
    ...Object.entries(report.byRuntimeFamily).map(([key, value]) => `- \`${key}\`: ${value}`),
    "",
    "### By Surface Eligibility",
    ...Object.entries(report.bySurfaceEligibility).map(([key, value]) => `- \`${key}\`: ${value}`),
    "",
    `- Records with multiple eligible surfaces: ${report.multipleEligibleSurfaces}`,
    `- Records with no reader-facing eligibility/reference-only: ${report.noReaderFacingEligibility}`,
    "",
    "## Flags",
    "",
    ...Object.entries(report.byFlag).map(([key, value]) => `- \`${key}\`: ${value}`),
    "",
    "## Safety Notes",
    "",
    "- No imported record is mapped to LIVE.",
    "- No blanket `store/` prefix is used.",
    "- Reference rows are not emitted as reader-facing generated_interpretations rows.",
    "- CONFIRMED phrasebank rows are DRAFT by default; an admin must explicitly publish them.",
    "- Reviewed phrasebank rows are not tagged REFERENCE_ONLY_NEVER_SERVE_VERBATIM unless they are true source/reference material.",
    "- Generated SQL uses `on conflict ... do nothing`, not destructive upserts.",
    report.databaseComparison === "snapshot supplied"
      ? "- Existing database comparison used the supplied `--existing-rows` snapshot."
      : "- Existing database comparison was not run unless an `--existing-rows` snapshot was supplied.",
    "- This report is not import-ready while blocking flags remain."
  ];

  fs.writeFileSync(path.join(outDir, "tldr-astro-store-import-report.md"), `${lines.join("\n")}\n`);
}

function writeStatusReport(outDir) {
  const lines = [
    "# TLDR Astro Store Import Status Mapping",
    "",
    "| Incoming status | Repository mapped status | Runtime eligibility | Notes |",
    "| --- | --- | --- | --- |",
    "| CONFIRMED | DRAFT | Human publication required | Never promoted to LIVE by importer. |",
    "| APPROVED | DRAFT | Human publication required | Never promoted to LIVE by importer. |",
    "| DRAFT | DRAFT | Not servable | Editorial review required. |",
    "| REFERENCE_ONLY | source/reference only | Not servable | Never serve verbatim. |",
    "| MANUAL_ONLY | skipped | Not servable | Requires human-authored replacement. |",
    "| RAW_QUARANTINE | skipped | Not servable | Excluded from active import. |",
    "| DEPRECATED | skipped | Not servable | Excluded from active import. |",
    ""
  ];
  fs.writeFileSync(path.join(outDir, "tldr-astro-store-import-status-map.md"), lines.join("\n"));
}

function writeRepositoryMap(outDir) {
  const lines = [
    "# TLDR Astro Import Repository Map",
    "",
    "- Supabase public generated content table: `/Users/mprez/Code/tldrastro/apps/web/supabase/migrations/20260604183000_generated_interpretations.sql`",
    "- Source/reference tables: `/Users/mprez/Code/tldrastro/apps/web/supabase/migrations/20260710110000_career_content_import_fields.sql`",
    "- Runtime generated-content reader: `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContent.ts`",
    "- Serving guard migration: `/Users/mprez/Code/tldrastro/apps/web/supabase/migrations/20260711110000_generated_content_serving_lane.sql`",
    "- Runtime key constructors: `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContentKeys.ts`",
    "- Content dashboard: `/Users/mprez/Code/tldrastro/apps/admin/src/GeneratedContentAdminDashboard.tsx`",
    "- Admin generated-content API: `/Users/mprez/Code/tldrastro/api/admin/generated-content.ts`",
    "- Admin review API: `/Users/mprez/Code/tldrastro/api/admin/review-records.ts`",
    "- Generation endpoint: `/Users/mprez/Code/tldrastro/api/generate-content.ts`",
    "- Generation implementation: `/Users/mprez/Code/tldrastro/api/_lib/content-generation.ts`",
    "- User/private generated rows: `/Users/mprez/Code/tldrastro/apps/web/supabase/migrations/20260618120000_user_generated_interpretations.sql`",
    "- Calendar resolver: `/Users/mprez/Code/tldrastro/apps/web/src/features/calendar/lunarDayResolver.ts`",
    "- Manual chart/person model: `/Users/mprez/Code/tldrastro/apps/web/src/services/manualCharts.ts`",
    "- Pronouns: `/Users/mprez/Code/tldrastro/apps/web/src/services/personReferences.ts`",
    ""
  ];
  fs.writeFileSync(path.join(outDir, "tldr-astro-store-import-repository-map.md"), lines.join("\n"));
}

function writeBeforeAfter(outDir) {
  const lines = [
    "# TLDR Astro Store Import Before/After",
    "",
    "| Concern | Previous dry run | Corrected dry run |",
    "| --- | --- | --- |",
    "| Key namespace | Prefixed all keys with `store/` | No blanket prefix; each row maps to existing key, source row, conflict, skip, or unmapped. |",
    "| Surface classification | Defaulted unknowns to `modifier` | Separates type, runtime family, surface eligibility, lane, and action. |",
    "| Reference rows | Emitted as generated_interpretations DRAFT rows | Routed to reference/source-row concept and excluded from serving SQL. |",
    "| Status mapping | Could publish approved with flag | Importer never emits LIVE. |",
    "| Conflict behavior | Upsert updated non-LIVE rows | SQL plan uses `on conflict do nothing`; conflicts are reported before execution. |",
    "| Row-level flags | Aggregate only | Mapping JSON/CSV and flag CSV include every flag per row. |",
    "| Dash report | Aggregate count only | Separate dash JSON/CSV includes key, lane, source, original text, proposed normalized text, and action. |",
    "| Execution language | `Rows prepared` ambiguous | Report states dry run, SQL generated, SQL executed no, database changed no. |",
    ""
  ];
  fs.writeFileSync(path.join(outDir, "tldr-astro-store-import-before-after.md"), lines.join("\n"));
}

function writeArtifacts(mappings, options) {
  fs.mkdirSync(options.outDir, { recursive: true });
  const generatedSqlRows = writeSql(mappings, options.outDir, options.batchId);
  writeRollbackSql(options.outDir, options.batchId);

  const report = reportObject(mappings, options, generatedSqlRows);
  const flagRows = flattenFlagRows(mappings);
  const conflicts = mappings.filter((mapping) => mapping.action === "CONFLICT");
  const unmapped = mappings.filter((mapping) => mapping.action === "UNMAPPED");
  const dashRows = mappings
    .filter((mapping) => /[\u2013\u2014]/.test(mapping.text))
    .map((mapping) => ({
      key: mapping.incoming_key,
      lane: mapping.lane,
      status: mapping.incoming_status,
      source_file: mapping.source_file,
      section_ref: mapping.section_ref,
      original_text: mapping.text,
      dash_type: dashTypes(mapping.text).join(", "),
      proposed_normalized_text: mapping.proposed_normalized_text,
      import_action: mapping.action
    }));

  const mappingColumns = [
    "incoming_key",
    "incoming_type",
    "incoming_category",
    "incoming_scope",
    "existing_runtime_key",
    "target_database_key",
    "target_table",
    "target_content_family",
    "surface_eligibility",
    "relationship_context",
    "incoming_status",
    "mapped_status",
    "lane",
    "provenance",
    "review",
    "action",
    "reason",
    "conflict_result",
    "flags",
    "source_file",
    "section_ref"
  ];

  writeJson(path.join(options.outDir, "tldr-astro-store-import-report.json"), report);
  writeMarkdownReport(report, options.outDir);
  writeJson(path.join(options.outDir, "tldr-astro-store-import-mapping.json"), mappings);
  writeCsv(path.join(options.outDir, "tldr-astro-store-import-mapping.csv"), mappings, mappingColumns);
  writeJson(path.join(options.outDir, "tldr-astro-store-import-flags.json"), flagRows);
  writeCsv(path.join(options.outDir, "tldr-astro-store-import-flags.csv"), flagRows, ["incoming_key", "action", "lane", "status", "flag", "reason", "blocking", "resolution", "source_file", "section_ref"]);
  writeJson(path.join(options.outDir, "tldr-astro-store-import-conflicts.json"), conflicts);
  writeCsv(path.join(options.outDir, "tldr-astro-store-import-conflicts.csv"), conflicts, mappingColumns);
  writeJson(path.join(options.outDir, "tldr-astro-store-import-unmapped.json"), unmapped);
  writeCsv(path.join(options.outDir, "tldr-astro-store-import-unmapped.csv"), unmapped, mappingColumns);
  writeJson(path.join(options.outDir, "tldr-astro-store-import-dash-report.json"), dashRows);
  writeCsv(path.join(options.outDir, "tldr-astro-store-import-dash-report.csv"), dashRows, ["key", "lane", "status", "source_file", "section_ref", "original_text", "dash_type", "proposed_normalized_text", "import_action"]);
  writeStatusReport(options.outDir);
  writeRepositoryMap(options.outDir);
  writeBeforeAfter(options.outDir);

  return report;
}

export function runImporter(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const existingRows = options.existingRowsPath ? JSON.parse(fs.readFileSync(options.existingRowsPath, "utf8")) : null;
  const mappings = options.phrasebankMode
    ? mapPhrasebank({
        batchId: options.batchId,
        existingRows,
        phrasebankDir: options.phrasebankDir
      })
    : mapRecords(readStore(options.inputPath), {
        batchId: options.batchId,
        existingRows,
        sourceManifestVersion: "tldr-store-v17"
      });
  const report = writeArtifacts(mappings, options);

  console.log(`Mode: ${report.mode}`);
  console.log(`SQL executed: ${report.sqlExecuted ? "yes" : "no"}`);
  console.log(`Database changed: ${report.databaseChanged ? "yes" : "no"}`);
  console.log(`Incoming records: ${report.incomingRecords}`);
  console.log(`Mapped to existing keys: ${report.mappedToExistingKeys}`);
  console.log(`Reference-only: ${report.referenceOnly}`);
  console.log(`Unmapped: ${report.unmapped}`);
  console.log(`Conflicted: ${report.conflicted}`);
  console.log(`Eligible DRAFT inserts: ${report.eligibleDraftInserts}`);
  console.log(`Report: ${path.join(options.outDir, "tldr-astro-store-import-report.md")}`);

  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runImporter();
}
