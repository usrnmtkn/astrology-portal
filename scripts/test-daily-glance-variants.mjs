#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  renderDailyGlance,
  selectDailyGlanceVariantSet
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const require = createRequire(import.meta.url);
const { configPath, lintTextAgainstBans, readJson } = require("../packages/astro-knowledge/scripts/daily-glance-writer-runtime.js");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const variantPath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/daily-glance-variants-v1.json");
const rowPath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const variants = JSON.parse(fs.readFileSync(variantPath, "utf8"));
const rows = JSON.parse(fs.readFileSync(rowPath, "utf8"));
const hooks = new Map(rows.hookRows.map((row) => [row.contentKey, row]));
const eligible = new Set(["approved", "approved_reuse", "reviewed"]);
const config = readJson(configPath);

assert.equal(variants.schema, "tldrastro-daily-glance-variants-v1");
assert.equal(Object.keys(variants.keys).length, 68, "All 56 aspect keys and 12 house keys must have a primary pair.");

let seededHeadlines = 0;
let seededBodies = 0;
const servedLines = new Map();
for (const [key, set] of Object.entries(variants.keys)) {
  assert.equal(set.pairing_policy, "explicit_pairs_only", `${key} must fail closed on cross-pairing.`);
  const primaryHeadline = set.headlines.find((item) => item.id === "primary");
  const primaryBody = set.bodies.find((item) => item.id === "primary");
  const primaryPair = set.pairings.find((item) => item.id === "primary");
  assert(primaryHeadline && primaryBody && primaryPair, `${key} is missing its primary set.`);
  assert.equal(primaryHeadline.text, hooks.get(`fallback-hook/daily-headline/${key}`)?.body_you, `${key} primary headline drifted from source rows.`);
  assert.equal(primaryBody.text, hooks.get(`fallback-hook/daily-body/${key}`)?.body_you, `${key} primary body drifted from source rows.`);
  assert.equal(primaryPair.headline_id, "primary");
  assert.equal(primaryPair.body_id, "primary");

  for (const item of set.headlines.filter((candidate) => candidate.id !== "primary")) {
    seededHeadlines += 1;
    assert.equal(item.review_status, "review_needed", `${key}/${item.id} must enter review-gated.`);
  }
  for (const item of set.bodies.filter((candidate) => candidate.id !== "primary")) {
    seededBodies += 1;
    assert.equal(item.review_status, "review_needed", `${key}/${item.id} must enter review-gated.`);
  }
  assert(set.pairings.filter((pairing) => pairing.id !== "primary").every((pairing) => pairing.review_status === "review_needed"));

  const headlineById = new Map(set.headlines.map((item) => [item.id, item]));
  const bodyById = new Map(set.bodies.map((item) => [item.id, item]));
  for (const pairing of set.pairings.filter((candidate) => eligible.has(candidate.review_status))) {
    const headline = headlineById.get(pairing.headline_id);
    const body = bodyById.get(pairing.body_id);
    assert(headline && body, `${key}/${pairing.id} references a missing line.`);
    assert(eligible.has(headline.review_status) && eligible.has(body.review_status), `${key}/${pairing.id} cannot serve gated text.`);
    // The 68 shipped primaries remain exact-owner-approved and are not rewritten
    // retroactively when the writer ban set evolves. Every newly approved pairing
    // must pass the current bans before it can join the pool.
    if (pairing.id !== "primary") {
      const findings = lintTextAgainstBans(`${headline.text}\n${body.text}`, config);
      assert.deepEqual(findings, [], `${key}/${pairing.id} violates a serve-time output ban.`);
    }
    for (const text of [headline.text, body.text]) {
      const previousKey = servedLines.get(text);
      assert(!previousKey || previousKey === key, `DG-R18: identical approved line serves on ${previousKey} and ${key}.`);
      servedLines.set(text, key);
    }
  }
}
assert(seededHeadlines > 0 && seededBodies > 0, "The seed import must contain review-gated headlines and bodies.");

const synthetic = {
  pairing_policy: "explicit_pairs_only",
  headlines: [
    { id: "primary", text: "Primary headline.", review_status: "approved" },
    { id: "alternate-a", text: "Alternate A headline.", review_status: "approved" },
    { id: "alternate-b", text: "Alternate B headline.", review_status: "approved" },
    { id: "gated", text: "Gated headline.", review_status: "review_needed" }
  ],
  bodies: [
    { id: "primary", text: "Primary body.", review_status: "approved" },
    { id: "alternate-a", text: "Alternate A body.", review_status: "approved" },
    { id: "alternate-b", text: "Alternate B body.", review_status: "approved" },
    { id: "gated", text: "Gated body.", review_status: "review_needed" }
  ],
  pairings: [
    { id: "primary", headline_id: "primary", body_id: "primary", review_status: "approved" },
    { id: "alternate-a", headline_id: "alternate-a", body_id: "alternate-a", review_status: "approved" },
    { id: "alternate-b", headline_id: "alternate-b", body_id: "alternate-b", review_status: "approved" },
    { id: "gated", headline_id: "gated", body_id: "gated", review_status: "review_needed" }
  ]
};
const select = (dateKey, previousVariantId) => selectDailyGlanceVariantSet({
  variantSet: synthetic,
  primary: { headline: "Primary headline.", body: "Primary body." },
  dateKey,
  contentKey: "square/mars",
  userId: "chart-1",
  previousVariantId
});
assert.deepEqual(select("2026-08-10"), select("2026-08-10"), "Selection must be stable within one day.");
const rotation = [select("2026-08-10"), select("2026-08-11"), select("2026-08-12")];
assert.equal(new Set(rotation.map((item) => item.id)).size, 3, "Three approved variants must rotate across three dates.");
assert(!rotation.some((item) => item.id === "gated"), "Review-gated variants must not serve.");
const avoided = select("2026-08-10", rotation[0].id);
assert.notEqual(avoided.id, rotation[0].id, "A supplied previous appearance must not repeat when another pair is available.");

const livePrimary = renderDailyGlance({ natal: "mars", aspect: "square", dateKey: "2026-08-10", userId: "chart-1" });
assert.equal(livePrimary.variantId, "primary", "Current review-gated seeds must leave production on the primary pair.");
assert.throws(() => renderDailyGlance({ dateKey: "2026-08-10" }), /SOURCE_GAP/u, "SOURCE_GAP behavior must remain unchanged.");

console.log(`Daily-glance variants passed: 68 primaries, ${seededHeadlines} review-gated headlines, ${seededBodies} review-gated bodies, deterministic explicit-pair rotation, ban and DG-R18 checks.`);
