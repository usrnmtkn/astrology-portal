#!/usr/bin/env node
/**
 * Phase 0 of the knowledge-base unification: the canonical index.
 *
 * Nothing moves. Nothing is rewritten. This walks every knowledge store,
 * resolves each record's native key to one canonical id, and writes an index
 * with the aliases, so the stores can finally be joined.
 *
 * Canonical id:  <kind>/<subject>/<object>/<relation>
 *   transit-aspect/saturn/mercury/conjunction     transiting saturn to natal mercury
 *   transit-house/saturn/6                        saturn moving through the 6th
 *   natal-aspect/mercury/saturn/conjunction       natal pair, alphabetical
 *   synastry-aspect/mars/venus/square             their mars to your venus
 *   placement-sign/venus/leo
 *   placement-house/mercury/11
 *
 * Ordering: subject is the moving or acting body, object is what it acts on.
 * Where neither moves (natal, composite), order alphabetically and record the
 * reverse as an alias so lookups succeed either way.
 *
 * Usage:
 *   node scripts/build-knowledge-index.mjs [--write] [--report]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argValue = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
};
const write = args.includes("--write");
const check = args.includes("--check");
const report = args.includes("--report");
if (write && check) throw new Error("--write and --check are mutually exclusive.");
const outputArg = argValue("--output");
const outPath = outputArg
  ? path.resolve(outputArg)
  : path.join(repoRoot, "packages/astro-knowledge/generated/knowledge-index.json");

// ---------------------------------------------------------------- vocabulary
const BODY_ALIASES = {
  sun: "sun", moon: "moon", mercury: "mercury", venus: "venus", mars: "mars",
  jupiter: "jupiter", saturn: "saturn", uranus: "uranus", neptune: "neptune", pluto: "pluto",
  chiron: "chiron", lilith: "lilith", "black moon lilith": "lilith", "black-moon-lilith": "lilith", black_moon_lilith: "lilith", bml: "lilith",
  "north node": "north_node", "north-node": "north_node", northnode: "north_node", north_node: "north_node", nn: "north_node",
  "south node": "south_node", "south-node": "south_node", southnode: "south_node", south_node: "south_node", sn: "south_node",
  ascendant: "ascendant", asc: "ascendant", rising: "ascendant",
  midheaven: "midheaven", mc: "midheaven", descendant: "descendant", dsc: "descendant",
  ic: "imum_coeli", imum_coeli: "imum_coeli",
  "part of fortune": "part_of_fortune", "part-of-fortune": "part_of_fortune", part_of_fortune: "part_of_fortune", fortune: "part_of_fortune",
  vertex: "vertex", "(personal)": "personal_planet", personal: "personal_planet", personal_planet: "personal_planet"
};
const ASPECT_ALIASES = {
  conjunction: "conjunction", conjunct: "conjunction",
  opposition: "opposition", opposite: "opposition", oppose: "opposition",
  square: "square", trine: "trine", sextile: "sextile",
  quincunx: "quincunx", inconjunct: "quincunx",
  semisextile: "semisextile", "semi-sextile": "semisextile",
  // "nonagen" is an alternate spelling for semisextile in this corpus, not a
  // separate aspect. Evidence: V13's own definition opens "The nonagen, or
  // semisextile..."; the 46 nonagen pairs and 55 semisextile pairs union to 99,
  // which is exactly one aspect's coverage (every other aspect covers 97-100);
  // and the engine calculates neither (aspect-patterns computes only
  // opposition/trine/square/sextile/quincunx). The 2 overlapping pairs
  // (mars-neptune, mars-pluto) are duplicate entries to reconcile, not proof of
  // two aspects. Owner decision 2026-08-13.
  nonagen: "semisextile"
};
const SIGNS = new Set(["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]);

const clean = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const body = (v) => BODY_ALIASES[clean(v)] ?? null;
const aspect = (v) => ASPECT_ALIASES[clean(v)] ?? null;
const houseNum = (v) => {
  const m = /(\d{1,2})/.exec(String(v ?? ""));
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 12 ? n : null;
};

// ------------------------------------------------------------- canonical ids
const ids = {
  transitAspect: (t, n, a) => (t && n && a ? `transit-aspect/${t}/${n}/${a}` : null),
  transitHouse: (t, h) => (t && h ? `transit-house/${t}/${h}` : null),
  natalAspect: (x, y, a) => {
    if (!x || !y || !a) return null;
    const [p, q] = [x, y].sort();
    return `natal-aspect/${p}/${q}/${a}`;
  },
  synastryAspect: (their, yours, a) => (their && yours && a ? `synastry-aspect/${their}/${yours}/${a}` : null),
  compositeAspect: (x, y, a) => {
    if (!x || !y || !a) return null;
    const [p, q] = [x, y].sort();
    return `composite-aspect/${p}/${q}/${a}`;
  },
  skyAspect: (x, y, a) => {
    if (!x || !y || !a) return null;
    const [p, q] = [x, y].sort();
    return `sky-aspect/${p}/${q}/${a}`;
  },
  placementSign: (p, s) => (p && s && SIGNS.has(s) ? `placement-sign/${p}/${s}` : null),
  placementHouse: (p, h) => (p && h ? `placement-house/${p}/${h}` : null),
  compositePlacement: (p, h) => (p && h ? `composite-placement/${p}/${h}` : null),
  compositeSign: (p, s) => (p && s && SIGNS.has(s) ? `composite-sign/${p}/${s}` : null),
  lunarPhase: (ph) => (ph ? `lunar-phase/${ph}` : null),
  houseOverlay: (p, h) => (p && h ? `house-overlay/${p}/${h}` : null),
  lunation: (kind, s) => (kind && s ? `lunation/${kind}/${s}` : null),
  signGeneric: (s) => (s && SIGNS.has(s) ? `sign/${s}` : null),
  aspectGeneric: (a) => (a ? `aspect/${a}` : null),
  bodyGeneric: (p) => (p ? `body/${p}` : null)
};

// Authority is derived from provenance and explicit governance evidence. The
// legacy `status` value is retained for audit only and is never consulted here.
const AUTHORITY_CLASSES = new Set([
  "factual-evidence", "owner-approved-prose", "voice-exemplar",
  "negative-example", "machine-proposal", "unverified"
]);
function authorityClass(source) {
  if (source.authorityClass && AUTHORITY_CLASSES.has(source.authorityClass)) return source.authorityClass;
  if (source.store === "v13-locked") return "owner-approved-prose";
  if (["matrix-v9", "matrix-v9-delta", "astro-knowledge/data", "book-ms-ca", "book-ms-aasb"].includes(source.store)) return "factual-evidence";
  if (source.store === "serving") return "owner-approved-prose";
  if (source.store === "ll-matrix-v13") return source.ownerApproved === true ? "owner-approved-prose" : "machine-proposal";
  if (source.store === "scene-licenses") return source.ownerApproved === true ? "factual-evidence" : "machine-proposal";
  if (source.store === "authored-placements") return source.ownerApproved === true ? "owner-approved-prose" : "unverified";
  return "unverified";
}

function surfacePermission(kind, source) {
  if (Array.isArray(source.surfacePermission)) return [...new Set(source.surfacePermission)].sort();
  if (source.store === "serving") return ["serving-source-only"];
  if (["synastry-aspect", "composite-aspect", "composite-placement", "composite-sign", "house-overlay"].includes(kind)) return ["friends-synastry"];
  if (kind === "transit-aspect") return ["friends-transit", "you-transit"];
  if (kind === "transit-house") return ["you-transit"];
  if (["natal-aspect", "placement-sign", "placement-house"].includes(kind)) return ["friends-transit:mechanism-reference", "sky", "you-natal"];
  if (kind === "scene-license") return ["friends-transit"];
  return ["doctrine-only"];
}

// ------------------------------------------------------------------ registry
const index = new Map();   // canonicalId -> { id, kind, sources[] }
const unresolved = [];

// Deliberate, understood exclusions. Distinct from `unresolved`, which means
// "this should have mapped and did not". Rows the owner marked non-substantive,
// or that name a compound subject like "Venus/Sun" that is not one body, are
// correctly left out. Folding them into `unresolved` would destroy the value of
// the zero-unresolved invariant by making it permanently non-zero.
const skipped = [];
const collisions = [];

function record(canonicalId, kind, source) {
  if (source && source.path && !source.sourceSha256) {
    source.sourceSha256 = sourceSha256(path.join(repoRoot, source.path));
  }
  if (source && !source.authorityClass) source.authorityClass = authorityClass(source);
  if (source && !source.surfacePermission) source.surfacePermission = surfacePermission(kind, source);
  if (!canonicalId) { unresolved.push({ ...source, reason: source.reason ?? "canonical id could not be resolved" }); return; }
  if (!index.has(canonicalId)) index.set(canonicalId, { id: canonicalId, kind, sources: [] });
  const entry = index.get(canonicalId);
  if (entry.kind !== kind) collisions.push({ canonicalId, kinds: [entry.kind, kind], source });
  entry.sources.push(source);
}

const fileHashes = new Map();
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sourceSha256 = (p) => {
  if (!fileHashes.has(p)) fileHashes.set(p, sha256(fs.readFileSync(p)));
  return fileHashes.get(p);
};
const readJson = (p) => {
  let raw;
  try {
    raw = fs.readFileSync(p, "utf8");
  } catch (error) {
    throw new Error(`KNOWLEDGE_SOURCE_READ_FAILED: ${path.relative(repoRoot, p)}: ${error.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`KNOWLEDGE_SOURCE_PARSE_FAILED: ${path.relative(repoRoot, p)}: ${error.message}`);
  }
};
function listJsonFiles(root) {
  if (!fs.existsSync(root)) throw new Error(`KNOWLEDGE_STORE_MISSING: ${path.relative(repoRoot, root)}`);
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(absolute);
    }
  };
  visit(root);
  return files;
}
const source = (file, values = {}) => ({
  ...values,
  path: rel(file),
  sourceSha256: sourceSha256(file)
});
const rel = (p) => path.relative(repoRoot, p);

// ------------------------------------------------- store 1: astro-knowledge/data
const astroDataRoot = path.join(repoRoot, "packages/astro-knowledge/data");
const astroDataFiles = listJsonFiles(astroDataRoot);
const ASTRO_DATA_MINIMUM_JSON_FILES = 2912;
if (astroDataFiles.length < ASTRO_DATA_MINIMUM_JSON_FILES) {
  throw new Error(`ASTRO_DATA_ROWS_SHRANK: found ${astroDataFiles.length} JSON files, below the ${ASTRO_DATA_MINIMUM_JSON_FILES} baseline.`);
}
let astroDataRowsRead = 0;
for (const file of astroDataFiles) {
  astroDataRowsRead += 1;
  const j = readJson(file);
  if (!j || typeof j !== "object" || Array.isArray(j)) {
    throw new Error(`KNOWLEDGE_SOURCE_SHAPE_INVALID: ${rel(file)} must contain one object.`);
  }
  if (j.kind === "house" && Array.isArray(j.entries)) {
    j.entries.forEach((entry, index) => record(
      `house/${houseNum(entry.id)}`,
      "house-generic",
      source(file, { store: "astro-knowledge/data", nativeKey: entry.id, rowKey: entry.id, status: entry.status ?? null, locator: { collection: "entries", index } })
    ));
    continue;
  }
  if (j.kind === "sign" && Array.isArray(j.entries)) {
    j.entries.forEach((entry, index) => record(
      SIGNS.has(clean(entry.id)) ? ids.signGeneric(clean(entry.id)) : null,
      "sign-generic",
      source(file, { store: "astro-knowledge/data", nativeKey: entry.id, rowKey: entry.id, status: entry.status ?? null, locator: { collection: "entries", index } })
    ));
    continue;
  }
  const src = source(file, {
    store: "astro-knowledge/data",
    nativeKey: j.id ?? path.basename(file, ".json"),
    rowKey: j.id ?? path.basename(file, ".json"),
    status: j.status ?? null,
    authorityClass: j.authorityClass ?? undefined,
    surfacePermission: Array.isArray(j.surfacePermission) ? j.surfacePermission : undefined,
    usage: j.usage ?? undefined,
    framingAllowed: typeof j.framingAllowed === "boolean" ? j.framingAllowed : undefined,
    approvalMarker: j.approvalMarker ?? undefined,
    governanceState: j.governanceState ?? undefined,
    locator: { document: true }
  });
  if (rel(file) === "packages/astro-knowledge/data/modifiers/point-metadata.json") {
    const pointAliases = { asc: "ascendant", dsc: "descendant", mc: "midheaven", ic: "imum_coeli" };
    for (const [pointKey, point] of Object.entries(j.classes?.points ?? {})) {
      const canonicalBody = pointAliases[pointKey] ?? body(point.id ?? pointKey);
      record(ids.bodyGeneric(canonicalBody), "body-generic", source(file, {
        store: "astro-knowledge/data",
        nativeKey: point.id ?? pointKey,
        rowKey: point.id ?? pointKey,
        status: point.status ?? j.status ?? null,
        locator: { objectPath: ["classes", "points", pointKey] }
      }));
    }
  }
  if (rel(file).startsWith("packages/astro-knowledge/data/planetary/")) {
    if (j.planet === "lunar-nodes") {
      record(ids.bodyGeneric("north_node"), "body-generic", { ...src, nativeKey: "north_node", rowKey: "north_node" });
      record(ids.bodyGeneric("south_node"), "body-generic", { ...src, nativeKey: "south_node", rowKey: "south_node" });
    } else {
      record(ids.bodyGeneric(body(j.planet ?? j.id)), "body-generic", src);
    }
    continue;
  }
  const a = aspect(j.aspect);
  switch (j.kind) {
    case "transit-to-natal":
      record(ids.transitAspect(body(j.transiting), body(j.natal), a), "transit-aspect", src); break;
    case "sky-aspect":
      record(ids.skyAspect(body(j.bodyA), body(j.bodyB), a), "sky-aspect", src); break;
    case "house": {
      const p0 = body(j.transiting ?? j.planet ?? j.point ?? String(j.id ?? "").split(/[-_]/)[0]);
      record(ids.transitHouse(p0, houseNum(j.house ?? j.id)), "transit-house", src); break;
    }
    case "interaspect":
      record(ids.synastryAspect(body(j.planetA), body(j.planetB), a), "synastry-aspect", src); break;
    case "natal-aspect":
    case "natal": {
      // Some stores carry the pair in fields; insights/** carry it only in the id
      // as "<body>-<aspect>-<body>" with no aspect field at all.
      let id = ids.natalAspect(body(j.planet ?? j.bodyA), body(j.point ?? j.bodyB), a);
      if (!id) {
        const m = /^([a-z_]+)[-_](conjunction|conjunct|opposition|square|trine|sextile|quincunx|inconjunct|semisextile|semi-sextile|nonagen)[-_]([a-z_]+)$/i
          .exec(String(j.id ?? path.basename(file, ".json")));
        if (m) id = ids.natalAspect(body(m[1]), body(m[3]), aspect(m[2]));
      }
      record(id, "natal-aspect", src); break;
    }
    case "composite":
      if (j.placementType === "aspect") {
        const [first, second] = String(j.planet ?? "").split("-");
        record(ids.compositeAspect(body(first), body(second), a), "composite-aspect", src);
      } else if (j.placementType === "sign") {
        record(ids.compositeSign(body(j.planet), clean(j.sign)), "composite-sign", src);
      } else {
        record(ids.compositePlacement(body(j.planet), houseNum(j.house)), "composite-placement", src);
      }
      break;
    case "house-overlay":
      record(ids.houseOverlay(body(j.planet), houseNum(j.house)), "house-overlay", src); break;
    case "sign": {
      const seg = String(j.id ?? "").split(/[-_]/);
      record(ids.placementSign(body(j.planet ?? j.point ?? seg[0]), clean(j.sign) || clean(seg[seg.length - 1])), "placement-sign", src); break;
    }
    case "ascendant-sign":
      record(ids.placementSign("ascendant", clean(j.sign)), "placement-sign", src); break;
    case "full-moon":
      record(ids.lunation("full-moon", clean(j.sign)), "lunation", src); break;
    case "new-moon":
      record(ids.lunation("new-moon", clean(j.sign)), "lunation", src); break;
    case "point-contact":
    case "point":
      record(`point/${clean(j.id).replace(/[^a-z0-9]+/g, "_")}`, "point", src); break;
    case "chart-ruler-rising":
      record(`chart-ruler-rising/${clean(String(j.id).split("-").pop())}`, "chart-ruler", src); break;
    case "chart-ruler-house":
      record(`chart-ruler-house/${houseNum(j.house ?? j.id)}`, "chart-ruler", src); break;
    case "framework":
    case "guide":
    case "synastry":
    case "template":
    case "correspondence":
      record(`doc/${clean(j.id).replace(/[^a-z0-9]+/g, "_")}`, "document", src); break;
    default:
      if (j.id) record(`doc/${clean(j.id).replace(/[^a-z0-9]+/g, "_")}`, "document", src);
      else record(`doc/${path.basename(file, ".json").replace(/[^a-z0-9]+/g, "_")}`, "document", src);
  }
}
// `astroDataRowsRead` increments unconditionally as the first statement of the
// loop, so it can never diverge from `astroDataFiles.length`. Comparing them
// would be dead code dressed as a safety net. ASTRO_DATA_ROWS_SHRANK above is
// the live guard: it fails when the store loses files, which is the real risk.
void astroDataRowsRead;

// ------------------------------------------------------------- store 2: V13
{
  const p = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json");
  const j = readJson(p);
  for (const [index, row] of (j?.rows ?? []).entries()) {
    const src = source(p, { store: "ll-matrix-v13", nativeKey: row.key, rowKey: row.key, ownerApproved: row.ownerApproved === true, status: row.ownerApproved ? "owner-approved" : (row.governance ?? null), locator: { collection: "rows", index } });
    const parts = String(row.key).split("|").map(clean);
    if (parts.length === 3) {
      record(ids.natalAspect(body(parts[0]), body(parts[2]), aspect(parts[1])), "natal-aspect", src);
    } else if (parts.length === 1 && ASPECT_ALIASES[parts[0]]) {
      record(ids.aspectGeneric(aspect(parts[0])), "aspect-generic", src);
    } else if (parts.length === 1 && SIGNS.has(parts[0])) {
      record(ids.signGeneric(parts[0]), "sign-generic", src);
    } else if (parts.length === 2 && SIGNS.has(parts[1])) {
      record(ids.placementSign(body(parts[0]), parts[1]), "placement-sign", src);
    } else if (parts.length === 2 && houseNum(parts[1])) {
      record(ids.placementHouse(body(parts[0]), houseNum(parts[1])), "placement-house", src);
    } else if (parts.length === 2 && parts[1] === "general" && body(parts[0])) {
      record(ids.bodyGeneric(body(parts[0])), "body-generic", src);
    } else if (parts.length === 1 && /moon$/.test(parts[0])) {
      record(ids.lunarPhase(parts[0]), "lunar-phase", src);
    } else if (parts.length === 1 && body(parts[0])) {
      record(ids.bodyGeneric(body(parts[0])), "body-generic", src);
    } else if (parts.length === 1) {
      record(`concept/${parts[0].replace(/[^a-z0-9]+/g, "_")}`, "concept", src);
    } else {
      unresolved.push({ ...src, reason: "unmapped V13 key shape" });
    }
  }
}

// ------------------------------------------------------- store 3: phrasebank
for (const file of listJsonFiles(path.join(repoRoot, "tldr-astro-phrasebank/phrasebank"))) {
  const j = readJson(file);
  if (!j || typeof j !== "object") continue;
  const list = ["reviewed", "entries", "rows", "items"].map((k) => j[k]).find((v) => Array.isArray(v));
  const collection = ["reviewed", "entries", "rows", "items"].find((key) => Array.isArray(j[key])) ?? null;
  for (const [index, e] of (list ?? []).entries()) {
    if (!e || typeof e !== "object") continue;
    const src = source(file, { store: "phrasebank", nativeKey: e.id ?? null, rowKey: e.id ?? null, status: e.status ?? e.tier ?? null, locator: { collection, index } });
    const a = aspect(e.aspect);
    if (e.their_body && e.your_body) {
      record(ids.synastryAspect(body(e.their_body), body(e.your_body), a), "synastry-aspect", src);
    } else if (e.transiting_body && (e.natal_body ?? e.natal_point)) {
      record(ids.transitAspect(body(e.transiting_body), body(e.natal_body ?? e.natal_point), a), "transit-aspect", src);
    } else if (e.kind === "natal_aspect" || e.kind === "composite_aspect") {
      const m = /([a-z_]+)-([a-z_]+)-([a-z]+)$/.exec(String(e.id ?? ""));
      const id = m
        ? (e.kind === "natal_aspect" ? ids.natalAspect(body(m[1]), body(m[2]), aspect(m[3])) : ids.compositeAspect(body(m[1]), body(m[2]), aspect(m[3])))
        : null;
      record(id, e.kind === "natal_aspect" ? "natal-aspect" : "composite-aspect", src);
    } else {
      const id = String(e.id ?? "");
      const seg = id.split("/").filter(Boolean);
      const tail = seg[seg.length - 1] ?? "";
      const pair = /^([a-z_]+)-(conjunction|opposition|square|trine|sextile|quincunx|semisextile|nonagen)-([a-z_]+)$/.exec(tail);
      if (/^cc\/aspect-pair\//.test(id) && pair) {
        record(ids.transitAspect(body(pair[1]), body(pair[3]), aspect(pair[2])), "transit-aspect", src);
      } else if (/^cc\/composite-typed\//.test(id) && seg[2]) {
        const m = /^([a-z_]+)-([a-z_]+)$/.exec(seg[2]);
        record(m ? `${ids.compositeAspect(body(m[1]), body(m[2]), "conjunction")}#typed` : null, "composite-typed", src);
      } else if (e.kind === "planet_in_sign" && e.planet && e.sign) {
        record(ids.placementSign(body(e.planet), clean(e.sign)), "placement-sign", src);
      } else if (e.kind === "planet_in_house" && e.planet) {
        record(ids.placementHouse(body(e.planet), houseNum(e.house ?? tail)), "placement-house", src);
      } else if (e.kind === "composite_planet_house" && e.planet) {
        record(ids.compositePlacement(body(e.planet), houseNum(e.house ?? tail)), "composite-placement", src);
      } else if (e.kind === "synastry_house_overlay_full" && e.planet) {
        record(ids.houseOverlay(body(e.planet), houseNum(e.house ?? tail)), "house-overlay", src);
      } else if (id) {
        record(`doc/${id.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`, "phrasebank-entry", src);
      } else if (e.phase || e.moon_phase) {
        record(ids.lunarPhase(clean(e.phase ?? e.moon_phase).replace(/[^a-z0-9]+/g, "-")), "lunar-phase", src);
      } else {
        const bucket = path.basename(file, ".json");
        record(`bank/${bucket}`, "phrase-bank", { ...src, aggregated: true });
      }
    }
  }
}

// ------------------------------------------------------- store 4: matrix V9
{
  const p = path.join(repoRoot, "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json");
  const j = readJson(p);

  // This file holds two arrays: transit_meanings (1,117) and house_activations
  // (2,368). The previous loader took Object.keys(...).find(isArray), which
  // returns only the first, so every house-activation row was silently dropped
  // and 2,368 owner-approved rows never reached the writer. Read all of them,
  // and assert the total below so a future drop fails the build instead of
  // going unnoticed.
  const collections = Array.isArray(j)
    ? [[null, j]]
    : Object.entries(j ?? {}).filter(([, value]) => Array.isArray(value));

  // Baseline, not a self-comparison. Counting rows read against rows found
  // would be tautological — both derive from `collections`, so they can never
  // disagree and the check would be dead code. What actually needs guarding is
  // a future edit that stops reading a collection, so name the collections that
  // must be present and the floor they must clear.
  const REQUIRED_COLLECTIONS = { transit_meanings: 1117, house_activations: 2368 };
  for (const [name, minimum] of Object.entries(REQUIRED_COLLECTIONS)) {
    const found = collections.find(([key]) => key === name);
    if (!found) {
      throw new Error(`MATRIX_V9_COLLECTION_MISSING: '${name}' was not read. 2,368 owner-approved rows were once dropped this way.`);
    }
    if (found[1].length < minimum) {
      throw new Error(`MATRIX_V9_ROWS_SHRANK: '${name}' holds ${found[1].length} rows, below the ${minimum} baseline.`);
    }
  }
  let rowsRead = 0;

  for (const [collection, rows] of collections) {
    for (const [index, row] of rows.entries()) {
      rowsRead += 1;
      const src = source(p, { store: "matrix-v9", nativeKey: row.Key, rowKey: row.Key, status: row.Governance ?? null, archive: row.Archive ?? null, locator: { collection, index } });
      const parts = String(row.Key ?? "").split("|").map(clean);
      const [subject, second, third] = parts;

      // House activations: rising|planet|sign|event, with an explicit House
      // column. "House source" records whether the source stated the house or
      // whether it was computed from the rising sign. Those are different
      // grades of evidence and must not be flattened together — a computed
      // house is an inference, which is exactly what the licensing rules exist
      // to keep out of framing.
      if (collection === "house_activations") {
        const houseSource = String(row["House source"] ?? "").toLowerCase();
        const substantive = String(row.Substantive ?? "").toLowerCase() === "yes";
        const excluded = String(row.Experience ?? "").includes("[EXCLUDE FROM FALLBACK]");
        const planet = row.Planet ? body(clean(String(row.Planet))) : null;
        const house = row.House ? houseNum(String(row.House)) : null;
        if (!substantive || excluded) {
          skipped.push({ ...src, reason: "owner marked the row non-substantive or excluded from fallback" });
          continue;
        }
        if (!planet || !house) {
          // e.g. Planet "Venus/Sun" (two bodies, not one) or "Nodes" (ambiguous
          // between north and south). Not a defect; there is no single subject.
          skipped.push({ ...src, reason: `no single canonical subject for planet "${row.Planet ?? ""}" / house "${row.House ?? ""}"` });
          continue;
        }
        record(`house-activation/${planet}/${house}`, "house-activation", {
          ...src,
          houseSource: houseSource || null,
          // Only a stated house is factual. A computed one may inform the
          // mechanism but must never supply the framing.
          usage: houseSource === "stated" ? "primary" : "mechanism-reference",
          framingAllowed: houseSource === "stated"
        });
        continue;
      }

      if (parts.length === 3 && SIGNS.has(second)) {
        record(ids.placementSign(body(subject), second), "placement-sign", src);
      } else if (parts.length === 3 && houseNum(second)) {
        record(ids.transitHouse(body(subject), houseNum(second)), "transit-house", src);
      } else if (parts.length === 3 && aspect(second)) {
        record(ids.transitAspect(body(subject), body(third), aspect(second)), "transit-aspect", src);
      } else if (parts.length >= 2) {
        record(`matrix-event/${parts.map((x) => x.replace(/[^a-z0-9]+/g, "_")).join("/")}`, "matrix-event", src);
      } else {
        unresolved.push({ ...src, reason: "unmapped matrix-v9 key" });
      }
    }
  }

  // No total-rows check here. `rowsRead` increments unconditionally at the top
  // of the loop, and the per-collection floors above already guarantee the
  // total, so comparing them would be dead code — the same tautology the
  // comment above warns about. MATRIX_V9_COLLECTION_MISSING and
  // MATRIX_V9_ROWS_SHRANK are the live guards; both are exercised by
  // scripts/test-index-store-guards.mjs.
  void rowsRead;
}

// ------------------------------------------ store 5: generated authored placements
{
  const p = path.join(repoRoot, "packages/astro-knowledge/generated/tldr-astro/authored-placements/authored-placements.json");
  const j = readJson(p);
  for (const [index, e] of (j?.entries ?? []).entries()) {
    const src = source(p, { store: "authored-placements", nativeKey: e.id, rowKey: e.id, ownerApproved: e.ownerApproved === true, status: e.editStatus ?? null, locator: { collection: "entries", index } });
    if (e.planet && e.house) record(ids.placementHouse(body(e.planet), houseNum(e.house)), "placement-house", src);
    else if (e.sign && e.house) record(`placement-sign-house/${clean(e.sign)}/${houseNum(e.house)}`, "placement-sign-house", src);
    else if (e.planet && e.sign) record(ids.placementSign(body(e.planet), clean(e.sign)), "placement-sign", src);
    else if (e.matchType === "planet_concept" && body(e.planet)) record(ids.bodyGeneric(body(e.planet)), "body-generic", src);
    else unresolved.push({ ...src, reason: "unmapped authored-placement" });
  }
}


// ------------------------------------------------- store 6: V13 owner-approved LOCKED
{
  const p = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json");
  const j = readJson(p);
  const collection = Array.isArray(j) ? null : Object.keys(j ?? {}).find((key) => Array.isArray(j[key])) ?? null;
  const rows = Array.isArray(j) ? j : (collection ? j[collection] : []);
  for (const [index, row] of rows.entries()) {
    const key = String(row.key ?? row.Key ?? "");
    const src = source(p, { store: "v13-locked", nativeKey: key, rowKey: key, ownerApproved: true, status: "owner-approved-locked", locator: { collection, index } });
    const parts = key.split("|").map(clean);
    if (parts.length === 3 && aspect(parts[1])) record(ids.natalAspect(body(parts[0]), body(parts[2]), aspect(parts[1])), "natal-aspect", src);
    else if (parts.length === 2 && SIGNS.has(parts[1])) record(ids.placementSign(body(parts[0]), parts[1]), "placement-sign", src);
    else if (parts.length === 2 && houseNum(parts[1])) record(ids.placementHouse(body(parts[0]), houseNum(parts[1])), "placement-house", src);
    else if (parts.length === 2 && parts[1] === "general" && body(parts[0])) record(ids.bodyGeneric(body(parts[0])), "body-generic", src);
    else if (parts.length === 1 && SIGNS.has(parts[0])) record(ids.signGeneric(parts[0]), "sign-generic", src);
    else if (parts.length === 1 && aspect(parts[0])) record(ids.aspectGeneric(aspect(parts[0])), "aspect-generic", src);
    else if (parts.length === 1 && /moon$/.test(parts[0])) record(ids.lunarPhase(parts[0]), "lunar-phase", src);
    else if (key) record(`concept/${clean(key).replace(/[^a-z0-9]+/g, "_")}`, "concept", src);
    else unresolved.push({ ...src, reason: "unmapped v13-locked key" });
  }
}

// ------------------------------------------------- store 7: V9 governance deltas
for (const file of ["transit-meanings-v9-governance-delta.json", "house-activations-v9-governance-delta.json"]) {
  const p = path.join(repoRoot, "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-delta", file);
  const j = readJson(p);
  const collection = Array.isArray(j) ? null : Object.keys(j ?? {}).find((key) => Array.isArray(j[key])) ?? null;
  const rows = Array.isArray(j) ? j : (collection ? j[collection] : []);
  for (const [index, row] of rows.entries()) {
    const key = String(row.Key ?? row.key ?? "");
    const src = source(p, { store: "matrix-v9-delta", nativeKey: key, rowKey: key, status: row.Governance ?? null, archive: row.Archive ?? null, locator: { collection, index } });
    const parts = key.split("|").map(clean);
    if (parts.length === 3 && SIGNS.has(parts[1])) record(ids.placementSign(body(parts[0]), parts[1]), "placement-sign", src);
    else if (parts.length === 3 && houseNum(parts[1])) record(ids.transitHouse(body(parts[0]), houseNum(parts[1])), "transit-house", src);
    else if (parts.length === 3 && aspect(parts[1])) record(ids.transitAspect(body(parts[0]), body(parts[2]), aspect(parts[1])), "transit-aspect", src);
    else if (parts.length >= 2) record(`matrix-event/${parts.map((x) => x.replace(/[^a-z0-9]+/g, "_")).join("/")}`, "matrix-event", src);
    else unresolved.push({ ...src, reason: "unmapped v9-delta key" });
  }
}

// ------------------------------------------------- store 8: serving layer
// What the reader actually sees. Indexed so the resolver can answer
// "does this object already have live copy?" before anything is rewritten.
for (const file of listJsonFiles(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3"))
  .filter((file) => /^bundled-.*\.json$/u.test(path.basename(file)))) {
  const j = readJson(file);
  if (!j) continue;
  const rows = Array.isArray(j) ? j : (j.authoredCards ?? j.rows ?? j.entries ?? Object.values(j).find((v) => Array.isArray(v)) ?? []);
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== "object") continue;
    const key = String(row.contentKey ?? row.id ?? row.key ?? "");
    if (!key) continue;
    const src = source(file, { store: "serving", nativeKey: key, rowKey: key, status: row.review_status ?? row.status ?? "serving", locator: { collection: Array.isArray(j) ? null : (j.authoredCards ? "authoredCards" : j.rows ? "rows" : j.entries ? "entries" : null), index } });
    const m = /transit-aspect\/([a-z_]+)\/([a-z_]+)\/([a-z]+)/.exec(key);
    if (m && body(m[1]) && body(m[2]) && aspect(m[3])) {
      record(ids.transitAspect(body(m[1]), body(m[2]), aspect(m[3])), "transit-aspect", src);
      continue;
    }
    record(`serving/${key.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`, "serving-row", src);
  }
}

// ------------------------------------------------- store 9: governed book extracts
for (const [store, p] of [
  ["book-ms-ca", "packages/astro-knowledge/sources/authored/marie-satori-book/celestial-alchemy-license-quote-extract.json"],
  ["book-ms-aasb", "tldr-astro-phrasebank/sources/book-as-above-extract.json"]
]) {
  const abs = path.join(repoRoot, p);
  const j = readJson(abs);
  if (!j) continue;
  for (const [index, sec] of (j.sections ?? []).entries()) {
    const src = source(abs, { store, nativeKey: sec.id, rowKey: sec.id, status: "authored-source-extract", locator: { collection: "sections", index } });
    if (sec.sign && sec.house) record(`placement-sign-house/${clean(sec.sign)}/${houseNum(sec.house)}`, "placement-sign-house", src);
    else if (sec.house) record(ids.placementHouse(body(sec.planet ?? String(sec.id).split("-")[0]), houseNum(sec.house)), "placement-house", src);
    else if (sec.id) record(`doc/${clean(sec.id).replace(/[^a-z0-9]+/g, "_")}`, "document", src);
  }
  for (const [k, v] of Object.entries(j.house_meanings ?? {})) {
    record(`house/${houseNum(k)}`, "house-generic", source(abs, { store, nativeKey: `house_meanings.${k}`, rowKey: `house_meanings.${k}`, status: "authored-source-extract", locator: { objectPath: ["house_meanings", k] } }));
  }
}

// ------------------------------------------------- store 10: AC reference index
{
  const p = path.join(repoRoot, "packages/astro-knowledge/reference/ac-reference-index.json");
  const j = readJson(p);
  for (const [index, e] of (j?.entries ?? []).entries()) {
    record(`reference/ac/${String(e.id).replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`, "external-reference",
      source(p, { store: "ac-reference", nativeKey: e.id, rowKey: e.id, status: e.status ?? "unverified-source-reference", readerServing: false, locator: { collection: "entries", index } }));
  }
}

// ------------------------------------------------- store 11: Friends scene licenses
{
  const p = path.join(repoRoot, "packages/astro-knowledge/config/friends-transit-scene-licenses-v3.json");
  const j = readJson(p);
  for (const [index, lic] of (j?.licenses ?? []).entries()) {
    record(`license/friends-transit/house/${lic.scope?.house}`, "scene-license",
      source(p, { store: "scene-licenses", nativeKey: lic.licenseId, rowKey: lic.licenseId, ownerApproved: lic.approval?.ownerApproved === true, status: lic.approval?.status ?? "review_needed", locator: { collection: "licenses", index } }));
  }
}

// ----------------------------------------------- store 12: Daily Glance packets
// These configs are the existing governed, surface-specific fact boundaries.
// Indexing them does not approve copy; it makes the evidence addressable by
// the shared resolver so Daily no longer needs a private packet builder.
for (const file of [
  "daily-glance-writer-sol-xhigh-pilot-v1.json",
  "daily-glance-writer-sol-xhigh-batch-1-v1.json",
  "daily-glance-writer-sol-xhigh-batch-2-v1.json",
  "daily-glance-writer-sol-xhigh-batch-3-v1.json"
]) {
  const p = path.join(repoRoot, "packages/astro-knowledge/config", file);
  const j = readJson(p);
  for (const [index, target] of (j?.keys ?? []).entries()) {
    record(`daily/${String(target.key).replace(/^\/+|\/+$/gu, "")}`, "daily-event", source(p, {
      store: "daily-glance-config",
      nativeKey: target.key,
      rowKey: target.key,
      status: "governed-fact-boundary",
      authorityClass: "factual-evidence",
      surfacePermission: ["daily"],
      locator: { collection: "keys", index }
    }));
  }
}

// ---------------------------------------------------------------- assemble
const objects = [...index.values()].sort((a, b) => a.id.localeCompare(b.id));
for (const object of objects) {
  object.sources.sort((a, b) => (
    a.store.localeCompare(b.store)
    || a.path.localeCompare(b.path)
    || String(a.nativeKey ?? "").localeCompare(String(b.nativeKey ?? ""))
    || Number(a.locator?.index ?? -1) - Number(b.locator?.index ?? -1)
  ));
}
const byKind = {};
for (const o of objects) {
  byKind[o.kind] ??= { objects: 0, records: 0, stores: {} };
  byKind[o.kind].objects += 1;
  byKind[o.kind].records += o.sources.length;
  for (const s of o.sources) byKind[o.kind].stores[s.store] = (byKind[o.kind].stores[s.store] ?? 0) + 1;
}
const multi = objects.filter((o) => new Set(o.sources.map((s) => s.store)).size > 1);
const storeTotals = {};
for (const o of objects) for (const s of o.sources) storeTotals[s.store] = (storeTotals[s.store] ?? 0) + 1;

const authorityTotals = {};
for (const o of objects) for (const s2 of o.sources) authorityTotals[s2.authorityClass] = (authorityTotals[s2.authorityClass] ?? 0) + 1;

const payload = {
  schemaVersion: 2,
  status: "index-only. No content moved, rewritten, or approved.",
  deterministic: "This payload contains no timestamps. Identical inputs produce a byte-identical file.",
  totals: {
    canonicalObjects: objects.length,
    sourceRecordsIndexed: objects.reduce((n, o) => n + o.sources.length, 0),
    objectsFoundInMoreThanOneStore: multi.length,
    unresolved: unresolved.length,
    skipped: skipped.length,
    collisions: collisions.length
  },
  storeTotals,
  authorityTotals,
  byKind,
  collisions,
  unresolved,
  skipped,
  objects
};
payload.integrity = {
  contentSha256: crypto.createHash("sha256").update(JSON.stringify(payload.objects)).digest("hex"),
  distinctSourceFiles: fileHashes.size
};

console.log(JSON.stringify({ totals: payload.totals, storeTotals, byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { objects: v.objects, records: v.records, stores: v.stores }])) }, null, 2));
if (report && unresolved.length) console.log(JSON.stringify({ unresolved }, null, 2));

const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (check) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) {
    console.error("STALE: the committed index does not match a fresh build. Re-run with --write.");
    process.exit(1);
  }
  console.log("Index is current.");
  process.exit(0);
}

if (write) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`\nWrote ${rel(outPath)}`);
} else {
  console.log("\nDry run. Re-run with --write to emit the index.");
}
