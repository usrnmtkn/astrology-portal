// TLDR Astro transit + synastry resolver (v1) — Node reference.
// Authored-first: owner-library cards (full_copy) render verbatim; synastry aspects
// have a fallback template; everything else without a card is SOURCE_GAP.
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { SourceGapError } from "./renderFallback.mjs";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const lib = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/transit-synastry-rows-v1.json"), "utf8"));
const rowsFile = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/fallback-source-rows-v3.json"), "utf8"));
const templates = JSON.parse(fs.readFileSync(path.join(here, "../templates/fallback-templates-v3.json"), "utf8"));

const cards = new Map(lib.authoredCards.map((c) => [c.contentKey, c]));
const vocab = new Map(rowsFile.vocabularyRows.map((r) => [r.contentKey, r]));
const hooks = new Map(rowsFile.hookRows.map((r) => [r.contentKey, r]));
const FAST = new Set(["moon", "mercury", "venus", "mars"]);
const ELEMENT = { aries: "fire", leo: "fire", sagittarius: "fire", taurus: "earth", virgo: "earth", capricorn: "earth", gemini: "air", libra: "air", aquarius: "air", cancer: "water", scorpio: "water", pisces: "water" };
const ORD = { 1: "1st", 2: "2nd", 3: "3rd" };
const ordinal = (n) => ORD[n] ?? `${n}th`;
const tpl = (key) => templates.templates.find((t) => t.contentKey === key);
const fill = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).replace(/\s{2,}/g, " ").trim();
const hookVoice = (key, voice) => { const r = hooks.get(key); return r ? (voice === "you" ? r.body_you : r.body_they) : null; };
const GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
const GROUP_EXAMPLE = { hard: "square", soft: "trine" };
const EXACT_AUTHORED_NATALS = new Set(["chiron", "north-node", "south-node"]);
// default time windows by transiting-planet speed; the engine may override via facts.window
const WINDOW_ASPECT = { moon: "Today", sun: "This week", mercury: "This week", venus: "This week", mars: "For the next couple of weeks", jupiter: "This month", saturn: "For the next few months", uranus: "For the next few months", neptune: "For the next few months", pluto: "For the next few months", chiron: "For the next few months", "north-node": "For the next few months", "south-node": "For the next few months", lilith: "This month" };
const WINDOW_HOUSE = { moon: "For the next couple of days", sun: "This month", mercury: "For the next few weeks", venus: "For the next few weeks", mars: "For the next month or two" };
// typical retrograde lengths; engine overrides with real dates via facts.window
const WINDOW_RETRO = { mercury: "For about three weeks", venus: "For about six weeks", mars: "For the next couple of months", jupiter: "For about four months", saturn: "For about four and a half months", uranus: "For about five months", neptune: "For about five months", pluto: "For about five months", chiron: "For about five months" };
const title = (s) => s.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
const NEEDS_ARTICLE = new Set(["sun", "moon", "north-node", "south-node"]);
// mid-sentence reference: "the Sun", optionally with its current sign: "the Sun in Leo"
const transitRef = (planet, sign) => `${NEEDS_ARTICLE.has(planet) ? "the " : ""}${title(planet)}${sign ? ` in ${title(sign)}` : ""}`;


// sentence-start window phrase -> mid-sentence ("Until Nov 13" -> "through Nov 13")
const inlineWindow = (w) => {
  if (!w) return null;
  if (w.startsWith("Until ")) return "through " + w.slice(6);
  if (w.startsWith("For the next")) return "over the next" + w.slice(12);
  if (w.startsWith("For about")) return "for about" + w.slice(9);
  return w.charAt(0).toLowerCase() + w.slice(1);
};
const card = (k) => cards.get(k) ?? null;
const result = (c, templateKey) => ({ headline: c.headline || "", body: c.body, parts: [c.body], templateKey, contentKey: c.contentKey });

