import type { ReportDomain } from "./report-types.js";
import { reportOwnerVoiceComparisonSetV2 } from "./report-owner-voice-corpus-v2.js";
import { loadReportVoiceRestorationCandidatePrompts } from "./report-prompt-versions.js";

export const REPORT_VOICE_RESTORATION_CANDIDATE_DEFECT_CATEGORIES = ["no_earned_sentence"] as const;

/**
 * Review/dry-run wiring for the owner-approval package. Production generation,
 * critique, and judging do not call this function before explicit activation.
 */
export function reportVoiceRestorationCandidatePacket(reportDomain: ReportDomain, unitId: string) {
  const prompts = loadReportVoiceRestorationCandidatePrompts();
  return {
    governance: {
      status: "needs_review" as const,
      ownerApproved: false,
      promotionAuthorized: false,
      activeInProduction: false
    },
    earnedSentenceRuling: prompts.earnedSentence,
    critiquePrompt: prompts.critique,
    judgePrompt: prompts.judge,
    ownerComparisonSet: reportOwnerVoiceComparisonSetV2(reportDomain, unitId),
    defectCategories: REPORT_VOICE_RESTORATION_CANDIDATE_DEFECT_CATEGORIES
  };
}
