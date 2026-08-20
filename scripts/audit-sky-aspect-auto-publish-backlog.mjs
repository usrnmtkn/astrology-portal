#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadLocalEnv() {
  for (const candidate of [path.join(repoRoot, "apps/web/.env.local"), path.join(repoRoot, ".env.local")]) {
    if (!fs.existsSync(candidate)) continue;
    for (const line of fs.readFileSync(candidate, "utf8").split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      if (process.env[key] !== undefined) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (/^["'].*["']$/u.test(value)) value = value.slice(1, -1);
      process.env[key] = value;
    }
    return;
  }
}

loadLocalEnv();
const baseUrl = String(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) throw new Error("Supabase URL and service role key are required. Credentials are never printed.");

const rows = [];
for (let offset = 0; ; offset += 1000) {
  const params = new URLSearchParams({
    block_type: "eq.sky_aspect",
    status: "eq.LIVE",
    lane: "eq.serving",
    review_state: "is.null",
    judge_gate: "eq.auto-publish",
    select: "content_key,status,lane,review_state,judge_score,judge_gate,source_snapshot",
    order: "content_key.asc",
    limit: "1000",
    offset: String(offset)
  });
  const response = await fetch(`${baseUrl}/rest/v1/generated_interpretations?${params}`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }
  });
  if (!response.ok) throw new Error(`Auto-publish backlog audit failed with HTTP ${response.status}.`);
  const page = await response.json();
  rows.push(...page);
  if (page.length < 1000) break;
}

const servingByAutoPublishAlone = rows.filter((row) => {
  const lint = row?.source_snapshot?.skyAspectVoiceLint;
  return row.judge_score === 3 && lint?.score === 3 && lint?.fails === 0;
});

console.log(JSON.stringify({
  audit: "sky-aspect-auto-publish-backlog",
  liveServingAutoPublishRows: rows.length,
  servingByAutoPublishAlone: servingByAutoPublishAlone.length
}, null, 2));
