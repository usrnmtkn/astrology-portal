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

const TITLE = { sun:"Sun", moon:"Moon", mercury:"Mercury", venus:"Venus", mars:"Mars", jupiter:"Jupiter", saturn:"Saturn", uranus:"Uranus", neptune:"Neptune", pluto:"Pluto", chiron:"Chiron" };
const PLANET_ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const SIGNS = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
const UNSOURCED_POINTS = new Set(["chiron", "lilith", "black-moon-lilith", "north-node", "south-node", "true-node", "node"]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// aspect -> which data/pairs field carries its meaning
const ASPECT_FIELD = { conjunction:"blend", sextile:"harmonious", trine:"harmonious", square:"hard", opposition:"hard" };

// element of a planet or sign, from the metaphor guidance in the spec
function elementOf(token) {
  const em = spec.metaphorGuidance.elementMatch;
  for (const [el, members] of Object.entries(em)) if (members.includes(token)) return el;
  return null;
}

function loadPair(pairKey) {
  const p = path.join(root, "data", "pairs", `${pairKey}.json`);
  if (!fs.existsSync(p)) return null;
  return { path: p, value: readJson(p) };
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

function normalizeCardArgs({ a, b, aspect, signA, signB }) {
  const first = normalizeToken(a);
  const second = normalizeToken(b);
  const normalizedAspect = normalizeToken(aspect);
  const firstSign = normalizeToken(signA);
  const secondSign = normalizeToken(signB);

  if (!ASPECT_FIELD[normalizedAspect]) {
    throw new SourceGapError("unsupported-aspect", `Unsupported sky aspect '${aspect}'.`, { aspect: normalizedAspect });
  }

  if (!SIGNS.has(firstSign) || !SIGNS.has(secondSign)) {
    throw new SourceGapError("invalid-sign", "Both sky-aspect signs must be zodiac signs.", { signA: firstSign, signB: secondSign });
  }

  if (new Set([first, second]).size === 2 && [first, second].includes("sun") && [first, second].includes("chiron")) {
    throw new SourceGapError(
      "source-review-required",
      "data/pairs/sun-chiron.json is a draft stub and requires owner review before generation.",
      { a: first, b: second, pairKey: "sun-chiron" }
    );
  }

  if (UNSOURCED_POINTS.has(first) || UNSOURCED_POINTS.has(second)) {
    throw new SourceGapError(
      "missing-source",
      `No approved pair meaning exists for ${first}-${second}; author the meaning before generation.`,
      { a: first, b: second }
    );
  }

  const firstOrder = PLANET_ORDER.indexOf(first);
  const secondOrder = PLANET_ORDER.indexOf(second);

  if (firstOrder < 0 || secondOrder < 0 || first === second) {
    throw new SourceGapError("missing-source", `No source-backed pair is available for ${first}-${second}.`, { a: first, b: second });
  }

  const reversed = firstOrder > secondOrder;
  const normalized = reversed
    ? { a: second, b: first, aspect: normalizedAspect, signA: secondSign, signB: firstSign }
    : { a: first, b: second, aspect: normalizedAspect, signA: firstSign, signB: secondSign };
  const pairKey = `${normalized.a}-${normalized.b}`;
  const pair = loadPair(pairKey);

  if (!pair) {
    throw new SourceGapError(
      "missing-source",
      `No data/pairs/${pairKey}.json source exists; author the meaning before generation.`,
      { ...normalized, pairKey }
    );
  }

  // This is the one explicitly documented stub. Its existence on disk is not
  // approval to generate or serve it.
  if (pairKey === "sun-chiron" || /\bSTUB\b/i.test(JSON.stringify(pair.value.provenance ?? {}))) {
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

function closeFewShot() {
  return [
    [
      `PRE-CLOSE APHORISM`,
      `BEFORE: ...Being unique is real currency, but chasing shock value empties it fast. True originality lasts. The performance burns out quick.`,
      `AFTER: ...The room rewards the version of us that's just strange enough. Standing out is real currency. Spend it on shock and it empties by morning.`
    ].join("\n"),
    [
      `PRE-CLOSE APHORISM`,
      `BEFORE: ...Luck comes on strong, but so does the urge to test it past reason. Optimism makes big things possible. It also makes a fall feel like it shouldn't happen at all.`,
      `AFTER: ...The right doors keep opening on the first push. Luck comes on strong. It never stays long enough to cover a bet made on the strength of it.`
    ].join("\n"),
    [
      `EXAMPLE BEAT`,
      `BEFORE: someone pitches a wild idea and the group actually listens, a friend's big-hearted gesture lands softer than expected, the plan for tonight slides into a dreamier version before anyone objects`,
      `AFTER: a wild pitch that suddenly has the room, a kindness that lands softer than usual, tonight's plan drifting toward the dreamier version`
    ].join("\n"),
    [
      `KEEP AS THE MODEL`,
      `EXAMPLE BEAT: a message left on read, a plan changed mid-sentence, the extra shift agreed to before anyone knows why`,
      `CLOSE: The urge is real. The timing is not.`
    ].join("\n")
  ];
}

function buildPrompt({ a, b, aspect, signA, signB }) {
  const normalized = normalizeCardArgs({ a, b, aspect, signA, signB });
  const { pair } = normalized;
  const field = ASPECT_FIELD[normalized.aspect];
  const meaning = { blend: pair.blend, active: pair[field], harmonious: pair.harmonious, hard: pair.hard, traditional: pair.traditional };
  const elements = [normalized.a, normalized.b, normalized.signA, normalized.signB].map((t) => `${cap(t)}=${elementOf(t) || "-"}`).join(", ");
  const failList = [...spec.outputBans.fail.map((x) => x.term)].join(", ");

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
    `  - End on one plain truth and the catch that turns on it. The sentence before that pair stays concrete narration.`,
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
    `CLOSE + EXAMPLE-BEAT DEMONSTRATIONS (imitate the AFTER shape):`,
    ...closeFewShot().map((b, i) => `  [${i + 1}] ${b}`),
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

function generationConfig() {
  loadLocalEnv();
  const requested = (
    process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT
    || process.env.CONTENT_GENERATION_PROVIDER
    || "openai"
  ).trim().toLowerCase();
  const provider = requested === "anthropic" ? "claude" : requested;

  if (provider === "claude") {
    return {
      provider,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      apiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0.7
    };
  }

  if (provider === "openai") {
    return {
      provider,
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7
    };
  }

  throw new Error(`Unsupported CONTENT_GENERATION_PROVIDER_SKY_ASPECT '${requested}'. Use 'openai' or 'claude'.`);
}

function openAiOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n");
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

function buildTrimClosePrompt(text) {
  return [
    `Here is a finished card. If its final paragraph ends with TWO general maxims in a row (a summarizing lesson, then another lesson), delete the FIRST of the two so the card ends on a single truth and the catch that turns on it. Change nothing else - do not reword, do not add. If the card already ends on one truth and its catch, return it byte-for-byte unchanged. Return only the card.`,
    ``,
    `EXAMPLE`,
    `BEFORE: The room finally clocks the change. Being unique is real currency, but chasing shock value empties it fast. True originality lasts. The performance burns out quick.`,
    `AFTER: The room finally clocks the change. Being unique is real currency, but chasing shock value empties it fast. The performance burns out quick.`,
    ``,
    `CARD`,
    text
  ].join("\n");
}

function validateTrimCandidate(original, candidate) {
  const cleanedCandidate = cleanCardText(candidate);

  if (cleanedCandidate === original) {
    return { text: original, fired: false, rejected: false, deleted: null };
  }

  const segments = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(original)];
  const firstEligible = Math.max(0, segments.length - 4);

  for (let index = firstEligible; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const deleted = cleanCardText(
      `${original.slice(0, segment.index)}${original.slice(segment.index + segment.segment.length)}`
    );

    if (cleanedCandidate === deleted) {
      return {
        text: deleted,
        fired: true,
        rejected: false,
        deleted: segment.segment.trim()
      };
    }
  }

  return {
    text: original,
    fired: false,
    rejected: true,
    deleted: null
  };
}

// Must return the poetic card body only. Facts such as dates, degrees, series,
// and mechanics are deliberately not accepted here.
async function generate(prompt, { temperature } = {}) {
  const config = generationConfig();
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
      temperature: temp,
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

async function trimClose(text, { generateFn = generate } = {}) {
  const candidate = await generateFn(buildTrimClosePrompt(text), { temperature: 0.1 });
  return validateTrimCandidate(text, candidate);
}

async function generateCard(args, {
  maxRetries = 3,
  generateFn = generate,
  trimCloseFn,
  withJudge = false,
  judgeFn,
  judgeFeedback
} = {}) {
  let normalized;

  try {
    normalized = normalizeCardArgs(args);
  } catch (error) {
    if (error instanceof SourceGapError) {
      return { status: "skipped", reason: error.code, note: error.message, facts: error.details };
    }
    throw error;
  }

  let prompt = buildPrompt(normalized);
  if (judgeFeedback) {
    prompt = `${prompt}\n\nThe previous draft reached the editorial judge but was rejected. Rewrite from scratch while fixing this feedback: ${judgeFeedback}`;
  }
  let lastAttempt = null;
  const trimStats = {
    calls: 0,
    fired: 0,
    unchanged: 0,
    rejected: 0,
    errors: 0
  };
  const shouldTrimClose = generateFn === generate || typeof trimCloseFn === "function";
  const runTrimClose = trimCloseFn ?? trimClose;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const generatedText = await generateFn(prompt);
    let text = generatedText;

    if (shouldTrimClose) {
      trimStats.calls += 1;
      try {
        const outcome = await runTrimClose(generatedText);
        const outcomeIsObject = outcome && typeof outcome === "object" && "text" in outcome;
        const validated = outcomeIsObject
          ? validateTrimCandidate(generatedText, outcome.text)
          : validateTrimCandidate(generatedText, outcome);
        if (outcomeIsObject && outcome.rejected && !validated.fired) {
          validated.rejected = true;
        }
        text = validated.text;
        if (validated.fired) trimStats.fired += 1;
        else if (validated.rejected) trimStats.rejected += 1;
        else trimStats.unchanged += 1;
      } catch {
        trimStats.errors += 1;
      }
    }

    const lint = lintCard(text);
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
        trimClose: { ...trimStats },
        facts: {
          a: normalized.a,
          b: normalized.b,
          aspect: normalized.aspect,
          signA: normalized.signA,
          signB: normalized.signB,
          pairKey: normalized.pairKey,
          pairSource: normalized.pairSource
        }
      };
      // Second gate: the LLM judge. Opt-in so the caller controls the extra
      // model call. Attaches { judge, gate } for the cron to persist and route.
      // lazy require avoids a circular dependency (judge reuses generate()).
      if (withJudge) {
        const { judgeCard, TIER_OF } = require("./judge-sky-voice.js");
        const tier = TIER_OF[normalized.a] ?? "luminary";
        result.judge = await judgeCard(text, { tier, judgeFn });
        result.gate = result.judge.gate; // auto-publish | human-review | regenerate
      }
      return result;
    }
    // feed the failures back and retry
    const problems = lint.findings.map((f) => `${f.severity}: "${f.match || f.term}" (${f.reason || ""})`).join("; ");
    prompt = `${prompt}\n\nYour last attempt failed the voice check: ${problems}. Rewrite it fixing exactly those, keeping the meaning and the 8 beats.`;
  }
  const config = generateFn === generate ? generationConfig() : null;
  return {
    status: "needs-review",
    note: "did not pass the linter within retries",
    attempts: maxRetries,
    provider: config?.provider ?? "test",
    model: config?.model ?? "injected",
    temperature: config?.temperature ?? null,
    trimClose: { ...trimStats },
    text: lastAttempt?.text ?? "",
    lint: lastAttempt?.lint ?? null,
    facts: {
      a: normalized.a,
      b: normalized.b,
      aspect: normalized.aspect,
      signA: normalized.signA,
      signB: normalized.signB,
      pairKey: normalized.pairKey,
      pairSource: normalized.pairSource
    }
  };
}

// ---- CLI ----
if (require.main === module) {
  const [mode, pairKey, aspect, signA, signB] = process.argv.slice(2);
  if (!pairKey || !aspect || !signA || !signB) {
    console.error("usage: --dry-run|--run <a-b> <aspect> <signA> <signB>");
    process.exit(1);
  }
  const [a, b] = pairKey.split("-");
  if (mode === "--dry-run") {
    try {
      console.log(buildPrompt({ a, b, aspect, signA, signB }));
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
    console.error("first arg must be --dry-run or --run");
    process.exit(1);
  }
}

module.exports = {
  ASPECT_FIELD,
  SourceGapError,
  buildPrompt,
  buildTrimClosePrompt,
  generate,
  generateCard,
  generationConfig,
  normalizeCardArgs,
  trimClose,
  validateTrimCandidate
};
