import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiSource = fs.readFileSync(path.join(repoRoot, "api/admin/report-fulfillment.ts"), "utf8");
const adminSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/ReportFulfillmentAdminPanel.tsx"), "utf8");

assert.match(apiSource, /reportInspection\(reportId/u, "The report Admin API must expose exact report units for inspection.");
assert.match(apiSource, /save_report_unit_draft/u, "Report corrections must support a private draft step.");
assert.match(apiSource, /adminCorrectionDraft/u, "Correction drafts must stay in provenance metadata until publication.");
assert.match(apiSource, /publish_report_unit_correction/u, "Report corrections must require an explicit publish action.");
assert.match(apiSource, /previous:\s*\{/u, "Publishing a correction must retain the previous delivered copy in provenance.");
assert.match(apiSource, /renderMetadata:\s*\{[\s\S]*?timing:/u, "Publishing a correction must update the timing line read by the report renderer.");

assert.match(adminSource, />Preview and edit</u, "Every report row must open the reader-copy editor.");
assert.match(adminSource, />Title\s*</u, "The report editor must expose the reader-facing title.");
assert.match(adminSource, />TL;DR\s*</u, "The report editor must explain and expose the reader-facing summary.");
assert.match(adminSource, />Timing line\s*</u, "The report editor must expose the reader-facing timing paragraph.");
assert.match(adminSource, />Body\s*</u, "The report editor must expose the reader-facing body.");
assert.match(adminSource, />Publish correction</u, "A saved correction must require a separate publish action.");

console.log("Admin report copy editor contract passed.");
