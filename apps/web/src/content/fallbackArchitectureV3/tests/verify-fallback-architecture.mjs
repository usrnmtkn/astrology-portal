// Verifies the v3 fallback architecture package.
// 1. Role safety: fallback_source rows never render; templates/vocab are labeled.
// 2. Grammar frames: every vocabulary row conforms to its declared frame.
// 3. Render dry-run: planet-in-sign and planet-in-sign-in-house produce complete
//    paragraphs for every planet x sign (x sample houses), both voices.
// 4. Banned-phrase and meta-copy checks on all rendered output.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { renderNatalPlacement, renderNatalAngle, renderNatalAspect, renderProfectionYear, RoleViolationError, SourceGapError } from "../resolver/renderFallback.mjs";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const baseRowsFile = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/fallback-source-rows-v3.json"), "utf8"));
const placementInterim = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/placement-interim-fixes-v1.json"), "utf8"));
const rowsFile = {
  ...baseRowsFile,
  vocabularyRows: [
    ...baseRowsFile.vocabularyRows,
    ...placementInterim.vocabularyRows
  ]
};
const contract = JSON.parse(fs.readFileSync(path.join(here, "../contracts/CONTENT-ROLE-CONTRACT.json"), "utf8"));
const knownFailures = JSON.parse(fs.readFileSync(path.join(here, "./fallback-architecture-known-failures-v1.json"), "utf8"));
const expectedNatalAspectSourceGaps = new Set(knownFailures.expectedNatalAspectSourceGaps);

const BANNED = [
  "this part of them", "this part of you", "how this part becomes active", "becomes active",
  "is not generic", "working through", "the point is", "describes how", "this placement describes",
  "carries that story further", "becomes concrete through", "this is where", "builds identity",
  "qualities in the chart", "in the chart.", "part of daily life",
];

const WEIRD = contract.styleRules?.bannedWords ?? [];
const weirdRe = WEIRD.length ? new RegExp(`\\b(${WEIRD.join("|")})\\b`, "i") : null;
const V14_EMPTY_HOUSE_PREFIX = "fallback-hook/empty-house/";
// Pre-existing, owner-approved sky-placement rows that already fail the newer
// everyday-word rule. This exact-key baseline keeps the gate ratcheted: new
// failures still fail, while this unrelated delta does not rewrite approved copy.
const BASELINE_APPROVED_WEIRD_HOOKS = new Set([
  "fallback-hook/sky-placement-turn/mars/taurus",
  "fallback-hook/sky-placement-turn/neptune/taurus",
  "fallback-hook/sky-placement-turn/north-node/libra",
  "fallback-hook/sky-placement-turn/pluto/gemini",
  "fallback-hook/sky-placement-lived/pluto/taurus",
  "fallback-hook/sky-placement-turn/pluto/taurus",
  "fallback-hook/sky-placement-lived/south-node/gemini",
  "fallback-hook/sky-placement-turn/south-node/gemini",
  "fallback-hook/sky-placement-lived/uranus/cancer",
  "fallback-hook/sky-placement-lived/uranus/pisces",
  "fallback-hook/sky-placement-turn/lilith/cancer",
  "fallback-hook/sky-placement-hook/lilith/virgo"
]);
let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL:", msg); };

const retiredSkyPlacementMoves = (rowsFile.hookRows ?? []).filter((row) =>
  row.contentKey.startsWith("fallback-hook/sky-placement-moves/")
);
if (retiredSkyPlacementMoves.length !== 0) {
  fail(`retired sky-placement-moves rows remain in approved source: ${retiredSkyPlacementMoves.length}`);
}

