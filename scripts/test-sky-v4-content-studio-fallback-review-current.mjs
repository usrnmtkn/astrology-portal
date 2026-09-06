import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const panel = fs.readFileSync(path.join(root, "apps/admin/src/SkyV4StudioReviewPanel.tsx"), "utf8");
const variantEditor = fs.readFileSync(path.join(root, "apps/admin/src/SkyFallbackVariantFamilyEditor.tsx"), "utf8");

assert.match(panel, /Continuous placement editor/u);
assert.match(panel, /Main reader copy/u);
assert.match(panel, /Legacy serving fallback/u);
assert.match(panel, /SkyFallbackVariantFamilyEditor/u);
assert.match(panel, /Review all 120 legacy continuous fallbacks/u);
assert.match(panel, /fallback\.hook/u);
assert.match(panel, /fallback\.lived/u);
assert.match(panel, /fallback\.turn/u);
assert.match(panel, /reviewStatus:\s*"needs_review"/u);
assert.match(panel, /announceContentUpdate/u);

const saveDraftStart = panel.indexOf("async function saveDraft");
const saveDraftEnd = panel.indexOf("async function saveCurrentGroupedDraft", saveDraftStart);
assert.ok(saveDraftStart >= 0 && saveDraftEnd > saveDraftStart, "Expected saveDraft helper.");
const saveDraft = panel.slice(saveDraftStart, saveDraftEnd);
assert.doesNotMatch(saveDraft, /serving_enabled|servingEnabled/u, "Legacy draft saves must not mutate serving state.");

assert.match(variantEditor, /Evergreen fallback variant family/u);
assert.match(variantEditor, /selection never mixes sections across lanes/u);
assert.match(variantEditor, /skyFallbackVariantFamilyDraft/u);
assert.match(variantEditor, /packageDraft:\s*rowEffectiveRecord\(row\)/u);
assert.match(variantEditor, /reviewStatus:\s*"needs_review"/u);
assert.match(variantEditor, /Stage preview · serving OFF/u);
assert.match(variantEditor, /selectionLockKey/u);
assert.doesNotMatch(variantEditor, /serving_enabled\s*:/u, "Evergreen variant-family drafts must not mutate serving state.");

console.log("Current-main SKY V4 fallback review contract passed: legacy serving fallback remains intact and evergreen event-locked variant families are draft-only.");
