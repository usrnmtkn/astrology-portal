// TLDR Astro fallback resolver — reference implementation (v3)
// Renders a per-surface fallback template from role-labeled rows.
// Enforces: role safety (fallback_source never renders), no unresolved slots,
// grammar-frame sanity, clean suppression of optional blocks.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const templates = JSON.parse(fs.readFileSync(path.join(here, "../templates/fallback-templates-v3.json"), "utf8"));
const rowsFile = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/fallback-source-rows-v3.json"), "utf8"));
const placementInterim = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/placement-interim-fixes-v1.json"), "utf8"));

templates.templates.push(...placementInterim.templates);
rowsFile.vocabularyRows.push(...placementInterim.vocabularyRows);
const READER_ELIGIBLE_STATUS = new Set(["approved_reuse", "approved", "reviewed"]);
const rowsByKey = (rows) => {
  const indexed = new Map();
  for (const row of rows) {
    const candidates = indexed.get(row.contentKey) ?? [];
    candidates.push(row);
    indexed.set(row.contentKey, candidates);
  }
  return indexed;
};
const vocab = rowsByKey(rowsFile.vocabularyRows);

export class SourceGapError extends Error {}
export class RoleViolationError extends Error {}

function getVocab(key, { allowUnreviewed = false } = {}) {
  const row = [...(vocab.get(key) ?? [])]
    .reverse()
    .find((candidate) => allowUnreviewed || READER_ELIGIBLE_STATUS.has(candidate.review_status));
  if (!row) return null;
  if (row.content_role === "fallback_source") {
    throw new RoleViolationError(`Row ${key} is fallback_source and can never fill a reader slot.`);
  }
  if (!allowUnreviewed && !READER_ELIGIBLE_STATUS.has(row.review_status)) return null;
  checkFrame(row);
  return row.body;
}

function checkFrame(row) {
  const b = row.body;
  if (/[.!?]$/.test(b) && row.grammar_frame !== "complete_sentence") {
    throw new RoleViolationError(`${row.contentKey}: trailing punctuation violates frame ${row.grammar_frame}`);
  }
  if (row.grammar_frame === "gerund_phrase" && !/^\w+ing\b/.test(b)) {
    throw new RoleViolationError(`${row.contentKey}: gerund_phrase must start with an -ing form`);
  }
  if (row.grammar_frame === "it_clause" && !/^(it|the pattern|the placement|the contact)\b/i.test(b)) {
    throw new RoleViolationError(`${row.contentKey}: it_clause must not have a person subject`);
  }
}

// minimal mustache subset: {{var}}, {{#key}}...{{/key}} (truthy or array w/ {{.}}),
// {{^key}}...{{/key}} inverted sections, no escaping needed for plain text
function mustache(body, ctx) {
  body = body.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const v = ctx[key];
    if (!v || (Array.isArray(v) && v.length === 0)) return "";
    if (Array.isArray(v)) return v.map((item) => inner.replace(/\{\{\.\}\}/g, item)).join("");
    return inner;
  });
  body = body.replace(/\{\{\^([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const v = ctx[key];
    return !v || (Array.isArray(v) && v.length === 0) ? inner : "";
  });
  body = body.replace(/\{\{([\w.]+)\}\}/g, (_, key) => (ctx[key] ?? `{{${key}}}`));
  body = body.replace(/\{(houseOrdinal|houseTopic)\}/g, (_, key) => (ctx[key] ?? `{${key}}`));
  return body;
}

const hooks = new Map((rowsFile.hookRows ?? []).map((r) => [r.contentKey, r]));

function getHook(key, voice, { allowUnreviewed = false } = {}) {
  const row = hooks.get(key);
  if (!row) return null;
  if (row.content_role !== "fallback_hook") throw new RoleViolationError(`Row ${key} is not a fallback_hook.`);
  if (!allowUnreviewed && !READER_ELIGIBLE_STATUS.has(row.review_status)) return null;
  return (voice === "you" ? row.body_you : row.body_they) ?? null;
}

function getVocabList(prefix, opts = {}) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const v = getVocab(`${prefix}/${i}`, opts);
    if (v == null) break;
    out.push(v);
  }
  return out;
}