// 1 + 2: row hygiene
for (const r of rowsFile.vocabularyRows) {
  if (!contract.roles[r.content_role]) fail(`${r.contentKey}: unknown role ${r.content_role}`);
  if (r.content_role === "fallback_source") fail(`${r.contentKey}: fallback_source row in vocabulary list`);
  if (/[.!?]$/.test(r.body) && r.grammar_frame !== "complete_sentence") fail(`${r.contentKey}: trailing punctuation (${r.grammar_frame})`);
  if (!r.contentKey.startsWith("fallback-vocab/dodont-")) if (r.review_status !== "approved_reuse" && /\b(you|your|yourself)\b/i.test(r.body)) fail(`${r.contentKey}: second-person leak (only verbatim approved source may contain generic 'you'): ${r.body}`);
  if (/[\u2014\u2013]/.test(r.body)) fail(`${r.contentKey}: em/en dash prohibited in reader-facing bodies`);
  if (weirdRe && weirdRe.test(r.body)) fail(`${r.contentKey}: banned non-everyday word: ${r.body}`);
  if (r.grammar_frame === "gerund_phrase" && !/^\w+ing\b/.test(r.body)) fail(`${r.contentKey}: not a gerund`);
  if (r.grammar_frame === "it_clause" && !/^(it|the pattern|the placement|the contact)\b/i.test(r.body)) fail(`${r.contentKey}: person-subject clause`);
  if (r.grammar_frame === "verb_clause_3s" && !/^[a-z]+s\b/.test(r.body)) fail(`${r.contentKey}: verb_clause_3s must start with a 3rd-person-singular verb`);
}
for (const r of rowsFile.hookRows ?? []) {
  const isReaderOnlyFullCopy = (
    r.reader_only === true
    && r.content_role === "full_copy"
    && typeof r.body === "string"
    && r.body.trim().length > 0
  );
  if (!isReaderOnlyFullCopy && r.content_role !== "fallback_hook") fail(`${r.contentKey}: hook row missing fallback_hook role`);
  // fog-note rows are reader-only by design (appended solely on the you-voice authored path)
  const READER_ONLY = ["fallback-hook/fog-note/"];
  if (!isReaderOnlyFullCopy && !READER_ONLY.some((p) => r.contentKey.startsWith(p)) && (!r.body_you || !r.body_they)) fail(`${r.contentKey}: hook rows need both voice variants`);
  const SINGLE_VOICE = ["fallback-hook/synastry-", "fallback-hook/element-pattern/", "fallback-hook/compat-domain/", "fallback-hook/transit-aspect-type/", "fallback-hook/planet-grates/", "fallback-hook/transit-retro", "fallback-hook/sky-", "fallback-hook/circle-", "fallback-hook/moon-", "fallback-hook/season-marker/", "fallback-hook/bond-effect-", "fallback-hook/lunation-", "fallback-hook/daily-"];
  if (!SINGLE_VOICE.some((p) => r.contentKey.startsWith(p)) && /\b(you|your|yourself)\b/i.test(r.body_they)) fail(`${r.contentKey}: second-person leak in body_they`); // synastry hooks are single-voice: always addressed to the reader
  const renderedFields = [r.body, r.body_you, r.body_they].filter((value) => typeof value === "string").join(" ");
  if (/[\u2014\u2013]/.test(renderedFields)) fail(`${r.contentKey}: em/en dash in hook`);
  if (
    weirdRe
    && weirdRe.test(renderedFields)
    && !BASELINE_APPROVED_WEIRD_HOOKS.has(r.contentKey)
    // V14 empty-house wording is owner-approved exact copy. Its dedicated
    // deterministic gate validates the corpus and both serving voices.
    && !r.contentKey.startsWith(V14_EMPTY_HOUSE_PREFIX)
  ) fail(`${r.contentKey}: banned word in hook`);
}
for (const r of rowsFile.fallbackSourceRows) {
  if (r.content_role !== "fallback_source") fail(`${r.contentKey}: source row missing fallback_source role`);
}
{
  const hooks = new Map((rowsFile.hookRows ?? []).map((row) => [row.contentKey, row]));
  for (const quality of ["hard", "soft", "conjunction"]) {
    const row = hooks.get(`fallback-hook/sky-event/aspect-${quality}`);
    if (!row) {
      fail(`fallback-hook/sky-event/aspect-${quality}: missing global Sky event frame`);
      continue;
    }
    for (const field of ["body_you", "body_they"]) {
      if (!/\bfor the collective\b/u.test(row[field] ?? "")) {
        fail(`${row.contentKey}: ${field} must use the approved "for the collective" wording`);
      }
      if (/\bfor everyone at once\b/u.test(row[field] ?? "")) {
        fail(`${row.contentKey}: ${field} restored the retired "for everyone at once" wording`);
      }
    }
  }
}
{
  const baseTemplatesFile = JSON.parse(fs.readFileSync(path.join(here, "../templates/fallback-templates-v3.json"), "utf8"));
  const templatesFile = {
    ...baseTemplatesFile,
    templates: [
      ...baseTemplatesFile.templates,
      ...placementInterim.templates
    ]
  };
  for (const t of templatesFile.templates) {
    if (/[\u2014\u2013]/.test((t.body ?? "") + (t.body_you ?? "") + (t.body_they ?? ""))) fail(`${t.contentKey}: em/en dash prohibited in template bodies`);
  }
}

