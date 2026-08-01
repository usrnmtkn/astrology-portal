#!/usr/bin/env node
//
// Generate-then-lint harness for collective sky-aspect cards.
//
// This does NOT invent astrology. It assembles a generation prompt from the
// source-backed meaning in data/pairs, the 8-beat template and guardrails in
// voice/tldr-astro/sky-aspect.json, and the approved exemplars in
// voice/tldr-astro/examples.json — then gates the model's output through the
// voice linter (scripts/lint-sky-voice.js), retrying on failures.
//
// The model call uses the same provider/model environment variables as the
// app. Local runs load apps/web/.env.local without overwriting shell values.
//
//   node scripts/generate-sky-aspect-cards.js --dry-run sun-pluto opposition leo aquarius
//   node scripts/generate-sky-aspect-cards.js --run    sun-pluto opposition leo aquarius   (needs generate())

const fs = require("fs");
const path = require("path");
const { lintCard } = require("./lint-sky-voice.js");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = readJson(path.join(root, "voice", "tldr-astro", "sky-aspect.json"));
const examples = readJson(path.join(root, "voice", "tldr-astro", "examples.json"));
const canonicalAspectProfile = readJson(path.join(
  root,
  "..",
  "..",
  "services",
  "tldrastro-api",
  "src",
  "tldrastro_api",
  "data",
  "sky_aspect_profile.json"
));

