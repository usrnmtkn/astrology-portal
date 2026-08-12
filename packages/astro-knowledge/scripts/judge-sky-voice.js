#!/usr/bin/env node
//
// LLM-as-judge: the second gate, after scripts/lint-sky-voice.js.
//
// The linter enforces the mechanical floor (banned words, shape, register).
// This judge scores the things a regex cannot: does it sound like a person,
// does it stay true to the source, does it overreach or moralize, does it land
// one clean close, does it match the planet tier. It returns a 1-3 verdict so
// the pipeline can prioritize review. The model is advisory and cannot publish
// without a separate human approval.
//
// `judge()` is a seam - wire it to the app's model (reuse the provider config
// in generate-sky-aspect-cards.js). Until then, --dry-run prints the prompt.
//
//   node scripts/judge-sky-voice.js --dry-run "<card text>"

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sky = readJson(path.join(root, "voice", "tldr-astro", "sky-aspect.json"));
const examples = readJson(path.join(root, "voice", "tldr-astro", "examples.json"));
const { plainLanguageJudgeLines } = require("./plain-language-defects.js");
const PLACEMENT_MODE = "collective-placement-card";
const PLACEMENT_TOPPER_MODE = "collective-placement-topper";
const PLACEMENT_WITH_TOPPER_MODE = "collective-placement-with-topper";
const SKY_PROMPT_VERSION = "sky-aspect-voice-v1:prompt-plain-language-v2";

// planet -> tier, matching how exemplars are tagged. The judge must compare a
// card against its OWN register: an outer/generational card judged against fast
// daily Sun cards gets wrongly dinged for being sweeping.
const TIER_OF = {
  sun: "luminary", moon: "luminary",
  mercury: "personal", venus: "personal", mars: "personal",
  jupiter: "outer", saturn: "outer", uranus: "outer", neptune: "outer", pluto: "outer", chiron: "outer",
};
const TIER_HINT = {
  luminary: "a fast, personal-collective mood over a day or a week; concrete and immediate.",
  personal: "a fast, personal-collective pull around the mind, worth, or drive; concrete and immediate.",
  outer: "a slow, generational, world-scale shift. It is LEGITIMATELY more sweeping and less about a single day. Do NOT penalize it for not sounding like a fast daily card - judge it against its own register.",
};
const SELF_REDUCTION_FAMILIES = [
  ["self_negotiation", "accepting less before anyone has responded"],
  ["softened_conviction", "weakening how clearly someone speaks"],
  ["downplayed_desire", "pretending a desire or need matters less"],
  ["reduced_ambition", "disguising power, drive, or aspiration"],
  ["avoidance_disguised_as_caution", "giving fear a more respectable name"],
];
const PLACEMENT_TIER_OF = {
  sun: "luminary", moon: "luminary",
  mercury: "personal", venus: "personal", mars: "personal",
  jupiter: "outer", saturn: "outer", uranus: "outer", neptune: "outer", pluto: "outer",
  chiron: "point", "north-node": "point", "south-node": "point", lilith: "point",
};
const PLACEMENT_TIER_HINT = {
  luminary: "a collective mood or season. State the pace plainly, keep it immediate, and judge it against the approved luminary placements.",
  personal: "a collective chapter around mind, desire, or drive. It should be concrete, modern, and sign-specific.",
  outer: "a slow public or generational chapter. It is legitimately sweeping, but it must still stay concrete and sign-specific.",
  point: "a generational tender spot, direction, release pattern, or refusal. For Chiron, wound then medicine is the approved two-part shape; it is slower and heavier than a planet, so do not penalize that shape.",
};

// Gold-standard exemplars from the SAME tier as the card being judged, so the
// judge scores like-to-like. Falls back to any exemplar if the tier is thin.
function goldStandard(tier, n = 2, mode = "collective-aspect-card") {
  if (mode === PLACEMENT_WITH_TOPPER_MODE) {
    return examples
      .filter((entry) => (
        entry.surface === "sky"
        && entry.mode === PLACEMENT_TOPPER_MODE
        && entry.canonical
      ))
      .flatMap((topper) => {
        const base = examples.find((entry) => (
          entry.surface === "sky"
          && entry.mode === PLACEMENT_MODE
          && entry.sourceId === topper.baseSourceId
          && entry.canonical
        ));

        return base ? [`${topper.body}\n\n${base.body}`] : [];
      })
      .slice(0, n);
  }

  const all = examples.filter((e) => e.surface === "sky" && e.mode === mode && e.canonical);
  const same = tier ? all.filter((e) => (e.tier || "luminary") === tier) : [];
  const pool = same.length >= n ? same : [...same, ...all.filter((e) => !same.includes(e))];
  return pool.slice(0, n).map((e) => e.body);
}

