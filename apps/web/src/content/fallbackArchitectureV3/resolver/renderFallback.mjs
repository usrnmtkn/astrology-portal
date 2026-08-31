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

export function vocabularyBodyForVoice(row, voice) {
  const body = voice === "you"
    ? (row?.body_you ?? row?.body)
    : (row?.body_they ?? row?.body);

  if (typeof body !== "string" || !body.trim()) return null;
  return body;
}

function getVocab(key, voice = "you", { allowUnreviewed = false } = {}) {
  const row = [...(vocab.get(key) ?? [])]
    .reverse()
    .find((candidate) => allowUnreviewed || READER_ELIGIBLE_STATUS.has(candidate.review_status));
  if (!row) return null;
  if (row.content_role === "fallback_source") {
    throw new RoleViolationError(`Row ${key} is fallback_source and can never fill a reader slot.`);
  }
  if (!allowUnreviewed && !READER_ELIGIBLE_STATUS.has(row.review_status)) return null;
  const body = vocabularyBodyForVoice(row, voice);
  if (body == null) return null;
  checkFrame(row, body);
  return body;
}

function checkFrame(row, b = row.body) {
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

function withoutLegacyHouseBridge(body, house, voice) {
  const houseLabel = ordinal(house);
  const legacyPrefix = voice === "you"
    ? `It's in your ${houseLabel} house, meaning`
    : `It's in their ${houseLabel} house, meaning`;
  if (!body.startsWith(legacyPrefix)) return body.trim();
  const paragraphBreak = body.indexOf("\n\n");
  return paragraphBreak >= 0 ? body.slice(paragraphBreak + 2).trim() : "";
}

const hooks = new Map((rowsFile.hookRows ?? []).map((r) => [r.contentKey, r]));

function getHook(key, voice, { allowUnreviewed = false } = {}) {
  const row = hooks.get(key);
  if (!row) return null;
  if (row.content_role !== "fallback_hook") throw new RoleViolationError(`Row ${key} is not a fallback_hook.`);
  if (!allowUnreviewed && !READER_ELIGIBLE_STATUS.has(row.review_status)) return null;
  return (voice === "you" ? row.body_you : row.body_they) ?? null;
}

function getReaderLivedRow(key, voice, { allowUnreviewed = false } = {}) {
  const row = hooks.get(key);
  if (!row) return null;
  if (!["fallback_hook", "full_copy"].includes(row.content_role)) {
    throw new RoleViolationError(`Row ${key} is not a reader-eligible exact-copy role.`);
  }
  if (!allowUnreviewed && !READER_ELIGIBLE_STATUS.has(row.review_status)) return null;
  if (row.reader_only !== true || row.render_policy !== "reader-only-exact-lived-v1") {
    throw new RoleViolationError(`Row ${key} is not a reader-only exact lived row.`);
  }
  if (voice === "you") {
    return typeof row.body === "string" && row.body.trim() ? row : null;
  }
  if (
    typeof row.body_they !== "string"
    || !row.body_they.trim()
    || (!allowUnreviewed && !READER_ELIGIBLE_STATUS.has(row.body_they_review_status))
    || row.body_they_approval?.approvalLevel !== "exact_owner_approved"
  ) {
    return null;
  }
  return { ...row, body: row.body_they };
}

function getVocabList(prefix, voice = "you", opts = {}) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const v = getVocab(`${prefix}/${i}`, voice, opts);
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
  const voice = facts.voice === "you" ? "you" : "they";
  const exactCompleteLived = house
    ? getReaderLivedRow(`fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}`, voice, { allowUnreviewed })
    : null;
  if (exactCompleteLived) {
    const body = exactCompleteLived.body ?? "";
    return {
      headline: `${title(planet)} in ${title(sign)} in the ${ordinal(house)} house`,
      parts: [body],
      partKeys: [exactCompleteLived.contentKey],
      body,
      templateKey: exactCompleteLived.contentKey,
      provenanceTier: "exact-owner-approved",
    };
  }
  // Resolution order for each part is narrowest first:
  //   1. the placement-specific authored lived row (names the planet)
  //   2. the composed template (names the planet through its slots)
  //   3. the generic sign/house lived row (does NOT name the planet)
  //   4. SOURCE_GAP
  // The generic row is a floor, not a preference. Keeping it on the same `??`
  // chain as the placement-specific row let it outrank the template, so 187 of
  // the 360 natal sections rendered sign- or house-only copy that never named
  // the planet, and the dignity/retrograde modifiers were silently dropped with
  // it. It is now consulted only when the template cannot render.
  const exactHouseLived = house
    ? getReaderLivedRow(`fallback-hook/natal-you-placement-house-final/${planet}/${house}`, voice, { allowUnreviewed })
      ?? getReaderLivedRow(`fallback-hook/placement-house-lived/${planet}/${house}`, voice, { allowUnreviewed })
    : null;
  const genericHouseLived = house
    ? getReaderLivedRow(`fallback-hook/house-lived/${house}`, voice, { allowUnreviewed })
    : null;
  const exactSignLived = getReaderLivedRow(`fallback-hook/natal-you-placement-sign-final/${planet}/${sign}`, voice, { allowUnreviewed })
    ?? getReaderLivedRow(`fallback-hook/placement-sign-lived/${planet}/${sign}`, voice, { allowUnreviewed });
  const genericSignLived = getReaderLivedRow(`fallback-hook/sign-lived/${sign}`, voice, { allowUnreviewed });

  const needsArticle = planet === "sun" || planet === "moon" || planet.endsWith("-node");
  const possessive = facts.voice === "you" ? "Your" : `${facts.voice}'s`;
  const ctx = {
    possessive,
    planetTitle: title(planet),
    planetRef: needsArticle ? `the ${title(planet)}` : title(planet),
    planetRefCap: needsArticle ? `The ${title(planet)}` : title(planet),
    signTitle: title(sign),
    planetTopic: getVocab(`fallback-vocab/planet-topic/${planet}`, voice, { allowUnreviewed }),
    planetExcess: getVocab(`fallback-vocab/planet-excess/${planet}`, voice, { allowUnreviewed }),
    planetProductive: getVocab(`fallback-vocab/planet-productive/${planet}`, voice, { allowUnreviewed }),
    planetCore: getVocab(`fallback-vocab/planet-core/${planet}`, voice, { allowUnreviewed }),
    signStyle: getVocab(`fallback-vocab/sign-style/${sign}`, voice, { allowUnreviewed }),
    signNeed: getVocab(`fallback-vocab/sign-need/${sign}`, voice, { allowUnreviewed }),
    planetVerb: getVocab(`fallback-vocab/planet-verb/${planet}`, voice, { allowUnreviewed }),
    signAdverb: getVocab(`fallback-vocab/sign-adverb/${sign}`, voice, { allowUnreviewed }),
    planetIntro: getReaderLivedRow(`fallback-hook/planet-lived/${planet}`, voice, { allowUnreviewed })?.body
      ?? getHook(`fallback-hook/planet-intro/${planet}`, voice, { allowUnreviewed }),
    planetBest: getHook(`fallback-hook/planet-best/${planet}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed }),
    placementSentences: getHook(`fallback-hook/placement-sentence/${planet}/${sign}`, voice, { allowUnreviewed }),
    placementGerundText: getVocabList(`fallback-vocab/placement-gerund/${planet}/${sign}`, voice, { allowUnreviewed }).join(", or ") || null,
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
  const partKeys = [];

  const isNode = planet === "north-node" || planet === "south-node";
  if (isNode) {
    const j = getHook(`fallback-hook/node-journey/${planet}`, facts.voice === "you" ? "you" : "they", { allowUnreviewed });
    const oppSign = OPPOSITE_SIGN[sign];
    const oppDir = getVocab(`fallback-vocab/node-direction/${oppSign}`, voice, { allowUnreviewed });
    ctx.nodeJourney = j ? j.replace(/\{\{oppositeSignTitle\}\}/g, title(oppSign)).replace(/\{\{oppositeDirection\}\}/g, oppDir ?? "") : null;
  }
  const signTemplate = findTemplate(`fallback-template/natal.planet-in-sign/${planet}`, { allowUnreviewed })
    ?? getTemplate(isNode ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
  if (exactSignLived) {
    parts.push(exactSignLived.body);
    partKeys.push(exactSignLived.contentKey);
  } else {
    try {
      parts.push(renderTemplate(signTemplate, { ...ctx, modifierSentences: house ? [] : mods }, gapLabel, voice));
      partKeys.push(signTemplate.contentKey);
    } catch (err) {
      if (!(err instanceof SourceGapError) || !genericSignLived) throw err;
      parts.push(genericSignLived.body);
      partKeys.push(genericSignLived.contentKey);
    }
  }

  let headlineTemplate = signTemplate;
  if (house) {
    const houseMeaning = getHook(`fallback-hook/house-meaning/${house}`, voice, { allowUnreviewed });
    if (houseMeaning == null) {
      throw new SourceGapError(`SOURCE_GAP: missing contextual house bridge for ${gapLabel}`);
    }
    const renderedHouseMeaning = mustache(houseMeaning, ctx);
    if (exactHouseLived) {
      const exactBody = withoutLegacyHouseBridge(exactHouseLived.body, house, voice);
      parts.push([renderedHouseMeaning, exactBody].filter(Boolean).join("\n\n"));
      partKeys.push(exactHouseLived.contentKey);
    } else {
      const houseTemplate = getTemplate("fallback-template/natal.house-context");
      const houseCtx = {
        ...ctx,
        houseOrdinal: ordinal(house),
        houseMeaning: renderedHouseMeaning,
        placementHouseSentences: getHook(`fallback-hook/placement-house-sentence/${planet}/${house}`, voice, { allowUnreviewed }),
        modifierSentences: mods,
      };
      try {
        parts.push(renderTemplate(houseTemplate, houseCtx, gapLabel, voice));
        partKeys.push(houseTemplate.contentKey);
      } catch (err) {
        if (!(err instanceof SourceGapError) || !genericHouseLived) throw err;
        parts.push(genericHouseLived.body);
        partKeys.push(genericHouseLived.contentKey);
      }
      headlineTemplate = houseTemplate;
      ctx.houseOrdinal = houseCtx.houseOrdinal;
    }
  }

  return {
    headline: exactHouseLived
      ? `${title(planet)} in the ${ordinal(house)} house`
      : fixArticles(mustache(headlineTemplate.headline, ctx)),
    parts,
    partKeys,
    body: parts.join("\n\n"),
    templateKey: exactHouseLived?.contentKey ?? headlineTemplate.contentKey,
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
  return {
    headline: mustache(template.headline, ctx),
    parts: [body],
    body,
    templateKey: template.contentKey,
  };
}

const ASPECT_GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };

export function renderNatalAspect(facts, opts = {}) {
  // facts: { planetA, planetB, aspect: conjunction|square|trine|sextile|opposition|quincunx, voice }
  const { planetA, planetB } = facts;
  const aspect = facts.aspect === "inconjunct" ? "quincunx" : facts.aspect;
  const allowUnreviewed = opts.allowUnreviewed ?? false;
  const voice = facts.voice === "you" ? "you" : "they";
  const exactLived =
    getReaderLivedRow(`fallback-hook/natal-aspect-lived/${planetA}/${aspect}/${planetB}`, voice, { allowUnreviewed })
    ?? getReaderLivedRow(`fallback-hook/natal-aspect-lived/${planetB}/${aspect}/${planetA}`, voice, { allowUnreviewed });
  if (exactLived) {
    const exactBody = mustache(exactLived.body, { Name: facts.voice });
    return {
      headline: `${title(planetA)} ${aspect} ${title(planetB)}`,
      parts: [exactBody],
      body: exactBody,
      astroHint: exactLived.astroHint,
      templateKey: exactLived.contentKey,
      provenanceTier: "exact-owner-approved",
    };
  }
  const group = ASPECT_GROUP[aspect];
  const pair = group
    ? getHook(`fallback-hook/aspect-pair/${planetA}/${planetB}/${group}`, voice, { allowUnreviewed })
      ?? getHook(`fallback-hook/aspect-pair/${planetB}/${planetA}/${group}`, voice, { allowUnreviewed })
    : null;
  if (!group) {
    throw new SourceGapError(`SOURCE_GAP: natal aspect ${planetA}-${aspect}-${planetB}`);
  }
  if (!pair) {
    throw new SourceGapError(`SOURCE_GAP: natal aspect pair ${planetA}-${aspect}-${planetB}`);
  }
  const ctx = {
    possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
    planetATitle: title(planetA),
    planetBTitle: title(planetB),
    aspectName: aspect,
    aspectAdj: getVocab(`fallback-vocab/aspect-adj/${aspect}`, voice, { allowUnreviewed }),
    planetACore: getVocab(`fallback-vocab/planet-core/${planetA}`, voice, { allowUnreviewed }),
    planetBCore: getVocab(`fallback-vocab/planet-core/${planetB}`, voice, { allowUnreviewed }),
    aspectTypeLine: getHook(`fallback-hook/aspect-type/${aspect}`, voice, { allowUnreviewed }),
    aspectMotion: getVocab(`fallback-vocab/aspect-motion/${aspect}`, voice, { allowUnreviewed }),
    possessiveLow: facts.voice === "you" ? "your" : `${facts.voice}'s`,
    pairSentences: pair,
  };
  const template = getTemplate("fallback-template/natal.aspect");
  const body = renderTemplate(template, ctx, `${planetA}-${aspect}-${planetB}`, voice);
  return {
    headline: mustache(template.headline, ctx),
    parts: [body],
    body,
    templateKey: template.contentKey,
    provenanceTier: "legacy-reviewed",
  };
}

/** Normalize app wording to the supported canonical aspect ids ("conjunct" -> "conjunction", etc).
 *  Inconjunct normalizes to the engine's canonical quincunx id. */
export function normalizeAspect(input) {
  const k = input.trim().toLowerCase();
  const map = {
    conjunction: "conjunction", conjunct: "conjunction", conj: "conjunction",
    square: "square", sq: "square",
    trine: "trine",
    sextile: "sextile", sext: "sextile",
    opposition: "opposition", opposite: "opposition", opposed: "opposition", oppose: "opposition",
    quincunx: "quincunx", inconjunct: "quincunx",
    semisextile: "semisextile", "semi-sextile": "semisextile", "semi sextile": "semisextile",
    nonagen: "semisextile",
  };
  return map[k] ?? null;
}

// ---- Empty-house pages (natal): sign-on-cusp -> ruler -> ruler placement -> activation
// close, all dual-voice by construction (voice param; never pronoun substitution). Replaces
// the legacy app helper that produced "quietly draining they" / "how they thinks". ----
const SIGN_RULER = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter" };
const EMPTY_HOUSE_V14_MODERN_RULER = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "pluto", sagittarius: "jupiter", capricorn: "saturn", aquarius: "uranus", pisces: "neptune" };
const EMPTY_HOUSE_RULERS = { modern: EMPTY_HOUSE_V14_MODERN_RULER, traditional: SIGN_RULER };

