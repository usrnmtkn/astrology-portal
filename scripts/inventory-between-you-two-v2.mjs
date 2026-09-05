#!/usr/bin/env node
import fs from "node:fs";
const pair = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-clauses-v1.json", "utf8"));
const rows = pair.rows.filter((row) => row.contentKey.startsWith("fallback-hook/pair-daily/bond-clause/"));
const out = rows.map((row) => ({
  contentKey: row.contentKey,
  sourceKey: row.source_key,
  body_you: row.body_you,
  body_they: row.body_they
}));
console.log(JSON.stringify(out, null, 2));
