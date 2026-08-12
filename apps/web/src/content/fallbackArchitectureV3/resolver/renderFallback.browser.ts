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
  body?: string;
  body_they?: string;
  review_status: string;
}
export interface ApprovalReference {
  approvalLevel: "exact_owner_approved" | "owner_signoff_untraced";
  recordPath?: string;
  payloadSha256?: string;
  approvedAt: string;
}
export interface HookRow {
  contentKey: string;
  content_role: string;
  grammar_frame?: string;
  body?: string;
  body_you?: string;
  body_they?: string;
  review_status: string;
  approved_via?: string;
  approval?: ApprovalReference;
  render_policy?: string;
  reader_only?: boolean;
  sourceMechanism?: string;
  astroHint?: string;
  fact_line?: string;
  aspect_insert?: string;
  primary_hook?: string;
  opening_heading?: string;
  opening?: string;
  tension_heading?: string;
  tension?: string;
  development_heading?: string;
  development?: string;
  close_heading?: string;
  close?: string;
  try_this?: string[];
  aspect_units?: Array<{
    planets: string[];
    aspect: string;
    heading: string;
    opportunity: string;
    check: string;
  }>;
  moon_entry_aspect_units?: Array<{
    planets: string[];
    signs: Record<string, string>;
    aspect: string;
    body: string;
  }>;
}
export interface TemplatesFile { templates: TemplateRow[] }
export interface DailyGlanceVariantText {
  id: string;
  text: string;
  review_status: string;
  provenance?: Record<string, string>;
}
export interface DailyGlanceVariantPairing {
  id: string;
  headline_id: string;
  body_id: string;
  review_status: string;
  provenance?: Record<string, string>;
}
export interface DailyGlanceVariantSet {
  pairing_policy: "explicit_pairs_only";
  headlines: DailyGlanceVariantText[];
  bodies: DailyGlanceVariantText[];
  pairings: DailyGlanceVariantPairing[];
}
export interface DailyGlanceVariantsFile {
  schema: "tldrastro-daily-glance-variants-v1";
  version: string;
  note?: string;
  keys: Record<string, DailyGlanceVariantSet>;
}
export interface RowsFile {
  vocabularyRows: VocabRow[];
  hookRows?: HookRow[];
  dailyGlanceVariants?: DailyGlanceVariantsFile;
}

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
  /** Surface-local ruler system. Phase 1 defaults to the V14 modern map. */
  rulerSystem?: "modern" | "traditional";
  /** @deprecated V14 renders one exact ruler layer per empty house. */
  rulerOccurrence?: number;
  /** @deprecated Empty-house V14 resolves its modern ruler from the cusp sign. */
  ruler?: string;
  /** @deprecated Empty-house V14 resolves its modern ruler from the cusp sign. */
  modernRuler?: string;
  voice?: Voice;
}
export interface AspectFacts { planetA: string; planetB: string; aspect: "conjunction" | "square" | "trine" | "sextile" | "opposition" | "quincunx" | "semisextile" | "nonagen"; voice: Voice }
export interface RenderResult { headline: string; parts: string[]; body: string; templateKey: string; astroHint?: string; sourceKeys?: string[] }
export interface RenderOpts {
  allowUnreviewed?: boolean;
  /** Adds the owner-approved mechanism bridge on empty-house detail pages only. */
  includeEmptyHouseBridge?: boolean;
}

export class SourceGapError extends Error {}
export class RoleViolationError extends Error {}

const SECOND_PERSON = /\b(?:you|your|yours|yourself|yourselves|you're|you've|you'll)\b/iu;
const stripSlots = (text: unknown) => String(text ?? "").replace(/\{\{[^}]+\}\}/gu, "");

export function vocabularyBodyForVoice(row: VocabRow | undefined, voice: "you" | "they"): string | null {
  const body = voice === "you" ? row?.body : (row?.body_they ?? row?.body);
  if (typeof body !== "string" || !body.trim()) return null;
  if (voice === "they" && SECOND_PERSON.test(stripSlots(body))) return null;
  return body;
}

