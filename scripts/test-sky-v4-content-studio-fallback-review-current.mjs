import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const panel = fs.readFileSync(path.join(root, "apps/admin/src/SkyV4StudioReviewPanel.tsx"), "utf8");

assert.match(panel, /Continuous placement editor/u);
assert.match(panel, /Main reader copy/u);
assert.match(panel, /Fallback copy/u);
assert.match(panel, /Review all 120 continuous fallbacks/u);
assert.match(panel, /fallback\.hook/u);
assert.match(panel, /fallback\.lived/u);
assert.match(panel, /fallback\.turn/u);
assert.match(panel, /reviewStatus:\s*"needs_review"/u);
assert.match(panel, /announceContentUpdate/u);

const saveDraftStart = panel.indexOf("async function saveDraft");
const saveDraftEnd = panel.indexOf("async function saveCurrentGroupedDraft", saveDraftStart);
assert.ok(saveDraftStart >= 0 && saveDraftEnd > saveDraftStart, "Expected saveDraft helper.");
const saveDraft = panel.slice(saveDraftStart, saveDraftEnd);
assert.doesNotMatch(saveDraft, /serving_enabled|servingEnabled/u, "Draft saves must not mutate serving state.");

console.log("Current-main SKY V4 fallback review contract passed.");