function fixArticles(text) {
  // "a" -> "an" before vowel SOUNDS only: skip one/once (won-), uni/use/usu (yoo-), eu (yoo-)
  return text.replace(/\b(a|A) (?!(?:one|once|uni|use|usu|eu))([aeiouAEIOU])/g, (_, art, ch) => `${art === "A" ? "An" : "an"} ${ch}`);
}

const title = (s) => s.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
const OPPOSITE_SIGN = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
const ORD = { 1: "1st", 2: "2nd", 3: "3rd" };
const ordinal = (n) => ORD[n] ?? `${n}th`;

function renderTemplate(template, ctx, gapLabel, voice = "you") {
  for (const slot of template.requiredSlots) {
    if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: required slot '${slot}' has no eligible row for ${gapLabel}`);
  }
  const raw = voice === "you" ? (template.body_you ?? template.body) : (template.body_they ?? template.body);
  const body = fixArticles(mustache(raw, ctx)).replace(/\s{2,}/g, " ").trim();
  if (/\{\{|\}\}/.test(body)) throw new RoleViolationError(`Unresolved slots in rendered output: ${body}`);
  return body;
}

const findTemplate = (key, { allowUnreviewed = false } = {}) => {
  const t = templates.templates.find((x) => x.contentKey === key);
  if (!t) return null;
  if (t.content_role !== "template") throw new RoleViolationError(`${key} is not a template row`);
  if (t.review_status && !allowUnreviewed && !READER_ELIGIBLE_STATUS.has(t.review_status)) return null;
  return t;
};
const getTemplate = (key, opts = {}) => {
  const template = findTemplate(key, opts);
  if (!template) throw new SourceGapError(`SOURCE_GAP: missing template ${key}`);
  return template;
};

export function renderNatalPlacement(facts, opts = {}) {
  // facts: { planet, sign, house?, voice: "you" | name, dignity?, isRetrograde?, sect? }
  // Returns a TWO-PART result: parts[0] = planet-in-sign paragraph,
  // parts[1] (when house is known) = house-context paragraph.
  const { planet, sign, house } = facts;
  const allowUnreviewed = opts.allowUnreviewed ?? false;

  const needsArticle = planet === "sun" || planet === "moon" || planet.endsWith("-node");
  const possessive = facts.voice === "you" ? "Your" : `${facts.voice}'s`;
  const ctx = {
    possessive,
    planetTitle: title(planet),
    planetRef: needsArticle ? `the ${title(planet)}` : title(planet),
    planetRefCap: needsArticle ? `The ${title(planet)}` : title(planet),
    signTitle: title(sign),
    planetTopic: getVocab(`fallback-vocab/planet-topic/${planet}`, { allowUnreviewed }),
    planetExcess: getVocab(`fallback-vocab/planet-excess/${planet}`, { allowUnreviewed }),
    planetProductive: getVocab(`fallback-vocab/planet-productive/${planet}`, { allowUnreviewed }),
    planetCore: getVocab(`fallback-vocab/planet-core/${planet}`, { allowUnreviewed }),
    signStyle: getVocab(`fallback-vocab/sign-style/${sign}`, { allowUnreviewed }),
    signNeed: getVocab(`fallback-vocab/sign-need/${sign}`, { allowUnreviewed }),
    planetVerb: getVocab(`fallback-vocab/planet-verb/${planet}`, { allowUnreviewed }),
    signAdverb: getVocab(`fallback-vocab/sign-adverb/${sign}`, { allowUnreviewed }),
    planetIntro: getHook(`fallback-hook/planet-intro/${planet}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed }),
    planetBest: getHook(`fallback-hook/planet-best/${planet}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed }),
    placementSentences: getHook(`fallback-hook/placement-sentence/${planet}/${sign}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed }),
    placementGerundText: getVocabList(`fallback-vocab/placement-gerund/${planet}/${sign}`, { allowUnreviewed }).join(", or ") || null,
  };

  // modifiers (attach to the house paragraph when present, else the sign paragraph)
  const mods = [];
  const mod = (key, extra = {}) => {
    const t = templates.templates.find((x) => x.contentKey === key);
    if (!t) return;
    const body = facts.voice === "you" ? (t.body_you ?? t.body) : (t.body_they ?? t.body);
    mods.push(mustache(body, { ...ctx, ...extra }));
  };
  if (facts.dignity) {
    const specific = getHook(`fallback-hook/dignity-line/${facts.dignity}/${planet}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed });
    if (specific) mods.push(specific);
    else mod(`fallback-template/natal.modifier.dignity-${facts.dignity}`);
  }
  if (facts.isRetrograde) mod("fallback-template/natal.modifier.retrograde");
  if (facts.sect?.hasReliableSect && facts.sect.effect) {
    mod(`fallback-template/natal.modifier.sect-${facts.sect.isDayChart ? "day" : "night"}`, { sectEffect: facts.sect.effect });
  }

  const gapLabel = `${planet}/${sign}${house ? `/house-${house}` : ""}`;
  const parts = [];

  const isNode = planet === "north-node" || planet === "south-node";
  if (isNode) {
    const j = getHook(`fallback-hook/node-journey/${planet}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed });
    const oppSign = OPPOSITE_SIGN[sign];
    const oppDir = getVocab(`fallback-vocab/node-direction/${oppSign}`, { allowUnreviewed });
    ctx.nodeJourney = j ? j.replace(/\{\{oppositeSignTitle\}\}/g, title(oppSign)).replace(/\{\{oppositeDirection\}\}/g, oppDir ?? "") : null;
  }
  const signTemplate = findTemplate(`fallback-template/natal.planet-in-sign/${planet}`, { allowUnreviewed })
    ?? getTemplate(isNode ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
  const voice = facts.voice === "you" ? "you" : "they";
  parts.push(renderTemplate(signTemplate, { ...ctx, modifierSentences: house ? [] : mods }, gapLabel, voice));

  let headlineTemplate = signTemplate;
  if (house) {
    const houseTemplate = getTemplate("fallback-template/natal.house-context");
    const houseCtx = {
      ...ctx,
      houseOrdinal: ordinal(house),
      houseMeaning: getHook(`fallback-hook/house-meaning/${house}`, voice, { allowUnreviewed }),
      placementHouseSentences: getHook(`fallback-hook/placement-house-sentence/${planet}/${house}`, voice, { allowUnreviewed }),
      modifierSentences: mods,
    };
    parts.push(renderTemplate(houseTemplate, houseCtx, gapLabel, voice));
    headlineTemplate = houseTemplate;
    ctx.houseOrdinal = houseCtx.houseOrdinal;
  }

  return {
    headline: fixArticles(mustache(headlineTemplate.headline, ctx)),
    parts,
    body: parts.join("\n\n"),
    templateKey: headlineTemplate.contentKey,
  };
}

export function renderNatalAngle(facts, opts = {}) {
  // facts: { angle: "ascendant"|"midheaven"|"descendant"|"imum-coeli", sign, voice: "you" | name }
  const { angle, sign } = facts;
  const allowUnreviewed = opts.allowUnreviewed ?? false;
  const voice = facts.voice === "you" ? "you" : "they";
  const ANGLE_TITLE = { ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", "imum-coeli": "IC" };
  const ctx = {
    possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
    angleTitle: ANGLE_TITLE[angle] ?? title(angle),
    signTitle: title(sign),
    angleIntro: getHook(`fallback-hook/angle-intro/${angle}`, voice, { allowUnreviewed }),
    angleSignSentences: getHook(`fallback-hook/angle-sign/${angle}/${sign}`, voice, { allowUnreviewed }),
    modifierSentences: [],
  };
  const template = getTemplate("fallback-template/natal.angle-in-sign");
  const body = renderTemplate(template, ctx, `${angle}/${sign}`, voice);
  return { headline: mustache(template.headline, ctx), parts: [body], body, templateKey: template.contentKey };
}

const ASPECT_GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };

export function renderNatalAspect(facts, opts = {}) {
  // facts: { planetA, planetB, aspect: conjunction|square|trine|sextile|opposition, voice }
  const { planetA, planetB, aspect } = facts;
  const allowUnreviewed = opts.allowUnreviewed ?? false;
  const voice = facts.voice === "you" ? "you" : "they";
  const group = ASPECT_GROUP[aspect];
  const pair =
    getHook(`fallback-hook/aspect-pair/${planetA}/${planetB}/${group}`, voice, { allowUnreviewed }) ??
    getHook(`fallback-hook/aspect-pair/${planetB}/${planetA}/${group}`, voice, { allowUnreviewed });
  const ctx = {
    possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
    planetATitle: title(planetA),
    planetBTitle: title(planetB),
    aspectName: aspect,
    aspectAdj: getVocab(`fallback-vocab/aspect-adj/${aspect}`, { allowUnreviewed }),
    planetACore: getVocab(`fallback-vocab/planet-core/${planetA}`, { allowUnreviewed }),
    planetBCore: getVocab(`fallback-vocab/planet-core/${planetB}`, { allowUnreviewed }),
    aspectTypeLine: getHook(`fallback-hook/aspect-type/${aspect}`, voice, { allowUnreviewed }),
    aspectMotion: getVocab(`fallback-vocab/aspect-motion/${aspect}`, { allowUnreviewed }),
    possessiveLow: facts.voice === "you" ? "your" : `${facts.voice}'s`,
    pairSentences: pair,
  };
  const template = getTemplate("fallback-template/natal.aspect");
  const body = renderTemplate(template, ctx, `${planetA}-${aspect}-${planetB}`, voice);
  return { headline: mustache(template.headline, ctx), parts: [body], body, templateKey: template.contentKey };
}

