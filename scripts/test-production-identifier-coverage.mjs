#!/usr/bin/env node
/**
 * Build-time coverage assertion for production legacy identifiers.
 *
 * Why this exists
 * ---------------
 * `prepareProductionPreCallGate` runs `buildProductionCatalogEvidence` on every
 * non-report generation, unconditionally. `WRITING_KERNEL_GOVERNED_SURFACES`
 * only controls whether the governed prompt is appended; it does not control
 * whether identifier mapping runs. So an identifier the adapter cannot map is
 * not a future migration risk. It is a live 500 for whoever hits it first.
 *
 * The adapter maps by regex, not by table, so "the table has 1,092 entries" is
 * not coverage. Coverage means: for every identifier a production code path can
 * emit, mapping succeeds AND the canonical ID exists in the catalog.
 *
 * Two guards
 * ----------
 * 1. RESOLUTION. Every enumerated identifier maps to canonical IDs present in
 *    the index. New unresolved identifiers fail the build.
 *
 * 2. NO SILENT MISPARSE. This is the more important one. Several matchers use a
 *    greedy `([a-z0-9-]+)` in the subject slot, so a near-miss swallows its own
 *    prefix and yields a plausible-looking wrong ID rather than refusing:
 *
 *      synastry-venus-in-house-4  ->  house-overlay/synastry_venus_in/4
 *      sky-venus-in-taurus        ->  placement-sign/sky-venus/taurus
 *      composite-venus-in-taurus  ->  placement-sign/composite-venus/taurus
 *
 *    Today these are caught only because those IDs happen to be absent from the
 *    catalog. That is luck, not a gate. If such an ID ever existed, the writer
 *    would be handed evidence for the wrong subject and nothing would notice.
 *    So we assert the subject segment is a known body/point, independently of
 *    whether the ID resolves.
 *
 * Quarantine
 * ----------
 * Known-unresolved identifiers live in config/production-identifier-quarantine.json,
 * shrink-only, same contract as the drift allowlist. Each entry names the file
 * and line that emits it. The build fails when a new one appears, and also when
 * a quarantined one starts resolving, so fixed entries cannot be left behind.
 *
 * Usage: node scripts/test-production-identifier-coverage.mjs [--report]
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapter = require(path.join(root, "src/astro-writing/productionEvidenceAdapter.cjs"));
const resolver = require(path.join(root, "packages/astro-knowledge/scripts/knowledge-resolver.js"));
const index = JSON.parse(fs.readFileSync(path.join(root, "packages/astro-knowledge/generated/knowledge-index.json"), "utf8"));
const quarantinePath = path.join(root, "config/production-identifier-quarantine.json");
const reportOnly = process.argv.includes("--report");
const writeQuarantine = process.argv.includes("--write-quarantine");

// Bind enumeration to the production-owned emitter grammars. If an emitter
// changes shape, CI must update the bridge and this audit in the same change.
const emitterSource = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const emitterBindings = [
  ["apps/web/src/App.tsx", /transitNatalContentId\(transit\.transitPlanet, transit\.aspect, transit\.natalPoint\)/u],
  ["api/admin/prepopulate-content.ts", /knowledgeIds: \["natal-moon-trine-saturn", "moon-trine-saturn"\]/u],
  ["api/admin/prepopulate-content.ts", /knowledgeIds: \["synastry-venus-in-4-house", "relationship-venus-in-4-house", "personal-planet-house4"\]/u],
  ["api/admin/prepopulate-content.ts", /knowledgeIds: \["composite-venus-house-4", "composite-venus-house4", "venus-house-4"\]/u],
  ["services/tldrastro-api/src/tldrastro_api/services/transits.py", /f"transit-natal-\{transit_slug\}-\{aspect_slug\}-\{natal_slug\}"/u],
  ["services/tldrastro-api/src/tldrastro_api/services/personal_timing.py", /f"timing-profection-house-\{profections\.annual\.house\}"/u],
  ["services/tldrastro-api/src/tldrastro_api/services/personal_timing.py", /f"timing-profection-ruler-\{profections\.annual\.ruler\.lower\(\)\}"/u],
  ["services/tldrastro-api/src/tldrastro_api/services/report_window.py", /f"authored\/transit-return\/\{planet\.lower\(\)\.replace\(' ', '-'\)\}"/u],
  ["services/tldrastro-api/src/tldrastro_api/services/synastry.py", /f"synastry-\{point_slug\}-in-house-\{house\}"/u],
  ["services/tldrastro-api/src/tldrastro_api/services/synastry.py", /f"relationship-\{point_slug\}-in-house-\{house\}"/u],
  ["apps/web/src/content/domainRegistry.ts", /return `sky-\$\{placementContentId\(planet, sign\)\}`/u],
  ["api/admin/review-records.ts", /`composite-\$\{slug\(position\.planet\)\}-in-\$\{slug\(position\.sign\)\}`/u]
];
for (const [relative, pattern] of emitterBindings) {
  assert.match(emitterSource(relative), pattern, `Production identifier emitter changed: ${relative}`);
}

// ---------------------------------------------------------------- vocabulary
// Derived from the catalog itself, not restated, so it cannot drift from it.
const KNOWN_SUBJECTS = new Set(index.objects
  .filter((object) => object.id.startsWith("body/"))
  .map((object) => object.id.slice("body/".length)));
// Matchers 12/13/14 emit the raw regex group rather than canonicalBody, so the
// hyphenated spellings are legitimate subjects in those namespaces.
for (const subject of [...KNOWN_SUBJECTS]) KNOWN_SUBJECTS.add(subject.replace(/_/gu, "-"));
KNOWN_SUBJECTS.add("personal_planet");
KNOWN_SUBJECTS.add("personal-planet");

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const HOUSES = Array.from({ length: 12 }, (_, i) => i + 1);
const SKY_POINTS = JSON.parse(fs.readFileSync(path.join(root, "services/tldrastro-api/src/tldrastro_api/data/sky_aspect_profile.json"), "utf8"))
  .points.map((point) => String(point.id ?? point.name ?? point).toLowerCase().replace(/\s+/gu, "-"));
const SKY_ASPECTS = ["conjunction", "sextile", "square", "trine", "quincunx", "opposition"];
// services/.../chart.py ASPECT_DEFINITIONS and apps/web/src/services/chartMath.ts — five, no quincunx.
const CHART_ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"];
const NATAL_POINTS = [...SKY_POINTS, "ascendant", "descendant", "midheaven", "imum-coeli"];

/** One enumerated identifier plus where production emits it. */
const emitted = [];
const impossible = [];