const TITLE = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  chiron: "Chiron",
  "north-node": "North Node",
  "south-node": "South Node",
  nodes: "Lunar Nodes",
  lilith: "Lilith"
};
const PLANET_ORDER = canonicalAspectProfile.points.map((point) => point.id);
const PAIR_ORDER = [...PLANET_ORDER.filter((point) => !["north-node", "south-node"].includes(point)), "nodes"];
const SIGNS = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
const REVIEW_PAIR_SOURCE_PATH = path.join(root, "review", "TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.md");
const PLACEMENT_MODE = "collective-placement-card";
const PLACEMENT_TOPPER_MODE = "collective-placement-topper";
const PLACEMENT_WITH_TOPPER_MODE = "collective-placement-with-topper";
const TRADITIONAL_PLACEMENT_BODIES = new Set(PLANET_ORDER.slice(0, 10));
const POINT_PLACEMENT_BODIES = new Set(["chiron", "north-node", "lilith"]);
const PLACEMENT_BODIES = new Set([...TRADITIONAL_PLACEMENT_BODIES, ...POINT_PLACEMENT_BODIES, "south-node"]);
const OPPOSITE_SIGN = {
  aries: "libra",
  taurus: "scorpio",
  gemini: "sagittarius",
  cancer: "capricorn",
  leo: "aquarius",
  virgo: "pisces",
  libra: "aries",
  scorpio: "taurus",
  sagittarius: "gemini",
  capricorn: "cancer",
  aquarius: "leo",
  pisces: "virgo"
};
const PLACEMENT_TIER_OF = {
  sun: "luminary",
  moon: "luminary",
  mercury: "personal",
  venus: "personal",
  mars: "personal",
  jupiter: "outer",
  saturn: "outer",
  uranus: "outer",
  neptune: "outer",
  pluto: "outer",
  chiron: "point",
  "north-node": "point",
  "south-node": "point",
  lilith: "point"
};
const PLACEMENT_PACE = {
  sun: "about a month; a season-sized chapter",
  moon: "about two and a half days; a passing collective mood",
  mercury: "roughly two to three weeks, longer around a retrograde",
  venus: "about four weeks, longer around a retrograde",
  mars: "about six weeks, longer around a retrograde",
  jupiter: "about a year; a broad public chapter",
  saturn: "about two and a half years; a sustained structural chapter",
  uranus: "about seven years; generational change",
  neptune: "about fourteen years; generational atmosphere",
  pluto: "about twenty years; an era rather than a mood",
  chiron: "several years; a generational tender spot",
  "north-node": "about eighteen months; a collective growth direction",
  "south-node": "about eighteen months; a familiar pattern ready for release",
  lilith: "about nine months; a collective refusal or taboo brought forward"
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// aspect -> which data/pairs field carries its meaning
const ASPECT_FIELD = Object.fromEntries(canonicalAspectProfile.aspects.map(({ id }) => [
  id,
  id === "conjunction" ? "blend" : ["sextile", "trine"].includes(id) ? "harmonious" : "hard"
]));

// element of a planet or sign, from the metaphor guidance in the spec
function elementOf(token) {
  const em = spec.metaphorGuidance.elementMatch;
  for (const [el, members] of Object.entries(em)) if (members.includes(token)) return el;
  return null;
}

function canonicalPairPoint(value) {
  const point = normalizeToken(value);
  if (["north-node", "south-node", "true-node", "node", "nodes", "lunar-nodes"].includes(point)) return "nodes";
  if (point === "black-moon-lilith") return "lilith";
  return point;
}

let reviewPairSourceCache = null;

function reviewPairSources() {
  if (reviewPairSourceCache) return reviewPairSourceCache;
  if (!fs.existsSync(REVIEW_PAIR_SOURCE_PATH)) return new Map();

  const sourceText = fs.readFileSync(REVIEW_PAIR_SOURCE_PATH, "utf8");
  const rows = new Map();
  const entryPattern = /\*\*([A-Za-z]+)-([A-Za-z]+)\.\*\*\s+([\s\S]*?)(?=\n\n\*\*|\n## |\n---)/g;

  for (const match of sourceText.matchAll(entryPattern)) {
    const first = canonicalPairPoint(match[1]);
    const second = canonicalPairPoint(match[2]);
    const firstOrder = PAIR_ORDER.indexOf(first);
    const secondOrder = PAIR_ORDER.indexOf(second);

    if (firstOrder < 0 || secondOrder < 0 || first === second) continue;

    const [a, b] = firstOrder < secondOrder ? [first, second] : [second, first];
    const pairKey = `${a}-${b}`;
    const body = match[3].trim();

    rows.set(pairKey, {
      id: pairKey,
      planetA: a,
      planetB: b,
      status: "needs_review",
      sourceText: body,
      blend: body,
      harmonious: body,
      hard: body,
      provenance: {
        source: path.relative(root, REVIEW_PAIR_SOURCE_PATH).replaceAll(path.sep, "/"),
        reviewState: "needs_review"
      }
    });
  }

  if (rows.size !== 33) {
    throw new Error(`Expected 33 staged Chiron/Lilith/node pair sources; found ${rows.size}.`);
  }

  reviewPairSourceCache = rows;
  return reviewPairSourceCache;
}

function loadPair(pairKey, { allowReviewSources = false } = {}) {
  if (allowReviewSources) {
    const reviewPair = reviewPairSources().get(pairKey);

    if (reviewPair) {
      return { path: REVIEW_PAIR_SOURCE_PATH, value: reviewPair };
    }
  }

  const p = path.join(root, "data", "pairs", `${pairKey}.json`);
  if (!fs.existsSync(p)) return null;
  return { path: p, value: readJson(p) };
}

function canonicalPlacementBody(value) {
  const body = normalizeToken(value);
  if (body === "true-node" || body === "node") return "north-node";
  if (body === "black-moon-lilith") return "lilith";
  return body;
}

function placementSourcePath(planet, sign) {
  if (TRADITIONAL_PLACEMENT_BODIES.has(planet)) {
    return path.join(root, "data", "placements", "sign", `${planet}-${sign}.json`);
  }

  if (POINT_PLACEMENT_BODIES.has(planet)) {
    return path.join(root, "data", "points", "placements", "sign", `${planet}-${sign}.json`);
  }

  if (planet === "south-node") {
    return path.join(root, "data", "points", "placements", "sign", `north-node-${OPPOSITE_SIGN[sign]}.json`);
  }

  return null;
}

function normalizePlacementArgs({ planet, body, sign }) {
  const normalizedPlanet = canonicalPlacementBody(planet ?? body);
  const normalizedSign = normalizeToken(sign);

  if (!PLACEMENT_BODIES.has(normalizedPlanet)) {
    throw new SourceGapError(
      "missing-source",
      `No collective placement source is available for '${planet ?? body}'.`,
      { planet: normalizedPlanet, sign: normalizedSign }
    );
  }

  if (!SIGNS.has(normalizedSign)) {
    throw new SourceGapError(
      "invalid-sign",
      `'${sign}' is not a zodiac sign.`,
      { planet: normalizedPlanet, sign: normalizedSign }
    );
  }

  const sourcePath = placementSourcePath(normalizedPlanet, normalizedSign);

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new SourceGapError(
      "missing-source",
      `No approved placement source exists for ${normalizedPlanet} in ${normalizedSign}.`,
      { planet: normalizedPlanet, sign: normalizedSign }
    );
  }

  const source = readJson(sourcePath);
  const sourcePlanet = canonicalPlacementBody(source.planet ?? source.point);
  const expectedSourcePlanet = normalizedPlanet === "south-node" ? "north-node" : normalizedPlanet;
  const sourceSign = normalizeToken(source.key ?? source.sign);
  const expectedSourceSign = normalizedPlanet === "south-node"
    ? OPPOSITE_SIGN[normalizedSign]
    : normalizedSign;

  if (sourcePlanet !== expectedSourcePlanet || sourceSign !== expectedSourceSign) {
    throw new SourceGapError(
      "source-mismatch",
      `Placement source facts do not match ${normalizedPlanet} in ${normalizedSign}.`,
      {
        planet: normalizedPlanet,
        sign: normalizedSign,
        sourcePlanet,
        sourceSign
      }
    );
  }

  return {
    planet: normalizedPlanet,
    sign: normalizedSign,
    source,
    placementSource: path.relative(root, sourcePath).replaceAll(path.sep, "/"),
    derivedFrom: normalizedPlanet === "south-node"
      ? {
          planet: "north-node",
          sign: expectedSourceSign,
          frame: "comfort-zone/release"
        }
      : null,
    tier: PLACEMENT_TIER_OF[normalizedPlanet],
    pace: PLACEMENT_PACE[normalizedPlanet]
  };
}

class SourceGapError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SourceGapError";
    this.code = code;
    this.details = details;
  }
}

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function normalizeCardArgs({ a, b, aspect, signA, signB }, { allowReviewSources = false } = {}) {
  const first = canonicalPairPoint(a);
  const second = canonicalPairPoint(b);
  const normalizedAspect = normalizeToken(aspect);
  const firstSign = normalizeToken(signA);
  const secondSign = normalizeToken(signB);

  if (!ASPECT_FIELD[normalizedAspect]) {
    throw new SourceGapError("unsupported-aspect", `Unsupported sky aspect '${aspect}'.`, { aspect: normalizedAspect });
  }

  if (!SIGNS.has(firstSign) || !SIGNS.has(secondSign)) {
    throw new SourceGapError("invalid-sign", "Both sky-aspect signs must be zodiac signs.", { signA: firstSign, signB: secondSign });
  }

  const firstOrder = PAIR_ORDER.indexOf(first);
  const secondOrder = PAIR_ORDER.indexOf(second);

  if (firstOrder < 0 || secondOrder < 0 || first === second) {
    throw new SourceGapError("missing-source", `No source-backed pair is available for ${first}-${second}.`, { a: first, b: second });
  }

  const reversed = firstOrder > secondOrder;
  const normalized = reversed
    ? { a: second, b: first, aspect: normalizedAspect, signA: secondSign, signB: firstSign }
    : { a: first, b: second, aspect: normalizedAspect, signA: firstSign, signB: secondSign };
  const pairKey = `${normalized.a}-${normalized.b}`;
  const pair = loadPair(pairKey, { allowReviewSources });

  if (!pair) {
    throw new SourceGapError(
      "missing-source",
      `No data/pairs/${pairKey}.json source exists; author the meaning before generation.`,
      { ...normalized, pairKey }
    );
  }

  // This is the one explicitly documented stub. Its existence on disk is not
  // approval to generate or serve it.
  if (/\bSTUB\b/i.test(JSON.stringify(pair.value.provenance ?? {}))) {
    throw new SourceGapError(
      "source-review-required",
      `data/pairs/${pairKey}.json is a draft stub and requires owner review before generation.`,
      { ...normalized, pairKey }
    );
  }

  return {
    ...normalized,
    pairKey,
    pair: pair.value,
    pairSource: path.relative(root, pair.path).replaceAll(path.sep, "/"),
    reversed
  };
}