/** Normalize app wording to the five canonical aspect ids ("conjunct" -> "conjunction", etc).
 *  Returns null for anything the package does not cover (minor aspects like quincunx),
 *  so callers can route those to SOURCE_GAP instead of rendering. */
export function normalizeAspect(input) {
  const k = input.trim().toLowerCase();
  const map = {
    conjunction: "conjunction", conjunct: "conjunction", conj: "conjunction",
    square: "square", sq: "square",
    trine: "trine",
    sextile: "sextile", sext: "sextile",
    opposition: "opposition", opposite: "opposition", opposed: "opposition", oppose: "opposition",
  };
  return map[k] ?? null;
}

// ---- Empty-house pages (natal): sign-on-cusp -> ruler -> ruler placement -> activation
// close, all dual-voice by construction (voice param; never pronoun substitution). Replaces
// the legacy app helper that produced "quietly draining they" / "how they thinks". ----
const SIGN_RULER = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter" };

// ---- Aspect patterns (T-square, Grand Cross, Grand Trine, Kite, Yod, Mystic Rectangle):
// natal pattern card + activation card. Replaces the astro-knowledge copy entries; the
// detection engine stays in the app, the words come from here. ----
const PATTERN_NAMES = { t_square: "T-Square", grand_square: "Grand Cross", grand_trine: "Grand Trine", kite: "Kite", yod: "Yod", mystic_rectangle: "Mystic Rectangle" };
export function renderAspectPattern({ type, apexTitle, mode, element, activation = false, voice = "you" }) {
  const pick = (key) => { const r = hooks.get(key); return r ? (voice === "you" ? r.body_you : r.body_they) : null; };
  const body = pick(`fallback-hook/aspect-pattern${activation ? "-activation" : ""}/${type}`);
  if (!body) throw new SourceGapError(`SOURCE_GAP: aspect pattern ${type}${activation ? " activation" : ""}`);
  const paras = [body];
  if (!activation && apexTitle) {
    const apex = pick(`fallback-hook/aspect-pattern-apex/${type}`);
    if (apex) paras.push(apex.replace(/\{\{apexTitle\}\}/g, apexTitle));
  }
  if (!activation) {
    const qual = mode
      ? getVocab(`fallback-vocab/pattern-mode/${mode}`, { allowUnreviewed })
      : element
        ? getVocab(`fallback-vocab/pattern-element/${element}`, { allowUnreviewed })
        : null;
    if (qual) paras.push(`It runs as ${qual}.`);
  }
  return { headline: PATTERN_NAMES[type] ?? type, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/natal.aspect-pattern" };
}

// ---- House glossary: one-sentence house definitions (replaces the legacy hardcoded
// glossary in App.tsx). Used for tooltips, chart legends, and house headers. ----
export function renderHouseGlossary({ house, voice = "you" }) {
  const r = hooks.get(`fallback-hook/house-glossary/${house}`);
  if (!r) throw new SourceGapError(`SOURCE_GAP: house glossary ${house}`);
  const body = voice === "you" ? r.body_you : r.body_they;
  return { headline: `${ordinal(house)} House`, body, parts: [body], templateKey: "fallback-template/natal.house-glossary", contentKey: r.contentKey };
}

export function renderNatalEmptyHouse(facts, opts = {}) {
  // facts: { house, sign, rulerSign, rulerHouse, ruler?, voice }. ruler defaults to the
  // traditional ruler (matches app behavior: Pisces -> Jupiter, Aquarius -> Saturn).
  const { house, sign, rulerSign, rulerHouse, voice = "you" } = facts;
  const v = voice === "you" ? "you" : "they";
  const ruler = facts.ruler ?? SIGN_RULER[sign];
  const houseTopic = getVocab(`fallback-vocab/house-topic/${house}`, opts);
  const rulerHouseTopic = rulerHouse ? getVocab(`fallback-vocab/house-topic/${rulerHouse}`, opts) : null;
  const cusp = getHook(`fallback-hook/house-cusp/${sign}`, v, opts);
  const rulerFrame = getHook("fallback-hook/empty-house-ruler", v, opts);
  const placementFrame = getHook("fallback-hook/empty-house-placement", v, opts);
  const closeFrame = getHook("fallback-hook/empty-house-close", v, opts);
  const note = getHook("fallback-hook/empty-house-explainer", v, opts);
  const rulerMode = getHook(`fallback-hook/planet-mode/${ruler}`, v, opts);
  const placementLine = rulerSign ? getHook(`fallback-hook/placement-sentence/${ruler}/${rulerSign}`, v, opts) : null;
  if (!houseTopic || !cusp || !rulerFrame || !closeFrame || !rulerMode) throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} (${v})`);
  const REF = { sun: "the Sun", moon: "the Moon" };
  const ctx = {
    houseOrdinal: ordinal(house), houseTopic, signTitle: title(sign),
    rulerRef: REF[ruler] ?? title(ruler), rulerMode, rulerTitle: title(ruler),
    rulerSignTitle: rulerSign ? title(rulerSign) : null,
    rulerHouseOrdinal: rulerHouse ? ordinal(rulerHouse) : null, rulerHouseTopic, placementLine,
  };
  const paras = [mustache(cusp, ctx), mustache(rulerFrame, ctx)];
  if (placementFrame && placementLine && rulerHouse && rulerHouseTopic) paras.push(mustache(placementFrame, ctx));
  paras.push(mustache(closeFrame, ctx));
  const cleaned = paras.map((p) => fixArticles(p).replace(/\s{2,}/g, " ").trim());
  for (const p of cleaned) if (/\{\{/.test(p)) throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} unresolved slot`);
  return { headline: `${ordinal(house)} House`, note, body: cleaned.join("\n\n"), parts: cleaned, templateKey: "fallback-template/natal.empty-house" };
}