export function renderTransitHouse({ planet, house, sign, window: win, voice = "you" }) {
  const v = voice === "you" ? "you" : "they";
  if (v === "you") { const c = card(`authored/transit-house/${planet}/${house}`); if (c) return result(c, "authored/transit-house"); }
  const T = tpl("fallback-template/transit.house");
  const houseTopic = vocab.get(`fallback-vocab/house-topic/${house}`)?.body;
  const effectRaw = hookVoice(`fallback-hook/transit-effect-house/${planet}`, v);
  const ctx = {
    timeOpen: win ?? WINDOW_HOUSE[planet] ?? "Currently",
    transitTitle: title(planet), transitRef: transitRef(planet, sign), houseOrdinal: ordinal(house),
    houseTopic, otherPoss: v === "they" ? `${voice}'s` : null,
    // what this planet DOES to that area of life, not just that it is visiting
    houseEffect: effectRaw && houseTopic ? fill(effectRaw, { houseTopic }) : null,
  };
  for (const slot of T.requiredSlots) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: transit-house ${planet}/${house} (no card, fallback slot ${slot} missing)`);
  const body = fill(v === "you" ? (T.body_you ?? T.body) : (T.body_they ?? T.body), ctx);
  return { headline: fill(v === "you" ? T.headline : (T.headline_they ?? T.headline), ctx), body, parts: [body], templateKey: T.contentKey };
}

export function renderTransitAspect({ transiting, natal, aspect, variant, sign, isRetrograde, window: win, voice = "you" }) {
  // voice: "you" (reader) or a friend's display name. The authored library is reader-voice,
  // so friend view renders fallback-only in authored friend-voice rows (never pronoun swaps).
  const v = voice === "you" ? "you" : "they";
  const otherPoss = v === "they" ? `${voice}'s` : null;
  const g = GROUP[aspect] ?? aspect; // accepts group names directly
  // Batch 3 sharing rule, direction-aware: a conjunction reads as the hard unit when a
  // heavy planet is involved and as the soft unit otherwise. Soft/hard only borrow the
  // conjunction unit when its tone matches (soft for light pairs, hard for heavy pairs).
  const HEAVY = new Set(["saturn", "uranus", "neptune", "pluto", "chiron"]);
  const isHeavy = HEAVY.has(transiting) || HEAVY.has(natal);
  const SHARE = {
    conjunction: isHeavy ? ["hard", "soft"] : ["soft", "hard"],
    soft: isHeavy ? [] : ["conjunction"],
    hard: isHeavy ? ["conjunction"] : [],
  };
  const groupsToTry = [g, ...(SHARE[g] ?? [])];
  const tryKeys = [];
  tryKeys.push(`authored/transit-aspect/${transiting}/${natal}/${aspect}`);
  const push = (a, b) => {
    if (variant) tryKeys.push(`authored/transit-aspect/${a}/${b}/${g}/variant-${variant}`);
    for (const gg of groupsToTry) tryKeys.push(`authored/transit-aspect/${a}/${b}/${gg}`);
    tryKeys.push(`authored/transit-aspect/${a}/${b}/any`);
  };
  push(transiting, natal);
  if (FAST.has(transiting) && FAST.has(natal)) push(natal, transiting); // mirror rule (Batch 4)
  if (!EXACT_AUTHORED_NATALS.has(natal)) {
    tryKeys.push(`authored/transit-aspect/any/${natal}/${g}`, `authored/transit-aspect/any/${natal}/conjunction`);
  }
  if (v === "you") for (const k of tryKeys) { const c = card(k); if (c) return result(c, "authored/transit-aspect"); }
  // fallback template
  const T = tpl("fallback-template/transit.aspect");
  // the natal planet's life areas, so type lines can say WHAT gets easier/harder
  const ANGLES = new Set(["ascendant", "midheaven", "descendant", "imum-coeli"]);
  const natalArea = vocab.get(`fallback-vocab/planet-topic/${natal}`)?.body ?? vocab.get(`fallback-vocab/angle-area/${natal}`)?.body;
  // angle targets get their own type line when one exists (richer phrasing per owner)
  const concreteAspect = GROUP_EXAMPLE[aspect] ?? aspect;
  const typeLineRaw = (ANGLES.has(natal) ? hookVoice(`fallback-hook/transit-aspect-type/${concreteAspect}/angle`, v) : null)
    ?? hookVoice(`fallback-hook/transit-aspect-type/${concreteAspect}`, v);
  // what to expect from THIS transiting planet, landing on the natal planet's areas.
  // soft contacts (trine, sextile, light conjunction) use the flowing effect;
  // hard contacts (square, opposition, heavy conjunction) use the pressure effect.
  const effectFamily = g === "soft" || (g === "conjunction" && !isHeavy) ? "soft" : "hard";
  // variant rotation for repeat viewers: engine passes variant 2 or 3, base otherwise
  const effectRaw = hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v)
    ?? (variant ? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/variant-${variant}`, v) : null)
    ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}`, v);
  const transitEffect = effectRaw && natalArea ? fill(effectRaw, { natalArea }) : null;
  const natalCoreVal = hookVoice(`fallback-hook/natal-core/${natal}`, v) ?? vocab.get(`fallback-vocab/planet-core/${natal}`)?.body;
  const ctx = {
    timeOpen: win ?? WINDOW_ASPECT[transiting] ?? "Currently",
    transitTitle: title(transiting), transitRef: transitRef(transiting, sign), natalTitle: title(natal), aspectName: aspect,
    aspectAdj: vocab.get(`fallback-vocab/aspect-adj/${concreteAspect}`)?.body,
    transitTopic: vocab.get(`fallback-vocab/planet-topic/${transiting}`)?.body,
    aspectVerb: (() => { const f = vocab.get(`fallback-vocab/aspect-verb/${aspect}`)?.body; const tt = vocab.get(`fallback-vocab/planet-topic/${transiting}`)?.body; return f && tt && natalCoreVal ? fill(f, { transitTopic: tt, natalCore: natalCoreVal }) : null; })(),
    // voice-aware natal target ("your mind", "how you meet the world"); friend view uses body_they
    natalCore: natalCoreVal,
    otherPoss,
    timeInline: inlineWindow(win ?? WINDOW_ASPECT[transiting] ?? "currently"),
    transitEffectLine: transitEffect ? `${transitEffect.charAt(0).toUpperCase()}${transitEffect.slice(1).replace(/\.$/, "")}.` : null,
    transitTypeLine: typeLineRaw ? fill(typeLineRaw, { natalArea, transitEffect }) : typeLineRaw,
  };
  for (const slot of T.requiredSlots) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: transit-aspect ${transiting}/${natal}/${g} (no card, fallback slot ${slot} missing)`);
  let body = fill(v === "you" ? (T.body_you ?? T.body) : (T.body_they ?? T.body), ctx);
  body = body.charAt(0).toUpperCase() + body.slice(1);
  // retrograde contacts repeat; say so (fallback path only, authored cards stay verbatim)
  if (isRetrograde && v === "you") {
    const retroLine = hooks.get("fallback-hook/transit-retro-aspect")?.body_you;
    if (retroLine) body = `${body} ${fill(retroLine, ctx)}`;
  }
  return { headline: fill(v === "you" ? T.headline : (T.headline_they ?? T.headline), ctx), body, parts: [body], templateKey: T.contentKey };
}

// Retrograde season card: what this planet's retrograde means and what to do with it.
// Sun and Moon never go retrograde; the nodes nearly always are, so neither gets a card.
export function renderTransitRetro({ planet, sign, window: win, format }) {
  if (format === "article") {
    const ca = card(`authored/transit-retro-article/${planet}`);
    if (ca) return result(ca, "authored/transit-retro-article");
    const T = tpl("fallback-template/transit.retrograde-article");
    const row = hooks.get(`fallback-hook/transit-retro-article/${planet}`);
    const ctx = {
      timeOpen: win ?? WINDOW_RETRO[planet],
      transitRef: transitRef(planet, sign),
      articleHeadline: row?.headline,
      articleBody: row ? fill(row.body_you, { timeOpen: win ?? WINDOW_RETRO[planet], transitRef: transitRef(planet, sign) }) : null,
    };
    for (const slot of T.requiredSlots) if (ctx[slot] == null && slot !== "articleHeadline") throw new SourceGapError(`SOURCE_GAP: retrograde article ${planet}`);
    const body = ctx.articleBody;
    return { headline: ctx.articleHeadline ?? "", body, parts: [body], templateKey: T.contentKey };
  }
  const c = card(`authored/transit-retro/${planet}`);
  if (c) return result(c, "authored/transit-retro");
  const T = tpl("fallback-template/transit.retrograde");
  const ctx = {
    timeOpen: win ?? WINDOW_RETRO[planet],
    transitTitle: title(planet), transitRef: transitRef(planet, sign),
    retroMeaning: hooks.get(`fallback-hook/transit-retro/${planet}`)?.body_you,
  };
  for (const slot of T.requiredSlots) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: retrograde ${planet} (slot ${slot} missing; Sun/Moon/nodes have no retrograde copy by design)`);
  const body = fill(T.body, ctx);
  return { headline: fill(T.headline, ctx), body, parts: [body], templateKey: T.contentKey };
}