// pick a couple of approved exemplars to teach the shape (few-shot).
// Prefer canonical 8-beat "we" cards over the earlier 2-paragraph ones.
function fewShot(n = 2) {
  const sky = examples.filter((e) => e.surface === "sky" && e.mode === "collective-aspect-card");
  const canonical = sky.filter((e) => e.canonical);
  return (canonical.length ? canonical : sky).slice(0, n).map((e) => e.body);
}

function lastSentences(text, count = 2) {
  const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
  return sentences.slice(-count).join(" ");
}

function closeBank(n = 5, random = Math.random) {
  const golds = examples
    .filter((entry) => (
      entry.surface === "sky"
      && entry.mode === "collective-aspect-card"
      && entry.canonical
    ))
    .map((entry) => lastSentences(entry.body))
    .filter(Boolean);
  const shuffled = [...golds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function placementGolds() {
  return examples.filter((entry) => (
    entry.surface === "sky"
    && entry.mode === PLACEMENT_MODE
    && entry.canonical
  ));
}

function rotatedPlacementGolds({ planet, sign }, n = 3) {
  const sourceId = `sky-${planet}-in-${sign}`;
  const all = placementGolds().filter((entry) => entry.sourceId !== sourceId);
  const sameTier = all.filter((entry) => entry.tier === PLACEMENT_TIER_OF[planet]);
  const pool = [...sameTier, ...all.filter((entry) => !sameTier.includes(entry))];
  const offset = [...`${planet}-${sign}`].reduce((sum, character) => sum + character.charCodeAt(0), 0)
    % Math.max(pool.length, 1);
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];

  return rotated.slice(0, Math.min(n, rotated.length));
}

function placementCloseBank({ planet, sign }, n = 4) {
  return rotatedPlacementGolds({ planet, sign }, placementGolds().length)
    .map((entry) => lastSentences(entry.body))
    .filter(Boolean)
    .slice(0, n);
}

function placementTopperGolds() {
  return examples.filter((entry) => (
    entry.surface === "sky"
    && entry.mode === PLACEMENT_TOPPER_MODE
    && entry.canonical
  ));
}

function normalizePlacementTopperArgs({
  planet,
  sign,
  aspect,
  other,
  otherSign,
  orb,
  baseText
}) {
  const placement = normalizePlacementArgs({ planet, sign });
  const normalizedOther = canonicalPlacementBody(other);
  const normalizedOtherSign = normalizeToken(otherSign);
  const aspectFacts = normalizeCardArgs({
    a: placement.planet,
    b: normalizedOther,
    aspect,
    signA: placement.sign,
    signB: normalizedOtherSign
  });
  const normalizedOrb = Number(orb);
  const normalizedBaseText = String(baseText ?? "").trim();

  if (!Number.isFinite(normalizedOrb) || normalizedOrb < 0) {
    throw new SourceGapError("invalid-orb", "A current numeric orb is required for a placement topper.", {
      planet: placement.planet,
      sign: placement.sign,
      aspect: aspectFacts.aspect,
      other: normalizedOther
    });
  }

  if (normalizedBaseText.split(/\n\s*\n/).filter(Boolean).length !== 2) {
    throw new SourceGapError("missing-base", "A clean two-paragraph placement base is required before generating its topper.", {
      planet: placement.planet,
      sign: placement.sign
    });
  }

  return {
    ...placement,
    aspect: aspectFacts.aspect,
    other: normalizedOther,
    otherSign: normalizedOtherSign,
    orb: normalizedOrb,
    baseText: normalizedBaseText,
    pair: aspectFacts.pair,
    pairKey: aspectFacts.pairKey,
    pairSource: aspectFacts.pairSource
  };
}

function buildPlacementTopperPrompt(args, { avoidTerms = [] } = {}) {
  const normalized = normalizePlacementTopperArgs(args);
  const field = ASPECT_FIELD[normalized.aspect];
  const retryAvoidance = [...new Set(avoidTerms.map((term) => String(term ?? "").trim()).filter(Boolean))];
  const failList = spec.outputBans.fail.map((entry) => entry.term).join(", ");
  const golds = placementTopperGolds();

  return [
    `Write ONE current-sky topper paragraph for ${TITLE[normalized.planet]} in ${cap(normalized.sign)}, now ${normalized.aspect} ${TITLE[normalized.other]} in ${cap(normalized.otherSign)}.`,
    ``,
    `VOICE: ${spec.voiceDescription}`,
    `MODE: live aspect layer for an evergreen collective placement base.`,
    `PERSON: collective "we/our/us", never "you/your".`,
    ``,
    `SOURCE MEANING (do not add claims beyond this):`,
    `  pair essence: ${normalized.pair.blend ?? ""}`,
    `  active aspect face: ${normalized.pair[field] ?? ""}`,
    `  harmonious face: ${normalized.pair.harmonious ?? ""}`,
    `  hard face: ${normalized.pair.hard ?? ""}`,
    ``,
    `EVERGREEN BASE THIS TOPPER FRAMES (do not rewrite or repeat it):`,
    normalized.baseText,
    ``,
    `SHAPE - exactly one short paragraph:`,
    `  1. Name the current contact plainly.`,
    `  2. Say what it does to this placement's specific theme right now.`,
    `  3. End on one grounded line, not advice and not a second close.`,
    ``,
    `RULES:`,
    `  - Never use these words/phrases: ${failList}.`,
    `  - Em dash is banned; use a spaced hyphen " - " instead.`,
    `  - Do not print the orb, degrees, dates, mechanics, elements, or series metadata.`,
    `  - Do not write a natal reading. Never address the reader as "you".`,
    `  - Do not restate the base's pace or summarize both base paragraphs.`,
    `  - Keep examples fragmentary; no invented actors or mini-stories.`,
    `  - One contact only: ${TITLE[normalized.planet]} ${normalized.aspect} ${TITLE[normalized.other]}.`,
    ``,
    `APPROVED TOPPER GOLDS (match the shape and register; do not copy):`,
    ...golds.map((entry, index) => `  [${index + 1}] ${entry.body}`),
    ``,
    `RANGE OF APPROVED ASPECT CLOSES (learn the grounded register; do not copy or stack them):`,
    ...closeBank(3).map((close, index) => `  [${index + 1}] ${close}`),
    ...(retryAvoidance.length
      ? [
          ``,
          `LINT RETRY - YOUR PREVIOUS DRAFT USED THE BANNED PHRASE(S): ${retryAvoidance.map((term) => JSON.stringify(term)).join(", ")}.`,
          `Rewrite the one-paragraph topper without those terms.`
        ]
      : []),
    ``,
    `Return only the topper paragraph.`
  ].join("\n");
}

function buildPlacementPrompt({ planet, body, sign }, { avoidTerms = [] } = {}) {
  const normalized = normalizePlacementArgs({ planet, body, sign });
  const { source } = normalized;
  const retryAvoidance = [...new Set(avoidTerms.map((term) => String(term ?? "").trim()).filter(Boolean))];
  const secondPersonTerm = "(?<!-)\\byou\\b|(?<!-)\\byour\\b";
  const failList = spec.outputBans.fail
    .filter((entry) => entry.term !== secondPersonTerm)
    .map((entry) => entry.term)
    .join(", ");
  const sourceMeaning = {
    tldr: source.tldr ?? "",
    body: source.body ?? "",
    strength: source.gift ?? source.business ?? "",
    challenge: source.challenge ?? source.shadow ?? "",
    shadow: source.shadow ?? ""
  };
  const derivedNote = normalized.derivedFrom
    ? `This is South Node in ${cap(normalized.sign)}, derived from North Node in ${cap(normalized.derivedFrom.sign)}. Reframe the source's familiar South Node pattern as a collective comfort zone to recognize and release. Do not describe South Node as the growth destination.`
    : "";
  const golds = rotatedPlacementGolds(normalized);
  const placementVoice = spec.voiceDescription.replace(
    "Collective and third-person (never 'you')",
    "Collective in the body; impersonal second person may appear only in the final truth-and-catch pair"
  );

  return [
    `Write ONE evergreen collective sky placement card for ${TITLE[normalized.planet]} in ${cap(normalized.sign)}.`,
    ``,
    `VOICE: ${placementVoice}`,
    `MODE: collective placement, not a natal reading and not a live aspect report.`,
    `PERSON: Use collective "we/our/us" throughout the body. Impersonal "you/your/you're" is allowed ONLY in the final truth-and-catch pair.`,
    `PACE TO STATE PLAINLY: ${normalized.pace}.`,
    ``,
    `SOURCE MEANING (reframe the natal "you" as collective "we"; do not add claims beyond this):`,
    `  core: ${sourceMeaning.tldr}`,
    `  placement behavior: ${sourceMeaning.body}`,
    `  strength / medicine: ${sourceMeaning.strength}`,
    `  challenge / shadow: ${sourceMeaning.challenge}`,
    ...(sourceMeaning.shadow && sourceMeaning.shadow !== sourceMeaning.challenge
      ? [`  additional shadow: ${sourceMeaning.shadow}`]
      : []),
    ...(derivedNote ? [`  DERIVED NODE AXIS RULE: ${derivedNote}`] : []),
    ``,
    `SHAPE - exactly two short paragraphs:`,
    `  1. Open on a claim, never an announcement that the body is "now in" the sign.`,
    `  2. State the pace so the reader knows whether this is a mood, chapter, or era.`,
    `  3. Personify the planet or point in short declaratives where it fits.`,
    `  4. Make the sign-specific behavior concrete and modern.`,
    `  5. Name the strength and shadow as one flowing observation, never as labels.`,
    `  6. End on ONE truth and the catch that turns on it. These words describe the SHAPE for us; never print "The truth" or "The catch" as labels. State both as plain sentences. The final pair is the only place "you" is allowed.`,
    ``,
    `RULES:`,
    `  - Never use these words/phrases: ${failList}.`,
    `  - Em dash is banned; use a spaced hyphen " - " instead.`,
    `  - No dates, degrees, orb mechanics, live aspects, or current-sky topper. This is the evergreen base only.`,
    `  - Do not explain astrology mechanics, dignities, or elements. Make the placement felt.`,
    `  - Direct beats poetic. No generic weather, machinery, "shine" language, cosmic coaching, or motivational-poster maxims.`,
    `  - Do not announce any turn with a label such as "The truth", "The catch", "The challenge is", "The downside is", "The gift is", or "The shadow is".`,
    `  - Keep concrete examples terse. Do not invent named actors or mini-stories.`,
    ``,
    `CLOSE SHAPE BY DEMONSTRATION:`,
    `  BAD - visible scaffolding: "...measuring worth by reaction. The truth: we want to be seen for what is real. The catch: if you build yourself on applause, you'll always need a crowd."`,
    `  GOOD - state it plainly: "...measuring worth by the reaction instead of the work. Being seen for something real is the whole point. Build yourself on applause and you'll always need a crowd."`,
    ``,
    `DELETE THE PRE-CLOSE APHORISM - less is more:`,
    `  BAD: "...let old hurts write today's response. Emotional honesty builds trust. If you keep sidestepping the real conversation, you'll end up talking circles around what you actually mean."`,
    `  GOOD - cut the maxim instead of rewording it: "...let old hurts write today's response. If you keep sidestepping the real conversation, you'll end up talking circles around what you actually mean."`,
    `  BAD: "...leave projects half-built when the next idea hits. Words move mountains, but they also run circles if we let them. It's easy to start a hundred things. You only get anywhere if you finish one."`,
    `  GOOD - cut the maxim and the "move mountains" cliche: "...leave projects half-built when the next idea hits. It's easy to start a hundred things. You only get anywhere if you finish one."`,
    ``,
    `MAKE THE MIDDLE CONCRETE:`,
    `  BAD - generic motivational verbs: "The Sun in Leo pushes us to choose boldness over safety, to lead without waiting for permission, and to create something that lands."`,
    `  GOOD - observable behavior: "Stop choosing safety over presence. Step up before we're asked, and put our energy into work that can make an impact."`,
    `  Follow the gold bodies: a room we're trying to light up; the check-in text, the meal prepped, the fix nobody else noticed; feelings asked to show their work before they get a seat at the table.`,
    ``,
    `IN-VOICE PLACEMENT GOLDS (match the shape and register; do not copy):`,
    ...golds.map((entry, index) => `  [${index + 1} | ${entry.tier}] ${entry.body}`),
    ``,
    `RANGE OF APPROVED PLACEMENT CLOSES (learn the range; do not copy):`,
    ...placementCloseBank(normalized).map((close, index) => `  [${index + 1}] ${close}`),
    ...(retryAvoidance.length
      ? [
          ``,
          `LINT RETRY - YOUR PREVIOUS DRAFT USED THE BANNED PHRASE(S): ${retryAvoidance.map((term) => JSON.stringify(term)).join(", ")}.`,
          `Do not use those terms again. State the closing truth and catch without labels. Keep second person out of the body; it may appear only in the final pair.`
        ]
      : []),
    ``,
    `Return only the two-paragraph card text.`
  ].join("\n");
}

function buildPrompt({ a, b, aspect, signA, signB }, { avoidTerms = [], allowReviewSources = false } = {}) {
  const normalized = normalizeCardArgs(
    { a, b, aspect, signA, signB },
    { allowReviewSources }
  );
  const { pair } = normalized;
  const field = ASPECT_FIELD[normalized.aspect];
  const meaning = { blend: pair.blend, active: pair[field], harmonious: pair.harmonious, hard: pair.hard, traditional: pair.traditional };
  const elements = [normalized.a, normalized.b, normalized.signA, normalized.signB].map((t) => `${cap(t)}=${elementOf(t) || "-"}`).join(", ");
  const failList = [...spec.outputBans.fail.map((x) => x.term)].join(", ");
  const retryAvoidance = [...new Set(avoidTerms.map((term) => String(term ?? "").trim()).filter(Boolean))];

  return [
    `Write ONE collective sky-aspect card for ${TITLE[normalized.a]} in ${cap(normalized.signA)} ${normalized.aspect} ${TITLE[normalized.b]} in ${cap(normalized.signB)}.`,
    ``,
    `VOICE: ${spec.voiceDescription}`,
    `PERSON: ${spec.personNote}`,
    ``,
    `SOURCE MEANING (do not add claims beyond this):`,
    `  pair essence (blend): ${meaning.blend ?? meaning.NOTE}`,
    `  this aspect (${field}): ${meaning.active ?? ""}`,
    `  gift face (harmonious): ${meaning.harmonious ?? ""}`,
    `  shadow face (hard): ${meaning.hard ?? ""}`,
    ``,
    `SHAPE — hit all 8 beats across two short paragraphs:`,
    ...spec.shape.beats.map((x) => `  ${x.n}. ${x.beat}: ${x.does}  [source: ${x.source}]`),
    ``,
    `PHRASE BANK (draw from these; they are the approved register):`,
    `  planet verbs: ${spec.useWords.planetVerbs.join(", ")}`,
    `  collective subjects: ${spec.useWords.collectiveSubjects.join(", ")}`,
    `  modern objects: ${spec.useWords.modernObjects.join(", ")}`,
    `  mood cues: ${spec.useWords.moodCues.join(", ")}`,
    ``,
    `RULES:`,
    `  - Never use these words/phrases: ${failList}.`,
    `  - "steady" only if stable/strong/solid precedes it. Bare "loop" -> use "cycle".`,
    `  - Em dash is banned; use a spaced hyphen " - " instead.`,
    `  - Keep absolute dates, degrees, orb, and detailed space mechanics out of the card body; the app renders those separately from facts.`,
    `  - Metaphors: elemental imagery is allowed only when it matches an element in play here (${elements}). Do NOT name the element or the mechanics ("air-fire sextile", "this trine links two air signs", "fire ignites water") - the element is felt, never labeled.`,
    ``,
    `ANTI-PATTERNS (these are why weak drafts fail - avoid every one):`,
    `  - End on one concrete truth, then a catch that turns on it.`,
    `  - Keep the three-example beat terse and fragmentary, with no named actors or mini-stories.`,
    `  - Do NOT write "The gift is X; the shadow is Y." Weave both faces into the actual situation.`,
    `  - Do NOT explain the astrology or name the aspect geometry in the body.`,
    `  - Avoid "viral", and avoid motivational-poster lines ("adapt or get left behind", "power without purpose is chaos", "leaves ash"). Be specific and grounded instead.`,
    `  - Vary the verb for each planet; do not lean on "demands" every time.`,
    `  - Show both faces, but as one flowing observation, not a labeled list.`,
    ``,
    `IN-VOICE EXEMPLARS (match this register, do not copy):`,
    ...fewShot().map((b, i) => `  [${i + 1}] ${b}`),
    ``,
    `RANGE OF GOOD CLOSES (real approved closes; learn the range, do not copy):`,
    ...closeBank().map((close, i) => `  [${i + 1}] ${close}`),
    ...(retryAvoidance.length
      ? [
          ``,
          `LINT RETRY - YOUR PREVIOUS DRAFT USED THE BANNED PHRASE(S): ${retryAvoidance.map((term) => JSON.stringify(term)).join(", ")}.`,
          `Do not use those terms again. Do not use "gift" or "shadow" as labels.`
        ]
      : []),
    ``,
    `OUT OF VOICE (a weak draft - do NOT write like this: stacked endings, named mechanics, "gift is/shadow is", generic):`,
    `  We are caught in a quick current of change that feels electric and deep at once. This trine links two air signs, making adaptation fast and clear. The gift is sharp, effective change; the shadow is upheaval so fast it risks breaking before it builds. Change will not wait for comfort or consent. Adapt quickly or get left behind. Change is here. Change demands speed.`,
    ``,
    `Return only the card text.`,
  ].join("\n");
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  return (quote === "'" || quote === "\"") && trimmed.endsWith(quote)
    ? trimmed.slice(1, -1)
    : trimmed;
}

function loadLocalEnv() {
  if (process.env.NODE_ENV === "production") return;

  const repoRoot = path.resolve(root, "..", "..");
  const envPath = [
    path.join(repoRoot, "apps", "web", ".env.local"),
    path.join(repoRoot, ".env.local")
  ].find((candidate) => fs.existsSync(candidate));

  if (!envPath) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;
    process.env[key] = unquoteEnvValue(trimmed.slice(separator + 1));
  }
}