// Sky-placement cross-slot contract. The Moon is the first approved migration
// to exclusive slot ownership. Extend this list only when another planet's
// hook/lived/practice rows complete owner review as a set.
{
  const SLOT_OWNERSHIP_PLANETS = ["moon"];
  const hooks = new Map((rowsFile.hookRows ?? []).map((row) => [row.contentKey, row]));
  const vocab = new Map((rowsFile.vocabularyRows ?? []).map((row) => [row.contentKey, row]));
  const DURATION_RE = /\b(?:about\s+|around\s+|for\s+about\s+|for\s+around\s+|next\s+)?(?:two and a half days|couple of days|\d+\s+(?:days|weeks|months|years))\b/gi;
  const CLOSING_BEAT_RE = /\b(?:moves? on|passing tone|travel light|sky changes again|let(?:ting)? (?:it|feelings?) (?:move through|pass)|pass(?:es|ing)? without a verdict)\b/gi;
  const fillSlots = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/gu, (_, key) => ctx[key] ?? `{{${key}}}`);
  const normalizeWords = (body) => body
    .toLowerCase()
    .replace(/[^a-z' ]+/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
  const sentenceTrigrams = (body) => {
    const phrases = new Set();
    for (const sentence of body.split(/[.!?]+/u)) {
      const words = normalizeWords(sentence);
      for (let index = 0; index + 2 < words.length; index++) {
        phrases.add(`${words[index]} ${words[index + 1]} ${words[index + 2]}`);
      }
    }
    return phrases;
  };

  for (const planet of SLOT_OWNERSHIP_PLANETS) {
    for (const sign of rowsFile.coverage.signs) {
      const signTitle = sign.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
      const signStyle = vocab.get(`fallback-vocab/sign-style/${sign}`)?.body;
      const signDoes = vocab.get(`fallback-vocab/sign-does/${sign}`)?.body;
      const hookRow = hooks.get(`fallback-hook/sky-placement-you/${planet}`);
      const livedRow = hooks.get(`fallback-hook/sky-placement/${planet}`);
      const practiceRow = hooks.get(`fallback-hook/sky-placement-practice/${planet}`);
      const trapRow = hooks.get(`fallback-hook/sky-sign-trap/${sign}`);
      const id = `sky-placement ${planet}/${sign}`;

      if (!signStyle || !hookRow || !livedRow || !practiceRow || !trapRow) {
        fail(`${id}: missing generic fallback atom`);
        continue;
      }
      for (const row of [hookRow, livedRow, practiceRow]) {
        if (row.review_status !== "approved") fail(`${id}: ${row.contentKey} is not approved`);
      }

      const ctx = { signTitle, signStyle, signDoes };
      const parts = [
        fillSlots(hookRow.body_you, ctx),
        fillSlots(livedRow.body_you, ctx),
        `The catch is ${trapRow.body_you} ${fillSlots(practiceRow.body_you, ctx)}`
      ];
      const body = parts.join("\n\n");
      const styleCount = body.split(signStyle).length - 1;
      if (styleCount !== 1) fail(`${id}: signStyle rendered ${styleCount}x`);

      const durations = body.match(DURATION_RE) ?? [];
      if (durations.length !== 1) fail(`${id}: expected one duration statement, found ${durations.length} (${durations.join(" | ")})`);

      const closers = body.match(CLOSING_BEAT_RE) ?? [];
      if (closers.length !== 1) fail(`${id}: expected one closing beat, found ${closers.length} (${closers.join(" | ")})`);

      const phraseSets = parts.map(sentenceTrigrams);
      for (let left = 0; left < phraseSets.length; left++) {
        for (let right = left + 1; right < phraseSets.length; right++) {
          const shared = [...phraseSets[left]].find((phrase) => phraseSets[right].has(phrase));
          if (shared) fail(`${id}: slots ${left}/${right} share phrase "${shared}"`);
        }
      }
    }
  }
  console.log(`Verified ${SLOT_OWNERSHIP_PLANETS.length * rowsFile.coverage.signs.length} sky-placement fallback slot contracts.`);
}

// Natal-placement interim gate: draft overrides must remove cross-vocab stem
// collisions, render all 14 planet frames across all signs, keep sign/house
// paragraphs trigram-distinct, and retain per-planet opening variation.
{
  const vocab = new Map(rowsFile.vocabularyRows.map((row) => [row.contentKey, row]));
  const STOP_WORDS = new Set([
    "and", "the", "what", "with", "into", "from", "that", "this", "they", "them",
    "their", "your", "you", "most", "things", "itself", "someone", "both", "more"
  ]);
  const stem = (word) => {
    let normalized = word.toLowerCase().replace(/[^a-z]/gu, "");
    if (normalized.length <= 3 || STOP_WORDS.has(normalized)) return null;
    for (const suffix of ["ingly", "edly", "ation", "ition", "ness", "ment", "able", "ible", "ing", "ed", "ly", "es", "s", "th"]) {
      if (normalized.endsWith(suffix) && normalized.length - suffix.length > 3) {
        normalized = normalized.slice(0, -suffix.length);
        break;
      }
    }
    return normalized.length > 3 ? normalized : null;
  };
  const contentStems = (body) => new Set(
    body.split(/\s+/u).map(stem).filter(Boolean)
  );
  const normalizedWords = (body) => body
    .toLowerCase()
    .replace(/[^a-z' ]+/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
  const trigrams = (body) => {
    const phrases = new Set();
    for (const sentence of body.split(/[.!?]+/u)) {
      const words = normalizedWords(sentence);
      for (let index = 0; index + 2 < words.length; index++) {
        phrases.add(`${words[index]} ${words[index + 1]} ${words[index + 2]}`);
      }
    }
    return phrases;
  };

  for (const sign of rowsFile.coverage.signs) {
    for (const [leftFamily, rightFamily] of [
      ["sign-adverb", "sign-need"],
      ["sign-style", "sign-does"]
    ]) {
      const left = vocab.get(`fallback-vocab/${leftFamily}/${sign}`)?.body;
      const right = vocab.get(`fallback-vocab/${rightFamily}/${sign}`)?.body;
      if (!left || !right) {
        fail(`placement vocab ${sign}: missing ${leftFamily}/${rightFamily}`);
        continue;
      }
      const leftStems = contentStems(left);
      const shared = [...contentStems(right)].find((candidate) => leftStems.has(candidate));
      if (shared) {
        fail(`placement vocab ${sign}: ${leftFamily}/${rightFamily} share stem "${shared}" (${left} | ${right})`);
      }
      const leftTrigrams = trigrams(left);
      const sharedTrigram = [...trigrams(right)].find((phrase) => leftTrigrams.has(phrase));
      if (sharedTrigram) {
        fail(`placement vocab ${sign}: ${leftFamily}/${rightFamily} share phrase "${sharedTrigram}"`);
      }
    }
  }

  const placementPlanets = placementInterim.templates.map((template) => template.contentKey.split("/").pop());
  const openingPrefixes = new Map();
  let placementFrameRenders = 0;

  for (const planet of placementPlanets) {
    for (const sign of rowsFile.coverage.signs) {
      const out = renderNatalPlacement(
        { planet, sign, house: 1, voice: "you", dignity: null, isRetrograde: false },
        { allowUnreviewed: true }
      );
      placementFrameRenders++;
      if (/\{\{|\}\}/u.test(out.body)) fail(`placement frame ${planet}/${sign}: unresolved slot`);
      if (out.parts.length !== 2) fail(`placement frame ${planet}/${sign}: expected sign and house parts`);

      if (sign === rowsFile.coverage.signs[0]) {
        const planetTitle = planet.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
        const openerStart = out.parts[0].indexOf(`Your ${planetTitle}`);
        if (openerStart < 0) {
          fail(`placement frame ${planet}: rendered opener not found`);
          continue;
        }
        const firstFour = normalizedWords(out.parts[0].slice(openerStart)).slice(0, 4).join(" ");
        if (openingPrefixes.has(firstFour)) {
          fail(`placement frame ${planet}: first four words duplicate ${openingPrefixes.get(firstFour)} ("${firstFour}")`);
        } else {
          openingPrefixes.set(firstFour, planet);
        }
      }
    }
  }
  if (placementFrameRenders !== 168) fail(`placement frames: expected 168 renders, got ${placementFrameRenders}`);

  const gatedLeo = renderNatalPlacement(
    { planet: "lilith", sign: "leo", house: null, voice: "you", dignity: null, isRetrograde: false }
  );
  const previewLeo = renderNatalPlacement(
    { planet: "lilith", sign: "leo", house: null, voice: "you", dignity: null, isRetrograde: false },
    { allowUnreviewed: true }
  );
  if (!gatedLeo.body.includes("recognition and warmth")) fail("placement review gate: approved Leo need did not remain live");
  if (gatedLeo.body.includes("recognition and devotion")) fail("placement review gate: needs-review Leo need leaked");
  if (!previewLeo.body.includes("recognition and devotion")) fail("placement review gate: draft Leo need missing from QA preview");
  if (!previewLeo.body.includes("meaning you refuse and reclaim")) fail("placement review gate: Lilith benchmark frame missing");

  console.log(`Verified ${placementFrameRenders} review-gated natal placement frames and placement vocab collisions.`);
}

// 3 + 4: full-coverage dry run (allowUnreviewed so needs_review drafts render for QA)
const planets = rowsFile.coverage.planets;
const signs = rowsFile.coverage.signs;
const sampleHouses = [1, 6, 10, 12];
let rendered = 0;
for (const planet of planets) {
  for (const sign of signs) {
    for (const voice of ["you", "Sofia"]) {
      for (const house of [null, ...sampleHouses]) {
        try {
          const out = renderNatalPlacement(
            { planet, sign, house, voice, dignity: null, isRetrograde: false },
            { allowUnreviewed: true }
          );
          rendered++;
          const low = out.body.toLowerCase();
          for (const b of BANNED) if (low.includes(b)) fail(`banned phrase "${b}" in ${planet}/${sign}/${house}: ${out.body}`);
          {
            // catch real conjugation bugs ("they builds") without flagging base verbs that end in s
            const OK_AFTER_THEY = new Set(["process", "express", "discuss", "miss", "guess", "pass", "possess", "always", "sometimes", "perhaps", "this", "is", "was", "has", "does", "across"]);
            const m = low.match(/\bthey ([a-z]+s)\b/g) ?? [];
            for (const hit of m) {
              const w = hit.slice(5);
              if (!OK_AFTER_THEY.has(w) && !w.endsWith("ss")) fail(`subject-verb bug in ${planet}/${sign}: "${hit}" in: ${out.body}`);
            }
          }
          if (/\ba (?!(?:one|once|uni|use|usu|eu))[aeiou]/.test(low)) fail(`article bug in ${planet}/${sign}: ${out.body}`);
          if (out.body.split(/[.!?]\s/).length < 3) fail(`too thin (<3 sentences) ${planet}/${sign}/${house}: ${out.body}`);
          if (house && out.parts.length !== 2) fail(`expected two-part render for ${planet}/${sign}/${house}`);
          if (!house && out.parts.length !== 1) fail(`expected single-part render for ${planet}/${sign}`);
          if (/[\u2014\u2013]/.test(out.body)) fail(`em/en dash in rendered output ${planet}/${sign}/${house}`);
          if (weirdRe && weirdRe.test(out.body)) fail(`banned non-everyday word in rendered output ${planet}/${sign}/${house}`);
        } catch (e) {
          if (e instanceof RoleViolationError) fail(`${planet}/${sign}/${house}: ${e.message}`);
          else fail(`${planet}/${sign}/${house}: unexpected ${e.message}`);
        }
      }
    }
  }
}

// angles: ascendant + midheaven x 12 signs x both voices
let angleCount = 0;
for (const angle of ["ascendant", "midheaven", "descendant", "imum-coeli"]) {
  for (const sign of signs) {
    for (const voice of ["you", "Sofia"]) {
      try {
        const out = renderNatalAngle({ angle, sign, voice }, { allowUnreviewed: true });
        angleCount++;
        const low = out.body.toLowerCase();
        for (const b of BANNED) if (low.includes(b)) fail(`banned phrase in ${angle}/${sign}: ${out.body}`);
        if (/[\u2014\u2013]/.test(out.body)) fail(`em/en dash in angle output ${angle}/${sign}`);
        if (weirdRe && weirdRe.test(out.body)) fail(`banned word in angle output ${angle}/${sign}`);
        if (out.body.split(/[.!?]\s/).length < 3) fail(`angle too thin ${angle}/${sign}`);
      } catch (e) { fail(`${angle}/${sign}: ${e.message}`); }
    }
  }
}
console.log(`Rendered ${angleCount} angle paragraphs.`);

// aspects: every planet pair x 5 aspects x both voices (base render; pair hooks optional)
let aspectCount = 0;
for (let i = 0; i < planets.length; i++) {
  for (let j = i + 1; j < planets.length; j++) {
    for (const aspect of ["conjunction", "square", "trine", "sextile", "opposition"]) {
      for (const voice of ["you", "Sofia"]) {
        try {
          const out = renderNatalAspect({ planetA: planets[i], planetB: planets[j], aspect, voice }, { allowUnreviewed: true });
          aspectCount++;
          if (/[\u2014\u2013]/.test(out.body)) fail(`dash in aspect ${planets[i]}-${aspect}-${planets[j]}`);
          if (/\{\{/.test(out.body)) fail(`unresolved slot in aspect ${planets[i]}-${aspect}-${planets[j]}`);
        } catch (e) {
          const sourceGapKey = `${planets[i]}|${aspect}|${planets[j]}`;
          if (e instanceof SourceGapError && expectedNatalAspectSourceGaps.has(sourceGapKey)) {
            aspectCount++;
            continue;
          }
          fail(`aspect ${planets[i]}-${aspect}-${planets[j]}: ${e.message}`);
        }
      }
    }
  }
}
console.log(`Rendered ${aspectCount} aspect paragraphs.`);

// modifiers smoke test
const withMods = renderNatalPlacement(
  { planet: "mars", sign: "aries", house: 6, voice: "you", dignity: "domicile", isRetrograde: true,
    sect: { hasReliableSect: true, isDayChart: false, effect: "quicker recovery and blunter honesty" } },
  { allowUnreviewed: true }
);
if (!withMods.body.includes("home sign")) fail("dignity modifier missing");
if (!withMods.body.includes("retrograde in the birth chart")) fail("retrograde modifier missing");
if (!withMods.body.includes("night chart")) fail("sect modifier missing");

console.log(`Rendered ${rendered} fallback paragraphs across ${planets.length} planets x ${signs.length} signs x voices x houses.`);

// Empty-house V14 source coverage. Exhaustive key mapping, resolver precedence,
// dual-voice parity, governance, and rendered output checks live in
// scripts/test-empty-house-refinement.mjs. The former M1-M5 composition check
// deliberately does not apply to the owner-approved exact-copy corpus.
{
  const expectedTiers = new Map([
    ["base", 12],
    ["sign", 144],
    ["rising-ruler", 132],
    ["ruler-house", 121],
    ["ruler-planet", 132]
  ]);
  const emptyHouseRows = (rowsFile.hookRows ?? []).filter((row) =>
    row.contentKey.startsWith(V14_EMPTY_HOUSE_PREFIX)
  );
  const tierCounts = new Map();
  const keys = new Set();
  for (const row of emptyHouseRows) {
    const tier = row.contentKey.split("/")[2];
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
    if (keys.has(row.contentKey)) fail(`${row.contentKey}: duplicate V14 empty-house key`);
    keys.add(row.contentKey);
    if (row.review_status !== "approved") fail(`${row.contentKey}: V14 row is not approved`);
    if (!row.body_you || !row.body_they) fail(`${row.contentKey}: V14 row needs both voice variants`);
  }
  for (const [tier, expected] of expectedTiers) {
    const actual = tierCounts.get(tier) ?? 0;
    if (actual !== expected) fail(`V14 empty-house ${tier}: expected ${expected} rows, got ${actual}`);
  }
  for (const tier of tierCounts.keys()) {
    if (!expectedTiers.has(tier)) fail(`V14 empty-house: unexpected tier ${tier}`);
  }
  if (emptyHouseRows.length !== 541) fail(`V14 empty-house: expected 541 served rows, got ${emptyHouseRows.length}`);
  console.log(`Verified ${emptyHouseRows.length} V14 empty-house source rows; exhaustive rendering is covered by test-empty-house-refinement.mjs.`);
}


{
  let pf = 0;
  for (let h = 1; h <= 12; h++) for (const voice of ["you", "Sofia"]) {
    const r = renderProfectionYear({ house: h, voice }, { allowUnreviewed: true });
    if (voice !== "you" && /\b(you|your|yourself)\b/i.test(r.body)) fail(`profection ${h}: second-person leak`);
    if (/\{\{/.test(r.body)) fail(`profection ${h}: slot leak`);
    pf++;
  }
  console.log(`Rendered ${pf} profection-year lines.`);
}


{
  const SIGNS12 = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  let li = 0;
  for (const sign of SIGNS12) for (let house = 1; house <= 12; house++) for (const voice of ["you", "Sofia"]) {
    try {
      const r = renderNatalPlacement({ planet: "lilith", sign, house, voice }, { allowUnreviewed: true });
      if (/\{\{|[\u2014\u2013]/.test(r.body)) fail(`lilith natal ${sign}/${house}/${voice}: bad output`);
      if (voice !== "you" && /\b(you|your|yourself)\b/i.test(r.body)) fail(`lilith natal ${sign}/${house}: second-person leak`);
      li++;
    } catch (e) { fail(`lilith natal ${sign}/${house}/${voice}: ${e.message}`); }
  }
  console.log(`Rendered ${li} Lilith natal placements.`);
}


// substitution-bug regression: broken object-case pronouns that only appear when text was
// mechanically swapped instead of authored ("theirself", "pays they back", "around they decide")
for (const r of rowsFile.hookRows ?? []) {
  for (const field of ["body_you", "body_they"]) {
    const t = r[field] ?? "";
    if (/\btheirself\b|\btheirselves\b|\b(?:pays|around|helping|between) they\b(?! (?:are|were|may|might|will|would|can|could|have|had|both|each))/.test(t))
      fail(`${r.contentKey}: broken pronoun swap in ${field} (${t.slice(0, 80)})`);
  }
}


for (const r of rowsFile.hookRows ?? []) {
  if (!/^fallback-hook\/(placement-sentence|placement-house-sentence|planet-intro|planet-best|angle-|aspect-|natal-core|node-|dignity-|house-meaning|house-cusp|empty-house)/.test(r.contentKey)) continue;
  if (r.contentKey.startsWith("fallback-hook/aspect-pattern-activation/")) continue; // activation copy is time-bound by design (describes a live transit)
  if (r.contentKey.startsWith(V14_EMPTY_HOUSE_PREFIX)) continue; // owner-approved V14 copy is governed by its dedicated deterministic gate
  for (const field of ["body_you", "body_they"]) {
    const t = r[field] ?? "";
    if (/\b(this month|this week|tonight|right now|currently)\b/i.test(t))
      fail(`${r.contentKey}: time-bound phrase in permanent natal copy (${field})`);
  }
}

console.log(failures === 0 ? "PASS: all role-safety, grammar, and render checks passed." : `${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