// One-line stack label for the daily "behind this forecast" list.
// Formula (Co-Star convention, owner-approved verbs): {Planet} {verb} {natal life area}.
// conjunction = transforming, hard = challenging, soft = boosting. Engine supplies the
// duration line ("Through Saturday") from real ephemeris data via `window`.
export function renderTransitLabel({ transiting, natal, aspect, window: win }) {
  const g = GROUP[aspect] ?? aspect;
  const verb = g === "conjunction" ? "transforming" : g === "hard" ? "challenging" : "boosting";
  const noun = vocab.get(`fallback-vocab/transit-label-noun/${natal}`)?.body;
  if (!noun) throw new SourceGapError(`SOURCE_GAP: no label noun for ${natal}`);
  return { label: `${title(transiting)} ${verb} ${noun}`, window: win ?? WINDOW_ASPECT[transiting] ?? "Currently" };
}


// ---- Sky page: season articles + per-sign horoscopes (structure extracted from the
// owner's Virgo Season piece; all dates/degrees come from the engine as dateLine facts) ----


// speed order for sky aspects: the slower body acts, the faster body's territory receives
const SPEED = ["moon", "mercury", "venus", "sun", "mars", "jupiter", "saturn", "chiron", "uranus", "neptune", "pluto", "north-node", "south-node"];
function pairEffect(ev, areaOverride) {
  if (!ev.a || !ev.b || !ev.aspect) return null;
  const slower = SPEED.indexOf(ev.a) >= SPEED.indexOf(ev.b) ? ev.a : ev.b;
  const faster = slower === ev.a ? ev.b : ev.a;
  const g = GROUP[ev.aspect] ?? ev.aspect;
  const heavy = ["saturn", "uranus", "neptune", "pluto", "chiron"].includes(slower) || ["saturn", "uranus", "neptune", "pluto", "chiron"].includes(faster);
  const family = g === "soft" || (g === "conjunction" && !heavy) ? "soft" : "hard";
  const raw = hooks.get(`fallback-hook/transit-effect-${family}/${slower}`)?.body_you;
  const area = areaOverride ?? vocab.get(`fallback-vocab/planet-topic/${faster}`)?.body;
  if (!raw || !area) return null;
  const eff = fill(raw, { natalArea: area });
  return eff.charAt(0).toLowerCase() + eff.slice(1) + ".";
}

function eventCtx(ev) {
  const g = ev.aspect ? (GROUP[ev.aspect] ?? ev.aspect) : null;
  return {
    dateLine: ev.dateLine,
    aRef: ev.a ? transitRef(ev.a, ev.aSign) : null,
    bRef: ev.b ? transitRef(ev.b, ev.bSign) : null,
    aTopic: ev.a ? vocab.get(`fallback-vocab/planet-topic/${ev.a}`)?.body : null,
    bTopic: ev.b ? vocab.get(`fallback-vocab/planet-topic/${ev.b}`)?.body : null,
    aspectAdj: ev.aspect ? vocab.get(`fallback-vocab/aspect-adj/${ev.aspect}`)?.body : null,
    signTitle: ev.sign ? title(ev.sign) : null,
    signNeed: ev.sign ? vocab.get(`fallback-vocab/sign-need/${ev.sign}`)?.body : null,
    signTrap: ev.sign ? hooks.get(`fallback-hook/sky-sign-trap/${ev.sign}`)?.body_you : null,
    houseAOrdinal: ev.houseA ? ordinal(ev.houseA) : null,
    houseBOrdinal: ev.houseB ? ordinal(ev.houseB) : null,
    houseATopic: ev.houseA ? vocab.get(`fallback-vocab/house-topic/${ev.houseA}`)?.body : null,
    houseJurisdiction: ev.houseA ? vocab.get(`fallback-vocab/house-jurisdiction/${ev.houseA}`)?.body : null,
    houseBTopic: ev.houseB ? vocab.get(`fallback-vocab/house-topic/${ev.houseB}`)?.body : null,
    // the specific pair meaning: slower planet's effect landing on the faster planet's
    // territory (season) or on the reader's houseA territory (horoscope)
    pe: null,
    ...( () => { const pe = pairEffect(ev, ev.houseA ? vocab.get(`fallback-vocab/house-topic/${ev.houseA}`)?.body : null);
      return { pairEffect: pe, pairEffectCap: pe ? pe.charAt(0).toUpperCase() + pe.slice(1) : null }; } )(),
    group: g,
  };
}

// Season article: opener + one paragraph per engine-supplied sky event + shadow + close.
// events: [{ type: ingress|station-retro|station-direct|new-moon|full-moon|eclipse-lunar|eclipse-solar|aspect,
//            a, b, aspect, sign, aSign, bSign, dateLine }]
export function renderSkySeason({ sign, events = [] }) {
  const opener = hooks.get(`fallback-hook/sky-season-opener/${sign}`)?.body_you;
  const shadow = hooks.get(`fallback-hook/sky-season-shadow/${sign}`)?.body_you;
  const close = hooks.get(`fallback-hook/sky-season-close/${sign}`)?.body_you;
  if (!opener || !shadow || !close) throw new SourceGapError(`SOURCE_GAP: season sections for ${sign}`);
  const lore = hooks.get(`fallback-hook/sky-season-lore/${sign}`)?.body_you;
  const ritual = hooks.get(`fallback-hook/sky-season-ritual/${sign}`)?.body_you;
  const paras = [opener, lore, ritual].filter(Boolean);
  for (const ev of events) {
    const type = ev.type === "aspect" ? `aspect-${GROUP[ev.aspect] ?? ev.aspect}` : ev.type;
    const frame = hooks.get(`fallback-hook/sky-event/${type}`)?.body_you;
    if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-event frame ${type}`);
    const body = fill(frame, eventCtx(ev));
    if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky-event ${type} missing facts (${body})`);
    paras.push(body);
  }
  paras.push(shadow, close);
  const headline = `${title(sign)} Season`;
  return { headline, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.season-article" };
}


