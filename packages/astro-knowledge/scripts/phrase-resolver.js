"use strict";

/**
 * PHRASE retrieval.
 *
 * Selects 5 to 10 thematically relevant owner lines for a target and returns
 * them as AVAILABLE LINES: material that may be used verbatim or adapted.
 *
 * These are deliberately distinct from the other two things a writer sees:
 *   register examples  demonstrate voice        (do not reuse)
 *   correction pairs   demonstrate judgment     (do not reuse)
 *   AVAILABLE LINES    owner's own approved copy (reuse encouraged)
 *
 * Block rule: if a target's subject matches a voice-bank theme and no phrases
 * resolve, the run stops. Silence here means the writer was denied the owner's
 * own material on a subject she has already written about.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const phraseIndexPath = path.join(repoRoot, "packages/astro-knowledge/generated/phrase-index.json");

const sha256 = (v) => crypto.createHash("sha256")
  .update(Buffer.isBuffer(v) || typeof v === "string" ? v : JSON.stringify(v))
  .digest("hex");

let cached = null;
function verifyPhraseSources(meta) {
  const expected = new Map();
  const register = (source) => {
    if (!source?.path || !source?.sourceSha256) return;
    const prior = expected.get(source.path);
    if (prior && prior !== source.sourceSha256) {
      throw new Error(`PHRASE_SOURCE_HASH_CONFLICT: ${source.path}. No provider call is allowed.`);
    }
    expected.set(source.path, source.sourceSha256);
  };
  for (const entry of meta.phrasebankFiles ?? []) register(entry);
  for (const phrase of meta.phrases ?? []) register(phrase.source);
  for (const component of meta.components ?? []) register(component.source);
  for (const exemplar of meta.voiceExemplars ?? []) {
    register(exemplar.source);
    register({
      path: exemplar.source?.manifestPath,
      sourceSha256: exemplar.source?.manifestSha256
    });
  }
  for (const [relative, expectedSha256] of expected) {
    const absolute = path.join(repoRoot, relative);
    if (!fs.existsSync(absolute)) {
      throw new Error(`PHRASE_SOURCE_MISSING: ${relative}. No provider call is allowed.`);
    }
    if (sha256(fs.readFileSync(absolute)) !== expectedSha256) {
      throw new Error(`PHRASE_INDEX_STALE: ${relative} changed after the phrase index was built. No provider call is allowed.`);
    }
  }
}

function loadPhraseIndex() {
  if (cached) return cached;
  if (!fs.existsSync(phraseIndexPath)) {
    throw new Error("PHRASE_INDEX_MISSING: run node scripts/build-phrase-index.mjs --write. No provider call is allowed.");
  }
  const raw = fs.readFileSync(phraseIndexPath, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed.evidenceRole !== "PHRASE" || !Array.isArray(parsed.phrases)) {
    throw new Error("PHRASE_INDEX_INVALID: no provider call is allowed.");
  }
  const expectedContentSha256 = sha256({
    phrases: parsed.phrases,
    components: parsed.components ?? [],
    voiceExemplars: parsed.voiceExemplars ?? []
  });
  if (parsed.integrity?.contentSha256 !== expectedContentSha256) {
    throw new Error("PHRASE_INDEX_TAMPERED: content hash mismatch. No provider call is allowed.");
  }
  verifyPhraseSources(parsed);
  cached = { meta: parsed, indexSha256: sha256(raw) };
  return cached;
}

/** Bodies and houses a canonical id touches. */
function subjectsOf(canonicalId, context = {}) {
  const parts = String(canonicalId).split("/");
  const bodies = new Set();
  const houses = new Set();
  for (const p of parts.slice(1)) {
    if (/^\d+$/.test(p)) houses.add(Number(p));
    else if (/^[a-z_]+$/.test(p) && !["conjunction", "opposition", "square", "trine", "sextile", "quincunx", "semisextile"].includes(p)) bodies.add(p);
  }
  if (context.house != null) houses.add(Number(context.house));
  return { bodies: [...bodies], houses: [...houses] };
}

