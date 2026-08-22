// Surface router for the editorial voice pipeline. Mechanical lint always
// runs before an LLM judge, and each judge receives only its owned shape.

const { lintLongformArticle } = require("./lint-article-voice.js");
const { lintArticle: lintPlacementArticle } = require("./lint-placement-voice.js");
const { judgeLongformArticle } = require("./judge-article-voice.js");
const { judgeArticle: judgePlacementArticle, TIER_OF } = require("./judge-placement-voice.js");

const LONGFORM_SURFACE = "sky-article-longform";
const PLACEMENT_SURFACE = "sky-placement";

const LONGFORM_CONTENT_KEY_PATTERNS = [
  /^sky-article-template\//,
  /^sky\/article-template\//,
  /^sky-article\//,
  /^nodes-article\//,
  /^authored\/sky-nodes\//
];
const PLACEMENT_CONTENT_KEY_PATTERN = /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn|moves)\//;

function surfaceForContentKey(contentKey) {
  const key = String(contentKey || "").trim().toLowerCase();
  if (LONGFORM_CONTENT_KEY_PATTERNS.some((pattern) => pattern.test(key))) return LONGFORM_SURFACE;
  if (PLACEMENT_CONTENT_KEY_PATTERN.test(key)) return PLACEMENT_SURFACE;
  return null;
}

function resolveSurface({ surface, contentKey } = {}) {
  const explicit = String(surface || "").trim().toLowerCase();
  const inferred = surfaceForContentKey(contentKey);
  if (explicit) {
    if (explicit !== LONGFORM_SURFACE && explicit !== PLACEMENT_SURFACE) {
      throw new Error(`Unsupported voice-QA surface '${explicit}'.`);
    }
    if (inferred && inferred !== explicit) {
      throw new Error(`Voice-QA surface '${explicit}' conflicts with content key '${contentKey}' (${inferred}).`);
    }
    return explicit;
  }
  if (inferred) return inferred;
  throw new Error("Unsupported voice-QA surface.");
}

function lintGate(lint) {
  return lint.score === 3 ? null : lint.score === 2 ? "human-review" : "regenerate";
}

async function runEditorialVoiceQa(input, options = {}) {
  const surface = resolveSurface(input);
  const withJudge = options.withJudge !== false;

  if (surface === LONGFORM_SURFACE) {
    if (typeof input.articleText !== "string") {
      throw new TypeError("sky-article-longform requires articleText and never accepts a placement trio.");
    }
    const lint = lintLongformArticle(input.articleText, { ownerVerbatim: options.ownerVerbatim });
    const blockedGate = lintGate(lint);
    if (blockedGate || !withJudge) {
      return { surface, lint, judge: null, gate: blockedGate || "lint-clean" };
    }
    const judge = await judgeLongformArticle(input.articleText, {
      planet: input.planet,
      edition: input.edition,
      samples: options.samples,
      judgeFn: options.judgeFn
    });
    return { surface, lint, judge, gate: judge.gate };
  }

  if (!input.article || typeof input.article !== "object" || Array.isArray(input.article)) {
    throw new TypeError("sky-placement requires an article {hook, lived, turn} trio and never accepts long-form text.");
  }
  const article = { ...input.article, planet: input.planet || input.article.planet };
  const lint = lintPlacementArticle(article);
  const blockedGate = lintGate(lint);
  if (blockedGate || !withJudge) {
    return { surface, lint, judge: null, gate: blockedGate || "lint-clean" };
  }
  const planet = String(input.planet || article.planet || "").toLowerCase();
  const judge = await judgePlacementArticle(article, {
    planet,
    sign: input.sign || article.sign,
    tier: input.tier || TIER_OF[planet],
    samples: options.samples,
    judgeFn: options.judgeFn
  });
  return { surface, lint, judge, gate: judge.gate };
}

module.exports = {
  LONGFORM_SURFACE,
  PLACEMENT_SURFACE,
  LONGFORM_CONTENT_KEY_PATTERNS,
  PLACEMENT_CONTENT_KEY_PATTERN,
  surfaceForContentKey,
  resolveSurface,
  runEditorialVoiceQa
};