// Standalone lunation article: opener -> (eclipse frame) -> axis -> sign lore -> trap under the
// moon -> per-sign section (owner-authored card first, incl. intention/ritual on regular
// lunations; eclipses skip rituals by canon) -> (nodal axis on eclipses) -> engine events -> close.
// kind: "new-moon" | "full-moon" | "eclipse-solar" | "eclipse-lunar". variant picks an authored
// alternate (e.g. "year-end" -> authored/sky-newmoon/capricorn-year-end).
export function renderSkyLunation({ kind, sign, dateLine, mechanics, events = [], northSign, southSign, variant }) {
  const OPP = { aries: "libra", taurus: "scorpio", gemini: "sagittarius", cancer: "capricorn", leo: "aquarius", virgo: "pisces", libra: "aries", scorpio: "taurus", sagittarius: "gemini", capricorn: "cancer", aquarius: "leo", pisces: "virgo" };
  const isEclipse = kind === "eclipse-solar" || kind === "eclipse-lunar";
  const which = kind === "new-moon" || kind === "eclipse-solar" ? "new" : "full";
  const opener = hooks.get(`fallback-hook/sky-lunation-opener/${which}`)?.body_you;
  const close = isEclipse
    ? hooks.get("fallback-hook/sky-eclipse-close")?.body_you
    : hooks.get(`fallback-hook/sky-lunation-close/${which}`)?.body_you;
  const lore = hooks.get(`fallback-hook/sky-season-lore/${sign}`)?.body_you;
  const trap = hooks.get(`fallback-hook/sky-sign-trap/${sign}`)?.body_you;
  const opp = OPP[sign];
  const axisRow = hooks.get(`fallback-hook/sky-axis/${sign}-${opp}`) ?? hooks.get(`fallback-hook/sky-axis/${opp}-${sign}`);
  if (!opener || !close || !lore || !trap) throw new SourceGapError(`SOURCE_GAP: lunation sections for ${sign}`);
  const paras = [fill(opener, { dateLine, signTitle: title(sign) }) + (mechanics ? ` ${mechanics}` : "")];
  if (isEclipse) {
    const ecOpen = hooks.get(`fallback-hook/sky-eclipse-opener/${which === "new" ? "solar" : "lunar"}`)?.body_you;
    if (ecOpen) paras.push(ecOpen);
  }
  if (which === "full" && axisRow) paras.push(`A Full Moon happens when the Moon sits directly opposite the Sun. Right now that means the Moon in ${title(sign)} facing the Sun in ${title(opp)}. This is ${axisRow.axis_name}: ${axisRow.body_you} An opposition asks you to balance its two ends, and when the balance cannot be found, it marks an ending.`);
  paras.push(lore);
  paras.push(`The ${title(sign)} trap runs strong under this Moon: ${trap}`);
  // per-sign section: owner-authored card first (variant key, then eclipse key, then base)
  const moonKind = which === "full" ? "fullmoon" : "newmoon";
  const authored = (variant ? card(`authored/sky-${moonKind}/${sign}-${variant}`) : null)
    ?? (isEclipse ? card(`authored/sky-eclipse/${which === "new" ? "solar" : "lunar"}-${sign}`) : null)
    ?? card(`authored/sky-${moonKind}/${sign}`);
  // All lunations: the authored axis/intention/ritual/completion block moves BELOW the aspect
  // events and replaces the generic close (owner edit, chat 2026-07-21). Eclipses never get
  // ritual sections and keep the observe-and-integrate canon close as the ending.
  const tail = [];
  if (authored) {
    paras.push(authored.body);
    if (!isEclipse) {
      if (authored.axis) tail.push(authored.axis);
      if (authored.intention) tail.push(`Set your intention: ${authored.intention}`);
      if (authored.ritual) tail.push(`Ritual: ${authored.ritual}`);
      if (authored.completion) tail.push(`To close the cycle, ask: ${authored.completion}`);
    }
  } else {
    const signMoon = hooks.get(`fallback-hook/sky-${moonKind}-sign/${sign}`)?.body_you;
    if (signMoon) paras.push(signMoon);
  }
  if (isEclipse && northSign && southSign) {
    const nodeRow = hooks.get("fallback-hook/sky-eclipse-node")?.body_you;
    if (nodeRow) paras.push(fill(nodeRow, { northTitle: title(northSign), southTitle: title(southSign) }));
  }
  for (const ev of events) {
    // aspects inside a lunation article are aspects TO the Moon itself
    const isAspect = ev.type === "aspect" || ev.type === "moon-aspect" || ev.type === "sun-aspect";
    const type = isAspect ? `${ev.a === "sun" || ev.type === "sun-aspect" ? "sun-aspect" : "moon-aspect"}-${GROUP[ev.aspect] ?? ev.aspect}` : ev.type;
    const frame = hooks.get(`fallback-hook/sky-event/${type}`)?.body_you;
    if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-event frame ${type}`);
    paras.push(fill(frame, eventCtx(isAspect ? { ...ev, a: ev.a ?? "moon" } : ev)));
  }
  paras.push(...tail);
  // generic closes are retired on regular lunations (owner edit); the authored block is the
  // ending. Eclipses keep the observe-and-integrate canon close.
  if (isEclipse) paras.push(close);
  const label = isEclipse ? (which === "new" ? "Solar Eclipse" : "Lunar Eclipse") : (which === "new" ? "New Moon" : "Full Moon");
  return { headline: `${label} in ${title(sign)}`, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.lunation-article" };
}

// Per-rising-sign horoscope for one or more events. The engine converts each event into
// the houses it touches for this rising sign (whole-sign) and passes houseA/houseB.
export function renderSkyHoroscope({ risingSign, events = [] }) {
  const paras = [];
  const MAP = { "full-moon": "lunation-full", "new-moon": "lunation-new", "eclipse-lunar": "eclipse", "eclipse-solar": "eclipse" };
  for (const ev of events) {
    const type = ev.type === "aspect" ? `aspect-${GROUP[ev.aspect] ?? ev.aspect}` : (MAP[ev.type] ?? ev.type);
    const frame = hooks.get(`fallback-hook/sky-horoscope/${type}`)?.body_you;
    if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-horoscope frame ${type}`);
    const body = fill(frame, eventCtx(ev));
    if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky-horoscope ${type} missing facts (${body})`);
    paras.push(body);
  }
  return { headline: `${title(risingSign)} & ${title(risingSign)} Rising`, body: paras.join(" "), parts: paras, templateKey: "fallback-template/sky.season-horoscope" };
}

export function renderTransitReturn({ planet }) {
  const c = card(`authored/transit-return/${planet}`);
  if (!c) throw new SourceGapError(`SOURCE_GAP: no return card for ${planet}`);
  return result(c, "authored/transit-return");
}

export function renderCompat({ planet, signA, signB, otherName }) {
  // signA = the reader's sign, signB = the friend's sign
  const sub = (s) => s.replace(/\{\{other_name\}\}/g, otherName);
  const deep = card(`authored/compat-deep/${planet}/${signA}/${signB}`);
  if (deep) return { ...result(deep, "authored/compat-deep"), body: sub(deep.body), parts: [sub(deep.body)] };
  const pair = card(`authored/compat-pair/${planet}/${signA}/${signB}`);
  if (pair) return { ...result(pair, "authored/compat-pair"), body: sub(pair.body), parts: [sub(pair.body)] };
  // fallback composition (Writing Rules structure): domain sentence + reader block (you-voice)
  // + friend block (they-voice) + element pattern. Fully reversible by construction.
  const domain = hooks.get(`fallback-hook/compat-domain/${planet}`)?.body_you;
  const readerBlock = hookVoice(`fallback-hook/placement-sentence/${planet}/${signA}`, "you");
  const friendBlock = hookVoice(`fallback-hook/placement-sentence/${planet}/${signB}`, "they");
  const elA = ELEMENT[signA], elB = ELEMENT[signB];
  const elementPattern = hooks.get(`fallback-hook/element-pattern/${elA}/${elB}`)?.body_you;
  const same = signA === signB;
  const T = tpl(same ? "fallback-template/compat.same-sign" : "fallback-template/compat.cross-sign");
  const ctx = {
    compatDomain: domain, planetTitle: title(planet),
    signATitle: title(signA), signBTitle: title(signB), otherName,
    readerBlock, friendBlock, elementPattern,
  };
  for (const slot of T.requiredSlots) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: compat ${planet}/${signA}/${signB} (fallback slot ${slot} missing)`);
  const body = sub(fill(T.body, ctx));
  return { headline: sub(fill(T.headline, ctx)), body, parts: [body], templateKey: T.contentKey };
}