/** Themes whose subjects intersect the target. */
function matchingThemes(canonicalId, context = {}) {
  const { meta } = loadPhraseIndex();
  const { bodies, houses } = subjectsOf(canonicalId, context);
  const matched = [];
  for (const [theme, subj] of Object.entries(meta.themeSubjects)) {
    const bodyHits = (subj.bodies ?? []).filter((b) => bodies.includes(b));
    const houseHits = (subj.houses ?? []).filter((h) => houses.includes(h));
    if (bodyHits.length || houseHits.length) {
      matched.push({ theme, bodyHits, houseHits, score: bodyHits.length * 2 + houseHits.length, addresses: subj.addresses });
    }
  }
  return matched.sort((a, b) => b.score - a.score);
}

/**
 * Phrasebank components for one object.
 *
 * These are retrieved by OBJECT MATCH, not theme. Each set was written for a
 * specific astrological object, and its slots are card components (scene,
 * consequence, adjustment, bridge) rather than free-floating lines. Exact
 * matches come first; a same-pair natal set is offered as mechanism reference
 * only, on the same rule the evidence resolver uses.
 */
function selectComponents(canonicalId, { max = 3 } = {}) {
  const { meta } = loadPhraseIndex();
  const all = meta.components ?? [];
  const exact = all.filter((c) => c.canonicalId === canonicalId);

  const related = [];
  const parts = String(canonicalId).split("/");
  if (parts[0] === "transit-aspect" && parts.length === 4) {
    const [, t, n, a] = parts;
    const [x, y] = [t, n].sort();
    for (const c of all) {
      if (c.canonicalId === `natal-aspect/${x}/${y}/${a}`) related.push({ ...c, relation: "same-pair-mechanism" });
    }
  }

  const rank = (c) => (c.handVoiced ? 0 : 1);
  const sets = [...exact].sort((p, q) => rank(p) - rank(q)).slice(0, max);
  return {
    exact: sets,
    related: related.slice(0, 2),
    counts: { exactSets: exact.length, relatedSets: related.length, selected: sets.length,
              components: sets.reduce((n, c) => n + c.components.length, 0) }
  };
}