const { aspectPossibilityForKind } = require(path.join(root, "src/astro-writing/aspectPossibility.cjs"));
const ASPECT_WORDS = "conjunction|opposition|square|trine|sextile|quincunx|semisextile";
const ASPECT_IN_IDENTIFIER = new RegExp(`^([a-z0-9_-]+?)-(${ASPECT_WORDS})-([a-z0-9_-]+)$`, "u");

/**
 * Which chart an identifier describes. This decides whether the physical
 * limits bind at all: they hold within one chart and say nothing across two.
 * Transiting Sun square natal Sun is ordinary; one person's Mercury can sit
 * anywhere relative to another's Sun.
 */
const CHART_KIND_PREFIX = [
  ["transit-natal-", "transit"],
  ["you-transit-v3-", "transit"],
  ["synastry-", "synastry"],
  ["relationship-", "synastry"],
  ["composite-", "composite"],
  ["natal-", "natal"],
  ["sky-", "sky"]
];

/**
 * Skip aspects that cannot physically occur in the chart being described.
 *
 * Mercury and Venus orbit inside Earth and so never appear far from the Sun,
 * ruling out a Sun-Mercury sextile and anything wider. The nodes, the
 * Ascendant/Descendant and the Midheaven/IC are each two ends of one axis and
 * are permanently 180 degrees apart, so within a chart they form no aspect but
 * the opposition. Counting these as missing catalog entries invents a backlog
 * for charts nobody will ever have.
 *
 * Applied only to single-chart kinds. See src/astro-writing/aspectPossibility.cjs.
 */