export function renderSynastryAspect({ planetA, planetB, aspect, otherName }) {
  const tpl = templates.templates.find((t) => t.contentKey === "fallback-template/synastry.aspect-v3");
  const g = GROUP[aspect];
  const fwd = hooks.get(`fallback-hook/synastry-pair/${planetA}/${planetB}/${g}`);
  const rev = fwd ? null : hooks.get(`fallback-hook/synastry-pair/${planetB}/${planetA}/${g}`);
  const pairRow = fwd ?? rev;
  // holder1 = person holding the row key's first planet; reader is always planetA
  const holders = fwd
    ? { holder1: "you", holder2: otherName, holder1Poss: "your", holder2Poss: `${otherName}'s`, holder1PossCap: "Your", holder2PossCap: `${otherName}'s` }
    : { holder1: otherName, holder2: "you", holder1Poss: `${otherName}'s`, holder2Poss: "your", holder1PossCap: `${otherName}'s`, holder2PossCap: "Your" };
  // plain "what this planet is in your life" phrases: reader voice for A, other-person voice for B
  const modeA = hooks.get(`fallback-hook/planet-mode/${planetA}`)?.body_you;
  const modeB = hooks.get(`fallback-hook/planet-mode/${planetB}`)?.body_they;
  const typeRow = hooks.get(`fallback-hook/synastry-aspect-type/${aspect}`);
  const ctx = {
    possessive: "Your",
    planetATitle: title(planetA), planetBTitle: title(planetB), aspectName: aspect, otherName,
    aspectAdj: vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body,
    synAspectLine: typeRow && modeA && modeB ? fill(typeRow.body_you, {
      modeA, modeB, otherName,
      // what each person's planet feels like to the other (hard aspects)
      gratesA: hooks.get(`fallback-hook/planet-grates/${planetA}`)?.body_you,
      gratesB: hooks.get(`fallback-hook/planet-grates/${planetB}`)?.body_they,
      sceneA: vocab.get(`fallback-vocab/planet-scene/${planetA}`)?.body,
      sceneB: vocab.get(`fallback-vocab/planet-scene/${planetB}`)?.body,
      askA: vocab.get(`fallback-vocab/planet-ask/${planetA}`)?.body,
      askB: vocab.get(`fallback-vocab/planet-ask/${planetB}`)?.body,
    }) : null,
    pairSentences: pairRow?.body_you ? fill(pairRow.body_you, holders) : null,
    // signature closing formula for the assembled fallback (matches the natal-aspect close)
    closingLine: (() => {
      const coreA = vocab.get(`fallback-vocab/planet-core/${planetA}`)?.body;
      const coreB = vocab.get(`fallback-vocab/planet-core/${planetB}`)?.body;
      const motion = vocab.get(`fallback-vocab/aspect-motion/${aspect}`)?.body;
      return coreA && coreB && motion ? `That's your ${title(planetA)} ${aspect} ${otherName}'s ${title(planetB)}: ${coreA} and ${coreB} ${motion}.` : null;
    })(),
  };
  // authored pair copy stands alone (natal-aspect pattern): the headline carries the
  // astronomy, the pair paragraph carries the meaning. Generic assembly only when no pair row.
  if (ctx.pairSentences) {
    const headlinePair = tpl.headline.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? "");
    return { headline: headlinePair, tag: typeRow?.tag ?? null, body: ctx.pairSentences, parts: [ctx.pairSentences], templateKey: tpl.contentKey };
  }
  for (const slot of tpl.requiredSlots) if (ctx[slot] == null) throw new SourceGapError(`SOURCE_GAP: synastry aspect slot ${slot} for ${planetA}-${aspect}-${planetB}`);
  let body = tpl.body
    .replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => (ctx[key] ? inner : ""))
    .replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? "");
  body = body.replace(/\s{2,}/g, " ").trim();
  const headline = tpl.headline.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ({ ...ctx, possessive: "Your" })[k] ?? "");
  // headline stays astrology; tag is the plain-English quality shown underneath it
  return { headline, tag: typeRow?.tag ?? null, body, parts: [body], templateKey: tpl.contentKey };
}