const { resolveActiveRelease, resolveCandidateRelease } = require("./editorial-model-registry.js");

function registeredRelease(role, surface) {
  const candidateReleaseId = String(process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID || "").trim();
  if (!candidateReleaseId) return resolveActiveRelease({ role, surface });
  const authorized = role === "judge"
    ? process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION === "1"
    : process.env.TLDR_ALLOW_LIVE_LLM_GENERATION_CALIBRATION === "1";
  if (!authorized) {
    throw new Error(
      `Candidate model selection for ${role} requires an explicitly authorized ${role} calibration.`
    );
  }
  return resolveCandidateRelease({ role, surface, releaseId: candidateReleaseId });
}

const OPENAI_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh", "max"]);

function openAiReasoningEffort({ isJudge, model, release }) {
  const configured = String(
    (isJudge
      ? process.env.OPENAI_JUDGE_REASONING_EFFORT
      : process.env.OPENAI_GENERATION_REASONING_EFFORT)
    || process.env.OPENAI_REASONING_EFFORT
    || ""
  ).trim().toLowerCase();
  const registered = release.provider === "openai" && release.model === model
    ? release.reasoningEffort
    : null;
  const effort = configured || registered || (/^gpt-5\.6(?:-|$)/.test(model) ? "none" : null);
  if (effort && !OPENAI_REASONING_EFFORTS.has(effort)) {
    throw new Error(
      "OpenAI reasoning effort must be none, low, medium, high, xhigh, or max."
    );
  }
  return effort;
}

