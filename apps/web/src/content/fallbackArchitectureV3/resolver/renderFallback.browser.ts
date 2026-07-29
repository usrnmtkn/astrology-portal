// TLDR Astro fallback resolver — browser/TypeScript build (v3)
// Same logic as renderFallback.mjs, with NO Node APIs. The app passes the data in
// (static JSON imports are inlined by every bundler):
//
//   import templates from "./templates/fallback-templates-v3.json";
//   import rows from "./source-rows/fallback-source-rows-v3.json";
//   const renderer = createFallbackRenderer(templates, rows);
//   renderer.renderNatalPlacement({ planet: "moon", sign: "scorpio", house: 6, voice: "you" });

export type Voice = "you" | (string & {}); // "you" or a display name for friend view

export interface TemplateRow {
  contentKey: string;
  content_role: string;
  headline?: string;
  body: string;
  body_you?: string;
  body_they?: string;
  requiredSlots?: string[];
  optionalSlots?: string[];
  review_status?: string;
}
export interface VocabRow {
  contentKey: string;
  content_role: string;
  grammar_frame: string;
  body: string;
  review_status: string;
}
export interface HookRow {
  contentKey: string;
  content_role: string;
  body_you: string;
  body_they: string;
  review_status: string;
}
export interface TemplatesFile { templates: TemplateRow[] }
export interface RowsFile { vocabularyRows: VocabRow[]; hookRows?: HookRow[] }

export interface PlacementFacts {
  planet: string; sign: string; house?: number | null; voice: Voice;
  dignity?: "domicile" | "exaltation" | "detriment" | "fall" | null;
  isRetrograde?: boolean;
  sect?: { hasReliableSect: boolean; isDayChart: boolean; effect: string } | null;
}
export interface AngleFacts { angle: "ascendant" | "midheaven" | "descendant" | "imum-coeli"; sign: string; voice: Voice }
export interface EmptyHouseFacts {
  house: number;
  sign: string;
  rulerSign?: string;
  rulerHouse?: number;
  primaryRuler?: string;
  /** @deprecated Empty-house rulership is computed from primaryRuler or the traditional canon. */
  ruler?: string;
  /** Explicitly ignored by empty-house assembly. Modern co-rulers are not primary rulers. */
  modernRuler?: string;
  voice?: Voice;
}
export interface AspectFacts { planetA: string; planetB: string; aspect: "conjunction" | "square" | "trine" | "sextile" | "opposition"; voice: Voice }
export interface RenderResult { headline: string; parts: string[]; body: string; templateKey: string }
export interface RenderOpts { allowUnreviewed?: boolean }

export class SourceGapError extends Error {}
export class RoleViolationError extends Error {}

