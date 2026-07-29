// Verifies the v3 fallback architecture package.
// 1. Role safety: fallback_source rows never render; templates/vocab are labeled.
// 2. Grammar frames: every vocabulary row conforms to its declared frame.
// 3. Render dry-run: planet-in-sign and planet-in-sign-in-house produce complete
//    paragraphs for every planet x sign (x sample houses), both voices.
// 4. Banned-phrase and meta-copy checks on all rendered output.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { renderNatalPlacement, renderNatalAngle, renderNatalAspect, renderNatalEmptyHouse, renderProfectionYear, RoleViolationError } from "../resolver/renderFallback.mjs";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const rowsFile = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/fallback-source-rows-v3.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(here, "../contracts/CONTENT-ROLE-CONTRACT.json"), "utf8"));

const BANNED = [
  "this part of them", "this part of you", "how this part becomes active", "becomes active",
  "is not generic", "working through", "the point is", "describes how", "this placement describes",
  "carries that story further", "becomes concrete through", "this is where", "builds identity",
  "qualities in the chart", "in the chart.", "part of daily life",
];

const WEIRD = contract.styleRules?.bannedWords ?? [];
const weirdRe = WEIRD.length ? new RegExp(`\\b(${WEIRD.join("|")})\\b`, "i") : null;
let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL:", msg); };

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
  if (r.content_role !== "fallback_hook") fail(`${r.contentKey}: hook row missing fallback_hook role`);
  // fog-note rows are reader-only by design (appended solely on the you-voice authored path)
  const READER_ONLY = ["fallback-hook/fog-note/"];
  if (!READER_ONLY.some((p) => r.contentKey.startsWith(p)) && (!r.body_you || !r.body_they)) fail(`${r.contentKey}: hook rows need both voice variants`);
  const SINGLE_VOICE = ["fallback-hook/synastry-", "fallback-hook/element-pattern/", "fallback-hook/compat-domain/", "fallback-hook/transit-aspect-type/", "fallback-hook/planet-grates/", "fallback-hook/transit-retro", "fallback-hook/sky-", "fallback-hook/circle-", "fallback-hook/moon-", "fallback-hook/season-marker/", "fallback-hook/bond-effect-", "fallback-hook/lunation-", "fallback-hook/daily-"];
  if (!SINGLE_VOICE.some((p) => r.contentKey.startsWith(p)) && /\b(you|your|yourself)\b/i.test(r.body_they)) fail(`${r.contentKey}: second-person leak in body_they`); // synastry hooks are single-voice: always addressed to the reader
  if (/[\u2014\u2013]/.test(r.body_you + r.body_they)) fail(`${r.contentKey}: em/en dash in hook`);
  if (weirdRe && weirdRe.test(r.body_you + " " + r.body_they)) fail(`${r.contentKey}: banned word in hook`);
}
for (const r of rowsFile.fallbackSourceRows) {
  if (r.content_role !== "fallback_source") fail(`${r.contentKey}: source row missing fallback_source role`);
}
{
  const templatesFile = JSON.parse(fs.readFileSync(path.join(here, "../templates/fallback-templates-v3.json"), "utf8"));
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
        } catch (e) { fail(`aspect ${planets[i]}-${aspect}-${planets[j]}: ${e.message}`); }
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

// Empty-house pages: 12 houses x 12 cusp signs x both voices; grammar + slot checks
{
  const SIGNS12 = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  let eh = 0;
  for (let house = 1; house <= 12; house++) for (const sign of SIGNS12) for (const voice of ["you", "Sofia"]) {
    try {
      const r = renderNatalEmptyHouse({ house, sign, rulerSign: "capricorn", rulerHouse: ((house + 3) % 12) + 1, voice }, { allowUnreviewed: true });
      const all = r.note + " " + r.body;
      if (/\{\{|[\u2014\u2013]/.test(all)) fail(`empty-house ${house}/${sign}/${voice}: bad output`);
      if (voice !== "you" && /\b(you|your|yourself)\b/i.test(r.body)) fail(`empty-house ${house}/${sign}: second-person leak in friend voice`);
      if (/ (they|them) (is|was)\b| draining they\b|they thinks\b/.test(all)) fail(`empty-house ${house}/${sign}/${voice}: pronoun-substitution grammar`);
      if (r.parts.length < 4) fail(`empty-house ${house}/${sign}/${voice}: too thin`);
      eh++;
    } catch (e) { fail(`empty-house ${house}/${sign}/${voice}: ${e.message}`); }
  }
  console.log(`Rendered ${eh} empty-house pages.`);
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
  for (const field of ["body_you", "body_they"]) {
    const t = r[field] ?? "";
    if (/\b(this month|this week|tonight|right now|currently)\b/i.test(t))
      fail(`${r.contentKey}: time-bound phrase in permanent natal copy (${field})`);
  }
}

console.log(failures === 0 ? "PASS: all role-safety, grammar, and render checks passed." : `${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
