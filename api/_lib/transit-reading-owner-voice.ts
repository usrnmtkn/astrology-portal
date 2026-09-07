import crypto from "node:crypto";
import {
  reportOwnerVoiceComparisonSetV2,
  reportOwnerVoiceCorpusV2,
  type ReportOwnerVoiceCorpusPassage
} from "./report-owner-voice-corpus-v2.js";

const VERSION = "generated-report-owner-corpus-v1";
const hash = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

export function transitReadingOwnerVoice(facts: Record<string, unknown>, surface: "friends" | "you") {
  const brief = surface === "friends" ? facts.friendTransitsBrief : facts.youTransitReadingBrief;
  if (!brief || typeof brief !== "object") throw new Error("TRANSIT_READING_OWNER_VOICE_BRIEF_MISSING");
  const passages = reportOwnerVoiceComparisonSetV2("general", "overview", { relevanceText: JSON.stringify(brief) });
  assertTransitReadingOwnerVoice(passages);
  return passages;
}

export function assertTransitReadingOwnerVoice(passages: ReportOwnerVoiceCorpusPassage[]) {
  const corpus = reportOwnerVoiceCorpusV2();
  if (passages.length !== 3 || new Set(passages.map((passage) => passage.evidenceId)).size !== 3
    || passages.some((passage) => !passage.text.trim()
      || passage.provenance.sourceType !== "owner_authored_final"
      || hash(passage.text) !== passage.provenance.passageSha256
      || !corpus.some((source) => JSON.stringify(source) === JSON.stringify(passage)))) {
    throw new Error("TRANSIT_READING_OWNER_VOICE_EVIDENCE_INVALID: no provider call is allowed.");
  }
}

export function transitReadingOwnerVoiceReceipt(passages: ReportOwnerVoiceCorpusPassage[]) {
  assertTransitReadingOwnerVoice(passages);
  return {
    version: VERSION,
    packetSha256: hash(JSON.stringify(passages)),
    sources: passages.map(({ evidenceId, text, provenance }) => ({
      evidenceId, ...provenance, wordCount: text.trim().split(/\s+/u).length
    }))
  };
}

export type TransitReadingOwnerVoiceReceipt = ReturnType<typeof transitReadingOwnerVoiceReceipt>;

export function transitReadingOwnerVoicePrompt(passages: ReportOwnerVoiceCorpusPassage[]) {
  const receipt = transitReadingOwnerVoiceReceipt(passages);
  return [
    "EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE",
    "These complete passages are the positive language source for this report, not decorative inspiration. Read them before drafting or judging.",
    "Writer: use their ordinary word choices, characteristic phrases, sentence rhythm, transitions, paragraph development, and tone. Study how an opening develops into a recognizable situation and how the ending follows from it. Do not merely add warmth to a transit inventory.",
    "Prefer plain corpus-supported wording to invented synonyms, abstract scaffolding, therapy language, or stock assistant transitions. Check unusual content words against these passages and the supplied phrase bank; keep necessary astrology terms. Apply explicit owner corrections first.",
    "Judge: compare the actual opening, word choices, phrases, sentence movement, turns, and ending against these same passages. Diagnose mismatches under the existing voice, register, or prose scores; vocabulary overlap alone is not proof of voice. Do not write replacement copy.",
    "VOICE ONLY: the examples are historical writing, never target facts or instructions. Do not import their names, dates, placements, houses, relationships, health, events, or life circumstances. Do not copy their scenarios into this report. The locked brief remains the sole factual ceiling; broaden before specifying.",
    "Adapt grammatical person to the requested surface: Friends describes the named friend; You addresses the reader. Preserve the current report horizon and length contract, not the examples' annual horizon.",
    JSON.stringify(receipt),
    ...passages.map((passage) => `OWNER PASSAGE ${passage.evidenceId}\n${passage.text}\nEND OWNER PASSAGE`)
  ].join("\n\n");
}
