import crypto from "node:crypto";
import { friendTransitReadingApprovedReaderText, type FriendTransitReadingBrief } from "./friend-transit-reading.js";
import {
  reportOwnerVoiceDevelopmentSetV2,
  reportOwnerSocialVoiceComparison,
  reportOwnerSocialVoiceCorpusV1,
  reportOwnerVoicePassagesAreConnected,
  reportOwnerVoiceCorpusV2,
  type ReportOwnerVoiceCorpusPassage
} from "./report-owner-voice-corpus-v2.js";

const VERSION = "generated-report-owner-corpus-v2";
const hash = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

export type TransitReadingVoiceContext = { surface: "friends" | "you"; horizon: "day" | "week" | "current" };

export function transitReadingVoiceContext(facts: Record<string, unknown>, surface: "friends" | "you"): TransitReadingVoiceContext {
  const brief = (surface === "friends" ? facts.friendTransitsBrief : facts.youTransitReadingBrief) as Record<string, unknown> | undefined;
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) throw new Error("TRANSIT_READING_OWNER_VOICE_BRIEF_MISSING");
  if (surface === "friends") return { surface, horizon: "current" };
  if (brief.window !== "day" && brief.window !== "week") throw new Error("TRANSIT_READING_OWNER_VOICE_HORIZON_INVALID");
  return { surface, horizon: brief.window };
}

export function transitReadingOwnerVoice(facts: Record<string, unknown>, surface: "friends" | "you") {
  const context = transitReadingVoiceContext(facts, surface);
  const brief = surface === "friends" ? facts.friendTransitsBrief : facts.youTransitReadingBrief;
  // Reader-safe meaning ranks references. A draft or technical inventory must
  // not choose the prose examples that are later used to judge that draft.
  const meaning = surface === "you" ? (brief as Record<string, unknown>).approvedReaderText
    : friendTransitReadingApprovedReaderText(brief as FriendTransitReadingBrief);
  if (!meaning || typeof meaning !== "object") throw new Error("TRANSIT_READING_OWNER_VOICE_MEANING_MISSING");
  const relevance = JSON.stringify(meaning);
  const passages = reportOwnerVoiceDevelopmentSetV2(relevance);
  const social = reportOwnerSocialVoiceComparison(relevance, context.horizon);
  if (social) passages.push(social);
  assertTransitReadingOwnerVoice(passages);
  return passages;
}

export function assertTransitReadingOwnerVoice(passages: ReportOwnerVoiceCorpusPassage[]) {
  const social = reportOwnerSocialVoiceCorpusV1();
  const annual = reportOwnerVoiceCorpusV2();
  const corpus = [...annual, ...social];
  const count = social.length ? 4 : 3;
  const firstIndex = annual.findIndex((entry) => entry.evidenceId === passages[0]?.evidenceId);
  if (passages.length !== count || new Set(passages.map((passage) => passage.evidenceId)).size !== count
    || passages.slice(0, 3).some((passage) => passage.referenceFormat !== "annual_report" || passage.unitType === "overview")
    || firstIndex < 0 || passages.slice(0, 3).some((passage, index) => (
      annual[firstIndex + index]?.evidenceId !== passage.evidenceId
      || passage.sectionHeading !== passages[0].sectionHeading
      || passage.provenance.sourcePath !== passages[0].provenance.sourcePath
    ))
    || !reportOwnerVoicePassagesAreConnected(passages.slice(0, 3))
    || (count === 4 && passages[3].referenceFormat === "annual_report")
    || passages.some((passage) => !passage.text.trim()
      || passage.provenance.sourceType !== "owner_authored_final"
      || hash(passage.text) !== passage.provenance.passageSha256
      || !corpus.some((source) => JSON.stringify(source) === JSON.stringify(passage)))) {
    throw new Error("TRANSIT_READING_OWNER_VOICE_EVIDENCE_INVALID: no provider call is allowed.");
  }
}