function modelConfig(role = "generation", surface = "default") {
  loadLocalEnv();
  const isJudge = role === "judge";
  const release = registeredRelease(role, surface);
  const requested = (isJudge
    ? (
        process.env.CONTENT_JUDGE_PROVIDER
        || process.env.CONTENT_GENERATION_PROVIDER_JUDGE
        || process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT
        || process.env.CONTENT_GENERATION_PROVIDER
        || release.provider
      )
    : (
        process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT
        || process.env.CONTENT_GENERATION_PROVIDER
        || release.provider
      )).trim().toLowerCase();
  const provider = requested === "anthropic" ? "claude" : requested;
  const registryModel = provider === release.provider ? release.model : null;
  const registryOverride = provider !== release.provider;

  if (provider === "claude") {
    const configuredModel = isJudge
      ? (process.env.ANTHROPIC_JUDGE_MODEL || process.env.ANTHROPIC_MODEL)
      : (process.env.ANTHROPIC_GENERATION_MODEL || process.env.ANTHROPIC_MODEL);
    return {
      ...release,
      provider,
      model: configuredModel || registryModel || "claude-sonnet-4-6",
      apiKey: isJudge
        ? (process.env.ANTHROPIC_JUDGE_API_KEY || process.env.ANTHROPIC_API_KEY)
        : process.env.ANTHROPIC_API_KEY,
      temperature: isJudge ? 0.1 : 0.7,
      reasoningEffort: null,
      role,
      surface,
      registryOverride: registryOverride || Boolean(configuredModel && configuredModel !== release.model)
    };
  }

  if (provider === "openai") {
    const configuredModel = isJudge
      ? (process.env.OPENAI_JUDGE_MODEL || process.env.OPENAI_MODEL)
      : (process.env.OPENAI_GENERATION_MODEL || process.env.OPENAI_MODEL);
    const model = configuredModel || registryModel || "gpt-4.1-mini";
    const reasoningEffort = openAiReasoningEffort({ isJudge, model, release });
    return {
      ...release,
      provider,
      model,
      apiKey: isJudge
        ? (process.env.OPENAI_JUDGE_API_KEY || process.env.OPENAI_API_KEY)
        : process.env.OPENAI_API_KEY,
      temperature: isJudge ? 0.1 : 0.7,
      reasoningEffort,
      role,
      surface,
      registryOverride: registryOverride
        || Boolean(configuredModel && configuredModel !== release.model)
        || Boolean(reasoningEffort && reasoningEffort !== release.reasoningEffort)
    };
  }

  throw new Error(`Unsupported ${isJudge ? "CONTENT_JUDGE_PROVIDER" : "CONTENT_GENERATION_PROVIDER_SKY_ASPECT"} '${requested}'. Use 'openai' or 'claude'.`);
}

