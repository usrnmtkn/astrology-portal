import { createHash } from "node:crypto";
import type { GeneratedTransitReadingDraft } from "./transit-reading-generation.js";
import type { YouTransitReadingBrief } from "./you-transit-reading.js";
import type { FriendTransitReadingBrief } from "./friend-transit-reading.js";
import { transitReadingReaderCopy } from "./transit-reading-reader-copy.js";

export const SOURCE_COMPLETION_POLICY = "report-source-completion-v1";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
type SourceUnit = { path: string; text: string; sourceKeys: string[]; field: "summary" | "body" };
export type SourceCompletionReceipt = {
  version: typeof SOURCE_COMPLETION_POLICY;
  mode: "source_readings";
  // Provenance to the locked request, not a new editorial or factual approval.
  briefSha256: string;
  readerSha256: string;
  units: Array<Omit<SourceUnit, "text"> & { sha256: string; wordCount: number; start: number; end: number }>;
  reason: string;
  rejectedDraftSha256?: string;
  reviews: unknown[];
};
export type SourceCompletion = { draft: GeneratedTransitReadingDraft; receipt: SourceCompletionReceipt };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

/** Select complete reader fields only. Never excerpt, repair, paraphrase or
 * recursively flatten a brief (which also contains internal technical data). */
export function prepareSourceCompletion(brief: YouTransitReadingBrief | FriendTransitReadingBrief, headline: string): SourceCompletion {
  const units: SourceUnit[] = [];
  const add = (path: string, text: unknown, field: SourceUnit["field"] = "body", sourceKeys: unknown = []) => {
    if (typeof text !== "string" || !text.trim()) throw new Error(`Complete source reading missing at ${path}.`);
    units.push({ path, text, field, sourceKeys: array(sourceKeys).filter((key): key is string => typeof key === "string" && Boolean(key.trim())) });
  };
  if (brief.schema === "tldr.you-transit-reading-brief.v1") {
    const b = brief as YouTransitReadingBrief;
    const source = b.approvedReaderText;
    if (b.window === "day") {
      const daily = record(source.dailySummary);
      if (typeof daily.summary === "string" && daily.summary.trim()) add("approvedReaderText.dailySummary.summary", daily.summary, "summary");
      const readings = array(source.transitReadings);
      if (!readings.length) throw new Error("Complete daily transit readings are unavailable.");
      readings.forEach((value, index) => {
        const reading = record(value);
        if (!array(reading.sourceUnits).length || !reading.transitId) throw new Error("Daily source identity is missing.");
        add(`approvedReaderText.transitReadings.${index}.body`, reading.body, "body", reading.sourceUnits);
      });
    } else {
      const macro = record(source.macro);
      if (typeof macro.body === "string" && macro.body.trim()) add("approvedReaderText.macro.body", macro.body, "summary");
      const horoscope = record(source.horoscope);
      add("approvedReaderText.horoscope.body", horoscope.body, "body", horoscope.sourceUnits);
      array(source.aspects).forEach((value, index) => {
        const aspect = record(value);
        add(`approvedReaderText.aspects.${index}.body`, aspect.body, "body", aspect.sourceUnits);
      });
    }
  } else if (brief.schema === "tldr.friend-transits-brief.v1") {
    const b = brief as FriendTransitReadingBrief;
    if (b.daily?.forecast?.body) add("daily.forecast.body", b.daily.forecast.body, "summary");
    for (const group of ["primaryThemes", "houseContext", "longerCycles"] as const) {
      b[group].forEach((reading, index) => {
        if (!reading.readerSections?.length) throw new Error(`Complete Friends source missing at ${group}.${index}; a preview is not a full reading.`);
        reading.readerSections.forEach((section, sectionIndex) => {
          if (!section.sourceKeys.length) throw new Error("Friends source identity is missing.");
          add(`${group}.${index}.readerSections.${sectionIndex}.body`, section.body, "body", section.sourceKeys);
        });
      });
    }
    b.relationshipActivations.forEach((reading, index) => {
      add(`relationshipActivations.${index}.activationBody`, reading.activationBody);
      add(`relationshipActivations.${index}.effectBody`, reading.effectBody);
    });
    b.activePatterns.forEach((reading, index) => {
      if (typeof reading.activationCopy === "string" && reading.activationCopy.trim()) add(`activePatterns.${index}.activationCopy`, reading.activationCopy);
    });
  } else throw new Error("Unknown report source schema.");
  const fields = { summary: "", body: "" };
  const receipts: SourceCompletionReceipt["units"] = [];
  for (const unit of units) {
    const prefix = fields[unit.field] ? "\n\n" : "";
    const start = fields[unit.field].length + prefix.length;
    fields[unit.field] += prefix + unit.text;
    receipts.push({ path: unit.path, field: unit.field, sourceKeys: unit.sourceKeys, sha256: hash(unit.text),
      wordCount: unit.text.trim().split(/\s+/u).length, start, end: fields[unit.field].length });
  }
  if (!fields.body.trim()) throw new Error("A report needs complete source readings beyond its summary.");
  const draft: GeneratedTransitReadingDraft = { headline, ...fields, tldr: fields.summary, action: "", timing: "", sections: [], model: SOURCE_COMPLETION_POLICY, retryCount: 0 };
  return { draft, receipt: { version: SOURCE_COMPLETION_POLICY, mode: "source_readings", briefSha256: hash(canonical(brief)),
    readerSha256: hash(JSON.stringify(transitReadingReaderCopy(draft))), units: receipts, reason: "", reviews: [] } };
}

/** Require storage to acknowledge the same delivery provenance as the prose. */
export function assertSavedSourceCompletion(rows: Array<{ source_snapshot?: unknown }>, receipt?: SourceCompletionReceipt) {
  if (!receipt) return;
  if (rows.length !== 1 || canonical(record(rows[0].source_snapshot).reportDelivery) !== canonical(receipt)
    || record(rows[0].source_snapshot).generatedReportQualityGate) {
    throw new Error("The report save did not confirm its source delivery receipt.");
  }
}

/** Reuse after a save/worker interruption must prove the same exact source
 * result, even after JSONB storage changes object-key ordering. */
export function assertReusableSourceCompletion(row: {
  headline?: string | null; summary?: string | null; body?: string | null; source_snapshot?: unknown; provider?: string | null;
}, prepared: SourceCompletion) {
  if (row.provider !== "source") return;
  const receipt = record(record(row.source_snapshot).reportDelivery);
  if (canonical(transitReadingReaderCopy(row)) !== canonical(transitReadingReaderCopy(prepared.draft))
    || receipt.briefSha256 !== prepared.receipt.briefSha256 || receipt.readerSha256 !== prepared.receipt.readerSha256
    || canonical(receipt.units) !== canonical(prepared.receipt.units) || receipt.version !== SOURCE_COMPLETION_POLICY
    || receipt.mode !== "source_readings" || typeof receipt.reason !== "string" || !receipt.reason
    || !Array.isArray(receipt.reviews) || record(row.source_snapshot).generatedReportQualityGate) {
    throw new Error("Stored source report does not match the locked request and source receipt.");
  }
}