// Profection-year line (annual profections): per-person section for Friends Circle
// profection stories and the You page. Dual-voice by construction.
export function renderProfectionYear(facts, opts = {}) {
  // facts: { house, sign?, voice }. sign = the sign on the profected house; when given, the
  // card names the year's ruler (time lord) so the reader knows whose transits run the year.
  const { house, sign, voice = "you" } = facts;
  const v = voice === "you" ? "you" : "they";
  const body = getHook(`fallback-hook/profection-year/${house}`, v, opts);
  if (!body) throw new SourceGapError(`SOURCE_GAP: profection year ${house} (${v})`);
  const note = getHook("fallback-hook/profection-explainer", v, opts);
  const parts = [body];
  if (sign) {
    const ruler = facts.ruler ?? SIGN_RULER[sign];
    const frame = getHook(`fallback-hook/profection-ruler/${ruler}`, v, opts)
        ?? getHook(ruler === "sun" || ruler === "moon" ? "fallback-hook/profection-ruler-luminary" : "fallback-hook/profection-ruler", v, opts);
    if (frame && ruler) {
      const REF = { sun: "the Sun", moon: "the Moon" };
      const p = mustache(frame, { signTitle: title(sign), houseOrdinal: ordinal(house), rulerRef: REF[ruler] ?? title(ruler) });
      if (!/\{\{/.test(p)) parts.push(p);
    }
  }
  return { headline: `${ordinal(house)} House Year`, note, body: parts.join("\n\n"), parts, templateKey: "fallback-template/natal.profection-year" };
}