// ---- Friends Circle feed (FRIENDS-CIRCLE-FEED-SPEC.md) ----
// The engine decides WHO groups and WHEN (trigger tiers, reader-inclusive ranking, novelty,
// expiry); this renders the group card copy only. Per-person sections are rendered by the
// engine through the existing renderers (voice param, NEVER pronoun substitution) and passed
// through as members[{name, body}]. An empty day beats a manufactured story: anything the
// rows cannot say plainly is SOURCE_GAP.

// Display names: reader-first "You" when included; missing/initial-only names become
// "a friend"; up to three names in full, four or more cap at two + "and N more".
export function formatCircleNames(names = [], includesReader = true) {
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

export function renderCircleStory(f) {
  const { trigger, names = [], includesReader = true, members = [] } = f;
  const namesLine = formatCircleNames(names, includesReader);
  // mid-sentence version: the reader's "You" drops its capital, friend names keep theirs
  const namesMid = includesReader ? "you" + namesLine.slice(3) : namesLine;
  const total = names.length + (includesReader ? 1 : 0);
  const row = (k) => hooks.get(`fallback-hook/${k}`);
  const ctx = { names: namesLine, namesMid, allWord: total >= 3 ? "all" : "both" };
  let r = null, subtitle = null, headline = null;
  if (trigger === "profection") {
    r = row(`circle-profection/${f.house}`);
    subtitle = `${ordinal(f.house)} house years`;
  } else if (trigger === "lunation") {
    r = row(`circle-lunation/${f.kind}`);
    const label = f.kind === "full" ? "Full Moon" : "New Moon";
    ctx.lunationRef = f.sign ? `The ${label} in ${title(f.sign)}` : `The ${label}`;
    ctx.dateLine = f.dateLine; // e.g. "on July 29"
    subtitle = f.sign ? `${label} in ${title(f.sign)}` : label;
  } else if (trigger === "retro") {
    r = row("circle-cycle-retro");
    ctx.retroRef = `${title(f.planet)} retrograde`;
    ctx.window = f.window ?? WINDOW_RETRO[f.planet] ?? "For the next few weeks";
    subtitle = `${title(f.planet)} retrograde`;
  } else if (trigger === "return") {
    r = row(`circle-cycle-return/${f.planet}`) ?? row("circle-cycle-return/generic");
    ctx.planetTitle = title(f.planet);
    ctx.planetTopic = vocab.get(`fallback-vocab/planet-topic/${f.planet}`)?.body;
    subtitle = `${title(f.planet)} returns`;
  } else if (trigger === "synastry") {
    r = row(`circle-synastry/${GROUP[f.aspect] ?? f.aspect}`);
    ctx.nameA = f.nameA; ctx.nameB = f.nameB;
    const adj = vocab.get(`fallback-vocab/aspect-adj/${f.aspect}`)?.body;
    // headline stays astrology, same rule as the synastry cards
    if (f.planetA && f.planetB && adj && f.nameA && f.nameB)
      headline = `${f.nameA}'s ${title(f.planetA)} ${adj} ${f.nameB}'s ${title(f.planetB)}`;
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
  const parts = [body, ...sections.map((s) => s.body), ...(question ? [question] : [])];
  return { headline, subtitle: `${subtitle} - ${namesLine}`, names: namesLine, body, sections, question, parts, templateKey: "fallback-template/circle.story", contentKey: r.contentKey };
}

// ---- Sky page: planet-in-sign placement article (Title/duration are app chrome; this
// returns the longer-form write-up). Structure: per-planet write-up (pace + theme in the
// sign's register) -> sign lore -> sign trap -> one paragraph per aspect the planet makes
// while in the sign (engine-supplied events, same frames as the season article). ----
// Structure (owner's Saturn-ingress sample): you-voice opener -> mechanics/collective write-up
// -> sign lore -> sign trap -> practice -> one paragraph per aspect made during the stay
// -> element collective close -> sign-off blessing. Owner-authored ingress articles
// (authored/sky-ingress/{planet}/{sign}) render verbatim first.
export function renderSkyPlacement({ planet, sign, events = [] }) {
  const authoredArticle = card(`authored/sky-ingress/${planet}/${sign}`);
  if (authoredArticle) return result(authoredArticle, "authored/sky-ingress");
  const youOpen = hooks.get(`fallback-hook/sky-placement-you/${planet}`)?.body_you;
  const frame = hooks.get(`fallback-hook/sky-placement/${planet}`)?.body_you;
  const signStyle = vocab.get(`fallback-vocab/sign-style/${sign}`)?.body;
  if (!frame || !signStyle) throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign}`);
  const ctx = { signTitle: title(sign), signStyle, signDoes: vocab.get(`fallback-vocab/sign-does/${sign}`)?.body };
  const paras = [];
  if (youOpen) paras.push(fill(youOpen, ctx));
  paras.push(fill(frame, ctx));
  if (paras.some((p) => /\{\{/.test(p))) throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign} missing slot`);
  const lore = hooks.get(`fallback-hook/sky-season-lore/${sign}`)?.body_you;
  if (lore) paras.push(lore);
  const trap = hooks.get(`fallback-hook/sky-sign-trap/${sign}`)?.body_you;
  if (trap) paras.push(`The ${title(sign)} trap to watch while ${transitRef(planet)} is here is ${trap}`);
  const practice = hooks.get(`fallback-hook/sky-placement-practice/${planet}`)?.body_you;
  if (practice) paras.push(practice);
  for (const ev of events) {
    const type = ev.type === "aspect" ? `aspect-${GROUP[ev.aspect] ?? ev.aspect}` : ev.type;
    const evFrame = hooks.get(`fallback-hook/sky-event/${type}`)?.body_you;
    if (!evFrame) throw new SourceGapError(`SOURCE_GAP: sky-event frame ${type}`);
    const body = fill(evFrame, eventCtx(ev));
    if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky-event ${type} missing facts (${body})`);
    paras.push(body);
  }
  const elClose = hooks.get(`fallback-hook/sky-element-close/${ELEMENT[sign]}`)?.body_you;
  if (elClose) paras.push(elClose);
  const pb = vocab.get(`fallback-vocab/planet-blessing/${planet}`)?.body;
  const sb = vocab.get(`fallback-vocab/sign-blessing/${sign}`)?.body;
  if (pb && sb) paras.push(`Wishing you ${pb} and ${sb}.`);
  return { headline: `${transitRef(planet)} in ${title(sign)}`.replace(/^the /, "The "), body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.placement-article" };
}

// ---- Calendar page (CALENDAR-CONTENT-SPEC.md): lunar phases, void of course, season
// markers, and the owner's weekly Moon-sign tone. Replaces the legacy phase sidebar copy. ----

// phase: new-moon | waxing-crescent | first-quarter | waxing-gibbous | full-moon |
// disseminating | last-quarter | balsamic. sign = the sign of the cycle's NEW MOON.
export function renderCalendarPhase({ phase, sign }) {
  const r = hooks.get(`fallback-hook/moon-phase/${phase}`);
  if (!r) throw new SourceGapError(`SOURCE_GAP: no phase row for ${phase}`);
  const body = fill(r.body_you, { signTitle: sign ? title(sign) : "" }).replace(/^in \. /, "");
  if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: phase ${phase} missing cycle sign`);
  const PHASE_NAMES = { "new-moon": "New Moon", "waxing-crescent": "Waxing Crescent Moon", "first-quarter": "First Quarter Moon", "waxing-gibbous": "Waxing Gibbous Moon", "full-moon": "Full Moon", "disseminating": "Disseminating Moon", "last-quarter": "Last Quarter Moon", "balsamic": "Balsamic Moon" };
  const plain = `${PHASE_NAMES[phase] ?? title(phase)}${sign ? ` in ${title(sign)}` : ""}`;
  return { headline: plain, tagline: r.title ?? "", body, parts: [body], templateKey: "fallback-template/calendar.phase", contentKey: r.contentKey };
}

