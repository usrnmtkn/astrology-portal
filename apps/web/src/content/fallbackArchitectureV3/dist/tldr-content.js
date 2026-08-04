// apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts
var SourceGapError = class extends Error {
};
var RoleViolationError = class extends Error {
};
var READER_ELIGIBLE = /* @__PURE__ */ new Set(["approved_reuse", "approved", "reviewed"]);
var OPPOSITE_SIGN = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
var ASPECT_GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
var ANGLE_TITLE = { ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", "imum-coeli": "IC" };
var ORD = { 1: "1st", 2: "2nd", 3: "3rd" };
var EMPTY_HOUSE_RULER_VARIANT = { 2: "a", 3: "b", 4: "c", 5: "d", 0: "e", 1: "f" };
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
function createFallbackRenderer(templatesFile, rowsFile) {
  const vocab = /* @__PURE__ */ new Map();
  for (const row of rowsFile.vocabularyRows) {
    const candidates = vocab.get(row.contentKey) ?? [];
    candidates.push(row);
    vocab.set(row.contentKey, candidates);
  }
  const hooks = new Map((rowsFile.hookRows ?? []).map((r) => [r.contentKey, r]));
  const getVocab = (key, opts2 = {}) => {
    const row = [...vocab.get(key) ?? []].reverse().find((candidate) => opts2.allowUnreviewed || READER_ELIGIBLE.has(candidate.review_status));
    if (!row) return null;
    if (row.content_role === "fallback_source") throw new RoleViolationError(`Row ${key} is fallback_source and can never fill a reader slot.`);
    if (!opts2.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    return row.body;
  };
  const getVocabList = (prefix, opts2 = {}) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const v = getVocab(`${prefix}/${i}`, opts2);
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
    const needsArticle = planet === "sun" || planet === "moon" || planet.endsWith("-node");
    const possessive = facts.voice === "you" ? "Your" : `${facts.voice}'s`;
    const ctx = {
      possessive,
      planetTitle: title(planet),
      planetRef: needsArticle ? `the ${title(planet)}` : title(planet),
      planetRefCap: needsArticle ? `The ${title(planet)}` : title(planet),
      signTitle: title(sign),
      planetTopic: getVocab(`fallback-vocab/planet-topic/${planet}`, opts2),
      planetExcess: getVocab(`fallback-vocab/planet-excess/${planet}`, opts2),
      planetProductive: getVocab(`fallback-vocab/planet-productive/${planet}`, opts2),
      planetCore: getVocab(`fallback-vocab/planet-core/${planet}`, opts2),
      signStyle: getVocab(`fallback-vocab/sign-style/${sign}`, opts2),
      signNeed: getVocab(`fallback-vocab/sign-need/${sign}`, opts2),
      planetVerb: getVocab(`fallback-vocab/planet-verb/${planet}`, opts2),
      signAdverb: getVocab(`fallback-vocab/sign-adverb/${sign}`, opts2),
      planetIntro: getHook(`fallback-hook/planet-intro/${planet}`, voice, opts2),
      planetBest: getHook(`fallback-hook/planet-best/${planet}`, voice, opts2),
      placementSentences: getHook(`fallback-hook/placement-sentence/${planet}/${sign}`, voice, opts2),
      placementGerundText: getVocabList(`fallback-vocab/placement-gerund/${planet}/${sign}`, opts2).join(", or ") || null
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
    const isNode = planet === "north-node" || planet === "south-node";
    if (isNode) {
      const j = getHook(`fallback-hook/node-journey/${planet}`, voice, opts2);
      const oppSign = OPPOSITE_SIGN[sign];
      const oppDir = getVocab(`fallback-vocab/node-direction/${oppSign}`, opts2);
      ctx.nodeJourney = j ? j.replace(/\{\{oppositeSignTitle\}\}/g, title(oppSign)).replace(/\{\{oppositeDirection\}\}/g, oppDir ?? "") : null;
    }
    const signTemplate = findTemplate(`fallback-template/natal.planet-in-sign/${planet}`, opts2) ?? getTemplate(isNode ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
    parts.push(renderTemplate(signTemplate, { ...ctx, modifierSentences: house ? [] : mods }, gapLabel, voice));
    let headlineTemplate = signTemplate;
    if (house) {
      const houseTemplate = getTemplate("fallback-template/natal.house-context");
      const houseCtx = {
        ...ctx,
        houseOrdinal: ordinal(house),
        houseMeaning: getHook(`fallback-hook/house-meaning/${house}`, voice, opts2),
        placementHouseSentences: getHook(`fallback-hook/placement-house-sentence/${planet}/${house}`, voice, opts2),
        modifierSentences: mods
      };
      parts.push(renderTemplate(houseTemplate, houseCtx, gapLabel, voice));
      headlineTemplate = houseTemplate;
      ctx.houseOrdinal = houseCtx.houseOrdinal;
    }
    return { headline: fixArticles(mustache(headlineTemplate.headline ?? "", ctx)), parts, body: parts.join("\n\n"), templateKey: headlineTemplate.contentKey };
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
    return { headline: mustache(template.headline ?? "", ctx), parts: [body], body, templateKey: template.contentKey };
  }
  function renderNatalAspect(facts, opts2 = {}) {
    const voice = facts.voice === "you" ? "you" : "they";
    const group = ASPECT_GROUP[facts.aspect];
    const pair = getHook(`fallback-hook/aspect-pair/${facts.planetA}/${facts.planetB}/${group}`, voice, opts2) ?? getHook(`fallback-hook/aspect-pair/${facts.planetB}/${facts.planetA}/${group}`, voice, opts2);
    const ctx = {
      possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
      planetATitle: title(facts.planetA),
      planetBTitle: title(facts.planetB),
      aspectName: facts.aspect,
      aspectAdj: getVocab(`fallback-vocab/aspect-adj/${facts.aspect}`, opts2),
      planetACore: getVocab(`fallback-vocab/planet-core/${facts.planetA}`, opts2),
      planetBCore: getVocab(`fallback-vocab/planet-core/${facts.planetB}`, opts2),
      aspectTypeLine: getHook(`fallback-hook/aspect-type/${facts.aspect}`, voice, opts2),
      aspectMotion: getVocab(`fallback-vocab/aspect-motion/${facts.aspect}`, opts2),
      possessiveLow: facts.voice === "you" ? "your" : `${facts.voice}'s`,
      pairSentences: pair
    };
    const template = getTemplate("fallback-template/natal.aspect");
    const body = renderTemplate(template, ctx, `${facts.planetA}-${facts.aspect}-${facts.planetB}`, voice);
    return { headline: mustache(template.headline ?? "", ctx), parts: [body], body, templateKey: template.contentKey };
  }
  const SIGN_RULER = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter" };
  const PATTERN_NAMES = { t_square: "T-Square", grand_square: "Grand Cross", grand_trine: "Grand Trine", kite: "Kite", yod: "Yod", mystic_rectangle: "Mystic Rectangle" };
  function renderAspectPattern({ type, apexTitle, mode, element, activation = false, voice = "you" }) {
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
      const qual = mode ? getVocab(`fallback-vocab/pattern-mode/${mode}`, opts) : element ? getVocab(`fallback-vocab/pattern-element/${element}`, opts) : null;
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
    const { house, sign, rulerSign, rulerHouse, voice = "you" } = facts;
    const v = voice === "you" ? "you" : "they";
    const ruler = facts.primaryRuler ?? SIGN_RULER[sign];
    const houseTopic = getVocab(`fallback-vocab/house-topic/${house}`, opts2);
    const rulerHouseJurisdiction = rulerHouse ? getVocab(`fallback-vocab/empty-house-ruler-jurisdiction/${rulerHouse}`, opts2) ?? (v === "they" ? getVocab(`fallback-vocab/house-jurisdiction-they/${rulerHouse}`, opts2) : null) ?? getVocab(`fallback-vocab/house-jurisdiction/${rulerHouse}`, opts2) : null;
    const emptyHouseRulerTopic = rulerHouse ? getVocab(`fallback-vocab/empty-house-ruler-topic/${rulerHouse}`, opts2) : null;
    const rulerHouseTopic = emptyHouseRulerTopic ?? (rulerHouse ? getVocab(`fallback-vocab/house-topic/${rulerHouse}`, opts2) : null);
    const cusp = getHook(`fallback-hook/house-cusp/${sign}`, v, opts2);
    const rulerVariant = EMPTY_HOUSE_RULER_VARIANT[house % 6];
    const rulerFrame = getHook(`fallback-hook/empty-house-ruler-v3/${rulerVariant}`, v, opts2) ?? getHook("fallback-hook/empty-house-ruler", v, opts2);
    const placementFrame = getHook("fallback-hook/empty-house-placement", v, opts2);
    const bridgeLead = getHook(`fallback-hook/empty-house-bridge/${house}`, v, opts2);
    const closeFrame = getHook("fallback-hook/empty-house-close", v, opts2);
    const note = getHook("fallback-hook/empty-house-explainer", v, opts2);
    const placementLine = rulerSign ? getHook(`fallback-hook/ruler-method/${ruler}/${rulerSign}`, v, opts2) : null;
    if (!houseTopic || !rulerHouseJurisdiction || !rulerHouseTopic || !cusp || !rulerFrame || !placementFrame || !bridgeLead || !closeFrame || !placementLine || !rulerSign || !rulerHouse) {
      throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} (${v})`);
    }
    const REF = { sun: "the Sun", moon: "the Moon" };
    const rulerRef = REF[ruler] ?? title(ruler);
    const rulerPossessive = rulerRef.endsWith("s") ? `${rulerRef}'` : `${rulerRef}'s`;
    const ctx = {
      houseOrdinal: ordinal(house),
      houseTopic,
      signTitle: title(sign),
      rulerRef,
      rulerRefCap: rulerRef.replace(/^./, (char) => char.toUpperCase()),
      rulerTitle: title(ruler),
      rulerPossessive,
      rulerSignTitle: rulerSign ? title(rulerSign) : null,
      rulerHouseOrdinal: rulerHouse ? ordinal(rulerHouse) : null,
      rulerHouseJurisdiction,
      rulerHouseTopic,
      placementLine
    };
    const repeatedRuler = (facts.rulerOccurrence ?? 1) > 1;
    const emptyHousePossessive = v === "you" ? "your" : "their";
    const rulerHouseTopicRef = emptyHouseRulerTopic ? `${emptyHousePossessive} ${rulerHouseTopic}` : rulerHouseTopic;
    const m1 = mustache(cusp, ctx).replace(
      `on the ${ordinal(house)} house`,
      `on ${emptyHousePossessive} ${ordinal(house)} house`
    );
    const m4 = repeatedRuler ? `Because ${title(sign)} is also ruled by ${rulerRef}, the same pattern applies: ${bridgeLead.replace(/^./, (char) => char.toLowerCase())} through the way ${v === "you" ? "you" : "they"} handle ${rulerHouseTopicRef}.` : `Because of this, ${bridgeLead.replace(/^./, (char) => char.toLowerCase())} through the way ${v === "you" ? "you" : "they"} handle ${rulerHouseTopicRef}.`;
    const paras = [
      m1,
      mustache(rulerFrame, ctx),
      ...repeatedRuler ? [] : [mustache(placementFrame, ctx)],
      m4,
      mustache(closeFrame, ctx)
    ];
    const cleaned = paras.map((p) => fixArticles(p).replace(/\s{2,}/g, " ").trim());
    for (const p of cleaned) if (/\{\{/.test(p)) throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} unresolved slot`);
    const body = cleaned.join(" ");
    if (/[—]|--/u.test(body)) throw new RoleViolationError(`Empty-house punctuation gate failed for ${house}/${sign}.`);
    return { headline: `${ordinal(house)} House`, note, body, parts: cleaned, templateKey: "fallback-template/natal.empty-house" };
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
    oppose: "opposition"
  };
  return map[k] ?? null;
}

// apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts
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
var NEEDS_ARTICLE = /* @__PURE__ */ new Set(["sun", "moon", "north-node", "south-node"]);
var transitRef = (planet, sign) => `${NEEDS_ARTICLE.has(planet) ? "the " : ""}${title2(planet)}${sign ? ` in ${title2(sign)}` : ""}`;
var fill = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).replace(/\s{2,}/g, " ").trim();
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
var READER_ELIGIBLE2 = /* @__PURE__ */ new Set(["approved_reuse", "approved", "reviewed"]);
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
      [...keyed].reverse().find((candidate) => allowUnreviewed || READER_ELIGIBLE2.has(candidate.review_status ?? ""))
    ]).filter((entry) => Boolean(entry[1]))
  );
}
function createTransitSynastryRenderer(transitLib, templatesFile, rowsFile, opts2 = {}) {
  const allowUnreviewed = Boolean(opts2.allowUnreviewed);
  const cards = eligibleRowsByKey(transitLib.authoredCards, allowUnreviewed);
  const vocab = eligibleRowsByKey(rowsFile.vocabularyRows, allowUnreviewed);
  const hooks = eligibleRowsByKey(rowsFile.hookRows ?? [], allowUnreviewed);
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
    "collective-read": 3,
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
  const result = (c, templateKey) => ({ headline: c.headline || "", body: c.body, parts: [c.body], templateKey, contentKey: c.contentKey });
  const fillKeep = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] != null ? String(ctx[k]) : `{{${k}}}`).trim();
  const EVENT_QUALITY = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
  const EVENT_VERB = { conjunction: "sitting right on", square: "squaring", opposition: "opposing", trine: "trining", sextile: "sextiling" };
  const CONJ_SOFT = /* @__PURE__ */ new Set(["venus", "sun", "mercury", "jupiter"]);
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
        const headline = v === "you" ? `${title2(planet)} moving through your ${ordinal2(house)} house` : `${title2(planet)} moving through ${voice}'s ${ordinal2(house)} house`;
        if (isRetrograde) {
          const ro = hookVoice(`fallback-hook/transit-house-retro-overlay/${planet}`, v);
          if (ro) parts.push(fillKeep(ro, { Name: v === "they" ? voice : "" }));
        }
        for (const e of events ?? []) {
          try {
            const quality = EVENT_QUALITY[e.aspect];
            const cls = quality === "conjunction" ? CONJ_SOFT.has(planet) ? "soft" : "hard" : quality;
            const frameRaw = quality ? hookVoice(`fallback-hook/transit-house-event-frame/${planet}`, v) : null;
            const windowClause = e.window ? /^(until|through|till|before|by)\b/i.test(e.window) ? ` ${e.window.charAt(0).toLowerCase()}${e.window.slice(1)}` : ` until ${e.window}` : "";
            const frame = frameRaw ? fillKeep(frameRaw, { houseOrdinal: ordinal2(house), natalTitle: title2(e.natal), Name: v === "they" ? voice : "", windowClause, aspectVerb: EVENT_VERB[e.aspect] }) : null;
            const wants = sign ? hookVoice(`fallback-hook/transit-house-event-wants/${planet}/${sign}`, v) : null;
            const holds = hookVoice(`fallback-hook/transit-house-event-natal/${e.natal}`, v);
            const scenes = hookVoice(`fallback-hook/transit-house-event-scenes/${planet}/${e.natal}/${cls}`, v) ?? hookVoice(`fallback-hook/transit-effect-${cls}/${planet}/${e.natal}`, v);
            if (frame && wants && holds && scenes) {
              parts.push(`${frame} ${wants}; ${holds}. ${scenes}`.trim());
            } else {
              const asp = renderTransitAspect({ transiting: planet, natal: e.natal, aspect: e.aspect, voice, window: e.window ?? null });
              parts.push(frame ? `${frame} ${asp.body}` : asp.body);
            }
          } catch {
          }
        }
        return { headline, body: parts.join("\n\n"), parts, templateKey: "authored/transit-house-layered", contentKey: synth.contentKey, window: win ?? WINDOW_HOUSE[planet] ?? null };
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
  function renderTransitAspect({ transiting, natal, aspect, variant, sign, isRetrograde, window: win, voice = "you" }) {
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
        return { headline: authoredHeadline, body: aBody, parts: aBody.split("\n\n"), templateKey: "authored/transit-aspect", contentKey: c.contentKey };
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
    return { label: `${title2(transiting)} ${verb} ${noun}`, window: win ?? WINDOW_ASPECT[transiting] ?? "Currently" };
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
  function renderSynastryAspect({ planetA, planetB, aspect, otherName }) {
    const T = tpl("fallback-template/synastry.aspect-v3");
    const g = GROUP[aspect];
    const fwd = hooks.get(`fallback-hook/synastry-pair/${planetA}/${planetB}/${g}`);
    const rev = fwd ? null : hooks.get(`fallback-hook/synastry-pair/${planetB}/${planetA}/${g}`);
    const pairRow = fwd ?? rev;
    const holders = fwd ? { holder1: "you", holder2: otherName, holder1Poss: "your", holder2Poss: `${otherName}'s`, holder1PossCap: "Your", holder2PossCap: `${otherName}'s` } : { holder1: otherName, holder2: "you", holder1Poss: `${otherName}'s`, holder2Poss: "your", holder1PossCap: `${otherName}'s`, holder2PossCap: "Your" };
    const pairVoice = fwd ? pairRow?.body_you : pairRow?.body_they;
    const modeA = hooks.get(`fallback-hook/planet-mode/${planetA}`)?.body_you;
    const modeB = hooks.get(`fallback-hook/planet-mode/${planetB}`)?.body_they;
    const typeRow = hooks.get(`fallback-hook/synastry-aspect-type/${aspect}`);
    const ctx = {
      possessive: "Your",
      planetATitle: title2(planetA),
      planetBTitle: title2(planetB),
      aspectName: aspect,
      otherName,
      aspectAdj: vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body,
      synAspectLine: typeRow && modeA && modeB ? fill(typeRow.body_you ?? "", {
        modeA,
        modeB,
        otherName,
        // what each person's planet feels like to the other (hard aspects)
        gratesA: hooks.get(`fallback-hook/planet-grates/${planetA}`)?.body_you,
        gratesB: hooks.get(`fallback-hook/planet-grates/${planetB}`)?.body_they,
        sceneA: vocab.get(`fallback-vocab/planet-scene/${planetA}`)?.body,
        sceneB: vocab.get(`fallback-vocab/planet-scene/${planetB}`)?.body,
        askA: vocab.get(`fallback-vocab/planet-ask/${planetA}`)?.body,
        askB: vocab.get(`fallback-vocab/planet-ask/${planetB}`)?.body
      }) : null,
      pairSentences: pairVoice ? fill(pairVoice, holders) : null,
      // signature closing formula for the assembled fallback (matches the natal-aspect close)
      closingLine: (() => {
        const coreA = vocab.get(`fallback-vocab/planet-core/${planetA}`)?.body;
        const coreB = vocab.get(`fallback-vocab/planet-core/${planetB}`)?.body;
        const motion = vocab.get(`fallback-vocab/aspect-motion/${aspect}`)?.body;
        return coreA && coreB && motion ? `That's your ${title2(planetA)} ${aspect} ${otherName}'s ${title2(planetB)}: ${coreA} and ${coreB} ${motion}.` : null;
      })()
    };
    if (ctx.pairSentences) {
      const headlinePair = (T.headline ?? "").replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? "");
      return { headline: headlinePair, tag: typeRow?.tag ?? null, body: ctx.pairSentences, parts: [ctx.pairSentences], templateKey: T.contentKey };
    }
    for (const slot of T.requiredSlots ?? []) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: synastry aspect slot ${slot} for ${planetA}-${aspect}-${planetB}`);
    let body = T.body.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => ctx[key] ? inner : "").replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? "");
    body = body.replace(/\s{2,}/g, " ").trim();
    const headline = (T.headline ?? "").replace(/\{\{([\w.]+)\}\}/g, (_, k) => ({ ...ctx, possessive: "Your" })[k] ?? "");
    return { headline, tag: typeRow?.tag ?? null, body, parts: [body], templateKey: T.contentKey };
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
    const aRef = capitalizeSentence(transitRef(ev.a, ev.aSign));
    const bRef = transitRef(ev.b, ev.bSign);
    const frame = SKY_PLACEMENT_ASPECT_FRAME[ev.aspect];
    const timing = ev.exactDate ? { exact: true, label: ev.exactDate } : ev.dateLine ? { exact: false, label: ev.dateLine.charAt(0).toLowerCase() + ev.dateLine.slice(1) } : null;
    if (!frame || !timing) throw new SourceGapError(`SOURCE_GAP: sky placement aspect frame ${ev.aspect}`);
    const fact = frame(aRef, bRef, timing);
    const effect = reviewed ?? specific ?? pairEffectOf(ev);
    if (!effect) throw new SourceGapError(`SOURCE_GAP: sky placement aspect effect ${ev.a}/${ev.b}/${ev.aspect}`);
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
      year: match[3] ?? null
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
      previousResidencyExitDate: previousResidencyExitDate ? continuousSkyPlacementDate(previousResidencyExitDate, "previous-residency exit").body : null
    };
    const factLine = dates.factLine;
    const collective = [signCopy.opening, signCopy.tension, signCopy.development].map((part) => fillKeep(part, ctx));
    const close = fillKeep(signCopy.close, ctx);
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
    const moves = Array.isArray(signCopy.try_this) ? signCopy.try_this.map((move) => fillKeep(move, ctx)).slice(0, 3) : [];
    const parts = [factLine, ...collective, ...aspectParts, close];
    const articleSections = [
      { kind: "collective-read", heading: "", body: [factLine, ...collective].join("\n\n") },
      ...aspectSection ? [aspectSection] : [],
      { kind: "exit-tone-shift", heading: "", body: close }
    ];
    const renderedText = [
      `${title2(planet)} in ${title2(sign)}`,
      ...parts,
      ...moves,
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
      const allowedUses = transitDate === dates.entry.body && priorSignExit === transitDate ? 3 : 2;
      if (renderedText.split(transitDate).length - 1 > allowedUses) {
        throw new SourceGapError(`SOURCE_GAP: repeated sky placement date ${planet}/${sign}`);
      }
    }
    return {
      headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
      tagline: null,
      moves,
      movesPresentation: "plain",
      closingCharge: null,
      keyDates: [],
      body: parts.join("\n\n"),
      parts,
      articleSections,
      templateKey: "sky-placement-continuous-v2",
      contentKey: signCopy.contentKey
    };
  }
  function renderSkyPlacement({
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
    isShadowPhase = false
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
          moves: [],
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
        const parts3 = [
          reviewNote,
          ...structuredParts,
          skyPlacementHistoryAllowed(planet, isRetrograde, historyEligible) ? authoredArticle.history_echo : null,
          closingCharge
        ].filter((part) => Boolean(part));
        return {
          headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title2(sign)}`,
          tagline: null,
          moves: [],
          closingCharge,
          keyDates: [],
          articleWindow: articleWindow(authoredArticle),
          articleMode,
          risingHoroscopes: (authoredArticle.rising_horoscopes ?? []).map((entry) => ({
            risingSign: entry.rising_sign,
            body: entry.body
          })),
          body: parts3.join("\n\n"),
          parts: parts3,
          templateKey: "sky-article-v1",
          contentKey: authoredArticle.contentKey
        };
      }
      const parts2 = [authoredArticle.body, retrogradeGuidance].filter((part) => Boolean(part));
      return {
        headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title2(sign)}`,
        tagline: null,
        moves: [],
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
    const signCopyKey = `fallback-hook/sky-sign-copy/${planet}/${sign}`;
    const signCopyRow = hooks.get(signCopyKey);
    const continuousSignCopy = signCopyRow?.render_policy === "sky-placement-continuous-v2" ? signCopyRow : null;
    if (SKY_PLACEMENT_CONTINUOUS_PLANETS.has(planet)) {
      const standaloneHook = hooks.get(`fallback-hook/sky-placement-sign/${planet}/${sign}`);
      if (!continuousSignCopy && standaloneHook?.body_you) {
        const body = standaloneHook.body_you.trim();
        if (!body || /\{\{/u.test(body)) {
          throw new SourceGapError(`SOURCE_GAP: standalone sky placement hook ${planet}/${sign}`);
        }
        return {
          headline: `${capitalizeSentence(transitRef(planet))} in ${title2(sign)}`,
          tagline: null,
          moves: [],
          keyDates: [],
          body,
          parts: [body],
          templateKey: "sky-placement-standalone-hook-v1",
          contentKey: standaloneHook.contentKey
        };
      }
      if (!continuousSignCopy) {
        throw new SourceGapError(`SOURCE_GAP: continuous sky placement sign copy ${planet}/${sign}`);
      }
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
    const aspectParas = events.map((ev) => skyPlacementAspectParagraph(planet, ev));
    const pairKey = `fallback-hook/sky-placement-hook/${planet}/${sign}`;
    const pairHook = hooks.get(pairKey)?.body_you;
    const pairLived = hooks.get(`fallback-hook/sky-placement-lived/${planet}/${sign}`)?.body_you;
    const pairTurn = hooks.get(`fallback-hook/sky-placement-turn/${planet}/${sign}`)?.body_you;
    const signCopy = continuousSignCopy?.body_you;
    const signParts = signCopy ? [signCopy] : pairHook && pairLived && pairTurn ? [pairHook, pairLived, pairTurn] : [];
    const tagline = hooks.get(`fallback-hook/sky-placement-tagline/${planet}/${sign}`)?.body_you ?? null;
    const moves = (hooks.get(`fallback-hook/sky-placement-moves/${planet}/${sign}`)?.body_you ?? "").split(/\r?\n/u).map((move) => move.trim()).filter(Boolean);
    {
      const windowFrame = hooks.get(`fallback-hook/sky-placement/${planet}`)?.body_you;
      const directPlanetFrame = hooks.get(`fallback-hook/sky-placement-frame/${planet}`)?.body_you;
      const retrogradePlanetFrame = hooks.get(`fallback-hook/sky-placement-retro-frame/${planet}`)?.body_you;
      const planetFrame = isRetrograde || isShadowPhase ? retrogradePlanetFrame ?? directPlanetFrame : directPlanetFrame;
      const personal = hooks.get(`fallback-hook/sky-placement-you/${planet}`)?.body_you;
      const practice2 = hooks.get(`fallback-hook/sky-placement-practice/${planet}`)?.body_you;
      const signStyle2 = vocab.get(`fallback-vocab/sky-sign-style/${sign}`)?.body;
      const planetFunction2 = vocab.get(`fallback-vocab/sky-planet-function/${planet}`)?.body;
      if (windowFrame && planetFrame && personal && practice2 && signStyle2 && planetFunction2 && entryDate && exitDate && signParts.length > 0) {
        const ctx2 = {
          signTitle: title2(sign),
          signStyle: signStyle2,
          planetFunction: planetFunction2,
          entryDate,
          exitDate
        };
        const parts2 = [
          windowFrame,
          planetFrame,
          ...signParts,
          ...aspectParas,
          personal,
          practice2
        ].map((part) => fillKeep(part, ctx2));
        if (parts2.some((part) => /\{\{/u.test(part))) {
          throw new SourceGapError(`SOURCE_GAP: sky placement V3 frame ${planet}/${sign}`);
        }
        return {
          headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
          tagline,
          moves: signCopy ? [] : moves,
          body: parts2.join("\n\n"),
          parts: parts2,
          templateKey: signCopy ? "sky-placement-article-v2" : "sky-placement-frame-v3",
          contentKey: signCopy ? signCopyKey : `fallback-hook/sky-placement/${planet}`
        };
      }
    }
    if (pairHook && pairLived && pairTurn) {
      const parts2 = [pairHook, pairLived, retrogradeGuidance, pairTurn, ...aspectParas].filter((part) => Boolean(part));
      return {
        headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
        tagline,
        moves,
        body: parts2.join("\n\n"),
        parts: parts2,
        templateKey: "fallback-template/sky.placement-article",
        contentKey: pairKey
      };
    }
    const template = tpl("fallback-template/sky.placement-article");
    const fallbackHook = hooks.get(`fallback-hook/sky-placement-you/${planet}`)?.body_you;
    const frame = hooks.get(`fallback-hook/sky-placement/${planet}`)?.body_you;
    const signStyle = vocab.get(`fallback-vocab/sky-sign-style/${sign}`)?.body;
    const planetFunction = vocab.get(`fallback-vocab/sky-planet-function/${planet}`)?.body;
    if (!fallbackHook || !frame || !signStyle || !planetFunction) throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign}`);
    const ctx = {
      signTitle: title2(sign),
      signStyle,
      signDoes: vocab.get(`fallback-vocab/sign-does/${sign}`)?.body,
      planetFunction,
      entryDate,
      exitDate
    };
    const placementRef = capitalizeSentence(transitRef(planet));
    const hook = hooks.get(`fallback-hook/sky-placement-hook/${planet}/${sign}`)?.body_you ?? fill(fallbackHook, ctx);
    const lived = hooks.get(`fallback-hook/sky-placement-lived/${planet}/${sign}`)?.body_you ?? fill(frame, ctx);
    const authoredTurn = hooks.get(`fallback-hook/sky-placement-turn/${planet}/${sign}`)?.body_you;
    const trap = hooks.get(`fallback-hook/sky-sign-trap/${sign}`)?.body_you;
    const practice = hooks.get(`fallback-hook/sky-placement-practice/${planet}`)?.body_you;
    const fallbackTurn = trap ? `The catch is ${trap}${practice ? ` ${practice}` : ""}` : practice;
    const templateCtx = {
      planetTitle: placementRef,
      signTitle: title2(sign),
      hook,
      lived,
      turn: authoredTurn ?? fallbackTurn
    };
    for (const slot of template.requiredSlots ?? []) {
      if (!templateCtx[slot]) throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign} missing ${slot}`);
    }
    const baseBody = fillKeep(template.body, templateCtx);
    if (/\{\{/.test(baseBody)) throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign} missing slot`);
    const baseParts = baseBody.split(/\n{2,}/u).filter(Boolean);
    const parts = retrogradeGuidance ? [...baseParts.slice(0, -1), retrogradeGuidance, ...baseParts.slice(-1), ...aspectParas] : [...baseParts, ...aspectParas];
    return {
      headline: `${transitRef(planet)} in ${title2(sign)}`.replace(/^the /, "The "),
      body: parts.join("\n\n"),
      parts,
      templateKey: template.contentKey,
      tagline,
      moves
    };
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
    const g = GROUP[aspect] ?? aspect;
    const frame = hooks.get(`fallback-hook/sky-event/aspect-${g}`)?.body_you;
    if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-event frame aspect-${g}`);
    const body = fill(frame, eventCtx({ type: "aspect", a, b, aspect, aSign, bSign, dateLine: dateLine ?? "Right now" }));
    if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky aspect ${a}-${aspect}-${b} missing facts (${body})`);
    return { headline: `${title2(a)} ${title2(aspect)} ${title2(b)}`, body, parts: [body], templateKey: "fallback-template/sky.aspect-card" };
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
    window: win
  }) {
    if (!endpointPlanet || !["reader", "friend"].includes(endpointOwner) || !activatedPlanets?.length) {
      throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} missing endpoint facts`);
    }
    const g = GROUP[aspect] ?? aspect;
    const family = g === "soft" || g === "conjunction" && !HEAVY.has(transiting) ? "soft" : "hard";
    const effect = hooks.get(`fallback-hook/bond-effect-${aspect}/${transiting}`)?.body_you ?? (variant ? hooks.get(`fallback-hook/bond-effect-${family}/${transiting}/variant-${variant}`)?.body_you : null) ?? hooks.get(`fallback-hook/bond-effect-${family}/${transiting}`)?.body_you;
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
    return { headline, body, parts: paras, templateKey: "fallback-template/bond.transit" };
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
    house,
    moonHouse,
    sunHouse,
    ruler,
    rulerHouse,
    rulerRetrograde,
    uranusHouse,
    uranusLayerActive,
    weekly = false
  }) {
    const isEclipse = kind === "eclipse-solar" || kind === "eclipse-lunar";
    const which = kind === "new-moon" || kind === "eclipse-solar" ? "new" : "full";
    const h = moonHouse ?? house ?? (SIGN_ORDER.indexOf(sign) - SIGN_ORDER.indexOf(risingSign) + 12) % 12 + 1;
    const frame = hooks.get(`fallback-hook/lunation-horoscope/${which}`)?.body_you;
    const jurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${h}`)?.body;
    if (!frame || !jurisdiction) throw new SourceGapError(`SOURCE_GAP: lunation horoscope ${which}/${risingSign} (house ${h})`);
    const houseFrame = fill(frame, { houseOrdinal: ordinal2(h), jurisdiction });
    const opening = hooks.get(`fallback-hook/lunation-opening-situation/${h}`)?.body_you;
    const paras = [opening ? `${opening} ${houseFrame}` : houseFrame];
    const signCompact = hooks.get(`fallback-hook/lunation-sign-compact/${which}-moon/${sign}`)?.body_you ?? (which === "full" ? hooks.get(`fallback-hook/lunation-sign-compact/${sign}`)?.body_you : null);
    if (signCompact) paras.push(signCompact);
    if (which === "full" && sunHouse && sunHouse !== h) {
      const sunJurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${sunHouse}`)?.body;
      if (sunJurisdiction) {
        const counterpoint = `The friction this week runs between your ${ordinal2(sunHouse)} house of ${sunJurisdiction} and your ${ordinal2(h)} house of ${jurisdiction}. The immediate demands on one side can compete with what is becoming undeniable on the other, so let the tension show you what needs to change.`;
        paras[paras.length - 1] = `${paras[paras.length - 1]} ${counterpoint}`;
      }
    }
    if (ruler && rulerHouse && ruler !== "sun" && ruler !== "moon") {
      const rulerHouseBody = hooks.get(`fallback-hook/lunation-ruler-house/${rulerHouse}`)?.body_you;
      if (rulerHouseBody) {
        const lunationLabel = isEclipse ? which === "new" ? "Solar Eclipse" : "Lunar Eclipse" : which === "new" ? "New Moon" : "Full Moon";
        const rulerTitle = title2(ruler);
        let rulerParagraph = `${rulerTitle} rules this ${lunationLabel} from your ${ordinal2(rulerHouse)} house, so ${rulerHouseBody.replace(/\.+$/u, "")}.`;
        if (rulerRetrograde) {
          const retroOverlay = hooks.get("fallback-hook/lunation-ruler-retro")?.body_you;
          if (!retroOverlay) {
            throw new SourceGapError("SOURCE_GAP: missing retrograde lunation ruler overlay");
          }
          rulerParagraph += ` ${fill(retroOverlay, { rulerTitle })}`;
        }
        paras.push(rulerParagraph);
      }
    }
    const weekLayer = weekly ? hooks.get("fallback-hook/lunation-week-layer")?.body_you : null;
    let weekLayerRendered = false;
    if (uranusLayerActive && uranusHouse) {
      const uranusLayer = hooks.get(`fallback-hook/lunation-uranus-layer/${uranusHouse}`)?.body_you;
      if (uranusLayer) {
        paras.push(weekLayer ? `${uranusLayer} ${weekLayer}` : uranusLayer);
        weekLayerRendered = Boolean(weekLayer);
      }
    }
    if (weekLayer && !weekLayerRendered) paras.push(weekLayer);
    const label = isEclipse ? which === "new" ? "Solar Eclipse" : "Lunar Eclipse" : which === "new" ? "New Moon" : "Full Moon";
    return { headline: `${label} for ${title2(risingSign)} Rising`, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.lunation-horoscope" };
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
    if (blendFallbackEnabled) return renderLunationHoroscope(blendFacts);
    throw new SourceGapError(
      `SOURCE_GAP: no satori lunation card for ${normalizedEventDate}/${risingKey}`
    );
  }
  const DAILY_GROUP = { conjunction: "conjunction", square: "square", opposition: "opposition", trine: "soft", sextile: "soft" };
  function renderDailyGlance({ natal, aspect, house }) {
    if (natal && aspect) {
      const g = DAILY_GROUP[aspect] ?? aspect;
      const h = hooks.get(`fallback-hook/daily-headline/${g}/${natal}`)?.body_you;
      const b = hooks.get(`fallback-hook/daily-body/${g}/${natal}`)?.body_you;
      if (h && b) return { headline: h, body: b, parts: [b], templateKey: "fallback-template/daily.glance" };
    }
    if (house) {
      const h = hooks.get(`fallback-hook/daily-headline/house/${house}`)?.body_you;
      const b = hooks.get(`fallback-hook/daily-body/house/${house}`)?.body_you;
      if (h && b) return { headline: h, body: b, parts: [b], templateKey: "fallback-template/daily.glance" };
    }
    throw new SourceGapError(`SOURCE_GAP: daily glance ${aspect ?? "no-aspect"}/${natal ?? house}`);
  }
  function renderDoDont({ planet, sign, house, transiting, weakPlanet, weakSign, moonSign, moonHouse, dayKey }) {
    const seed = (k) => vocab.get(`fallback-vocab/${k}`)?.body ?? null;
    const APPROVED = /* @__PURE__ */ new Set(["approved", "approved_reuse", "reviewed"]);
    const moonSeed = (k) => {
      const r = vocab.get(`fallback-vocab/${k}`);
      return r && APPROVED.has(r.review_status ?? "") ? r.body : null;
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
  return { renderTransitHouse, renderTransitAspect, renderTransitLabel, renderTransitReturn, renderTransitRetro, renderCompat, renderSynastryAspect, renderSkySeason, renderSkyHoroscope, renderSkyLunation, renderSkyPlacement, renderSkyAspectCard, renderCircleStory, formatCircleNames, renderCalendarPhase, renderVoidOfCourse, renderSeasonMarker, renderWeeklyMoon, renderBondTransit, renderLunationMacro, renderLunationHoroscope, renderLunationEventCard, renderDoDont, renderDailyGlance };
}

// apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts
var PACKAGE_VERSION = "v3-2026-08-04d";
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
function packageRowsByKey(rows) {
  const readerEligible = /* @__PURE__ */ new Set(["approved_reuse", "approved", "reviewed"]);
  const candidates = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }
  return [...candidates.values()].map((keyed) => [...keyed].reverse().find((row) => readerEligible.has(String(row.review_status ?? row.reviewStatus ?? "")))).filter((row) => Boolean(row)).sort((first, second) => first.contentKey.localeCompare(second.contentKey));
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
    ...packageRowsByKey(bundle.templatesFile.templates).map((row) => ({ bucket: "template", row }))
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
  SourceGapError,
  createFallbackRenderer,
  createPackageManifest,
  createTransitSynastryRenderer,
  friendVoiceFromReaderCopy,
  normalizeAspect
};
