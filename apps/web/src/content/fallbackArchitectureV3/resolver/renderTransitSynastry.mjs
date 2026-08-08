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
const bondLanguagePass2 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/bond-language-pass-2.json"), "utf8"));
const lunationBlend = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/lunation-blend-units-v1.json"), "utf8"));
const placementInterim = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/placement-interim-fixes-v1.json"), "utf8"));
const skyArticleV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-article-v1.json"), "utf8"));
const skyAspectPhrasebookV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-aspect-phrasebook-v1.json"), "utf8"));
const pairDailyFramesV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/pair-daily-frames-v1.json"), "utf8"));
const pairDailyClausesV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/pair-daily-clauses-v1.json"), "utf8"));
const skySignCopySunV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-sign-copy-sun-v1.json"), "utf8"));
const skyPlacementOwnerApprovedReaderV1 = JSON.parse(fs.readFileSync(path.join(here, "../bundled-sky-placement-owner-approved-reader-v1.json"), "utf8"));
const templates = JSON.parse(fs.readFileSync(path.join(here, "../templates/fallback-templates-v3.json"), "utf8"));

lib.authoredCards.push(...lunationBlend.authoredCards);
lib.authoredCards.push(...skyArticleV1.authoredCards);
rowsFile.hookRows.push(...lunationBlend.hookRows);
rowsFile.hookRows.push(...bondLanguagePass2.rows);
rowsFile.hookRows.push(...skyArticleV1.hookRows);
rowsFile.hookRows.push(...skyAspectPhrasebookV1.hookRows);
rowsFile.hookRows.push(...pairDailyFramesV1.rows);
rowsFile.hookRows.push(...pairDailyClausesV1.rows);
rowsFile.hookRows.push(...skySignCopySunV1.rows);
rowsFile.hookRows.push(...skyPlacementOwnerApprovedReaderV1.rows);
rowsFile.vocabularyRows.push(...placementInterim.vocabularyRows);
rowsFile.vocabularyRows.push(...skyArticleV1.vocabularyRows);
const READER_ELIGIBLE_STATUS = new Set(["approved_reuse", "approved", "reviewed"]);
const eligibleRowsByKey = (rows) => {
  const candidates = new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }
  return new Map(
    [...candidates]
      .map(([key, keyed]) => [
        key,
        [...keyed].reverse().find((candidate) => READER_ELIGIBLE_STATUS.has(candidate.review_status))
      ])
      .filter(([, row]) => Boolean(row))
  );
};
const cards = eligibleRowsByKey(lib.authoredCards);
const vocab = eligibleRowsByKey(rowsFile.vocabularyRows);
const hooks = eligibleRowsByKey(rowsFile.hookRows);
const FAST = new Set(["moon", "mercury", "venus", "mars"]);
const ELEMENT = { aries: "fire", leo: "fire", sagittarius: "fire", taurus: "earth", virgo: "earth", capricorn: "earth", gemini: "air", libra: "air", aquarius: "air", cancer: "water", scorpio: "water", pisces: "water" };
const ORD = { 1: "1st", 2: "2nd", 3: "3rd" };
const ordinal = (n) => ORD[n] ?? `${n}th`;
const tpl = (key) => templates.templates.find((t) => t.contentKey === key);
const fill = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).replace(/\s{2,}/g, " ").trim();
const READER_HOLDER_VERBS = new Map(Object.entries({
  is: "are", was: "were", has: "have", does: "do", feels: "feel", gives: "give",
  keeps: "keep", makes: "make", helps: "help", responds: "respond", reaches: "reach",
  brings: "bring", tends: "tend", wants: "want", pushes: "push", needs: "need",
  starts: "start", sees: "see", shows: "show", thinks: "think", notices: "notice",
  knows: "know", believes: "believe", hears: "hear", takes: "take", begins: "begin",
  experiences: "experience", changes: "change", gets: "get", ends: "end", acts: "act",
  becomes: "become", presses: "press", pays: "pay", offers: "offer", presents: "present",
  names: "name", reacts: "react", adds: "add", recognizes: "recognize", resents: "resent",
  reads: "read", resists: "resist", supports: "support", turns: "turn", mistakes: "mistake",
  says: "say", guards: "guard", looks: "look", stays: "stay", expands: "expand",
  reminds: "remind", corrects: "correct", tries: "try", jumps: "jump", catches: "catch",
  probes: "probe", pulls: "pull", means: "mean", enjoys: "enjoy", grounds: "ground",
  commits: "commit", drifts: "drift", edits: "edit", comes: "come", explains: "explain",
  adjusts: "adjust", insists: "insist", states: "state", seems: "seem", moves: "move",
  decides: "decide", softens: "soften", likes: "like", enters: "enter",
  introduces: "introduce", handles: "handle", encourages: "encourage", speaks: "speak",
  appreciates: "appreciate"
}));
const READER_HOLDER_ADVERBS = "(?:usually|often|also|still|readily|completely|quickly|emotionally|actually|almost|naturally|only|then)";
const READER_HOLDER_VERB_PATTERN = [...READER_HOLDER_VERBS.keys()].join("|");
export function renderSynastryPairVoice(body, holders) {
  const readerHolder = holders.holder1 === "you" ? "holder1" : "holder2";
  const marker = "__reader_holder__";
  let rendered = fill(body, { ...holders, [readerHolder]: marker });
  rendered = rendered
    .replace(new RegExp(`${marker}'s`, "g"), "your")
    .replace(
      new RegExp(`${marker}(\\s+(?:(?:${READER_HOLDER_ADVERBS})\\s+)*)(?:${READER_HOLDER_VERB_PATTERN})\\b`, "g"),
      (match, spacing) => {
        const verb = match.slice(marker.length + spacing.length);
        return `you${spacing}${READER_HOLDER_VERBS.get(verb) ?? verb}`;
      }
    )
    .replaceAll(marker, "you")
    .replace(/(^|[.!?]\s+)you\b/g, "$1You");
  return rendered;
}
const hookVoice = (key, voice) => { const r = hooks.get(key); return r ? (voice === "you" ? r.body_you : r.body_they) : null; };
const GROUP = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
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
const serialList = (items) => {
  if (items.length < 2) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
};
const FRIEND_IMPERATIVE = /(^|[.!?]\s+|\n+)(Don't|Do not|Either|Stop|Keep|Let|Give|Take|Check|Say|Ask|Enjoy|Make|Go|Trust|Put|Use|Change|Tell|Be|Try|Add|Finish|Clear|Get|Notice|Remember|Decide|Test|Write|Walk|Sit|Come|Pick|Hit|Revisit|Eat|Start|See|Shake|Rest|Reschedule|Lead|Treat|Reduce|Stay|Run|Choose|Review|Pay|Complete|Separate|Begin|Send|Follow|Hold|Stick|Conserve|Reform|Enlist|Aim|Fight|Bring|Drain|Count|Read|Skip|Look|Call|Move|Leave|Postpone|Verify|Request|Delay|Spend|Accept|Speak|Expect|Renegotiate|Know|Direct)\b/g;
const FRIEND_REPORTED_SUBJECT_YOU = /\b(tell|tells|told|show|shows|showed|remind|reminds|reminded|teach|teaches|taught)\s+you\s+(are|were|have|had|can|could|will|would|should|may|might|must|do|did)\b/gi;
const FRIEND_PREPOSITION_OBJECT_YOU = /\b(around|for|to|with|without|at|from|of|about|through|toward|towards|against|between|among|by|beside|behind|under|over|in|inside|outside|into|onto|off|near|within)\s+you\b/gi;
const FRIEND_VERB_OBJECT_YOU = /\b(find|finds|found|finding|help|helps|helped|helping|give|gives|gave|giving|pull|pulls|pulled|pulling|support|supports|supported|supporting|affect|affects|affected|affecting|remind|reminds|reminded|reminding|satisfy|satisfies|satisfied|satisfying|cheer|cheers|cheered|cheering|ask|asks|asked|asking|tell|tells|told|telling|leave|leaves|left|leaving|show|shows|showed|showing|make|makes|made|making|let|lets|letting|keep|keeps|kept|keeping|cost|costs|costing|teach|teaches|taught|teaching|push|pushes|pushed|pushing|hold|holds|held|holding|stop|stops|stopped|stopping)\s+you\b/gi;

function possessiveDisplayName(name) {
  return `${name}'s`;
}

export function friendVoiceFromReaderCopy(body, name) {
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

  let rendered = body
    .replace(/\byourself\b/gi, "themselves")
    .replace(/\byourselves\b/gi, "themselves")
    .replace(/\byours\b/gi, "theirs")
    .replace(/\byou('re|’re|'ve|’ve|'ll|’ll|'d|’d)\b/gi, (_, verb) => (
      nameForContraction(verb.toLowerCase().replace("’", "'"))
    ))
    .replace(/\byour\b/gi, (source) => nameForPossessive(source))
    .replace(
      FRIEND_REPORTED_SUBJECT_YOU,
      (_, governor, auxiliary) => `${governor} they ${auxiliary}`
    )
    .replace(FRIEND_PREPOSITION_OBJECT_YOU, (_, governor) => `${governor} ${nameForObject()}`)
    .replace(FRIEND_VERB_OBJECT_YOU, (_, governor) => `${governor} ${nameForObject()}`)
    .replace(/\byou\b/gi, (source) => (/^[A-Z]/.test(source) ? "They" : "they"));

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
}).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
const articleWindow = (candidate) => (
  candidate.valid_from && candidate.valid_to
    ? `${articleDateLabel(candidate.valid_from)} – ${articleDateLabel(candidate.valid_to)}`
    : null
);
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
    return articleKey
      ? pair.find((candidate) => candidate.contentKey === articleKey) ?? null
      : null;
  }

  const day = articleDay(asOfDate);
  if (!day) return null;

  const inWindow = pair.filter((candidate) => (
    !candidate.archive_only
    && candidate.article_structure === "final-v1"
    && candidate.valid_from
    && candidate.valid_to
    && candidate.valid_from <= day
    && candidate.valid_to >= day
  ));
  const retrogradeWindow = isRetrograde || isShadowPhase;
  return (
    retrogradeWindow
      ? inWindow.find((candidate) => candidate.article_variant === "retrograde")
        ?? inWindow.find((candidate) => candidate.article_variant !== "retrograde")
      : inWindow.find((candidate) => candidate.article_variant !== "retrograde")
  ) ?? null;
};
const skyPlacementHistoryAllowed = (planet, isRetrograde, historyEligible) => {
  if (typeof historyEligible === "boolean") return historyEligible;
  return new Set([
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "north-node",
    "south-node"
  ]).has(planet) || (isRetrograde && ["mercury", "venus", "mars"].includes(planet));
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
    return events.find((event) => (
      event.type === "aspect"
      && event.aspect === section.aspect
      && new Set([event.a, event.b]).size === 2
      && new Set([event.a, event.b]).has(section.a)
      && new Set([event.a, event.b]).has(section.b)
    )) ?? null;
  }
  if (
    section.kind === "event-interaction"
    || (section.kind === "retrograde-variant" && section.event_type)
  ) {
    return events.find((event) => event.type === section.event_type) ?? null;
  }
  return null;
};
const articleSlotFill = (value, slots, contentKey) => {
  const rendered = value.replace(/\{\{([\w.]+)\}\}/g, (_, key) => (
    slots[key] == null ? `{{${key}}}` : String(slots[key])
  )).trim();
  const leftover = rendered.match(/\{\{([\w.]+)\}\}/u);
  if (leftover) {
    throw new SourceGapError(
      `SOURCE_GAP: sky article ${contentKey} is missing engine slot ${leftover[1]}`
    );
  }
  return rendered;
};
const renderFinalSkyArticle = (candidate, facts) => {
  if (candidate.article_structure !== "final-v1") return null;

  assertSkyArticleCopy(candidate);
  const sections = candidate.article_sections ?? [];
  const kinds = new Set(sections.map((section) => section.kind));
  const hasOpening = facts.planet === "sun"
    ? kinds.has("seasonal-context") || kinds.has("ingress")
    : FAST.has(facts.planet)
      ? kinds.has("seasonal-context") && kinds.has("ingress")
      : kinds.has("ingress");
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
  const renderedSections = sections
    .map((section, sourceIndex) => ({ section, sourceIndex }))
    .sort((first, second) => (
      ARTICLE_SECTION_ORDER[first.section.kind] - ARTICLE_SECTION_ORDER[second.section.kind]
      || first.sourceIndex - second.sourceIndex
    ))
    .flatMap(({ section }) => {
      if (
        section.kind === "historic-movement"
        && !skyPlacementHistoryAllowed(facts.planet, Boolean(facts.isRetrograde), facts.historyEligible)
      ) return [];
      if (
        section.kind === "retrograde-variant"
        && !facts.isRetrograde
        && !facts.isShadowPhase
      ) return [];

      const event = articleSectionEvent(section, facts.events ?? []);
      if (
        (
          section.kind === "dated-aspect"
          || section.kind === "event-interaction"
          || (section.kind === "retrograde-variant" && section.event_type)
        )
        && !event
      ) return [];
      if (section.exact_date && section.exact_date !== event?.exactDateKey) {
        throw new SourceGapError(
          `SOURCE_GAP: sky article ${candidate.contentKey} event date contradicts the ephemeris`
        );
      }
      if (
        section.exact_date
        && candidate.valid_from
        && candidate.valid_to
        && (section.exact_date < candidate.valid_from || section.exact_date > candidate.valid_to)
      ) {
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
        heading: section.heading
          ? articleSlotFill(section.heading, slots, candidate.contentKey)
          : "",
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
      risingSign: title(entry.rising_sign),
      body: articleSlotFill(entry.body, { house, houseOrdinal: ordinal(house) }, candidate.contentKey)
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
const result = (c, templateKey) => ({ headline: c.headline || "", body: c.body, parts: [c.body], templateKey, contentKey: c.contentKey });

const fillKeep = (body, ctx) => body.replace(/\{\{([\w.]+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).trim();

const EVENT_QUALITY = { conjunction: "conjunction", square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };
const EVENT_VERB = { conjunction: "sitting right on", square: "squaring", opposition: "opposing", trine: "trining", sextile: "sextiling" };
const CONJ_SOFT = new Set(["venus", "sun", "mercury", "jupiter"]);

export function renderTransitHouse({ planet, house, sign, window: win, voice = "you", variant, events, isRetrograde }) {
  const v = voice === "you" ? "you" : "they";
  // Two-layer authored lane (Mars pilot): house intro + house-sign synthesis, dual voice.
  // Requires sign; variant 2+ rotates to the Satori-register rows, falling back to base.
  if (sign) {
    const vk = variant && variant !== 1 ? `/variant-${variant}` : "";
    const intro = card(`authored/transit-house-intro/${planet}/${house}${vk}`) ?? card(`authored/transit-house-intro/${planet}/${house}`);
    const synth = card(`authored/transit-house-sign/${planet}/${house}/${sign}${vk}`) ?? card(`authored/transit-house-sign/${planet}/${house}/${sign}`);
    if (intro && synth) {
      const pick = (c) => (v === "you" ? (c.body_you ?? c.body) : (c.body_they ?? c.body));
      const nameCtx = { Name: v === "they" ? voice : "" };
      const parts = [fillKeep(pick(intro), nameCtx), fillKeep(pick(synth), nameCtx)];
      const headline = v === "you"
        ? `${title(planet)} moving through your ${ordinal(house)} house`
        : `${title(planet)} moving through ${voice}'s ${ordinal(house)} house`;
      // Retrograde overlay: revise-not-redo framing appended when the engine flags Rx during the crossing.
      if (isRetrograde) {
        const ro = hookVoice(`fallback-hook/transit-house-retro-overlay/${planet}`, v);
        if (ro) parts.push(fillKeep(ro, { Name: v === "they" ? voice : "" }));
      }
      // Aspect events layer (sky-register composer, owner-calibrated 2026-07-27):
      // frame(+window) -> wants-pair sentence -> pair scenes (override row first, else the pair effect line).
      // Falls back to the legacy frame+aspect-body stitch when composer rows are missing for a planet.
      for (const e of events ?? []) {
        try {
          const quality = EVENT_QUALITY[e.aspect];
          const cls = quality === "conjunction" ? (CONJ_SOFT.has(planet) ? "soft" : "hard") : quality;
          const frameRaw = quality ? hookVoice(`fallback-hook/transit-house-event-frame/${planet}`, v) : null;
          const windowClause = e.window ? (/^(until|through|till|before|by)\b/i.test(e.window) ? ` ${e.window.charAt(0).toLowerCase()}${e.window.slice(1)}` : ` until ${e.window}`) : "";
          const frame = frameRaw ? fillKeep(frameRaw, { houseOrdinal: ordinal(house), natalTitle: title(e.natal), Name: v === "they" ? voice : "", windowClause, aspectVerb: EVENT_VERB[e.aspect] }) : null;
          const wants = sign ? hookVoice(`fallback-hook/transit-house-event-wants/${planet}/${sign}`, v) : null;
          const holds = hookVoice(`fallback-hook/transit-house-event-natal/${e.natal}`, v);
          const scenes = hookVoice(`fallback-hook/transit-house-event-scenes/${planet}/${e.natal}/${cls}`, v)
            ?? hookVoice(`fallback-hook/transit-effect-${cls}/${planet}/${e.natal}`, v);
          if (frame && wants && holds && scenes) {
            parts.push(`${frame} ${wants}; ${holds}. ${scenes}`.trim());
          } else {
            const asp = renderTransitAspect({ transiting: planet, natal: e.natal, aspect: e.aspect, voice, window: e.window ?? null });
            parts.push(frame ? `${frame} ${asp.body}` : asp.body);
          }
        } catch { /* SOURCE_GAP on an event never blocks the house card */ }
      }
      return { headline, body: parts.join("\n\n"), parts, templateKey: "authored/transit-house-layered", contentKey: synth.contentKey, window: win ?? WINDOW_HOUSE[planet] ?? null };
    }
  }
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

export function renderTransitAspect({ transiting, natal, aspect, variant, pass, sign, isRetrograde, window: win, voice = "you" }) {
  // voice: "you" (reader) or a friend's display name. The authored library is reader-voice,
  // so friend view renders fallback-only in authored friend-voice rows (never pronoun swaps).
  const v = voice === "you" ? "you" : "they";
  const otherPoss = v === "they" ? `${voice}'s` : null;
  const g = GROUP[aspect] ?? aspect; // accepts group names directly
  // Owner rulings 2026-07-27/28: Lilith renders on conjunction/opposition only (Walker canon);
  // node cards are conjunction-focused. Other contacts raise SOURCE_GAP and the surface hides.
  if (natal === "lilith" && aspect !== "conjunction" && aspect !== "opposition") throw new SourceGapError(`SOURCE_GAP: lilith renders conjunction/opposition only (got ${aspect})`);
  // Node cards are conjunction-focused (owner 2026-07-28): authored rows exist only for
  // conjunctions; other node aspects fall through to the legacy fallback (sky pipeline uses them).

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
  if (FAST.has(transiting) && FAST.has(natal)) push(natal, transiting); // mirror rule (Batch 4)
  tryKeys.push(`authored/transit-aspect/any/${natal}/${g}`, `authored/transit-aspect/any/${natal}/conjunction`);
  for (const k of tryKeys) {
    const c = card(k);
    if (c) {
      // v2 aspect library (owner-approved 2026-07-27/28): authored bodies carry
      // {{aspectWord}} and {{untilDate}} slots so the closer names the exact aspect and window.
      const AW = { conjunction: "conjunct", square: "square", opposition: "opposite", trine: "trine", sextile: "sextile" };
      const untilDate = win ? String(win).replace(/^until\s+/i, "") : null;
      const readerBody = c.body_you ?? c.body;
      if (!readerBody) throw new SourceGapError(`SOURCE_GAP: transit aspect ${c.contentKey} has no body`);
      let aBody = v === "you"
        ? readerBody
        : fillKeep(c.body_they ?? friendVoiceFromReaderCopy(readerBody, voice), { Name: voice });
      aBody = aBody.replace(/\{\{aspectWord\}\}/g, AW[aspect] ?? aspect);
      aBody = untilDate ? aBody.replace(/\{\{untilDate\}\}/g, untilDate) : aBody.replace(/ until \{\{untilDate\}\}/g, "");
      // Aspect-gated inserts (owner 2026-07-28): exact-aspect-only paragraphs appended to
      // the matching card (e.g. the solar-return note on the Sun-Sun conjunction).
      const gatedInsert = card(`authored/transit-aspect-insert/${transiting}/${natal}/${aspect}`);
      if (gatedInsert) {
        const readerInsert = gatedInsert.body_you ?? gatedInsert.body;
        const insBody = v === "you"
          ? readerInsert
          : gatedInsert.body_they ?? (readerInsert ? friendVoiceFromReaderCopy(readerInsert, voice) : null);
        if (insBody) aBody = `${aBody}\n\n${insBody}`;
      }
      // Fog-decision note (owner 2026-07-28): rotates one of four variants under Neptune pressure cards.
      if (transiting === "neptune" && (g === "hard" || g === "conjunction")) {
        const NAT = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","midheaven","ascendant"];
        const fnIdx = (((NAT.indexOf(natal) + (variant ?? 0)) % 4) + 4) % 4 + 1;
        const fogRow = hooks.get(`fallback-hook/fog-note/variant-${fnIdx}`);
        const fogNote = v === "you"
          ? fogRow?.body_you
          : fogRow?.body_they ?? (fogRow?.body_you ? friendVoiceFromReaderCopy(fogRow.body_you, voice) : null);
        if (fogNote) aBody = `${aBody}\n\n${fogNote}`;
      }
      const authoredHeadline = v === "you"
        ? (c.headline || "")
        : `${title(transiting)} ${aspect} ${voice}'s ${title(natal)}`;
      const passHook = pass ? hookVoice(`fallback-hook/transit-pass/${pass}`, v) : null;
      if (passHook) aBody = `${aBody}\n\n${passHook}`;
      return { headline: authoredHeadline, body: aBody, parts: aBody.split("\n\n"), templateKey: "authored/transit-aspect", contentKey: c.contentKey };
    }
  }
  // fallback template
  const T = tpl("fallback-template/transit.aspect");
  // the natal planet's life areas, so type lines can say WHAT gets easier/harder
  const ANGLES = new Set(["ascendant", "midheaven", "descendant", "imum-coeli"]);
  const natalArea = vocab.get(`fallback-vocab/planet-topic/${natal}`)?.body ?? vocab.get(`fallback-vocab/angle-area/${natal}`)?.body;
  // angle targets get their own type line when one exists (richer phrasing per owner)
  const typeLineRaw = (ANGLES.has(natal) ? hookVoice(`fallback-hook/transit-aspect-type/${aspect}/angle`, v) : null)
    ?? hookVoice(`fallback-hook/transit-aspect-type/${aspect}`, v);
  // what to expect from THIS transiting planet, landing on the natal planet's areas.
  // soft contacts (trine, sextile, light conjunction) use the flowing effect;
  // hard contacts (square, opposition, heavy conjunction) use the pressure effect.
  const effectFamily = g === "soft" || (g === "conjunction" && !isHeavy) ? "soft" : "hard";
  // variant rotation for repeat viewers: engine passes variant 2 or 3, base otherwise
  const effectRaw = hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v)
    ?? (variant ? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/variant-${variant}`, v) : null)
    ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}`, v);
  const natalCoreVal = hookVoice(`fallback-hook/natal-core/${natal}`, v) ?? vocab.get(`fallback-vocab/planet-core/${natal}`)?.body;
  const transitEffectArea = ANGLES.has(natal) ? natalCoreVal : natalArea;
  const transitEffect = effectRaw && transitEffectArea ? fill(effectRaw, { natalArea: transitEffectArea }) : null;
  const ctx = {
    timeOpen: win ?? WINDOW_ASPECT[transiting] ?? "Currently",
    transitTitle: title(transiting), transitRef: transitRef(transiting, sign), natalTitle: title(natal), aspectName: aspect,
    aspectAdj: vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body,
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
  // Composer register (owner directive 2026-07-28): real aspect verb + wants-pair + pair scenes.
  // Replaces the "In plain terms" scaffold whenever the composer rows exist; legacy template otherwise.
  const AVERB = { conjunction: "sitting right on", square: "squaring", opposition: "opposing", trine: "trining", sextile: "sextiling" };
  const cWants = (sign ? hookVoice(`fallback-hook/transit-house-event-wants/${transiting}/${sign}`, v) : null)
    ?? hookVoice(`fallback-hook/transit-house-event-wants/${transiting}`, v);
  const cHolds = hookVoice(`fallback-hook/transit-house-event-natal/${natal}`, v);
  const cScenes = hookVoice(`fallback-hook/transit-house-event-scenes/${transiting}/${natal}/${effectFamily}`, v)
    ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v);
  const cScenesFinal = cScenes ?? ctx.transitTypeLine ?? null;
  let body;
  if (AVERB[aspect] && cWants && cHolds && cScenesFinal) {
    const opener = v === "you"
      ? `${ctx.timeOpen}, ${ctx.transitRef} is ${AVERB[aspect]} your natal ${ctx.natalTitle}.`
      : `${ctx.timeOpen}, ${ctx.transitRef} is ${AVERB[aspect]} ${otherPoss} natal ${ctx.natalTitle}.`;
    body = `${opener} ${cWants}; ${cHolds}. ${cScenesFinal}`;
  } else if (AVERB[aspect] && ctx.transitEffectLine) {
    const target = v === "you" ? `your natal ${ctx.natalTitle}` : `${otherPoss} natal ${ctx.natalTitle}`;
    const timing = ctx.timeInline ? ` ${ctx.timeInline}` : "";
    const mechanics = `${String(ctx.transitRef).replace(/^./, (char) => char.toUpperCase())} is ${AVERB[aspect]} ${target}${timing}.`;
    body = `${ctx.transitEffectLine} ${mechanics}`;
  } else {
    body = fill(v === "you" ? (T.body_you ?? T.body) : (T.body_they ?? T.body), ctx);
  }
  body = body.charAt(0).toUpperCase() + body.slice(1);
  // retrograde contacts repeat; say so (fallback path only, authored cards stay verbatim)
  if (isRetrograde && v === "you") {
    const retroLine = hooks.get("fallback-hook/transit-retro-aspect")?.body_you;
    if (retroLine) body = `${body} ${fill(retroLine, ctx)}`;
  }
  const passHook = pass ? hookVoice(`fallback-hook/transit-pass/${pass}`, v) : null;
  if (passHook) body = `${body}\n\n${passHook}`;
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
  const macroKind = which === "new" ? "new-moon" : "full-moon";
  const macro = card(`authored/sky-lunation-macro/${macroKind}/${sign}`);
  const paras = [];
  if (macro?.body) paras.push(macro.body);
  paras.push(fill(opener, { dateLine, signTitle: title(sign) }) + (mechanics ? ` ${mechanics}` : ""));
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
  const signMoon = hooks.get(`fallback-hook/sky-${moonKind}-sign/${sign}`);
  // All lunations: the authored axis/intention/ritual/completion block moves BELOW the aspect
  // events and replaces the generic close (owner edit, chat 2026-07-21). Eclipses never get
  // ritual sections and keep the observe-and-integrate canon close as the ending.
  const tail = [];
  const signBody = signMoon?.supersedes_authored_body
    ? signMoon.body_you
    : (authored?.body ?? signMoon?.body_you);
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
  const pairVoice = fwd ? pairRow?.body_you : pairRow?.body_they;
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
      pairSentences: pairVoice ? renderSynastryPairVoice(pairVoice, holders) : null,
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

// ---- Today between you two (PAIR-DAILY-TODAY-SPEC.md) ----
// The engine chooses both daily drivers and the shared condition. This renderer only
// resolves approved clauses/frames and fills their declared slots. Missing pair-daily
// rows intentionally keep the reader surface dark.
const pairDailyRow = (key) => hooks.get(key) ?? cards.get(key) ?? vocab.get(key) ?? null;
const pairDailyVariantKeys = (baseKey) => [...hooks.keys()]
  .flatMap((key) => {
    if (key === baseKey) return [{ key, variant: 1 }];
    const prefix = `${baseKey}/variant-`;
    if (!key.startsWith(prefix)) return [];
    const variant = Number(key.slice(prefix.length));
    return Number.isInteger(variant) && variant >= 2 ? [{ key, variant }] : [];
  })
  .sort((a, b) => a.variant - b.variant);
const pairDailyVariantKey = (baseKey, variant) => {
  const keys = pairDailyVariantKeys(baseKey);
  if (!keys.length) throw new SourceGapError(`SOURCE_GAP: pair daily family ${baseKey}`);
  const seed = Number.isFinite(Number(variant))
    ? Math.max(1, Math.abs(Math.trunc(Number(variant))))
    : 1;
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
  const body = voice === "they"
    ? row?.body_they
    : row?.body_you ?? row?.body;
  if (typeof body !== "string" || !body.trim()) {
    throw new SourceGapError(`SOURCE_GAP: pair daily row ${key} (${voice})`);
  }
  return body.trim();
};
const pairDailyFill = (body, ctx) => body
  .replace(/\{\{([\w.]+)\}\}|\{([\w.]+)\}/g, (_match, doubleKey, singleKey) => {
    const key = doubleKey ?? singleKey;
    return ctx[key] ?? `{{${key}}}`;
  })
  .replace(/\s{2,}/g, " ")
  .trim();
const pairDailyHandle = (handle) => {
  const normalized = (handle ?? "").toString().trim().replace(/^@+/u, "");
  return normalized ? `@${normalized}` : null;
};
const pairDailyFriendReference = ({ handle, displayName }) => {
  const normalizedHandle = pairDailyHandle(handle);
  if (normalizedHandle) return normalizedHandle;
  const normalizedName = (displayName ?? "").toString().trim();
  return normalizedName || "your friend";
};
const PAIR_DAILY_WINDOW_RANGE = /\b(?:until|through)\s+(?:today\b|tomorrow\b|(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\d|the end of\b|next\s+(?:day|week|month|year)\b)/iu;

export function renderPairDaily({ reader, friend, shared = { kind: null }, variant = 1 }) {
  if (!reader?.clauseKey || !friend?.clauseKey) {
    throw new SourceGapError("SOURCE_GAP: pair daily requires both daily clause keys");
  }
  const readerHandle = pairDailyHandle(reader.handle);
  const openerKey = readerHandle
    ? pairDailyVariantKey("fallback-hook/pair-daily/opener", variant)
    : "fallback-hook/pair-daily/opener/variant-3";
  const readerClauseKey = pairDailyClauseVariantKey(reader.clauseKey, variant);
  const friendClauseKey = pairDailyClauseVariantKey(friend.clauseKey, variant);
  const opener = pairDailyBody(openerKey, "you");
  const ctx = {
    readerHandle: readerHandle ?? "",
    readerClause: pairDailyBody(readerClauseKey, "you"),
    friendHandle: pairDailyFriendReference(friend),
    friendClause: pairDailyBody(friendClauseKey, "they")
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
  const isFullMoon = ev.aspect === "opposition" && new Set([ev.a, ev.b]).size === 2
    && [ev.a, ev.b].includes("sun") && [ev.a, ev.b].includes("moon");
  const moonSign = ev.a === "moon" ? ev.aSign : ev.b === "moon" ? ev.bSign : null;
  const sunSign = ev.a === "sun" ? ev.aSign : ev.b === "sun" ? ev.bSign : null;
  const fullMoonSpecific = isFullMoon && moonSign
    ? hooks.get(`fallback-hook/sky-placement-aspect/sun/moon/opposition/${moonSign}`)?.body_you
    : null;
  if (fullMoonSpecific) {
    if (!sunSign || !ev.exactDate) throw new SourceGapError("SOURCE_GAP: sky placement Full Moon facts");
    const fullMoonBody = fillKeep(fullMoonSpecific, {
      moonSignTitle: title(moonSign),
      sunSignTitle: title(sunSign),
      exactDate: ev.exactDate
    });
    if (/\{\{/.test(fullMoonBody)) throw new SourceGapError("SOURCE_GAP: sky placement Full Moon slots");
    return fullMoonBody;
  }
  const specific = hooks.get(`fallback-hook/sky-placement-aspect/${placementPlanet}/${otherPlanet}/${ev.aspect}`)?.body_you
    ?? hooks.get(`fallback-hook/sky-placement-aspect/${otherPlanet}/${placementPlanet}/${ev.aspect}`)?.body_you;
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
  const timing = ev.exactDate
    ? { exact: true, label: ev.exactDate }
    : ev.dateLine
      ? { exact: false, label: ev.dateLine.charAt(0).toLowerCase() + ev.dateLine.slice(1) }
      : null;
  if (!frame || !timing) throw new SourceGapError(`SOURCE_GAP: sky placement aspect frame ${ev.aspect}`);
  const fact = frame(aRef, bRef, timing);
  const effect = reviewed ?? specific ?? pairEffect(ev);
  if (!effect) throw new SourceGapError(`SOURCE_GAP: sky placement aspect effect ${ev.a}/${ev.b}/${ev.aspect}`);
  return `${fact} ${capitalizeSentence(effect)}`.trim();
}

const SKY_PLACEMENT_MAJOR_ASPECTS = new Set(["conjunction", "square", "opposition", "trine", "sextile"]);
const SKY_PLACEMENT_CONTINUOUS_PLANETS = new Set([
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
  const factLine = entry.year && exit.year
    ? entry.year === exit.year
      ? `${entry.body} to ${exit.body}, ${exit.year}`
      : `${entry.body}, ${entry.year} to ${exit.body}, ${exit.year}`
    : `${entry.body} to ${exit.body}`;
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
  if (requiredFields.some((field) => typeof signCopy[field] !== "string" || !signCopy[field].trim())) {
    throw new SourceGapError(`SOURCE_GAP: continuous sky placement structure ${planet}/${sign}`);
  }

  const dates = continuousSkyPlacementDateContext(entryDate, exitDate);
  const ctx = {
    entryDate: dates.entry.body,
    exitDate: dates.exit.body,
    signTitle: title(sign),
    priorSign: priorSign ? title(priorSign) : null,
    priorSignEntryDate: priorSignEntryDate ? continuousSkyPlacementDate(priorSignEntryDate, "prior-sign entry").body : null,
    priorSignExitDate: priorSignExitDate ? continuousSkyPlacementDate(priorSignExitDate, "prior-sign exit").body : null,
    previousResidencyEntryDate: previousResidencyEntryDate ? continuousSkyPlacementDate(previousResidencyEntryDate, "previous-residency entry").body : null,
    previousResidencyExitDate: previousResidencyExitDate ? continuousSkyPlacementDate(previousResidencyExitDate, "previous-residency exit").body : null
  };
  const factLine = dates.factLine;
  const collective = [signCopy.opening, signCopy.tension, signCopy.development]
    .map((part) => fillKeep(part, ctx));
  const close = fillKeep(signCopy.close, ctx);
  const activeAspectMatch = events
    .filter((event) => (
      event.type === "aspect"
      && event.exactDate
      && event.a
      && event.b
      && [event.a, event.b].includes(planet)
      && SKY_PLACEMENT_MAJOR_ASPECTS.has(event.aspect)
    ))
    .map((event) => {
      const planets = new Set([event.a, event.b]);
      const unit = (signCopy.aspect_units ?? []).find((candidate) => (
        candidate.aspect === event.aspect
        && candidate.planets?.length === 2
        && candidate.planets.every((planetName) => planets.has(planetName))
      ));
      return unit ? { event, unit } : null;
    })
    .find(Boolean);
  let aspectSection = null;
  let aspectParts = [];

  if (activeAspectMatch) {
    const exactDate = continuousSkyPlacementDate(activeAspectMatch.event.exactDate, "aspect").body;
    const aspectCtx = { ...ctx, exactDate };
    aspectParts = [activeAspectMatch.unit.opportunity, activeAspectMatch.unit.check]
      .map((part) => fillKeep(part, aspectCtx));
    aspectSection = {
      kind: "dated-aspect",
      heading: fillKeep(activeAspectMatch.unit.heading, aspectCtx),
      body: aspectParts.join("\n\n")
    };
  }

  const moves = Array.isArray(signCopy.try_this)
    ? signCopy.try_this.map((move) => fillKeep(move, ctx)).slice(0, 3)
    : [];
  const parts = [factLine, ...collective, ...aspectParts, close];
  const articleSections = [
    { kind: "collective-read", heading: "", body: [factLine, ...collective].join("\n\n") },
    ...(aspectSection ? [aspectSection] : []),
    { kind: "exit-tone-shift", heading: "", body: close }
  ];
  const renderedText = [
    `${title(planet)} in ${title(sign)}`,
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
    const priorSignExit = priorSignExitDate
      ? continuousSkyPlacementDate(priorSignExitDate, "prior-sign exit").body
      : null;
    const priorResidencyDates = [previousResidencyEntryDate, previousResidencyExitDate]
      .filter(Boolean)
      .map((value) => continuousSkyPlacementDate(value, "previous-residency").body);
    const allowedUses = 2
      + (transitDate === dates.entry.body && priorSignExit === transitDate ? 1 : 0)
      + priorResidencyDates.filter((value) => value === transitDate).length;
    if (renderedText.split(transitDate).length - 1 > allowedUses) {
      throw new SourceGapError(`SOURCE_GAP: repeated sky placement date ${planet}/${sign}`);
    }
  }

  return {
    headline: `${transitRef(planet)} in ${title(sign)}`.replace(/^the /, "The "),
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

function skyEventSignForPlanet(event, planet) {
  if (event.a === planet) return event.aSign ?? null;
  if (event.b === planet) return event.bSign ?? null;
  return null;
}

function renderMoonSignEntry(entryRow, { planet, sign, events, entryDate, exitDate }) {
  if (!entryDate || !exitDate) {
    throw new SourceGapError(`SOURCE_GAP: Moon sign-entry dates ${planet}/${sign}`);
  }
  const livedRow = hooks.get(`fallback-hook/sky-placement-lived/${planet}/${sign}`);
  const closeRow = hooks.get(`fallback-hook/sky-placement-turn/${planet}/${sign}`);
  const movesRow = hooks.get(`fallback-hook/sky-placement-moves/${planet}/${sign}`);
  if (!entryRow.body_you || !livedRow?.body_you || !closeRow?.body_you || !movesRow?.body_you) {
    throw new SourceGapError(`SOURCE_GAP: Moon sign-entry structure ${planet}/${sign}`);
  }

  const entryLabel = continuousSkyPlacementDate(entryDate, "Moon entry").body;
  const exitLabel = continuousSkyPlacementDate(exitDate, "Moon exit").body;
  const opening = fillKeep(entryRow.body_you, { entryDate: entryLabel });
  const livedParts = livedRow.body_you
    .split(/\n{2,}/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const close = fillKeep(closeRow.body_you, { exitDate: exitLabel });
  const aspectMatch = (events ?? [])
    .filter((event) => event?.type === "aspect" && event.exactDate && event.a && event.b && event.aspect)
    .map((event) => {
      const planets = new Set([event.a, event.b]);
      const unit = (entryRow.moon_entry_aspect_units ?? []).find((candidate) => (
        candidate.aspect === event.aspect
        && candidate.planets?.length === 2
        && candidate.planets.every((planetName) => planets.has(planetName))
        && Object.entries(candidate.signs ?? {}).every(([planetName, expectedSign]) => (
          skyEventSignForPlanet(event, planetName) === expectedSign
        ))
      ));
      return unit ? { event, unit } : null;
    })
    .find(Boolean);
  const aspectBody = aspectMatch
    ? fillKeep(aspectMatch.unit.body, {
      aspectDate: continuousSkyPlacementDate(aspectMatch.event.exactDate, "Moon aspect").body
    })
    : null;
  const moves = movesRow.body_you
    .split(/\r?\n/u)
    .map((move) => move.trim())
    .filter(Boolean);
  const parts = [opening, ...livedParts, aspectBody, close].filter(Boolean);
  const articleSections = [
    { kind: "collective-read", heading: "", body: [opening, ...livedParts].join("\n\n") },
    ...(aspectBody ? [{ kind: "dated-aspect", heading: "", body: aspectBody }] : []),
    { kind: "exit-tone-shift", heading: "", body: close }
  ];
  const renderedText = [...parts, ...moves].join("\n");
  if (/\{\{/u.test(renderedText)) {
    throw new SourceGapError(`SOURCE_GAP: Moon sign-entry slots ${planet}/${sign}`);
  }

  return {
    headline: `${transitRef(planet)} in ${title(sign)}`.replace(/^the /, "The "),
    tagline: null,
    moves,
    movesPresentation: "plain",
    closingCharge: null,
    keyDates: [],
    body: parts.join("\n\n"),
    parts,
    articleSections,
    templateKey: "sky-placement-moon-entry-v1",
    contentKey: entryRow.contentKey
  };
}

// ---- Sky page: FINAL articles render fixed authored sections and twelve public
// rising-sign blocks. They are exclusive of the slot-tier frame, tagline, moves,
// Key Dates list, and separately assembled aspect copy. When no article matches,
// the approved slot tier remains the deterministic fallback. ----
export function renderSkyPlacement({
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
  const retrogradeGuidance = isRetrograde
    ? hooks.get(`fallback-hook/transit-retro/${planet}`)?.body_you
    : null;
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
        headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title(sign)}`,
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
      const reviewNote = isRetrograde || isShadowPhase || hasPriorIngress
        ? authoredArticle.preview_note ?? retrogradeGuidance
        : null;
      const closingCharge = authoredArticle.closing_charge?.trim() || null;
      const parts = [
        reviewNote,
        ...structuredParts,
        skyPlacementHistoryAllowed(planet, isRetrograde, historyEligible)
          ? authoredArticle.history_echo
          : null,
        closingCharge
      ].filter(Boolean);

      return {
        headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title(sign)}`,
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
        body: parts.join("\n\n"),
        parts,
        templateKey: "sky-article-v1",
        contentKey: authoredArticle.contentKey
      };
    }

    const parts = [authoredArticle.body, retrogradeGuidance].filter(Boolean);
    return {
      headline: authoredArticle.headline || `${capitalizeSentence(transitRef(planet))} in ${title(sign)}`,
      tagline: null,
      moves: [],
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
  const continuousSignCopy = signCopyRow?.render_policy === "sky-placement-continuous-v2"
    ? signCopyRow
    : null;
  if (SKY_PLACEMENT_CONTINUOUS_PLANETS.has(planet)) {
    const standaloneHook = hooks.get(`fallback-hook/sky-placement-sign/${planet}/${sign}`);
    if (!continuousSignCopy && standaloneHook?.body_you) {
      const body = standaloneHook.body_you.trim();
      if (!body || /\{\{/u.test(body)) {
        throw new SourceGapError(`SOURCE_GAP: standalone sky placement hook ${planet}/${sign}`);
      }
      return {
        headline: `${capitalizeSentence(transitRef(planet))} in ${title(sign)}`,
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
  const signParts = signCopy
    ? [signCopy]
    : pairHook && pairLived && pairTurn
      ? [pairHook, pairLived, pairTurn]
      : [];
  const tagline = hooks.get(`fallback-hook/sky-placement-tagline/${planet}/${sign}`)?.body_you ?? null;
  const moves = (hooks.get(`fallback-hook/sky-placement-moves/${planet}/${sign}`)?.body_you ?? "")
    .split(/\r?\n/u)
    .map((move) => move.trim())
    .filter(Boolean);
  {
    const windowFrame = hooks.get(`fallback-hook/sky-placement/${planet}`)?.body_you;
    const directPlanetFrame = hooks.get(`fallback-hook/sky-placement-frame/${planet}`)?.body_you;
    const retrogradePlanetFrame = hooks.get(`fallback-hook/sky-placement-retro-frame/${planet}`)?.body_you;
    const planetFrame = isRetrograde || isShadowPhase
      ? retrogradePlanetFrame ?? directPlanetFrame
      : directPlanetFrame;
    const personal = hooks.get(`fallback-hook/sky-placement-you/${planet}`)?.body_you;
    const practice = hooks.get(`fallback-hook/sky-placement-practice/${planet}`)?.body_you;
    const signStyle = vocab.get(`fallback-vocab/sky-sign-style/${sign}`)?.body;
    const planetFunction = vocab.get(`fallback-vocab/sky-planet-function/${planet}`)?.body;
    if (
      windowFrame
      && planetFrame
      && personal
      && practice
      && signStyle
      && planetFunction
      && entryDate
      && exitDate
      && signParts.length > 0
    ) {
      const ctx = { signTitle: title(sign), signStyle, planetFunction, entryDate, exitDate };
      const parts = [
        windowFrame,
        planetFrame,
        ...signParts,
        ...aspectParas,
        personal,
        practice
      ].map((part) => fillKeep(part, ctx));
      if (parts.some((part) => /\{\{/u.test(part))) {
        throw new SourceGapError(`SOURCE_GAP: sky placement V3 frame ${planet}/${sign}`);
      }
      return {
        headline: `${transitRef(planet)} in ${title(sign)}`.replace(/^the /, "The "),
        tagline,
        moves: signCopy ? [] : moves,
        body: parts.join("\n\n"),
        parts,
        templateKey: signCopy ? "sky-placement-article-v2" : "sky-placement-frame-v3",
        contentKey: signCopy ? signCopyKey : `fallback-hook/sky-placement/${planet}`
      };
    }
  }

  if (pairHook && pairLived && pairTurn) {
    const parts = [pairHook, pairLived, retrogradeGuidance, pairTurn, ...aspectParas].filter(Boolean);
    return {
      headline: `${transitRef(planet)} in ${title(sign)}`.replace(/^the /, "The "),
      tagline,
      moves,
      body: parts.join("\n\n"),
      parts,
      templateKey: "fallback-template/sky.placement-article",
      contentKey: pairKey
    };
  }
  const template = tpl("fallback-template/sky.placement-article");
  if (!template) throw new SourceGapError("SOURCE_GAP: missing template fallback-template/sky.placement-article");
  const fallbackHook = hooks.get(`fallback-hook/sky-placement-you/${planet}`)?.body_you;
  const signStyle = vocab.get(`fallback-vocab/sky-sign-style/${sign}`)?.body;
  const planetFunction = vocab.get(`fallback-vocab/sky-planet-function/${planet}`)?.body;
  const frame = hooks.get(`fallback-hook/sky-placement/${planet}`)?.body_you;
  if (!fallbackHook || !frame || !signStyle || !planetFunction) throw new SourceGapError(`SOURCE_GAP: sky placement ${planet}/${sign}`);
  const ctx = {
    signTitle: title(sign),
    signStyle,
    signDoes: vocab.get(`fallback-vocab/sign-does/${sign}`)?.body,
    planetFunction,
    entryDate,
    exitDate
  };
  const placementRef = capitalizeSentence(transitRef(planet));
  const hook = hooks.get(`fallback-hook/sky-placement-hook/${planet}/${sign}`)?.body_you
    ?? fill(fallbackHook, ctx);
  const lived = hooks.get(`fallback-hook/sky-placement-lived/${planet}/${sign}`)?.body_you
    ?? fill(frame, ctx);
  const authoredTurn = hooks.get(`fallback-hook/sky-placement-turn/${planet}/${sign}`)?.body_you;
  const trap = hooks.get(`fallback-hook/sky-sign-trap/${sign}`)?.body_you;
  const practice = hooks.get(`fallback-hook/sky-placement-practice/${planet}`)?.body_you;
  const fallbackTurn = trap ? `The catch is ${trap}${practice ? ` ${practice}` : ""}` : practice;
  const templateCtx = {
    planetTitle: placementRef,
    signTitle: title(sign),
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
  const parts = retrogradeGuidance
    ? [...baseParts.slice(0, -1), retrogradeGuidance, ...baseParts.slice(-1), ...aspectParas]
    : [...baseParts, ...aspectParas];
  return {
    headline: `${transitRef(planet)} in ${title(sign)}`.replace(/^the /, "The "),
    body: parts.join("\n\n"),
    parts,
    templateKey: template.contentKey,
    tagline,
    moves
  };
}

// ---- Calendar page (CALENDAR-CONTENT-SPEC.md): lunar phases, void of course, season
// markers, and the owner's weekly Moon-sign tone. Replaces the legacy phase sidebar copy. ----

// phase: new-moon | waxing-crescent | first-quarter | waxing-gibbous | full-moon |
// disseminating | last-quarter | balsamic. sign is always the Moon's current,
// ephemeris-calculated sign. The generic phase row supplies phase metadata only;
// reader copy must resolve through the exact phase x current-sign lane.
export function renderCalendarPhase({ phase, sign }) {
  const normalizedSign = String(sign ?? "").trim().toLowerCase();
  if (!normalizedSign) throw new SourceGapError(`SOURCE_GAP: current Moon sign required for phase ${phase}`);
  const phaseRow = hooks.get(`fallback-hook/moon-phase/${phase}`);
  if (!phaseRow) throw new SourceGapError(`SOURCE_GAP: no phase row for ${phase}`);
  const exactKey = `fallback-hook/moon-phase/${phase}/${normalizedSign}`;
  const exactRow = hooks.get(exactKey);
  const compactLunationRow = phase === "new-moon" || phase === "full-moon"
    ? hooks.get(`fallback-hook/lunation-sign-compact/${phase}/${normalizedSign}`)
    : undefined;
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
  const signRow = card(`authored/calendar-weekly-moon/${normalizedSign}${variantSuffix}`)
    ?? card(`authored/calendar-weekly-moon/${normalizedSign}`);
  if (!exactRow && !compactLunationRow && !signRow) throw new SourceGapError(`SOURCE_GAP: no approved Moon-sign row for ${phase} in ${normalizedSign}`);
  const selectedRow = exactRow ?? compactLunationRow ?? signRow;
  const rawBody = exactRow?.body_you ?? compactLunationRow?.body_you ?? String(signRow?.body ?? "");
  const body = fill(rawBody, { signTitle: title(normalizedSign) }).replace(/^in \. /, "");
  if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: phase ${phase} in ${normalizedSign} has an unfilled slot`);
  const PHASE_NAMES = { "new-moon": "New Moon", "waxing-crescent": "Waxing Crescent Moon", "first-quarter": "First Quarter Moon", "waxing-gibbous": "Waxing Gibbous Moon", "full-moon": "Full Moon", "disseminating": "Disseminating Moon", "last-quarter": "Last Quarter Moon", "balsamic": "Balsamic Moon" };
  const plain = `${PHASE_NAMES[phase] ?? title(phase)} in ${title(normalizedSign)}`;
  return {
    headline: plain,
    tagline: exactRow?.title ?? phaseRow.title ?? "",
    body,
    parts: [body],
    templateKey: "fallback-template/calendar.phase-sign",
    contentKey: selectedRow?.contentKey === exactKey
      ? exactKey
      : `fallback-hook/moon-phase-sign/${phase}/${normalizedSign}`,
    sourceKeys: [phaseRow.contentKey, selectedRow?.contentKey].filter(Boolean),
    phaseSignSpecificity: exactRow || compactLunationRow ? "exact-reviewed" : "sign-derived"
  };
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
  const rejectedOwnerFeedbackKeys = new Set([
    // Owner rejection, 2026-08-03: contains “The Cancer Moon doesn't make you weak; it makes you aware.”
    "authored/calendar-weekly-moon/cancer"
  ]);
  const candidateKeys = [
    variant && variant > 1 ? `authored/calendar-weekly-moon/${sign}/variant-${variant}` : null,
    `authored/calendar-weekly-moon/${sign}`,
    ...[2, 3, 4].map((candidateVariant) => `authored/calendar-weekly-moon/${sign}/variant-${candidateVariant}`)
  ].filter(Boolean);
  const contentKey = [...new Set(candidateKeys)].find((key) => (
    !rejectedOwnerFeedbackKeys.has(key) && Boolean(card(key))
  ));
  const c = contentKey ? card(contentKey) : null;
  if (!c) throw new SourceGapError(`SOURCE_GAP: no weekly moon card for ${sign}`);
  return { headline: `Weekly Moon: ${title(sign)}`, body: c.body, focus: c.focus ?? null, strategy: c.strategy ?? null, parts: [c.body], templateKey: "authored/calendar-weekly-moon", contentKey: c.contentKey };
}

// ---- Sky aspect card (Gifts/Lessons list under sky placement pages). This is a SKY event
// between two transiting bodies, written for everyone at once. NEVER serve transit-to-natal
// cards ("your natal Neptune") on sky pages; those belong to the You page. ----
export function renderSkyAspectCard({ a, b, aspect, aSign, bSign, dateLine }) {
  const reviewed = reviewedSkyAspectRow({ a, b, aspect, aSign, bSign });
  if (reviewed) {
    return {
      headline: `${title(a)} ${title(aspect)} ${title(b)}`,
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
  return { headline: `${title(a)} ${title(aspect)} ${title(b)}`, body, parts: [body], templateKey: "fallback-template/sky.aspect-card" };
}

// ---- Transits to your bond: a transiting planet activating the synastry contact between
// the reader and a named friend. Reader-facing; the engine renders the friend's mirrored
// card by swapping perspective (never by editing this output). ----
// facts: transiting, aspect (transit's aspect TO the contact), planetA (reader's), planetB
// (friend's), natalAspect (the synastry aspect between A and B), otherName, sign?, window?
export function renderBondTransit({ transiting, aspect, endpointPlanet, endpointOwner, activatedPlanets, otherName, friendPossessivePronoun, sign, variant, duplicateIndex, window: win }) {
  if (!endpointPlanet || !["reader", "friend"].includes(endpointOwner) || !activatedPlanets?.length) {
    throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} missing endpoint facts`);
  }
  const HEAVY = new Set(["saturn", "uranus", "neptune", "pluto", "chiron"]);
  const g = GROUP[aspect] ?? aspect;
  const family = g === "soft" || (g === "conjunction" && !HEAVY.has(transiting)) ? "soft" : "hard";
  // Exact aspect copy wins the first card. Later cards on the same view sharing this
  // transiting planet + exact aspect rotate to the family lane so no two cards repeat
  // the same effect paragraph. Legacy soft/hard rows remain the fallback lane for
  // nodes, Lilith, missing exact rows, and their repeat-viewer variant rotation.
  const exactEffectKey = `fallback-hook/bond-effect-${aspect}/${transiting}`;
  const variantEffectKey = variant
    ? `fallback-hook/bond-effect-${family}/${transiting}/variant-${variant}`
    : null;
  const familyEffectKey = `fallback-hook/bond-effect-${family}/${transiting}`;
  const effectCandidates = duplicateIndex && duplicateIndex > 0
    ? [variantEffectKey, familyEffectKey, exactEffectKey]
    : [exactEffectKey, variantEffectKey, familyEffectKey];
  const effectKey = effectCandidates.find((key) => key && hooks.get(key)?.body_you)
    ?? familyEffectKey;
  const effect = hooks.get(effectKey)?.body_you;
  const aspectAdj = vocab.get(`fallback-vocab/aspect-adj/${aspect}`)?.body;
  if (!effect || !aspectAdj) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} (${family})`);
  const timeOpen = win ?? WINDOW_ASPECT[transiting] ?? "Currently";
  const relation = {
    conjunction: "conjunct",
    opposition: "opposite",
    square: "square",
    trine: "trine",
    sextile: "sextile",
  };
  const timeClose = inlineWindow(timeOpen);
  const endpoint = endpointOwner === "reader"
    ? `your ${title(endpointPlanet)}`
    : `${otherName}'s ${title(endpointPlanet)}`;
  const activatedList = endpointOwner === "reader"
    ? `${otherName}'s ${serialList(activatedPlanets.map(title))}`
    : serialList(activatedPlanets.map((planet) => `your ${title(planet)}`));
  const plural = activatedPlanets.length !== 1;
  const endpointReference = plural && endpointOwner === "friend"
    ? `${friendPossessivePronoun || "their"} ${title(endpointPlanet)}`
    : "it";
  const closing = `${transitRef(transiting, sign).replace(/^./, (char) => char.toUpperCase())} is ${relation[aspect] ?? aspectAdj} ${endpoint}${timeClose ? ` ${timeClose}` : ""}, activating the connection${plural ? "s" : ""} ${endpointReference} makes with ${activatedList}.`;
  const paras = [effect, closing];
  const body = paras.join("\n\n").trim();
  if (/\{\{/.test(body)) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect} unresolved slot`);
  const HL = { conjunction: "conjunct", opposition: "opposite" };
  const headline = `${title(transiting)} ${HL[aspect] ?? aspect} ${endpoint}`;
  return { headline, body, parts: paras, templateKey: "fallback-template/bond.transit", contentKey: effectKey };
}

// ---- Per-rising lunation horoscope (owner weekly shape): recognizable situation
// -> house frame -> compact sign core -> full-moon counterpoint -> current ruler
// house -> optional modern layer -> one present-tense ending. Moving-body houses
// arrive as event-time facts. ----
const SIGN_ORDER = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
export function renderLunationMacro({ kind, sign }) {
  const which = kind === "new-moon" || kind === "eclipse-solar" ? "new-moon" : "full-moon";
  const macro = card(`authored/sky-lunation-macro/${which}/${sign}`);
  if (!macro) throw new SourceGapError(`SOURCE_GAP: no lunation macro for ${which}/${sign}`);
  return result(macro, "authored/sky-lunation-macro");
}

export function renderLunationHoroscope({ kind, sign, risingSign, house, moonHouse, sunHouse, ruler, rulerHouse, rulerRetrograde, uranusHouse, uranusLayerActive, weekly = false }) {
  const isEclipse = kind === "eclipse-solar" || kind === "eclipse-lunar";
  const which = kind === "new-moon" || kind === "eclipse-solar" ? "new" : "full";
  const h = moonHouse ?? house ?? ((SIGN_ORDER.indexOf(sign) - SIGN_ORDER.indexOf(risingSign) + 12) % 12) + 1;
  const frame = hooks.get(`fallback-hook/lunation-horoscope/${which}`)?.body_you;
  const jurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${h}`)?.body;
  if (!frame || !jurisdiction) throw new SourceGapError(`SOURCE_GAP: lunation horoscope ${which}/${risingSign} (house ${h})`);
  const houseFrame = fill(frame, { houseOrdinal: ordinal(h), jurisdiction });
  const opening = hooks.get(`fallback-hook/lunation-opening-situation/${h}`)?.body_you;
  const paras = [opening ? `${opening} ${houseFrame}` : houseFrame];
  // Per-rising cards use a compact, reviewed sign core. The full per-sign
  // section belongs to the Sky article and must never be copied into this card.
  // Sign packages use kind-qualified compact cores. The approved Aquarius
  // Full Moon calibration predates that namespace, so retain it as a
  // Full-Moon-only fallback until its kind-qualified replacement arrives.
  const signCompact = hooks.get(`fallback-hook/lunation-sign-compact/${which}-moon/${sign}`)?.body_you
    ?? (which === "full" ? hooks.get(`fallback-hook/lunation-sign-compact/${sign}`)?.body_you : null);
  if (signCompact) paras.push(signCompact);
  if (which === "full" && sunHouse && sunHouse !== h) {
    const sunJurisdiction = vocab.get(`fallback-vocab/house-jurisdiction/${sunHouse}`)?.body;
    if (sunJurisdiction) {
      const counterpoint = `The friction this week runs between your ${ordinal(sunHouse)} house of ${sunJurisdiction} and your ${ordinal(h)} house of ${jurisdiction}. The immediate demands on one side can compete with what is becoming undeniable on the other, so let the tension show you what needs to change.`;
      paras[paras.length - 1] = `${paras[paras.length - 1]} ${counterpoint}`;
    }
  }
  if (ruler && rulerHouse && ruler !== "sun" && ruler !== "moon") {
    const rulerHouseBody = hooks.get(`fallback-hook/lunation-ruler-house/${rulerHouse}`)?.body_you;
    if (rulerHouseBody) {
      const lunationLabel = isEclipse
        ? (which === "new" ? "Solar Eclipse" : "Lunar Eclipse")
        : (which === "new" ? "New Moon" : "Full Moon");
      const rulerTitle = title(ruler);
      let rulerParagraph = `${rulerTitle} rules this ${lunationLabel} from your ${ordinal(rulerHouse)} house, so ${rulerHouseBody.replace(/\.+$/u, "")}.`;
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
  const weekLayer = weekly
    ? hooks.get("fallback-hook/lunation-week-layer")?.body_you
    : null;
  let weekLayerRendered = false;
  if (uranusLayerActive && uranusHouse) {
    const uranusLayer = hooks.get(`fallback-hook/lunation-uranus-layer/${uranusHouse}`)?.body_you;
    if (uranusLayer) {
      paras.push(weekLayer ? `${uranusLayer} ${weekLayer}` : uranusLayer);
      weekLayerRendered = Boolean(weekLayer);
    }
  }
  if (weekLayer && !weekLayerRendered) paras.push(weekLayer);
  // The former manifestations, moment, Release/Shift, Higher Path, intention,
  // and eclipse-note stack is intentionally retired on per-rising cards. A
  // dedicated reviewed closer may be added later; never synthesize one here.
  const label = isEclipse ? (which === "new" ? "Solar Eclipse" : "Lunar Eclipse") : (which === "new" ? "New Moon" : "Full Moon");
  return { headline: `${label} for ${title(risingSign)} Rising`, body: paras.join("\n\n"), parts: paras, templateKey: "fallback-template/sky.lunation-horoscope" };
}

export function renderLunationEventCard({ eventDate, blendFallbackEnabled = false, ...blendFacts }) {
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
export function renderDoDont({ planet, sign, house, transiting, weakPlanet, weakSign, moonSign, moonHouse, dayKey }) {
  const seed = (k) => vocab.get(`fallback-vocab/${k}`)?.body ?? null;
  const APPROVED = new Set(["approved", "approved_reuse", "reviewed"]);
  const moonSeed = (k) => { const r = vocab.get(`fallback-vocab/${k}`); return r && APPROVED.has(r.review_status) ? r.body : null; };
  const day = Number.isFinite(dayKey) ? Math.abs(Math.trunc(dayKey)) : 0;
  const dos = [
    seed(`dodont-do/${planet}/${sign}`),
    house ? seed(`dodont-house/${house}`) : null,
    seed(`dodont-reward/${transiting}`),
  ].filter(Boolean);
  const donts = [
    seed(`dodont-shadow/${planet}/${sign}`),
    seed(`dodont-friction/${transiting}`),
    weakPlanet && weakSign ? seed(`dodont-shadow/${weakPlanet}/${weakSign}`) : seed(`dodont-friction/${planet}`),
  ].filter(Boolean);
  if (dos.length < 2 || donts.length < 2) throw new SourceGapError(`SOURCE_GAP: do/don't seeds for ${planet}/${sign} under ${transiting}`);
  // Moon day layer (owner design 2026-07-27): the pressed transit anchors the list, the
  // sky's Moon rotates a daily seed through it (sign line + the house the Moon is crossing).
  // The 12 sign rows ship as drafts and only join once owner-approved.
  const mds = [
    moonSign ? moonSeed(`dodont-moon-do/${moonSign}`) : null,
    moonHouse ? seed(`dodont-house/${moonHouse}`) : null,
  ].filter(Boolean);
  const mdt = [moonSign ? moonSeed(`dodont-moon-dont/${moonSign}`) : null].filter(Boolean);
  const uniq = (a) => [...new Set(a)];
  const rot = (a, n) => (a.length ? a.slice(n % a.length).concat(a.slice(0, n % a.length)) : a);
  // the anchor keeps the lead slot; the day decides which companions show
  const mDo = mds.length ? [mds[day % mds.length]] : [];
  const mDont = mdt.length ? [mdt[day % mdt.length]] : [];
  return {
    do: uniq([dos[0], ...mDo, ...rot(dos.slice(1), day)]).slice(0, 3),
    dont: uniq([donts[0], ...mDont, ...rot(donts.slice(1), day)]).slice(0, 3),
    templateKey: "fallback-template/daily.dodont",
  };
}