/** Prompt block for components. Distinct from AVAILABLE LINES. */
function componentsToPrompt(selection) {
  if (!selection.exact.length && !selection.related.length) return "";
  const lines = [
    "AVAILABLE COMPONENTS (owner-approved, written for this exact object)",
    "Unlike the available lines above, these were written specifically for this",
    "placement or contact. Each is a card component: a scene, the consequence it",
    "produces, or the adjustment it asks for. Reuse or adapt them. If you write",
    "your own scene instead, it should be at least as concrete as these.",
    ""
  ];
  for (const set of selection.exact) {
    lines.push(`--- ${set.nativeId ?? set.canonicalId}${set.handVoiced ? "  [hand-voiced]" : ""}`);
    for (const c of set.components) lines.push(`  ${c.role}: ${c.text}`);
    lines.push("");
  }
  for (const set of selection.related) {
    lines.push(`--- ${set.nativeId ?? set.canonicalId}  [MECHANISM REFERENCE ONLY: this is the lifelong natal pattern for the same pair. Do not borrow its permanent framing.]`);
    for (const c of set.components) lines.push(`  ${c.role}: ${c.text}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

/**
 * @returns {{availableLines, themesMatched, blocked, reason, phraseIndexSha256}}
 */
function selectPhrases(canonicalId, { context = {}, min = 5, max = 10, surface = "friends-transit" } = {}) {
  const { meta, indexSha256 } = loadPhraseIndex();
  if (surface !== "friends-transit") {
    return {
      canonicalId,
      surface,
      themesMatched: [],
      components: { exact: [], related: [], counts: { exactSets: 0, relatedSets: 0, selected: 0, components: 0 } },
      availableLines: [],
      livedMomentRules: [],
      approvedSwaps: [],
      counts: { themesMatched: 0, linesSelected: 0, min, max, componentSets: 0, components: 0 },
      blocked: false,
      reason: null,
      excludedReason: `VOICE_SURFACE_POLICY_UNAPPROVED: phrase evidence is not approved for ${surface}.`,
      phraseIndexSha256: indexSha256
    };
  }
  const themes = matchingThemes(canonicalId, context);
  const themeNames = new Set(themes.map((t) => t.theme));

  const themed = meta.phrases.filter((p) => p.kind === "one-liner" && themeNames.has(p.theme));
  const ranked = themed
    .map((p) => ({ ...p, score: themes.find((t) => t.theme === p.theme)?.score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  // Round-robin across matched themes so one theme cannot crowd out the rest.
  const selected = [];
  const perTheme = new Map();
  for (const p of ranked) {
    const n = perTheme.get(p.theme) ?? 0;
    if (n >= 3) continue;
    perTheme.set(p.theme, n + 1);
    selected.push(p);
    if (selected.length >= max) break;
  }
  if (selected.length < max) {
    for (const p of ranked) {
      if (selected.length >= max) break;
      if (!selected.includes(p)) selected.push(p);
    }
  }

  const componentSelection = selectComponents(canonicalId);
  const blocked = themes.length > 0 && selected.length === 0 && componentSelection.counts.selected === 0;
  return {
    canonicalId,
    surface,
    themesMatched: themes,
    components: componentSelection,
    availableLines: selected.map((p) => ({
      text: p.text, theme: p.theme, addresses: p.addresses,
      authorityClass: p.authorityClass, phraseSha256: p.phraseSha256,
      source: p.source
    })),
    livedMomentRules: meta.phrases.filter((p) => p.kind === "lived-moment-rule").map((p) => p.text),
    approvedSwaps: meta.phrases.filter((p) => p.kind === "approved-swap").map((p) => ({ use: p.text, avoid: p.avoid })),
    counts: { themesMatched: themes.length, linesSelected: selected.length, min, max,
              componentSets: componentSelection.counts.selected, components: componentSelection.counts.components },
    blocked,
    reason: blocked
      ? `PHRASE_EVIDENCE_MISSING: ${canonicalId} matches voice-bank themes [${[...themeNames].join(", ")}] but neither owner lines nor phrasebank components resolved. No provider call is allowed.`
      : null,
    phraseIndexSha256: indexSha256
  };
}

/** Throws when the block rule fires. Call before any provider request. */
function assertPhraseEvidence(selection) {
  if (selection.blocked) throw new Error(selection.reason);
  verifyPhraseSources(loadPhraseIndex().meta);
  const currentIndexSha256 = sha256(fs.readFileSync(phraseIndexPath, "utf8"));
  if (selection.phraseIndexSha256 !== currentIndexSha256) {
    throw new Error("PHRASE_INDEX_STALE: phrase evidence changed after selection. No provider call is allowed.");
  }
  if ((selection.availableLines ?? []).some((line) => (
    line.authorityClass !== "owner-approved-prose"
    || line.phraseSha256 !== sha256(line.text)
  ))) {
    throw new Error("PHRASE_EVIDENCE_UNAUTHORIZED: available line authority or hash failed. No provider call is allowed.");
  }
  const componentSets = [
    ...(selection.components?.exact ?? []),
    ...(selection.components?.related ?? [])
  ];
  if (componentSets.some((set) => (
    set.authorityClass !== "owner-approved-prose"
    || set.components.some((component) => component.textSha256 !== sha256(component.text))
  ))) {
    throw new Error("PHRASE_EVIDENCE_UNAUTHORIZED: component authority or hash failed. No provider call is allowed.");
  }
  return selection;
}

/** Prompt block. Labels these as reusable, unlike register examples. */
function phrasesToPrompt(selection) {
  if (!selection.availableLines.length) return "";
  const lines = [
    "AVAILABLE LINES (owner-approved material)",
    "These are the owner's own approved lines on subjects this target touches.",
    "You may use them verbatim or adapt them. They are not register examples and",
    "not correction pairs: those demonstrate voice and judgment and must not be reused.",
    "Using none of them is acceptable. Inventing a weaker version of one is not.",
    ""
  ];
  for (const l of selection.availableLines) {
    lines.push(`- ${l.text}`);
    lines.push(`    [theme: ${l.theme} | addresses: ${l.addresses}]`);
  }
  return lines.join("\n");
}

/** Both phrase blocks, in the order they should appear in a prompt. */
function phraseEvidenceToPrompt(selection) {
  return [phrasesToPrompt(selection), componentsToPrompt(selection.components)].filter(Boolean).join("\n\n");
}

module.exports = {
  loadPhraseIndex, matchingThemes, selectPhrases, selectComponents,
  assertPhraseEvidence, phrasesToPrompt, componentsToPrompt, phraseEvidenceToPrompt, subjectsOf
};
