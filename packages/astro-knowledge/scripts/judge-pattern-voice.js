#!/usr/bin/env node
//
// LLM-as-judge for the natal aspect-pattern reader: the second gate, after
// scripts/lint-pattern-voice.js. Sibling of scripts/judge-sky-voice.js.
//
// The linter enforces the mechanical floor (bans, second person, geometry kept
// out of Level 1, over-section / duplicate-beat shape). This judge scores what
// a regex cannot: does it read as ONE lived paragraph plus a tight mechanics
// pass (not a pile of restatements), does it stay in the second person and true
// to the geometry, does it keep the apex / balancing point to one mention each,
// does it avoid moralizing. Model verdicts are advisory; only an exact
// approved-gold match may bypass human review.
//
//   node scripts/judge-pattern-voice.js --dry-run "<card text>"

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const pat = readJson(path.join(root, "voice", "tldr-astro", "pattern-aspect.json"));
const examples = readJson(path.join(root, "voice", "tldr-astro", "pattern-examples.json"));

// apex/focal planet -> tier, so a card is judged against its OWN register: a
// slow-outer apex (Saturn/Pluto) is legitimately weightier than a fast one.
const TIER_OF = {
  sun: "luminary", moon: "luminary",
  mercury: "personal", venus: "personal", mars: "personal",
  jupiter: "outer", saturn: "outer", uranus: "outer", neptune: "outer", pluto: "outer", chiron: "outer",
};
const TIER_HINT = {
  luminary: "the apex is a luminary; the returning question is immediate and personal - concrete, close to daily life.",
  personal: "the apex is a personal planet; the returning question is a fast, personal pull - concrete and immediate.",
  outer: "the apex is a slow outer planet; the accommodation is structural and long-running. It is LEGITIMATELY weightier and less about a single day - judge it against its own register.",
  figure: "there is no single apex (Grand Cross / Grand Trine / Mystic Rectangle); judge it as a whole-figure read where no one planet is the release.",
};

const L1_SECTION_IDS = new Set(["feel", "shows_up", "complicated", "another_response"]);
const L2_SECTION_IDS = new Set(["level_2", "how_it_works", "planet_roles", "watch_for", "reference_point"]);

function sectionMarker(section) {
  const id = String(section?.id || "section");
  const label = String(section?.title || id.replaceAll("_", " ")).trim().toUpperCase();
  if (L1_SECTION_IDS.has(id)) return `[LEVEL 1: ${label}]`;
  if (L2_SECTION_IDS.has(id)) return `[LEVEL 2: ${label}]`;
  if (id === "confidence_note") return `[READING NOTE]`;
  return `[SECTION: ${label}]`;
}

function serializePatternCard(card) {
  if (typeof card === "string") return card.trim();
  const content = card?.content || card || {};
  const blocks = [];
  if (content.overview) {
    blocks.push(`[LEVEL 1: OVERVIEW]\n${String(content.overview).trim()}`);
  }
  for (const section of content.sections || []) {
    if (!section?.body) continue;
    blocks.push(`${sectionMarker(section)}\n${String(section.body).trim()}`);
  }
  return blocks.join("\n\n").trim();
}

function exactGoldMatch(card) {
  const serialized = serializePatternCard(card);
  return examples.find((example) => (
    example.canonical
    && serializePatternCard(example.content || example.body) === serialized
  ));
}

// Gold from the same tier when available, else any canonical exemplar.
function goldStandard(tier, n = 2) {
  const all = examples.filter((e) => e.canonical);
  const same = tier ? all.filter((e) => (e.tier || "figure") === tier) : [];
  const pool = same.length >= n ? same : [...same, ...all.filter((e) => !same.includes(e))];
  return pool.slice(0, n).map((e) => serializePatternCard(e.content || e.body));
}

function tierForCard({ apexPlanet = "", focalPlanet = "", patternType = "" } = {}) {
  const key = String(apexPlanet || focalPlanet).toLowerCase();
  if (TIER_OF[key]) return TIER_OF[key];
  return "figure";
}

