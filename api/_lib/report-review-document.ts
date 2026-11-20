import crypto from "node:crypto";

export type ReviewedUnit = { unitId: string; draft: { headline?: string; summary?: string; body?: string; timing?: string; sections?: Array<{ heading?: string; body?: string }> } };
export type ReviewedReportDocument = {
  id: string;
  reportType: "report";
  cover: { kicker: string; title: string; subtitle?: string; meta?: string[] };
  chapters: Array<{ id: string; kicker: string; title: string; paragraphs: string[] }>;
  keyDates: Array<{ id: string; date: string; title: string; paragraphs: string[]; attributionText?: string }>;
  colophon: { factsEngine: string; generatedAt?: string; entries: Array<{ label: string; value: string }> };
};

function paragraphs(value: string | undefined) { return (value ?? "").split(/\n\s*\n/gu).map((entry) => entry.trim()).filter(Boolean); }
function keyDates(body: string | undefined) {
  return paragraphs(body).map((entry, index) => {
    const match = entry.match(/^\*\*([^·*]+)\s*·\s*([^*]+)\*\*\s*·\s*(.*?)\s*·\s*\*([^*]+)\*$/su);
    if (!match) throw new Error(`REPORT_KEY_DATE_DELIVERY_FORMAT: entry ${index + 1} cannot be rendered as a timeline item.`);
    return { id: `key-date-${index + 1}`, date: match[1].trim(), title: match[2].trim(), paragraphs: [match[3].trim()], attributionText: match[4].trim() };
  });
}

export function buildReviewedReportDocument(input: { id: string; reportDomain: string; reportHorizon: string; periodStart: string; periodEnd: string; factsEngine: string; factsHash: string; generatedAt?: string | null; units: ReviewedUnit[] }): ReviewedReportDocument {
  const overview = input.units.find((unit) => unit.unitId === "overview");
  if (!overview) throw new Error("REPORT_DELIVERY_INCOMPLETE: overview is missing.");
  const keyDateUnit = input.units.find((unit) => unit.unitId === "key-dates");
  if (!keyDateUnit) throw new Error("REPORT_DELIVERY_INCOMPLETE: key-dates is missing.");
  const chapters = input.units.filter((unit) => !["overview", "key-dates"].includes(unit.unitId)).flatMap((unit) => [
    { id: unit.unitId, kicker: input.reportDomain.replaceAll("_", " "), title: unit.draft.headline ?? "", paragraphs: [unit.draft.timing ?? "", unit.draft.summary ?? "", ...paragraphs(unit.draft.body)].filter(Boolean) },
    ...(unit.draft.sections ?? []).map((section, index) => ({ id: `${unit.unitId}-${index}`, kicker: input.reportHorizon.replaceAll("_", " "), title: section.heading ?? "", paragraphs: paragraphs(section.body) }))
  ]);
  return {
    id: input.id,
    reportType: "report",
    cover: { kicker: input.reportDomain.replaceAll("_", " "), title: overview.draft.headline ?? "", subtitle: overview.draft.summary ?? "", meta: [input.periodStart, input.periodEnd] },
    chapters: [{ id: "overview", kicker: "Overview", title: overview.draft.headline ?? "", paragraphs: paragraphs(overview.draft.body) }, ...chapters],
    keyDates: keyDates(keyDateUnit.draft.body),
    colophon: { factsEngine: input.factsEngine, generatedAt: input.generatedAt ?? undefined, entries: [{ label: "Facts hash", value: input.factsHash }] }
  };
}

export function reviewedReportDocumentHash(document: ReviewedReportDocument) {
  return crypto.createHash("sha256").update(reviewedReportDocumentBytes(document)).digest("hex");
}

export function reviewedReportDocumentBytes(document: ReviewedReportDocument) { return JSON.stringify(document); }

export function resolveReviewedDeliveryDocument(document: ReviewedReportDocument, expectedHash: string) {
  const actualHash = reviewedReportDocumentHash(document);
  if (actualHash !== expectedHash) throw new Error(`REPORT_DELIVERY_REVIEW_ARTIFACT_MISMATCH: expected ${expectedHash}, received ${actualHash}.`);
  return document;
}

export function resolveReviewedDeliveryBytes(bytes: string, expectedHash: string) {
  const actualHash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) throw new Error(`REPORT_DELIVERY_REVIEW_ARTIFACT_MISMATCH: expected ${expectedHash}, received ${actualHash}.`);
  return JSON.parse(bytes) as ReviewedReportDocument;
}