// The rubric the judge scores against. Concrete failure modes come from real
// weak drafts, so the judge knows exactly what to catch.
function buildJudgePrompt(card, options = {}) {
  const { tier = "", mode = "collective-aspect-card", foundationLines = [] } = options;
  const placement = mode === PLACEMENT_MODE || mode === PLACEMENT_WITH_TOPPER_MODE;
  const placementWithTopper = mode === PLACEMENT_WITH_TOPPER_MODE;
  const tierHint = placement ? PLACEMENT_TIER_HINT[tier] : TIER_HINT[tier];
  const voiceDescription = placement
    ? sky.voiceDescription.replace(
        "Collective and third-person (never 'you')",
        "Collective in the body; impersonal second person may appear only in the final truth-and-catch pair"
      )
    : sky.voiceDescription;
  const suppliedFoundationLines = (foundationLines || []).map((line) => ({
    sourceArticleId: line.sourceArticleId,
    line: line.suppliedLine || line.originalLine
  }));

  return [
    `You are the editor of a modern astrology app. You are strict. Most drafts are "borderline" until proven otherwise.`,
    ``,
    `The voice: ${voiceDescription}`,
    placementWithTopper
      ? `This is a CURRENT-ASPECT TOPPER followed by an unchanged EVERGREEN COLLECTIVE PLACEMENT base. The first paragraph must name one live contact in collective "we" voice; the two base paragraphs keep their approved placement register. Judge the three-paragraph combination as one card.`
      : placement
        ? `This is an EVERGREEN COLLECTIVE PLACEMENT card, not a natal reading or live aspect report. Use "we" in the body; impersonal "you" is allowed only in the final truth-and-catch pair. Exactly two short paragraphs.`
      : `Collective first-person "we", never "you". Two short paragraphs. It ends on ONE quotable pair of lines.`,
    tier ? `This card's register is ${tierHint || tier}` : ``,
    ``,
    `Score the card 1-3:`,
    `  3 = in voice. Sounds spoken; every sentence could stand alone; concrete and modern; lands one clean close; true to the ${placement ? "placement source" : "aspect"}; no overreach.`,
    `  2 = borderline. Generally right but has one clear flaw: an extra aphorism before the close, a slightly generic line, a soft ending, or a mild reach.`,
    `  1 = off voice. Reads generic or written; invents scenarios not supported by the ${placement ? "placement" : "aspect"}; moralizes or preaches; stacks endings; names the astrology mechanics; or drifts from the source meaning.`,
    ``,
    `Judge hard on these, which regex cannot catch:`,
    ...plainLanguageJudgeLines().map((rule) => `  - ${rule}`),
    `  - Overreach / invented specifics the ${placement ? "placement source" : "aspect"} does not support.`,
    `  - Moralizing or life-coaching ("the lesson is", "remember to", telling people what to do).`,
    `  - More than one closing aphorism (the ending must be a single truth + its catch).`,
    `  - Naming the mechanics or elements ("this trine", "fire meets water").`,
    ...(placement
      ? [
          `  - Failing to state the pace, or writing a generic sign swap that is not specific to this planet-in-sign.`,
          `  - Natal second-person framing anywhere before the final truth-and-catch pair.`,
          placementWithTopper
            ? `  - A topper that does not clearly connect the named live aspect to this placement's specific theme, or that repeats the base instead of framing it.`
            : `  - Treating the evergreen base like a live transit announcement or adding a current-sky topper.`
        ]
      : []),
    ...(!placement && suppliedFoundationLines.length
      ? [
          `  - The card's turn toward the reader must trace to the supplied owner foundation lines when present. An invented permission or reassurance line in place of the supplied material scores 2; a card with no turn toward the reader at all, when foundation lines were supplied, scores 2. Verbatim or near-verbatim use of a supplied owner line is never penalized as copying - it is the owner's own writing.`
        ]
      : []),
    `  - Sounding like a generic horoscope rather than these examples.`,
    `  - Adjacent-voice recognizability: flag phrasing that matches the CC/SD/AC construction families in voice/banned-constructions.json. AC timing devices may be adapted structurally, but theatrical titles and dense stacked metaphor stay out. Shared astrological knowledge and terminology are never flagged: Dragon's Head/Tail, decans, dignities, cazimi, and the tradition's vocabulary are common to astrologers. Owner-verbatim text is exempt.`,
    ...require("./owner-corpus-warmth-policy.js").judgePolicyLines(options).map((rule) => `  - ${rule}`),
    `  - Vague shrink/shrinking shorthand for self-reduction. If that behavior appears, identify the precise family and score generic shorthand no higher than 2:`,
    ...SELF_REDUCTION_FAMILIES.map(([key, meaning]) => `      ${key} = ${meaning}.`),
    `    These are not synonyms. Do not collapse them into one generic diagnosis.`,
    ``,
    `GOLD STANDARD for this register (these are 3s):`,
    ...goldStandard(tier, 2, mode).map((b, i) => `  [${i + 1}] ${b}`),
    ``,
    `CARD TO SCORE:`,
    card,
    ...(!placement && suppliedFoundationLines.length
      ? [``, `SUPPLIED OWNER FOUNDATION LINES:`, JSON.stringify(suppliedFoundationLines, null, 2)]
      : []),
    ``,
    `Return ONLY strict JSON: {"score": 1|2|3, "verdict": "in-voice"|"borderline"|"off-voice", "weakest": "the single weakest sentence, quoted", "why": "one short reason"}`,
  ].filter(Boolean).join("\n");
}

