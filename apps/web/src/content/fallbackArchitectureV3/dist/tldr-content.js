// apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts
var SourceGapError = class extends Error {
};
var RoleViolationError = class extends Error {
};
function vocabularyBodyForVoice(row, voice) {
  const body = voice === "you" ? row?.body_you ?? row?.body : row?.body_they ?? row?.body;
  if (typeof body !== "string" || !body.trim()) return null;
  return body;
}
var READER_ELIGIBLE = /* @__PURE__ */ new Set(["approved_reuse", "approved", "reviewed"]);
var OPPOSITE_SIGN = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
var ASPECT_GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
var ANGLE_TITLE = { ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", "imum-coeli": "IC" };
var ORD = { 1: "1st", 2: "2nd", 3: "3rd" };
var title = (s) => s.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
var ordinal = (n) => ORD[n] ?? `${n}th`;
var fixArticles = (t) => t.replace(/\b(a|A) (?!(?:one|once|uni|use|usu|eu))([aeiouAEIOU])/g, (_, art, ch) => `${art === "A" ? "An" : "an"} ${ch}`);
function mustache(body, ctx) {
  body = body.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const v = ctx[key];
    if (!v || Array.isArray(v) && v.length === 0) return "";
    if (Array.isArray(v)) return v.map((item) => inner.replace(/\{\{\.\}\}/g, item)).join("");
    return inner;
  });
  body = body.replace(/\{\{\^([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const v = ctx[key];
    return !v || Array.isArray(v) && v.length === 0 ? inner : "";
  });
  body = body.replace(/\{\{([\w.]+)\}\}/g, (_, key) => ctx[key] ?? `{{${key}}}`);
  body = body.replace(/\{(houseOrdinal|houseTopic)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
  return body;
}
function withoutLegacyHouseBridge(body, house, voice) {
  const houseLabel = ordinal(house);
  const legacyPrefix = voice === "you" ? `It's in your ${houseLabel} house, meaning` : `It's in their ${houseLabel} house, meaning`;
  if (!body.startsWith(legacyPrefix)) return body.trim();
  const paragraphBreak = body.indexOf("\n\n");
  return paragraphBreak >= 0 ? body.slice(paragraphBreak + 2).trim() : "";
}
function natalPlacementMotionExactKey(facts) {
  if (!facts.house) return null;
  const directKey = `fallback-hook/natal-you-placement-complete-final/${facts.planet}/${facts.sign}/${facts.house}`;
  return facts.isRetrograde ? `${directKey}/retrograde` : directKey;
}
function createFallbackRenderer(templatesFile, rowsFile) {
  const vocab = /* @__PURE__ */ new Map();
  for (const row of rowsFile.vocabularyRows) {
    const candidates = vocab.get(row.contentKey) ?? [];
    candidates.push(row);
    vocab.set(row.contentKey, candidates);
  }
  const hooks = new Map((rowsFile.hookRows ?? []).map((r) => [r.contentKey, r]));
  const getVocab = (key, voice = "you", opts2 = {}) => {
    const row = [...vocab.get(key) ?? []].reverse().find((candidate) => opts2.allowUnreviewed || READER_ELIGIBLE.has(candidate.review_status));
    if (!row) return null;
    if (row.content_role === "fallback_source") throw new RoleViolationError(`Row ${key} is fallback_source and can never fill a reader slot.`);
    if (!opts2.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    return vocabularyBodyForVoice(row, voice);
  };
  const getVocabList = (prefix, voice = "you", opts2 = {}) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const v = getVocab(`${prefix}/${i}`, voice, opts2);
      if (v == null) break;
      out.push(v);
    }
    return out;
  };
  const getHook = (key, voice, opts2 = {}) => {
    const row = hooks.get(key);
    if (!row) return null;
    if (row.content_role !== "fallback_hook") throw new RoleViolationError(`Row ${key} is not a fallback_hook.`);
    if (!opts2.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    return (voice === "you" ? row.body_you : row.body_they) ?? null;
  };
  const getReaderLivedRow = (key, voice, opts2 = {}) => {
    const row = hooks.get(key);
    if (!row) return null;
    if (!["fallback_hook", "full_copy"].includes(row.content_role)) {
      throw new RoleViolationError(`Row ${key} is not a reader-eligible exact-copy role.`);
    }
    if (!opts2.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    if (row.reader_only !== true || row.render_policy !== "reader-only-exact-lived-v1") {
      throw new RoleViolationError(`Row ${key} is not a reader-only exact lived row.`);
    }
    if (voice === "you") {
      return typeof row.body === "string" && row.body.trim() ? row : null;
    }
    if (typeof row.body_they !== "string" || !row.body_they.trim() || !opts2.allowUnreviewed && !READER_ELIGIBLE.has(row.body_they_review_status ?? "") || row.body_they_approval?.approvalLevel !== "exact_owner_approved") {
      return null;
    }
    return { ...row, body: row.body_they };
  };
  const findTemplate = (key, opts2 = {}) => {
    const t = templatesFile.templates.find((x) => x.contentKey === key);
    if (!t) return null;
    if (t.content_role !== "template") throw new RoleViolationError(`${key} is not a template row`);
    if (t.review_status && !opts2.allowUnreviewed && !READER_ELIGIBLE.has(t.review_status)) return null;
    return t;
  };
  const getTemplate = (key, opts2 = {}) => {
    const template = findTemplate(key, opts2);
    if (!template) throw new SourceGapError(`SOURCE_GAP: missing template ${key}`);
    return template;
  };
  const renderTemplate = (template, ctx, gapLabel, voice) => {
    for (const slot of template.requiredSlots ?? []) {
      if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: required slot '${slot}' has no eligible row for ${gapLabel}`);
    }
    const raw = voice === "you" ? template.body_you ?? template.body : template.body_they ?? template.body;
    const body = fixArticles(mustache(raw, ctx)).replace(/\s{2,}/g, " ").trim();
    if (/\{\{|\}\}/.test(body)) throw new RoleViolationError(`Unresolved slots in rendered output: ${body}`);
    return body;
  };
  function renderNatalPlacement(facts, opts2 = {}) {
    const { planet, sign, house } = facts;
    const voice = facts.voice === "you" ? "you" : "they";
    const exactCompleteKey = natalPlacementMotionExactKey(facts);
    const exactCompleteLived = exactCompleteKey ? getReaderLivedRow(exactCompleteKey, voice, opts2) : null;
    if (exactCompleteLived) {
      const body = exactCompleteLived.body ?? "";
      return {
        headline: `${title(planet)} in ${title(sign)} in the ${ordinal(house)} house`,
        parts: [body],
        partKeys: [exactCompleteLived.contentKey],
        body,
        templateKey: exactCompleteLived.contentKey,
        provenanceTier: "exact-owner-approved"
      };
    }
    const exactHouseLived = house ? getReaderLivedRow(`fallback-hook/natal-you-placement-house-final/${planet}/${house}`, voice, opts2) ?? getReaderLivedRow(`fallback-hook/placement-house-lived/${planet}/${house}`, voice, opts2) : null;
    const genericHouseLived = house ? getReaderLivedRow(`fallback-hook/house-lived/${house}`, voice, opts2) : null;
    const exactSignLived = getReaderLivedRow(`fallback-hook/natal-you-placement-sign-final/${planet}/${sign}`, voice, opts2) ?? getReaderLivedRow(`fallback-hook/placement-sign-lived/${planet}/${sign}`, voice, opts2);
    const genericSignLived = getReaderLivedRow(`fallback-hook/sign-lived/${sign}`, voice, opts2);
    const needsArticle = planet === "sun" || planet === "moon" || planet.endsWith("-node");
    const possessive = facts.voice === "you" ? "Your" : `${facts.voice}'s`;
    const ctx = {
      possessive,
      planetTitle: title(planet),
      planetRef: needsArticle ? `the ${title(planet)}` : title(planet),
      planetRefCap: needsArticle ? `The ${title(planet)}` : title(planet),
      signTitle: title(sign),
      planetTopic: getVocab(`fallback-vocab/planet-topic/${planet}`, voice, opts2),
      planetExcess: getVocab(`fallback-vocab/planet-excess/${planet}`, voice, opts2),
      planetProductive: getVocab(`fallback-vocab/planet-productive/${planet}`, voice, opts2),
      planetCore: getVocab(`fallback-vocab/planet-core/${planet}`, voice, opts2),
      signStyle: getVocab(`fallback-vocab/sign-style/${sign}`, voice, opts2),
      signNeed: getVocab(`fallback-vocab/sign-need/${sign}`, voice, opts2),
      planetVerb: getVocab(`fallback-vocab/planet-verb/${planet}`, voice, opts2),
      signAdverb: getVocab(`fallback-vocab/sign-adverb/${sign}`, voice, opts2),
      planetIntro: getReaderLivedRow(`fallback-hook/planet-lived/${planet}`, voice, opts2)?.body ?? getHook(`fallback-hook/planet-intro/${planet}`, voice, opts2),
      planetBest: getHook(`fallback-hook/planet-best/${planet}`, voice, opts2),
      placementSentences: getHook(`fallback-hook/placement-sentence/${planet}/${sign}`, voice, opts2),
      placementGerundText: getVocabList(`fallback-vocab/placement-gerund/${planet}/${sign}`, voice, opts2).join(", or ") || null
    };
    const mods = [];
    const mod = (key, extra = {}) => {
      const t = templatesFile.templates.find((x) => x.contentKey === key);
      if (!t) return;
      const raw = voice === "you" ? t.body_you ?? t.body : t.body_they ?? t.body;
      mods.push(mustache(raw, { ...ctx, ...extra }));
    };
    if (facts.dignity) {
      const specific = getHook(`fallback-hook/dignity-line/${facts.dignity}/${planet}`, voice, opts2);
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
    const withModifiers = (body, include) => [body, ...include ? mods : []].filter(Boolean).join("\n\n");
    const isNode = planet === "north-node" || planet === "south-node";
    if (isNode) {
      const j = getHook(`fallback-hook/node-journey/${planet}`, voice, opts2);
      const oppSign = OPPOSITE_SIGN[sign];
      const oppDir = getVocab(`fallback-vocab/node-direction/${oppSign}`, voice, opts2);
      ctx.nodeJourney = j ? j.replace(/\{\{oppositeSignTitle\}\}/g, title(oppSign)).replace(/\{\{oppositeDirection\}\}/g, oppDir ?? "") : null;
    }
    const signTemplate = findTemplate(`fallback-template/natal.planet-in-sign/${planet}`, opts2) ?? getTemplate(isNode ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
    if (exactSignLived) {
      parts.push(withModifiers(exactSignLived.body ?? "", !house));
      partKeys.push(exactSignLived.contentKey);
    } else {
      try {
        parts.push(renderTemplate(signTemplate, { ...ctx, modifierSentences: house ? [] : mods }, gapLabel, voice));
        partKeys.push(signTemplate.contentKey);
      } catch (err) {
        if (!(err instanceof SourceGapError) || !genericSignLived) throw err;
        parts.push(withModifiers(genericSignLived.body ?? "", !house));
        partKeys.push(genericSignLived.contentKey);
      }
    }
    let headlineTemplate = signTemplate;
    if (house) {
      const houseMeaning = getHook(`fallback-hook/house-meaning/${house}`, voice, opts2);
      if (houseMeaning == null) {
        throw new SourceGapError(`SOURCE_GAP: missing contextual house bridge for ${gapLabel}`);
      }
      const renderedHouseMeaning = mustache(houseMeaning, ctx);
      if (exactHouseLived) {
        const exactBody = withoutLegacyHouseBridge(exactHouseLived.body ?? "", house, voice);
        parts.push(withModifiers([renderedHouseMeaning, exactBody].filter(Boolean).join("\n\n"), true));
        partKeys.push(exactHouseLived.contentKey);
      } else {
        const houseTemplate = getTemplate("fallback-template/natal.house-context");
        const houseCtx = {
          ...ctx,
          houseOrdinal: ordinal(house),
          houseMeaning: renderedHouseMeaning,
          placementHouseSentences: getHook(`fallback-hook/placement-house-sentence/${planet}/${house}`, voice, opts2),
          modifierSentences: mods
        };
        try {
          parts.push(renderTemplate(houseTemplate, houseCtx, gapLabel, voice));
          partKeys.push(houseTemplate.contentKey);
        } catch (err) {
          if (!(err instanceof SourceGapError) || !genericHouseLived) throw err;
          parts.push(withModifiers(genericHouseLived.body ?? "", true));
          partKeys.push(genericHouseLived.contentKey);
        }
        headlineTemplate = houseTemplate;
        ctx.houseOrdinal = houseCtx.houseOrdinal;
      }
    }
    return {
      headline: exactHouseLived ? `${title(planet)} in the ${ordinal(house)} house` : fixArticles(mustache(headlineTemplate.headline ?? "", ctx)),
      parts,
      partKeys,
      body: parts.join("\n\n"),
      templateKey: exactHouseLived?.contentKey ?? headlineTemplate.contentKey
    };
  }
  function renderNatalAngle(facts, opts2 = {}) {
    const voice = facts.voice === "you" ? "you" : "they";
    const ctx = {
      possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
      angleTitle: ANGLE_TITLE[facts.angle] ?? title(facts.angle),
      signTitle: title(facts.sign),
      angleIntro: getHook(`fallback-hook/angle-intro/${facts.angle}`, voice, opts2),
      angleSignSentences: getHook(`fallback-hook/angle-sign/${facts.angle}/${facts.sign}`, voice, opts2),
      modifierSentences: []
    };
    const template = getTemplate("fallback-template/natal.angle-in-sign");
    const body = renderTemplate(template, ctx, `${facts.angle}/${facts.sign}`, voice);
    return {
      headline: mustache(template.headline ?? "", ctx),
      parts: [body],
      body,
      templateKey: template.contentKey
    };
  }
  function renderNatalAspect(facts, opts2 = {}) {
    const voice = facts.voice === "you" ? "you" : "they";
    const aspect = facts.aspect;
    const exactLived = getReaderLivedRow(`fallback-hook/natal-aspect-lived/${facts.planetA}/${aspect}/${facts.planetB}`, voice, opts2) ?? getReaderLivedRow(`fallback-hook/natal-aspect-lived/${facts.planetB}/${aspect}/${facts.planetA}`, voice, opts2);
    if (exactLived) {
      const exactBody = mustache(exactLived.body ?? "", { Name: facts.voice });
      return {
        headline: `${title(facts.planetA)} ${aspect} ${title(facts.planetB)}`,
        parts: [exactBody],
        body: exactBody,
        astroHint: exactLived.astroHint,
        templateKey: exactLived.contentKey,
        provenanceTier: "exact-owner-approved"
      };
    }
    const group = ASPECT_GROUP[aspect];
    const pair = group ? getHook(`fallback-hook/aspect-pair/${facts.planetA}/${facts.planetB}/${group}`, voice, opts2) ?? getHook(`fallback-hook/aspect-pair/${facts.planetB}/${facts.planetA}/${group}`, voice, opts2) : null;
    if (!group) {
      throw new SourceGapError(`SOURCE_GAP: natal aspect ${facts.planetA}-${aspect}-${facts.planetB}`);
    }
    if (!pair) {
      throw new SourceGapError(`SOURCE_GAP: natal aspect pair ${facts.planetA}-${aspect}-${facts.planetB}`);
    }
    const ctx = {
      possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
      planetATitle: title(facts.planetA),
      planetBTitle: title(facts.planetB),
      aspectName: aspect,
      aspectAdj: getVocab(`fallback-vocab/aspect-adj/${aspect}`, voice, opts2),
      planetACore: getVocab(`fallback-vocab/planet-core/${facts.planetA}`, voice, opts2),
      planetBCore: getVocab(`fallback-vocab/planet-core/${facts.planetB}`, voice, opts2),
      aspectTypeLine: getHook(`fallback-hook/aspect-type/${aspect}`, voice, opts2),
      aspectMotion: getVocab(`fallback-vocab/aspect-motion/${aspect}`, voice, opts2),
      possessiveLow: facts.voice === "you" ? "your" : `${facts.voice}'s`,
      pairSentences: pair
    };
    const template = getTemplate("fallback-template/natal.aspect");
    const body = renderTemplate(template, ctx, `${facts.planetA}-${facts.aspect}-${facts.planetB}`, voice);
    return {
      headline: mustache(template.headline ?? "", ctx),
      parts: [body],
      body,
      templateKey: template.contentKey,
      provenanceTier: "legacy-reviewed"
    };
  }
  const SIGN_RULER = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter" };
  const EMPTY_HOUSE_V14_MODERN_RULER = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "pluto", sagittarius: "jupiter", capricorn: "saturn", aquarius: "uranus", pisces: "neptune" };
  const EMPTY_HOUSE_RULERS = { modern: EMPTY_HOUSE_V14_MODERN_RULER, traditional: SIGN_RULER };
  const PATTERN_NAMES = { t_square: "T-Square", grand_square: "Grand Cross", grand_trine: "Grand Trine", kite: "Kite", yod: "Yod", mystic_rectangle: "Mystic Rectangle" };
  function renderAspectPattern({ type, apexTitle, mode, element, activation = false, voice = "you" }) {
    const vocabularyVoice = voice === "you" ? "you" : "they";
    const pick = (key) => {
      const r = hooks.get(key);
      return r ? voice === "you" ? r.body_you : r.body_they : null;
    };
    const body = pick(`fallback-hook/aspect-pattern${activation ? "-activation" : ""}/${type}`);
    if (!body) throw new SourceGapError(`SOURCE_GAP: aspect pattern ${type}${activation ? " activation" : ""}`);
    const paras = [body];
    if (!activation && apexTitle) {
      const apex = pick(`fallback-hook/aspect-pattern-apex/${type}`);
      if (apex) paras.push(apex.replace(/\{\{apexTitle\}\}/g, apexTitle));
    }
    if (!activation) {
      const qual = mode ? getVocab(`fallback-vocab/pattern-mode/${mode}`, vocabularyVoice, opts) : element ? getVocab(`fallback-vocab/pattern-element/${element}`, vocabularyVoice, opts) : null;
      if (qual) paras.push(`It runs as ${qual}.`);
    }
    return { headline: PATTERN_NAMES[type] ?? type, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/natal.aspect-pattern" };
  }
  function renderHouseGlossary({ house, voice = "you" }) {
    const r = hooks.get(`fallback-hook/house-glossary/${house}`);
    if (!r) throw new SourceGapError(`SOURCE_GAP: house glossary ${house}`);
    const body = voice === "you" ? r.body_you : r.body_they;
    return { headline: `${ordinal(house)} House`, body, parts: [body], templateKey: "fallback-template/natal.house-glossary", contentKey: r.contentKey };
  }
  function renderNatalEmptyHouse(facts, opts2 = {}) {
    const { house, sign, rulerHouse, voice = "you" } = facts;
    const v = voice === "you" ? "you" : "they";
    const rulerSystem = facts.rulerSystem ?? "modern";
    const rulerMap = EMPTY_HOUSE_RULERS[rulerSystem];
    if (!rulerMap) throw new RoleViolationError(`Unknown empty-house ruler system: ${rulerSystem}.`);
    const ruler = rulerMap[sign];
    if (!Number.isInteger(house) || house < 1 || house > 12 || !ruler || !Number.isInteger(rulerHouse) || !rulerHouse || rulerHouse < 1 || rulerHouse > 12 || rulerHouse === house) {
      throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} (${v})`);
    }
    if (facts.primaryRuler && facts.primaryRuler !== ruler) {
      throw new RoleViolationError(`Empty-house V14 ${rulerSystem} system requires ruler ${ruler} for ${sign}; received ${facts.primaryRuler}.`);
    }
    const baseKey = `fallback-hook/empty-house/base/${house}`;
    const signKey = `fallback-hook/empty-house/sign/${house}/${sign}`;
    const specificRulerKey = house === 1 ? `fallback-hook/empty-house/rising-ruler/${sign}/${ruler}/${rulerHouse}` : `fallback-hook/empty-house/ruler-planet/${house}/${ruler}/${rulerHouse}`;
    const genericRulerKey = `fallback-hook/empty-house/ruler-house/${house}/${rulerHouse}`;
    const note = getHook(baseKey, v, opts2);
    const signBody = getHook(signKey, v, opts2);
    const specificRulerBody = getHook(specificRulerKey, v, opts2);
    const rulerKey = specificRulerBody ? specificRulerKey : genericRulerKey;
    const rulerBody = specificRulerBody ?? (house === 1 ? null : getHook(genericRulerKey, v, opts2));
    if (!note || !signBody || !rulerBody) {
      throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign}/${ruler}-in-${rulerHouse} (${v})`);
    }
    const bridgeTemplateKey = house === 1 ? "fallback-hook/empty-house/bridge-template/house-1" : "fallback-hook/empty-house/bridge-template/standard";
    const topicMKey = `fallback-vocab/empty-house-ruler-jurisdiction/${rulerHouse}`;
    const topicNKey = `fallback-vocab/empty-house-bridge-topic-short/${house}`;
    const bridgeTemplate = opts2.includeEmptyHouseBridge ? findTemplate(bridgeTemplateKey, opts2) : null;
    const topicM = bridgeTemplate ? getVocab(topicMKey, v, opts2) : null;
    const topicN = house === 1 ? null : bridgeTemplate ? getVocab(topicNKey, v, opts2) : null;
    const planet = ruler === "sun" || ruler === "moon" ? `the ${title(ruler)}` : title(ruler);
    const bridge = bridgeTemplate && topicM && (house === 1 || topicN) ? renderTemplate(bridgeTemplate, {
      houseN: ordinal(house),
      sign: title(sign),
      planet,
      houseM: ordinal(rulerHouse),
      topicN,
      topicM
    }, `empty house bridge ${house}/${sign}/${ruler}-in-${rulerHouse}`, v) : null;
    const parts = [signBody, ...bridge ? [bridge] : [], rulerBody];
    const bridgeSourceKeys = bridge ? [bridgeTemplateKey, ...house === 1 ? [] : [topicNKey], topicMKey] : [];
    return {
      headline: `${ordinal(house)} House`,
      note,
      body: parts.join("\n\n"),
      parts,
      templateKey: "fallback-template/natal.empty-house-v14",
      sourceKeys: [baseKey, signKey, ...bridgeSourceKeys, rulerKey]
    };
  }
  function renderProfectionYear(facts, opts2 = {}) {
    const { house, sign, voice = "you" } = facts;
    const v = voice === "you" ? "you" : "they";
    const body = getHook(`fallback-hook/profection-year/${house}`, v, opts2);
    if (!body) throw new SourceGapError(`SOURCE_GAP: profection year ${house} (${v})`);
    const note = getHook("fallback-hook/profection-explainer", v, opts2);
    const parts = [body];
    if (sign) {
      const ruler = facts.ruler ?? SIGN_RULER[sign];
      const frame = getHook(`fallback-hook/profection-ruler/${ruler}`, v, opts2) ?? getHook(ruler === "sun" || ruler === "moon" ? "fallback-hook/profection-ruler-luminary" : "fallback-hook/profection-ruler", v, opts2);
      if (frame && ruler) {
        const REF = { sun: "the Sun", moon: "the Moon" };
        const p = mustache(frame, { signTitle: title(sign), houseOrdinal: ordinal(house), rulerRef: REF[ruler] ?? title(ruler) });
        if (!/\{\{/.test(p)) parts.push(p);
      }
    }
    return { headline: `${ordinal(house)} House Year`, note, body: parts.join("\n\n"), parts, templateKey: "fallback-template/natal.profection-year" };
  }
  return { renderNatalPlacement, renderNatalAngle, renderNatalAspect, renderNatalEmptyHouse, renderProfectionYear, renderHouseGlossary, renderAspectPattern };
}
function normalizeAspect(input) {
  const k = input.trim().toLowerCase();
  const map = {
    conjunction: "conjunction",
    conjunct: "conjunction",
    conj: "conjunction",
    square: "square",
    sq: "square",
    trine: "trine",
    sextile: "sextile",
    sext: "sextile",
    opposition: "opposition",
    opposite: "opposition",
    opposed: "opposition",
    oppose: "opposition",
    quincunx: "quincunx",
    inconjunct: "quincunx",
    semisextile: "semisextile",
    "semi-sextile": "semisextile",
    "semi sextile": "semisextile",
    nonagen: "semisextile"
  };
  return map[k] ?? null;
}

// apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.browser.ts
var SECOND_PERSON = /\b(?:you|your|yours|yourself|yourselves)\b/giu;
var DIRECT_IMPERATIVE = /(?:^|[.!?]\s+)(?:don't|do not|stop|keep|let|give|take|check|say|ask|make|go|trust|put|use|change|tell|be|try|finish|clear|get|notice|remember|decide|write|walk|sit|come|pick|start|see|rest|reschedule|lead|treat|reduce|stay|run|choose|review|pay|complete|separate|begin|send|follow|hold|bring|count|read|skip|look|call|move|leave|delay|spend|accept|speak|expect|know|direct)\b/giu;
var PERSON_SLOT = /\{\{([\w.]+)\}\}/gu;
function isDeclarativeImperativeFalsePositive(bodyThey, match) {
  const matchIndex = match.index ?? 0;
  const verbOffset = match[0].search(/[A-Za-z]/u);
  const sentence = bodyThey.slice(matchIndex + Math.max(0, verbOffset));
  return /^(?:Change would require\b|Clear numbers, access, and responsibility make\b)/iu.test(sentence);
}
var DAILY_GLANCE_PERSON_SLOT_KEYS = /* @__PURE__ */ new Set([
  "personName",
  "personNamePossessive",
  "personPreferredName",
  "personPreferredNamePossessive",
  "personSubject",
  "personSubjectCapitalized",
  "personObject",
  "personObjectCapitalized",
  "personPossessiveAdjective",
  "personPossessiveAdjectiveCapitalized",
  "personPossessivePronoun",
  "personPossessivePronounCapitalized",
  "personReflexive",
  "personReflexiveCapitalized",
  "personBePresent",
  "personBePast",
  "personHavePresent",
  "personVerbSuffix"
]);
function lintDailyGlanceFriendVoice(bodyThey) {
  const findings = [];
  for (const match of bodyThey.matchAll(SECOND_PERSON)) {
    findings.push({ id: "DG-THEY-NO-SECOND-PERSON", match: match[0] });
  }
  for (const match of bodyThey.matchAll(DIRECT_IMPERATIVE)) {
    if (isDeclarativeImperativeFalsePositive(bodyThey, match)) continue;
    findings.push({ id: "DG-THEY-NO-DIRECT-IMPERATIVE", match: match[0].trim() });
  }
  for (const match of bodyThey.matchAll(PERSON_SLOT)) {
    if (!DAILY_GLANCE_PERSON_SLOT_KEYS.has(match[1])) {
      findings.push({ id: "DG-THEY-ALLOWED-PERSON-SLOTS-ONLY", match: match[0] });
    }
  }
  return findings;
}
function fillDailyGlancePersonSlots(bodyThey, slots) {
  const findings = lintDailyGlanceFriendVoice(bodyThey);
  if (findings.length > 0) {
    throw new Error(findings.map((finding) => `${finding.id}: ${finding.match}`).join(" | "));
  }
  return bodyThey.replace(PERSON_SLOT, (slot, key) => {
    const value = slots[key];
    if (typeof value !== "string") {
      throw new Error(`DG-THEY-MISSING-PERSON-SLOT: ${slot}`);
    }
    return value;
  });
}

// apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.ts
var READER_ELIGIBLE_REVIEW_STATUSES = /* @__PURE__ */ new Set([
  "approved",
  "approved_reuse",
  "reviewed"
]);
var EXACT_APPROVAL_REQUIRED_PREFIXES = [
  "authored/transit-",
  "authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-",
  "authored/lunation-eclipse-section/",
  "fallback-hook/daily-",
  "fallback-hook/natal-aspect-lived/",
  "fallback-hook/synastry-pair/",
  "daily-glance-variant/"
];
var QUARANTINED_CONTENT_KEYS = /* @__PURE__ */ new Set([]);
var EXACT_SYNASTRY_ASPECTS = /* @__PURE__ */ new Set([
  "conjunction",
  "opposition",
  "square",
  "trine",
  "sextile"
]);
var GROUPED_SYNASTRY_ASPECTS = /* @__PURE__ */ new Set(["hard", "soft"]);
var DAILY_CONTINUITY_PREFIXES = ["fallback-hook/daily-", "daily-glance-variant/"];
function transitReaderTier(row) {
  if (!row.contentKey.startsWith("authored/transit-")) return null;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return null;
  }
  return hasExactOwnerApproval(row) ? "exact-owner-approved" : "legacy-reviewed";
}
function synastryReaderTier(row) {
  if (!row.contentKey.startsWith("fallback-hook/synastry-pair/")) return null;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return null;
  }
  const aspect = row.contentKey.split("/").at(-1) ?? "";
  if (EXACT_SYNASTRY_ASPECTS.has(aspect) && hasExactOwnerApproval(row)) {
    return "exact-owner-approved";
  }
  if (GROUPED_SYNASTRY_ASPECTS.has(aspect) && hasExactOwnerApproval(row)) {
    return "owner-approved-grouped";
  }
  if (EXACT_SYNASTRY_ASPECTS.has(aspect) || GROUPED_SYNASTRY_ASPECTS.has(aspect)) {
    return "legacy-reviewed";
  }
  return null;
}
function hasExactOwnerApproval(row) {
  const approval = row.approval;
  return approval?.approvalLevel === "exact_owner_approved" && typeof approval.recordPath === "string" && approval.recordPath.trim().length > 0 && typeof approval.payloadSha256 === "string" && /^[a-f0-9]{64}$/iu.test(approval.payloadSha256) && typeof approval.approvedAt === "string" && approval.approvedAt.trim().length > 0;
}
function requiresExactOwnerApproval(contentKey) {
  return EXACT_APPROVAL_REQUIRED_PREFIXES.some((prefix) => contentKey.startsWith(prefix));
}
function isGovernedReaderEligible(row, { allowUnreviewed = false } = {}) {
  if (allowUnreviewed) return true;
  if (QUARANTINED_CONTENT_KEYS.has(row.contentKey)) return false;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return false;
  }
  if (row.contentKey.startsWith("fallback-hook/synastry-pair/")) {
    return synastryReaderTier(row) !== null;
  }
  if (row.contentKey.startsWith("authored/transit-")) {
    return transitReaderTier(row) !== null;
  }
  if (DAILY_CONTINUITY_PREFIXES.some((prefix) => row.contentKey.startsWith(prefix))) {
    return true;
  }
  return !requiresExactOwnerApproval(row.contentKey) || hasExactOwnerApproval(row);
}

// apps/web/src/content/fallbackArchitectureV3/resolver/lunationNormalization.mjs
function normalizeLunationSign(value) {
  return String(value ?? "").trim().toLowerCase();
}

// apps/web/src/content/fallbackArchitectureV3/resolver/lunationEclipseSectionKeys.mjs
var SHARED_ECLIPSE_SECTION_IDS = /* @__PURE__ */ new Set([
  "nature",
  "mechanics",
  "recommendation",
  "close"
]);
function sharedLunationEclipseSectionKey(kind, sectionId, house = null) {
  if (!SHARED_ECLIPSE_SECTION_IDS.has(sectionId)) return null;
  const phase = kind === "eclipse-lunar" ? "lunar" : kind === "eclipse-solar" ? "solar" : null;
  const endingsVariant = phase === "lunar" && [4, 8, 12].includes(Number(house)) && (sectionId === "recommendation" || sectionId === "close");
  const resolvedSectionId = endingsVariant ? `${sectionId}-endings` : sectionId;
  return phase ? `authored/lunation-eclipse-section/shared/${phase}/${resolvedSectionId}` : null;
}

// apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs
var SHA256_CONSTANTS = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
var rotateRight = (value, bits) => value >>> bits | value << 32 - bits;
function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value));
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 128;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const state = [
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const w15 = words[index - 15];
      const w2 = words[index - 2];
      const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ w15 >>> 3;
      const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ w2 >>> 10;
      words[index] = words[index - 16] + s0 + words[index - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = e & f ^ ~e & g;
      const temp1 = h + s1 + choice + SHA256_CONSTANTS[index] + words[index] >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = a & b ^ a & c ^ b & c;
      const temp2 = s0 + majority >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    state[0] = state[0] + a >>> 0;
    state[1] = state[1] + b >>> 0;
    state[2] = state[2] + c >>> 0;
    state[3] = state[3] + d >>> 0;
    state[4] = state[4] + e >>> 0;
    state[5] = state[5] + f >>> 0;
    state[6] = state[6] + g >>> 0;
    state[7] = state[7] + h >>> 0;
  }
  return state.map((word) => word.toString(16).padStart(8, "0")).join("");
}

// apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts
var TRUE_LILITH_KEY_DATES_INTRO = "True Black Moon Lilith stations about once a month, so it crosses the same degrees several times before it finally moves on.";
function skyPlacementKeyDates({
  planet,
  sign,
  residencyPasses,
  residencyStations
}) {
  const passes = (residencyPasses ?? []).filter((pass) => {
    const entry = new Date(pass.entryDate);
    const exit = new Date(pass.exitDate);
    return !Number.isNaN(entry.getTime()) && !Number.isNaN(exit.getTime()) && entry.getTime() <= exit.getTime();
  }).sort((left, right) => left.entryDate.localeCompare(right.entryDate));
  if (passes.length === 0) return [];
  const keyDates = passes.map((pass, index) => ({
    date: pass.entryDate,
    endDate: pass.exitDate,
    label: passes.length > 1 ? `Pass ${index + 1} of ${passes.length}` : "",
    event: "residency-pass"
  }));
  const stationSign = String(sign ?? "").trim();
  for (const station of residencyStations ?? []) {
    const occursAt = new Date(station.occursAt);
    if (Number.isNaN(occursAt.getTime())) continue;
    const isVerifiedInsidePass = passes.some((pass) => occursAt.getTime() >= new Date(pass.entryDate).getTime() && occursAt.getTime() <= new Date(pass.exitDate).getTime());
    if (!isVerifiedInsidePass || !stationSign) continue;
    keyDates.push({
      date: station.occursAt,
      label: `${title2(planet)} stations ${station.direction} in ${title2(stationSign)}`,
      event: `station-${station.direction}`
    });
  }
  return keyDates.sort((left, right) => left.date.localeCompare(right.date));
}
function skyPlacementKeyDatesIntro(facts) {
  return String(facts.planet ?? "").trim().toLowerCase() === "lilith" && skyPlacementKeyDates(facts).length > 0 ? TRUE_LILITH_KEY_DATES_INTRO : null;
}
function dailyGlanceHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}
function dailyGlanceDayNumber(dateKey) {
  if (!dateKey) return null;
  const parsed = Date.parse(`${dateKey.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 864e5) : null;
}
function selectDailyGlanceVariantSet({
  variantSet,
  primary,
  dateKey,
  contentKey,
  userId,
  previousVariantId,
  allowUnreviewed = false
}) {
  const fallback = { id: "primary", ...primary };
  if (!variantSet || variantSet.pairing_policy !== "explicit_pairs_only") return fallback;
  const eligible = (kind, item) => isGovernedReaderEligible({
    ...item,
    contentKey: `daily-glance-variant/${contentKey}/${kind}/${item.id}`
  }, { allowUnreviewed });
  const headlines = new Map(variantSet.headlines.filter((item) => eligible("headline", item)).map((item) => [item.id, item.text]));
  const bodies = new Map(variantSet.bodies.filter((item) => eligible("body", item)).map((item) => [item.id, item.text]));
  const pairs = variantSet.pairings.filter((pairing) => eligible("pairing", pairing)).map((pairing) => ({ id: pairing.id, headline: headlines.get(pairing.headline_id), body: bodies.get(pairing.body_id) })).filter((pair) => Boolean(pair.headline && pair.body));
  if (!pairs.some((pair) => pair.id === "primary")) pairs.unshift(fallback);
  const dayNumber = dailyGlanceDayNumber(dateKey);
  if (pairs.length === 1 || dayNumber === null) return pairs[0] ?? fallback;
  const offset = dailyGlanceHash(`${contentKey}|${userId ?? "shared"}`) % pairs.length;
  let index = ((dayNumber + offset) % pairs.length + pairs.length) % pairs.length;
  if (previousVariantId && pairs[index]?.id === previousVariantId && pairs.length > 1) {
    index = (index + 1) % pairs.length;
  }
  return pairs[index] ?? fallback;
}
var FAST = /* @__PURE__ */ new Set(["moon", "mercury", "venus", "mars"]);
var HEAVY = /* @__PURE__ */ new Set(["saturn", "uranus", "neptune", "pluto", "chiron"]);
var ANGLES = /* @__PURE__ */ new Set(["ascendant", "midheaven", "descendant", "imum-coeli"]);
var ELEMENT = { aries: "fire", leo: "fire", sagittarius: "fire", taurus: "earth", virgo: "earth", capricorn: "earth", gemini: "air", libra: "air", aquarius: "air", cancer: "water", scorpio: "water", pisces: "water" };
var GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
var WINDOW_ASPECT = { moon: "Today", sun: "This week", mercury: "This week", venus: "This week", mars: "For the next couple of weeks", jupiter: "This month", saturn: "For the next few months", uranus: "For the next few months", neptune: "For the next few months", pluto: "For the next few months", chiron: "For the next few months", "north-node": "For the next few months", "south-node": "For the next few months", lilith: "This month" };
var WINDOW_HOUSE = { moon: "For the next couple of days", sun: "This month", mercury: "For the next few weeks", venus: "For the next few weeks", mars: "For the next month or two" };
var WINDOW_RETRO = { mercury: "For about three weeks", venus: "For about six weeks", mars: "For the next couple of months", jupiter: "For about four months", saturn: "For about four and a half months", uranus: "For about five months", neptune: "For about five months", pluto: "For about five months", chiron: "For about five months" };
var ORD2 = { 1: "1st", 2: "2nd", 3: "3rd" };
var ordinal2 = (n) => ORD2[n] ?? `${n}th`;
var title2 = (s) => s.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
function localizedLunationDateParts(exactAt, timeZone, label) {
  const date = new Date(exactAt);
  if (!Number.isFinite(date.getTime())) {
    throw new SourceGapError(`SOURCE_GAP: invalid ${label} timestamp ${exactAt}`);
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric"
    }).formatToParts(date);
    const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
    const year = Number(value("year"));
    const month = value("month");
    const day = Number(value("day"));
    if (!year || !month || !day) throw new Error("missing calendar date part");
    return { year, month, day };
  } catch {
    throw new SourceGapError(`SOURCE_GAP: invalid reader timezone ${timeZone}`);
  }
}
var NEEDS_ARTICLE = /* @__PURE__ */ new Set(["sun", "moon", "north-node", "south-node"]);
var transitRef = (planet, sign) => `${NEEDS_ARTICLE.has(planet) ? "the " : ""}${title2(planet)}${sign ? ` in ${title2(sign)}` : ""}`;
var fill = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).replace(/\s{2,}/g, " ").trim();
var READER_HOLDER_VERBS = new Map(Object.entries({
  is: "are",
  was: "were",
  has: "have",
  does: "do",
  feels: "feel",
  gives: "give",
  keeps: "keep",
  makes: "make",
  helps: "help",
  responds: "respond",
  reaches: "reach",
  brings: "bring",
  tends: "tend",
  wants: "want",
  pushes: "push",
  needs: "need",
  starts: "start",
  sees: "see",
  shows: "show",
  thinks: "think",
  notices: "notice",
  knows: "know",
  believes: "believe",
  hears: "hear",
  takes: "take",
  begins: "begin",
  experiences: "experience",
  changes: "change",
  gets: "get",
  ends: "end",
  acts: "act",
  becomes: "become",
  presses: "press",
  pays: "pay",
  offers: "offer",
  presents: "present",
  names: "name",
  reacts: "react",
  adds: "add",
  recognizes: "recognize",
  resents: "resent",
  reads: "read",
  resists: "resist",
  supports: "support",
  turns: "turn",
  mistakes: "mistake",
  says: "say",
  guards: "guard",
  looks: "look",
  stays: "stay",
  expands: "expand",
  reminds: "remind",
  corrects: "correct",
  tries: "try",
  jumps: "jump",
  catches: "catch",
  probes: "probe",
  pulls: "pull",
  means: "mean",
  enjoys: "enjoy",
  grounds: "ground",
  commits: "commit",
  drifts: "drift",
  edits: "edit",
  comes: "come",
  explains: "explain",
  adjusts: "adjust",
  insists: "insist",
  states: "state",
  seems: "seem",
  moves: "move",
  decides: "decide",
  softens: "soften",
  likes: "like",
  enters: "enter",
  introduces: "introduce",
  handles: "handle",
  encourages: "encourage",
  speaks: "speak",
  appreciates: "appreciate"
}));
var READER_HOLDER_ADVERBS = "(?:usually|often|also|still|readily|completely|quickly|emotionally|actually|almost|naturally|only|then)";
var READER_HOLDER_VERB_PATTERN = [...READER_HOLDER_VERBS.keys()].join("|");
function renderSynastryPairVoice(body, holders) {
  const readerHolder = holders.holder1 === "you" ? "holder1" : "holder2";
  const marker = "__reader_holder__";
  let rendered = fill(body, { ...holders, [readerHolder]: marker });
  rendered = rendered.replace(new RegExp(`${marker}'s`, "g"), "your").replace(
    new RegExp(`(?<!from\\s)${marker}(\\s+(?:(?:${READER_HOLDER_ADVERBS})\\s+)*)(?:${READER_HOLDER_VERB_PATTERN})\\b`, "g"),
    (match, spacing) => {
      const verb = match.slice(marker.length + spacing.length);
      return `you${spacing}${READER_HOLDER_VERBS.get(verb) ?? verb}`;
    }
  ).replaceAll(marker, "you").replace(/(^|[.!?]\s+)you\b/g, "$1You");
  return rendered;
}
var inlineWindow = (w) => {
  if (!w) return null;
  if (w.startsWith("Until ")) return "through " + w.slice(6);
  if (w.startsWith("For the next")) return "over the next" + w.slice(12);
  if (w.startsWith("For about")) return "for about" + w.slice(9);
  return w.charAt(0).toLowerCase() + w.slice(1);
};
var serialList = (items) => {
  if (items.length < 2) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
};
var FRIEND_IMPERATIVE = /(^|[.!?]\s+|\n+)(Don't|Do not|Either|Stop|Keep|Let|Give|Take|Check|Say|Ask|Enjoy|Make|Go|Trust|Put|Use|Change|Tell|Be|Try|Add|Finish|Clear|Get|Notice|Remember|Decide|Test|Write|Walk|Sit|Come|Pick|Hit|Revisit|Eat|Start|See|Shake|Rest|Reschedule|Lead|Treat|Reduce|Stay|Run|Choose|Review|Pay|Complete|Separate|Begin|Send|Follow|Hold|Stick|Conserve|Reform|Enlist|Aim|Fight|Bring|Drain|Count|Read|Skip|Look|Call|Move|Leave|Postpone|Verify|Request|Delay|Spend|Accept|Speak|Expect|Renegotiate|Know|Direct)\b/g;
var FRIEND_REPORTED_SUBJECT_YOU = /\b(tell|tells|told|show|shows|showed|remind|reminds|reminded|teach|teaches|taught)\s+you\s+(are|were|have|had|can|could|will|would|should|may|might|must|do|did)\b/gi;
var FRIEND_PREPOSITION_OBJECT_YOU = /\b(around|for|to|with|without|at|from|of|about|through|toward|towards|against|between|among|by|beside|behind|under|over|in|inside|outside|into|onto|off|near|within)\s+you\b/gi;
var FRIEND_VERB_OBJECT_YOU = /\b(find|finds|found|finding|help|helps|helped|helping|give|gives|gave|giving|pull|pulls|pulled|pulling|support|supports|supported|supporting|affect|affects|affected|affecting|remind|reminds|reminded|reminding|satisfy|satisfies|satisfied|satisfying|cheer|cheers|cheered|cheering|ask|asks|asked|asking|tell|tells|told|telling|leave|leaves|left|leaving|show|shows|showed|showing|make|makes|made|making|let|lets|letting|keep|keeps|kept|keeping|cost|costs|costing|teach|teaches|taught|teaching|push|pushes|pushed|pushing|hold|holds|held|holding|stop|stops|stopped|stopping)\s+you\b/gi;
function possessiveDisplayName(name) {
  return `${name}'s`;
}
function friendVoiceFromReaderCopy(body, name) {
  let named = false;
  const namePossessive = possessiveDisplayName(name);
  const nameForPossessive = (source) => {
    if (named) return /^[A-Z]/.test(source) ? "Their" : "their";
    named = true;
    return namePossessive;
  };
  const nameForContraction = (verb) => {
    if (named) return `they${verb}`;
    named = true;
    return `${name} ${verb === "'re" ? "is" : verb === "'ve" ? "has" : verb === "'ll" ? "will" : "would"}`;
  };
  const nameForObject = () => {
    const objectReference = named ? "them" : name;
    named = true;
    return objectReference;
  };
  let rendered = body.replace(/\byourself\b/gi, "themselves").replace(/\byourselves\b/gi, "themselves").replace(/\byours\b/gi, "theirs").replace(/\byou('re|’re|'ve|’ve|'ll|’ll|'d|’d)\b/gi, (_, verb) => nameForContraction(verb.toLowerCase().replace("\u2019", "'"))).replace(/\byour\b/gi, (source) => nameForPossessive(source)).replace(
    FRIEND_REPORTED_SUBJECT_YOU,
    (_, governor, auxiliary) => `${governor} they ${auxiliary}`
  ).replace(FRIEND_PREPOSITION_OBJECT_YOU, (_, governor) => `${governor} ${nameForObject()}`).replace(FRIEND_VERB_OBJECT_YOU, (_, governor) => `${governor} ${nameForObject()}`).replace(/\byou\b/gi, (source) => /^[A-Z]/.test(source) ? "They" : "they");
  rendered = rendered.replace(FRIEND_IMPERATIVE, (_, prefix, verb) => {
    const subject = named ? "They" : name;
    named = true;
    const normalizedVerb = verb.toLowerCase();
    if (normalizedVerb === "don't" || normalizedVerb === "do not") {
      return `${prefix}${subject} should not`;
    }
    return `${prefix}${subject} should ${normalizedVerb}`;
  });
  return rendered;
}
function eligibleRowsByKey(rows, allowUnreviewed) {
  const candidates = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }
  return new Map(
    [...candidates].map(([key, keyed]) => [
      key,
      [...keyed].reverse().find((candidate) => isGovernedReaderEligible(candidate, { allowUnreviewed }))
    ]).filter((entry) => Boolean(entry[1]))
  );
}
function createTransitSynastryRenderer(transitLib, templatesFile, rowsFile, opts2 = {}) {
  const allowUnreviewed = Boolean(opts2.allowUnreviewed);
  const cards = eligibleRowsByKey(transitLib.authoredCards, allowUnreviewed);
  const vocab = eligibleRowsByKey(rowsFile.vocabularyRows, allowUnreviewed);
  const hooks = eligibleRowsByKey(rowsFile.hookRows ?? [], allowUnreviewed);
  function renderSkyPlacementHouseCore({ planet, sign, house }) {
    const normalizedPlanet = String(planet ?? "").trim().toLowerCase();
    const normalizedSign = String(sign ?? "").trim().toLowerCase();
    const normalizedHouse = Number(house);
    const key = `house-horoscope-core/${normalizedPlanet}/${normalizedSign}/house-${normalizedHouse}`;
    const row = hooks.get(key);
    if (!Number.isInteger(normalizedHouse) || normalizedHouse < 1 || normalizedHouse > 12 || !row || row.content_role !== "house_horoscope_core" || row.grammar_frame !== "second_person_block" || !row.body_you) {
      throw new SourceGapError(`SOURCE_GAP: house horoscope core ${normalizedPlanet}/${normalizedSign}/house-${normalizedHouse}`);
    }
    return {
      body: row.body_you,
      contentKey: row.contentKey,
      house: normalizedHouse,
      templateKey: `house-horoscope-core/${normalizedPlanet}-${normalizedSign}-v1`
    };
  }
  const tpl = (key) => {
    const t = templatesFile.templates.find((x) => x.contentKey === key);
    if (!t) throw new SourceGapError(`SOURCE_GAP: missing template ${key}`);
    return t;
  };
  const card = (k) => cards.get(k) ?? null;
  const skyArticles = [...cards.values()].filter((candidate) => candidate.contentKey.startsWith("sky-article/"));
  const articleDay = (value) => {
    const day = value?.slice(0, 10);
    return day && /^\d{4}-\d{2}-\d{2}$/u.test(day) ? day : null;
  };
  const articleDateLabel = (value) => new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(/* @__PURE__ */ new Date(`${value.slice(0, 10)}T00:00:00Z`));
  const articleWindow = (candidate) => candidate.valid_from && candidate.valid_to ? `${articleDateLabel(candidate.valid_from)} \u2013 ${articleDateLabel(candidate.valid_to)}` : null;
  const selectSkyArticle = ({
    planet,
    sign,
    asOfDate,
    articleMode = "current",
    articleKey,
    isRetrograde = false,
    isShadowPhase = false
  }) => {
    const pair = skyArticles.filter((candidate) => candidate.planet === planet && candidate.sign === sign);
    if (articleMode === "archive") {
      return articleKey ? pair.find((candidate) => candidate.contentKey === articleKey) ?? null : null;
    }
    const day = articleDay(asOfDate);
    if (!day) {
      return null;
    }
    const inWindow = pair.filter((candidate) => !candidate.archive_only && candidate.article_structure === "final-v1" && Boolean(candidate.valid_from && candidate.valid_to) && candidate.valid_from <= day && candidate.valid_to >= day);
    const retrogradeWindow = isRetrograde || isShadowPhase;
    return (retrogradeWindow ? inWindow.find((candidate) => candidate.article_variant === "retrograde") ?? inWindow.find((candidate) => candidate.article_variant !== "retrograde") : inWindow.find((candidate) => candidate.article_variant !== "retrograde")) ?? null;
  };
  const skyPlacementHistoryAllowed = (planet, isRetrograde, historyEligible) => {
    if (typeof historyEligible === "boolean") {
      return historyEligible;
    }
    return (/* @__PURE__ */ new Set([
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto",
      "chiron",
      "north-node",
      "south-node"
    ])).has(planet) || isRetrograde && ["mercury", "venus", "mars"].includes(planet);
  };
  const ARTICLE_SECTION_ORDER = {
    "seasonal-context": 1,
    ingress: 2,
    "planet-education": 3,
    "collective-read": 3,
    "collective-era": 4,
    "dated-aspect": 4,
    "event-interaction": 5,
    "exit-tone-shift": 6,
    "historic-movement": 7,
    "retrograde-variant": 8
  };
  const ARTICLE_COPY_PUNCTUATION_FAILURE = /—|--/u;
  const ARTICLE_LITERAL_ENGINE_FACT = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|(?:19|20)\d{2}|\d+(?:\.\d+)?\s*(?:°|degrees?))\b/u;
  const articleCopyFields = (candidate) => [
    candidate.headline,
    candidate.body,
    candidate.preview_note,
    candidate.core_theme,
    candidate.sign_jurisdiction,
    candidate.lived_experience,
    candidate.rulership_twist,
    candidate.history_echo,
    candidate.closing_charge,
    ...(candidate.article_sections ?? []).flatMap((section) => [section.heading, section.body]),
    ...(candidate.rising_horoscopes ?? []).map((entry) => entry.body)
  ].filter((value) => typeof value === "string");
  const assertSkyArticleCopy = (candidate) => {
    for (const copy of articleCopyFields(candidate)) {
      if (ARTICLE_COPY_PUNCTUATION_FAILURE.test(copy)) {
        throw new SourceGapError(
          `SOURCE_GAP: sky article ${candidate.contentKey} contains a prohibited em dash or double hyphen`
        );
      }
    }
    if (candidate.article_structure === "final-v1") {
      for (const copy of (candidate.article_sections ?? []).flatMap((section) => [
        section.heading,
        section.body
      ]).filter((value) => typeof value === "string")) {
        if (ARTICLE_LITERAL_ENGINE_FACT.test(copy)) {
          throw new SourceGapError(
            `SOURCE_GAP: sky article ${candidate.contentKey} hardcodes a date or degree outside an engine slot`
          );
        }
      }
    }
  };
  const articleSectionEvent = (section, events) => {
    if (section.kind === "dated-aspect") {
      return events.find((event) => event.type === "aspect" && event.aspect === section.aspect && (/* @__PURE__ */ new Set([event.a, event.b])).size === 2 && (/* @__PURE__ */ new Set([event.a, event.b])).has(section.a) && (/* @__PURE__ */ new Set([event.a, event.b])).has(section.b)) ?? null;
    }
    if (section.kind === "event-interaction" || section.kind === "retrograde-variant" && section.event_type) {
      return events.find((event) => event.type === section.event_type) ?? null;
    }
    return null;
  };
  const articleSlotFill = (value, slots, contentKey) => {
    const rendered = value.replace(/\{\{([\w.]+)\}\}/g, (_, key) => slots[key] == null ? `{{${key}}}` : String(slots[key])).trim();
    const leftover = rendered.match(/\{\{([\w.]+)\}\}/u);
    if (leftover) {
      throw new SourceGapError(
        `SOURCE_GAP: sky article ${contentKey} is missing engine slot ${leftover[1]}`
      );
    }
    return rendered;
  };
  const renderFinalSkyArticle = (candidate, facts) => {
    if (candidate.article_structure !== "final-v1") {
      return null;
    }
    assertSkyArticleCopy(candidate);
    const sections = candidate.article_sections ?? [];
    const kinds = new Set(sections.map((section) => section.kind));
    const hasOpening = facts.planet === "sun" ? kinds.has("seasonal-context") || kinds.has("ingress") : FAST.has(facts.planet) ? kinds.has("seasonal-context") && kinds.has("ingress") : kinds.has("ingress");
    if (!hasOpening || !kinds.has("collective-read") || !kinds.has("exit-tone-shift")) {
      throw new SourceGapError(
        `SOURCE_GAP: sky article ${candidate.contentKey} is missing a required FINAL section`
      );
    }
    const baseSlots = {
      entryDate: facts.entryDate,
      exitDate: facts.exitDate,
      historyEntryDate: facts.historyEntryDate,
      historyExitDate: facts.historyExitDate,
      historyDegreeRange: facts.historyDegreeRange
    };
    const renderedSections = sections.map((section, sourceIndex) => ({ section, sourceIndex })).sort((first, second) => ARTICLE_SECTION_ORDER[first.section.kind] - ARTICLE_SECTION_ORDER[second.section.kind] || first.sourceIndex - second.sourceIndex).flatMap(({ section }) => {
      if (section.kind === "historic-movement" && !skyPlacementHistoryAllowed(facts.planet, Boolean(facts.isRetrograde), facts.historyEligible)) {
        return [];
      }
      if (section.kind === "retrograde-variant" && !facts.isRetrograde && !facts.isShadowPhase) {
        return [];
      }
      const event = articleSectionEvent(section, facts.events ?? []);
      if ((section.kind === "dated-aspect" || section.kind === "event-interaction" || section.kind === "retrograde-variant" && section.event_type) && !event) {
        return [];
      }
      if (section.exact_date && section.exact_date !== event?.exactDateKey) {
        throw new SourceGapError(
          `SOURCE_GAP: sky article ${candidate.contentKey} event date contradicts the ephemeris`
        );
      }
      if (section.exact_date && candidate.valid_from && candidate.valid_to && (section.exact_date < candidate.valid_from || section.exact_date > candidate.valid_to)) {
        throw new SourceGapError(
          `SOURCE_GAP: sky article ${candidate.contentKey} event falls outside the article window`
        );
      }
      if (typeof section.degree === "number" && section.degree !== event?.exactDegree) {
        throw new SourceGapError(
          `SOURCE_GAP: sky article ${candidate.contentKey} event degree contradicts the ephemeris`
        );
      }
      const slots = {
        ...baseSlots,
        aspectDate: event?.exactDate,
        eventDate: event?.exactDate,
        aspectDegree: event?.exactDegree,
        eventDegree: event?.exactDegree
      };
      return [{
        kind: section.kind,
        heading: section.heading ? articleSlotFill(section.heading, slots, candidate.contentKey) : "",
        body: articleSlotFill(section.body, slots, candidate.contentKey)
      }];
    });
    const risingRows = candidate.rising_horoscopes ?? [];
    const risingSigns = new Set(risingRows.map((entry) => entry.rising_sign));
    if (risingRows.length !== 12 || risingSigns.size !== 12 || !facts.risingHouseMap) {
      throw new SourceGapError(
        `SOURCE_GAP: sky article ${candidate.contentKey} must provide twelve public rising horoscopes`
      );
    }
    const risingHoroscopes = risingRows.map((entry) => {
      const house = facts.risingHouseMap?.[entry.rising_sign];
      if (!house) {
        throw new SourceGapError(
          `SOURCE_GAP: sky article ${candidate.contentKey} is missing the ${entry.rising_sign} rising house`
        );
      }
      return {
        risingSign: title2(entry.rising_sign),
        body: articleSlotFill(entry.body, {
          house,
          houseOrdinal: ordinal2(house)
        }, candidate.contentKey)
      };
    });
    const parts = renderedSections.map((section) => section.body);
    return {
      body: parts.join("\n\n"),
      parts,
      articleSections: renderedSections,
      risingHoroscopes
    };
  };
  const hookVoice = (key, voice) => {
    const r = hooks.get(key);
    return r ? (voice === "you" ? r.body_you : r.body_they) ?? null : null;
  };
  const result = (c, templateKey) => ({
    headline: c.headline || "",
    body: c.body,
    parts: [c.body],
    partSourceKeys: [[c.contentKey]],
    sourceKeys: [c.contentKey],
    templateKey,
    contentKey: c.contentKey,
    provenanceTier: transitReaderTier(c) ?? void 0
  });
  const fillKeep = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] != null ? String(ctx[k]) : `{{${k}}}`).trim();
  const EVENT_QUALITY = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
  const EVENT_VERB = { conjunction: "sitting right on", square: "squaring", opposition: "opposing", trine: "trining", sextile: "sextiling" };
  const CONJ_SOFT = /* @__PURE__ */ new Set(["venus", "sun", "mercury", "jupiter"]);
  function renderTransitHouseEvent({ planet, house, sign, natal, natalHouse, aspect, window: win, voice = "you", variant }) {
    const v = voice === "you" ? "you" : "they";
    const quality = EVENT_QUALITY[aspect];
    if (!quality) throw new SourceGapError(`SOURCE_GAP: transit-house event ${planet}/${natal}/${aspect}`);
    const cls = quality === "conjunction" ? CONJ_SOFT.has(planet) ? "soft" : "hard" : quality;
    const specificFrameKey = `fallback-hook/transit-house-event-frame/${planet}`;
    const frameKey = hookVoice(specificFrameKey, v) ? specificFrameKey : "fallback-hook/transit-house-event-frame/generic";
    const frameRaw = hookVoice(frameKey, v);
    const windowClause = win ? /^(until|through|till|before|by)\b/i.test(win) ? ` ${win.charAt(0).toLowerCase()}${win.slice(1)}` : ` until ${win}` : "";
    const natalHouseSuffix = natalHouse ? v === "you" ? ` in your ${ordinal2(natalHouse)} house` : ` in the ${ordinal2(natalHouse)} house` : "";
    const natalTitle = `${title2(natal)}${natalHouseSuffix}`;
    const frame = frameRaw ? fillKeep(frameRaw, {
      Name: v === "they" ? voice : "",
      aspectVerb: EVENT_VERB[aspect],
      houseOrdinal: ordinal2(house),
      natalTitle,
      transitTitle: title2(planet),
      windowClause
    }) : null;
    const wantsKey = `fallback-hook/transit-house-event-wants/${planet}/${sign}`;
    const holdsKey = `fallback-hook/transit-house-event-natal/${natal}`;
    const sceneKeys = [
      `fallback-hook/transit-house-event-scenes/${planet}/${natal}/${cls}`,
      `fallback-hook/transit-effect-${cls}/${planet}/${natal}`
    ];
    const wants = sign ? hookVoice(wantsKey, v) : null;
    const holds = hookVoice(holdsKey, v);
    const sceneKey = sceneKeys.find((key) => Boolean(hookVoice(key, v))) ?? null;
    const scenes = sceneKey ? hookVoice(sceneKey, v) : null;
    if (frame && wants && holds && scenes && sceneKey) {
      const body2 = `${frame} ${wants}; ${holds}. ${scenes}`.trim();
      const sourceKeys2 = [frameKey, wantsKey, holdsKey, sceneKey];
      return {
        headline: `${title2(planet)} ${aspect} ${v === "you" ? "your" : `${voice}'s`} ${title2(natal)}`,
        body: body2,
        parts: [body2],
        partSourceKeys: [sourceKeys2],
        sourceKeys: sourceKeys2,
        templateKey: "fallback-template/transit.house-event"
      };
    }
    const renderedAspect = renderTransitAspect({
      transiting: planet,
      natal,
      aspect,
      voice,
      variant,
      window: win ?? null
    });
    const body = frame ? `${frame} ${renderedAspect.body}` : renderedAspect.body;
    const sourceKeys = [
      ...frame ? [frameKey] : [],
      ...renderedAspect.contentKey ? [renderedAspect.contentKey] : [],
      renderedAspect.templateKey
    ];
    return {
      headline: renderedAspect.headline || `${title2(planet)} ${aspect} ${v === "you" ? "your" : `${voice}'s`} ${title2(natal)}`,
      body,
      parts: [body],
      partSourceKeys: [sourceKeys],
      sourceKeys,
      templateKey: "fallback-template/transit.house-event",
      contentKey: renderedAspect.contentKey
    };
  }
  function renderTransitHouse({ planet, house, sign, window: win, voice = "you", variant, events, isRetrograde }) {
    const v = voice === "you" ? "you" : "they";
    if (sign) {
      const vk = variant && variant !== 1 ? `/variant-${variant}` : "";
      const intro = card(`authored/transit-house-intro/${planet}/${house}${vk}`) ?? card(`authored/transit-house-intro/${planet}/${house}`);
      const synth = card(`authored/transit-house-sign/${planet}/${house}/${sign}${vk}`) ?? card(`authored/transit-house-sign/${planet}/${house}/${sign}`);
      if (intro && synth) {
        const pick = (c) => v === "you" ? c.body_you ?? c.body : c.body_they ?? c.body;
        const nameCtx = { Name: v === "they" ? voice : "" };
        const parts = [fillKeep(pick(intro), nameCtx), fillKeep(pick(synth), nameCtx)];
        const partSourceKeys = [[intro.contentKey], [synth.contentKey]];
        const headline = v === "you" ? `${title2(planet)} moving through your ${ordinal2(house)} house` : `${title2(planet)} moving through ${voice}'s ${ordinal2(house)} house`;
        if (isRetrograde) {
          const retroKey = `fallback-hook/transit-house-retro-overlay/${planet}`;
          const ro = hookVoice(retroKey, v);
          if (ro) {
            parts.push(fillKeep(ro, { Name: v === "they" ? voice : "" }));
            partSourceKeys.push([retroKey]);
          }
        }
        for (const e of events ?? []) {
          try {
            const renderedEvent = renderTransitHouseEvent({
              aspect: e.aspect,
              house,
              natal: e.natal,
              natalHouse: e.natalHouse,
              planet,
              sign,
              variant,
              voice,
              window: e.window ?? null
            });
            parts.push(renderedEvent.body);
            partSourceKeys.push(renderedEvent.sourceKeys ?? []);
          } catch {
          }
        }
        return {
          headline,
          body: parts.join("\n\n"),
          parts,
          partSourceKeys,
          sourceKeys: [...new Set(partSourceKeys.flat())],
          templateKey: "authored/transit-house-layered",
          contentKey: synth.contentKey,
          window: win ?? WINDOW_HOUSE[planet] ?? null
        };
      }
    }
    if (v === "you") {
      const c = card(`authored/transit-house/${planet}/${house}`);
      if (c) return result(c, "authored/transit-house");
    }
    const T = tpl("fallback-template/transit.house");
    const houseTopic = vocab.get(`fallback-vocab/house-topic/${house}`)?.body;
    const effectRaw = hookVoice(`fallback-hook/transit-effect-house/${planet}`, v);
    const ctx = {
      timeOpen: win ?? WINDOW_HOUSE[planet] ?? "Currently",
      transitTitle: title2(planet),
      transitRef: transitRef(planet, sign),
      houseOrdinal: ordinal2(house),
      houseTopic,
      otherPoss: v === "they" ? `${voice}'s` : null,
      // what this planet DOES to that area of life, not just that it is visiting
      houseEffect: effectRaw && houseTopic ? fill(effectRaw, { houseTopic }) : null
    };
    for (const slot of T.requiredSlots ?? []) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: transit-house ${planet}/${house} (no card, fallback slot ${slot} missing)`);
    const body = fill(v === "you" ? T.body_you ?? T.body : T.body_they ?? T.body, ctx);
    return { headline: fill((v === "you" ? T.headline : T.headline_they ?? T.headline) ?? "", ctx), body, parts: [body], templateKey: T.contentKey };
  }
  function renderTransitAspect({ transiting, natal, aspect, variant, pass, sign, isRetrograde, window: win, voice = "you" }) {
    const v = voice === "you" ? "you" : "they";
    const otherPoss = v === "they" ? `${voice}'s` : null;
    const g = GROUP[aspect] ?? aspect;
    if (natal === "lilith" && aspect !== "conjunction" && aspect !== "opposition") throw new SourceGapError(`SOURCE_GAP: lilith renders conjunction/opposition only (got ${aspect})`);
    const isHeavy = HEAVY.has(transiting) || HEAVY.has(natal);
    const SHARE = {
      conjunction: isHeavy ? ["hard", "soft"] : ["soft", "hard"],
      soft: isHeavy ? [] : ["conjunction"],
      hard: isHeavy ? ["conjunction"] : []
    };
    const groupsToTry = [g, ...SHARE[g] ?? []];
    const tryKeys = [];
    const push = (a, b) => {
      if (pass && pass >= 1 && pass <= 3) {
        tryKeys.push(`authored/transit-aspect/${a}/${b}/${aspect}/pass-${pass}`);
        if (g !== aspect) tryKeys.push(`authored/transit-aspect/${a}/${b}/${g}/pass-${pass}`);
      }
      if (variant) {
        tryKeys.push(`authored/transit-aspect/${a}/${b}/${aspect}/variant-${variant}`);
        if (g !== aspect) tryKeys.push(`authored/transit-aspect/${a}/${b}/${g}/variant-${variant}`);
      }
      tryKeys.push(`authored/transit-aspect/${a}/${b}/${aspect}`);
      for (const gg of groupsToTry) {
        if (gg !== aspect) tryKeys.push(`authored/transit-aspect/${a}/${b}/${gg}`);
      }
      tryKeys.push(`authored/transit-aspect/${a}/${b}/any`);
    };
    push(transiting, natal);
    if (FAST.has(transiting) && FAST.has(natal)) push(natal, transiting);
    tryKeys.push(`authored/transit-aspect/any/${natal}/${g}`, `authored/transit-aspect/any/${natal}/conjunction`);
    for (const k of tryKeys) {
      const c = card(k);
      if (c) {
        const AW = { conjunction: "conjunct", square: "square", opposition: "opposite", trine: "trine", sextile: "sextile" };
        const untilDate = win ? String(win).replace(/^until\s+/i, "") : null;
        const readerBody = c.body_you ?? c.body;
        if (!readerBody) throw new SourceGapError(`SOURCE_GAP: transit aspect ${c.contentKey} has no body`);
        let aBody = v === "you" ? readerBody : fillKeep(c.body_they ?? friendVoiceFromReaderCopy(readerBody, voice), { Name: voice });
        aBody = aBody.replace(/\{\{aspectWord\}\}/g, AW[aspect] ?? aspect);
        aBody = untilDate ? aBody.replace(/\{\{untilDate\}\}/g, untilDate) : aBody.replace(/ until \{\{untilDate\}\}/g, "");
        const gatedInsert = card(`authored/transit-aspect-insert/${transiting}/${natal}/${aspect}`);
        if (gatedInsert) {
          const readerInsert = gatedInsert.body_you ?? gatedInsert.body;
          const insBody = v === "you" ? readerInsert : gatedInsert.body_they ?? (readerInsert ? friendVoiceFromReaderCopy(readerInsert, voice) : null);
          if (insBody) aBody = `${aBody}

${insBody}`;
        }
        if (transiting === "neptune" && (g === "hard" || g === "conjunction")) {
          const NAT = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "midheaven", "ascendant"];
          const fnIdx = ((NAT.indexOf(natal) + (variant ?? 0)) % 4 + 4) % 4 + 1;
          const fogRow = hooks.get(`fallback-hook/fog-note/variant-${fnIdx}`);
          const fogNote = v === "you" ? fogRow?.body_you : fogRow?.body_they ?? (fogRow?.body_you ? friendVoiceFromReaderCopy(fogRow.body_you, voice) : null);
          if (fogNote) aBody = `${aBody}

${fogNote}`;
        }
        const authoredHeadline = v === "you" ? c.headline || "" : `${title2(transiting)} ${aspect} ${voice}'s ${title2(natal)}`;
        const passHook2 = pass ? hookVoice(`fallback-hook/transit-pass/${pass}`, v) : null;
        if (passHook2) aBody = `${aBody}

${passHook2}`;
        return { headline: authoredHeadline, body: aBody, parts: aBody.split("\n\n"), templateKey: "authored/transit-aspect", contentKey: c.contentKey, provenanceTier: transitReaderTier(c) ?? void 0 };
      }
    }
    const T = tpl("fallback-template/transit.aspect");
    const natalArea = vocab.get(`fallback-vocab/planet-topic/${natal}`)?.body ?? vocab.get(`fallback-vocab/angle-area/${natal}`)?.body;
    const typeLineRaw = (ANGLES.has(natal) ? hookVoice(`fallback-hook/transit-aspect-type/${aspect}/angle`, v) : null) ?? hookVoice(`fallback-hook/transit-aspect-type/${aspect}`, v);
    const effectFamily = g === "soft" || g === "conjunction" && !isHeavy ? "soft" : "hard";
    const effectRaw = hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v) ?? (variant ? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/variant-${variant}`, v) : null) ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}`, v);
    const natalCoreVal = hookVoice(`fallback-hook/natal-core/${natal}`, v) ?? vocab.get(`fallback-vocab/planet-core/${natal}`)?.body;
    const transitEffectArea = ANGLES.has(natal) ? natalCoreVal : natalArea;
    const transitEffect = effectRaw && transitEffectArea ? fill(effectRaw, { natalArea: transitEffectArea }) : null;
    const ctx = {
      timeOpen: win ?? WINDOW_ASPECT[transiting] ?? "Currently",
      transitTitle: title2(transiting),
      transitRef: transitRef(transiting, sign),
      natalTitle: title2(natal),
      aspectName: aspect,
      aspectAdj: vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body,
      transitTopic: vocab.get(`fallback-vocab/planet-topic/${transiting}`)?.body,
      aspectVerb: (() => {
        const f = vocab.get(`fallback-vocab/aspect-verb/${aspect}`)?.body;
        const tt = vocab.get(`fallback-vocab/planet-topic/${transiting}`)?.body;
        return f && tt && natalCoreVal ? fill(f, { transitTopic: tt, natalCore: natalCoreVal }) : null;
      })(),
      // voice-aware natal target ("your mind", "how you meet the world"); friend view uses body_they
      natalCore: natalCoreVal,
      otherPoss,
      timeInline: inlineWindow(win ?? WINDOW_ASPECT[transiting] ?? "currently"),
      transitEffectLine: transitEffect ? `${transitEffect.charAt(0).toUpperCase()}${transitEffect.slice(1).replace(/\.$/, "")}.` : null,
      transitTypeLine: typeLineRaw ? fill(typeLineRaw, { natalArea, transitEffect }) : typeLineRaw
    };
    for (const slot of T.requiredSlots ?? []) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: transit-aspect ${transiting}/${natal}/${g} (no card, fallback slot ${slot} missing)`);
    const AVERB = { conjunction: "sitting right on", square: "squaring", opposition: "opposing", trine: "trining", sextile: "sextiling" };
    const cWants = (sign ? hookVoice(`fallback-hook/transit-house-event-wants/${transiting}/${sign}`, v) : null) ?? hookVoice(`fallback-hook/transit-house-event-wants/${transiting}`, v);
    const cHolds = hookVoice(`fallback-hook/transit-house-event-natal/${natal}`, v);
    const cScenes = hookVoice(`fallback-hook/transit-house-event-scenes/${transiting}/${natal}/${effectFamily}`, v) ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v);
    const cScenesFinal = cScenes ?? ctx.transitTypeLine ?? null;
    let body;
    if (AVERB[aspect] && cWants && cHolds && cScenesFinal) {
      const opener = v === "you" ? `${ctx.timeOpen}, ${ctx.transitRef} is ${AVERB[aspect]} your natal ${ctx.natalTitle}.` : `${ctx.timeOpen}, ${ctx.transitRef} is ${AVERB[aspect]} ${otherPoss} natal ${ctx.natalTitle}.`;
      body = `${opener} ${cWants}; ${cHolds}. ${cScenesFinal}`;
    } else if (AVERB[aspect] && ctx.transitEffectLine) {
      const target = v === "you" ? `your natal ${ctx.natalTitle}` : `${otherPoss} natal ${ctx.natalTitle}`;
      const timing = ctx.timeInline ? ` ${ctx.timeInline}` : "";
      const mechanics = `${String(ctx.transitRef).replace(/^./, (char) => char.toUpperCase())} is ${AVERB[aspect]} ${target}${timing}.`;
      body = `${ctx.transitEffectLine} ${mechanics}`;
    } else {
      body = fill(v === "you" ? T.body_you ?? T.body : T.body_they ?? T.body, ctx);
    }
    body = body.charAt(0).toUpperCase() + body.slice(1);
    if (isRetrograde && v === "you") {
      const retroLine = hooks.get("fallback-hook/transit-retro-aspect")?.body_you;
      if (retroLine) body = `${body} ${fill(retroLine, ctx)}`;
    }
    const passHook = pass ? hookVoice(`fallback-hook/transit-pass/${pass}`, v) : null;
    if (passHook) body = `${body}

