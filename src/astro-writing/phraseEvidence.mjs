import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PHRASE_EVIDENCE_VERSION = "owner-phrase-evidence-v1-2026-08-14";
export const MIN_AVAILABLE_PHRASES = 5;
export const MAX_AVAILABLE_PHRASES = 10;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultIndexPath = path.join(repoRoot, "data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl");

const THEME_KEYWORDS = Object.freeze({
  "boundaries-energy-protection": ["boundary", "boundaries", "available", "availability", "crisis", "drain", "drained", "peace", "protect", "refuse", "saying no", "time"],
  "credit-ownership-creative-theft": ["credit", "ownership", "stolen", "steal", "blueprint", "collaboration", "collab", "work", "recognition", "contribution"],
  "authenticity-self-expression": ["authentic", "expression", "self-expression", "voice", "seen", "visibility", "dimming", "difference", "believe", "preference"],
  "self-worth-personal-power": ["worth", "power", "ability", "burnout", "prove", "responsibility", "overwork", "needed", "indispensable"],
  "empathy-emotional-labor": ["emotional", "help", "holding", "organizer", "support", "tired", "weight", "burden", "responsibility", "follow-up", "follow up"],
  "family-roles-accountability-patterns": ["family", "parent", "sibling", "blood", "roots", "pattern", "accountability", "role"],
  "family-chaos-career-livelihood-boundaries": ["family", "job", "career", "livelihood", "bills", "stability", "future", "emergency"],
  strategy: ["strategy", "plan", "decision", "timing", "momentum", "capacity", "resources", "choice", "follow-up", "follow up", "cost"],
  "retrograde-review": ["review", "retrograde", "pause", "old choice", "commitment", "outgrown", "habit", "slow down", "reconsider", "renegotiate"],
  "financial-growth-security": ["money", "financial", "expense", "investment", "dollar", "cost", "keeping more", "security", "value"],
  "self-worth-earning-power": ["pay", "paid", "rate", "earning", "wealth", "discount", "afford", "bargain", "worth"],
  "career-business-boundaries": ["team", "on call", "business", "career", "work", "collaboration", "carrying", "responsibility"],
  "relationships-compromise": ["relationship", "relationships", "couple", "connection", "agreement", "compromise", "fair", "fairness", "choice together", "both sides", "argument", "preference", "adjusting"],
  health: ["health", "body", "stress", "caffeine", "willpower", "rest", "exhaustion"],
  "channeling-creativity": ["creativity", "creative", "create", "productivity", "space", "project"]
});

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function searchablePlan(plan = {}) {
  return [
    plan.object,
    plan.sign,
    plan.eventType,
    plan.coreTension,
    plan.core_tension,
    plan.objectFunction,
    plan.signMechanics,
    ...(plan.object_function ?? []),
    ...(plan.sign_mechanics ?? []),
    ...(plan.likelyObservableBehaviors ?? []),
    ...(plan.observable_behaviors ?? []),
    ...(plan.likelyConsequences ?? []),
    ...(plan.possible_consequences ?? []),
    ...(plan.risks ?? [])
  ].filter(Boolean).join(" ").toLowerCase();
}

function phraseText(entry) {
  return normalize([entry.text, ...(entry.subjectTags ?? []), ...(entry.failureTags ?? [])].join(" "));
}

const FOCUS_STOPWORDS = new Set([
  "about", "after", "again", "because", "becomes", "before", "being", "comes", "everyone",
  "feels", "first", "from", "into", "more", "other", "someone", "still", "their", "there",
  "these", "thing", "things", "through", "until", "what", "when", "where", "while", "with"
]);

export function matchedVoiceBankThemes(plan, entries = []) {
  const planText = searchablePlan(plan);
  return Object.entries(THEME_KEYWORDS)
    .map(([theme, keywords]) => ({ theme, score: keywords.filter((keyword) => planText.includes(keyword)).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme))
    .slice(0, 4)
    .map((entry) => entry.theme);
}

export function loadPhraseEvidenceIndex(filePath = defaultIndexPath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

export function selectPhraseEvidence(plan, entries = [], { minimum = MIN_AVAILABLE_PHRASES, maximum = MAX_AVAILABLE_PHRASES } = {}) {
  const matchedThemes = matchedVoiceBankThemes(plan, entries);
  const planText = searchablePlan(plan);
  const focusTokens = [...new Set(planText.match(/[a-z][a-z'-]+/gu) ?? [])]
    .filter((token) => token.length >= 4 && !FOCUS_STOPWORDS.has(token));
  const approved = entries.filter((entry) => (
    entry.role === "phrase"
    && entry.ownerApproved === true
    && entry.readerFacingOwnerMaterial === true
    && entry.excluded !== true
    && typeof entry.text === "string"
    && entry.text.trim()
    && entry.text.trim().split(/\s+/u).length <= 80
  ));
  const thematicCandidates = approved.filter((entry) => (entry.themes ?? []).some((theme) => matchedThemes.includes(theme)));
  const directHitCount = (entry) => focusTokens.filter((token) => normalize(entry.text).includes(token)).length;
  const primaryTheme = matchedThemes[0] ?? null;
  const primaryThemeHitCount = (entry) => (THEME_KEYWORDS[primaryTheme] ?? [])
    .filter((keyword) => normalize(entry.text).includes(keyword)).length;
  const candidates = thematicCandidates.filter((entry) => (
    ((entry.themes ?? []).includes(primaryTheme) && primaryThemeHitCount(entry) > 0)
    || ((normalize(entry.contentKey).includes(normalize(plan.sign)) || normalize(entry.contentKey).includes(normalize(plan.object))) && primaryThemeHitCount(entry) > 0)
  ));
  const ranked = candidates.map((entry, index) => {
    let score = entry.governanceTier === "owner-confirmed-verbatim" ? 40 : 20;
    score += (entry.themes ?? []).reduce((sum, theme) => {
      const rank = matchedThemes.indexOf(theme);
      return rank < 0 ? sum : sum + Math.max(10, 40 - rank * 10);
    }, 0);
    const directText = normalize(entry.text);
    const directHits = directHitCount(entry);
    score += directHits * 12;
    score += primaryThemeHitCount(entry) * 20;
    if (directHits === 0) score -= 35;
    if ((entry.subjectTags ?? []).includes(normalize(plan.sign))) score += 25;
    if ((entry.subjectTags ?? []).includes(normalize(plan.object))) score += 20;
    if (normalize(entry.contentKey).includes(normalize(plan.sign))) score += 25;
    if (normalize(entry.contentKey).includes(normalize(plan.object))) score += 20;
    if (entry.store === "voice-bank") score += 8;
    const wordCount = entry.text.trim().split(/\s+/u).length;
    if (wordCount > 80) score -= 80;
    else if (wordCount > 45) score -= 25;
    return { entry, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = [];
  const seen = new Set();
  for (const { entry } of ranked) {
    const dedupeKey = entry.copySha ?? normalize(entry.text);
    if (seen.has(dedupeKey)) continue;
    selected.push(entry);
    seen.add(dedupeKey);
    if (selected.length >= maximum) break;
  }
  return Object.freeze({
    version: PHRASE_EVIDENCE_VERSION,
    matchedThemes: Object.freeze(matchedThemes),
    themeMatched: matchedThemes.length > 0,
    approvedCandidateCount: candidates.length,
    selectedCount: selected.length,
    requestedRange: Object.freeze({ minimum, maximum }),
    shortfall: matchedThemes.length > 0 && selected.length < minimum,
    selected: Object.freeze(selected)
  });
}

export function phraseThemeKeywords() {
  return THEME_KEYWORDS;
}
