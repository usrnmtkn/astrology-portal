import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const app = read("apps/web/src/App.tsx");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const migration = read(
  "apps/web/supabase/migrations/20260726203000_generated_content_sky_placement_block_type.sql"
);
const cron = read("api/cron/generate-sky-placements.ts");
const vercel = JSON.parse(read("vercel.json"));

assert.match(generatedContent, /\|\s+"sky_placement"/);
assert.match(migration, /'sky_placement'/);

assert.match(app, /content\.blockType === "sky_placement"/);
assert.match(app, /content\.eventType === "collective-placement-card"/);
assert.match(app, /lint\?\.score === 3/);
assert.match(app, /lint\?\.fails === 0/);
assert.match(app, /content\.judgeScore === 3/);
assert.match(app, /content\.judgeGate === "auto-publish"/);
assert.match(app, /content\.contentKey === skyPlacementContentKey\(expected\.planet, expected\.sign\)/);
assert.match(app, /source\.placementSource === expected\.placementSource/);
assert.match(app, /const generatedSection = generatedSkyPlacementWritingSection/);
assert.match(
  app,
  /const sections = generatedSection \? \[generatedSection\] : fallbackSection \? \[fallbackSection\] : \[\]/
);

assert.match(cron, /generatePlacementCard\?: PlacementGenerator/);
assert.match(cron, /error: "sky-placement-engine-not-ready"/);
assert.match(cron, /SKY_PLACEMENT_BATCH_SIZE/);
assert.match(cron, /result\.lint\?\.score === 3/);
assert.match(cron, /result\.lint\.fails === 0/);
assert.match(cron, /result\.judge\?\.score === 3/);
assert.match(cron, /judgeAutoPublishEnabled\(\)/);
assert.match(cron, /SKY_PLACEMENT_JUDGE_CALIBRATED/);
assert.match(cron, /block_type: "sky_placement"/);
assert.match(cron, /review_state: reviewState/);
assert.match(cron, /placementSource: expectedSource/);

assert.equal(
  vercel.crons.some((entry) => entry.path === "/api/cron/generate-sky-placements"),
  false,
  "Placement cron must remain unscheduled until the engine and all source files land."
);

console.log("Sky-placement app integration contract passed.");
