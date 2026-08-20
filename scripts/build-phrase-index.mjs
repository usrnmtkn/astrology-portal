#!/usr/bin/env node
/**
 * PHRASE evidence role — the fifth role alongside factual evidence,
 * owner-approved prose, voice exemplars, and machine proposals.
 *
 * The voice bank and phrasebank have until now been used only as derived style
 * guidance baked into the canonical instructions. The writer never received the
 * actual lines. This indexes them in place, tagged by theme and by the subject
 * or failure each addresses, so retrieval can offer them as AVAILABLE LINES.
 *
 * Sources are indexed, never moved or edited.
 *
 * Usage: node scripts/build-phrase-index.mjs [--write] [--check]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check");
const outPath = path.join(repoRoot, "packages/astro-knowledge/generated/phrase-index.json");
const voiceBankPath = path.join(repoRoot, "tldr-astro-phrasebank/MARIE-VOICE-BANK.md");
const fourBodyVoiceManifestPath = path.join(
  repoRoot,
  "packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/adjacent-formats/four-body-promotion/manifest.json"
);

const sha256 = (v) => crypto.createHash("sha256").update(Buffer.isBuffer(v) || typeof v === "string" ? v : JSON.stringify(v)).digest("hex");
const rel = (p) => path.relative(repoRoot, p);

// ---------------------------------------------------------------- theme model
// Each voice-bank theme maps to the astrological subjects it speaks to and the
// writing failure it counters. Retrieval matches on subject; the failure tag
// tells the writer why the line exists.
const THEME_SUBJECTS = {
  "Boundaries & energy protection": { bodies: ["saturn", "moon", "mars", "pluto"], houses: [1, 6, 8, 12], addresses: "over-giving, unclear limits, availability as default" },
  "Credit, ownership & creative theft": { bodies: ["sun", "mercury", "pluto", "midheaven"], houses: [5, 10, 11], addresses: "unacknowledged work, borrowed authorship" },
  "Authenticity & self-expression": { bodies: ["sun", "ascendant", "uranus", "venus"], houses: [1, 5, 11], addresses: "self-diminishment to keep others comfortable" },
  "Self-worth & personal power": { bodies: ["sun", "venus", "pluto", "saturn"], houses: [1, 2, 8], addresses: "worth proved through exhaustion" },
  "Empathy & emotional labor": { bodies: ["moon", "venus", "neptune", "chiron"], houses: [4, 6, 7, 12], addresses: "carrying the emotional load unasked" },
  "Family roles, accountability & breaking patterns": { bodies: ["moon", "saturn", "pluto", "south_node"], houses: [4, 10, 12], addresses: "inherited roles kept past their use" },
  "Family chaos, career & livelihood boundaries": { bodies: ["saturn", "moon", "midheaven"], houses: [4, 6, 10], addresses: "home and work bleeding into each other" },
  Strategy: { bodies: ["mercury", "saturn", "jupiter", "mars"], houses: [3, 6, 10], addresses: "acting before the plan is real" },
  "Retrograde / review": { bodies: ["mercury", "venus", "mars", "saturn"], houses: [3, 9, 12], addresses: "revisiting rather than restarting" },
  "Financial growth & security": { bodies: ["venus", "jupiter", "saturn"], houses: [2, 8], addresses: "money decisions avoided or rushed" },
  "Self-worth & earning power": { bodies: ["venus", "sun", "saturn"], houses: [2, 6, 10], addresses: "undercharging, undervaluing the skill" },
  "Career & business boundaries": { bodies: ["saturn", "mars", "midheaven", "jupiter"], houses: [6, 10, 11], addresses: "scope creep and unpaid extra" },
  "Relationships & compromise": { bodies: ["venus", "mars", "moon", "descendant"], houses: [7, 8, 11], addresses: "self-erasure inside an agreement" },
  Health: { bodies: ["moon", "mars", "saturn", "chiron"], houses: [1, 6, 12], addresses: "the body reporting what the schedule denies" },
  "Channeling creativity": { bodies: ["sun", "venus", "neptune", "jupiter"], houses: [3, 5, 9], addresses: "making stalled by permission-seeking" }
};

// -------------------------------------------------------- parse the voice bank
function parseVoiceBank() {
  const raw = fs.readFileSync(voiceBankPath, "utf8");
  const fileSha = sha256(raw);
  const lines = raw.split("\n");
  const phrases = [];
  let section = null;
  let theme = null;

  for (const [i, line] of lines.entries()) {
    if (/^## /.test(line)) { section = line.replace(/^##\s*/, "").trim(); theme = null; continue; }
    if (/^### /.test(line)) { theme = line.replace(/^###\s*/, "").trim(); continue; }

    // gold examples: numbered, in the "How the voice moves" section
    const gold = /^(\d+)\.\s+(.*\S)\s*$/.exec(line);
    if (gold && /how the voice moves/i.test(section ?? "")) {
      phrases.push({
        kind: "gold-example", theme: "voice shape", text: gold[2].trim(),
        addresses: "demonstrates the full-thought shape: truth, turn, concrete move",
        line: i + 1
      });
      continue;
    }

    const bullet = /^-\s+(.*\S)\s*$/.exec(line);
    if (!bullet) continue;
    const text = bullet[1].trim();

    if (/this instead of that/i.test(section ?? "") && text.includes("→")) {
      const [use, avoid] = text.split("→").map((s) => s.trim().replace(/^not\s+/i, "").replace(/^"|"$/g, ""));
      phrases.push({ kind: "approved-swap", theme: "diction", text: use.replace(/^"|"$/g, ""), avoid, addresses: "exact wording the owner prefers", line: i + 1 });
      continue;
    }
    if (/write the lived moment/i.test(section ?? "")) {
      phrases.push({ kind: "lived-moment-rule", theme: "compatibility language", text, addresses: "replaces an abstraction with the observable behaviour", line: i + 1 });
      continue;
    }
    if (theme) {
      phrases.push({ kind: "one-liner", theme, text, addresses: THEME_SUBJECTS[theme]?.addresses ?? null, line: i + 1 });
    }
  }

  for (const p of phrases) {
    const subj = THEME_SUBJECTS[p.theme];
    p.bodies = subj?.bodies ?? [];
    p.houses = subj?.houses ?? [];
    p.phraseSha256 = sha256(p.text);
    p.source = { store: "voice-bank", path: rel(voiceBankPath), line: p.line, sourceSha256: fileSha };
    p.authorityClass = "owner-approved-prose";
    p.evidenceRole = "PHRASE";
    p.usage = "available-line";
    delete p.line;
  }
  return phrases;
}