export function renderVoidOfCourse({ sign, nextSign }) {
  const r = hooks.get("fallback-hook/moon-void");
  if (!r) throw new SourceGapError("SOURCE_GAP: no void-of-course row");
  const body = fill(r.body_you, { signTitle: title(sign), nextSignTitle: title(nextSign) });
  if (/\{\{/.test(body)) throw new SourceGapError("SOURCE_GAP: void-of-course facts missing");
  return { headline: "Moon void of course", body, parts: [body], templateKey: "fallback-template/calendar.void", contentKey: r.contentKey };
}

// which: march-equinox | june-solstice | september-equinox | december-solstice
export function renderSeasonMarker({ which }) {
  const r = hooks.get(`fallback-hook/season-marker/${which}`);
  if (!r) throw new SourceGapError(`SOURCE_GAP: no season marker for ${which}`);
  return { headline: r.title ?? "", body: r.body_you, parts: [r.body_you], templateKey: "fallback-template/calendar.season-marker", contentKey: r.contentKey };
}

// Owner's weekly Moon-sign tone. variant rotates the authored alternates (suggested:
// stable per ISO week, e.g. (isoWeek % variantCount) + 1; 1 or absent = base card).
export function renderWeeklyMoon({ sign, variant }) {
  const c = (variant && variant > 1 ? card(`authored/calendar-weekly-moon/${sign}/variant-${variant}`) : null)
    ?? card(`authored/calendar-weekly-moon/${sign}`);
  if (!c) throw new SourceGapError(`SOURCE_GAP: no weekly moon card for ${sign}`);
  return { headline: `Weekly Moon: ${title(sign)}`, body: c.body, focus: c.focus ?? null, strategy: c.strategy ?? null, parts: [c.body], templateKey: "authored/calendar-weekly-moon", contentKey: c.contentKey };
}

// ---- Sky aspect card (Gifts/Lessons list under sky placement pages). This is a SKY event
// between two transiting bodies, written for everyone at once. NEVER serve transit-to-natal
// cards ("your natal Neptune") on sky pages; those belong to the You page. ----
export function renderSkyAspectCard({ a, b, aspect, aSign, bSign, dateLine }) {
  const g = GROUP[aspect] ?? aspect;
  const frame = hooks.get(`fallback-hook/sky-event/aspect-${g}`)?.body_you;
  if (!frame) throw new SourceGapError(`SOURCE_GAP: sky-event frame aspect-${g}`);
  const body = fill(frame, eventCtx({ type: "aspect", a, b, aspect, aSign, bSign, dateLine: dateLine ?? "Right now" }));
  if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: sky aspect ${a}-${aspect}-${b} missing facts (${body})`);
  return { headline: `${title(a)} ${title(aspect)} ${title(b)}`, body, parts: [body], templateKey: "fallback-template/sky.aspect-card" };
}

// ---- Transits to your bond: a transiting planet activating the synastry contact between
// the reader and a named friend. Reader-facing; the engine renders the friend's mirrored
// card by swapping perspective (never by editing this output). ----
// facts: transiting, aspect (transit's aspect TO the contact), planetA (reader's), planetB
// (friend's), natalAspect (the synastry aspect between A and B), otherName, sign?, window?
export function renderBondTransit({ transiting, aspect, planetA, planetB, natalAspect, otherName, sign, variant, window: win }) {
  const HEAVY = new Set(["saturn", "uranus", "neptune", "pluto", "chiron"]);
  const g = GROUP[aspect] ?? aspect;
  const family = g === "soft" || (g === "conjunction" && !HEAVY.has(transiting)) ? "soft" : "hard";
  // variant rotation for repeat viewers (2 or 3; absent = base line)
  const effect = (variant ? hooks.get(`fallback-hook/bond-effect-${family}/${transiting}/variant-${variant}`)?.body_you : null)
    ?? hooks.get(`fallback-hook/bond-effect-${family}/${transiting}`)?.body_you;
  const aspectAdj = vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body;
  const natalG = GROUP[natalAspect] ?? natalAspect ?? null;
  const bondQuality = natalG ? vocab.get(`fallback-vocab/bond-quality/${natalG}`)?.body : null;
  const modeA = hooks.get(`fallback-hook/planet-mode/${planetA}`)?.body_you;
  const modeB = hooks.get(`fallback-hook/planet-mode/${planetB}`)?.body_they;
  if (!effect || !aspectAdj) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} (${family})`);
  const timeOpen = win ?? WINDOW_ASPECT[transiting] ?? "Currently";
  const paras = [];
  paras.push(`${timeOpen}, ${transitRef(transiting, sign)} is ${aspectAdj} the line between your ${title(planetA)} and ${otherName}'s ${title(planetB)}.`);
  if (bondQuality && modeA && modeB) paras.push(`That line is ${bondQuality}: ${modeA} meeting ${modeB}.`);
  paras.push(effect);
  const body = paras.join(" ").replace(/\s{2,}/g, " ").trim();
  if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} unresolved slot`);
  const HL = { conjunction: "conjunct", opposition: "opposite" };
  const headline = `${title(transiting)} ${HL[aspect] ?? aspect} your ${title(planetA)}-${title(planetB)} line with ${otherName}`;
  return { headline, body, parts: [body], templateKey: "fallback-template/bond.transit" };
}

// ---- Per-rising lunation horoscope (owner template library): house illuminated ->
// Release/Shift -> Higher Path. Eclipses skip the Release section per canon and append
// the observe-only note. house auto-derives from risingSign + lunation sign (whole sign). ----
const SIGN_ORDER = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
export function renderLunationHoroscope({ kind, sign, risingSign, house }) {
  const isEclipse = kind === "eclipse-solar" || kind === "eclipse-lunar";
  const which = kind === "new-moon" || kind === "eclipse-solar" ? "new" : "full";
  const h = house ?? ((SIGN_ORDER.indexOf(sign) - SIGN_ORDER.indexOf(risingSign) + 12) % 12) + 1;
  const frame = hooks.get(`fallback-hook/lunation-horoscope/${which}`)?.body_you;
  const jurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${h}`)?.body;
  const higher = hooks.get(`fallback-hook/lunation-higher-path/${h}`)?.body_you;
  if (!frame || !jurisdiction || !higher) throw new SourceGapError(`SOURCE_GAP: lunation horoscope ${which}/${risingSign} (house ${h})`);
  const paras = [fill(frame, { houseOrdinal: ordinal(h), jurisdiction })];
  // sign alignment: the per-sign lunation section distilled from the owner's book
  const signSection = hooks.get(`fallback-hook/sky-${which === "full" ? "fullmoon" : "newmoon"}-sign/${sign}`)?.body_you;
  if (signSection) paras.push(signSection);
  // concrete manifestations for this house (from the book's per-house chapters)
  const shows = hooks.get(`fallback-hook/lunation-shows/${h}`)?.body_you;
  if (shows) paras.push(shows);
  // in-the-moment events for this house + lunation kind (from the book's per-house chapters)
  const moment = hooks.get(`fallback-hook/lunation-moment/${which}/${h}`)?.body_you;
  if (moment) paras.push(moment);
  if (!isEclipse) {
    const release = hooks.get(`fallback-hook/lunation-release/${h}`)?.body_you;
    if (release) paras.push(release);
  }
  paras.push(higher);
  // New Moons close with the book's verbatim intention for this house
  if (which === "new" && !isEclipse) {
    const intent = hooks.get(`fallback-hook/lunation-intention/${h}`)?.body_you;
    if (intent) paras.push(`Set your intention: "${intent}"`);
  }
  if (isEclipse) {
    const note = hooks.get("fallback-hook/lunation-horoscope/eclipse-note")?.body_you;
    if (note) paras.push(note);
  }
  const label = isEclipse ? (which === "new" ? "Solar Eclipse" : "Lunar Eclipse") : (which === "new" ? "New Moon" : "Full Moon");
  return { headline: `${label} for ${title(risingSign)} Rising`, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.lunation-horoscope" };
}

