#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("api/admin/generated-content.ts", "utf8");
const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const runtime = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");
const preview = fs.readFileSync("api/admin/natal-placement-preview.ts", "utf8");
const prepopulate = fs.readFileSync("api/admin/prepopulate-content.ts", "utf8");
const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");

assert.match(api, /expectedUpdatedAt\?: string/u);
assert.match(api, /Published rows cannot be hard-deleted/u);
assert.match(api, /A row already exists for this content key/u);
assert.match(api, /encodeGeneratedContentCursor/u);
assert.match(dashboard, /expectedUpdatedAt/u);
assert.doesNotMatch(dashboard, /scope === "compatibility" \? cursor[\s\S]{0,180}: `&offset=\$\{offset\}`/u);
assert.match(runtime, /\.rpc\("content_runtime_revision"/u);
assert.match(runtime, /isFallbackDashboardRecordAllowed/u);
assert.match(preview, /isFallbackDashboardRecordAllowed/u);
assert.match(signal, /subscribeToContentUpdates/u);
assert.doesNotMatch(signal, /clearSharedGeneratedContentCache\(\)/u);
assert.match(app, /subscribeToContentUpdates\(\(\) => \{[\s\S]{0,300}clearSharedGeneratedContentCache\(\)/u);
assert.match(app, /clearPlanetTopicVocabularyCache\(\)/u);
assert.match(app, /clearNatalCardTaglineCache\(\)/u);
assert.match(prepopulate, /skippedLiveRows/u);
assert.match(prepopulate, /params\.set\("status", "neq\.LIVE"\)/u);
assert.doesNotMatch(prepopulate, /resolution=merge-duplicates/u);
assert.match(migration, /generated_interpretations_provider_updated_idx/u);
assert.match(migration, /generated_interpretations_active_serving_updated_idx/u);
assert.match(migration, /content_runtime_revision/u);

console.log("Content Studio hydration reliability wiring passed.");