// ---- Aspect patterns (T-square, Grand Cross, Grand Trine, Kite, Yod, Mystic Rectangle):
// natal pattern card + activation card. Replaces the astro-knowledge copy entries; the
// detection engine stays in the app, the words come from here. ----
const PATTERN_NAMES = { t_square: "T-Square", grand_square: "Grand Cross", grand_trine: "Grand Trine", kite: "Kite", yod: "Yod", mystic_rectangle: "Mystic Rectangle" };
export function renderAspectPattern({ type, apexTitle, mode, element, activation = false, voice = "you" }) {
  const vocabularyVoice = voice === "you" ? "you" : "they";
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
      ? getVocab(`fallback-vocab/pattern-mode/${mode}`, vocabularyVoice)
      : element
        ? getVocab(`fallback-vocab/pattern-element/${element}`, vocabularyVoice)
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
  // V14 dual-system contract. Phase 1 launches with modern; traditional
  // house-1 rows remain SOURCE_GAP until their owner-authored layer lands.
  // facts: { house, sign, rulerHouse, primaryRuler?, rulerSystem?, voice }.
  const { house, sign, rulerHouse, voice = "you" } = facts;
  const v = voice === "you" ? "you" : "they";
  const rulerSystem = facts.rulerSystem ?? "modern";
  const rulerMap = EMPTY_HOUSE_RULERS[rulerSystem];
  if (!rulerMap) throw new RoleViolationError(`Unknown empty-house ruler system: ${rulerSystem}.`);
  const ruler = rulerMap[sign];
  if (!Number.isInteger(house) || house < 1 || house > 12 || !ruler || !Number.isInteger(rulerHouse) || rulerHouse < 1 || rulerHouse > 12 || rulerHouse === house) {
    throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} (${v})`);
  }
  if (facts.primaryRuler && facts.primaryRuler !== ruler) {
    throw new RoleViolationError(`Empty-house V14 ${rulerSystem} system requires ruler ${ruler} for ${sign}; received ${facts.primaryRuler}.`);
  }

  const baseKey = `fallback-hook/empty-house/base/${house}`;
  const signKey = `fallback-hook/empty-house/sign/${house}/${sign}`;
  const specificRulerKey = house === 1
    ? `fallback-hook/empty-house/rising-ruler/${sign}/${ruler}/${rulerHouse}`
    : `fallback-hook/empty-house/ruler-planet/${house}/${ruler}/${rulerHouse}`;
  const genericRulerKey = `fallback-hook/empty-house/ruler-house/${house}/${rulerHouse}`;
  const note = getHook(baseKey, v, opts);
  const signBody = getHook(signKey, v, opts);
  const specificRulerBody = getHook(specificRulerKey, v, opts);
  const rulerKey = specificRulerBody ? specificRulerKey : genericRulerKey;
  const rulerBody = specificRulerBody ?? (house === 1 ? null : getHook(genericRulerKey, v, opts));

  if (!note || !signBody || !rulerBody) {
    throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign}/${ruler}-in-${rulerHouse} (${v})`);
  }

  const bridgeTemplateKey = house === 1
    ? "fallback-hook/empty-house/bridge-template/house-1"
    : "fallback-hook/empty-house/bridge-template/standard";
  const topicMKey = `fallback-vocab/empty-house-ruler-jurisdiction/${rulerHouse}`;
  const topicNKey = `fallback-vocab/empty-house-bridge-topic-short/${house}`;
  const bridgeTemplate = opts.includeEmptyHouseBridge ? findTemplate(bridgeTemplateKey, opts) : null;
  const topicM = bridgeTemplate ? getVocab(topicMKey, v, opts) : null;
  const topicN = house === 1 ? null : (bridgeTemplate ? getVocab(topicNKey, v, opts) : null);
  const planet = ruler === "sun" || ruler === "moon" ? `the ${title(ruler)}` : title(ruler);
  const bridge = bridgeTemplate && topicM && (house === 1 || topicN)
    ? renderTemplate(bridgeTemplate, {
      houseN: ordinal(house),
      sign: title(sign),
      planet,
      houseM: ordinal(rulerHouse),
      topicN,
      topicM,
    }, `empty house bridge ${house}/${sign}/${ruler}-in-${rulerHouse}`, v)
    : null;
  const parts = [signBody, ...(bridge ? [bridge] : []), rulerBody];
  const bridgeSourceKeys = bridge
    ? [bridgeTemplateKey, ...(house === 1 ? [] : [topicNKey]), topicMKey]
    : [];
  return {
    headline: `${ordinal(house)} House`,
    note,
    body: parts.join("\n\n"),
    parts,
    templateKey: "fallback-template/natal.empty-house-v14",
    sourceKeys: [baseKey, signKey, ...bridgeSourceKeys, rulerKey],
  };
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