// --------------------------------------------- classify the phrasebank files
// Reader-facing owner-approved material is retrievable. Reference, working,
// audit, and test files are indexed for completeness and excluded from
// retrieval.
const WORKING_FILE = /(audit|coverage|queue|report|test|fixture|template|vocab|source|manifest|index|hooks|draft|wip)/i;

function classifyPhrasebank() {
  const dir = path.join(repoRoot, "tldr-astro-phrasebank/phrasebank");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  const out = [];
  for (const file of files) {
    const abs = path.join(dir, file);
    let doc = null;
    try { doc = JSON.parse(fs.readFileSync(abs, "utf8")); } catch { /* recorded below */ }
    const list = doc && !Array.isArray(doc)
      ? ["reviewed", "entries", "rows", "items"].map((k) => doc[k]).find(Array.isArray)
      : (Array.isArray(doc) ? doc : null);
    const entries = list?.length ?? 0;
    const reviewed = (list ?? []).filter((e) => e && /REVIEWED|reviewed-voiced|approved/i.test(String(e.status ?? e.tier ?? ""))).length;
    const looksWorking = WORKING_FILE.test(file);
    const readerFacing = !looksWorking && reviewed > 0;
    out.push({
      file, path: rel(abs), entries, reviewedEntries: reviewed,
      classification: doc === null ? "unparseable" : readerFacing ? "reader-facing-owner-approved" : looksWorking ? "reference-or-working" : "unreviewed",
      retrievable: readerFacing,
      sourceSha256: fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : null
    });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

// ------------------------------------------- phrasebank components, by object
// Voice-bank one-liners are free-floating and retrieved by THEME.
// Phrasebank entries are different: each is written FOR one astrological
// object and its slots are card components (scene, consequence, adjustment).
// So they are retrieved by OBJECT MATCH, and offered as AVAILABLE COMPONENTS
// rather than as quotable lines.
const BODY_ALIASES = {
  sun: "sun", moon: "moon", mercury: "mercury", venus: "venus", mars: "mars",
  jupiter: "jupiter", saturn: "saturn", uranus: "uranus", neptune: "neptune", pluto: "pluto",
  chiron: "chiron", lilith: "lilith", ascendant: "ascendant", asc: "ascendant",
  midheaven: "midheaven", mc: "midheaven", descendant: "descendant", ic: "imum_coeli",
  "north-node": "north_node", north_node: "north_node", "south-node": "south_node", south_node: "south_node"
};
const ASPECTS = ["conjunction", "opposition", "square", "trine", "sextile", "quincunx", "semisextile", "nonagen"];
const ASPECT_CANON = (a) => (a === "nonagen" ? "semisextile" : a);
const SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];

function canonicalFor(entry) {
  const id = String(entry.id ?? "");
  const seg = id.split("/").filter(Boolean);
  const tail = seg[seg.length - 1] ?? "";
  const b = (v) => BODY_ALIASES[String(v ?? "").toLowerCase()] ?? null;

  // their->your synastry contacts
  if (entry.their_body && entry.your_body && entry.aspect) {
    const t = b(entry.their_body), y = b(entry.your_body), a = ASPECT_CANON(String(entry.aspect).toLowerCase());
    if (t && y && ASPECTS.includes(a)) return `synastry-aspect/${t}/${y}/${a}`;
  }
  // transiting body to natal body
  if (entry.transiting_body && (entry.natal_body ?? entry.natal_point) && entry.aspect) {
    const t = b(entry.transiting_body), n = b(entry.natal_body ?? entry.natal_point), a = ASPECT_CANON(String(entry.aspect).toLowerCase());
    if (t && n && ASPECTS.includes(a)) return `transit-aspect/${t}/${n}/${a}`;
  }
  // id-shaped: <body>-<aspect>-<body>
  const pair = new RegExp(`^([a-z_-]+)-(${ASPECTS.join("|")})-([a-z_-]+)$`).exec(tail);
  if (pair) {
    const x = b(pair[1]), y = b(pair[3]), a = ASPECT_CANON(pair[2]);
    if (x && y) {
      if (/aspect-pair/.test(id)) return `transit-aspect/${x}/${y}/${a}`;
      if (/synastry/.test(id)) return `synastry-aspect/${x}/${y}/${a}`;
      if (/composite/.test(id)) { const [p, q] = [x, y].sort(); return `composite-aspect/${p}/${q}/${a}`; }
      const [p, q] = [x, y].sort();
      return `natal-aspect/${p}/${q}/${a}`;
    }
  }
  // placements
  if (entry.planet && entry.sign) { const pl = b(entry.planet), sg = String(entry.sign).toLowerCase(); if (pl && SIGNS.includes(sg)) return `placement-sign/${pl}/${sg}`; }
  if (entry.planet && entry.house) { const pl = b(entry.planet); const h = Number(String(entry.house).replace(/\D/g, "")); if (pl && h >= 1 && h <= 12) return `${/composite/.test(id) ? "composite-placement" : "placement-house"}/${pl}/${h}`; }
  const ph = /^([a-z_-]+)-(\d{1,2})(?:st|nd|rd|th)?-house$/.exec(tail);
  if (ph) { const pl = b(ph[1]); const h = Number(ph[2]); if (pl && h >= 1 && h <= 12) return `placement-house/${pl}/${h}`; }
  const ps = new RegExp(`^([a-z_-]+)-(${SIGNS.join("|")})$`).exec(tail);
  if (ps) { const pl = b(ps[1]); if (pl) return `placement-sign/${pl}/${ps[2]}`; }

  // "<body>-in-<sign>": angles, chiron, nodes, asteroids
  const inSign = new RegExp(`^([a-z_-]+)-in-(${SIGNS.join("|")})$`).exec(tail);
  if (inSign) {
    const pl = b(inSign[1]);
    if (pl) return `placement-sign/${pl}/${inSign[2]}`;
    return `placement-sign/${inSign[1].replace(/-/gu, "_")}/${inSign[2]}`; // ceres, pallas, juno, vesta
  }
  // "<body>-in-<n>(st|nd|rd|th)-house", composite or natal
  const inHouse = /^([a-z_-]+)-in-(\d{1,2})(?:st|nd|rd|th)?-house$/.exec(tail);
  if (inHouse) {
    const pl = b(inHouse[1]) ?? inHouse[1].replace(/-/gu, "_");
    const h = Number(inHouse[2]);
    if (h >= 1 && h <= 12) return `${/composite/.test(id) ? "composite-placement" : "placement-house"}/${pl}/${h}`;
  }
  // bare sign under a sign-scoped collection, e.g. cc/moon-sign/aries
  if (SIGNS.includes(tail)) {
    const scope = seg[seg.length - 2] ?? "";
    const pl = b(scope.replace(/-sign$/u, ""));
    if (pl) return `placement-sign/${pl}/${tail}`;
  }
  // composite planet, no house or sign: cc/composite/venus
  if (/^cc\/composite\//.test(id)) { const pl = b(tail); if (pl) return `composite-body/${pl}`; }
  // moon phase: cc/moon-phase/first-quarter
  if (/moon-phase/.test(id)) return `lunar-phase/${tail.replace(/-/gu, "-")}`;
  // retrograde and retro phases: cc/retrograde/mercury, cc/retro-phase/shadow-pre
  if (/\/retrograde\//.test(id)) { const pl = b(tail); if (pl) return `retrograde/${pl}`; }
  if (/retro-phase/.test(id)) return `retrograde-phase/${tail}`;
  // ingress: cc/ingress/mars-into-aries
  const ing = new RegExp(`^([a-z_-]+)-into-(${SIGNS.join("|")})$`).exec(tail);
  if (ing) { const pl = b(ing[1]); if (pl) return `ingress/${pl}/${ing[2]}`; }
  // asteroid cores: cc/asteroid/ceres
  if (/\/asteroid\//.test(id) && !tail.includes("-in-")) return `body/${tail.replace(/-/gu, "_")}`;
  // house overlays: "<body>-in-<n>th" under a synastry scope
  if (/synastry/.test(id)) {
    const ov = /^([a-z_-]+)-(?:in-)?(\d{1,2})(?:st|nd|rd|th)?$/.exec(tail);
    if (ov) { const pl = b(ov[1]); const h = Number(ov[2]); if (pl && h >= 1 && h <= 12) return `house-overlay/${pl}/${h}`; }
  }
  return null;
}

const COMPONENT_ROLE = {
  // slot-based entries
  angle_specific_scene: "scene", scene: "scene", relational_scene: "scene", recurring_lived_scene: "scene",
  behavioral_consequence: "consequence", dynamic: "consequence", repeating_pattern: "consequence", pressure_meaning: "consequence",
  proportionate_adjustment: "adjustment", navigation: "adjustment", practical_action: "adjustment", deliberate_participation: "adjustment",
  meaning_bridge: "bridge", pass_context: "bridge",
  // entries that carry named prose fields instead of a slots object
  home_scene: "scene", house_domain: "domain", house_integration: "adjustment",
  natal_sign_story: "natal-story", collective_shift: "collective-reading",
  reading: "reading", collective_reading: "collective-reading", compactClaim: "claim", event: "event"
};

// Slot names vary by entry family. Rather than enumerate every one, derive the
// card role from the name so new families classify without a code change.
function roleFor(name) {
  if (COMPONENT_ROLE[name]) return COMPONENT_ROLE[name];
  const n = String(name).toLowerCase();
  if (/scene|story|moment/.test(n)) return "scene";
  if (/pattern|response|cost|loss|wound|vulnerabilit|certainty|underuse|habitual/.test(n)) return "consequence";
  if (/action|practice|move|experiment|adjust|navigat|grounding|healing|opening|opportunit/.test(n)) return "adjustment";
  if (/meaning|bridge|context|gift|capacity|orientation|need|emerging/.test(n)) return "bridge";
  if (/domain|arena|area/.test(n)) return "domain";
  if (/collective/.test(n)) return "collective-reading";
  return "other";
}
// Fields that are metadata or provenance rather than card material.
const NON_COMPONENT_FIELDS = new Set([
  "id", "body", "sign", "house", "status", "surfaces", "surface", "kind", "source_keys",
  "doctrine_source", "tone_version", "originalityCheck", "review_note", "tier", "generated",
  "slots", "their_body", "your_body", "aspect", "valence", "planet", "transiting_body",
  "natal_body", "natal_point", "title", "pair", "template_family", "recommended_long_template",
  "revoice_version", "provenance", "templateId", "dateRange", "weight", "authoringStatus", "note"
]);

function parsePhrasebankComponents(files) {
  const out = [];
  for (const f of files.filter((x) => x.retrievable)) {
    const abs = path.join(repoRoot, f.path);
    let doc; try { doc = JSON.parse(fs.readFileSync(abs, "utf8")); } catch { continue; }
    const list = ["reviewed", "entries", "rows", "items"].map((k) => doc[k]).find(Array.isArray) ?? [];
    for (const [i, e] of list.entries()) {
      if (!e || typeof e !== "object") continue;
      const status = String(e.status ?? ""); const tier = String(e.tier ?? "");
      if (!/REVIEWED/i.test(status) && !/reviewed-voiced/i.test(tier)) continue;
      let slots = e.slots;
      if (typeof slots === "string") { try { slots = JSON.parse(slots); } catch { try { slots = JSON.parse(slots.replace(/'/g, '"')); } catch { slots = null; } } }
      const canonicalId = canonicalFor(e);
      const components = [];
      // Two shapes carry card material: a `slots` object, or named prose fields
      // directly on the entry (planet-in-sign, planet-in-house, and similar).
      const material = (slots && typeof slots === "object")
        ? Object.entries(slots)
        : Object.entries(e).filter(([name]) => !NON_COMPONENT_FIELDS.has(name));
      for (const [name, text] of material) {
        if (typeof text !== "string" || text.trim().length < 15) continue;
        components.push({ slot: name, role: roleFor(name), text: text.trim(), textSha256: sha256(text.trim()) });
      }
      if (!components.length) continue;
      out.push({
        evidenceRole: "PHRASE",
        kind: "component-set",
        usage: "available-component",
        canonicalId,
        nativeId: e.id ?? null,
        entryKind: e.kind ?? null,
        handVoiced: /reviewed-voiced/i.test(tier),
        authorityClass: "owner-approved-prose",
        components,
        source: { store: "phrasebank", path: f.path, index: i, sourceSha256: f.sourceSha256 }
      });
    }
  }
  return out;
}

// Voice exemplars are indexed separately from reusable PHRASE evidence. These
// four sources are deliberately doctrine-only and non-retrievable: the index
// records their provenance now without granting a surface permission or
// exposing their prose through selectPhrases().
function parseFourBodyVoiceExemplars() {
  if (!fs.existsSync(fourBodyVoiceManifestPath)) {
    throw new Error("FOUR_BODY_VOICE_MANIFEST_MISSING: run node scripts/build-four-body-voice-exemplars.mjs --write.");
  }
  const manifest = JSON.parse(fs.readFileSync(fourBodyVoiceManifestPath, "utf8"));
  if (manifest.expectedEntries !== 4 || !Array.isArray(manifest.entries) || manifest.entries.length !== 4) {
    throw new Error(`FOUR_BODY_VOICE_ROWS_SHRANK: found ${manifest.entries?.length ?? 0}; expected exactly 4.`);
  }
  return manifest.entries.map((entry) => {
    const absolute = path.join(path.dirname(fourBodyVoiceManifestPath), entry.filename);
    const bytes = fs.readFileSync(absolute);
    if (sha256(bytes) !== entry.sourceSha256) {
      throw new Error(`FOUR_BODY_VOICE_SOURCE_STALE: ${entry.filename} does not match its manifest hash.`);
    }
    if (entry.authorityClass !== "voice-exemplar"
      || entry.retrievable !== false
      || entry.writerEligible !== false
      || entry.renderEligible !== false
      || entry.surfacePermission?.length !== 1
      || entry.surfacePermission[0] !== "doctrine-only") {
      throw new Error(`FOUR_BODY_VOICE_PERMISSION_INVALID: ${entry.filename} is not fail-closed.`);
    }
    const text = bytes.toString("utf8");
    return {
      ...entry,
      text,
      textSha256: sha256(text),
      source: {
        store: "voice-exemplar",
        path: rel(absolute),
        sourceSha256: entry.sourceSha256,
        manifestPath: rel(fourBodyVoiceManifestPath),
        manifestSha256: sha256(fs.readFileSync(fourBodyVoiceManifestPath))
      }
    };
  });
}

// --------------------------------------------------------------------- build
const phrases = parseVoiceBank();
const phrasebankFiles = classifyPhrasebank();
const components = parsePhrasebankComponents(phrasebankFiles);
const voiceExemplars = parseFourBodyVoiceExemplars();

const byTheme = {};
for (const p of phrases) {
  byTheme[p.theme] ??= { count: 0, kinds: {}, bodies: p.bodies, houses: p.houses, addresses: p.addresses };
  byTheme[p.theme].count += 1;
  byTheme[p.theme].kinds[p.kind] = (byTheme[p.theme].kinds[p.kind] ?? 0) + 1;
}

const payload = {
  schemaVersion: 1,
  evidenceRole: "PHRASE",
  status: "index-only. Sources are referenced in place, never moved or edited. Nothing here is approved for serving.",
  deterministic: "No timestamps. Identical inputs produce a byte-identical file.",
  policy: {
    usage: "AVAILABLE LINES. Owner material that may be used verbatim or adapted.",
    distinctFrom: {
      registerExample: "demonstrates voice, not for reuse",
      correctionPair: "demonstrates judgment, not for reuse"
    },
    blockRule: "If a target subject matches a voice-bank theme and no phrases resolve into the packet, the run blocks."
  },
  totals: {
    phrases: phrases.length,
    oneLiners: phrases.filter((p) => p.kind === "one-liner").length,
    goldExamples: phrases.filter((p) => p.kind === "gold-example").length,
    approvedSwaps: phrases.filter((p) => p.kind === "approved-swap").length,
    livedMomentRules: phrases.filter((p) => p.kind === "lived-moment-rule").length,
    themes: Object.keys(byTheme).length,
    phrasebankFiles: phrasebankFiles.length,
    phrasebankRetrievable: phrasebankFiles.filter((f) => f.retrievable).length,
    phrasebankExcluded: phrasebankFiles.filter((f) => !f.retrievable).length,
    componentSets: components.length,
    componentSetsWithCanonicalId: components.filter((c) => c.canonicalId).length,
    componentSetsUnmapped: components.filter((c) => !c.canonicalId).length,
    handVoicedSets: components.filter((c) => c.handVoiced).length,
    componentsTotal: components.reduce((n, c) => n + c.components.length, 0),
    voiceExemplars: voiceExemplars.length,
    voiceExemplarsRetrievable: voiceExemplars.filter((entry) => entry.retrievable).length
  },
  themeSubjects: THEME_SUBJECTS,
  byTheme,
  phrasebankFiles,
  phrases,
  components,
  voiceExemplars
};
payload.integrity = { contentSha256: sha256({ phrases: payload.phrases, components: payload.components, voiceExemplars: payload.voiceExemplars }) };

const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (check) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) { console.error("STALE: phrase index does not match a fresh build."); process.exit(1); }
  console.log("Phrase index is current.");
  process.exit(0);
}

console.log(JSON.stringify({ totals: payload.totals, byTheme: Object.fromEntries(Object.entries(byTheme).map(([k, v]) => [k, v.count])) }, null, 2));

if (write) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`\nWrote ${rel(outPath)}`);
} else {
  console.log("\nDry run. Re-run with --write.");
}