function impossibleAspectIn(identifier, context) {
  const value = String(identifier);
  const entry = CHART_KIND_PREFIX.find(([prefix]) => value.startsWith(prefix));
  // A bare "sun-square-moon" takes its chart kind from the requesting surface.
  const kind = entry ? entry[1] : ({
    "you-natal": "natal", "you-transit": "transit", "friends-synastry": "synastry", sky: "sky"
  }[context?.evidenceSurface] ?? null);
  if (!kind) return null;

  const match = ASPECT_IN_IDENTIFIER.exec(entry ? value.slice(entry[0].length) : value);
  if (!match) return null;
  const [, left, aspect, right] = match;
  const verdict = aspectPossibilityForKind(kind, left, right, aspect);
  return verdict.possible ? null : { kind, aspect, left, right, ...verdict };
}

const emit = (identifier, context, origin) => {
  const blocked = impossibleAspectIn(identifier, context);
  if (blocked) {
    impossible.push({ identifier, origin, kind: blocked.kind, reason: blocked.reason, detail: blocked.detail });
    return;
  }
  emitted.push({ identifier, context, origin });
};

const SKY = { surface: "sky", evidenceSurface: "sky" };
const YOU_TRANSIT = { surface: "you", evidenceSurface: "you-transit" };
const YOU_NATAL = { surface: "you", evidenceSurface: "you-natal" };
const SYNASTRY = { surface: "synastry", evidenceSurface: "friends-synastry" };
const RELATIONSHIP = { surface: "relationship", evidenceSurface: "friends-synastry" };
const COMPOSITE = { surface: "composite", evidenceSurface: "friends-synastry" };

// ----------------------------------------------------- sky (cron + admin)
// api/cron/generate-sky.ts:71 and api/admin/content-facts.ts:58-60 emit one
// identifier per aspect in currentSkyFacts().aspects, across all point pairs.
for (const from of SKY_POINTS) {
  for (const to of SKY_POINTS) {
    if (from === to) continue;
    for (const aspect of SKY_ASPECTS) emit(`sky-${from}-${aspect}-${to}`, SKY, "api/cron/generate-sky.ts:71");
  }
}
for (const point of SKY_POINTS) {
  emit(`sky-body-${point}`, SKY, "productionEvidenceAdapter identifiersForInput (retrograde)");
  emit(`sky-retrograde-${point}`, SKY, "api/admin/content-facts.ts:236");
  for (const sign of SIGNS) emit(`sky-placement-${point}-${sign}`, SKY, "identifiersForInput (season/lunar-cycle/daily)");
}
for (const sign of SIGNS) {
  emit(`sky-lunation-new-moon-${sign}`, SKY, "identifiersForInput (facts.moonEvent)");
  emit(`sky-lunation-full-moon-${sign}`, SKY, "identifiersForInput (facts.moonEvent)");
}

// -------------------------------------------------- you: transit to natal
// App.tsx:12215 transitNatalContentId + transits.py:219-222 (both spellings).
for (const transiting of SKY_POINTS) {
  for (const natal of NATAL_POINTS) {
    for (const aspect of CHART_ASPECTS) {
      emit(`transit-natal-${transiting}-${aspect}-${natal}`, YOU_TRANSIT, "App.tsx:12215 / transits.py:219");
      emit(`${transiting}-${aspect}-${natal}`, YOU_TRANSIT, "transits.py:221 (bare spelling)");
    }
  }
}
// App.tsx:5515-5522 return knowledge IDs, and the #-suffixed variant at :10555.
for (const identifier of ["saturn-return", "jupiter-return-cycle", "nodal-return-cycle", "planetary-return-framework"]) {
  emit(identifier, YOU_TRANSIT, "App.tsx:5515-5522");
}
emit("planetary-return-framework#retrograde-return-series", YOU_TRANSIT, "App.tsx:10555");

// ------------------------------------------------------------- you: natal
for (const a of NATAL_POINTS) {
  for (const b of NATAL_POINTS) {
    if (a === b) continue;
    for (const aspect of CHART_ASPECTS) emit(`natal-${a}-${aspect}-${b}`, YOU_NATAL, "api/admin/prepopulate-content.ts:318");
  }
}
for (const point of NATAL_POINTS) {
  for (const sign of SIGNS) emit(`natal-${point}-in-${sign}`, YOU_NATAL, "api/admin/prepopulate-content.ts:283");
  for (const house of HOUSES) emit(`natal-${point}-in-house${house}`, YOU_NATAL, "api/admin/prepopulate-content.ts:283");
}
for (const house of HOUSES) emit(`house${house}`, YOU_NATAL, "api/admin/prepopulate-content.ts:439");