const READER_ELIGIBLE = new Set(["approved_reuse", "approved", "reviewed"]);
const OPPOSITE_SIGN: Record<string, string> = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
const ASPECT_GROUP: Record<string, string> = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
const ANGLE_TITLE: Record<string, string> = { ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", "imum-coeli": "IC" };
const ORD: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
// V3 M2 mapping: house 2 must use A. The remaining modulo buckets continue
// alphabetically from there so selection stays stable without randomness.
const EMPTY_HOUSE_RULER_VARIANT: Record<number, string> = { 2: "a", 3: "b", 4: "c", 5: "d", 0: "e", 1: "f" };

const title = (s: string) => s.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
const ordinal = (n: number) => ORD[n] ?? `${n}th`;
// "a" -> "an" before vowel SOUNDS only: skip one/once (won-), uni/use/usu (yoo-), eu (yoo-)
const fixArticles = (t: string) => t.replace(/\b(a|A) (?!(?:one|once|uni|use|usu|eu))([aeiouAEIOU])/g, (_, art, ch) => `${art === "A" ? "An" : "an"} ${ch}`);

type Ctx = Record<string, string | string[] | null | undefined>;

function mustache(body: string, ctx: Ctx): string {
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
  body = body.replace(/\{\{([\w.]+)\}\}/g, (_, key) => (ctx[key] as string | undefined) ?? `{{${key}}}`);
  body = body.replace(/\{(houseOrdinal|houseTopic)\}/g, (_, key) => (ctx[key] as string | undefined) ?? `{${key}}`);
  return body;
}

export function createFallbackRenderer(templatesFile: TemplatesFile, rowsFile: RowsFile) {
  const vocab = new Map<string, VocabRow[]>();
  for (const row of rowsFile.vocabularyRows) {
    const candidates = vocab.get(row.contentKey) ?? [];
    candidates.push(row);
    vocab.set(row.contentKey, candidates);
  }
  const hooks = new Map((rowsFile.hookRows ?? []).map((r) => [r.contentKey, r]));

  const getVocab = (key: string, opts: RenderOpts = {}): string | null => {
    const row = [...(vocab.get(key) ?? [])]
      .reverse()
      .find((candidate) => opts.allowUnreviewed || READER_ELIGIBLE.has(candidate.review_status));
    if (!row) return null;
    if (row.content_role === "fallback_source") throw new RoleViolationError(`Row ${key} is fallback_source and can never fill a reader slot.`);
    if (!opts.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    return row.body;
  };
  const getVocabList = (prefix: string, opts: RenderOpts = {}): string[] => {
    const out: string[] = [];
    for (let i = 0; i < 8; i++) {
      const v = getVocab(`${prefix}/${i}`, opts);
      if (v == null) break;
      out.push(v);
    }
    return out;
  };
  const getHook = (key: string, voice: "you" | "they", opts: RenderOpts = {}): string | null => {
    const row = hooks.get(key);
    if (!row) return null;
    if (row.content_role !== "fallback_hook") throw new RoleViolationError(`Row ${key} is not a fallback_hook.`);
    if (!opts.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    return (voice === "you" ? row.body_you : row.body_they) ?? null;
  };
  const findTemplate = (key: string, opts: RenderOpts = {}): TemplateRow | null => {
    const t = templatesFile.templates.find((x) => x.contentKey === key);
    if (!t) return null;
    if (t.content_role !== "template") throw new RoleViolationError(`${key} is not a template row`);
    if (t.review_status && !opts.allowUnreviewed && !READER_ELIGIBLE.has(t.review_status)) return null;
    return t;
  };
  const getTemplate = (key: string, opts: RenderOpts = {}): TemplateRow => {
    const template = findTemplate(key, opts);
    if (!template) throw new SourceGapError(`SOURCE_GAP: missing template ${key}`);
    return template;
  };
  const renderTemplate = (template: TemplateRow, ctx: Ctx, gapLabel: string, voice: "you" | "they"): string => {
    for (const slot of template.requiredSlots ?? []) {
      if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: required slot '${slot}' has no eligible row for ${gapLabel}`);
    }
    const raw = voice === "you" ? (template.body_you ?? template.body) : (template.body_they ?? template.body);
    const body = fixArticles(mustache(raw, ctx)).replace(/\s{2,}/g, " ").trim();
    if (/\{\{|\}\}/.test(body)) throw new RoleViolationError(`Unresolved slots in rendered output: ${body}`);
    return body;
  };

  function renderNatalPlacement(facts: PlacementFacts, opts: RenderOpts = {}): RenderResult {
    const { planet, sign, house } = facts;
    const voice: "you" | "they" = facts.voice === "you" ? "you" : "they";
    const needsArticle = planet === "sun" || planet === "moon" || planet.endsWith("-node");
    const possessive = facts.voice === "you" ? "Your" : `${facts.voice}'s`;
    const ctx: Ctx = {
      possessive,
      planetTitle: title(planet),
      planetRef: needsArticle ? `the ${title(planet)}` : title(planet),
      planetRefCap: needsArticle ? `The ${title(planet)}` : title(planet),
      signTitle: title(sign),
      planetTopic: getVocab(`fallback-vocab/planet-topic/${planet}`, opts),
      planetExcess: getVocab(`fallback-vocab/planet-excess/${planet}`, opts),
      planetProductive: getVocab(`fallback-vocab/planet-productive/${planet}`, opts),
      planetCore: getVocab(`fallback-vocab/planet-core/${planet}`, opts),
      signStyle: getVocab(`fallback-vocab/sign-style/${sign}`, opts),
      signNeed: getVocab(`fallback-vocab/sign-need/${sign}`, opts),
      planetVerb: getVocab(`fallback-vocab/planet-verb/${planet}`, opts),
      signAdverb: getVocab(`fallback-vocab/sign-adverb/${sign}`, opts),
      planetIntro: getHook(`fallback-hook/planet-intro/${planet}`, voice, opts),
      planetBest: getHook(`fallback-hook/planet-best/${planet}`, voice, opts),
      placementSentences: getHook(`fallback-hook/placement-sentence/${planet}/${sign}`, voice, opts),
      placementGerundText: getVocabList(`fallback-vocab/placement-gerund/${planet}/${sign}`, opts).join(", or ") || null,
    };

    const mods: string[] = [];
    const mod = (key: string, extra: Ctx = {}) => {
      const t = templatesFile.templates.find((x) => x.contentKey === key);
      if (!t) return;
      const raw = voice === "you" ? (t.body_you ?? t.body) : (t.body_they ?? t.body);
      mods.push(mustache(raw, { ...ctx, ...extra }));
    };
    if (facts.dignity) {
      const specific = getHook(`fallback-hook/dignity-line/${facts.dignity}/${planet}`, voice, opts);
      if (specific) mods.push(specific);
      else mod(`fallback-template/natal.modifier.dignity-${facts.dignity}`);
    }
    if (facts.isRetrograde) mod("fallback-template/natal.modifier.retrograde");
    if (facts.sect?.hasReliableSect && facts.sect.effect) {
      mod(`fallback-template/natal.modifier.sect-${facts.sect.isDayChart ? "day" : "night"}`, { sectEffect: facts.sect.effect });
    }

    const gapLabel = `${planet}/${sign}${house ? `/house-${house}` : ""}`;
    const parts: string[] = [];

    const isNode = planet === "north-node" || planet === "south-node";
    if (isNode) {
      const j = getHook(`fallback-hook/node-journey/${planet}`, voice, opts);
      const oppSign = OPPOSITE_SIGN[sign];
      const oppDir = getVocab(`fallback-vocab/node-direction/${oppSign}`, opts);
      ctx.nodeJourney = j ? j.replace(/\{\{oppositeSignTitle\}\}/g, title(oppSign)).replace(/\{\{oppositeDirection\}\}/g, oppDir ?? "") : null;
    }
    const signTemplate = findTemplate(`fallback-template/natal.planet-in-sign/${planet}`, opts)
      ?? getTemplate(isNode ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
    parts.push(renderTemplate(signTemplate, { ...ctx, modifierSentences: house ? [] : mods }, gapLabel, voice));

    let headlineTemplate = signTemplate;
    if (house) {
      const houseTemplate = getTemplate("fallback-template/natal.house-context");
      const houseCtx: Ctx = {
        ...ctx,
        houseOrdinal: ordinal(house),
        houseMeaning: getHook(`fallback-hook/house-meaning/${house}`, voice, opts),
        placementHouseSentences: getHook(`fallback-hook/placement-house-sentence/${planet}/${house}`, voice, opts),
        modifierSentences: mods,
      };
      parts.push(renderTemplate(houseTemplate, houseCtx, gapLabel, voice));
      headlineTemplate = houseTemplate;
      ctx.houseOrdinal = houseCtx.houseOrdinal;
    }

    return { headline: fixArticles(mustache(headlineTemplate.headline ?? "", ctx)), parts, body: parts.join("\n\n"), templateKey: headlineTemplate.contentKey };
  }

  function renderNatalAngle(facts: AngleFacts, opts: RenderOpts = {}): RenderResult {
    const voice: "you" | "they" = facts.voice === "you" ? "you" : "they";
    const ctx: Ctx = {
      possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
      angleTitle: ANGLE_TITLE[facts.angle] ?? title(facts.angle),
      signTitle: title(facts.sign),
      angleIntro: getHook(`fallback-hook/angle-intro/${facts.angle}`, voice, opts),
      angleSignSentences: getHook(`fallback-hook/angle-sign/${facts.angle}/${facts.sign}`, voice, opts),
      modifierSentences: [],
    };
    const template = getTemplate("fallback-template/natal.angle-in-sign");
    const body = renderTemplate(template, ctx, `${facts.angle}/${facts.sign}`, voice);
    return { headline: mustache(template.headline ?? "", ctx), parts: [body], body, templateKey: template.contentKey };
  }

  function renderNatalAspect(facts: AspectFacts, opts: RenderOpts = {}): RenderResult {
    const voice: "you" | "they" = facts.voice === "you" ? "you" : "they";
    const group = ASPECT_GROUP[facts.aspect];
    const pair =
      getHook(`fallback-hook/aspect-pair/${facts.planetA}/${facts.planetB}/${group}`, voice, opts) ??
      getHook(`fallback-hook/aspect-pair/${facts.planetB}/${facts.planetA}/${group}`, voice, opts);
    const ctx: Ctx = {
      possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
      planetATitle: title(facts.planetA),
      planetBTitle: title(facts.planetB),
      aspectName: facts.aspect,
      aspectAdj: getVocab(`fallback-vocab/aspect-adj/${facts.aspect}`, opts),
      planetACore: getVocab(`fallback-vocab/planet-core/${facts.planetA}`, opts),
      planetBCore: getVocab(`fallback-vocab/planet-core/${facts.planetB}`, opts),
      aspectTypeLine: getHook(`fallback-hook/aspect-type/${facts.aspect}`, voice, opts),
      aspectMotion: getVocab(`fallback-vocab/aspect-motion/${facts.aspect}`, opts),
      possessiveLow: facts.voice === "you" ? "your" : `${facts.voice}'s`,
      pairSentences: pair,
    };
    const template = getTemplate("fallback-template/natal.aspect");
    const body = renderTemplate(template, ctx, `${facts.planetA}-${facts.aspect}-${facts.planetB}`, voice);
    return { headline: mustache(template.headline ?? "", ctx), parts: [body], body, templateKey: template.contentKey };
  }

  // ---- Empty-house pages (natal): sign-on-cusp -> ruler -> ruler placement -> activation
  // close, all dual-voice by construction (voice param; never pronoun substitution). ----
  const SIGN_RULER: Record<string, string> = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter" };

  // ---- Aspect patterns (T-square, Grand Cross, Grand Trine, Kite, Yod, Mystic Rectangle):
  // natal pattern card + activation card. Replaces the astro-knowledge copy entries; the
  // detection engine stays in the app, the words come from here. ----
  const PATTERN_NAMES: Record<string, string> = { t_square: "T-Square", grand_square: "Grand Cross", grand_trine: "Grand Trine", kite: "Kite", yod: "Yod", mystic_rectangle: "Mystic Rectangle" };
  function renderAspectPattern({ type, apexTitle, mode, element, activation = false, voice = "you" }: { type: string; apexTitle?: string; mode?: string; element?: string; activation?: boolean; voice?: Voice }): RenderResult {
    const pick = (key: string) => { const r = hooks.get(key); return r ? (voice === "you" ? r.body_you : r.body_they) : null; };
    const body = pick(`fallback-hook/aspect-pattern${activation ? "-activation" : ""}/${type}`);
    if (!body) throw new SourceGapError(`SOURCE_GAP: aspect pattern ${type}${activation ? " activation" : ""}`);
    const paras = [body];
    if (!activation && apexTitle) {
      const apex = pick(`fallback-hook/aspect-pattern-apex/${type}`);
      if (apex) paras.push(apex.replace(/\{\{apexTitle\}\}/g, apexTitle));
    }
    if (!activation) {
      const qual = mode
        ? getVocab(`fallback-vocab/pattern-mode/${mode}`, opts)
        : element
          ? getVocab(`fallback-vocab/pattern-element/${element}`, opts)
          : null;
      if (qual) paras.push(`It runs as ${qual}.`);
    }
    return { headline: PATTERN_NAMES[type] ?? type, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/natal.aspect-pattern" } as RenderResult;
  }

  // ---- House glossary: one-sentence house definitions (replaces the legacy hardcoded
  // glossary in App.tsx). Used for tooltips, chart legends, and house headers. ----
  function renderHouseGlossary({ house, voice = "you" }: { house: number; voice?: Voice }): RenderResult {
    const r = hooks.get(`fallback-hook/house-glossary/${house}`);
    if (!r) throw new SourceGapError(`SOURCE_GAP: house glossary ${house}`);
    const body = voice === "you" ? r.body_you : r.body_they;
    return { headline: `${ordinal(house)} House`, body, parts: [body], templateKey: "fallback-template/natal.house-glossary", contentKey: r.contentKey } as RenderResult;
  }

  function renderNatalEmptyHouse(facts: EmptyHouseFacts, opts: RenderOpts = {}): RenderResult & { note: string | null } {
    const { house, sign, rulerSign, rulerHouse, voice = "you" } = facts;
    const v = voice === "you" ? "you" : "they";
    const ruler = facts.primaryRuler ?? SIGN_RULER[sign];
    const houseTopic = getVocab(`fallback-vocab/house-topic/${house}`, opts);
    const rulerHouseJurisdiction = rulerHouse
      ? (v === "they" ? getVocab(`fallback-vocab/house-jurisdiction-they/${rulerHouse}`, opts) : null)
        ?? getVocab(`fallback-vocab/house-jurisdiction/${rulerHouse}`, opts)
      : null;
    const rulerHouseTopic = rulerHouse ? getVocab(`fallback-vocab/house-topic/${rulerHouse}`, opts) : null;
    const cusp = getHook(`fallback-hook/house-cusp/${sign}`, v, opts);
    const rulerVariant = EMPTY_HOUSE_RULER_VARIANT[house % 6];
    const rulerFrame = getHook(`fallback-hook/empty-house-ruler-v3/${rulerVariant}`, v, opts)
      ?? getHook("fallback-hook/empty-house-ruler", v, opts);
    const placementFrame = getHook("fallback-hook/empty-house-placement", v, opts);
    const bridgeLead = getHook(`fallback-hook/empty-house-bridge/${house}`, v, opts);
    const closeFrame = getHook("fallback-hook/empty-house-close", v, opts);
    const note = getHook("fallback-hook/empty-house-explainer", v, opts);
    const placementLine = rulerSign ? getHook(`fallback-hook/placement-sentence/${ruler}/${rulerSign}`, v, opts) : null;
    if (!houseTopic || !rulerHouseJurisdiction || !rulerHouseTopic || !cusp || !rulerFrame || !placementFrame || !bridgeLead || !closeFrame || !placementLine || !rulerSign || !rulerHouse) {
      throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} (${v})`);
    }
    const REF: Record<string, string> = { sun: "the Sun", moon: "the Moon" };
    const rulerRef = REF[ruler] ?? title(ruler);
    const rulerPossessive = rulerRef.endsWith("s") ? `${rulerRef}'` : `${rulerRef}'s`;
    const ctx: Record<string, string | null> = {
      houseOrdinal: ordinal(house), houseTopic, signTitle: title(sign),
      rulerRef, rulerRefCap: rulerRef.replace(/^./, (char) => char.toUpperCase()), rulerTitle: title(ruler),
      rulerPossessive,
      rulerSignTitle: rulerSign ? title(rulerSign) : null,
      rulerHouseOrdinal: rulerHouse ? ordinal(rulerHouse) : null,
      rulerHouseJurisdiction,
      rulerHouseTopic,
      placementLine,
    };
    const paras = [
      mustache(cusp, ctx),
      mustache(rulerFrame, ctx),
      mustache(placementFrame, ctx),
      `Because of this, ${bridgeLead.replace(/^./, (char) => char.toLowerCase())} through the way ${v === "you" ? "you" : "they"} handle ${rulerHouseTopic}.`,
      mustache(closeFrame, ctx)
    ];
    const cleaned = paras.map((p) => fixArticles(p).replace(/\s{2,}/g, " ").trim());
    for (const p of cleaned) if (/\{\{/.test(p)) throw new SourceGapError(`SOURCE_GAP: empty house ${house}/${sign} unresolved slot`);
    const body = cleaned.join(" ");
    if (/[—]|--/u.test(body)) throw new RoleViolationError(`Empty-house punctuation gate failed for ${house}/${sign}.`);
    return { headline: `${ordinal(house)} House`, note, body, parts: cleaned, templateKey: "fallback-template/natal.empty-house" };
  }


  // Profection-year line (annual profections): per-person section for Friends Circle
  // profection stories and the You page. Dual-voice by construction.
  function renderProfectionYear(facts: { house: number; sign?: string; ruler?: string; voice?: Voice }, opts: RenderOpts = {}): RenderResult & { note: string | null } {
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
        const REF: Record<string, string> = { sun: "the Sun", moon: "the Moon" };
        const p = mustache(frame, { signTitle: title(sign), houseOrdinal: ordinal(house), rulerRef: REF[ruler] ?? title(ruler) });
        if (!/\{\{/.test(p)) parts.push(p);
      }
    }
    return { headline: `${ordinal(house)} House Year`, note, body: parts.join("\n\n"), parts, templateKey: "fallback-template/natal.profection-year" };
  }

  return { renderNatalPlacement, renderNatalAngle, renderNatalAspect, renderNatalEmptyHouse, renderProfectionYear, renderHouseGlossary, renderAspectPattern };
}

/** Normalize app wording to the five canonical aspect ids ("conjunct" -> "conjunction", etc).
 *  Returns null for anything the package does not cover (minor aspects like quincunx),
 *  so callers can route those to SOURCE_GAP instead of rendering. */
export function normalizeAspect(input: string): "conjunction" | "square" | "trine" | "sextile" | "opposition" | null {
  const k = input.trim().toLowerCase();
  const map: Record<string, "conjunction" | "square" | "trine" | "sextile" | "opposition"> = {
    conjunction: "conjunction", conjunct: "conjunction", conj: "conjunction",
    square: "square", sq: "square",
    trine: "trine",
    sextile: "sextile", sext: "sextile",
    opposition: "opposition", opposite: "opposition", opposed: "opposition", oppose: "opposition",
  };
  return map[k] ?? null;
}