function buildJudgePrompt(card, { tier = "figure" } = {}) {
  const serializedCard = serializePatternCard(card);
  return [
    `You are the editor of a modern astrology app. You are strict. Most drafts are "borderline" until proven otherwise.`,
    ``,
    `The surface: the reader's OWN natal aspect pattern (Yod, T-square, Grand Cross, Grand Trine, Kite, Mystic Rectangle).`,
    `The voice: ${pat.voiceDescription}`,
    `Second person ("you", "your"), never "we/us/our". Two levels: a lived paragraph first (what it feels like, no mechanics), then a tight mechanics pass (the geometry, the apex or focal point, the balancing point once). It ends on a plain reading note, not a pep talk.`,
    `This card's register: ${TIER_HINT[tier] || tier}`,
    ``,
    `Score the card 1-3:`,
    `  3 = in voice. Level 1 reads as ONE lived paragraph; Level 2 is a tight mechanics pass; second person throughout; mechanics stay out of the lived paragraph; concrete and quotable. Level 2 may identify a planet as the apex in the geometry paragraph and then begin the distinct role paragraph "[Planet] is the apex..." before explaining what it carries. That required geometry-to-role handoff is not repetition.`,
    `  2 = borderline. Generally right but one clear flaw: a restated idea, a slightly generic line, a mechanics word ("apex", "sextile", "150 degrees") creeping into the lived paragraph, or a soft/among ending.`,
    `  1 = off voice. Restates one idea across several sentences or reads over-sectioned; drifts to "we" or a generic horoscope; names the geometry inside the lived paragraph; moralizes or life-coaches; states the balancing point or the apex role twice; or drifts from what the geometry supports.`,
    `  A card identical to one of the GOLD STANDARD examples is, by definition, a 3. Compare the input against the examples before scoring and do not downgrade an exact match.`,
    ``,
    `Judge hard on these, which regex cannot catch:`,
    `  - Level 1 restating the same dynamic more than once (the old sprawl).`,
    `  - The balancing point / reference direction stated in more than one section, or the apex's lived consequences repeated in two role sections. Naming the apex in the geometry and then beginning ONE distinct role section "[Planet] is the apex..." is the required shape and MUST NOT be penalized as repetition.`,
    `  - Mechanics ("apex", "quincunx", "150 degrees", "opposition") leaking into the lived paragraph.`,
    `  - Moralizing or life-coaching ("the lesson is", "remember to", telling the reader what to do).`,
    `  - Drifting out of the second person, or sounding like a generic horoscope rather than these examples.`,
    `  - Use the explicit [LEVEL 1: ...] and [LEVEL 2: ...] markers as authoritative boundaries. Mechanics are a leak only when they occur inside a marked Level 1 block. Mechanics inside a marked Level 2 block are required and must not be penalized.`,
    ``,
    `GOLD STANDARD for this register (these are 3s):`,
    ...goldStandard(tier).map((b, i) => `  [${i + 1}] ${b}`),
    ``,
    `CARD TO SCORE:`,
    serializedCard,
    ``,
    `Return ONLY strict JSON: {"score": 1|2|3, "verdict": "in-voice"|"borderline"|"off-voice", "weakest": "the single weakest sentence, quoted", "why": "one short reason"}`,
  ].filter(Boolean).join("\n");
}

const { editorialGate } = require("./editorial-judge-policy.js");
const { runJudgeSamples, sha256 } = require("./editorial-judge-runtime.js");
const JUDGE_TEMPERATURE = 0.1;

function parseVerdict(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return { score: 1, verdict: "off-voice", why: "judge did not return JSON" };
  try { return JSON.parse(m[0]); } catch { return { score: 1, verdict: "off-voice", why: "unparseable judge output" }; }
}

async function judgeCard(card, opts = {}) {
  const tier = opts.tier || tierForCard(opts);
  const matchedGold = exactGoldMatch(card);
  if (matchedGold) {
    const policy = editorialGate({ score: 3, exactApprovedGold: true });
    return {
      score: 3,
      verdict: "in-voice",
      weakest: "",
      why: `Exact canonical gold match: ${matchedGold.sourceId}.`,
      samples: 0,
      tier,
      exactGold: true,
      ...policy,
      audit: {
        schemaVersion: 1,
        recordedAt: new Date().toISOString(),
        promptVersion: "not-applicable-exact-approved-match",
        rubricVersion: "pattern-aspect-approved-gold-v1",
        promptSha256: null,
        rubricSha256: sha256(JSON.stringify(pat)),
        contentSha256: sha256(serializePatternCard(card)),
        provider: "none",
        model: "approved-exact-match",
        releaseId: "approved-exact-match",
        registryVersion: null,
        registryLaneId: null,
        registryState: null,
        registryOverride: false,
        evaluationSetVersion: "pattern-aspect-approved-gold-v1",
        policyVersion: "editorial-judge-policy-v1",
        temperature: null,
        samples: 0,
        scores: [3],
        verdicts: [],
        disagreement: false,
        privacyMode: "not-sent",
        redactionCount: 0,
        context: { surface: "natal-pattern", tier, sourceId: matchedGold.sourceId }
      }
    };
  }
  const prompt = buildJudgePrompt(card, { tier });
  const result = await runJudgeSamples({
    content: serializePatternCard(card),
    prompt,
    rubric: JSON.stringify(pat),
    rubricVersion: "pattern-aspect-voice-v1",
    samples: opts.samples,
    temperature: JUDGE_TEMPERATURE,
    judgeFn: opts.judgeFn,
    parseVerdict,
    context: { surface: "natal-pattern", tier },
    calibration: Boolean(opts.calibration)
  });
  return { ...result, tier, ...editorialGate(result) };
}

module.exports = {
  buildJudgePrompt,
  exactGoldMatch,
  judgeCard,
  parseVerdict,
  serializePatternCard,
  tierForCard,
  TIER_OF
};

if (require.main === module) {
  const [mode, ...rest] = process.argv.slice(2);
  const card = rest.join(" ");
  if (mode === "--dry-run" && card) console.log(buildJudgePrompt(card, { tier: "figure" }));
  else { console.error('usage: --dry-run "<card text>"'); process.exit(1); }
}