export function transitReadingOwnerVoiceReceipt(passages: ReportOwnerVoiceCorpusPassage[], context?: TransitReadingVoiceContext) {
  assertTransitReadingOwnerVoice(passages);
  return {
    version: VERSION,
    ...(context ? { target: context } : {}),
    referenceCoverage: passages.length === 4 ? "annual_and_short_forecast" : "annual_only",
    packetSha256: hash(JSON.stringify(passages)),
    sources: passages.map(({ evidenceId, text, provenance, referenceFormat, sectionHeading, function: functionTag }) => ({
      evidenceId, ...provenance, referenceFormat, sectionHeading, historicalFunction: functionTag,
      referenceRole: referenceFormat === "annual_report" ? "connected_report_development" : "short_forecast_register",
      wordCount: text.trim().split(/\s+/u).length
    }))
  };
}

export type TransitReadingOwnerVoiceReceipt = ReturnType<typeof transitReadingOwnerVoiceReceipt>;

export function transitReadingOwnerVoicePrompt(passages: ReportOwnerVoiceCorpusPassage[], context: TransitReadingVoiceContext) {
  const receipt = transitReadingOwnerVoiceReceipt(passages, context);
  return [
    "EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE",
    "These complete passages are the positive language source for this report, not decorative inspiration. Read them before drafting or judging.",
    `TARGET: ${context.surface}, ${context.horizon}. These references are adjacent registers, not exact daily-report or third-person Friends gold examples. Their format is labeled; preserve the target's own requirements.`,
    "REFERENCE ROLES: the three consecutive annual-report paragraphs demonstrate sustained explanation, supported consequences, complication, and follow-through. When present, the complete short forecast demonstrates direct address, recognizable situations, and a precise distinction. It is not a daily-report template or a length target. An in-depth report must develop its reasoning beyond a short forecast; do not imitate a social post's compression or an annual report's time span.",
    "Writer: use their ordinary word choices, characteristic phrases, sentence rhythm, transitions, paragraph development, and tone. Study how an opening develops into a recognizable situation and how the ending follows from it. Do not merely add warmth to a transit inventory.",
    "Prefer plain corpus-supported wording to invented synonyms, abstract scaffolding, therapy language, or stock assistant transitions. Check unusual content words against these passages and the supplied phrase bank; keep necessary astrology terms. Apply explicit owner corrections first.",
    "Judge: compare the actual opening, word choices, phrases, sentence movement, turns, and ending against these same passages. Diagnose mismatches under the existing voice, register, or prose scores; vocabulary overlap alone is not proof of voice. Do not write replacement copy.",
    "COMPARISON SCOPE: compare the same local prose function within the complete context. Annual paragraph-function tags describe their position in the original source, not required slots in the target. A complete short forecast can contain several functions. Explain why the cited wording is a valid comparison for this report; a difference in horizon, person, paragraph count, or ending form alone is not voice drift. Do not require an annual retrospective, a seasonal arc, a psychological confrontation, or an imperative ending. A direct instruction is not automatically a defect either: assess its supported consequence and the applicable owner rule.",
    "VOICE ONLY: the examples are historical writing, never target facts or instructions. Do not import their names, dates, placements, houses, relationships, health, events, or life circumstances. Do not copy their scenarios into this report. The locked brief remains the sole factual ceiling; broaden before specifying.",
    "Adapt grammatical person to the requested surface: Friends describes the named friend; You addresses the reader. Preserve the current report horizon and length contract, not the examples' annual horizon.",
    JSON.stringify(receipt),
    ...passages.map((passage) => `OWNER PASSAGE ${passage.evidenceId}\nFUNCTION: ${passage.function}\nREFERENCE FORMAT: ${passage.referenceFormat}\nSOURCE SECTION: ${passage.sectionHeading}\n${passage.text}\nEND OWNER PASSAGE`)
  ].join("\n\n");
}