function generationConfig(surface = "default") {
  return modelConfig("generation", surface);
}

function judgeConfig(surface = "sky-aspect") {
  return modelConfig("judge", surface);
}

function openAiOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n");
}

function openAiRequestSettings(config, { temperature } = {}) {
  const settings = {};
  if (!/^gpt-5\.6(?:-|$)/.test(config.model)) {
    settings.temperature = temperature ?? config.temperature;
  }
  if (config.reasoningEffort) {
    settings.reasoning = { effort: config.reasoningEffort };
  }
  return settings;
}

function cleanCardText(value) {
  return String(value ?? "")
    .trim()
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    // em dash has a defined substitute (" - "); normalize so it never burns a
    // retry. This is deterministic formatting, not a voice change.
    .replace(/\s*—\s*/g, " - ")
    .replace(/ {2,}/g, " ")
    .trim();
}

function buildRepairPrompt(text, reason) {
  return [
    `A careful editor flagged this card: ${JSON.stringify(String(reason ?? "").trim())}.`,
    `Fix ONLY what the note describes. End on one concrete truth and the catch that turns on it - no second aphorism, no advice.`,
    `Change nothing else: do not reword the rest, do not add length. Return only the corrected card.`,
    ``,
    `CARD`,
    text
  ].join("\n");
}

