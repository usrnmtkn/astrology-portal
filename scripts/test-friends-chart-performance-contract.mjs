import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSourcePath = path.join(repoRoot, "apps/web/src/App.tsx");
const appSource = fs.readFileSync(appSourcePath, "utf8");

const repairFunctionMatch = appSource.match(
  /function manualChartNeedsNatalRepair\(chart: ManualChart\) \{(?<body>[\s\S]*?)\n\}/
);

assert.ok(
  repairFunctionMatch?.groups?.body,
  "Friends chart performance QA must be able to inspect manualChartNeedsNatalRepair."
);

const repairBody = repairFunctionMatch.groups.body;

assert.doesNotMatch(
  repairBody,
  /isTldrAstroApiConfigured\s*\|\|/,
  "Friends charts must not repair every known-time chart just because the API is configured."
);

assert.match(
  repairBody,
  /return\s+!chart\.natalChart\s*\|\|\s*!chart\.birthLocation\.timeZone;/,
  "Friends chart repair must only run for records missing natal chart data or timezone data."
);

assert.match(
  appSource,
  /const chartsToRepair = charts\.filter\(manualChartNeedsNatalRepair\);/,
  "Friends chart repair must filter incomplete charts before starting async repair work."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends chart performance",
  contract: "Complete friend charts do not trigger background natal/timezone repair on page load."
}, null, 2));
