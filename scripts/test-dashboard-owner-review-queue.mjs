#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");

assert.match(
  dashboard,
  /sourceType === "owner-resource-review"/u,
  "Owner-resource rows must be admitted to the dashboard review queue."
);
assert.match(
  dashboard,
  /visibleRows\s*\.filter\(generatedRowNeedsReviewQueue\)/u,
  "The review queue must adapt matching generated_interpretations rows."
);
assert.match(
  dashboard,
  /reviewQueueRows\.filter\(\(row\) => \{/u,
  "Review filters must run against the combined review queue."
);
assert.match(
  dashboard,
  /reviewQueueRows\.filter\(\(row\) => row\.status === status\)\.length/u,
  "Review status counts must include generated_interpretations review rows."
);

console.log("Dashboard owner-review queue contract passed.");