// Must return the poetic card body only. Facts such as dates, degrees, series,
// and mechanics are deliberately not accepted here.
async function generateWithConfig(prompt, config, { temperature } = {}) {
  const temp = temperature ?? config.temperature;

  if (!config.apiKey) {
    const keyName = config.provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    throw new Error(`${keyName} is not configured.`);
  }

  if (config.provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1500,
        temperature: temp,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || `Claude request failed with ${response.status}.`);
    }

    const text = cleanCardText((payload.content || []).filter((item) => item.type === "text").map((item) => item.text).join("\n"));
    if (!text) throw new Error("Claude response did not include card text.");
    return text;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input: prompt,
      ...openAiRequestSettings(config, { temperature: temp }),
      max_output_tokens: 1500
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with ${response.status}.`);
  }

  const text = cleanCardText(openAiOutputText(payload));
  if (!text) throw new Error("OpenAI response did not include card text.");
  return text;
}

async function generate(prompt, options = {}) {
  return generateWithConfig(prompt, generationConfig(), options);
}

function judgeConfigForOptions(options = {}) {
  return judgeConfig(options.surface || "sky-aspect");
}

async function generateJudge(prompt, options = {}) {
  return generateWithConfig(prompt, judgeConfigForOptions(options), options);
}

async function repairCard(text, reason, { generateFn = generate } = {}) {
  return cleanCardText(await generateFn(buildRepairPrompt(text, reason), { temperature: 0.1 }));
}

async function repairPlacementTopper(text, reason, { generateFn = generate } = {}) {
  const prompt = [
    `A careful editor flagged this current-sky topper: ${JSON.stringify(String(reason ?? "").trim())}.`,
    `Fix ONLY what the note describes. Keep exactly one short paragraph and end on one grounded line.`,
    `Do not add advice, a second close, dates, degrees, orb language, or second person. Return only the corrected topper.`,
    ``,
    `TOPPER`,
    text
  ].join("\n");

  return cleanCardText(await generateFn(prompt, { temperature: 0.1 }));
}

async function runCardPipeline({
  buildPromptFor,
  facts,
  judgeMode,
  judgeTier,
  lintMode,
  judgeTextFor = (text) => text
}, {
  maxRetries = 3,
  generateFn = generate,
  repairFn,
  withJudge = false,
  judgeFn,
  judgeFeedback
} = {}) {
  const promptFor = (avoidTerms = []) => {
    let nextPrompt = buildPromptFor(avoidTerms);
    if (judgeFeedback) {
      nextPrompt = `${nextPrompt}\n\nThe previous draft reached the editorial judge but was rejected. Rewrite from scratch while fixing this feedback: ${judgeFeedback}`;
    }
    return nextPrompt;
  };
  let prompt = promptFor();
  let lastAttempt = null;
  const lintRetryAvoidTerms = [];
  const repair = {
    fired: false,
    result: "not-needed",
    reason: "",
    originalScore: null,
    repairedScore: null,
    kept: "original"
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const text = cleanCardText(await generateFn(prompt));
    const lint = lintCard(text, { mode: lintMode });
    lastAttempt = { text, lint };
    if (lint.score === 3 && lint.fails === 0) {
      const config = generateFn === generate ? generationConfig() : null;
      const result = {
        text,
        lint,
        attempts: attempt,
        status: "clean",
        provider: config?.provider ?? "test",
        model: config?.model ?? "injected",
        temperature: config?.temperature ?? null,
        reasoningEffort: config?.reasoningEffort ?? null,
        repair: { ...repair },
        lintRetryAvoidTerms: lintRetryAvoidTerms.map((terms) => [...terms]),
        facts: { ...facts }
      };
      // Second gate: the LLM judge. Opt-in so the caller controls the extra
      // model call. Attaches { judge, gate } for the cron to persist and route.
      // lazy require avoids a circular dependency (judge reuses generate()).
      if (withJudge) {
        const { judgeCard } = require("./judge-sky-voice.js");
        result.judge = await judgeCard(judgeTextFor(text), {
          mode: judgeMode,
          tier: judgeTier,
          judgeFn
        });
        result.gate = result.judge.gate; // human-review | regenerate (model verdicts are advisory)

        if (result.judge.score === 2) {
          const originalJudge = result.judge;
          const reason = originalJudge.why || originalJudge.verdict;
          repair.fired = true;
          repair.reason = reason;
          repair.originalScore = originalJudge.score;

          try {
            const repairedText = cleanCardText(
              repairFn
                ? await repairFn(text, reason)
                : await repairCard(text, reason, { generateFn })
            );
            const repairedLint = lintCard(repairedText, { mode: lintMode });

            if (repairedLint.score !== 3 || repairedLint.fails !== 0) {
              repair.result = "lint-failed";
            } else {
              const repairedJudge = await judgeCard(judgeTextFor(repairedText), {
                mode: judgeMode,
                tier: judgeTier,
                judgeFn
              });
              repair.repairedScore = repairedJudge.score;
              repair.result = repairedText === text
                ? "unchanged"
                : `2→${repairedJudge.score}`;

              if (repairedJudge.score > originalJudge.score) {
                result.text = repairedText;
                result.lint = repairedLint;
                result.judge = repairedJudge;
                result.gate = repairedJudge.gate;
                repair.kept = "repaired";
              }
            }
          } catch (error) {
            repair.result = "error";
            repair.error = error instanceof Error ? error.message : String(error);
          }

          result.repair = { ...repair };
        }
      }
      return result;
    }
    const avoidTerms = [...new Set(
      lint.findings
        .map((finding) => String(finding.retryInstruction ?? finding.term ?? "").trim())
        .filter(Boolean)
    )];
    lintRetryAvoidTerms.push(avoidTerms);
    prompt = promptFor(avoidTerms);
  }
  const config = generateFn === generate ? generationConfig() : null;
  return {
    status: "needs-review",
    note: "did not pass the linter within retries",
    attempts: maxRetries,
    provider: config?.provider ?? "test",
    model: config?.model ?? "injected",
    temperature: config?.temperature ?? null,
    reasoningEffort: config?.reasoningEffort ?? null,
    repair: { ...repair },
    lintRetryAvoidTerms: lintRetryAvoidTerms.map((terms) => [...terms]),
    text: lastAttempt?.text ?? "",
    lint: lastAttempt?.lint ?? null,
    facts: { ...facts }
  };
}

async function generateCard(args, options = {}) {
  let normalized;

  try {
    normalized = normalizeCardArgs(args, {
      allowReviewSources: options.allowReviewSources === true
    });
  } catch (error) {
    if (error instanceof SourceGapError) {
      return { status: "skipped", reason: error.code, note: error.message, facts: error.details };
    }
    throw error;
  }

  const aspectTier = ["sun", "moon"].includes(normalized.a)
    ? "luminary"
    : ["mercury", "venus", "mars"].includes(normalized.a)
      ? "personal"
      : "outer";

  return runCardPipeline({
    buildPromptFor: (avoidTerms) => buildPrompt(normalized, {
      avoidTerms,
      allowReviewSources: options.allowReviewSources === true
    }),
    facts: {
      a: normalized.a,
      b: normalized.b,
      aspect: normalized.aspect,
      signA: normalized.signA,
      signB: normalized.signB,
      pairKey: normalized.pairKey,
      pairSource: normalized.pairSource,
      pairStatus: normalized.pair.status ?? null
    },
    judgeMode: "collective-aspect-card",
    judgeTier: aspectTier,
    lintMode: "collective-aspect-card"
  }, options);
}

async function generatePlacementCard(args, options = {}) {
  let normalized;

  try {
    normalized = normalizePlacementArgs(args);
  } catch (error) {
    if (error instanceof SourceGapError) {
      return { status: "skipped", reason: error.code, note: error.message, facts: error.details };
    }
    throw error;
  }

  return runCardPipeline({
    buildPromptFor: (avoidTerms) => buildPlacementPrompt(normalized, { avoidTerms }),
    facts: {
      planet: normalized.planet,
      sign: normalized.sign,
      placementSource: normalized.placementSource,
      derivedFrom: normalized.derivedFrom
    },
    judgeMode: PLACEMENT_MODE,
    judgeTier: normalized.tier,
    lintMode: PLACEMENT_MODE
  }, options);
}

async function generatePlacementTopper(args, options = {}) {
  let normalized;

  try {
    normalized = normalizePlacementTopperArgs(args);
  } catch (error) {
    if (error instanceof SourceGapError) {
      return { status: "skipped", reason: error.code, note: error.message, facts: error.details };
    }
    throw error;
  }

  const generateFn = options.generateFn ?? generate;

  return runCardPipeline({
    buildPromptFor: (avoidTerms) => buildPlacementTopperPrompt(normalized, { avoidTerms }),
    facts: {
      planet: normalized.planet,
      sign: normalized.sign,
      aspect: normalized.aspect,
      other: normalized.other,
      otherSign: normalized.otherSign,
      orb: normalized.orb,
      placementSource: normalized.placementSource,
      pairKey: normalized.pairKey,
      pairSource: normalized.pairSource
    },
    judgeMode: PLACEMENT_WITH_TOPPER_MODE,
    judgeTier: normalized.tier,
    lintMode: PLACEMENT_TOPPER_MODE,
    judgeTextFor: (topperText) => `${topperText}\n\n${normalized.baseText}`
  }, {
    ...options,
    generateFn,
    repairFn: options.repairFn
      ?? ((text, reason) => repairPlacementTopper(text, reason, { generateFn }))
  });
}

// ---- CLI ----
if (require.main === module) {
  const [mode, pairKey, aspect, signA, signB] = process.argv.slice(2);
  if (!pairKey || !aspect || !signA || !signB) {
    console.error("usage: --dry-run|--dry-run-review|--run <a-b> <aspect> <signA> <signB>");
    process.exit(1);
  }
  const pairTokens = [...PAIR_ORDER, "north-node", "south-node"]
    .sort((first, second) => second.length - first.length);
  const a = pairTokens.find((token) => pairKey.startsWith(`${token}-`));
  const b = a ? pairKey.slice(a.length + 1) : "";

  if (!a || !b) {
    console.error(`Could not parse pair key '${pairKey}'.`);
    process.exit(1);
  }
  if (mode === "--dry-run" || mode === "--dry-run-review") {
    try {
      console.log(buildPrompt(
        { a, b, aspect, signA, signB },
        { allowReviewSources: mode === "--dry-run-review" }
      ));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    }
  } else if (mode === "--run") {
    generateCard({ a, b, aspect, signA, signB })
      .then((r) => {
        console.log(JSON.stringify(r, null, 2));
        if (r.status === "needs-review") process.exitCode = 2;
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      });
  } else {
    console.error("first arg must be --dry-run, --dry-run-review, or --run");
    process.exit(1);
  }
}

module.exports = {
  ASPECT_FIELD,
  PLACEMENT_TIER_OF,
  SourceGapError,
  buildPlacementPrompt,
  buildPlacementTopperPrompt,
  buildRepairPrompt,
  buildPrompt,
  closeBank,
  generate,
  generateJudge,
  generateCard,
  generatePlacementCard,
  generatePlacementTopper,
  generationConfig,
  judgeConfig,
  judgeConfigForOptions,
  normalizeCardArgs,
  normalizePlacementArgs,
  normalizePlacementTopperArgs,
  openAiReasoningEffort,
  openAiRequestSettings,
  placementCloseBank,
  repairCard,
  repairPlacementTopper,
  reviewPairSources
};
