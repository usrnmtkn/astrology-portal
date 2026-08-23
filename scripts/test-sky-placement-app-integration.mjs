import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { isLegacyLiveBase, isReusableLiveTopper, requiresBaseRegeneration } = require("../src/astro-writing/skyPlacementCachePolicy.cjs");

const app = read("apps/web/src/App.tsx");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const generatedContentKeys = read("apps/web/src/services/generatedContentKeys.ts");
const migration = read(
  "apps/web/supabase/migrations/20260726203000_generated_content_sky_placement_block_type.sql"
);
const cron = read("api/cron/generate-sky-placements.ts");
const placementGenerator = read("packages/astro-knowledge/scripts/generate-sky-aspect-cards.js");
const generatedContentAdmin = read("api/admin/generated-content.ts");
const userContentRoute = read("api/generate-user-content.ts");
const dashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const vercel = JSON.parse(read("vercel.json"));

assert.match(generatedContent, /\|\s+"sky_placement"/);
assert.match(
  migration,
  /'fallback_aspect'[\s\S]*'fallback_hook'[\s\S]*'fallback_template'/,
  "Placement migration must preserve the production fallback block types."
);
assert.match(migration, /'sky_placement'/);

assert.match(
  generatedContentKeys,
  /export function skyPlacementBaseContentKey\(body: string, sign: string\)[\s\S]*`sky\.placement\.base\.\$\{moduleContentPart\(body\)\}\.\$\{moduleContentPart\(sign\)\}`/
);
assert.match(
  generatedContentKeys,
  /export function skyPlacementTopperContentKey\([\s\S]*`sky\.placement\.topper\./
);
assert.match(
  app,
  /const sections = fallbackSection \? \[fallbackSection\] : \[\];/,
  "Sky Placement reader pages must resolve from the governed fallback package only."
);
assert.match(app, /const hasProductionSection = fallbackSection\?\.layer === "authored";/);
assert.doesNotMatch(app, /generatedSkyPlacementWritingSection/);
assert.doesNotMatch(app, /compiledSkyArticleWritingSection/);
assert.doesNotMatch(app, /generatedSkyPlacementTopper/);
assert.doesNotMatch(app, /skyPlacementBaseContentKey/);
assert.doesNotMatch(app, /skyPlacementTopperContentKey/);
assert.match(generatedContent, /const isSkyPlacementWorkspace = row\.content_key\.startsWith\("sky\.placement\."\)/);
assert.match(generatedContent, /!isSynastryGeneratedLane && !isSkyPlacementWorkspace/);
assert.match(generatedContent, /writer,[\s\S]*judge,[\s\S]*owner-review tooling/);

assert.match(cron, /generatePlacementCard\?: PlacementGenerator/);
assert.match(cron, /error: "sky-placement-engine-not-ready"/);
assert.match(cron, /SKY_PLACEMENT_BATCH_SIZE/);
assert.match(cron, /result\.lint\?\.score === 3/);
assert.match(cron, /result\.lint\.fails === 0/);
assert.match(cron, /judge_score: result\.judge\?\.score \?\? null/);
assert.match(cron, /prepareProductionPreCallGate\(input\)/);
assert.match(cron, /assertProductionPreCallGate\(gate, \{ role: "WRITER"/);
assert.match(cron, /assertProductionPreCallGate\(gate, \{ role: "REVIEWER"/);
assert.match(cron, /judgeBeforeProviderCall/);
assert.match(cron, /knowledge_ids: \[placementKnowledgeId\(args\)\]/);
assert.match(cron, /status: "DRAFT"/);
assert.match(cron, /lane: "reference"/);
assert.doesNotMatch(cron, /judgeAutoPublishEnabled|topperAutoPublishEnabled|promoteTopper|SKY_PLACEMENT_JUDGE_CALIBRATED|SKY_PLACEMENT_TOPPER_JUDGE_CALIBRATED/);
assert.match(cron, /block_type: "sky_placement"/);
assert.match(cron, /return `sky\.placement\.base\.\$\{planet\.replace/);
assert.match(cron, /content_key: "like\.sky\.placement\.base\.\*"/);
assert.match(cron, /status: "eq\.LIVE",[\s\S]*lane: "eq\.serving",[\s\S]*review_state: "is\.null",[\s\S]*judge_gate: "eq\.human-review"/);
assert.match(cron, /currentSkyFacts\(new Date\(\)\)/);
assert.match(cron, /currentPlacementPriority\(positions\)/);
assert.match(cron, /requiresBaseRegeneration\(existing, staleBefore\)/);
assert.match(cron, /\.\.\.legacy, \.\.\.missing, \.\.\.stale/);
assert.match(cron, /review_state: reviewState/);
assert.match(cron, /placementSource: expectedSource/);
assert.match(cron, /placementDerivation: result\.facts\?\.derivedFrom \?\? null/);
assert.match(cron, /return `data\/placements\/sign\/south-node-\$\{sign\}\.json`/);
assert.doesNotMatch(cron, /north-node-\$\{oppositeSign/);
assert.match(placementGenerator, /`south-node-\$\{sign\}\.json`/);
assert.doesNotMatch(placementGenerator, /`north-node-\$\{OPPOSITE_SIGN\[sign\]\}\.json`/);
assert.match(cron, /SKY_PLACEMENT_TOPPERS_ENABLED/);
assert.match(cron, /const topperMaxOrb = 1/);
assert.match(cron, /generatePlacementTopper\?: PlacementTopperGenerator/);
assert.match(cron, /event_type: "collective-placement-topper"/);
assert.match(cron, /judgedCombination: "topper-plus-unchanged-base"/);
assert.match(cron, /The tight current aspect has separated/);
assert.match(cron, /toppers: await syncPlacementToppers\(sky\)/);
assert.match(cron, /isReusableLiveTopper\(existing, clean\)/);
assert.match(generatedContentAdmin, /skyBlockType === "sky_placement"/);
assert.match(generatedContentAdmin, /judgeGate === "human-review"/);
assert.match(generatedContentAdmin, /legacyAutoPublishEligible = skyBlockType === "sky_aspect"/);
assert.match(
  generatedContentAdmin,
  /if \(existingRow\?\.status === "LIVE"\)[\s\S]*skippedLiveRows\.push[\s\S]*return false/,
  "Admin bulk import must preserve LIVE rows without changing their gate or serving state."
);
assert.match(
  generatedContentAdmin,
  /if \(body\.status === "LIVE"\)[\s\S]*assertCanPublishGeneratedContent/,
  "Individual admin publication must pass the explicit publication contract."
);
assert.match(userContentRoute, /user_generated_interpretations/);
assert.match(userContentRoute, /input\.status === "LIVE" && isAdminRequest\(req\) \? "LIVE" : "DRAFT"/);
assert.doesNotMatch(
  userContentRoute,
  /\/rest\/v1\/generated_interpretations\?/,
  "User-content status preservation operates on a separate user-scoped table and cannot revive a global placement row."
);


assert.equal(
  vercel.crons.some((entry) => entry.path === "/api/cron/generate-sky-placements"),
  true,
  "Placement cron must be scheduled after owner-approved enablement."
);
assert.deepEqual(
  vercel.crons.find((entry) => entry.path === "/api/cron/generate-sky-placements"),
  {
    path: "/api/cron/generate-sky-placements",
    schedule: "25 10 * * *"
  }
);
assert.match(
  dashboard,
  /\["sky_aspect", "sky_placement"\]\.includes\(row\.block_type \?\? ""\)[\s\S]*row\.judge_gate === "human-review"/
);
assert.match(
  dashboard,
  /\["sky_aspect", "sky_placement"\]\.includes\(row\.block_type \?\? ""\)[\s\S]*row\.judge_gate === "auto-publish"/
);
assert.match(dashboard, /source\?\.skyPlacementJudge/);
assert.match(dashboard, /isPlacement \? "Placement" : "Pair"/);
assert.match(dashboard, /isPlacement \? "Sign" : "Signs"/);

const legacyAutoPublishLiveTopper = {
  status: "LIVE",
  judge_gate: "auto-publish",
  judge_score: 3
};
assert.equal(
  isReusableLiveTopper(legacyAutoPublishLiveTopper, true),
  false,
  "A legacy LIVE auto-publish topper must fall through to regeneration instead of being cached."
);
assert.equal(
  isReusableLiveTopper({ ...legacyAutoPublishLiveTopper, judge_gate: "human-review" }, true),
  true,
  "An explicitly human-reviewed LIVE topper may be reused."
);
assert.equal(
  isReusableLiveTopper({ ...legacyAutoPublishLiveTopper, judge_gate: "human-review" }, false),
  false,
  "A lint-dirty LIVE topper must not be reused."
);
const freshUpdatedAt = new Date().toISOString();
assert.equal(isLegacyLiveBase(legacyAutoPublishLiveTopper), true);
assert.equal(isLegacyLiveBase({ ...legacyAutoPublishLiveTopper, judge_gate: "human-review" }), false);
assert.equal(
  requiresBaseRegeneration({ ...legacyAutoPublishLiveTopper, updated_at: freshUpdatedAt }, Date.now() - 1_000),
  true,
  "A fresh legacy LIVE auto-publish base must be regenerated under the human-review contract."
);
assert.equal(
  requiresBaseRegeneration({ ...legacyAutoPublishLiveTopper, judge_gate: "human-review", updated_at: freshUpdatedAt }, Date.now() - 1_000),
  false,
  "A fresh explicitly human-reviewed LIVE base may remain cached."
);

console.log("Sky-placement app integration contract passed.");