// ----------------------------------------------------- synastry / composite
for (const a of NATAL_POINTS) {
  for (const b of NATAL_POINTS) {
    if (a === b) continue;
    for (const aspect of CHART_ASPECTS) {
      emit(`synastry-${a}-${aspect}-${b}`, SYNASTRY, "api/admin/prepopulate-content.ts:401");
      emit(`relationship-${a}-${aspect}-${b}`, RELATIONSHIP, "api/admin/prepopulate-content.ts:401");
      emit(`composite-${a}-${aspect}-${b}`, COMPOSITE, "api/admin/prepopulate-content.ts:461");
    }
  }
}
for (const point of NATAL_POINTS) {
  for (const house of HOUSES) {
    emit(`synastry-${point}-in-${house}-house`, SYNASTRY, "api/admin/prepopulate-content.ts:439");
    emit(`composite-${point}-house-${house}`, COMPOSITE, "api/admin/prepopulate-content.ts:495");
  }
}
for (const body of ["saturn", "pluto", "jupiter", "mars", "venus"]) {
  emit(`friends-circle-${body}`, RELATIONSHIP, "api/admin/prepopulate-content.ts:531");
  emit(`relationship-timing-${body}`, RELATIONSHIP, "api/admin/prepopulate-content.ts:516");
}

// ------------------------------- python services: emitted but never audited
for (const house of HOUSES) emit(`timing-profection-house-${house}`, YOU_NATAL, "services/.../personal_timing.py:93");
for (const ruler of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]) {
  emit(`timing-profection-ruler-${ruler}`, YOU_NATAL, "services/.../personal_timing.py:96");
}
for (const planet of ["jupiter", "saturn", "uranus", "neptune", "pluto"]) {
  emit(`authored/transit-return/${planet}`, YOU_TRANSIT, "services/.../report_window.py:378");
}
for (const point of ["venus", "mars", "saturn", "sun", "moon"]) {
  for (const house of HOUSES) {
    emit(`synastry-${point}-in-house-${house}`, SYNASTRY, "services/.../synastry.py:170");
    emit(`relationship-${point}-in-house-${house}`, RELATIONSHIP, "services/.../synastry.py:171");
  }
}
for (const point of ["sun", "moon", "venus", "mars"]) {
  for (const sign of SIGNS) {
    emit(`sky-${point}-in-${sign}`, SKY, "apps/web/src/content/domainRegistry.ts:303");
    emit(`composite-${point}-in-${sign}`, COMPOSITE, "api/admin/review-records.ts:1217");
  }
}

// -------------------------------------------------------------------- run
const SUBJECT_NAMESPACES = ["placement-sign", "placement-house", "house-overlay", "composite-placement", "body"];

/**
 * A canonical ID whose subject slot is not a known body means the matcher
 * swallowed part of the prefix rather than refusing. Checked even for IDs that
 * failed to resolve, because "absent from the catalog" is the only thing
 * currently stopping them, and that is luck rather than a gate.
 */
function misparseOf(canonicalId) {
  const [namespace, subject] = String(canonicalId).split("/");
  if (!SUBJECT_NAMESPACES.includes(namespace)) return null;
  return KNOWN_SUBJECTS.has(subject) ? null : subject;
}

// Two failure kinds, deliberately not merged:
//   unmapped     the identifier SHAPE is unrecognized -> a wiring bug
//   missing      the shape is fine, the catalog lacks the entry -> a content gap
const unmapped = [];
const missing = [];
const misparsed = [];
const permissionMissing = [];
const evidenceEmpty = [];

