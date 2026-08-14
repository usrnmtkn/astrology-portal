import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ReportDomain } from "./report-types.js";
import type { ReportComparisonFunction } from "./report-owner-comparison.js";

export type ReportVoiceUnitType = "overview" | "theme" | "season" | "domain" | "review" | "closing";

export type ReportOwnerVoiceCorpusPassage = {
  evidenceId: string;
  reportDomain: ReportDomain;
  unitType: ReportVoiceUnitType;
  function: ReportComparisonFunction;
  sectionHeading: string;
  text: string;
  provenance: {
    sourcePath: string;
    sourceType: "owner_authored_final";
    sourceSha256: string;
    passageSha256: string;
  };
};

const OWNER_FINALS: Array<{ reportDomain: ReportDomain; sourcePath: string }> = [
  { reportDomain: "general", sourcePath: "artifacts/marie-satori-year-ahead-2026-FINAL.md" },
  { reportDomain: "work_money", sourcePath: "artifacts/marie-satori-work-money-2026-owner-v1.md" },
  { reportDomain: "love_connection", sourcePath: "artifacts/marie-satori-love-connection-2026-owner-v1.md" },
  { reportDomain: "personal_health", sourcePath: "artifacts/marie-satori-personal-health-2026-owner-v1.md" }
];

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function unitTypeForHeading(heading: string): ReportVoiceUnitType {
  if (/\boverview\b/iu.test(heading)) return "overview";
  if (/\bwhat 2026 is about\b/iu.test(heading)) return "theme";
  if (/\b2026 in review\b/iu.test(heading)) return "review";
  if (/\bwinter 2027\b/iu.test(heading)) return "closing";
  if (/\b(?:winter|spring|summer|autumn) 2026\b/iu.test(heading)) return "season";
  return "domain";
}

export function reportVoiceUnitType(unitId: string): ReportVoiceUnitType {
  if (unitId === "overview") return "overview";
  if (/theme/u.test(unitId)) return "theme";
  if (/review/u.test(unitId)) return "review";
  if (/winter-next|closing/u.test(unitId)) return "closing";
  if (/winter-current|spring|summer|autumn|phase|development/u.test(unitId)) return "season";
  return "domain";
}

function paragraphFunction(text: string, index: number, count: number): ReportComparisonFunction {
  if (index === 0) return "opening";
  if (index === count - 1) return "close";
  if (/\b(?:but|however|complication|pressure|cost|problem|watch|conflict|too much|not enough)\b/iu.test(text)) return "complication";
  if (/^(?:then|now|by |once |instead|later|soon|the next)/iu.test(text)) return "turn";
  return "development";
}

function eligibleParagraphs(section: string) {
  return section.split(/\n\s*\n/gu).slice(1).map((entry) => entry.trim()).filter((entry) => (
    entry.length >= 80
    && !/^\*[^*].*\*$/su.test(entry)
    && !/^\*\*Key dates\*\*$/iu.test(entry)
    && !/^- \*\*/u.test(entry)
    && entry !== "---"
  ));
}

function corpusForSource(source: { reportDomain: ReportDomain; sourcePath: string }) {
  const text = fs.readFileSync(path.join(process.cwd(), source.sourcePath), "utf8");
  const sourceSha256 = sha256(text);
  const sections = text.split(/(?=^## )/gmu).filter((section) => /^## /u.test(section));
  return sections.flatMap((section, sectionIndex) => {
    const heading = /^##\s+(.+)$/mu.exec(section)?.[1]?.trim() ?? "";
    const paragraphs = eligibleParagraphs(section);
    const unitType = unitTypeForHeading(heading);
    return paragraphs.map((paragraph, paragraphIndex): ReportOwnerVoiceCorpusPassage => {
      const passageSha256 = sha256(paragraph);
      return {
        evidenceId: `report-owner-v2:${source.reportDomain}:${sectionIndex}:${paragraphIndex}:${passageSha256.slice(0, 12)}`,
        reportDomain: source.reportDomain,
        unitType,
        function: paragraphFunction(paragraph, paragraphIndex, paragraphs.length),
        sectionHeading: heading,
        text: paragraph,
        provenance: {
          sourcePath: source.sourcePath,
          sourceType: "owner_authored_final",
          sourceSha256,
          passageSha256
        }
      };
    });
  });
}

let cachedCorpus: ReportOwnerVoiceCorpusPassage[] | null = null;

export function reportOwnerVoiceCorpusV2() {
  if (!cachedCorpus) cachedCorpus = OWNER_FINALS.flatMap(corpusForSource);
  return structuredClone(cachedCorpus);
}

const FUNCTION_TARGETS: Record<ReportVoiceUnitType, ReportComparisonFunction[]> = {
  overview: ["opening", "development", "close"],
  theme: ["opening", "development", "complication"],
  season: ["opening", "complication", "close"],
  domain: ["opening", "development", "complication"],
  review: ["opening", "development", "close"],
  closing: ["opening", "turn", "close"]
};

/** Candidate v2 retrieval. It is intentionally not called by active v3.2/v5 runtime code. */
export function reportOwnerVoiceComparisonSetV2(reportDomain: ReportDomain, unitId: string) {
  const unitType = reportVoiceUnitType(unitId);
  const candidates = reportOwnerVoiceCorpusV2().filter((passage) => passage.unitType === unitType);
  const selected: ReportOwnerVoiceCorpusPassage[] = [];
  for (const functionTag of FUNCTION_TARGETS[unitType]) {
    const unusedSources = new Set(selected.map((passage) => passage.provenance.sourcePath));
    const choice = candidates.find((passage) => passage.function === functionTag
      && passage.reportDomain === reportDomain
      && !selected.some((entry) => entry.evidenceId === passage.evidenceId))
      ?? candidates.find((passage) => passage.function === functionTag
        && !unusedSources.has(passage.provenance.sourcePath)
        && !selected.some((entry) => entry.evidenceId === passage.evidenceId))
      ?? candidates.find((passage) => passage.function === functionTag
        && !selected.some((entry) => entry.evidenceId === passage.evidenceId));
    if (choice) selected.push(choice);
  }
  for (const fallback of candidates) {
    if (selected.length >= 3) break;
    if (!selected.some((entry) => entry.evidenceId === fallback.evidenceId)) selected.push(fallback);
  }
  if (selected.length !== 3) throw new Error(`REPORT_OWNER_VOICE_CORPUS_GAP: ${reportDomain}:${unitId}:${unitType}`);
  return selected;
}
