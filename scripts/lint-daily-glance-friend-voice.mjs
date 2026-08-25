#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

import { lintDailyGlanceFriendVoice } from "../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs";

const rowsFile = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url),
  "utf8"
));
const dailyRows = (rowsFile.hookRows ?? []).filter((row) => (
  /^fallback-hook\/daily-(?:headline|body)\//u.test(row.contentKey)
));
const baseline = {
  "DG-THEY-NO-SECOND-PERSON": {
    count: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "DG-THEY-NO-DIRECT-IMPERATIVE": {
    count: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "DG-THEY-ALLOWED-PERSON-SLOTS-ONLY": {
    count: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
};

let failed = false;
for (const [ruleId, expected] of Object.entries(baseline)) {
  const keys = dailyRows
    .filter((row) => lintDailyGlanceFriendVoice(row.body_they ?? "").some((finding) => finding.id === ruleId))
    .map((row) => row.contentKey)
    .sort();
  const sha256 = crypto.createHash("sha256").update(keys.join("\n")).digest("hex");
  const matchesBaseline = keys.length === expected.count && sha256 === expected.sha256;

  console.log(`${ruleId}: ${keys.length}/${dailyRows.length} flagged${matchesBaseline ? " (blocking baseline)" : " (BASELINE CHANGED)"}`);
  if (process.argv.includes("--verbose")) {
    for (const key of keys) console.log(`  ${key}`);
  }
  if (!matchesBaseline) failed = true;
}

if (failed) {
  console.error("Daily friend-voice lint changed. Inspect every changed key and ratchet the baseline intentionally.");
  process.exit(1);
}