for (const { identifier, context, origin } of emitted) {
  let mapped;
  try {
    mapped = adapter.mapLegacyIdentifier(identifier, context);
  } catch (error) {
    const message = String(error.message);
    const missingId = /mapped to '([^']+)'/u.exec(message)?.[1] ?? null;
    if (missingId) {
      missing.push({ identifier, origin, canonicalId: missingId });
      const subject = misparseOf(missingId);
      if (subject) misparsed.push({ identifier, origin, canonicalId: missingId, subject });
    } else {
      unmapped.push({ identifier, origin, error: message.split(":")[0] });
    }
    continue;
  }
  for (const canonicalId of mapped.canonicalIds) {
    const subject = misparseOf(canonicalId);
    if (subject) misparsed.push({ identifier, origin, canonicalId, subject });
  }
  mapped.canonicalIds.forEach((canonicalId, index) => {
    const selected = resolver.resolve(canonicalId, {
      surface: context.evidenceSurface,
      usage: mapped.targetUsages[index]
    });
    if (!selected.records.length) {
      const target = selected.excluded.some((entry) => entry.reason === "surface-permission")
        ? permissionMissing
        : evidenceEmpty;
      target.push({
        identifier,
        origin,
        canonicalId,
        evidenceSurface: context.evidenceSurface,
        usage: mapped.targetUsages[index]
      });
    }
  });
}

const unresolved = [...unmapped, ...missing, ...permissionMissing, ...evidenceEmpty];

const quarantine = fs.existsSync(quarantinePath)
  ? JSON.parse(fs.readFileSync(quarantinePath, "utf8"))
  : { schemaVersion: 1, entries: [] };
const quarantined = new Set(quarantine.entries.map((entry) => entry.identifier));

const newUnresolved = unresolved.filter((row) => !quarantined.has(row.identifier));
const stale = [...quarantined].filter((identifier) => !unresolved.some((row) => row.identifier === identifier));

// Comparing identifier strings alone lets 3,000+ entries drift unwatched: an
// identifier can change failure class, or start mapping to a different
// canonical ID, and the set comparison above still passes. Compare the fields
// that carry the meaning too.
// One classifier, used by both the checker below and the quarantine writer.
// Two copies of this logic would drift apart, which is the failure this whole
// check exists to detect.
const misparsedIdentifiers = new Set(misparsed.map((row) => row.identifier));
const permissionIdentifiers = new Set(permissionMissing.map((row) => row.identifier));
const evidenceEmptyIdentifiers = new Set(evidenceEmpty.map((row) => row.identifier));
function classifyRow(row) {
  if (misparsedIdentifiers.has(row.identifier)) return "misparse";
  if (permissionIdentifiers.has(row.identifier)) return "surface-permission-gap";
  if (evidenceEmptyIdentifiers.has(row.identifier)) return "evidence-empty";
  return row.canonicalId ? "catalog-gap" : "unmapped-shape";
}

const quarantineByIdentifier = new Map(quarantine.entries.map((entry) => [entry.identifier, entry]));
const reclassified = [];
for (const row of unresolved) {
  const entry = quarantineByIdentifier.get(row.identifier);
  if (!entry) continue;
  const nowClass = classifyRow(row);
  const nowMapped = row.canonicalId ?? null;
  if (entry.class !== nowClass) {
    reclassified.push(`${row.identifier}: class ${entry.class} -> ${nowClass}`);
  } else if ((entry.mappedTo ?? null) !== nowMapped) {
    reclassified.push(`${row.identifier}: mappedTo ${entry.mappedTo ?? "null"} -> ${nowMapped ?? "null"}`);
  }
}

console.log(`enumerated ${emitted.length} identifiers from ${new Set(emitted.map((e) => e.origin)).size} production emission sites`);
{
  const byReason = {};
  for (const row of impossible) byReason[row.reason] = (byReason[row.reason] ?? 0) + 1;
  const summary = Object.entries(byReason).map(([reason, count]) => `${count} ${reason}`).join(", ");
  console.log(`  excluded ${impossible.length} astronomically impossible aspects (${summary || "none"})\n`);
}
console.log(`  resolve cleanly:   ${emitted.length - unresolved.length}`);
console.log(`  UNMAPPED shape:    ${unmapped.length}   wiring bug - the adapter does not recognize the identifier`);
console.log(`  MISSING entry:     ${missing.length}   content gap - shape is fine, the catalog has no such object`);
console.log(`  PERMISSION gap:    ${permissionMissing.length}   object exists but no eligible evidence may reach this surface`);
console.log(`  EVIDENCE empty:    ${evidenceEmpty.length}   object exists but yields no governed prompt evidence`);
console.log(`  SILENT MISPARSE:   ${misparsed.length}   matcher swallowed a prefix into the subject slot`);
console.log(`  quarantined:       ${quarantined.size}  (${newUnresolved.length} new, ${stale.length} stale)`);

