import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { missingRelationshipPerspectives } from "../apps/web/src/content/fallbackArchitectureV3/resolver/relationshipTemplate.mjs";

export function auditRelationshipTemplatePairs(data) {
  const rows = Array.isArray(data) ? data : data.rows ?? data.hookRows;
  if (!Array.isArray(rows)) throw new Error("Relationship audit requires an inventory.");
  const current = [], historical = [];
  for (const row of rows) {
    const key = row.content_key ?? row.contentKey;
    if (!key?.startsWith("fallback-hook/bond-effect-")) continue;
    const check = (value, version, destination) => {
      const missing = missingRelationshipPerspectives(value);
      destination.push({ contentKey: key, rowId: row.id ?? null, version, missing });
    };
    if (row.sections) {
      let checked = false;
      for (const field of ["packageRecord", "packageDraft"]) if (Object.hasOwn(row.sections, field)) {
        check(row.sections[field], field, current);
        checked = true;
      }
      if (!checked) check(null, "missing stored pair", current);
      for (const entry of row.sections.dashboardEditHistory ?? []) check(entry.packageDraft, entry.versionId, historical);
    } else check(row, "canonical", current);
  }
  return { currentChecked: current.length, currentMissing: current.filter(r => r.missing.length), historicalChecked: historical.length, historicalMissing: historical.filter(r => r.missing.length) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv.find(value => value.startsWith("--rows="))?.slice(7);
  const data = JSON.parse(fs.readFileSync(path ?? "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "utf8"));
  const report = auditRelationshipTemplatePairs(data);
  console.log(JSON.stringify(report, null, 2));
  if (!report.currentChecked || report.currentMissing.length) process.exitCode = 1;
}