// ---- Daily At-a-Glance (Copy Batch A): engine-hidden headline + body driven by the
// transiting Moon. Pass natal+aspect for the Moon's tightest applying aspect; pass house
// (whole-sign house of the Moon) when no aspect is within orb. No astrology words render. ----
const DAILY_GROUP = { conjunction: "conjunction", square: "square", opposition: "opposition", trine: "soft", sextile: "soft" };
export function renderDailyGlance({ natal, aspect, house }) {
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

// ---- Do/Don't engine (TLDR-Remedial-DoDont-Spec): chart-specific lists assembled from
// seeds. The transit picks which natal planet needs tending; the natal chart writes the
// list. Do = sign seed + house seed + transiting counterweight. Don't = placement shadow
// + transit friction + the aggravated natal aspect partner's shadow (when supplied). ----
export function renderDoDont({ planet, sign, house, transiting, weakPlanet, weakSign }) {
  const seed = (k) => vocab.get(`fallback-vocab/${k}`)?.body ?? null;
  const dos = [
    seed(`dodont-do/${planet}/${sign}`),
    house ? seed(`dodont-house/${house}`) : null,
    seed(`dodont-reward/${transiting}`),
  ].filter(Boolean);
  const donts = [
    seed(`dodont-shadow/${planet}/${sign}`),
    seed(`dodont-friction/${transiting}`),
    // third slot: aggravated partner's shadow when supplied; otherwise the pressed
    // planet's own friction habit (skipped automatically by de-dupe if transiting === planet)
    weakPlanet && weakSign ? seed(`dodont-shadow/${weakPlanet}/${weakSign}`) : seed(`dodont-friction/${planet}`),
  ].filter(Boolean);
  if (dos.length < 2 || donts.length < 2) throw new SourceGapError(`SOURCE_GAP: do/don't seeds for ${planet}/${sign} under ${transiting}`);
  // de-dupe while preserving order (same seed can arrive twice via the weak-point path)
  const uniq = (a) => [...new Set(a)];
  return { do: uniq(dos).slice(0, 3), dont: uniq(donts).slice(0, 3), templateKey: "fallback-template/daily.dodont" };
}