if (reportOnly) {
  const group = (rows) => {
    const byOrigin = {};
    for (const row of rows) (byOrigin[row.origin] ??= []).push(row.identifier);
    for (const [origin, ids] of Object.entries(byOrigin).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(ids.length).padStart(5)}  ${origin}`);
      console.log(`         e.g. ${ids[0]}`);
    }
  };
  if (unmapped.length) { console.log(`\n=== UNMAPPED SHAPES (wiring bugs) ===`); group(unmapped); }
  if (missing.length) { console.log(`\n=== MISSING CATALOG ENTRIES (content gaps) ===`); group(missing); }
  if (permissionMissing.length) { console.log(`\n=== SURFACE PERMISSION GAPS ===`); group(permissionMissing); }
  if (evidenceEmpty.length) { console.log(`\n=== EMPTY GOVERNED EVIDENCE ===`); group(evidenceEmpty); }
  if (misparsed.length) {
    console.log(`\n=== SILENT MISPARSE (the dangerous class) ===`);
    const seen = new Set();
    for (const row of misparsed) {
      if (seen.has(row.subject)) continue;
      seen.add(row.subject);
      console.log(`  ${row.identifier}`);
      console.log(`    -> ${row.canonicalId}   subject "${row.subject}" is not a body`);
      console.log(`    from ${row.origin}`);
    }
    console.log(`\n  These resolve to a wrong-but-plausible object. They fail today only`);
    console.log(`  because that object is absent from the catalog. Nothing would catch`);
    console.log(`  them if it were ever added.`);
  }
  process.exit(0);
}

if (writeQuarantine) {
  assert.deepEqual(
    misparsed.map((row) => `${row.identifier} -> ${row.canonicalId}`),
    [],
    "Refusing to quarantine silent parser corruption. Fix the matcher or make it reject the identifier explicitly."
  );
  const misparsedIds = new Set(misparsed.map((row) => row.identifier));
  const entries = unresolved
    .map((row) => ({
      identifier: row.identifier,
      emittedBy: row.origin,
      class: classifyRow(row),
      mappedTo: row.canonicalId ?? null
    }))
    .sort((a, b) => a.identifier.localeCompare(b.identifier));
  fs.mkdirSync(path.dirname(quarantinePath), { recursive: true });
  fs.writeFileSync(quarantinePath, `${JSON.stringify({
    schemaVersion: 1,
    note: "Shrink-only, same contract as the writing-kernel drift allowlist. "
      + "An entry may be removed once fixed; adding one requires the owner. "
      + "Silent misparses are prohibited and the generator refuses to quarantine them; "
      + "class=catalog-gap is missing knowledge; class=surface-permission-gap has no eligible evidence; "
      + "class=evidence-empty resolves an object with no extractable governed text; class=unmapped-shape is unwired.",
    generatedBy: "scripts/test-production-identifier-coverage.mjs --write-quarantine",
    counts: {
      total: entries.length,
      misparse: entries.filter((e) => e.class === "misparse").length,
      catalogGap: entries.filter((e) => e.class === "catalog-gap").length,
      surfacePermissionGap: entries.filter((e) => e.class === "surface-permission-gap").length,
      evidenceEmpty: entries.filter((e) => e.class === "evidence-empty").length,
      unmappedShape: entries.filter((e) => e.class === "unmapped-shape").length
    },
    entries
  }, null, 2)}\n`);
  console.log(`\nWrote ${entries.length} quarantine entries to ${path.relative(root, quarantinePath)}`);
  process.exit(0);
}

assert.deepEqual(newUnresolved.map((row) => row.identifier), [],
  `Unmapped production identifiers reach a live pre-call gate and 500 the request. Map them or quarantine them with their emitting file:line.`);
assert.deepEqual(stale, [],
  `These quarantined identifiers now resolve. Remove them; the quarantine is shrink-only.`);
assert.deepEqual(reclassified, [],
  `A quarantined identifier changed failure class or canonical target. The identifier string alone is not the baseline — regenerate the quarantine and have the change reviewed.`);
assert.deepEqual(
  misparsed.map((row) => `${row.identifier} -> ${row.canonicalId}`), [],
  `An identifier mapped to a canonical ID whose subject is not a known body. Silent parser corruption may never be quarantined.`);

console.log("\nProduction identifier coverage passed.");