const { judgeConfig: configuredJudge } = require("./generate-sky-aspect-cards.js");
const { editorialGate } = require("./editorial-judge-policy.js");
const { runJudgeSamples } = require("./editorial-judge-runtime.js");
// The judge runs COLD (low temperature). Judging wants determinism, not the
// creative 0.7 the generator uses; at 0.7 the same card scores differently
// across runs, which is why calibration kept shifting.
const JUDGE_TEMPERATURE = 0.1;

function judgeConfig() {
  const config = configuredJudge("sky-aspect");

  return {
    provider: config.provider,
    model: config.model,
    temperature: JUDGE_TEMPERATURE,
    releaseId: config.releaseId,
    registryVersion: config.registryVersion,
    laneId: config.laneId,
    registryOverride: config.registryOverride
  };
}

function parseVerdict(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return { score: 1, verdict: "off-voice", why: "judge did not return JSON" };
  try { return JSON.parse(m[0]); } catch { return { score: 1, verdict: "off-voice", why: "unparseable judge output" }; }
}

// samples > 1 runs the judge N times and takes the median score (self-consistency).
// Default 1 is cheap for production; calibration uses 3 for a stable read.
async function judgeCard(card, opts = {}) {
  const prompt = buildJudgePrompt(card, opts);
  const result = await runJudgeSamples({
    content: card,
    prompt,
    promptVersion: SKY_PROMPT_VERSION,
    rubric: JSON.stringify({
      voiceDescription: sky.voiceDescription,
      mode: opts.mode || "collective-aspect-card",
      tier: opts.tier || "",
      foundationLines: (opts.foundationLines || []).map((line) => ({ sourceArticleId: line.sourceArticleId, line: line.suppliedLine || line.originalLine }))
    }),
    rubricVersion: "sky-aspect-voice-v2-owner-warmth",
    samples: opts.samples,
    temperature: JUDGE_TEMPERATURE,
    judgeFn: opts.judgeFn,
    parseVerdict,
    context: { surface: "sky-aspect", mode: opts.mode || "collective-aspect-card", tier: opts.tier || "" },
    calibration: Boolean(opts.calibration)
  });
  return { ...result, ...editorialGate(result) };
}

module.exports = {
  buildJudgePrompt,
  goldStandard,
  judgeConfig,
  judgeCard,
  parseVerdict,
  PLACEMENT_TIER_OF,
  SKY_PROMPT_VERSION,
  TIER_OF
};

if (require.main === module) {
  const [mode, ...rest] = process.argv.slice(2);
  const card = rest.join(" ");
  if (mode === "--dry-run" && card) console.log(buildJudgePrompt(card));
  else { console.error('usage: --dry-run "<card text>"'); process.exit(1); }
}