${passHook}`;
    return { headline: fill((v === "you" ? T.headline : T.headline_they ?? T.headline) ?? "", ctx), body, parts: [body], templateKey: T.contentKey };
  }
  function renderTransitRetro({ planet, sign, window: win, format }) {
    if (format === "article") {
      const ca = card(`authored/transit-retro-article/${planet}`);
      if (ca) return result(ca, "authored/transit-retro-article");
      const T2 = tpl("fallback-template/transit.retrograde-article");
      const row = hooks.get(`fallback-hook/transit-retro-article/${planet}`);
      const articleBody = row?.body_you ? fill(row.body_you, { timeOpen: win ?? WINDOW_RETRO[planet], transitRef: transitRef(planet, sign) }) : null;
      if (articleBody == null) throw new SourceGapError(`SOURCE_GAP: retrograde article ${planet}`);
      return { headline: row?.headline ?? "", body: articleBody, parts: [articleBody], templateKey: T2.contentKey };
    }
    const c = card(`authored/transit-retro/${planet}`);
    if (c) return result(c, "authored/transit-retro");
    const T = tpl("fallback-template/transit.retrograde");
    const ctx = {
      timeOpen: win ?? WINDOW_RETRO[planet],
      transitTitle: title2(planet),
      transitRef: transitRef(planet, sign),
      retroMeaning: hooks.get(`fallback-hook/transit-retro/${planet}`)?.body_you
    };
    for (const slot of T.requiredSlots ?? []) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: retrograde ${planet} (slot ${slot} missing; Sun/Moon/nodes have no retrograde copy by design)`);
    const body = fill(T.body, ctx);
    return { headline: fill(T.headline ?? "", ctx), body, parts: [body], templateKey: T.contentKey };
  }
  function renderTransitLabel({ transiting, natal, aspect, window: win }) {
    const g = GROUP[aspect] ?? aspect;
    const verb = g === "conjunction" ? "transforming" : g === "hard" ? "challenging" : "boosting";
    const noun = vocab.get(`fallback-vocab/transit-label-noun/${natal}`)?.body;
    if (!noun) throw new SourceGapError(`SOURCE_GAP: no label noun for ${natal}`);
    return {
      label: `${title2(transiting)} ${verb} ${noun}`,
      noun,
      window: win ?? WINDOW_ASPECT[transiting] ?? "Currently"
    };
  }
  function renderTransitReturn({ planet }) {
    const c = card(`authored/transit-return/${planet}`);
    if (!c) throw new SourceGapError(`SOURCE_GAP: no return card for ${planet}`);
    return result(c, "authored/transit-return");
  }
  function renderCompat({ planet, signA, signB, otherName }) {
    const sub = (s) => s.replace(/\{\{other_name\}\}/g, otherName);
    const deep = card(`authored/compat-deep/${planet}/${signA}/${signB}`);
    if (deep) return { ...result(deep, "authored/compat-deep"), body: sub(deep.body), parts: [sub(deep.body)] };
    const pair = card(`authored/compat-pair/${planet}/${signA}/${signB}`);
    if (pair) return { ...result(pair, "authored/compat-pair"), body: sub(pair.body), parts: [sub(pair.body)] };
    const domain = hooks.get(`fallback-hook/compat-domain/${planet}`)?.body_you;
    const readerBlock = hookVoice(`fallback-hook/placement-sentence/${planet}/${signA}`, "you");
    const friendBlock = hookVoice(`fallback-hook/placement-sentence/${planet}/${signB}`, "they");
    const elementPattern = hooks.get(`fallback-hook/element-pattern/${ELEMENT[signA]}/${ELEMENT[signB]}`)?.body_you;
    const T = tpl(signA === signB ? "fallback-template/compat.same-sign" : "fallback-template/compat.cross-sign");
    const ctx = {
      compatDomain: domain,
      planetTitle: title2(planet),
      signATitle: title2(signA),
      signBTitle: title2(signB),
      otherName,
      readerBlock,
      friendBlock,
      elementPattern
    };
    for (const slot of T.requiredSlots ?? []) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: compat ${planet}/${signA}/${signB} (fallback slot ${slot} missing)`);
    const body = sub(fill(T.body, ctx));
    return { headline: sub(fill(T.headline ?? "", ctx)), body, parts: [body], templateKey: T.contentKey };
  }
  function renderSynastryAspect({
    planetA,
    planetB,
    aspect,
    otherName,
    otherPronouns,
    romanticAllowed,
    relationshipType
  }) {
    const T = tpl("fallback-template/synastry.aspect-v3");
    const aspectFamily = aspect === "square" || aspect === "opposition" ? "hard" : aspect === "trine" || aspect === "sextile" ? "soft" : null;
    const exactFwd = hooks.get(`fallback-hook/synastry-pair/${planetA}/${planetB}/${aspect}`);
    const exactRev = exactFwd ? null : hooks.get(`fallback-hook/synastry-pair/${planetB}/${planetA}/${aspect}`);
    const groupedFwd = exactFwd || exactRev || !aspectFamily ? null : hooks.get(`fallback-hook/synastry-pair/${planetA}/${planetB}/${aspectFamily}`);
    const groupedRev = exactFwd || exactRev || groupedFwd || !aspectFamily ? null : hooks.get(`fallback-hook/synastry-pair/${planetB}/${planetA}/${aspectFamily}`);
    const fwd = exactFwd ?? groupedFwd;
    const rev = exactRev ?? groupedRev;
    const pairRow = fwd ?? rev;
    const selectionTier = pairRow ? synastryReaderTier(pairRow) : null;
    const otherSubject = otherPronouns?.subject?.trim() || "they";
    const otherObject = otherPronouns?.object?.trim() || "them";
    const otherPossessive = otherPronouns?.possessive?.trim() || "their";
    const holders = fwd ? { holder1: "you", holder2: otherName, holder1Poss: "your", holder2Poss: `${otherName}'s`, holder1PossCap: "Your", holder2PossCap: `${otherName}'s`, holder2Subject: otherSubject, holder2Object: otherObject, holder2PronounPoss: otherPossessive } : { holder1: otherName, holder2: "you", holder1Poss: `${otherName}'s`, holder2Poss: "your", holder1PossCap: `${otherName}'s`, holder2PossCap: "Your", holder1Subject: otherSubject, holder1Object: otherObject, holder1PronounPoss: otherPossessive };
    const pairVoice = fwd ? pairRow?.body_you : pairRow?.body_they;
    const typeRow = hooks.get(`fallback-hook/synastry-aspect-type/${aspect}`);
    const pairSentences = pairVoice ? renderSynastryPairVoice(pairVoice, holders) : null;
    if (pairSentences) {
      const headlinePair = (T.headline ?? "").replace(/\{\{([\w.]+)\}\}/g, (_, k) => ({
        possessive: "Your",
        planetATitle: title2(planetA),
        planetBTitle: title2(planetB),
        aspectAdj: { conjunction: "conjunct", opposition: "opposite" }[aspect] ?? aspect,
        otherName
      })[k] ?? "");
      const body = pairSentences;
      if (romanticAllowed === false && /\b(?:romance|romantic|dating|sexual|sexy|chemistry|attraction|attracted)\b/iu.test(body)) {
        throw new SourceGapError(`SOURCE_GAP: synastry relationship context ${relationshipType ?? "unspecified"} does not permit romantic copy`);
      }
      if (!selectionTier) {
        throw new SourceGapError(`SOURCE_GAP: ineligible synastry row ${pairRow?.contentKey ?? "missing"}`);
      }
      return { headline: headlinePair, tag: typeRow?.tag ?? null, body, parts: [body], templateKey: T.contentKey, contentKey: pairRow?.contentKey, synastryTier: selectionTier };
    }
    throw new SourceGapError(`SOURCE_GAP: synastry aspect ${planetA}-${aspect}-${planetB}`);
  }
  const SPEED = ["moon", "mercury", "venus", "sun", "mars", "jupiter", "saturn", "chiron", "uranus", "neptune", "pluto", "north-node", "south-node"];
  function pairEffectOf(ev, areaOverride) {
    if (!ev.a || !ev.b || !ev.aspect) return null;
    const slower = SPEED.indexOf(ev.a) >= SPEED.indexOf(ev.b) ? ev.a : ev.b;
    const faster = slower === ev.a ? ev.b : ev.a;
    const g = GROUP[ev.aspect] ?? ev.aspect;
    const heavy = ["saturn", "uranus", "neptune", "pluto", "chiron"].includes(slower) || ["saturn", "uranus", "neptune", "pluto", "chiron"].includes(faster);
    const family = g === "soft" || g === "conjunction" && !heavy ? "soft" : "hard";
    const raw = hooks.get(`fallback-hook/transit-effect-${family}/${slower}`)?.body_you;
    const area = areaOverride ?? vocab.get(`fallback-vocab/planet-topic/${faster}`)?.body;
    if (!raw || !area) return null;
    const eff = fill(raw, { natalArea: area });
    return eff.charAt(0).toLowerCase() + eff.slice(1) + ".";
  }
  function reviewedSkyAspectRow({ a, b, aspect, aSign, bSign }) {
    const group = GROUP[aspect] ?? aspect;
    const candidates = [];
    if (aSign && bSign) {
      candidates.push(
        `fallback-hook/sky-aspect-sign/${a}/${aSign}/${aspect}/${b}/${bSign}`,
        `fallback-hook/sky-aspect-sign/${b}/${bSign}/${aspect}/${a}/${aSign}`
      );
    }
    candidates.push(
      `fallback-hook/sky-aspect-exact/${a}/${aspect}/${b}`,
      `fallback-hook/sky-aspect-exact/${b}/${aspect}/${a}`,
      `fallback-hook/sky-aspect-pair/${a}/${b}/${group}`,
      `fallback-hook/sky-aspect-pair/${b}/${a}/${group}`
    );
    for (const key of candidates) {
      const row = hooks.get(key);
      if (row?.body_you) return row;
    }
    return null;
  }
  function eventCtx(ev) {
    return {
      dateLine: ev.dateLine,
      aRef: ev.a ? transitRef(ev.a, ev.aSign) : null,
      bRef: ev.b ? transitRef(ev.b, ev.bSign) : null,
      aTopic: ev.a ? vocab.get(`fallback-vocab/planet-topic/${ev.a}`)?.body : null,
      bTopic: ev.b ? vocab.get(`fallback-vocab/planet-topic/${ev.b}`)?.body : null,
      aspectAdj: ev.aspect ? vocab.get(`fallback-vocab/aspect-adj/${ev.aspect}`)?.body : null,
      signTitle: ev.sign ? title2(ev.sign) : null,
      signNeed: ev.sign ? vocab.get(`fallback-vocab/sign-need/${ev.sign}`)?.body : null,
      signTrap: ev.sign ? hooks.get(`fallback-hook/sky-sign-trap/${ev.sign}`)?.body_you : null,
      houseAOrdinal: ev.houseA ? ordinal2(ev.houseA) : null,
      houseBOrdinal: ev.houseB ? ordinal2(ev.houseB) : null,
      houseATopic: ev.houseA ? vocab.get(`fallback-vocab/house-topic/${ev.houseA}`)?.body : null,
      houseJurisdiction: ev.houseA ? vocab.get(`fallback-vocab/house-jurisdiction/${ev.houseA}`)?.body : null,
      houseBTopic: ev.houseB ? vocab.get(`fallback-vocab/house-topic/${ev.houseB}`)?.body : null,
      pe: null,
      ...(() => {
        const pe = pairEffectOf(ev, ev.houseA ? vocab.get(`fallback-vocab/house-topic/${ev.houseA}`)?.body : null);
        return { pairEffect: pe, pairEffectCap: pe ? pe.charAt(0).toUpperCase() + pe.slice(1) : null };
      })()
    };
  }
  function renderSkySeason({ sign, events = [] }) {
    const opener = hooks.get(`fallback-hook/sky-season-opener/${sign}`)?.body_you;
    const shadow = hooks.get(`fallback-hook/sky-season-shadow/${sign}`)?.body_you;
    const close = hooks.get(`fallback-hook/sky-season-close/${sign}`)?.body_you;
    if (!opener || !shadow || !close) throw new SourceGapError(`SOURCE_GAP: season sections for ${sign}`);
    const lore = hooks.get(`fallback-hook/sky-season-lore/${sign}`)?.body_you;
    const ritual = hooks.get(`fallback-hook/sky-season-ritual/${sign}`)?.body_you;
    const paras = [opener, lore, ritual].filter(Boolean);
    for (const ev of events) {
      const type = ev.type === "aspect" ? `aspect-${GROUP[ev.aspect ?? ""] ?? ev.aspect}` : ev.type;
      const frame = hooks.get(`fallback-hook/sky-event/${type}`)?.body_you;
      if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-event frame ${type}`);
      const body = fill(frame, eventCtx(ev));
      if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky-event ${type} missing facts (${body})`);
      paras.push(body);
    }
    paras.push(shadow, close);
    return { headline: `${title2(sign)} Season`, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.season-article" };
  }
  function renderSkyLunation({ kind, sign, dateLine, mechanics, events = [], northSign, southSign, variant }) {
    const OPP = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
    const isEclipse = kind === "eclipse-solar" || kind === "eclipse-lunar";
    const which = kind === "new-moon" || kind === "eclipse-solar" ? "new" : "full";
    const opener = hooks.get(`fallback-hook/sky-lunation-opener/${which}`)?.body_you;
    const close = isEclipse ? hooks.get("fallback-hook/sky-eclipse-close")?.body_you : hooks.get(`fallback-hook/sky-lunation-close/${which}`)?.body_you;
    const lore = hooks.get(`fallback-hook/sky-season-lore/${sign}`)?.body_you;
    const trap = hooks.get(`fallback-hook/sky-sign-trap/${sign}`)?.body_you;
    const opp = OPP[sign];
    const axisRow = hooks.get(`fallback-hook/sky-axis/${sign}-${opp}`) ?? hooks.get(`fallback-hook/sky-axis/${opp}-${sign}`);
    if (!opener || !close || !lore || !trap) throw new SourceGapError(`SOURCE_GAP: lunation sections for ${sign}`);
    const macroKind = which === "new" ? "new-moon" : "full-moon";
    const macro = card(`authored/sky-lunation-macro/${macroKind}/${sign}`);
    const paras = [];
    if (macro?.body) paras.push(macro.body);
    paras.push(fill(opener, { dateLine, signTitle: title2(sign) }) + (mechanics ? ` ${mechanics}` : ""));
    if (isEclipse) {
      const ecOpen = hooks.get(`fallback-hook/sky-eclipse-opener/${which === "new" ? "solar" : "lunar"}`)?.body_you;
      if (ecOpen) paras.push(ecOpen);
    }
    if (which === "full" && axisRow) paras.push(`A Full Moon happens when the Moon sits directly opposite the Sun. Right now that means the Moon in ${title2(sign)} facing the Sun in ${title2(opp)}. This is ${axisRow.axis_name}: ${axisRow.body_you} An opposition asks you to balance its two ends, and when the balance cannot be found, it marks an ending.`);
    paras.push(lore);
    paras.push(`The ${title2(sign)} trap runs strong under this Moon: ${trap}`);
    const moonKind = which === "full" ? "fullmoon" : "newmoon";
    const authored = (variant ? card(`authored/sky-${moonKind}/${sign}-${variant}`) : null) ?? (isEclipse ? card(`authored/sky-eclipse/${which === "new" ? "solar" : "lunar"}-${sign}`) : null) ?? card(`authored/sky-${moonKind}/${sign}`);
    const signMoon = hooks.get(`fallback-hook/sky-${moonKind}-sign/${sign}`);
    const tail = [];
    const signBody = signMoon?.supersedes_authored_body ? signMoon.body_you : authored?.body ?? signMoon?.body_you;
    if (signBody) paras.push(signBody);
    if (authored) {
      if (!isEclipse) {
        if (authored.axis) tail.push(authored.axis);
        if (authored.intention) tail.push(`Set your intention: ${authored.intention}`);
        if (authored.ritual) tail.push(`Ritual: ${authored.ritual}`);
        if (authored.completion) tail.push(`To close the cycle, ask: ${authored.completion}`);
      }
    }
    if (isEclipse && northSign && southSign) {
      const nodeRow = hooks.get("fallback-hook/sky-eclipse-node")?.body_you;
      if (nodeRow) paras.push(fill(nodeRow, { northTitle: title2(northSign), southTitle: title2(southSign) }));
    }
    for (const ev of events) {
      const isAspect = ev.type === "aspect" || ev.type === "moon-aspect" || ev.type === "sun-aspect";
      const type = isAspect ? `${ev.a === "sun" || ev.type === "sun-aspect" ? "sun-aspect" : "moon-aspect"}-${GROUP[ev.aspect ?? ""] ?? ev.aspect}` : ev.type;
      const frame = hooks.get(`fallback-hook/sky-event/${type}`)?.body_you;
      if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-event frame ${type}`);
      paras.push(fill(frame, eventCtx(isAspect ? { ...ev, a: ev.a ?? "moon" } : ev)));
    }
    paras.push(...tail);
    if (isEclipse) paras.push(close);
    const label = isEclipse ? which === "new" ? "Solar Eclipse" : "Lunar Eclipse" : which === "new" ? "New Moon" : "Full Moon";
    return { headline: `${label} in ${title2(sign)}`, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.lunation-article" };
  }
  function renderSkyHoroscope({ risingSign, events = [] }) {
    const MAP = { "full-moon": "lunation-full", "new-moon": "lunation-new", "eclipse-lunar": "eclipse", "eclipse-solar": "eclipse" };
    const paras = [];
    for (const ev of events) {
      const type = ev.type === "aspect" ? `aspect-${GROUP[ev.aspect ?? ""] ?? ev.aspect}` : MAP[ev.type] ?? ev.type;
      const frame = hooks.get(`fallback-hook/sky-horoscope/${type}`)?.body_you;
      if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-horoscope frame ${type}`);
      const body = fill(frame, eventCtx(ev));
      if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky-horoscope ${type} missing facts (${body})`);
      paras.push(body);
    }
    return { headline: `${title2(risingSign)} & ${title2(risingSign)} Rising`, body: paras.join(" "), parts: paras, templateKey: "fallback-template/sky.season-horoscope" };
  }
  const SKY_PLACEMENT_ASPECT_FRAME = {
    conjunction: (aRef, bRef, timing) => `${aRef} meets ${bRef}${timing.exact ? `, exact on ${timing.label}` : ` ${timing.label}`}.`,
    square: (aRef, bRef, timing) => `${aRef} and ${bRef} push against each other${timing.exact ? `, sharpest on ${timing.label}` : ` ${timing.label}`}.`,
    opposition: (aRef, bRef, timing) => `${aRef} and ${bRef} pull from opposite ends${timing.exact ? `, strongest on ${timing.label}` : ` ${timing.label}`}.`,
    trine: (aRef, bRef, timing) => `${aRef} and ${bRef} work together with less friction${timing.exact ? `, closest on ${timing.label}` : ` ${timing.label}`}.`,
    sextile: (aRef, bRef, timing) => `${aRef} and ${bRef} open a workable route between them${timing.exact ? `, closest on ${timing.label}` : ` ${timing.label}`}.`
  };
  function capitalizeSentence(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  }
  function skyPlacementAspectParagraph(placementPlanet, ev) {
    if (!ev.a || !ev.b || !ev.aspect) throw new SourceGapError("SOURCE_GAP: sky placement aspect facts");
    const otherPlanet = ev.a === placementPlanet ? ev.b : ev.a;
    const isFullMoon = ev.aspect === "opposition" && (/* @__PURE__ */ new Set([ev.a, ev.b])).size === 2 && [ev.a, ev.b].includes("sun") && [ev.a, ev.b].includes("moon");
    const moonSign = ev.a === "moon" ? ev.aSign : ev.b === "moon" ? ev.bSign : null;
    const sunSign = ev.a === "sun" ? ev.aSign : ev.b === "sun" ? ev.bSign : null;
    const fullMoonSpecific = isFullMoon && moonSign ? hooks.get(`fallback-hook/sky-placement-aspect/sun/moon/opposition/${moonSign}`)?.body_you : null;
    if (fullMoonSpecific) {
      if (!sunSign || !ev.exactDate) throw new SourceGapError("SOURCE_GAP: sky placement Full Moon facts");
      const fullMoonBody = fillKeep(fullMoonSpecific, {
        moonSignTitle: title2(moonSign),
        sunSignTitle: title2(sunSign),
        exactDate: ev.exactDate
      });
      if (/\{\{/.test(fullMoonBody)) throw new SourceGapError("SOURCE_GAP: sky placement Full Moon slots");
      return fullMoonBody;
    }
    const specific = hooks.get(`fallback-hook/sky-placement-aspect/${placementPlanet}/${otherPlanet}/${ev.aspect}`)?.body_you ?? hooks.get(`fallback-hook/sky-placement-aspect/${otherPlanet}/${placementPlanet}/${ev.aspect}`)?.body_you;
    const reviewed = reviewedSkyAspectRow({
      a: ev.a,
      b: ev.b,
      aspect: ev.aspect,
      aSign: ev.aSign,
      bSign: ev.bSign
    })?.body_you;
    const effect = reviewed ?? specific ?? null;
    if (!effect) return null;
    const aRef = capitalizeSentence(transitRef(ev.a, ev.aSign));
    const bRef = transitRef(ev.b, ev.bSign);
    const frame = SKY_PLACEMENT_ASPECT_FRAME[ev.aspect];
    const timing = ev.exactDate ? { exact: true, label: ev.exactDate } : ev.dateLine ? { exact: false, label: ev.dateLine.charAt(0).toLowerCase() + ev.dateLine.slice(1) } : null;
    if (!frame || !timing) throw new SourceGapError(`SOURCE_GAP: sky placement aspect frame ${ev.aspect}`);
    const fact = frame(aRef, bRef, timing);
    return `${fact} ${capitalizeSentence(effect)}`.trim();
  }
  const SKY_PLACEMENT_MAJOR_ASPECTS = /* @__PURE__ */ new Set(["conjunction", "square", "opposition", "trine", "sextile"]);
  const SKY_PLACEMENT_CONTINUOUS_PLANETS = /* @__PURE__ */ new Set([
    "sun",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "north-node",
    "south-node"
  ]);
  function skyPlacementRenderEligible(planet, sign) {
    const slots = ["tagline", "hook", "lived", "turn"].map(
      (slot) => hooks.get(`fallback-hook/sky-placement-${slot}/${planet}/${sign}`)
    );
    if (slots.some((row) => !row || typeof row.body_you !== "string" || !row.body_you.trim())) return false;
    return slots.every((row) => row.render_eligible === true && row.owner_prose_approved === true && row.deterministic_validation === "pass" && typeof row.source_hash === "string" && String(row.source_hash).length > 0);
  }
  const SKY_PLACEMENT_ERA_PLANETS = /* @__PURE__ */ new Set([
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "lilith",
    "north-node",
    "south-node",
    "nodes"
  ]);
  const RETIRED_SUN_IDENTITY_HOOKS = [
    "Somewhere along the way, you switched to autopilot.",
    "You keep rescheduling a decision.",
    "A version of yourself needs updating."
  ];
  const SKY_PLACEMENT_MONTHS = {
    jan: "January",
    january: "January",
    feb: "February",
    february: "February",
    mar: "March",
    march: "March",
    apr: "April",
    april: "April",
    may: "May",
    jun: "June",
    june: "June",
    jul: "July",
    july: "July",
    aug: "August",
    august: "August",
    sep: "September",
    sept: "September",
    september: "September",
    oct: "October",
    october: "October",
    nov: "November",
    november: "November",
    dec: "December",
    december: "December"
  };
  function continuousSkyPlacementDate(value, label) {
    const match = value.trim().match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/u);
    const month = match ? SKY_PLACEMENT_MONTHS[match[1].toLowerCase()] : null;
    if (!match || !month) {
      throw new SourceGapError(`SOURCE_GAP: continuous sky placement ${label} date ${value}`);
    }
    return {
      body: `${month} ${Number(match[2])}`,
      year: match[3] ?? null,
      full: match[3] ? `${month} ${Number(match[2])}, ${match[3]}` : `${month} ${Number(match[2])}`
    };
  }
  function continuousSkyPlacementDateContext(entryDate, exitDate) {
    const entry = continuousSkyPlacementDate(entryDate, "entry");
    const exit = continuousSkyPlacementDate(exitDate, "exit");
    const factLine = entry.year && exit.year ? entry.year === exit.year ? `${entry.body} to ${exit.body}, ${exit.year}` : `${entry.body}, ${entry.year} to ${exit.body}, ${exit.year}` : `${entry.body} to ${exit.body}`;
    return { entry, exit, factLine };
  }
  function renderContinuousSkyPlacement(signCopy, {
    planet,
    sign,
    events,
    entryDate,
    exitDate,
    priorSign,
    priorSignEntryDate,
    priorSignExitDate,
    previousResidencyEntryDate,
    previousResidencyExitDate
  }) {
    if (!entryDate || !exitDate) {
      throw new SourceGapError(`SOURCE_GAP: continuous sky placement dates ${planet}/${sign}`);
    }
    const requiredFields = ["fact_line", "opening", "tension", "development", "close"];
    if (requiredFields.some((field) => typeof signCopy[field] !== "string" || !signCopy[field]?.trim())) {
      throw new SourceGapError(`SOURCE_GAP: continuous sky placement structure ${planet}/${sign}`);
    }
    const dates = continuousSkyPlacementDateContext(entryDate, exitDate);
    const ctx = {
      entryDate: dates.entry.body,
      exitDate: dates.exit.body,
      signTitle: title2(sign),
      priorSign: priorSign ? title2(priorSign) : null,
      priorSignEntryDate: priorSignEntryDate ? continuousSkyPlacementDate(priorSignEntryDate, "prior-sign entry").body : null,
      priorSignExitDate: priorSignExitDate ? continuousSkyPlacementDate(priorSignExitDate, "prior-sign exit").body : null,
      previousResidencyEntryDate: previousResidencyEntryDate ? continuousSkyPlacementDate(previousResidencyEntryDate, "previous-residency entry").body : null,
      previousResidencyExitDate: previousResidencyExitDate ? continuousSkyPlacementDate(previousResidencyExitDate, "previous-residency exit").body : null,
      priorSignEntryDateWithYear: priorSignEntryDate ? continuousSkyPlacementDate(priorSignEntryDate, "prior-sign entry").full : null,
      priorSignExitDateWithYear: priorSignExitDate ? continuousSkyPlacementDate(priorSignExitDate, "prior-sign exit").full : null,
      previousResidencyEntryDateWithYear: previousResidencyEntryDate ? continuousSkyPlacementDate(previousResidencyEntryDate, "previous-residency entry").full : null,
      previousResidencyExitDateWithYear: previousResidencyExitDate ? continuousSkyPlacementDate(previousResidencyExitDate, "previous-residency exit").full : null
    };
    const factLine = dates.factLine;
    const educationRow = hooks.get(`fallback-hook/sky-planet-education/${planet}`);
    const educationBody = educationRow?.render_policy === "sky-placement-planet-education-v1" ? educationRow.body : null;
    const planetEducation = typeof educationBody === "string" && educationBody.trim() ? educationBody : null;
    const hasPreviousResidencyFacts = Boolean(previousResidencyEntryDate && previousResidencyExitDate);
    const previousResidencyToken = /\{\{previousResidency(?:Entry|Exit)Date(?:WithYear)?\}\}/u;
    const renderCollectivePart = (part) => !hasPreviousResidencyFacts && previousResidencyToken.test(part) ? null : fillKeep(part, ctx);
    const eraSource = signCopy.era_layer;
    let eraLayer = [];
    if (eraSource) {
      if (!SKY_PLACEMENT_ERA_PLANETS.has(planet)) {
        throw new SourceGapError(`SOURCE_GAP: slow-mover era layer ${planet}/${sign}`);
      }
      const eraFields = ["frame", "handoff", "recurrence", "collective_lesson"];
      const hasCompleteEraCopy = eraFields.every((field) => typeof eraSource[field] === "string" && Boolean(eraSource[field].trim()));
      const hasCompleteEraFacts = Boolean(
        priorSign && priorSignEntryDate && priorSignExitDate && previousResidencyEntryDate && previousResidencyExitDate
      );
      if (!hasCompleteEraCopy || !hasCompleteEraFacts) {
        throw new SourceGapError(`SOURCE_GAP: slow-mover era layer ${planet}/${sign}`);
      }
      eraLayer = eraFields.map((field) => fillKeep(eraSource[field], ctx));
    }
    const close = fillKeep(signCopy.close, ctx);
    const masterHeadings = [
      signCopy.opening_heading,
      signCopy.tension_heading,
      signCopy.development_heading,
      signCopy.close_heading
    ];
    const rendersArticleMaster = typeof signCopy.primary_hook === "string" && Boolean(signCopy.primary_hook.trim()) && masterHeadings.every((heading) => typeof heading === "string" && Boolean(heading.trim()));
    const primaryHook = rendersArticleMaster ? fillKeep(signCopy.primary_hook, ctx) : null;
    const activeAspectMatch = (events ?? []).filter((event) => event.type === "aspect" && Boolean(event.exactDate) && Boolean(event.a) && Boolean(event.b) && [event.a, event.b].includes(planet) && typeof event.aspect === "string" && SKY_PLACEMENT_MAJOR_ASPECTS.has(event.aspect)).map((event) => {
      const planets = /* @__PURE__ */ new Set([event.a, event.b]);
      const unit = (signCopy.aspect_units ?? []).find((candidate) => candidate.aspect === event.aspect && candidate.planets.length === 2 && candidate.planets.every((planetName) => planets.has(planetName)));
      return unit ? { event, unit } : null;
    }).find((match) => Boolean(match));
    let aspectSection = null;
    let aspectParts = [];
    if (activeAspectMatch?.event.exactDate) {
      const exactDate = continuousSkyPlacementDate(activeAspectMatch.event.exactDate, "aspect").body;
      const aspectCtx = { ...ctx, exactDate };
      aspectParts = [activeAspectMatch.unit.opportunity, activeAspectMatch.unit.check].map((part) => fillKeep(part, aspectCtx));
      aspectSection = {
        kind: "dated-aspect",
        heading: fillKeep(activeAspectMatch.unit.heading, aspectCtx),
        body: aspectParts.join("\n\n")
      };
    }
    const opening = renderCollectivePart(signCopy.opening);
    const tension = renderCollectivePart(signCopy.tension);
    const development = renderCollectivePart(signCopy.development);
    const parts = [
      factLine,
      ...planetEducation ? [planetEducation] : [],
      ...[opening, tension, development].filter((part) => Boolean(part)),
      ...eraLayer,
      ...aspectParts,
      close
    ];
    const articleSections = rendersArticleMaster ? [
      ...planetEducation ? [{ kind: "planet-education", heading: "", body: planetEducation }] : [],
      ...opening ? [{ kind: "collective-read", heading: fillKeep(signCopy.opening_heading, ctx), body: [factLine, opening].join("\n\n") }] : [],
      ...tension ? [{ kind: "collective-read", heading: fillKeep(signCopy.tension_heading, ctx), body: tension }] : [],
      ...development ? [{ kind: "collective-read", heading: fillKeep(signCopy.development_heading, ctx), body: development }] : [],
      ...eraLayer.length ? [{ kind: "collective-era", heading: "", body: eraLayer.join("\n\n") }] : [],
      ...aspectSection ? [aspectSection] : [],
      { kind: "exit-tone-shift", heading: fillKeep(signCopy.close_heading, ctx), body: close }
    ] : [
      { kind: "collective-read", heading: "", body: [factLine, ...planetEducation ? [planetEducation] : [], ...[opening, tension, development].filter((part) => Boolean(part))].join("\n\n") },
      ...eraLayer.length ? [{ kind: "collective-era", heading: "", body: eraLayer.join("\n\n") }] : [],
      ...aspectSection ? [aspectSection] : [],
      { kind: "exit-tone-shift", heading: "", body: close }
    ];
    const renderedText = [
      `${title2(planet)} in ${title2(sign)}`,
      ...parts,
      ...articleSections.map((section) => section.heading)
    ].join("\n");
    if (/\{\{/u.test(renderedText)) {
      throw new SourceGapError(`SOURCE_GAP: continuous sky placement slots ${planet}/${sign}`);
    }
    if (/[\u2013\u2014]/u.test(renderedText)) {
      throw new SourceGapError(`SOURCE_GAP: continuous sky placement dash ${planet}/${sign}`);
    }
    if (RETIRED_SUN_IDENTITY_HOOKS.some((hook) => renderedText.includes(hook))) {
      throw new SourceGapError(`SOURCE_GAP: retired Sun identity hook ${planet}/${sign}`);
    }
    for (const transitDate of [dates.entry.body, dates.exit.body]) {
      const priorSignExit = priorSignExitDate ? continuousSkyPlacementDate(priorSignExitDate, "prior-sign exit").body : null;
      const priorResidencyDates = [previousResidencyEntryDate, previousResidencyExitDate].filter((value) => Boolean(value)).map((value) => continuousSkyPlacementDate(value, "previous-residency").body);
      const allowedUses = 2 + (transitDate === dates.entry.body && priorSignExit === transitDate ? 1 : 0) + priorResidencyDates.filter((value) => value === transitDate).length;
      if (renderedText.split(transitDate).length - 1 > allowedUses) {
        throw new SourceGapError(`SOURCE_GAP: repeated sky placement date ${planet}/${sign}`);
      }
    }
    return {
      headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
      tagline: primaryHook,
      closingCharge: null,
      keyDates: [],
      body: parts.join("\n\n"),
      parts,
      articleSections,
      templateKey: "sky-placement-continuous-v2",
      contentKey: signCopy.contentKey
    };
  }
  function skyEventSignForPlanet(event, planet) {
    if (event.a === planet) return event.aSign ?? null;
    if (event.b === planet) return event.bSign ?? null;
    return null;
  }
  function renderMoonSignEntry(entryRow, { planet, sign, events = [], entryDate, exitDate }) {
    if (!entryDate || !exitDate) {
      throw new SourceGapError(`SOURCE_GAP: Moon sign-entry dates ${planet}/${sign}`);
    }
    const livedRow = hooks.get(`fallback-hook/sky-placement-lived/${planet}/${sign}`);
    const closeRow = hooks.get(`fallback-hook/sky-placement-turn/${planet}/${sign}`);
    if (!entryRow.body_you || !livedRow?.body_you || !closeRow?.body_you) {
      throw new SourceGapError(`SOURCE_GAP: Moon sign-entry structure ${planet}/${sign}`);
    }
    const entryLabel = continuousSkyPlacementDate(entryDate, "Moon entry").body;
    const exitLabel = continuousSkyPlacementDate(exitDate, "Moon exit").body;
    const opening = fillKeep(entryRow.body_you, { entryDate: entryLabel });
    const livedParts = livedRow.body_you.split(/\n{2,}/u).map((part) => part.trim()).filter(Boolean);
    const close = fillKeep(closeRow.body_you, { exitDate: exitLabel });
    let aspectBody = null;
    for (const event of events) {
      if (event.type !== "aspect" || !event.exactDate || !event.a || !event.b || !event.aspect) continue;
      const planets = /* @__PURE__ */ new Set([event.a, event.b]);
      const unit = (entryRow.moon_entry_aspect_units ?? []).find((candidate) => candidate.aspect === event.aspect && candidate.planets.length === 2 && candidate.planets.every((planetName) => planets.has(planetName)) && Object.entries(candidate.signs).every(([planetName, expectedSign]) => skyEventSignForPlanet(event, planetName) === expectedSign));
      if (unit) {
        aspectBody = fillKeep(unit.body, {
          aspectDate: continuousSkyPlacementDate(event.exactDate, "Moon aspect").body
        });
        break;
      }
    }
    const parts = [opening, ...livedParts, aspectBody, close].filter((part) => Boolean(part));
    const articleSections = [
      { kind: "collective-read", heading: "", body: [opening, ...livedParts].join("\n\n") },
      ...aspectBody ? [{ kind: "dated-aspect", heading: "", body: aspectBody }] : [],
      { kind: "exit-tone-shift", heading: "", body: close }
    ];
    const renderedText = parts.join("\n");
    if (/\{\{/u.test(renderedText)) {
      throw new SourceGapError(`SOURCE_GAP: Moon sign-entry slots ${planet}/${sign}`);
    }
    return {
      headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
      tagline: null,
      closingCharge: null,
      keyDates: [],
      body: parts.join("\n\n"),
      parts,
      articleSections,
      templateKey: "sky-placement-moon-entry-v1",
      contentKey: entryRow.contentKey
    };
  }
  function renderSkyPlacementCopy({
    planet,
    sign,
    events = [],
    asOfDate,
    articleMode = "current",
    articleKey,
    entryDate,
    exitDate,
    priorSign,
    priorSignEntryDate,
    priorSignExitDate,
    previousResidencyEntryDate,
    previousResidencyExitDate,
    hasPriorIngress = false,
    historyEligible,
    historyEntryDate,
    historyExitDate,
    historyDegreeRange,
    risingHouseMap,
    isRetrograde = false,
    isShadowPhase = false,
    includePlanetLore,
    includeSignLore
  }) {
    const retrogradeGuidance = isRetrograde ? hooks.get(`fallback-hook/transit-retro/${planet}`)?.body_you : null;
    if (isRetrograde && !retrogradeGuidance) {
      throw new SourceGapError(`SOURCE_GAP: sky placement retrograde guidance ${planet}/${sign}`);
    }
    const authoredArticle = selectSkyArticle({
      planet,
      sign,
      events,
      asOfDate,
      articleMode,
      articleKey,
      isRetrograde,
      isShadowPhase
    });
    if (articleMode === "archive" && !authoredArticle) {
      throw new SourceGapError(`SOURCE_GAP: sky article archive ${articleKey ?? `${planet}/${sign}`}`);
    }
    if (authoredArticle) {
      assertSkyArticleCopy(authoredArticle);
      const finalArticle = renderFinalSkyArticle(authoredArticle, {
        planet,
        sign,
        events,
        asOfDate,
        articleMode,
        articleKey,
        entryDate,
        exitDate,
        hasPriorIngress,
        historyEligible,
        historyEntryDate,
        historyExitDate,
        historyDegreeRange,
        risingHouseMap,
        isRetrograde,
        isShadowPhase
      });
      if (finalArticle) {
        return {
          headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title2(sign)}`,
          tagline: null,
          closingCharge: null,
          keyDates: [],
          articleWindow: articleWindow(authoredArticle),
          articleMode,
          ...finalArticle,
          templateKey: "sky-article-final-v1",
          contentKey: authoredArticle.contentKey
        };
      }
      const structuredParts = [
        authoredArticle.core_theme,
        authoredArticle.sign_jurisdiction,
        authoredArticle.lived_experience,
        authoredArticle.rulership_twist
      ];
      const isStructured = structuredParts.every((part) => typeof part === "string" && part.trim());
      if (isStructured) {
        const reviewNote = isRetrograde || isShadowPhase || hasPriorIngress ? authoredArticle.preview_note ?? retrogradeGuidance : null;
        const closingCharge = authoredArticle.closing_charge?.trim() || null;
        const parts2 = [
          reviewNote,
          ...structuredParts,
          skyPlacementHistoryAllowed(planet, isRetrograde, historyEligible) ? authoredArticle.history_echo : null,
          closingCharge
        ].filter((part) => Boolean(part));
        return {
          headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title2(sign)}`,
          tagline: null,
          closingCharge,
          keyDates: [],
          articleWindow: articleWindow(authoredArticle),
          articleMode,
          risingHoroscopes: (authoredArticle.rising_horoscopes ?? []).map((entry) => ({
            risingSign: entry.rising_sign,
            body: entry.body
          })),
          body: parts2.join("\n\n"),
          parts: parts2,
          templateKey: "sky-article-v1",
          contentKey: authoredArticle.contentKey
        };
      }
      const parts = [authoredArticle.body, retrogradeGuidance].filter((part) => Boolean(part));
      return {
        headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title2(sign)}`,
        tagline: null,
        keyDates: [],
        articleWindow: articleWindow(authoredArticle),
        articleMode,
        risingHoroscopes: (authoredArticle.rising_horoscopes ?? []).map((entry) => ({
          risingSign: entry.rising_sign,
          body: entry.body
        })),
        body: parts.join("\n\n"),
        parts,
        templateKey: "sky-article-v1",
        contentKey: authoredArticle.contentKey
      };
    }
    const moonEntryRow = hooks.get(`fallback-hook/sky-placement-hook/${planet}/${sign}`);
    if (moonEntryRow?.render_policy === "sky-placement-moon-entry-v1") {
      return renderMoonSignEntry(moonEntryRow, {
        planet,
        sign,
        events,
        entryDate,
        exitDate
      });
    }
    const signCopyKey = `fallback-hook/sky-sign-copy/${planet}/${sign}`;
    const signCopyRow = hooks.get(signCopyKey);
    const continuousSignCopy = signCopyRow?.render_policy === "sky-placement-continuous-v2" ? signCopyRow : null;
    if (continuousSignCopy) {
      return renderContinuousSkyPlacement(continuousSignCopy, {
        planet,
        sign,
        events,
        entryDate,
        exitDate,
        priorSign,
        priorSignEntryDate,
        priorSignExitDate,
        previousResidencyEntryDate,
        previousResidencyExitDate
      });
    }
    let standaloneSignCopy = null;
    const fourSlotEligible = skyPlacementRenderEligible(planet, sign);
    if (SKY_PLACEMENT_CONTINUOUS_PLANETS.has(planet) || planet === "lilith" && continuousSignCopy) {
      const standaloneHook = hooks.get(`fallback-hook/sky-placement-sign/${planet}/${sign}`);
      standaloneSignCopy = standaloneHook?.body_you?.trim() || null;
      if (!fourSlotEligible && !standaloneSignCopy) {
        throw new SourceGapError(`SOURCE_GAP: continuous sky placement sign copy ${planet}/${sign}`);
      }
    }
    const aspectParas = events.filter((event) => SKY_PLACEMENT_MAJOR_ASPECTS.has(event.aspect)).map((event) => skyPlacementAspectParagraph(planet, event)).filter((paragraph) => Boolean(paragraph));
    const pairKey = `fallback-hook/sky-placement-hook/${planet}/${sign}`;
    const pairHook = hooks.get(pairKey)?.body_you;
    const pairLived = hooks.get(`fallback-hook/sky-placement-lived/${planet}/${sign}`)?.body_you;
    const pairTurn = hooks.get(`fallback-hook/sky-placement-turn/${planet}/${sign}`)?.body_you;
    const signCopy = continuousSignCopy?.body_you;
    const signParts = signCopy ? [signCopy] : (fourSlotEligible || planet === "lilith") && pairHook && pairLived && pairTurn ? [pairHook, pairLived, pairTurn] : standaloneSignCopy ? [standaloneSignCopy] : [];
    const tagline = hooks.get(`fallback-hook/sky-placement-tagline/${planet}/${sign}`)?.body_you ?? null;
    {
      const placementTemplate = tpl("fallback-template/sky-placement-frame-v3");
      const compositionOptions = placementTemplate.compositionOptions;
      const shouldIncludePlanetLore = includePlanetLore ?? compositionOptions?.includePlanetLore !== false;
      const shouldIncludeSignLore = includeSignLore ?? compositionOptions?.includeSignLore !== false;
      const windowFrame = hooks.get(`fallback-hook/sky-placement/${planet}`)?.body_you;
      const directPlanetFrame = hooks.get(`fallback-hook/sky-placement-frame/${planet}`)?.body_you;
      const retrogradePlanetFrame = hooks.get(`fallback-hook/sky-placement-retro-frame/${planet}`)?.body_you;
      const planetFrame = isRetrograde || isShadowPhase ? retrogradePlanetFrame ?? directPlanetFrame : directPlanetFrame;
      const signLore = hooks.get(`fallback-hook/sky-placement-lore/${sign}`)?.body_you;
      const signStyle = vocab.get(`fallback-vocab/sky-sign-style/${sign}`)?.body;
      if (windowFrame && (!shouldIncludePlanetLore || planetFrame) && (!shouldIncludeSignLore || signLore) && signStyle && entryDate && exitDate && signParts.length > 0) {
        const ctx = {
          signTitle: title2(sign),
          signStyle,
          entryDate,
          exitDate
        };
        const parts = [
          windowFrame,
          ...shouldIncludePlanetLore ? [planetFrame] : [],
          ...shouldIncludeSignLore ? [signLore] : [],
          ...signParts,
          ...aspectParas
        ].filter((part) => Boolean(part)).map((part) => fillKeep(part, ctx));
        if (parts.some((part) => /\{\{/u.test(part))) {
          throw new SourceGapError(`SOURCE_GAP: sky placement V3 frame ${planet}/${sign}`);
        }
        return {
          headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
          tagline,
          body: parts.join("\n\n"),
          parts,
          templateKey: signCopy ? "sky-placement-article-v2" : "sky-placement-frame-v3",
          contentKey: standaloneSignCopy ? `fallback-hook/sky-placement-sign/${planet}/${sign}` : signCopy ? signCopyKey : `fallback-hook/sky-placement/${planet}`
        };
      }
    }
    throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign}`);
  }
  function renderSkyPlacement(facts) {
    const keyDates = skyPlacementKeyDates(facts);
    const rendered = {
      ...renderSkyPlacementCopy(facts),
      keyDates,
      keyDatesIntro: skyPlacementKeyDatesIntro(facts)
    };
    if (facts.surface === "calendar" && /\b(?:you|your|yours|yourself|you're|you've|you'll|you'd)\b/iu.test(
      [rendered.tagline, rendered.body].filter(Boolean).join(" ")
    )) {
      throw new SourceGapError(`SOURCE_GAP: calendar ingress ${facts.planet}/${facts.sign} violates the collective register`);
    }
    return rendered;
  }
  function formatCircleNames(names = [], includesReader = true) {
    const clean = names.map((n) => {
      const s = (n ?? "").toString().trim();
      return s.length >= 2 ? s : "a friend";
    });
    const list = includesReader ? ["You", ...clean] : clean;
    if (list.length < 2) throw new SourceGapError("SOURCE_GAP: circle story needs at least two people");
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    if (list.length === 3) return `${list[0]}, ${list[1]}, and ${list[2]}`;
    return `${list[0]}, ${list[1]}, and ${list.length - 2} more`;
  }
  function renderCircleStory(f) {
    const { trigger, names = [], includesReader = true, members = [] } = f;
    const namesLine = formatCircleNames(names, includesReader);
    const namesMid = includesReader ? "you" + namesLine.slice(3) : namesLine;
    const total = names.length + (includesReader ? 1 : 0);
    const row = (k) => hooks.get(`fallback-hook/${k}`);
    const ctx = { names: namesLine, namesMid, allWord: total >= 3 ? "all" : "both" };
    let r, subtitle = null, headline = null;
    if (trigger === "profection") {
      r = row(`circle-profection/${f.house}`);
      subtitle = `${ordinal2(f.house ?? 0)} house years`;
    } else if (trigger === "lunation") {
      r = row(`circle-lunation/${f.kind}`);
      const label = f.kind === "full" ? "Full Moon" : "New Moon";
      ctx.lunationRef = f.sign ? `The ${label} in ${title2(f.sign)}` : `The ${label}`;
      ctx.dateLine = f.dateLine;
      subtitle = f.sign ? `${label} in ${title2(f.sign)}` : label;
    } else if (trigger === "retro") {
      r = row("circle-cycle-retro");
      ctx.retroRef = `${title2(f.planet ?? "")} retrograde`;
      ctx.window = f.window ?? WINDOW_RETRO[f.planet ?? ""] ?? "For the next few weeks";
      subtitle = `${title2(f.planet ?? "")} retrograde`;
    } else if (trigger === "return") {
      r = row(`circle-cycle-return/${f.planet}`) ?? row("circle-cycle-return/generic");
      ctx.planetTitle = title2(f.planet ?? "");
      ctx.planetTopic = vocab.get(`fallback-vocab/planet-topic/${f.planet}`)?.body;
      subtitle = `${title2(f.planet ?? "")} returns`;
    } else if (trigger === "synastry") {
      r = row(`circle-synastry/${GROUP[f.aspect ?? ""] ?? f.aspect}`);
      ctx.nameA = f.nameA;
      ctx.nameB = f.nameB;
      const adj = vocab.get(`fallback-vocab/aspect-adj/${f.aspect}`)?.body;
      if (f.planetA && f.planetB && adj && f.nameA && f.nameB)
        headline = `${f.nameA}'s ${title2(f.planetA)} ${adj} ${f.nameB}'s ${title2(f.planetB)}`;
      subtitle = "Chart to chart";
    }
    if (!r) throw new SourceGapError(`SOURCE_GAP: no circle row for trigger ${trigger}`);
    const body = fill(r.body_you, ctx);
    const leftover = body.match(/\{\{([\w.]+)\}\}/);
    if (leftover) throw new SourceGapError(`SOURCE_GAP: circle story ${trigger} missing slot ${leftover[1]}`);
    const question = r.question ? fill(r.question, ctx) : null;
    if (question && /\{\{/.test(question)) throw new SourceGapError(`SOURCE_GAP: circle question ${trigger} has an unfilled slot`);
    headline = headline ?? r.headline ?? "";
    const sections = members.filter((m) => m && m.body).map((m) => {
      const nm = (m.name ?? "").toString().trim();
      return { name: m.isReader ? "You" : nm.length >= 2 ? nm : "a friend", body: m.body };
    });
    const parts = [body, ...sections.map((s) => s.body), ...question ? [question] : []];
    return { headline, subtitle: `${subtitle} - ${namesLine}`, names: namesLine, body, sections, question, parts, templateKey: "fallback-template/circle.story", contentKey: r.contentKey };
  }
  const pairDailyRow = (key) => hooks.get(key) ?? cards.get(key) ?? vocab.get(key) ?? null;
  const pairDailyVariantKeys = (baseKey) => [...hooks.keys()].flatMap((key) => {
    if (key === baseKey) return [{ key, variant: 1 }];
    const prefix = `${baseKey}/variant-`;
    if (!key.startsWith(prefix)) return [];
    const variant = Number(key.slice(prefix.length));
    return Number.isInteger(variant) && variant >= 2 ? [{ key, variant }] : [];
  }).sort((first, second) => first.variant - second.variant);
  const pairDailyVariantKey = (baseKey, variant) => {
    const keys = pairDailyVariantKeys(baseKey);
    if (!keys.length) throw new SourceGapError(`SOURCE_GAP: pair daily family ${baseKey}`);
    const seed = Number.isFinite(Number(variant)) ? Math.max(1, Math.abs(Math.trunc(Number(variant)))) : 1;
    return keys[(seed - 1) % keys.length].key;
  };
  const pairDailyClauseVariantKey = (baseKey, variant) => {
    if (!pairDailyRow(baseKey)) {
      throw new SourceGapError(`SOURCE_GAP: pair daily base clause ${baseKey}`);
    }
    if (baseKey.startsWith("fallback-hook/pair-daily/clause/house/")) {
      return baseKey;
    }
    return pairDailyVariantKey(baseKey, variant);
  };
  const pairDailyBody = (key, voice) => {
    const row = pairDailyRow(key);
    const body = voice === "they" ? row?.body_they : row?.body_you ?? row?.body;
    if (typeof body !== "string" || !body.trim()) {
      throw new SourceGapError(`SOURCE_GAP: pair daily row ${key} (${voice})`);
    }
    return body.trim();
  };
  const pairDailyFill = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}|\{([\w.]+)\}/g, (_match, doubleKey, singleKey) => {
    const key = doubleKey ?? singleKey;
    return ctx[key] ?? `{{${key}}}`;
  }).replace(/\s{2,}/g, " ").trim();
  const pairDailyHandle = (handle) => {
    const normalized = (handle ?? "").toString().trim().replace(/^@+/u, "");
    return normalized ? `@${normalized}` : null;
  };
  const pairDailyFriendReference = (friend) => {
    const normalizedHandle = pairDailyHandle(friend.handle);
    if (normalizedHandle) return normalizedHandle;
    const normalizedName = (friend.displayName ?? "").toString().trim();
    return normalizedName || "your friend";
  };
  const PAIR_DAILY_WINDOW_RANGE = /\b(?:until|through)\s+(?:today\b|tomorrow\b|(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\d|the end of\b|next\s+(?:day|week|month|year)\b)/iu;
  function renderPairDaily({ reader, friend, shared = { kind: null }, variant = 1 }) {
    if (!reader?.clauseKey || !friend?.clauseKey) {
      throw new SourceGapError("SOURCE_GAP: pair daily requires both daily clause keys");
    }
    const readerHandle = pairDailyHandle(reader.handle);
    const readerClauseKey = pairDailyClauseVariantKey(reader.clauseKey, variant);
    const friendClauseKey = pairDailyClauseVariantKey(friend.clauseKey, variant);
    const readerClause = pairDailyBody(readerClauseKey, "you");
    const friendClause = pairDailyBody(friendClauseKey, "they");
    const clausesMatch = readerClause === friendClause;
    const openerKey = clausesMatch ? readerHandle ? "fallback-hook/pair-daily/opener/shared-clause" : "fallback-hook/pair-daily/opener/shared-clause/no-reader-handle" : readerHandle ? pairDailyVariantKey("fallback-hook/pair-daily/opener", variant) : "fallback-hook/pair-daily/opener/variant-3";
    const opener = pairDailyBody(openerKey, "you");
    const ctx = {
      readerHandle: readerHandle ?? "",
      readerClause,
      friendHandle: pairDailyFriendReference(friend),
      friendClause,
      sharedClause: clausesMatch ? readerClause : void 0
    };
    const parts = [pairDailyFill(opener, ctx)];
    const sourceKeys = [openerKey, readerClauseKey, friendClauseKey];
    if (shared?.kind === "bond") {
      const transiting = (shared.transiting ?? "").toString().trim().toLowerCase();
      if (!shared.family || !transiting) {
        throw new SourceGapError("SOURCE_GAP: pair daily bond facts");
      }
      const bondClauseKey = `fallback-hook/pair-daily/bond-clause/${shared.family}/${transiting}`;
      const frameKey = pairDailyVariantKey(
        `fallback-hook/pair-daily/shared-bond/${shared.family}`,
        variant
      );
      parts.push(pairDailyFill(pairDailyBody(frameKey, "you"), {
        bondClause: pairDailyBody(bondClauseKey, "you")
      }));
      sourceKeys.push(frameKey, bondClauseKey);
      if (shared.family === "hard" && ["saturn", "mercury"].includes(transiting)) {
        const closeKey = "fallback-hook/pair-daily/close/hard";
        parts.push(pairDailyBody(closeKey, "you"));
        sourceKeys.push(closeKey);
      }
    } else if (shared?.kind === "moon") {
      if (!shared.element) throw new SourceGapError("SOURCE_GAP: pair daily Moon element");
      const frameKey = pairDailyVariantKey(
        `fallback-hook/pair-daily/shared-moon/${shared.element}`,
        variant
      );
      parts.push(pairDailyBody(frameKey, "you"));
      sourceKeys.push(frameKey);
    } else if (shared?.kind != null) {
      throw new SourceGapError(`SOURCE_GAP: pair daily shared kind ${shared.kind}`);
    }
    const body = parts.join(" ").replace(/\s{2,}/g, " ").trim();
    const leftover = body.match(/\{\{?([\w.]+)\}?\}/u);
    if (leftover) throw new SourceGapError(`SOURCE_GAP: pair daily missing slot ${leftover[1]}`);
    if (PAIR_DAILY_WINDOW_RANGE.test(body)) {
      throw new SourceGapError("SOURCE_GAP: pair daily must use today-only window wording");
    }
    return {
      headline: "",
      body,
      parts,
      templateKey: "fallback-template/pair.daily",
      contentKey: openerKey,
      sourceKeys
    };
  }
  function renderCalendarPhase({ phase, sign }) {
    const normalizedSign = sign.trim().toLowerCase();
    if (!normalizedSign) {
      throw new SourceGapError(`SOURCE_GAP: current Moon sign required for phase ${phase}`);
    }
    const phaseRow = hooks.get(`fallback-hook/moon-phase/${phase}`);
    if (!phaseRow) throw new SourceGapError(`SOURCE_GAP: no phase row for ${phase}`);
    const exactKey = `fallback-hook/moon-phase/${phase}/${normalizedSign}`;
    const exactRow = hooks.get(exactKey);
    const compactLunationRow = phase === "new-moon" || phase === "full-moon" ? hooks.get(`fallback-hook/lunation-sign-compact/${phase}/${normalizedSign}`) : void 0;
    const variantByPhase = {
      "new-moon": 1,
      "waxing-crescent": 2,
      "first-quarter": 3,
      "waxing-gibbous": 4,
      "full-moon": 1,
      "disseminating": 2,
      "last-quarter": 3,
      "balsamic": 4
    };
    const preferredVariant = variantByPhase[phase] ?? 1;
    const variantSuffix = preferredVariant > 1 ? `/variant-${preferredVariant}` : "";
    const signRow = card(`authored/calendar-weekly-moon/${normalizedSign}${variantSuffix}`) ?? card(`authored/calendar-weekly-moon/${normalizedSign}`);
    if (!exactRow && !compactLunationRow && !signRow) {
      throw new SourceGapError(`SOURCE_GAP: no approved Moon-sign row for ${phase} in ${normalizedSign}`);
    }
    const selectedRow = exactRow ?? compactLunationRow ?? signRow;
    const rawBody = exactRow?.body_you ?? compactLunationRow?.body_you ?? String(signRow?.body ?? "");
    const body = fill(rawBody, { signTitle: title2(normalizedSign) }).replace(/^in \. /, "");
    if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: phase ${phase} in ${normalizedSign} has an unfilled slot`);
    if (/\b(?:you|your|yours|yourself|you're|you've|you'll|you'd)\b/iu.test(body)) {
      throw new SourceGapError(`SOURCE_GAP: calendar phase ${phase} in ${normalizedSign} violates the collective register`);
    }
    const PHASE_NAMES = { "new-moon": "New Moon", "waxing-crescent": "Waxing Crescent Moon", "first-quarter": "First Quarter Moon", "waxing-gibbous": "Waxing Gibbous Moon", "full-moon": "Full Moon", "disseminating": "Disseminating Moon", "last-quarter": "Last Quarter Moon", "balsamic": "Balsamic Moon" };
    const plain = `${PHASE_NAMES[phase] ?? title2(phase)} in ${title2(normalizedSign)}`;
    return {
      headline: plain,
      tagline: exactRow?.title ?? phaseRow.title ?? "",
      body,
      parts: [body],
      templateKey: "fallback-template/calendar.phase-sign",
      contentKey: selectedRow?.contentKey === exactKey ? exactKey : `fallback-hook/moon-phase-sign/${phase}/${normalizedSign}`,
      sourceKeys: [phaseRow.contentKey, selectedRow?.contentKey].filter((key) => Boolean(key)),
      phaseSignSpecificity: exactRow || compactLunationRow ? "exact-reviewed" : "sign-derived"
    };
  }
  function renderVoidOfCourse({ sign, nextSign }) {
    const r = hooks.get("fallback-hook/moon-void");
    if (!r) throw new SourceGapError("SOURCE_GAP: no void-of-course row");
    const body = fill(r.body_you, { signTitle: title2(sign), nextSignTitle: title2(nextSign) });
    if (/\{\{/.test(body)) throw new SourceGapError("SOURCE_GAP: void-of-course facts missing");
    return { headline: "Moon void of course", body, parts: [body], templateKey: "fallback-template/calendar.void", contentKey: r.contentKey };
  }
  function renderSeasonMarker({ which }) {
    const r = hooks.get(`fallback-hook/season-marker/${which}`);
    if (!r) throw new SourceGapError(`SOURCE_GAP: no season marker for ${which}`);
    return { headline: r.title ?? "", body: r.body_you, parts: [r.body_you], templateKey: "fallback-template/calendar.season-marker", contentKey: r.contentKey };
  }
  function renderWeeklyMoon({ sign, variant }) {
    const rejectedOwnerFeedbackKeys = /* @__PURE__ */ new Set([
      // Owner rejection, 2026-08-03: contains “The Cancer Moon doesn't make you weak; it makes you aware.”
      "authored/calendar-weekly-moon/cancer"
    ]);
    const candidateKeys = [
      variant && variant > 1 ? `authored/calendar-weekly-moon/${sign}/variant-${variant}` : null,
      `authored/calendar-weekly-moon/${sign}`,
      ...[2, 3, 4].map((candidateVariant) => `authored/calendar-weekly-moon/${sign}/variant-${candidateVariant}`)
    ].filter((key) => Boolean(key));
    const contentKey = [...new Set(candidateKeys)].find((key) => !rejectedOwnerFeedbackKeys.has(key) && Boolean(card(key)));
    const c = contentKey ? card(contentKey) : null;
    if (!c) throw new SourceGapError(`SOURCE_GAP: no weekly moon card for ${sign}`);
    return { headline: `Weekly Moon: ${title2(sign)}`, body: c.body, focus: c.focus ?? null, strategy: c.strategy ?? null, parts: [c.body], templateKey: "authored/calendar-weekly-moon", contentKey: c.contentKey };
  }
  function renderSkyAspectCard({ a, b, aspect, aSign, bSign, dateLine }) {
    const reviewed = reviewedSkyAspectRow({ a, b, aspect, aSign, bSign });
    if (reviewed) {
      return {
        headline: `${title2(a)} ${title2(aspect)} ${title2(b)}`,
        body: reviewed.body_you,
        parts: [reviewed.body_you],
        templateKey: reviewed.contentKey,
        contentKey: reviewed.contentKey
      };
    }
    throw new SourceGapError(`SOURCE_GAP: no approved collective Sky aspect copy for ${a}-${aspect}-${b}`);
  }
  function renderBondTransit({
    transiting,
    aspect,
    endpointPlanet,
    endpointOwner,
    activatedPlanets,
    otherName,
    friendPossessivePronoun,
    sign,
    variant,
    duplicateIndex,
    window: win
  }) {
    if (!endpointPlanet || !["reader", "friend"].includes(endpointOwner) || !activatedPlanets?.length) {
      throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} missing endpoint facts`);
    }
    const g = GROUP[aspect] ?? aspect;
    const family = g === "soft" || g === "conjunction" && !HEAVY.has(transiting) ? "soft" : "hard";
    const exactEffectKey = `fallback-hook/bond-effect-${aspect}/${transiting}`;
    const variantEffectKey = variant ? `fallback-hook/bond-effect-${family}/${transiting}/variant-${variant}` : null;
    const familyEffectKey = `fallback-hook/bond-effect-${family}/${transiting}`;
    const effectCandidates = duplicateIndex && duplicateIndex > 0 ? [variantEffectKey, familyEffectKey, exactEffectKey] : [exactEffectKey, variantEffectKey, familyEffectKey];
    const effectKey = effectCandidates.find((key) => Boolean(key && hooks.get(key)?.body_you)) ?? familyEffectKey;
    const effectRow = hooks.get(effectKey);
    const authoredEffect = endpointOwner === "reader" ? effectRow?.body_you : effectRow?.body_they ?? effectRow?.body_you;
    const effect = authoredEffect?.replaceAll("{{holder1}}'s", `${otherName}'s`).replaceAll("{{holder1}}", otherName);
    const aspectAdj = vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body;
    if (!effect || !aspectAdj) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} (${family})`);
    const timeOpen = win ?? WINDOW_ASPECT[transiting] ?? "Currently";
    const relation = {
      conjunction: "conjunct",
      opposition: "opposite",
      square: "square",
      trine: "trine",
      sextile: "sextile"
    };
    const timeClose = inlineWindow(timeOpen);
    const endpoint = endpointOwner === "reader" ? `your ${title2(endpointPlanet)}` : `${otherName}'s ${title2(endpointPlanet)}`;
    const activatedList = endpointOwner === "reader" ? `${otherName}'s ${serialList(activatedPlanets.map(title2))}` : serialList(activatedPlanets.map((planet) => `your ${title2(planet)}`));
    const plural = activatedPlanets.length !== 1;
    const endpointReference = plural && endpointOwner === "friend" ? `${friendPossessivePronoun || "their"} ${title2(endpointPlanet)}` : "it";
    const closing = `${transitRef(transiting, sign).replace(/^./, (char) => char.toUpperCase())} is ${relation[aspect] ?? aspectAdj} ${endpoint}${timeClose ? ` ${timeClose}` : ""}, activating the connection${plural ? "s" : ""} ${endpointReference} makes with ${activatedList}.`;
    const paras = [effect, closing];
    const body = paras.join("\n\n").trim();
    if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} unresolved slot`);
    const HL = { conjunction: "conjunct", opposition: "opposite" };
    const headline = `${title2(transiting)} ${HL[aspect] ?? aspect} ${endpoint}`;
    return { headline, body, parts: paras, templateKey: "fallback-template/bond.transit", contentKey: effectKey };
  }
  const SIGN_ORDER = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
  function renderLunationMacro({ kind, sign }) {
    const which = kind === "new-moon" || kind === "eclipse-solar" ? "new-moon" : "full-moon";
    const macro = card(`authored/sky-lunation-macro/${which}/${sign}`);
    if (!macro) throw new SourceGapError(`SOURCE_GAP: no lunation macro for ${which}/${sign}`);
    return result(macro, "authored/sky-lunation-macro");
  }
  function renderLunationHoroscope({
    kind,
    sign,
    risingSign,
    eventDate,
    matchingNewMoon,
    house,
    moonHouse,
    sunHouse,
    ruler,
    rulerHouse,
    rulerRetrograde,
    timeZone = "UTC",
    weekly = false
  }) {
    const isEclipse = kind === "eclipse-solar" || kind === "eclipse-lunar";
    const which = kind === "new-moon" || kind === "eclipse-solar" ? "new" : "full";
    const h = moonHouse ?? house ?? (SIGN_ORDER.indexOf(sign) - SIGN_ORDER.indexOf(risingSign) + 12) % 12 + 1;
    const bookCellKey = `authored/book-ritual-and-the-moon/lunation-horoscope/${kind}/${sign}/rising-${risingSign}/house-${h}`;
    const exactBookCell = card(bookCellKey);
    const exactEclipsePreview = isEclipse && allowUnreviewed ? exactBookCell : null;
    const evergreenKind = kind === "eclipse-lunar" ? "full-moon" : kind === "eclipse-solar" ? "new-moon" : null;
    const evergreenBookCellKey = evergreenKind ? `authored/book-ritual-and-the-moon/lunation-horoscope/${evergreenKind}/${sign}/rising-${risingSign}/house-${h}` : null;
    const evergreenBookCell = evergreenBookCellKey ? card(evergreenBookCellKey) : null;
    const bookCell = isEclipse ? exactEclipsePreview : exactBookCell;
    const eclipseSectionPrefix = `authored/lunation-eclipse-section/${sign}/rising-${risingSign}/house-${h}`;
    const eclipseSectionKey = (id) => sharedLunationEclipseSectionKey(kind, id, h) ?? `${eclipseSectionPrefix}/${id}`;
    const eclipseSection = (id) => isEclipse ? card(eclipseSectionKey(id)) : null;
    const jurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${h}`)?.body;
    const paras = [];
    const partSourceKeys = [];
    const pushPart = (body, sourceKeys) => {
      paras.push(body);
      partSourceKeys.push([...new Set(sourceKeys.filter((key) => Boolean(key)))]);
    };
    const reviewFlags = [];
    const flagOmittedSection = (sectionId, omittedContentKey, fallbackContentKey = null) => {
      reviewFlags.push({
        id: "conditional-section-omitted",
        status: "needs_review",
        sectionId,
        omittedContentKey,
        fallbackContentKey,
        reason: "missing-or-ineligible"
      });
    };
    let matchingNewMoonSlotCache = null;
    const matchingNewMoonSlots = () => {
      if (matchingNewMoonSlotCache) return matchingNewMoonSlotCache;
      const anchor = hooks.get("fallback-hook/lunation-matching-new-moon-anchor/full")?.body_you;
      const fullMoonTime = Date.parse(eventDate ?? "");
      const newMoonTime = Date.parse(matchingNewMoon?.exactAt ?? "");
      const label2 = kind === "eclipse-lunar" ? "Lunar Eclipse" : "Full Moon";
      if (!anchor || !Number.isFinite(fullMoonTime) || !Number.isFinite(newMoonTime) || normalizeLunationSign(matchingNewMoon?.sign) !== normalizeLunationSign(sign) || newMoonTime >= fullMoonTime) {
        throw new SourceGapError(`SOURCE_GAP: invalid matching New Moon for ${label2} ${eventDate ?? "unknown-date"}/${sign}`);
      }
      const fullMoonLocal = localizedLunationDateParts(eventDate, timeZone, label2);
      const newMoonLocal = localizedLunationDateParts(matchingNewMoon.exactAt, timeZone, "matching New Moon");
      const crossYear = newMoonLocal.year !== fullMoonLocal.year;
      matchingNewMoonSlotCache = {
        matchingNewMoonSign: title2(normalizeLunationSign(matchingNewMoon.sign)),
        matchingNewMoonDate: `${newMoonLocal.month} ${newMoonLocal.day}${crossYear ? `, ${newMoonLocal.year}` : ""}`
      };
      return matchingNewMoonSlotCache;
    };
    const renderStoredBody = (stored) => {
      const needsMatchingNewMoon = /\{\{matchingNewMoon(?:Sign|Date)\}\}/u.test(stored.body ?? "");
      const renderedBookBody = needsMatchingNewMoon ? fill(stored.body, matchingNewMoonSlots()) : stored.body;
      if (/\{\{/u.test(renderedBookBody)) {
        throw new SourceGapError(`SOURCE_GAP: unresolved lunation book slot in ${stored.contentKey}`);
      }
      return renderedBookBody;
    };
    const assertStoredEclipseSectionIntegrity = (stored) => {
      const body = stored.body ?? "";
      const expectedHash = stored.protected_content?.body_sha256;
      const actualHash = sha256Text(body);
      if (!expectedHash || actualHash !== expectedHash || stored.approval?.payloadSha256 !== expectedHash || stored.approval?.approvalLevel !== "exact_owner_approved" || stored.promotion_authorized !== true) {
        throw new SourceGapError(`ECLIPSE_SECTION_MODIFIED: ${stored.contentKey}`);
      }
    };
    const assertProtectedEclipseBookBody = (stored, source) => {
      assertStoredEclipseSectionIntegrity(stored);
      const sourceBody = source.body ?? "";
      const sourceHash = sha256Text(sourceBody);
      const protectedSourceHash = source.protected_content?.body_sha256;
      const integrity = stored.protected_content;
      if (!sourceBody || !protectedSourceHash || sourceHash !== protectedSourceHash || integrity?.source_body_sha256 !== sourceHash) {
        throw new SourceGapError(`BOOK_BODY_MODIFIED: ${source.contentKey}`);
      }
      let expectedBody = sourceBody;
      const omissions = [...integrity.approved_omissions ?? []].sort((left, right) => right.start - left.start);
      for (const omission of omissions) {
        const actual = sourceBody.slice(omission.start, omission.end);
        if (omission.ownerApproved !== true || actual !== omission.text || sha256Text(actual) !== omission.sha256) {
          throw new SourceGapError(`BOOK_BODY_MODIFIED: ${source.contentKey}`);
        }
        expectedBody = `${expectedBody.slice(0, omission.start)}${expectedBody.slice(omission.end)}`;
      }
      const boundary = expectedBody.indexOf(". ");
      const sourceBoundary = sourceBody.indexOf(". ");
      if (boundary < 0 || sourceBoundary < 0) {
        throw new SourceGapError(`BOOK_BODY_MODIFIED: ${source.contentKey}`);
      }
      const sourceOpening = sourceBody.slice(0, sourceBoundary + 1);
      const sourceRemainder = sourceBody.slice(sourceOpening.length).trimStart();
      const emittedRemainder = expectedBody.slice(boundary + 2);
      if (integrity?.source_opening_sha256 !== sha256Text(sourceOpening) || integrity?.source_remainder_sha256 !== sha256Text(sourceRemainder) || integrity?.preservedBookRemainderSha256 !== sha256Text(emittedRemainder) || stored.body !== emittedRemainder) {
        throw new SourceGapError(`BOOK_BODY_MODIFIED: ${source.contentKey}`);
      }
    };
    const pushEclipseSection = (id) => {
      const key = eclipseSectionKey(id);
      const stored = eclipseSection(id);
      if (!stored?.body) {
        flagOmittedSection(id, key);
        return null;
      }
      assertStoredEclipseSectionIntegrity(stored);
      try {
        pushPart(renderStoredBody(stored), [stored.contentKey, ...stored.source_keys ?? []]);
      } catch (error) {
        if (!(error instanceof SourceGapError)) throw error;
        flagOmittedSection(id, key);
        return null;
      }
      return stored;
    };
    let authoredBodyUsed = false;
    let suppressCycleAnchor = false;
    if (bookCell?.body) {
      pushPart(renderStoredBody(bookCell), [bookCell.contentKey, ...bookCell.source_keys ?? []]);
      authoredBodyUsed = true;
    } else if (isEclipse) {
      pushEclipseSection("opening");
      pushEclipseSection("nature");
      pushEclipseSection("mechanics");
      const bodyKey = `${eclipseSectionPrefix}/evergreen-body`;
      const eclipseBody = eclipseSection("evergreen-body");
      if (eclipseBody?.body) {
        if (!evergreenBookCell?.body) {
          throw new SourceGapError(`BOOK_BODY_MODIFIED: missing protected source ${evergreenBookCellKey}`);
        }
        assertProtectedEclipseBookBody(eclipseBody, evergreenBookCell);
        pushPart(renderStoredBody(eclipseBody), [
          eclipseBody.contentKey,
          evergreenBookCell.contentKey,
          ...eclipseBody.source_keys ?? []
        ]);
        authoredBodyUsed = true;
        suppressCycleAnchor = eclipseBody.suppress_cycle_anchor === true;
      } else if (evergreenBookCell?.body) {
        pushPart(renderStoredBody(evergreenBookCell), [evergreenBookCell.contentKey, ...evergreenBookCell.source_keys ?? []]);
        authoredBodyUsed = true;
        flagOmittedSection("evergreen-body", bodyKey, evergreenBookCell.contentKey);
      }
    } else if (evergreenBookCell?.body) {
      pushPart(renderStoredBody(evergreenBookCell), [evergreenBookCell.contentKey, ...evergreenBookCell.source_keys ?? []]);
      authoredBodyUsed = true;
    }
    if (!authoredBodyUsed) {
      const frame = hooks.get(`fallback-hook/lunation-horoscope/${which}`)?.body_you;
      if (!frame || !jurisdiction) throw new SourceGapError(`SOURCE_GAP: lunation horoscope ${which}/${risingSign} (house ${h})`);
      const houseFrame = fill(frame, { houseOrdinal: ordinal2(h), jurisdiction });
      const opening = hooks.get(`fallback-hook/lunation-opening-situation/${h}`)?.body_you;
      pushPart(opening ? `${opening} ${houseFrame}` : houseFrame, [
        `fallback-hook/lunation-horoscope/${which}`,
        `fallback-vocab/house-jurisdiction/${h}`,
        opening ? `fallback-hook/lunation-opening-situation/${h}` : null
      ]);
    }
    if (kind === "eclipse-solar" && !bookCell) {
      const solarHouseLayerKey = `authored/lunation-eclipse-house-layer/solar/house-${h}`;
      const solarHouseLayer = card(solarHouseLayerKey);
      if (solarHouseLayer?.body) {
        pushPart(renderStoredBody(solarHouseLayer), [solarHouseLayer.contentKey, ...solarHouseLayer.source_keys ?? []]);
      } else {
        flagOmittedSection("eclipse-house-layer", solarHouseLayerKey);
      }
    }
    if ((kind === "full-moon" || kind === "eclipse-lunar") && !(isEclipse && bookCell) && !suppressCycleAnchor) {
      const anchor = hooks.get("fallback-hook/lunation-matching-new-moon-anchor/full")?.body_you;
      if (!anchor) throw new SourceGapError("SOURCE_GAP: missing Full Moon cycle anchor");
      try {
        pushPart(fill(anchor, matchingNewMoonSlots()), ["fallback-hook/lunation-matching-new-moon-anchor/full"]);
      } catch (error) {
        if (!(kind === "eclipse-lunar" && error instanceof SourceGapError)) throw error;
        flagOmittedSection("matching-new-moon-anchor", "fallback-hook/lunation-matching-new-moon-anchor/full");
      }
    } else if ((kind === "new-moon" || kind === "eclipse-solar") && !(isEclipse && bookCell)) {
      const anchor = hooks.get("fallback-hook/lunation-cycle-anchor/new")?.body_you;
      if (!anchor) throw new SourceGapError("SOURCE_GAP: missing New Moon cycle anchor");
      pushPart(anchor, ["fallback-hook/lunation-cycle-anchor/new"]);
    }
    const signCompact = !authoredBodyUsed ? hooks.get(`fallback-hook/lunation-sign-compact/${which}-moon/${sign}`)?.body_you ?? (which === "full" ? hooks.get(`fallback-hook/lunation-sign-compact/${sign}`)?.body_you : null) : null;
    if (signCompact) pushPart(signCompact, [
      `fallback-hook/lunation-sign-compact/${which}-moon/${sign}`,
      which === "full" ? `fallback-hook/lunation-sign-compact/${sign}` : null
    ]);
    if (!authoredBodyUsed && which === "full" && sunHouse && sunHouse !== h && jurisdiction) {
      const sunJurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${sunHouse}`)?.body;
      if (sunJurisdiction) {
        const counterpoint = `The friction this week runs between your ${ordinal2(sunHouse)} house of ${sunJurisdiction} and your ${ordinal2(h)} house of ${jurisdiction}. The immediate demands on one side can compete with what is becoming undeniable on the other, so let the tension show you what needs to change.`;
        paras[paras.length - 1] = `${paras[paras.length - 1]} ${counterpoint}`;
        partSourceKeys[partSourceKeys.length - 1] = [
          .../* @__PURE__ */ new Set([
            ...partSourceKeys[partSourceKeys.length - 1] ?? [],
            `fallback-vocab/house-jurisdiction/${sunHouse}`,
            `fallback-vocab/house-jurisdiction/${h}`,
            "resolver/engine-computed-full-moon-counterpoint"
          ])
        ];
      }
    }
    if ((!authoredBodyUsed || isEclipse || rulerRetrograde) && ruler && rulerHouse && ruler !== "sun" && ruler !== "moon") {
      const rulerHouseBody = hooks.get(`fallback-hook/lunation-ruler-house/${rulerHouse}`)?.body_you;
      if (rulerHouseBody) {
        const lunationLabel = isEclipse ? which === "new" ? "Solar Eclipse" : "Lunar Eclipse" : which === "new" ? "New Moon" : "Full Moon";
        const rulerTitle = title2(ruler);
        let rulerParagraph = `${rulerTitle} rules this ${lunationLabel} from your ${ordinal2(rulerHouse)} house, so ${rulerHouseBody.replace(/\.+$/u, "")}.`;
        if (rulerRetrograde) {
          const retroOverlay = hooks.get("fallback-hook/lunation-ruler-retro")?.body_you;
          if (!retroOverlay) {
            flagOmittedSection(
              "ruler-retrograde",
              "fallback-hook/lunation-ruler-retro"
            );
          } else {
            rulerParagraph += ` ${fill(retroOverlay, { rulerTitle })}`;
          }
        }
        pushPart(rulerParagraph, [
          `fallback-hook/lunation-ruler-house/${rulerHouse}`,
          rulerRetrograde ? "fallback-hook/lunation-ruler-retro" : null,
          "resolver/engine-computed-ruler-frame"
        ]);
      }
    }
    if (isEclipse && !bookCell) {
      pushEclipseSection("recommendation");
      pushEclipseSection("close");
    }
    const weekLayer = weekly && !authoredBodyUsed ? hooks.get("fallback-hook/lunation-week-layer")?.body_you : null;
    if (weekLayer) pushPart(weekLayer, ["fallback-hook/lunation-week-layer"]);
    const label = isEclipse ? which === "new" ? "Solar Eclipse" : "Lunar Eclipse" : which === "new" ? "New Moon" : "Full Moon";
    const headline = isEclipse ? `${title2(sign)} ${label} Horoscope` : bookCell?.headline || `${label} for ${title2(risingSign)} Rising`;
    if (isEclipse && (partSourceKeys.length !== paras.length || partSourceKeys.some((keys) => keys.length === 0))) {
      throw new SourceGapError(`ECLIPSE_PROVENANCE_MISSING: ${kind}/${sign}/rising-${risingSign}/house-${h}`);
    }
    return {
      headline,
      body: paras.join("\n\n"),
      parts: paras,
      partSourceKeys: isEclipse ? partSourceKeys : void 0,
      templateKey: bookCell?.contentKey || "fallback-template/sky.lunation-horoscope",
      contentKey: bookCell?.contentKey,
      reviewFlags: reviewFlags.length > 0 ? reviewFlags : void 0
    };
  }
  function renderLunationEventCard({
    eventDate,
    blendFallbackEnabled = false,
    ...blendFacts
  }) {
    const normalizedEventDate = eventDate.trim().slice(0, 10);
    const risingKey = `${blendFacts.risingSign}-rising`;
    const satori = card(
      `authored/satori-lunation/${normalizedEventDate}/${risingKey}`
    );
    if (satori) return result(satori, "authored/satori-lunation-v1");
    if (blendFallbackEnabled) return renderLunationHoroscope({ eventDate, ...blendFacts });
    throw new SourceGapError(
      `SOURCE_GAP: no satori lunation card for ${normalizedEventDate}/${risingKey}`
    );
  }
  const DAILY_GROUP = { conjunction: "conjunction", square: "square", opposition: "opposition", trine: "soft", sextile: "soft" };
  function renderDailyGlance({
    natal,
    aspect,
    house,
    dateKey,
    userId,
    previousVariantId,
    voice = "you",
    personSlots = {}
  }) {
    const renderFriendRow = (row, contentKey) => {
      const raw = row?.body_they;
      if (!raw) return null;
      const findings = lintDailyGlanceFriendVoice(raw);
      if (findings.length > 0) {
        throw new SourceGapError(
          `SOURCE_GAP: ${contentKey} friend voice failed ${findings.map((finding) => finding.id).join(",")}`
        );
      }
      try {
        return fillDailyGlancePersonSlots(raw, personSlots);
      } catch (error) {
        throw new SourceGapError(
          `SOURCE_GAP: ${contentKey} friend voice slots ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
    const renderForVoice = ({
      headlineKey,
      bodyKey,
      contentKey
    }) => {
      if (voice === "they") {
        const headline2 = renderFriendRow(hooks.get(headlineKey), headlineKey);
        const body2 = renderFriendRow(hooks.get(bodyKey), bodyKey);
        return headline2 && body2 ? { headline: headline2, body: body2, parts: [body2], templateKey: "fallback-template/daily.glance", variantId: "primary-they" } : null;
      }
      const headline = hooks.get(headlineKey)?.body_you;
      const body = hooks.get(bodyKey)?.body_you;
      if (!headline || !body) return null;
      const selected = selectDailyGlanceVariantSet({
        variantSet: rowsFile.dailyGlanceVariants?.keys[contentKey],
        primary: { headline, body },
        dateKey,
        contentKey,
        userId,
        previousVariantId,
        allowUnreviewed
      });
      return {
        headline: selected.headline,
        body: selected.body,
        parts: [selected.body],
        templateKey: "fallback-template/daily.glance",
        variantId: selected.id
      };
    };
    if (natal && aspect) {
      const g = DAILY_GROUP[aspect] ?? aspect;
      const rendered = renderForVoice({
        headlineKey: `fallback-hook/daily-headline/${g}/${natal}`,
        bodyKey: `fallback-hook/daily-body/${g}/${natal}`,
        contentKey: `${g}/${natal}`
      });
      if (rendered) return rendered;
    }
    if (house) {
      const rendered = renderForVoice({
        headlineKey: `fallback-hook/daily-headline/house/${house}`,
        bodyKey: `fallback-hook/daily-body/house/${house}`,
        contentKey: `house/${house}`
      });
      if (rendered) return rendered;
    }
    throw new SourceGapError(`SOURCE_GAP: daily glance ${aspect ?? "no-aspect"}/${natal ?? house}`);
  }
  function renderDoDont({ planet, sign, house, transiting, weakPlanet, weakSign, moonSign, moonHouse, dayKey, voice = "you" }) {
    const seed = (k) => vocabularyBodyForVoice(vocab.get(`fallback-vocab/${k}`), voice);
    const APPROVED = /* @__PURE__ */ new Set(["approved", "approved_reuse", "reviewed"]);
    const moonSeed = (k) => {
      const r = vocab.get(`fallback-vocab/${k}`);
      return r && APPROVED.has(r.review_status ?? "") ? vocabularyBodyForVoice(r, voice) : null;
    };
    const day = Number.isFinite(dayKey ?? NaN) ? Math.abs(Math.trunc(dayKey)) : 0;
    const dos = [
      seed(`dodont-do/${planet}/${sign}`),
      house ? seed(`dodont-house/${house}`) : null,
      seed(`dodont-reward/${transiting}`)
    ].filter((x) => Boolean(x));
    const donts = [
      seed(`dodont-shadow/${planet}/${sign}`),
      seed(`dodont-friction/${transiting}`),
      weakPlanet && weakSign ? seed(`dodont-shadow/${weakPlanet}/${weakSign}`) : seed(`dodont-friction/${planet}`)
    ].filter((x) => Boolean(x));
    if (dos.length < 2 || donts.length < 2) throw new SourceGapError(`SOURCE_GAP: do/don't seeds for ${planet}/${sign} under ${transiting}`);
    const mds = [
      moonSign ? moonSeed(`dodont-moon-do/${moonSign}`) : null,
      moonHouse ? seed(`dodont-house/${moonHouse}`) : null
    ].filter((x) => Boolean(x));
    const mdt = [moonSign ? moonSeed(`dodont-moon-dont/${moonSign}`) : null].filter((x) => Boolean(x));
    const uniq = (a) => [...new Set(a)];
    const rot = (a, n) => a.length ? a.slice(n % a.length).concat(a.slice(0, n % a.length)) : a;
    const mDo = mds.length ? [mds[day % mds.length]] : [];
    const mDont = mdt.length ? [mdt[day % mdt.length]] : [];
    return {
      do: uniq([dos[0], ...mDo, ...rot(dos.slice(1), day)]).slice(0, 3),
      dont: uniq([donts[0], ...mDont, ...rot(donts.slice(1), day)]).slice(0, 3),
      templateKey: "fallback-template/daily.dodont"
    };
  }
  return { renderTransitHouse, renderTransitHouseEvent, renderTransitAspect, renderTransitLabel, renderTransitReturn, renderTransitRetro, renderCompat, renderSynastryAspect, renderSkySeason, renderSkyHoroscope, renderSkyLunation, renderSkyPlacement, renderSkyPlacementHouseCore, renderSkyAspectCard, renderCircleStory, renderPairDaily, formatCircleNames, renderCalendarPhase, renderVoidOfCourse, renderSeasonMarker, renderWeeklyMoon, renderBondTransit, renderLunationMacro, renderLunationHoroscope, renderLunationEventCard, renderDoDont, renderDailyGlance };
}

// apps/web/src/content/fallbackArchitectureV3/resolver/knowledgeMatrixV9.browser.ts
var EXCLUDED_PREFIX = "[EXCLUDE FROM FALLBACK]";
var OWNER_APPROVED = "owner-approved";
function normalizedKeyPart(value) {
  return String(value ?? "").trim().toLowerCase();
}
function transitRuntimeKey(row) {
  return [row.Planet, row.Sign, row.Event].map(normalizedKeyPart).join("|");
}
function housePrimaryRuntimeKey(row) {
  return [row["Rising sign"], row.Planet, row["Transit sign"], row.House].map(normalizedKeyPart).join("|");
}
function houseEventRuntimeKey(row) {
  return `${housePrimaryRuntimeKey(row)}|${normalizedKeyPart(row.Event)}`;
}
function assertExactSchema(manifest, rowsFile, buildReport) {
  if (manifest.schema !== "tldrastro.knowledge-matrix-import.v9" || manifest.version !== "v9-owner-approved-governance-labeled" || manifest.source_policy.rewrite_or_clean_copy !== false || manifest.source_policy.preserve_workbook_copy_exactly !== true || manifest.source_policy.authority_column !== "Governance" || manifest.source_policy.serving_authority !== OWNER_APPROVED || JSON.stringify(manifest.source_policy.historical_lineage_columns) !== JSON.stringify(["Judge"]) || rowsFile.schema !== "tldrastro.knowledge-matrix.rows.v9" || rowsFile.version !== manifest.version || rowsFile.source_workbook !== manifest.source_of_truth || rowsFile.source_workbook_sha256 !== manifest.source_sha256 || buildReport.version !== manifest.version) {
    throw new Error("Knowledge matrix v9 manifest or source is not the governance-labeled owner-approved package.");
  }
  if (manifest.verified_build.build_warnings !== 0 || buildReport.warning_count !== 0 || buildReport.warnings.length !== 0 || buildReport.build_passed !== true) {
    throw new Error("Knowledge matrix v9 has build warnings; runtime ingestion is blocked.");
  }
  if (rowsFile.transit_meanings.length !== manifest.canonical_rows.transit_rows || rowsFile.house_activations.length !== manifest.canonical_rows.house_rows || rowsFile.transit_meanings.length + rowsFile.house_activations.length !== manifest.canonical_rows.owner_approved_rows || buildReport.transit_rows !== manifest.canonical_rows.transit_rows || buildReport.house_rows !== manifest.canonical_rows.house_rows || buildReport.governance_counts[OWNER_APPROVED] !== manifest.canonical_rows.owner_approved_rows) {
    throw new Error("Knowledge matrix v9 canonical row count mismatch.");
  }
}
function createKnowledgeMatrixV9Resolver(manifest, rowsFile, buildReport) {
  assertExactSchema(manifest, rowsFile, buildReport);
  const allRows = [...rowsFile.transit_meanings, ...rowsFile.house_activations];
  if (allRows.some((row) => row.Governance !== OWNER_APPROVED)) {
    throw new Error("Knowledge matrix v9 contains a row not authorized by Governance.");
  }
  const transitIndex = /* @__PURE__ */ new Map();
  let transitEligibleRows = 0;
  for (const row of rowsFile.transit_meanings) {
    if (!row.Planet || !row.Sign || !row.Event || !row.Copy) continue;
    if (row.Copy.startsWith(EXCLUDED_PREFIX)) continue;
    transitEligibleRows += 1;
    const key = transitRuntimeKey(row);
    if (!transitIndex.has(key)) transitIndex.set(key, row);
  }
  const housePrimaryKeys = /* @__PURE__ */ new Set();
  const houseIndex = /* @__PURE__ */ new Map();
  let houseEligibleRows = 0;
  let excludedHouseRows = 0;
  for (const row of rowsFile.house_activations) {
    const eligible = Boolean(
      row["Rising sign"] && row.Planet && row["Transit sign"] && row.Event && Number.isInteger(row.House) && Number(row.House) >= 1 && Number(row.House) <= 12 && row.Experience && !row.Experience.startsWith(EXCLUDED_PREFIX)
    );
    if (!eligible) {
      excludedHouseRows += 1;
      continue;
    }
    houseEligibleRows += 1;
    housePrimaryKeys.add(housePrimaryRuntimeKey(row));
    const key = houseEventRuntimeKey(row);
    if (!houseIndex.has(key)) houseIndex.set(key, row);
  }
  const expected = manifest.verified_build;
  if (transitEligibleRows !== expected.transit_eligible_rows || transitIndex.size !== expected.transit_runtime_keys || houseEligibleRows !== expected.house_eligible_rows || housePrimaryKeys.size !== expected.house_primary_keys || houseIndex.size !== expected.house_event_runtime_keys || excludedHouseRows !== expected.excluded_house_rows) {
    throw new Error(
      `Knowledge matrix v9 count mismatch: transit rows ${transitEligibleRows}/${expected.transit_eligible_rows}, transit keys ${transitIndex.size}/${expected.transit_runtime_keys}, house rows ${houseEligibleRows}/${expected.house_eligible_rows}, house primary ${housePrimaryKeys.size}/${expected.house_primary_keys}, house events ${houseIndex.size}/${expected.house_event_runtime_keys}, excluded ${excludedHouseRows}/${expected.excluded_house_rows}.`
    );
  }
  return Object.freeze({
    renderTransitMeaning({ planet, transitSign, eventType }) {
      const runtimeKey = [planet, transitSign, eventType].map(normalizedKeyPart).join("|");
      const row = transitIndex.get(runtimeKey);
      return row ? {
        body: row.Copy,
        contentKey: `knowledge-matrix-v9/transit/${runtimeKey}`,
        governance: row.Governance,
        judgeLineage: row.Judge,
        sourceVersion: manifest.version,
        sourceRow: row.source_row
      } : null;
    },
    renderHouseActivation({ risingSign, planet, transitSign, house, eventType }) {
      const runtimeKey = [risingSign, planet, transitSign, house, eventType].map(normalizedKeyPart).join("|");
      const row = houseIndex.get(runtimeKey);
      return row ? {
        body: row.Experience,
        contentKey: `knowledge-matrix-v9/house/${runtimeKey}`,
        governance: row.Governance,
        judgeLineage: row.Judge,
        sourceVersion: manifest.version,
        sourceRow: row.source_row
      } : null;
    },
    counts: Object.freeze({
      ownerApprovedRows: allRows.length,
      transitEligibleRows,
      transitRuntimeKeys: transitIndex.size,
      houseEligibleRows,
      housePrimaryKeys: housePrimaryKeys.size,
      houseEventRuntimeKeys: houseIndex.size,
      excludedHouseRows
    })
  });
}

// apps/web/src/content/fallbackArchitectureV3/resolver/knowledgeMatrixV13.browser.ts
var ALLOWED_GOVERNANCE = [
  "owner-approved-v13-direct-language",
  "owner-lived-experience-ll-v9-owner-approved",
  "owner-approved-clarity-fix-ll-v12"
];
function normalizeObject(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll("_", "-").replace(/\s+/gu, "-");
}
function normalizeAspect2(value) {
  const aspect = normalizeObject(value);
  return aspect === "inconjunct" ? "quincunx" : aspect;
}
function toResult(row, sourceVersion) {
  return {
    body: row.copy,
    contentKey: row.contentKey,
    governance: row.governance,
    payloadSha256: row.payloadSha256,
    sourceVersion,
    workbookRow: row.workbookRow
  };
}
function assertExactSchema2(file) {
  if (file.schema !== "tldrastro.knowledge-matrix.rows.v13" || file.version !== "v13-direct-language-owner-approved" || file.approvedAt !== "2026-08-10" || file.governance.authorityField !== "ownerApproved" || file.governance.requiredValue !== true || file.counts.sourceRows !== 1014 || file.counts.ownerApprovedRows !== 301 || file.counts.excludedUnapprovedRows !== 713 || file.counts.clarityStrictV13Rows !== 195 || file.rows.length !== 301) {
    throw new Error("Knowledge matrix V13 is not the canonical owner-approved package.");
  }
  if (JSON.stringify(file.counts.bySheet) !== JSON.stringify({
    PlacementMeanings: 113,
    AspectMeanings: 165,
    NodesPhasesFortune: 23
  }) || JSON.stringify(file.counts.byGovernance) !== JSON.stringify({
    "owner-approved-v13-direct-language": 194,
    "owner-lived-experience-ll-v9-owner-approved": 106,
    "owner-approved-clarity-fix-ll-v12": 1
  })) {
    throw new Error("Knowledge matrix V13 owner-approved counts do not match the canonical workbook.");
  }
  if (!file.governance.discardedPath.includes("Gemini") || !file.governance.discardedPath.includes("blind-edit")) {
    throw new Error("Knowledge matrix V13 does not preserve the discarded-path governance ruling.");
  }
}
function createKnowledgeMatrixV13Resolver(file) {
  assertExactSchema2(file);
  const byContentKey = /* @__PURE__ */ new Map();
  const byWorkbookKey = /* @__PURE__ */ new Map();
  for (const row of file.rows) {
    if (row.ownerApproved !== true || row.authorship !== "owner_authored" || !ALLOWED_GOVERNANCE.includes(row.governance) || !row.copy || !row.contentKey || !/^[a-f0-9]{64}$/u.test(row.payloadSha256) || row.workbookProvenance.path !== file.sourceWorkbook || row.workbookProvenance.sheet !== row.sheet || row.workbookRow < 2) {
      throw new Error(`Knowledge matrix V13 row is incomplete or unauthorized: ${row.sheet}/${row.key}`);
    }
    if (byContentKey.has(row.contentKey) || byWorkbookKey.has(row.key)) {
      throw new Error(`Knowledge matrix V13 duplicate key: ${row.contentKey}`);
    }
    byContentKey.set(row.contentKey, row);
    byWorkbookKey.set(row.key, row);
  }
  if (byContentKey.size !== file.counts.ownerApprovedRows) {
    throw new Error("Knowledge matrix V13 unique runtime-key count mismatch.");
  }
  const readContentKey = (contentKey) => {
    const row = byContentKey.get(contentKey);
    return row ? toResult(row, file.version) : null;
  };
  return Object.freeze({
    renderContentKey: readContentKey,
    renderNatalPlacement({ planet, sign, house }) {
      const normalizedPlanet = normalizeObject(planet);
      const normalizedSign = normalizeObject(sign);
      if (house) {
        return readContentKey(`fallback-hook/placement-house-lived/${normalizedPlanet}/${house}`) ?? readContentKey(`fallback-hook/house-lived/${house}`);
      }
      return readContentKey(`fallback-hook/placement-sign-lived/${normalizedPlanet}/${normalizedSign}`) ?? readContentKey(`fallback-hook/sign-lived/${normalizedSign}`) ?? readContentKey(`fallback-hook/planet-lived/${normalizedPlanet}`);
    },
    renderNatalAspect({ planetA, aspect, planetB }) {
      const normalizedA = normalizeObject(planetA);
      const normalizedB = normalizeObject(planetB);
      const normalizedAspect = normalizeAspect2(aspect);
      return readContentKey(`fallback-hook/natal-aspect-lived/${normalizedA}/${normalizedAspect}/${normalizedB}`) ?? readContentKey(`fallback-hook/natal-aspect-lived/${normalizedB}/${normalizedAspect}/${normalizedA}`);
    },
    renderWorkbookKey(key) {
      const row = byWorkbookKey.get(String(key).trim().toLowerCase());
      return row ? toResult(row, file.version) : null;
    },
    counts: Object.freeze({
      ownerApprovedRows: file.rows.length,
      placementRows: file.rows.filter((row) => row.sheet === "PlacementMeanings").length,
      aspectRows: file.rows.filter((row) => row.sheet === "AspectMeanings").length,
      pointRows: file.rows.filter((row) => row.sheet === "NodesPhasesFortune").length
    })
  });
}

// apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-120-owner-approval-v1.json
var sky_v4_continuous_120_owner_approval_v1_default = {
  schema: "tldrastro.sky-v4-owner-approval.v1",
  approval_id: "sky-v4-continuous-120-owner-approval-2026-08-31",
  approved_on: "2026-08-31",
  canonical_package_version: "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30",
  canonical_json_sha256: "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750",
  approval_record: "packages/astro-knowledge/review/sky-v4-continuous-120-owner-approval-2026-08-31/OWNER-APPROVAL.md",
  content_key_pattern: "sky-placement/article/{planet}/{sign}",
  review_status: "approved",
  owner_approved: true,
  serving_enabled: false,
  approved_keys: [
    "sky-placement/article/sun/aries",
    "sky-placement/article/sun/taurus",
    "sky-placement/article/sun/gemini",
    "sky-placement/article/sun/cancer",
    "sky-placement/article/sun/leo",
    "sky-placement/article/sun/virgo",
    "sky-placement/article/sun/libra",
    "sky-placement/article/sun/scorpio",
    "sky-placement/article/sun/sagittarius",
    "sky-placement/article/sun/capricorn",
    "sky-placement/article/sun/aquarius",
    "sky-placement/article/sun/pisces",
    "sky-placement/article/mercury/aries",
    "sky-placement/article/mercury/taurus",
    "sky-placement/article/mercury/gemini",
    "sky-placement/article/mercury/cancer",
    "sky-placement/article/mercury/leo",
    "sky-placement/article/mercury/virgo",
    "sky-placement/article/mercury/libra",
    "sky-placement/article/mercury/scorpio",
    "sky-placement/article/mercury/sagittarius",
    "sky-placement/article/mercury/capricorn",
    "sky-placement/article/mercury/aquarius",
    "sky-placement/article/mercury/pisces",
    "sky-placement/article/venus/aries",
    "sky-placement/article/venus/taurus",
    "sky-placement/article/venus/gemini",
    "sky-placement/article/venus/cancer",
    "sky-placement/article/venus/leo",
    "sky-placement/article/venus/virgo",
    "sky-placement/article/venus/libra",
    "sky-placement/article/venus/scorpio",
    "sky-placement/article/venus/sagittarius",
    "sky-placement/article/venus/capricorn",
    "sky-placement/article/venus/aquarius",
    "sky-placement/article/venus/pisces",
    "sky-placement/article/mars/aries",
    "sky-placement/article/mars/taurus",
    "sky-placement/article/mars/gemini",
    "sky-placement/article/mars/cancer",
    "sky-placement/article/mars/leo",
    "sky-placement/article/mars/virgo",
    "sky-placement/article/mars/libra",
    "sky-placement/article/mars/scorpio",
    "sky-placement/article/mars/sagittarius",
    "sky-placement/article/mars/capricorn",
    "sky-placement/article/mars/aquarius",
    "sky-placement/article/mars/pisces",
    "sky-placement/article/jupiter/aries",
    "sky-placement/article/jupiter/taurus",
    "sky-placement/article/jupiter/gemini",
    "sky-placement/article/jupiter/cancer",
    "sky-placement/article/jupiter/leo",
    "sky-placement/article/jupiter/virgo",
    "sky-placement/article/jupiter/libra",
    "sky-placement/article/jupiter/scorpio",
    "sky-placement/article/jupiter/sagittarius",
    "sky-placement/article/jupiter/capricorn",
    "sky-placement/article/jupiter/aquarius",
    "sky-placement/article/jupiter/pisces",
    "sky-placement/article/saturn/aries",
    "sky-placement/article/saturn/taurus",
    "sky-placement/article/saturn/gemini",
    "sky-placement/article/saturn/cancer",
    "sky-placement/article/saturn/leo",
    "sky-placement/article/saturn/virgo",
    "sky-placement/article/saturn/libra",
    "sky-placement/article/saturn/scorpio",
    "sky-placement/article/saturn/sagittarius",
    "sky-placement/article/saturn/capricorn",
    "sky-placement/article/saturn/aquarius",
    "sky-placement/article/saturn/pisces",
    "sky-placement/article/uranus/aries",
    "sky-placement/article/uranus/taurus",
    "sky-placement/article/uranus/gemini",
    "sky-placement/article/uranus/cancer",
    "sky-placement/article/uranus/leo",
    "sky-placement/article/uranus/virgo",
    "sky-placement/article/uranus/libra",
    "sky-placement/article/uranus/scorpio",
    "sky-placement/article/uranus/sagittarius",
    "sky-placement/article/uranus/capricorn",
    "sky-placement/article/uranus/aquarius",
    "sky-placement/article/uranus/pisces",
    "sky-placement/article/neptune/aries",
    "sky-placement/article/neptune/taurus",
    "sky-placement/article/neptune/gemini",
    "sky-placement/article/neptune/cancer",
    "sky-placement/article/neptune/leo",
    "sky-placement/article/neptune/virgo",
    "sky-placement/article/neptune/libra",
    "sky-placement/article/neptune/scorpio",
    "sky-placement/article/neptune/sagittarius",
    "sky-placement/article/neptune/capricorn",
    "sky-placement/article/neptune/aquarius",
    "sky-placement/article/neptune/pisces",
    "sky-placement/article/pluto/aries",
    "sky-placement/article/pluto/taurus",
    "sky-placement/article/pluto/gemini",
    "sky-placement/article/pluto/cancer",
    "sky-placement/article/pluto/leo",
    "sky-placement/article/pluto/virgo",
    "sky-placement/article/pluto/libra",
    "sky-placement/article/pluto/scorpio",
    "sky-placement/article/pluto/sagittarius",
    "sky-placement/article/pluto/capricorn",
    "sky-placement/article/pluto/aquarius",
    "sky-placement/article/pluto/pisces",
    "sky-placement/article/chiron/aries",
    "sky-placement/article/chiron/taurus",
    "sky-placement/article/chiron/gemini",
    "sky-placement/article/chiron/cancer",
    "sky-placement/article/chiron/leo",
    "sky-placement/article/chiron/virgo",
    "sky-placement/article/chiron/libra",
    "sky-placement/article/chiron/scorpio",
    "sky-placement/article/chiron/sagittarius",
    "sky-placement/article/chiron/capricorn",
    "sky-placement/article/chiron/aquarius",
    "sky-placement/article/chiron/pisces"
  ]
};

// apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json
var sky_v4_reader_copy_280_owner_approval_v1_default = {
  schema: "tldrastro.sky-v4-reader-copy-owner-approval.v1",
  approval_id: "sky-v4-reader-copy-280-owner-approval-2026-08-31",
  approved_on: "2026-08-31",
  canonical_package_version: "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30",
  canonical_json_sha256: "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750",
  approval_record: "packages/astro-knowledge/review/sky-v4-reader-copy-280-owner-approval-2026-08-31/OWNER-APPROVAL.md",
  prior_continuous_approval_id: "sky-v4-continuous-120-owner-approval-2026-08-31",
  review_status: "approved",
  owner_approved: true,
  serving_enabled: false,
  expected_approved_reader_records: 280,
  expected_additional_reader_records: 160,
  expected_counts_by_content_type: {
    "continuous-placement": 120,
    "new-moon": 12,
    "full-moon": 12,
    "eclipse-event": 4,
    "eclipse-fallback": 48,
    "generic-eclipse-fallback": 4,
    "node-axis": 12,
    "node-module": 24,
    "node-education": 1,
    lilith: 12,
    "lilith-station": 1,
    retrograde: 9,
    overlay: 9,
    seasonal: 12
  },
  approved_fields_by_content_type: {
    "continuous-placement": [
      "tldrWhat",
      "tldrTakeaway",
      "placementArticle",
      "fallback.hook",
      "fallback.lived",
      "fallback.turn"
    ],
    "new-moon": [
      "TLDR_What",
      "TLDR_Takeaway",
      "NewMoonArticle"
    ],
    "full-moon": [
      "TLDR_What",
      "TLDR_Takeaway",
      "FullMoonArticle"
    ],
    "eclipse-event": [
      "TLDR_What",
      "TLDR_Takeaway",
      "EventArticle"
    ],
    "eclipse-fallback": [
      "Hook",
      "Lived",
      "Turn"
    ],
    "generic-eclipse-fallback": [
      "TLDR_What",
      "TLDR_Takeaway",
      "ModifierArticle"
    ],
    "node-axis": [
      "TLDR_What",
      "TLDR_North",
      "TLDR_South",
      "TLDR_Takeaway",
      "NodeAxisArticle"
    ],
    "node-module": [
      "ExactIngressCopy"
    ],
    "node-education": [
      "Article"
    ],
    lilith: [
      "TLDR_What",
      "TLDR_Takeaway",
      "LilithArticle"
    ],
    "lilith-station": [
      "Headline",
      "Body"
    ],
    retrograde: [
      "CanonicalShort",
      "Body"
    ],
    overlay: [
      "OverlayBody",
      "FallbackHookOverlay"
    ],
    seasonal: [
      "Copy"
    ]
  },
  approved_keys: [
    "sky-placement/article/sun/aries",
    "sky-placement/article/sun/taurus",
    "sky-placement/article/sun/gemini",
    "sky-placement/article/sun/cancer",
    "sky-placement/article/sun/leo",
    "sky-placement/article/sun/virgo",
    "sky-placement/article/sun/libra",
    "sky-placement/article/sun/scorpio",
    "sky-placement/article/sun/sagittarius",
    "sky-placement/article/sun/capricorn",
    "sky-placement/article/sun/aquarius",
    "sky-placement/article/sun/pisces",
    "sky-placement/article/mercury/aries",
    "sky-placement/article/mercury/taurus",
    "sky-placement/article/mercury/gemini",
    "sky-placement/article/mercury/cancer",
    "sky-placement/article/mercury/leo",
    "sky-placement/article/mercury/virgo",
    "sky-placement/article/mercury/libra",
    "sky-placement/article/mercury/scorpio",
    "sky-placement/article/mercury/sagittarius",
    "sky-placement/article/mercury/capricorn",
    "sky-placement/article/mercury/aquarius",
    "sky-placement/article/mercury/pisces",
    "sky-placement/article/venus/aries",
    "sky-placement/article/venus/taurus",
    "sky-placement/article/venus/gemini",
    "sky-placement/article/venus/cancer",
    "sky-placement/article/venus/leo",
    "sky-placement/article/venus/virgo",
    "sky-placement/article/venus/libra",
    "sky-placement/article/venus/scorpio",
    "sky-placement/article/venus/sagittarius",
    "sky-placement/article/venus/capricorn",
    "sky-placement/article/venus/aquarius",
    "sky-placement/article/venus/pisces",
    "sky-placement/article/mars/aries",
    "sky-placement/article/mars/taurus",
    "sky-placement/article/mars/gemini",
    "sky-placement/article/mars/cancer",
    "sky-placement/article/mars/leo",
    "sky-placement/article/mars/virgo",
    "sky-placement/article/mars/libra",
    "sky-placement/article/mars/scorpio",
    "sky-placement/article/mars/sagittarius",
    "sky-placement/article/mars/capricorn",
    "sky-placement/article/mars/aquarius",
    "sky-placement/article/mars/pisces",
    "sky-placement/article/jupiter/aries",
    "sky-placement/article/jupiter/taurus",
    "sky-placement/article/jupiter/gemini",
    "sky-placement/article/jupiter/cancer",
    "sky-placement/article/jupiter/leo",
    "sky-placement/article/jupiter/virgo",
    "sky-placement/article/jupiter/libra",
    "sky-placement/article/jupiter/scorpio",
    "sky-placement/article/jupiter/sagittarius",
    "sky-placement/article/jupiter/capricorn",
    "sky-placement/article/jupiter/aquarius",
    "sky-placement/article/jupiter/pisces",
    "sky-placement/article/saturn/aries",
    "sky-placement/article/saturn/taurus",
    "sky-placement/article/saturn/gemini",
    "sky-placement/article/saturn/cancer",
    "sky-placement/article/saturn/leo",
    "sky-placement/article/saturn/virgo",
    "sky-placement/article/saturn/libra",
    "sky-placement/article/saturn/scorpio",
    "sky-placement/article/saturn/sagittarius",
    "sky-placement/article/saturn/capricorn",
    "sky-placement/article/saturn/aquarius",
    "sky-placement/article/saturn/pisces",
    "sky-placement/article/uranus/aries",
    "sky-placement/article/uranus/taurus",
    "sky-placement/article/uranus/gemini",
    "sky-placement/article/uranus/cancer",
    "sky-placement/article/uranus/leo",
    "sky-placement/article/uranus/virgo",
    "sky-placement/article/uranus/libra",
    "sky-placement/article/uranus/scorpio",
    "sky-placement/article/uranus/sagittarius",
    "sky-placement/article/uranus/capricorn",
    "sky-placement/article/uranus/aquarius",
    "sky-placement/article/uranus/pisces",
    "sky-placement/article/neptune/aries",
    "sky-placement/article/neptune/taurus",
    "sky-placement/article/neptune/gemini",
    "sky-placement/article/neptune/cancer",
    "sky-placement/article/neptune/leo",
    "sky-placement/article/neptune/virgo",
    "sky-placement/article/neptune/libra",
    "sky-placement/article/neptune/scorpio",
    "sky-placement/article/neptune/sagittarius",
    "sky-placement/article/neptune/capricorn",
    "sky-placement/article/neptune/aquarius",
    "sky-placement/article/neptune/pisces",
    "sky-placement/article/pluto/aries",
    "sky-placement/article/pluto/taurus",
    "sky-placement/article/pluto/gemini",
    "sky-placement/article/pluto/cancer",
    "sky-placement/article/pluto/leo",
    "sky-placement/article/pluto/virgo",
    "sky-placement/article/pluto/libra",
    "sky-placement/article/pluto/scorpio",
    "sky-placement/article/pluto/sagittarius",
    "sky-placement/article/pluto/capricorn",
    "sky-placement/article/pluto/aquarius",
    "sky-placement/article/pluto/pisces",
    "sky-placement/article/chiron/aries",
    "sky-placement/article/chiron/taurus",
    "sky-placement/article/chiron/gemini",
    "sky-placement/article/chiron/cancer",
    "sky-placement/article/chiron/leo",
    "sky-placement/article/chiron/virgo",
    "sky-placement/article/chiron/libra",
    "sky-placement/article/chiron/scorpio",
    "sky-placement/article/chiron/sagittarius",
    "sky-placement/article/chiron/capricorn",
    "sky-placement/article/chiron/aquarius",
    "sky-placement/article/chiron/pisces",
    "sky-lunation/new-moon/aries",
    "sky-lunation/new-moon/taurus",
    "sky-lunation/new-moon/gemini",
    "sky-lunation/new-moon/cancer",
    "sky-lunation/new-moon/leo",
    "sky-lunation/new-moon/virgo",
    "sky-lunation/new-moon/libra",
    "sky-lunation/new-moon/scorpio",
    "sky-lunation/new-moon/sagittarius",
    "sky-lunation/new-moon/capricorn",
    "sky-lunation/new-moon/aquarius",
    "sky-lunation/new-moon/pisces",
    "sky-lunation/full-moon/aries",
    "sky-lunation/full-moon/taurus",
    "sky-lunation/full-moon/gemini",
    "sky-lunation/full-moon/cancer",
    "sky-lunation/full-moon/leo",
    "sky-lunation/full-moon/virgo",
    "sky-lunation/full-moon/libra",
    "sky-lunation/full-moon/scorpio",
    "sky-lunation/full-moon/sagittarius",
    "sky-lunation/full-moon/capricorn",
    "sky-lunation/full-moon/aquarius",
    "sky-lunation/full-moon/pisces",
    "sky-lunation/lunar-eclipse/2025-03-14-virgo",
    "sky-lunation/solar-eclipse/2025-03-29-aries",
    "sky-lunation/lunar-eclipse/2025-09-07-pisces",
    "sky-lunation/solar-eclipse/2025-09-21-virgo",
    "sky-lunation/fallback/solar-eclipse/north-node/aries",
    "sky-lunation/fallback/solar-eclipse/south-node/aries",
    "sky-lunation/fallback/lunar-eclipse/north-node/aries",
    "sky-lunation/fallback/lunar-eclipse/south-node/aries",
    "sky-lunation/fallback/solar-eclipse/north-node/taurus",
    "sky-lunation/fallback/solar-eclipse/south-node/taurus",
    "sky-lunation/fallback/lunar-eclipse/north-node/taurus",
    "sky-lunation/fallback/lunar-eclipse/south-node/taurus",
    "sky-lunation/fallback/solar-eclipse/north-node/gemini",
    "sky-lunation/fallback/solar-eclipse/south-node/gemini",
    "sky-lunation/fallback/lunar-eclipse/north-node/gemini",
    "sky-lunation/fallback/lunar-eclipse/south-node/gemini",
    "sky-lunation/fallback/solar-eclipse/north-node/cancer",
    "sky-lunation/fallback/solar-eclipse/south-node/cancer",
    "sky-lunation/fallback/lunar-eclipse/north-node/cancer",
    "sky-lunation/fallback/lunar-eclipse/south-node/cancer",
    "sky-lunation/fallback/solar-eclipse/north-node/leo",
    "sky-lunation/fallback/solar-eclipse/south-node/leo",
    "sky-lunation/fallback/lunar-eclipse/north-node/leo",
    "sky-lunation/fallback/lunar-eclipse/south-node/leo",
    "sky-lunation/fallback/solar-eclipse/north-node/virgo",
    "sky-lunation/fallback/solar-eclipse/south-node/virgo",
    "sky-lunation/fallback/lunar-eclipse/north-node/virgo",
    "sky-lunation/fallback/lunar-eclipse/south-node/virgo",
    "sky-lunation/fallback/solar-eclipse/north-node/libra",
    "sky-lunation/fallback/solar-eclipse/south-node/libra",
    "sky-lunation/fallback/lunar-eclipse/north-node/libra",
    "sky-lunation/fallback/lunar-eclipse/south-node/libra",
    "sky-lunation/fallback/solar-eclipse/north-node/scorpio",
    "sky-lunation/fallback/solar-eclipse/south-node/scorpio",
    "sky-lunation/fallback/lunar-eclipse/north-node/scorpio",
    "sky-lunation/fallback/lunar-eclipse/south-node/scorpio",
    "sky-lunation/fallback/solar-eclipse/north-node/sagittarius",
    "sky-lunation/fallback/solar-eclipse/south-node/sagittarius",
    "sky-lunation/fallback/lunar-eclipse/north-node/sagittarius",
    "sky-lunation/fallback/lunar-eclipse/south-node/sagittarius",
    "sky-lunation/fallback/solar-eclipse/north-node/capricorn",
    "sky-lunation/fallback/solar-eclipse/south-node/capricorn",
    "sky-lunation/fallback/lunar-eclipse/north-node/capricorn",
    "sky-lunation/fallback/lunar-eclipse/south-node/capricorn",
    "sky-lunation/fallback/solar-eclipse/north-node/aquarius",
    "sky-lunation/fallback/solar-eclipse/south-node/aquarius",
    "sky-lunation/fallback/lunar-eclipse/north-node/aquarius",
    "sky-lunation/fallback/lunar-eclipse/south-node/aquarius",
    "sky-lunation/fallback/solar-eclipse/north-node/pisces",
    "sky-lunation/fallback/solar-eclipse/south-node/pisces",
    "sky-lunation/fallback/lunar-eclipse/north-node/pisces",
    "sky-lunation/fallback/lunar-eclipse/south-node/pisces",
    "sky-v4/eclipse-generic/solar-eclipse/north-node",
    "sky-v4/eclipse-generic/solar-eclipse/south-node",
    "sky-v4/eclipse-generic/lunar-eclipse/north-node",
    "sky-v4/eclipse-generic/lunar-eclipse/south-node",
    "sky-nodes/axis/aries-libra",
    "sky-nodes/axis/taurus-scorpio",
    "sky-nodes/axis/gemini-sagittarius",
    "sky-nodes/axis/cancer-capricorn",
    "sky-nodes/axis/leo-aquarius",
    "sky-nodes/axis/virgo-pisces",
    "sky-nodes/axis/libra-aries",
    "sky-nodes/axis/scorpio-taurus",
    "sky-nodes/axis/sagittarius-gemini",
    "sky-nodes/axis/capricorn-cancer",
    "sky-nodes/axis/aquarius-leo",
    "sky-nodes/axis/pisces-virgo",
    "sky-nodes/north-node/aries",
    "sky-nodes/north-node/taurus",
    "sky-nodes/north-node/gemini",
    "sky-nodes/north-node/cancer",
    "sky-nodes/north-node/leo",
    "sky-nodes/north-node/virgo",
    "sky-nodes/north-node/libra",
    "sky-nodes/north-node/scorpio",
    "sky-nodes/north-node/sagittarius",
    "sky-nodes/north-node/capricorn",
    "sky-nodes/north-node/aquarius",
    "sky-nodes/north-node/pisces",
    "sky-nodes/south-node/aries",
    "sky-nodes/south-node/taurus",
    "sky-nodes/south-node/gemini",
    "sky-nodes/south-node/cancer",
    "sky-nodes/south-node/leo",
    "sky-nodes/south-node/virgo",
    "sky-nodes/south-node/libra",
    "sky-nodes/south-node/scorpio",
    "sky-nodes/south-node/sagittarius",
    "sky-nodes/south-node/capricorn",
    "sky-nodes/south-node/aquarius",
    "sky-nodes/south-node/pisces",
    "sky-nodes/education",
    "sky-lilith/article/aries",
    "sky-lilith/article/taurus",
    "sky-lilith/article/gemini",
    "sky-lilith/article/cancer",
    "sky-lilith/article/leo",
    "sky-lilith/article/virgo",
    "sky-lilith/article/libra",
    "sky-lilith/article/scorpio",
    "sky-lilith/article/sagittarius",
    "sky-lilith/article/capricorn",
    "sky-lilith/article/aquarius",
    "sky-lilith/article/pisces",
    "sky-lilith/station",
    "sky-placement/retrograde/mercury",
    "sky-placement/retrograde/venus",
    "sky-placement/retrograde/mars",
    "sky-placement/retrograde/jupiter",
    "sky-placement/retrograde/saturn",
    "sky-placement/retrograde/uranus",
    "sky-placement/retrograde/neptune",
    "sky-placement/retrograde/pluto",
    "sky-placement/retrograde/chiron",
    "sky-context/venus/aries/retrograde/mercury-retrograde-aries",
    "sky-context/venus/pisces/retrograde/mercury-retrograde-pisces",
    "sky-context/venus/aries/retrograde/solar-eclipse-aries",
    "sky-context/neptune/aries/direct/solar-eclipse-aries",
    "sky-context/new-moon/pisces/lunation/neptune-pisces",
    "sky-context/sun/pisces/direct/venus-retrograde-pisces",
    "sky-context/venus/pisces/retrograde/virgo-lunar-eclipse",
    "sky-context/venus/pisces/retrograde/neptune-ingress-aries",
    "sky-context/mercury/aries/retrograde/virgo-lunar-eclipse",
    "sky-placement/seasonal-context/aries/northern",
    "sky-placement/seasonal-context/aries/southern",
    "sky-placement/seasonal-context/aries/neutral",
    "sky-placement/seasonal-context/cancer/northern",
    "sky-placement/seasonal-context/cancer/southern",
    "sky-placement/seasonal-context/cancer/neutral",
    "sky-placement/seasonal-context/libra/northern",
    "sky-placement/seasonal-context/libra/southern",
    "sky-placement/seasonal-context/libra/neutral",
    "sky-placement/seasonal-context/capricorn/northern",
    "sky-placement/seasonal-context/capricorn/southern",
    "sky-placement/seasonal-context/capricorn/neutral"
  ],
  configuration_records: {
    review_category: "configuration",
    review_status: "needs_review",
    owner_approved: false,
    serving_enabled: false,
    expected_template_records: 24,
    overlay_settings_key: "sky-v4/settings/contextual-overlays"
  },
  explicit_exclusions: [
    "unrelated pre-existing aspect corpus",
    "content.retrogradeSignLookup structural lookup records",
    "24 Mustache/template records as reader-writing approval",
    "sky-v4/settings/contextual-overlays as reader-writing approval"
  ]
};

// apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-serving-release-v1.json
var sky_v4_reader_copy_280_serving_release_v1_default = {
  schema: "tldrastro-sky-v4-serving-release/v1",
  release_id: "sky-v4-reader-copy-280-serving-release-2026-08-31",
  owner_decision_date: "2026-08-31",
  canonical_package_version: "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30",
  canonical_json_sha256: "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750",
  approval_ledger: "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json",
  approval_id: "sky-v4-reader-copy-280-owner-approval-2026-08-31",
  released_keys_sha256: "b641e7bc7abe4bb8018500b7da8488ff08dfe83a6325d6df71d311f83e12f17b",
  expected_serving_records: 280,
  expected_counts_by_content_type: {
    "continuous-placement": 120,
    "new-moon": 12,
    "full-moon": 12,
    "eclipse-event": 4,
    "eclipse-fallback": 48,
    "generic-eclipse-fallback": 4,
    "node-axis": 12,
    "node-module": 24,
    "node-education": 1,
    lilith: 12,
    "lilith-station": 1,
    retrograde: 9,
    overlay: 9,
    seasonal: 12
  },
  serving_enabled: true,
  resolver_conditional: true,
  configuration_records_excluded: 25,
  unrelated_aspect_records_excluded: true,
  release_record: "packages/astro-knowledge/review/sky-v4-reader-copy-280-serving-release-2026-08-31/OWNER-SERVING-DECISION.md"
};

// apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs
var SKY_V4_CANONICAL_PACKAGE_VERSION = "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30";
var SKY_V4_CANONICAL_JSON_SHA256 = "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750";
var SIGNS = Object.freeze([
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
var CONTINUOUS_PLANETS = Object.freeze([
  "sun",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron"
]);
var CONTINUOUS_OWNER_APPROVED_KEYS = new Set(sky_v4_continuous_120_owner_approval_v1_default.approved_keys);
var READER_COPY_OWNER_APPROVED_KEYS = new Set(sky_v4_reader_copy_280_owner_approval_v1_default.approved_keys);
var READER_COPY_SERVING_KEYS = new Set(sky_v4_reader_copy_280_owner_approval_v1_default.approved_keys);
var SKY_V4_CONFIGURATION_TYPES = /* @__PURE__ */ new Set(["template", "overlay-settings"]);
var SKY_V4_OVERLAY_DEFAULTS = Object.freeze({
  contextualTransitOverlaysEnabled: true,
  includeContextualOverlayInFallbackHook: false,
  maxFullPageOverlays: 2,
  maxFallbackOverlays: 1
});
function text(value) {
  return typeof value === "string" ? value : "";
}
function lower(value) {
  return text(value).trim().toLowerCase();
}
function slug(value) {
  return lower(value).replace(/[\s_]+/gu, "-");
}
function title3(value) {
  return text(value).trim().replace(/[-_]+/gu, " ").replace(/\b\w/gu, (match) => match.toUpperCase());
}
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function sha256(value) {
  return sha256Text(value);
}
function valueAt(source, path) {
  return path.split(".").reduce((current, part) => record(current)[part], source);
}
function required(value, label) {
  const resolved = text(value);
  if (!resolved.trim()) throw new Error(`SKY_V4_SOURCE_GAP: ${label}`);
  return resolved;
}
function withoutUnresolvedSlots(value) {
  const unresolved = text(value).match(/\{\{[^}]+\}\}/gu) ?? [];
  if (unresolved.length) {
    throw new Error(`SKY_V4_SOURCE_GAP: unresolved slots ${[...new Set(unresolved)].join(", ")}`);
  }
  return text(value).trim();
}
function fillFacts(value, facts) {
  return text(value).replace(/\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu, (match, key) => Object.hasOwn(facts, key) ? text(facts[key]) : match);
}
function assertSkyV4CanonicalPackage(corpus) {
  if (corpus?.packageVersion !== SKY_V4_CANONICAL_PACKAGE_VERSION) {
    throw new Error(`SKY_V4_GOVERNANCE: expected ${SKY_V4_CANONICAL_PACKAGE_VERSION}.`);
  }
  if (corpus?.servingEnabled !== false) {
    throw new Error("SKY_V4_GOVERNANCE: canonical handoff must remain non-serving.");
  }
  if (corpus?.packageStatus !== "READY_FOR_OWNER_REVIEW_BEFORE_CODEX") {
    throw new Error("SKY_V4_GOVERNANCE: unexpected package review state.");
  }
  const articles = corpus?.content?.continuous ?? [];
  const keys = new Set(articles.map((article) => article.contentKey));
  if (articles.length !== 120 || keys.size !== 120) {
    throw new Error("SKY_V4_GOVERNANCE: continuous corpus must contain 120 unique records.");
  }
  for (const planet of CONTINUOUS_PLANETS) {
    for (const sign of SIGNS) {
      if (!keys.has(`sky-placement/article/${planet}/${sign}`)) {
        throw new Error(`SKY_V4_GOVERNANCE: missing sky-placement/article/${planet}/${sign}.`);
      }
    }
  }
  return corpus;
}
function assertSkyV4ContinuousOwnerApproval(corpus) {
  assertSkyV4CanonicalPackage(corpus);
  const continuousKeys = new Set(corpus.content.continuous.map((row) => row.contentKey));
  if (sky_v4_continuous_120_owner_approval_v1_default.canonical_package_version !== SKY_V4_CANONICAL_PACKAGE_VERSION) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval package version mismatch.");
  }
  if (sky_v4_continuous_120_owner_approval_v1_default.canonical_json_sha256 !== SKY_V4_CANONICAL_JSON_SHA256) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval canonical hash mismatch.");
  }
  if (sky_v4_continuous_120_owner_approval_v1_default.review_status !== "approved" || sky_v4_continuous_120_owner_approval_v1_default.owner_approved !== true || sky_v4_continuous_120_owner_approval_v1_default.serving_enabled !== false) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval lifecycle state is invalid.");
  }
  if (CONTINUOUS_OWNER_APPROVED_KEYS.size !== 120) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval must contain 120 unique keys.");
  }
  for (const key of CONTINUOUS_OWNER_APPROVED_KEYS) {
    if (!continuousKeys.has(key)) {
      throw new Error(`SKY_V4_GOVERNANCE: approval contains non-canonical key ${key}.`);
    }
  }
  for (const key of continuousKeys) {
    if (!CONTINUOUS_OWNER_APPROVED_KEYS.has(key)) {
      throw new Error(`SKY_V4_GOVERNANCE: canonical continuous key lacks explicit approval ${key}.`);
    }
  }
  return sky_v4_continuous_120_owner_approval_v1_default;
}
function assertSkyV4ReaderCopyOwnerApproval(corpus, records = []) {
  assertSkyV4ContinuousOwnerApproval(corpus);
  if (sky_v4_reader_copy_280_owner_approval_v1_default.canonical_package_version !== SKY_V4_CANONICAL_PACKAGE_VERSION) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval package version mismatch.");
  }
  if (sky_v4_reader_copy_280_owner_approval_v1_default.canonical_json_sha256 !== SKY_V4_CANONICAL_JSON_SHA256) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval canonical hash mismatch.");
  }
  if (sky_v4_reader_copy_280_owner_approval_v1_default.review_status !== "approved" || sky_v4_reader_copy_280_owner_approval_v1_default.owner_approved !== true || sky_v4_reader_copy_280_owner_approval_v1_default.serving_enabled !== false) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval lifecycle state is invalid.");
  }
  if (sky_v4_reader_copy_280_owner_approval_v1_default.expected_approved_reader_records !== 280 || sky_v4_reader_copy_280_owner_approval_v1_default.expected_additional_reader_records !== 160 || READER_COPY_OWNER_APPROVED_KEYS.size !== 280) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval must contain exactly 280 unique keys and 160 additions.");
  }
  for (const key of CONTINUOUS_OWNER_APPROVED_KEYS) {
    if (!READER_COPY_OWNER_APPROVED_KEYS.has(key)) {
      throw new Error(`SKY_V4_GOVERNANCE: expanded approval lost prior continuous key ${key}.`);
    }
  }
  if (records.length) {
    const recordsByKey = new Map(records.map((row) => [row.contentKey, row]));
    const approvedRecords = records.filter((row) => row.owner_approved === true);
    const configurationRecords = records.filter((row) => SKY_V4_CONFIGURATION_TYPES.has(row.studio_content_type));
    if (records.length !== 305 || approvedRecords.length !== 280 || configurationRecords.length !== 25) {
      throw new Error("SKY_V4_GOVERNANCE: expected 305 records: 280 reader-copy approvals and 25 configuration records.");
    }
    for (const key of READER_COPY_OWNER_APPROVED_KEYS) {
      const row = recordsByKey.get(key);
      if (!row) throw new Error(`SKY_V4_GOVERNANCE: approval contains non-canonical key ${key}.`);
      const expectedFields = sky_v4_reader_copy_280_owner_approval_v1_default.approved_fields_by_content_type[row.studio_content_type];
      const editableFields = row.studio_editable_fields.map((field) => field.path);
      if (JSON.stringify(row.owner_approved_fields) !== JSON.stringify(expectedFields)) {
        throw new Error(`SKY_V4_GOVERNANCE: approved-field mismatch for ${key}.`);
      }
      if (JSON.stringify(editableFields) !== JSON.stringify(expectedFields)) {
        throw new Error(`SKY_V4_GOVERNANCE: editable-field contract drift for ${key}.`);
      }
    }
    if (configurationRecords.some((row) => row.review_status !== "needs_review" || row.owner_approved !== false || row.serving_enabled !== false || row.studio_review_category !== "configuration")) {
      throw new Error("SKY_V4_GOVERNANCE: templates and overlay settings must remain non-serving configuration, not approved prose.");
    }
    const servingRecords = records.filter((row) => row.serving_enabled === true);
    if (servingRecords.length !== 280 || servingRecords.some((row) => !READER_COPY_SERVING_KEYS.has(row.contentKey))) {
      throw new Error("SKY_V4_GOVERNANCE: exactly the 280 explicitly released reader records must be serving-enabled.");
    }
  }
  return sky_v4_reader_copy_280_owner_approval_v1_default;
}
function assertSkyV4ReaderCopyServingRelease(corpus) {
  assertSkyV4ReaderCopyOwnerApproval(corpus);
  const releasedKeysSha256 = sha256(JSON.stringify(sky_v4_reader_copy_280_owner_approval_v1_default.approved_keys));
  const expectedCounts = sky_v4_reader_copy_280_owner_approval_v1_default.expected_counts_by_content_type;
  if (sky_v4_reader_copy_280_serving_release_v1_default.schema !== "tldrastro-sky-v4-serving-release/v1" || sky_v4_reader_copy_280_serving_release_v1_default.canonical_package_version !== SKY_V4_CANONICAL_PACKAGE_VERSION || sky_v4_reader_copy_280_serving_release_v1_default.canonical_json_sha256 !== SKY_V4_CANONICAL_JSON_SHA256 || sky_v4_reader_copy_280_serving_release_v1_default.approval_id !== sky_v4_reader_copy_280_owner_approval_v1_default.approval_id || sky_v4_reader_copy_280_serving_release_v1_default.expected_serving_records !== 280 || sky_v4_reader_copy_280_serving_release_v1_default.serving_enabled !== true || sky_v4_reader_copy_280_serving_release_v1_default.resolver_conditional !== true || sky_v4_reader_copy_280_serving_release_v1_default.configuration_records_excluded !== 25 || sky_v4_reader_copy_280_serving_release_v1_default.released_keys_sha256 !== releasedKeysSha256 || JSON.stringify(sky_v4_reader_copy_280_serving_release_v1_default.expected_counts_by_content_type) !== JSON.stringify(expectedCounts) || READER_COPY_SERVING_KEYS.size !== 280) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy serving release is invalid or stale.");
  }
  return sky_v4_reader_copy_280_serving_release_v1_default;
}
function studioRecord({
  source,
  contentKey,
  contentType,
  headline,
  body,
  summary = "",
  editableFields,
  readOnlyFields,
  sourceUrls = [],
  ownerPhraseAnchors = [],
  contentRole = "full_copy"
}) {
  const baseline = structuredClone(source);
  const baselineJson = JSON.stringify(baseline);
  const approvedFields = READER_COPY_OWNER_APPROVED_KEYS.has(contentKey) ? sky_v4_reader_copy_280_owner_approval_v1_default.approved_fields_by_content_type[contentType] ?? [] : [];
  const ownerApproved = approvedFields.length > 0;
  const servingEnabled = ownerApproved && READER_COPY_SERVING_KEYS.has(contentKey);
  const configuration = SKY_V4_CONFIGURATION_TYPES.has(contentType);
  return {
    ...source,
    contentKey,
    headline,
    body_you: body,
    summary,
    content_role: contentRole,
    review_status: ownerApproved ? sky_v4_reader_copy_280_owner_approval_v1_default.review_status : "needs_review",
    surface: "sky",
    render_policy: "sky-v4-canonical-stage-preview",
    source_package: SKY_V4_CANONICAL_PACKAGE_VERSION,
    source_baseline_sha256: sha256(baselineJson),
    studio_content_type: contentType,
    studio_editable_fields: editableFields,
    studio_read_only_fields: readOnlyFields,
    studio_source_urls: sourceUrls.filter(Boolean),
    studio_owner_phrase_anchors: ownerPhraseAnchors.filter(Boolean),
    studio_source_baseline: baseline,
    studio_version_status: servingEnabled ? "approved-serving-baseline" : "draft",
    studio_review_category: configuration ? "configuration" : ownerApproved ? "owner-approved-reader-copy" : "reader-copy",
    owner_approved: ownerApproved,
    serving_enabled: servingEnabled,
    ...ownerApproved ? {
      approved_via: sky_v4_reader_copy_280_owner_approval_v1_default.approval_record,
      owner_approval_id: sky_v4_reader_copy_280_owner_approval_v1_default.approval_id,
      owner_approval_lineage: contentType === "continuous-placement" ? [sky_v4_continuous_120_owner_approval_v1_default.approval_record, sky_v4_reader_copy_280_owner_approval_v1_default.approval_record] : [sky_v4_reader_copy_280_owner_approval_v1_default.approval_record],
      owner_approved_fields: approvedFields
    } : {},
    note: ownerApproved ? "Canonical SKY V4 reader copy is owner-approved and explicitly released against the immutable package hash. Any edit creates a separate non-serving draft; the approved serving baseline remains unchanged." : configuration ? "Canonical SKY V4 configuration record. It is not reader prose and remains outside the writing-approval queue." : "Canonical SKY V4 stage-only Content Studio record. The immutable package baseline is retained; edits create non-serving draft versions."
  };
}
function anchors(value) {
  return text(value).split("|").map((entry) => entry.trim()).filter(Boolean);
}
function continuousStudioRecords(corpus) {
  return corpus.content.continuous.map((row) => studioRecord({
    source: row,
    contentKey: row.contentKey,
    contentType: "continuous-placement",
    headline: `${row.planet} in ${row.sign}`,
    body: row.placementArticle,
    summary: row.tldrTakeaway,
    editableFields: [
      { path: "tldrWhat", label: "TLDR What" },
      { path: "tldrTakeaway", label: "TLDR Takeaway" },
      { path: "placementArticle", label: "Placement article" },
      { path: "fallback.hook", label: "Fallback opening" },
      { path: "fallback.lived", label: "Fallback: how it shows up" },
      { path: "fallback.turn", label: "Fallback: challenge and response" }
    ],
    readOnlyFields: ["planet", "sign", "contentKey", "sourceExactStatus", "sourcePrimary", "sourceSecondary"],
    sourceUrls: [row.sourcePrimary, row.sourceSecondary],
    ownerPhraseAnchors: anchors(row.ownerPhraseAnchors)
  }));
}
function newMoonStudioRecords(corpus) {
  return corpus.content.newMoon.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "new-moon",
    headline: `New Moon in ${row.Sign}`,
    body: row.NewMoonArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "NewMoonArticle", label: "New Moon article" }
    ],
    readOnlyFields: ["Sign", "ContentKey", "CycleRole", "PrimarySource", "SecondarySource"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors)
  }));
}
function fullMoonStudioRecords(corpus) {
  return corpus.content.fullMoon.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "full-moon",
    headline: `Full Moon in ${row.MoonSign}`,
    body: row.FullMoonArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "FullMoonArticle", label: "Full Moon article" }
    ],
    readOnlyFields: ["MoonSign", "SunSign", "Axis", "ContentKey", "PrimarySource", "SecondarySource"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors)
  }));
}
function eclipseEventStudioRecords(corpus) {
  return corpus.content.eclipseEvents.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "eclipse-event",
    headline: row.Event,
    body: row.EventArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "EventArticle", label: "Eclipse event article" }
    ],
    readOnlyFields: ["Event", "Type", "MoonSign", "SunSign", "Axis", "NodeRelation", "ContentKey"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors)
  }));
}
function eclipseFallbackStudioRecords(corpus) {
  return corpus.content.eclipseFallbacks.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "eclipse-fallback",
    headline: `${row.NodeRelation} ${row.EclipseType} in ${row.EclipseSign}`,
    body: row.FallbackArticle,
    editableFields: [
      { path: "Hook", label: "Fallback opening" },
      { path: "Lived", label: "Fallback: how it shows up" },
      { path: "Turn", label: "Fallback: challenge and response" }
    ],
    readOnlyFields: ["EclipseType", "NodeRelation", "EclipseSign", "OppositeSign", "Axis", "ContentKey"],
    sourceUrls: [row.PrimaryMarieSource, row.SecondaryMarieSource],
    ownerPhraseAnchors: anchors(row.ExactPhraseOrIdeaAnchors),
    contentRole: "fallback_hook"
  }));
}
function genericEclipseStudioRecords(corpus) {
  return corpus.content.eclipseGenericFallbacks.map((row) => studioRecord({
    source: row,
    contentKey: `sky-v4/eclipse-generic/${lower(row.EclipseType)}/${lower(row.NodeRelation)}`.replace(/\s+/gu, "-"),
    contentType: "generic-eclipse-fallback",
    headline: `${row.NodeRelation} ${row.EclipseType} fallback`,
    body: row.ModifierArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "ModifierArticle", label: "Generic eclipse fallback" }
    ],
    readOnlyFields: ["EclipseType", "NodeRelation", "Mechanism", "RequiredSeriesFields"],
    sourceUrls: [row.PrimaryMarieSource],
    ownerPhraseAnchors: anchors(row.MariePhraseAnchors),
    contentRole: "fallback_hook"
  }));
}
function nodeStudioRecords(corpus) {
  const axes = corpus.content.nodeAxes.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "node-axis",
    headline: `North Node in ${row.NorthSign} / South Node in ${row.SouthSign}`,
    body: row.NodeAxisArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_North", label: "TLDR North Node" },
      { path: "TLDR_South", label: "TLDR South Node" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "NodeAxisArticle", label: "Node axis article" }
    ],
    readOnlyFields: ["NorthSign", "SouthSign", "Axis", "ContentKey"],
    sourceUrls: [row.PrimarySource, row.SecondarySource]
  }));
  const modules = [
    ...corpus.content.northNodeModules.map((row) => ({ ...row, Node: "North" })),
    ...corpus.content.southNodeModules.map((row) => ({ ...row, Node: "South" }))
  ].map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "node-module",
    headline: `${row.Node} Node in ${row.Sign}`,
    body: row.ExactIngressCopy,
    editableFields: [{ path: "ExactIngressCopy", label: "Draft override of exact ingress copy" }],
    readOnlyFields: ["Node", "Sign", "OpposingSouthSign", "OpposingNorthSign", "ContentKey", "Mechanism", "OwnerApprovedForSourceRole"],
    sourceUrls: [row.Source]
  }));
  const education = corpus.content.nodeEducation.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "node-education",
    headline: row.Module,
    body: row.Article,
    editableFields: [{ path: "Article", label: "Node education article" }],
    readOnlyFields: ["Module", "ContentKey", "Governance"]
  }));
  return [...axes, ...modules, ...education];
}
function lilithStudioRecords(corpus) {
  const articles = corpus.content.lilith.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "lilith",
    headline: `Lilith in ${row.Sign}`,
    body: row.LilithArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "LilithArticle", label: "Lilith article" }
    ],
    readOnlyFields: ["Sign", "ContentKey", "ObjectType", "PointType", "Exact_Tagline", "Exact_Hook", "Exact_Lived", "Exact_Turn"],
    sourceUrls: [row.PrimarySource]
  }));
  const stations = corpus.content.lilithCurrentConditions.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "lilith-station",
    headline: row.Headline,
    body: row.Body,
    editableFields: [
      { path: "Headline", label: "Station headline draft" },
      { path: "Body", label: "Station body draft" }
    ],
    readOnlyFields: ["Condition", "ContentKey", "RuntimeRule", "Governance"],
    sourceUrls: [row.Source],
    contentRole: "fallback_hook"
  }));
  return [...articles, ...stations];
}
function retrogradeStudioRecords(corpus) {
  return corpus.content.retrogradeGeneric.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "retrograde",
    headline: `${row.Planet} retrograde modifier`,
    body: row.Body,
    summary: row.CanonicalShort,
    editableFields: [
      { path: "CanonicalShort", label: "Short retrograde copy draft" },
      { path: "Body", label: "Retrograde body draft" }
    ],
    readOnlyFields: ["Planet", "ContentKey", "CopyPolicy", "AllowParaphrase", "ShortOwnerApproved", "BodyOwnerApproved"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.OwnerPhraseAnchors),
    contentRole: "fallback_hook"
  }));
}
function overlayStudioRecords(corpus) {
  return corpus.content.contextualTransitOverlays.map((row) => studioRecord({
    source: row,
    contentKey: row.OverlayKey,
    contentType: "overlay",
    headline: `${row.SubjectBody} in ${row.SubjectSign}: ${row.ContextBodyOrEvent}`,
    body: row.OverlayBody,
    summary: row.FallbackHookOverlay,
    editableFields: [
      { path: "OverlayBody", label: "Full-page contextual overlay" },
      { path: "FallbackHookOverlay", label: "Fallback contextual overlay" }
    ],
    readOnlyFields: [
      "OverlayKey",
      "SubjectFamily",
      "SubjectBody",
      "SubjectSign",
      "SubjectCondition",
      "ContextKind",
      "ContextBodyOrEvent",
      "ContextSign",
      "ContextCondition",
      "TriggerMode",
      "SameSign",
      "SameAxis",
      "SuppressIfExactAspectDuplicate",
      "SuppressIfEventArticleOwnsMechanism"
    ],
    sourceUrls: [row.PrimaryMarieSource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors),
    contentRole: "fallback_hook"
  }));
}
function seasonalStudioRecords(corpus) {
  return corpus.content.seasonalContext.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "seasonal",
    headline: `${row.Sign} seasonal context (${row.Hemisphere})`,
    body: row.Copy,
    editableFields: [{ path: "Copy", label: "Seasonal context copy" }],
    readOnlyFields: ["Sign", "Hemisphere", "ContentKey"],
    sourceUrls: [row.Source],
    contentRole: "fallback_hook"
  }));
}
function templateStudioRecords(corpus) {
  const templates = Object.entries(corpus.templates).flatMap(([family, rows]) => rows.filter((row) => text(row.TemplateID) && text(row.Template)).map((row) => studioRecord({
    source: row,
    contentKey: `sky-v4/template/${family}/${row.TemplateID}`,
    contentType: "template",
    headline: row.Purpose,
    body: row.Template,
    editableFields: [{ path: "Template", label: "Mustache template" }],
    readOnlyFields: ["TemplateID", "Purpose", "Contract"],
    contentRole: "template"
  })));
  const overlaySettings = studioRecord({
    source: {
      contextualTransitOverlaysEnabled: true,
      includeContextualOverlayInFallbackHook: false,
      maxFullPageOverlays: 2,
      maxFallbackOverlays: 1,
      contract: corpus.runtime.contentStudioOverlaySettings
    },
    contentKey: "sky-v4/settings/contextual-overlays",
    contentType: "overlay-settings",
    headline: "SKY V4 contextual overlay settings",
    body: "Contextual transit overlays are enabled for full-page previews. Fallback-hook overlays remain off unless the editor enables the independent child toggle.",
    editableFields: [
      { path: "contextualTransitOverlaysEnabled", label: "Use contextual transit overlays" },
      { path: "includeContextualOverlayInFallbackHook", label: "Include transit context in fallback hook" }
    ],
    readOnlyFields: ["maxFullPageOverlays", "maxFallbackOverlays", "contract"],
    contentRole: "template"
  });
  return [...templates, overlaySettings];
}
function skyV4ContentStudioRecords(corpus) {
  assertSkyV4CanonicalPackage(corpus);
  assertSkyV4ReaderCopyServingRelease(corpus);
  const records = [
    ...continuousStudioRecords(corpus),
    ...newMoonStudioRecords(corpus),
    ...fullMoonStudioRecords(corpus),
    ...eclipseEventStudioRecords(corpus),
    ...eclipseFallbackStudioRecords(corpus),
    ...genericEclipseStudioRecords(corpus),
    ...nodeStudioRecords(corpus),
    ...lilithStudioRecords(corpus),
    ...retrogradeStudioRecords(corpus),
    ...overlayStudioRecords(corpus),
    ...seasonalStudioRecords(corpus),
    ...templateStudioRecords(corpus)
  ];
  assertSkyV4ReaderCopyOwnerApproval(corpus, records);
  return records;
}
function continuousArticleFor(corpus, planet, sign) {
  assertSkyV4CanonicalPackage(corpus);
  const key = `sky-placement/article/${lower(planet)}/${lower(sign)}`;
  return corpus.content.continuous.find((row) => row.contentKey === key) ?? null;
}
function overlayMatches(overlay, input) {
  return lower(overlay.SubjectFamily) === lower(input.subjectFamily) && lower(overlay.SubjectBody) === lower(input.subjectBody) && lower(overlay.SubjectSign) === lower(input.subjectSign) && lower(overlay.SubjectCondition) === lower(input.subjectCondition) && lower(overlay.ContextKind) === lower(input.contextKind) && lower(overlay.ContextBodyOrEvent) === lower(input.contextBodyOrEvent) && lower(overlay.ContextSign) === lower(input.contextSign) && lower(overlay.ContextCondition) === lower(input.contextCondition);
}
function resolveSkyV4ContextualOverlays(corpus, contexts = [], settings = {}, suppressions = {}, scope = "full-page") {
  assertSkyV4CanonicalPackage(corpus);
  const options = { ...SKY_V4_OVERLAY_DEFAULTS, ...settings };
  if (!options.contextualTransitOverlaysEnabled) return [];
  const fallbackScope = scope === "fallback";
  const limit = fallbackScope ? options.maxFallbackOverlays : options.maxFullPageOverlays;
  return corpus.content.contextualTransitOverlays.filter((overlay) => contexts.some((context) => overlayMatches(overlay, context))).filter((overlay) => !(overlay.SuppressIfExactAspectDuplicate && suppressions.exactAspectDuplicateKeys?.includes(overlay.OverlayKey))).filter((overlay) => !(overlay.SuppressIfEventArticleOwnsMechanism && suppressions.eventOwnedMechanismKeys?.includes(overlay.OverlayKey))).filter((overlay) => !fallbackScope || overlay.FallbackHookEligible === true).sort((left, right) => Number(left.Priority) - Number(right.Priority) || left.OverlayKey.localeCompare(right.OverlayKey)).slice(0, Math.max(0, Number(limit) || 0));
}
function selectSkyV4Aspects(aspects = [], { subjectBody, eventContextAspectIds = [], lumination = false } = {}) {
  const subject = lower(subjectBody);
  const explicit = new Set(eventContextAspectIds.map(String));
  return aspects.filter((aspect) => aspect?.approved === true).filter((aspect) => {
    const bodies = [lower(aspect.bodyA), lower(aspect.bodyB)];
    if (lumination) return bodies.includes("sun") || bodies.includes("moon") || explicit.has(String(aspect.id));
    return bodies.includes(subject);
  }).sort((left, right) => text(left.exactDateTime).localeCompare(text(right.exactDateTime)) || Number(left.orb ?? Infinity) - Number(right.orb ?? Infinity) || text(left.id).localeCompare(text(right.id)));
}
function resolveSkyV4Retrograde(corpus, { body, sign, exactCopy = "", stationSupported = false } = {}) {
  assertSkyV4CanonicalPackage(corpus);
  const normalizedBody = lower(body);
  if (["sun", "moon"].includes(normalizedBody)) return { resolution: "omit", body: "" };
  if (["north-node", "south-node", "north node", "south node", "nodes", "lunar nodes"].includes(normalizedBody)) {
    return { resolution: "node-motion-education", body: "" };
  }
  if (["lilith", "black moon lilith"].includes(normalizedBody)) {
    const station = stationSupported ? corpus.content.lilithCurrentConditions[0] : null;
    return {
      resolution: station ? "lilith-station" : "omit",
      body: station?.Body ?? "",
      lookupKey: station?.ContentKey ?? null
    };
  }
  if (text(exactCopy).trim()) return { resolution: "exact-sign", body: exactCopy, lookupKey: `${normalizedBody}|${lower(sign)}|retrograde` };
  const generic = corpus.content.retrogradeGeneric.find((row) => lower(row.Planet) === normalizedBody);
  return { resolution: generic ? "generic-body" : "omit", body: generic?.Body ?? "", lookupKey: generic?.ContentKey ?? null };
}
function resolveSkyV4EclipseMainBody(corpus, {
  exactEventKey = "",
  eclipseType,
  nodeRelation,
  eclipseSign,
  exactAvailable = true,
  signFallbackAvailable = true,
  genericFallbackAvailable = true
} = {}) {
  assertSkyV4CanonicalPackage(corpus);
  const exact = exactAvailable ? corpus.content.eclipseEvents.find((row) => row.ContentKey === exactEventKey) : null;
  if (exact) return { resolution: "exact-event", contentKey: exact.ContentKey, body: exact.EventArticle };
  const signAware = signFallbackAvailable ? corpus.content.eclipseFallbacks.find((row) => slug(row.EclipseType) === slug(eclipseType) && slug(row.NodeRelation) === slug(nodeRelation) && lower(row.EclipseSign) === lower(eclipseSign)) : null;
  if (signAware) return { resolution: "sign-aware-fallback", contentKey: signAware.ContentKey, body: [signAware.Hook, signAware.Lived, signAware.Turn].join("\n\n") };
  const generic = genericFallbackAvailable ? corpus.content.eclipseGenericFallbacks.find((row) => slug(row.EclipseType) === slug(eclipseType) && slug(row.NodeRelation) === slug(nodeRelation)) : null;
  if (generic) return {
    resolution: "generic-type-node-fallback",
    contentKey: `sky-v4/eclipse-generic/${lower(generic.EclipseType)}/${lower(generic.NodeRelation)}`.replace(/\s+/gu, "-"),
    body: generic.ModifierArticle
  };
  return { resolution: "facts-only", contentKey: null, body: "" };
}
function resolveSkyV4Lunation(corpus, { phase, sign, articleAvailable = true } = {}) {
  assertSkyV4CanonicalPackage(corpus);
  const isFull = lower(phase) === "full-moon";
  const row = articleAvailable ? isFull ? corpus.content.fullMoon.find((item) => lower(item.MoonSign) === lower(sign)) : corpus.content.newMoon.find((item) => lower(item.Sign) === lower(sign)) : null;
  if (!row) return { resolution: "facts-only", body: "", axis: null };
  return {
    resolution: "canonical-lunation",
    body: isFull ? row.FullMoonArticle : row.NewMoonArticle,
    axis: isFull ? { moonSign: row.MoonSign, sunSign: row.SunSign, axis: row.Axis } : null,
    contentKey: row.ContentKey
  };
}
function renderCondition(condition) {
  return `### ${required(condition.headline, "condition headline")}
${required(condition.dateLine, "condition date line")}

${required(condition.body, "condition body")}`;
}
function renderAspect(aspect) {
  return `### ${required(aspect.headline, "aspect headline")}
${required(aspect.dateLine, "aspect date line")}

${required(aspect.body, "aspect body")}`;
}
function renderSkyV4ContinuousPreview(corpus, input) {
  const article = input.articleOverride ?? continuousArticleFor(corpus, input.planet, input.sign);
  const facts = input.facts ?? {};
  const fullArticle = article && input.articleAvailable !== false ? withoutUnresolvedSlots(fillFacts(article.placementArticle, facts)) : "";
  const overlays = resolveSkyV4ContextualOverlays(corpus, input.contexts, input.overlaySettings, input.overlaySuppressions);
  const fallbackOverlays = resolveSkyV4ContextualOverlays(
    corpus,
    input.contexts,
    input.overlaySettings,
    input.overlaySuppressions,
    "fallback"
  );
  const fallbackOverlay = input.overlaySettings?.includeContextualOverlayInFallbackHook ? fallbackOverlays[0]?.FallbackHookOverlay ?? "" : "";
  const fallback = article && input.fallbackAvailable !== false ? [article.fallback?.hook, fallbackOverlay, article.fallback?.lived, article.fallback?.turn].filter(Boolean).map((part) => withoutUnresolvedSlots(fillFacts(part, facts))).join("\n\n") : "";
  const mainBody = fullArticle || fallback;
  const resolution = fullArticle ? "canonical-article" : fallback ? "exact-fallback" : "facts-only";
  const aspects = selectSkyV4Aspects(input.aspects, { subjectBody: input.planet });
  const blocks = [`# ${title3(input.planet)} in ${title3(input.sign)}`];
  if (text(input.dateLine).trim()) blocks.push(input.dateLine);
  if (mainBody) {
    blocks.push(`## TLDR

**What:** ${article.tldrWhat}

**Takeaway:** ${article.tldrTakeaway}`);
    if (input.seasonalContext) blocks.push(input.seasonalContext);
    blocks.push(mainBody);
    if (fullArticle && overlays.length) blocks.push(overlays.map((overlay) => overlay.OverlayBody).join("\n\n"));
  }
  if ((input.motionConditions ?? []).length) {
    blocks.push(`## What is shaping this transit now

${input.motionConditions.map(renderCondition).join("\n\n")}`);
  }
  if (aspects.length) {
    blocks.push(`## Aspects shaping this transit

${aspects.map(renderAspect).join("\n\n")}`);
  }
  return {
    contentKey: article?.contentKey ?? `sky-placement/article/${lower(input.planet)}/${lower(input.sign)}`,
    resolution,
    selectedOverlayKeys: overlays.map((overlay) => overlay.OverlayKey),
    selectedFallbackOverlayKeys: fallbackOverlays.map((overlay) => overlay.OverlayKey),
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}
function nodeRelationSlug(value) {
  const normalized = slug(value);
  if (normalized.includes("south-node")) return "south-node";
  if (normalized.includes("north-node")) return "north-node";
  return normalized;
}
function tldrFor(source) {
  const what = text(source.TLDR_What || source.tldrWhat).trim();
  const takeaway = text(source.TLDR_Takeaway || source.tldrTakeaway || source.TLDR).trim();
  if (!what && !takeaway) return "";
  return `## TLDR

${what ? `**What:** ${what}` : ""}${what && takeaway ? "\n\n" : ""}${takeaway ? `**Takeaway:** ${takeaway}` : ""}`;
}
function renderFamilyConditions(conditions = []) {
  return conditions.length ? `## Other Conditions

${conditions.map(renderCondition).join("\n\n")}` : "";
}
function renderFamilyAspects(aspects = []) {
  return aspects.length ? `## Key aspects

${aspects.map(renderAspect).join("\n\n")}` : "";
}
function matchingOverlayContexts(source, input) {
  if (input.contexts?.length) return input.contexts;
  const body = source.Sign ? "New Moon" : source.MoonSign ? "Full Moon" : source.Type?.includes("solar") ? "Solar Eclipse" : "Lunar Eclipse";
  const sign = source.Sign || source.MoonSign || source.EclipseSign || "";
  return [{
    subjectFamily: source.Type ? "eclipse" : "lunation",
    subjectBody: body,
    subjectSign: sign,
    subjectCondition: source.Type || source.EclipseType || "",
    contextKind: "",
    contextBodyOrEvent: "",
    contextSign: "",
    contextCondition: ""
  }];
}
function renderSkyV4LunationStudioPreview(corpus, source, input) {
  const isFull = source.studio_content_type === "full-moon";
  const body = withoutUnresolvedSlots(fillFacts(isFull ? source.FullMoonArticle : source.NewMoonArticle, record(input.facts)));
  const overlays = resolveSkyV4ContextualOverlays(
    corpus,
    matchingOverlayContexts(source, input),
    input.overlaySettings,
    input.overlaySuppressions
  );
  const aspects = selectSkyV4Aspects(input.aspects, {
    subjectBody: isFull ? "moon" : "moon",
    eventContextAspectIds: input.eventContextAspectIds,
    lumination: true
  });
  const blocks = [`# ${source.headline}`];
  if (text(input.dateLine).trim()) blocks.push(input.dateLine);
  const tldr = tldrFor(source);
  if (tldr) blocks.push(tldr);
  if (body) blocks.push(body);
  if (overlays.length) blocks.push(overlays.map((overlay) => overlay.OverlayBody).join("\n\n"));
  if (text(input.cycleContext).trim()) blocks.push(input.cycleContext);
  const conditions = renderFamilyConditions(input.motionConditions ?? []);
  if (conditions) blocks.push(conditions);
  const keyAspects = renderFamilyAspects(aspects);
  if (keyAspects) blocks.push(keyAspects);
  return {
    resolution: "canonical-lunation",
    axis: isFull ? { moonSign: source.MoonSign, sunSign: source.SunSign, axis: source.Axis } : null,
    selectedOverlayKeys: overlays.map((overlay) => overlay.OverlayKey),
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}
function renderSkyV4EclipseStudioPreview(corpus, source, input) {
  const exact = source.studio_content_type === "eclipse-event";
  const signFallback = source.studio_content_type === "eclipse-fallback";
  const eclipseType = source.Type || source.EclipseType;
  const eclipseSign = source.MoonSign || source.EclipseSign;
  const nodeRelation = nodeRelationSlug(source.NodeRelation);
  let resolved;
  if (exact && input.exactAvailable !== false) {
    resolved = { resolution: "exact-event", contentKey: source.ContentKey, body: source.EventArticle };
  } else if (signFallback) {
    resolved = { resolution: "sign-aware-fallback", contentKey: source.ContentKey, body: [source.Hook, source.Lived, source.Turn].filter(Boolean).join("\n\n") };
  } else if (source.studio_content_type === "generic-eclipse-fallback") {
    resolved = { resolution: "generic-type-node-fallback", contentKey: source.contentKey, body: source.ModifierArticle };
  } else {
    resolved = resolveSkyV4EclipseMainBody(corpus, {
      exactEventKey: source.ContentKey,
      eclipseType,
      nodeRelation,
      eclipseSign,
      exactAvailable: false,
      signFallbackAvailable: input.signFallbackAvailable !== false,
      genericFallbackAvailable: input.genericFallbackAvailable !== false
    });
  }
  const body = resolved.body ? withoutUnresolvedSlots(fillFacts(resolved.body, record(input.facts))) : "";
  const overlays = resolveSkyV4ContextualOverlays(
    corpus,
    matchingOverlayContexts(source, input),
    input.overlaySettings,
    input.overlaySuppressions
  );
  const aspects = selectSkyV4Aspects(input.aspects, {
    subjectBody: "moon",
    eventContextAspectIds: input.eventContextAspectIds,
    lumination: true
  });
  const blocks = [`# ${source.headline}`];
  if (text(input.dateLine).trim()) blocks.push(input.dateLine);
  const tldr = tldrFor(source);
  if (tldr) blocks.push(tldr);
  if (body) blocks.push(body);
  if (overlays.length) blocks.push(overlays.map((overlay) => overlay.OverlayBody).join("\n\n"));
  if (text(input.cycleContext).trim()) blocks.push(input.cycleContext);
  if (text(input.eclipseContext).trim()) blocks.push(input.eclipseContext);
  const conditions = renderFamilyConditions(input.motionConditions ?? []);
  if (conditions) blocks.push(conditions);
  const keyAspects = renderFamilyAspects(aspects);
  if (keyAspects) blocks.push(keyAspects);
  return {
    resolution: resolved.resolution,
    selectedOverlayKeys: overlays.map((overlay) => overlay.OverlayKey),
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}
function setValueAt(source, path, nextValue) {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    cursor[part] = { ...record(cursor[part]) };
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = nextValue;
  return next;
}
function studioReaderBody(source) {
  if (source.studio_content_type === "eclipse-fallback") {
    return [source.Hook, source.Lived, source.Turn].filter(Boolean).join("\n\n");
  }
  const paths = [
    "placementArticle",
    "NewMoonArticle",
    "FullMoonArticle",
    "EventArticle",
    "FallbackArticle",
    "ModifierArticle",
    "NodeAxisArticle",
    "ExactIngressCopy",
    "Article",
    "LilithArticle",
    "Body",
    "OverlayBody",
    "Copy",
    "Template"
  ];
  const body = paths.map((path) => valueAt(source, path)).find((value) => text(value).trim());
  if (body) return text(body);
  const fallback = [source.Hook, source.Lived, source.Turn].filter(Boolean).join("\n\n");
  return fallback || text(source.body_you);
}
function skyV4GovernedAspectStudioRecord(sourceRow) {
  if (!sourceRow || sourceRow.review_status !== "approved") return null;
  const parts = text(sourceRow.contentKey).split("/");
  if (parts.length !== 7 || parts[0] !== "fallback-hook" || parts[1] !== "sky-aspect-sign") return null;
  const [, , bodyA, signA, aspectType, bodyB, signB] = parts;
  const headline = `${title3(bodyA)} in ${title3(signA)} ${lower(aspectType)} ${title3(bodyB)} in ${title3(signB)}`;
  const baseline = {
    ...structuredClone(sourceRow),
    Headline: headline,
    Body: sourceRow.body_you,
    BodyA: bodyA,
    SignA: signA,
    BodyB: bodyB,
    SignB: signB,
    AspectType: aspectType
  };
  return {
    ...sourceRow,
    Headline: headline,
    Body: sourceRow.body_you,
    BodyA: bodyA,
    SignA: signA,
    BodyB: bodyB,
    SignB: signB,
    AspectType: aspectType,
    contentKey: sourceRow.contentKey,
    headline,
    studio_content_type: "aspect",
    studio_editable_fields: [
      { path: "Headline", label: "Headline" },
      { path: "Body", label: "Body" }
    ],
    studio_read_only_fields: [
      "contentKey",
      "BodyA",
      "SignA",
      "BodyB",
      "SignB",
      "AspectType",
      "calculatedDate",
      "calculatedOrb",
      "review_status",
      "source_keys",
      "approved_via"
    ],
    studio_source_baseline: baseline,
    studio_governed_source_record: structuredClone(sourceRow),
    source_baseline_sha256: sha256(JSON.stringify(baseline)),
    studio_provenance: {
      reviewStatus: sourceRow.review_status,
      approvedVia: sourceRow.approved_via,
      sourceKeys: sourceRow.source_keys ?? []
    },
    studio_version_status: "approved-baseline",
    owner_approved: true,
    serving_enabled: true,
    studio_preview_requires: ["calculatedDate", "calculatedOrb"],
    note: "Existing governed aspect corpus record. Reader fields create a separate non-serving draft; identity, runtime facts, governance, and approved baseline remain immutable."
  };
}
function aspectMatchesSurface(source, surface = {}, eventContextAspectIds = []) {
  const ids = new Set(eventContextAspectIds.map(String));
  if (ids.has(text(source.contentKey))) return true;
  const subject = lower(surface.subjectBody);
  const subjectSign = lower(surface.subjectSign);
  return [lower(source.BodyA), lower(source.BodyB)].includes(subject) && (!subjectSign || [lower(source.SignA), lower(source.SignB)].includes(subjectSign));
}
function renderGovernedAspectStudioPreview(source, input) {
  if (!aspectMatchesSurface(source, record(input.previewSurface), input.eventContextAspectIds ?? [])) {
    return { resolution: "unsupported-aspect-omitted", selectedAspectIds: [], page: "" };
  }
  const surface = record(input.previewSurface);
  const calculatedDate = required(surface.calculatedDate, "calculated aspect date");
  const calculatedOrb = required(surface.calculatedOrb, "calculated aspect orb");
  const aspect = {
    id: source.contentKey,
    approved: true,
    bodyA: source.BodyA,
    bodyB: source.BodyB,
    headline: source.Headline,
    dateLine: `${calculatedDate} \xB7 ${calculatedOrb}`,
    body: source.Body
  };
  const lunation = ["lunation", "eclipse"].includes(lower(surface.kind));
  const heading = lunation ? "Key aspects" : "Aspects shaping this transit";
  return {
    resolution: "governed-aspect-on-valid-surface",
    selectedAspectIds: [source.contentKey],
    page: `## ${heading}

${renderAspect(aspect)}`
  };
}
function renderSkyV4StudioPreview(corpus, input) {
  const source = skyV4ContentStudioRecords(corpus).find((row) => row.contentKey === input.contentKey) ?? (input.governedAspectSource ? skyV4GovernedAspectStudioRecord(input.governedAspectSource) : null);
  if (!source) throw new Error(`SKY_V4_SOURCE_GAP: ${input.contentKey}`);
  const allowed = new Set(source.studio_editable_fields.map((field) => field.path));
  const draftFields = record(input.draftFields);
  const blocked = Object.keys(draftFields).filter((path) => !allowed.has(path));
  if (blocked.length) throw new Error(`SKY_V4_STRUCTURE_LOCK: ${blocked.join(", ")}`);
  const effective = Object.entries(draftFields).reduce(
    (current, [path, nextValue]) => setValueAt(current, path, nextValue),
    structuredClone(source)
  );
  if (effective.studio_content_type === "aspect") {
    const result = renderGovernedAspectStudioPreview(effective, input);
    return {
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false,
      ...result
    };
  }
  if (["new-moon", "full-moon"].includes(effective.studio_content_type)) {
    const result = renderSkyV4LunationStudioPreview(corpus, effective, input);
    return {
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false,
      ...result
    };
  }
  if (["eclipse-event", "eclipse-fallback", "generic-eclipse-fallback"].includes(effective.studio_content_type)) {
    const result = renderSkyV4EclipseStudioPreview(corpus, effective, input);
    return {
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false,
      ...result
    };
  }
  if (effective.studio_content_type === "continuous-placement") {
    const result = renderSkyV4ContinuousPreview(corpus, {
      ...input,
      planet: effective.planet,
      sign: effective.sign,
      articleOverride: effective
    });
    return {
      ...result,
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false
    };
  }
  const facts = record(input.facts);
  const body = withoutUnresolvedSlots(fillFacts(studioReaderBody(effective), facts));
  const blocks = [`# ${text(effective.headline) || title3(input.contentKey)}`, body];
  const motionConditions = input.motionConditions ?? [];
  if (motionConditions.length) {
    blocks.push(`## What is shaping this transit now

${motionConditions.map(renderCondition).join("\n\n")}`);
  }
  const subjectBody = text(effective.planet || effective.SubjectBody || effective.Planet || input.subjectBody);
  const aspects = selectSkyV4Aspects(input.aspects, {
    subjectBody,
    eventContextAspectIds: input.eventContextAspectIds,
    lumination: ["new-moon", "full-moon", "eclipse-event", "eclipse-fallback", "generic-eclipse-fallback"].includes(effective.studio_content_type)
  });
  if (aspects.length) blocks.push(`## Aspects shaping this transit

${aspects.map(renderAspect).join("\n\n")}`);
  return {
    contentKey: input.contentKey,
    contentType: effective.studio_content_type,
    sourceBaselineSha256: effective.source_baseline_sha256,
    servingEnabled: false,
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}
function releasedReaderRecord(corpus, contentKey) {
  assertSkyV4ReaderCopyServingRelease(corpus);
  if (!READER_COPY_SERVING_KEYS.has(contentKey)) {
    throw new Error(`SKY_V4_NOT_RELEASED: ${contentKey}`);
  }
  const row = skyV4ContentStudioRecords(corpus).find((candidate) => candidate.contentKey === contentKey);
  if (!row || row.owner_approved !== true || row.serving_enabled !== true) {
    throw new Error(`SKY_V4_NOT_SERVABLE: ${contentKey}`);
  }
  return row;
}
function nodePlacementKey(body, sign) {
  const normalized = lower(body);
  if (normalized === "north-node" || normalized === "north node") return `sky-nodes/north-node/${lower(sign)}`;
  if (normalized === "south-node" || normalized === "south node") return `sky-nodes/south-node/${lower(sign)}`;
  return null;
}
function renderSkyV4ReaderRoute(corpus, input) {
  if (input.draftFields && Object.keys(input.draftFields).length) {
    throw new Error("SKY_V4_READER_BOUNDARY: drafts cannot render on reader routes.");
  }
  let contentKey = text(input.contentKey).trim();
  let resolution = "exact-canonical-key";
  const route = lower(input.route);
  if (!contentKey && route === "placement") {
    const body = lower(input.planet);
    contentKey = body === "lilith" || body === "black-moon-lilith" ? `sky-lilith/article/${lower(input.sign)}` : nodePlacementKey(body, input.sign) ?? `sky-placement/article/${body}/${lower(input.sign)}`;
  } else if (!contentKey && route === "new-moon") {
    contentKey = `sky-lunation/new-moon/${lower(input.sign)}`;
  } else if (!contentKey && route === "full-moon") {
    contentKey = `sky-lunation/full-moon/${lower(input.sign)}`;
  } else if (!contentKey && route === "eclipse") {
    const selected = resolveSkyV4EclipseMainBody(corpus, input);
    resolution = selected.resolution;
    if (!selected.contentKey) {
      return {
        route,
        resolution: "facts-only",
        contentKey: null,
        servingEnabled: false,
        versionStatus: "facts-only",
        page: "",
        readerParts: []
      };
    }
    contentKey = selected.contentKey;
  } else if (!contentKey && route === "node-axis") {
    contentKey = `sky-nodes/axis/${lower(input.northSign)}-${lower(input.southSign)}`;
  } else if (!contentKey && route === "lilith-station") {
    if (input.stationSupported !== true) {
      return { route, resolution: "unsupported-condition-omitted", contentKey: null, servingEnabled: false, page: "", readerParts: [] };
    }
    contentKey = "sky-lilith/station";
  } else if (!contentKey && route === "seasonal") {
    contentKey = `sky-placement/seasonal-context/${lower(input.sign)}/${lower(input.hemisphere)}`;
  }
  const source = releasedReaderRecord(corpus, contentKey);
  const preview = renderSkyV4StudioPreview(corpus, { ...input, contentKey, draftFields: {} });
  const baseBody = studioReaderBody(source);
  const readerParts = [];
  const pushReaderBody = (value) => {
    const body = withoutUnresolvedSlots(fillFacts(text(value), record(input.facts))).trim();
    if (body) readerParts.push(body);
  };
  const what = text(source.TLDR_What || source.tldrWhat).trim();
  const takeaway = text(source.TLDR_Takeaway || source.tldrTakeaway || source.TLDR).trim();
  if (what) readerParts.push(what);
  if (takeaway) readerParts.push(takeaway);
  if (route === "placement" && text(input.seasonalContext).trim()) {
    pushReaderBody(input.seasonalContext);
  }
  if (route === "placement" && nodePlacementKey(input.planet, input.sign)) {
    const nodeEducation = releasedReaderRecord(corpus, "sky-nodes/education");
    pushReaderBody(studioReaderBody(nodeEducation));
    if (input.northSign && input.southSign) {
      const axis = releasedReaderRecord(corpus, `sky-nodes/axis/${lower(input.northSign)}-${lower(input.southSign)}`);
      pushReaderBody(studioReaderBody(axis));
    }
  }
  if (baseBody) pushReaderBody(baseBody);
  for (const overlayKey of preview.selectedOverlayKeys ?? []) {
    const overlay = releasedReaderRecord(corpus, overlayKey);
    pushReaderBody(overlay.OverlayBody);
  }
  if (route !== "placement") {
    pushReaderBody(input.cycleContext);
    pushReaderBody(input.eclipseContext);
  }
  for (const condition of input.motionConditions ?? []) {
    pushReaderBody(condition.body);
  }
  if (route === "placement" && (input.isRetrograde === true || input.stationSupported === true)) {
    const retrograde = resolveSkyV4Retrograde(corpus, { body: input.planet, sign: input.sign, stationSupported: input.stationSupported });
    if (retrograde.body && retrograde.lookupKey && READER_COPY_SERVING_KEYS.has(retrograde.lookupKey)) {
      pushReaderBody(retrograde.body);
    }
  }
  return {
    ...preview,
    route,
    resolution: resolution === "exact-canonical-key" ? preview.resolution : resolution,
    contentKey,
    servingEnabled: true,
    versionStatus: "approved-serving-baseline",
    sourceBaselineSha256: source.source_baseline_sha256,
    readerParts,
    page: preview.page
  };
}
function skyV4RuntimeCoverage(corpus) {
  assertSkyV4CanonicalPackage(corpus);
  const records = skyV4ContentStudioRecords(corpus);
  const byType = Object.fromEntries([...new Set(records.map((row) => row.studio_content_type))].sort().map((type) => [type, records.filter((row) => row.studio_content_type === type).length]));
  return {
    packageVersion: corpus.packageVersion,
    servingEnabled: corpus.servingEnabled,
    recordCount: records.length,
    byType,
    continuousCount: corpus.content.continuous.length,
    fallbackCount: corpus.content.continuous.filter((row) => row.fallback?.hook && row.fallback?.lived && row.fallback?.turn).length,
    overlayCount: corpus.content.contextualTransitOverlays.length,
    compositionScenarioCount: corpus.runtime.compositionRegressionMatrix.length,
    editingTestCount: corpus.runtime.contentStudioEditingTests.length
  };
}
function skyV4FieldValue(source, path) {
  return valueAt(source, path);
}

// apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts
var PACKAGE_VERSION = "v3-2026-09-02a";
function stablePackageValue(value) {
  if (Array.isArray(value)) {
    return value.map(stablePackageValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value).filter((key) => key !== "review_status" && key !== "reviewStatus").sort().map((key) => [key, stablePackageValue(value[key])])
  );
}
function packageRowsByKey(rows, allowRowsWithoutReviewState = false) {
  const readerEligible = /* @__PURE__ */ new Set(["approved_reuse", "approved", "reviewed"]);
  const candidates = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }
  return [...candidates.values()].map((keyed) => [...keyed].reverse().find((row) => allowRowsWithoutReviewState || readerEligible.has(String(row.review_status ?? row.reviewStatus ?? "")))).filter((row) => Boolean(row)).sort((first, second) => first.contentKey.localeCompare(second.contentKey));
}
function packageDailyGlanceVariantRows(variants) {
  return Object.entries(variants?.keys ?? {}).flatMap(([dailyKey, set]) => [
    ...(set.headlines ?? []).filter((row) => row.id !== "primary").map((row) => ({ ...row, contentKey: `daily-glance-variant/${dailyKey}/headline/${row.id}` })),
    ...(set.bodies ?? []).filter((row) => row.id !== "primary").map((row) => ({ ...row, contentKey: `daily-glance-variant/${dailyKey}/body/${row.id}` })),
    ...(set.pairings ?? []).filter((row) => row.id !== "primary").map((row) => ({ ...row, contentKey: `daily-glance-variant/${dailyKey}/pairing/${row.id}` }))
  ]);
}
function packageHash(value) {
  const input = JSON.stringify(stablePackageValue(value));
  const seeds = [2166136261, 2654435769, 2246822507, 3266489909];
  const hashes = seeds.map((seed) => {
    let hash = seed >>> 0;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  });
  return hashes.join("");
}
function createPackageManifest(bundle, packageVersion = PACKAGE_VERSION) {
  const records = [
    ...packageRowsByKey(bundle.transitLib.authoredCards).map((row) => ({ bucket: "authored", row })),
    ...packageRowsByKey(bundle.rowsFile.hookRows ?? []).map((row) => ({ bucket: "hook", row })),
    ...packageRowsByKey(bundle.rowsFile.vocabularyRows ?? []).map((row) => ({ bucket: "vocabulary", row })),
    ...packageRowsByKey(packageDailyGlanceVariantRows(bundle.rowsFile.dailyGlanceVariants)).map((row) => ({ bucket: "daily-glance-variant", row })),
    // Templates are package-owned structural contracts and do not carry the
    // row-level review status used by authored prose. They must still enter the
    // hash so a slot or body change invalidates stale dashboard/cache bundles.
    ...packageRowsByKey(bundle.templatesFile.templates, true).map((row) => ({ bucket: "template", row }))
  ];
  const keys = records.map(({ bucket, row }) => `${bucket}:${row.contentKey}`);
  return {
    packageVersion,
    contentHash: packageHash(records),
    keyManifestHash: packageHash(keys),
    keyCount: keys.length,
    keys
  };
}
export {
  PACKAGE_VERSION,
  RoleViolationError,
  SKY_V4_CANONICAL_JSON_SHA256,
  SKY_V4_CANONICAL_PACKAGE_VERSION,
  SKY_V4_OVERLAY_DEFAULTS,
  SourceGapError,
  TRUE_LILITH_KEY_DATES_INTRO,
  assertSkyV4CanonicalPackage,
  assertSkyV4ContinuousOwnerApproval,
  assertSkyV4ReaderCopyOwnerApproval,
  assertSkyV4ReaderCopyServingRelease,
  continuousArticleFor,
  createFallbackRenderer,
  createKnowledgeMatrixV13Resolver,
  createKnowledgeMatrixV9Resolver,
  createPackageManifest,
  createTransitSynastryRenderer,
  friendVoiceFromReaderCopy,
  natalPlacementMotionExactKey,
  normalizeAspect,
  renderSkyV4ContinuousPreview,
  renderSkyV4ReaderRoute,
  renderSkyV4StudioPreview,
  resolveSkyV4ContextualOverlays,
  resolveSkyV4EclipseMainBody,
  resolveSkyV4Lunation,
  resolveSkyV4Retrograde,
  selectDailyGlanceVariantSet,
  selectSkyV4Aspects,
  skyPlacementKeyDates,
  skyPlacementKeyDatesIntro,
  skyV4ContentStudioRecords,
  skyV4FieldValue,
  skyV4GovernedAspectStudioRecord,
  skyV4RuntimeCoverage,
  vocabularyBodyForVoice
};
