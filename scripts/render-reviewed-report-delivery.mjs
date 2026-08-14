import fs from "node:fs";
import { buildReviewedReportDocument } from "../api/_lib/report-review-document.ts";
import { reportUnitIds } from "../api/_lib/report-unit-order.ts";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("Usage: render-reviewed-report-delivery.mjs <audit.json> <output.md>");
const audit = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const report = audit.report;
const rows = new Map(audit.units.map((row) => [row.content_key.replace(`report:${report.id}:`, ""), row]));
const units = reportUnitIds(report.report_domain, report.report_horizon).flatMap((unitId) => {
  const row = rows.get(unitId);
  return row ? [{ unitId, draft: { headline: row.headline, summary: row.summary, body: row.body, timing: row.source_snapshot?.renderMetadata?.timing ?? "", sections: row.sections ?? [] } }] : [];
});
const document = buildReviewedReportDocument({
  id: report.id, reportDomain: report.report_domain, reportHorizon: report.report_horizon,
  periodStart: report.period_start, periodEnd: report.period_end, factsEngine: report.facts_engine,
  factsHash: report.facts_hash, generatedAt: report.updated_at, units
});
const lines = [`# ${document.cover.title}`, document.cover.subtitle ?? "", ...(document.cover.meta ?? []).map((item) => `- ${item}`), ""];
for (const chapter of document.chapters) {
  lines.push(`## ${chapter.title}`, ...chapter.paragraphs, "");
}
lines.push("## Key dates", "");
for (const entry of document.keyDates) lines.push(`### ${entry.date} · ${entry.title}`, ...entry.paragraphs, `*${entry.attributionText ?? ""}*`, "");
lines.push("## Colophon", `Facts engine: ${document.colophon.factsEngine}`, ...document.colophon.entries.map((entry) => `${entry.label}: ${entry.value}`), "");
fs.writeFileSync(outputPath, `${lines.join("\n").replace(/\n{3,}/gu, "\n\n").trim()}\n`);