const READER_ELIGIBLE = new Set(["approved_reuse", "approved", "reviewed"]);
const OPPOSITE_SIGN: Record<string, string> = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
const ASPECT_GROUP: Record<string, string> = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
const ANGLE_TITLE: Record<string, string> = { ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", "imum-coeli": "IC" };
const ORD: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
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

  const getVocab = (key: string, voice: "you" | "they" = "you", opts: RenderOpts = {}): string | null => {
    const row = [...(vocab.get(key) ?? [])]
      .reverse()
      .find((candidate) => (
        (opts.allowUnreviewed || READER_ELIGIBLE.has(candidate.review_status))
        && (voice === "you"
          ? typeof candidate.body === "string"
          : typeof (candidate.body_they ?? candidate.body) === "string")
      ));
    if (!row) return null;
    const body = vocabularyBodyForVoice(row, voice);
    if (body == null) return null;
    if (row.content_role === "fallback_source") throw new RoleViolationError(`Row ${key} is fallback_source and can never fill a reader slot.`);
    if (!opts.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    return body;
  };
  const getVocabList = (prefix: string, voice: "you" | "they" = "you", opts: RenderOpts = {}): string[] => {
    const out: string[] = [];
    for (let i = 0; i < 8; i++) {
      const v = getVocab(`${prefix}/${i}`, voice, opts);
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
  const getReaderLivedRow = (key: string, voice: "you" | "they", opts: RenderOpts = {}): HookRow | null => {
    if (voice !== "you") return null;
    const row = hooks.get(key);
    if (!row) return null;
    if (!["fallback_hook", "full_copy"].includes(row.content_role)) {
      throw new RoleViolationError(`Row ${key} is not a reader-eligible exact-copy role.`);
    }
    if (!opts.allowUnreviewed && !READER_ELIGIBLE.has(row.review_status)) return null;
    if (row.reader_only !== true || row.render_policy !== "reader-only-exact-lived-v1") {
      throw new RoleViolationError(`Row ${key} is not a reader-only exact lived row.`);
    }
    return typeof row.body === "string" && row.body.trim() ? row : null;
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
    const exactHouseLived = house
      ? getReaderLivedRow(`fallback-hook/placement-house-lived/${planet}/${house}`, voice, opts)
        ?? getReaderLivedRow(`fallback-hook/house-lived/${house}`, voice, opts)
      : null;
    if (exactHouseLived) {
      return {
        headline: `${title(planet)} in the ${ordinal(house)} house`,
        parts: [exactHouseLived.body ?? ""],
        body: exactHouseLived.body ?? "",
        templateKey: exactHouseLived.contentKey,
      };
    }
    const exactSignLived = getReaderLivedRow(`fallback-hook/placement-sign-lived/${planet}/${sign}`, voice, opts)
      ?? getReaderLivedRow(`fallback-hook/sign-lived/${sign}`, voice, opts);
    const needsArticle = planet === "sun" || planet === "moon" || planet.endsWith("-node");
    const possessive = facts.voice === "you" ? "Your" : `${facts.voice}'s`;
    const ctx: Ctx = {
      possessive,
      planetTitle: title(planet),
      planetRef: needsArticle ? `the ${title(planet)}` : title(planet),
      planetRefCap: needsArticle ? `The ${title(planet)}` : title(planet),
      signTitle: title(sign),
      planetTopic: getVocab(`fallback-vocab/planet-topic/${planet}`, voice, opts),
      planetExcess: getVocab(`fallback-vocab/planet-excess/${planet}`, voice, opts),
      planetProductive: getVocab(`fallback-vocab/planet-productive/${planet}`, voice, opts),
      planetCore: getVocab(`fallback-vocab/planet-core/${planet}`, voice, opts),
      signStyle: getVocab(`fallback-vocab/sign-style/${sign}`, voice, opts),
      signNeed: getVocab(`fallback-vocab/sign-need/${sign}`, voice, opts),
      planetVerb: getVocab(`fallback-vocab/planet-verb/${planet}`, voice, opts),
      signAdverb: getVocab(`fallback-vocab/sign-adverb/${sign}`, voice, opts),
      planetIntro: getReaderLivedRow(`fallback-hook/planet-lived/${planet}`, voice, opts)?.body
        ?? getHook(`fallback-hook/planet-intro/${planet}`, voice, opts),
      planetBest: getHook(`fallback-hook/planet-best/${planet}`, voice, opts),
      placementSentences: getHook(`fallback-hook/placement-sentence/${planet}/${sign}`, voice, opts),
      placementGerundText: getVocabList(`fallback-vocab/placement-gerund/${planet}/${sign}`, voice, opts).join(", or ") || null,
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
      const oppDir = getVocab(`fallback-vocab/node-direction/${oppSign}`, voice, opts);
      ctx.nodeJourney = j ? j.replace(/\{\{oppositeSignTitle\}\}/g, title(oppSign)).replace(/\{\{oppositeDirection\}\}/g, oppDir ?? "") : null;
    }
    const signTemplate = findTemplate(`fallback-template/natal.planet-in-sign/${planet}`, opts)
      ?? getTemplate(isNode ? "fallback-template/natal.node-in-sign" : "fallback-template/natal.planet-in-sign");
    parts.push(exactSignLived?.body ?? renderTemplate(signTemplate, { ...ctx, modifierSentences: house ? [] : mods }, gapLabel, voice));

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
    const aspect = facts.aspect;
    const exactLived =
      getReaderLivedRow(`fallback-hook/natal-aspect-lived/${facts.planetA}/${aspect}/${facts.planetB}`, voice, opts)
      ?? getReaderLivedRow(`fallback-hook/natal-aspect-lived/${facts.planetB}/${aspect}/${facts.planetA}`, voice, opts)
      ?? getReaderLivedRow(`fallback-hook/aspect-lived/${aspect}`, voice, opts);
    if (exactLived) {
      return {
        headline: `${title(facts.planetA)} ${aspect} ${title(facts.planetB)}`,
        parts: [exactLived.body ?? ""],
        body: exactLived.body ?? "",
        astroHint: exactLived.astroHint,
        templateKey: exactLived.contentKey,
      };
    }
    const group = ASPECT_GROUP[aspect];
    if (!group) throw new SourceGapError(`SOURCE_GAP: natal aspect ${facts.planetA}-${aspect}-${facts.planetB}`);
    const pair =
      getHook(`fallback-hook/aspect-pair/${facts.planetA}/${facts.planetB}/${group}`, voice, opts) ??
      getHook(`fallback-hook/aspect-pair/${facts.planetB}/${facts.planetA}/${group}`, voice, opts);
    const ctx: Ctx = {
      possessive: facts.voice === "you" ? "Your" : `${facts.voice}'s`,
      planetATitle: title(facts.planetA),
      planetBTitle: title(facts.planetB),
      aspectName: aspect,
      aspectAdj: getVocab(`fallback-vocab/aspect-adj/${aspect}`, voice, opts),
      planetACore: getVocab(`fallback-vocab/planet-core/${facts.planetA}`, voice, opts),
      planetBCore: getVocab(`fallback-vocab/planet-core/${facts.planetB}`, voice, opts),
      aspectTypeLine: getHook(`fallback-hook/aspect-type/${aspect}`, voice, opts),
      aspectMotion: getVocab(`fallback-vocab/aspect-motion/${aspect}`, voice, opts),
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
  const EMPTY_HOUSE_V14_MODERN_RULER: Record<string, string> = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "pluto", sagittarius: "jupiter", capricorn: "saturn", aquarius: "uranus", pisces: "neptune" };
  const EMPTY_HOUSE_RULERS: Record<"modern" | "traditional", Record<string, string>> = { modern: EMPTY_HOUSE_V14_MODERN_RULER, traditional: SIGN_RULER };

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
        ? getVocab(`fallback-vocab/pattern-mode/${mode}`, voice === "you" ? "you" : "they", opts)
        : element
          ? getVocab(`fallback-vocab/pattern-element/${element}`, voice === "you" ? "you" : "they", opts)
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

/** Normalize app wording to the supported canonical aspect ids ("conjunct" -> "conjunction", etc).
 *  Inconjunct normalizes to the engine's canonical quincunx id. */
export function normalizeAspect(input: string): "conjunction" | "square" | "trine" | "sextile" | "opposition" | "quincunx" | "semisextile" | "nonagen" | null {
  const k = input.trim().toLowerCase();
  const map: Record<string, "conjunction" | "square" | "trine" | "sextile" | "opposition" | "quincunx" | "semisextile" | "nonagen"> = {
    conjunction: "conjunction", conjunct: "conjunction", conj: "conjunction",
    square: "square", sq: "square",
    trine: "trine",
    sextile: "sextile", sext: "sextile",
    opposition: "opposition", opposite: "opposition", opposed: "opposition", oppose: "opposition",
    quincunx: "quincunx", inconjunct: "quincunx",
    semisextile: "semisextile", "semi-sextile": "semisextile", "semi sextile": "semisextile",
    nonagen: "nonagen",
  };
  return map[k] ?? null;
}
