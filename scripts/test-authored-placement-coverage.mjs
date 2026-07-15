#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const fallbackRowsPath = path.join(repoRoot, "scripts/content-source/tldrastro-fallback-templates-rows.json");
const emergencyCopyPath = path.join(repoRoot, "apps/web/src/content/emergencyCopy.json");
const appPath = path.join(repoRoot, "apps/web/src/App.tsx");

const fallbackPayload = JSON.parse(fs.readFileSync(fallbackRowsPath, "utf8"));
const fallbackRows = fallbackPayload.rows ?? fallbackPayload.templateRows ?? [];
const emergencyCopy = JSON.parse(fs.readFileSync(emergencyCopyPath, "utf8"));
const appSource = fs.readFileSync(appPath, "utf8");

const requiredNatalHooks = [
  {
    key: "fallback-hook/you.natal-placement",
    template: "you.natal-placement",
    requiredSlots: ["{{possessive}}", "{{planet}}", "{{sign}}"]
  },
  {
    key: "fallback-hook/you.natal-house-placement",
    template: "you.natal-house-placement",
    requiredSlots: ["{{possessive}}", "{{planet}}", "{{house}}", "{{houseLifeArea}}"]
  }
];

const forbiddenReaderCopy = [
  /reviewed placement bank/i,
  /use the calculated/i,
  /this placement becomes concrete/i,
  /this is where/i,
  /move(?:s|d)? through/i,
  /SOURCE_GAP/i,
  /DRAFT/i
];

function assertTemplateContract(label, body, requiredSlots) {
  assert.ok(body && typeof body === "string", `${label} must have template body copy.`);
  assert.ok(/[.!?]$/.test(body.trim()), `${label} must end as a sentence.`);
  assert.ok(body.split(/(?<=[.!?])\s+/).filter(Boolean).length >= 2, `${label} must provide more than one sentence.`);

  for (const slot of requiredSlots) {
    assert.ok(body.includes(slot), `${label} must include ${slot}.`);
  }

  for (const pattern of forbiddenReaderCopy) {
    assert.equal(pattern.test(body), false, `${label} must not expose forbidden reader copy ${pattern}: ${body}`);
  }
}

for (const hook of requiredNatalHooks) {
  const sourceRow = fallbackRows.find((row) => row.contentKey === hook.key);
  assert.ok(sourceRow, `${hook.key} must exist in fallback template source rows.`);
  assert.equal(sourceRow.kind, "template", `${hook.key} must remain a fallback template row.`);
  assert.equal(sourceRow.tag, "template", `${hook.key} must remain tagged as template.`);
  assertTemplateContract(`${hook.key} source`, sourceRow.body, hook.requiredSlots);

  const generatedTemplate = emergencyCopy.templates?.[hook.template] ?? "";
  assertTemplateContract(`${hook.template} generated emergency template`, generatedTemplate, hook.requiredSlots);
}

assert.ok(
  appSource.includes("isPromotedEmergencyFloorContent"),
  "App runtime must explicitly recognize promoted sparse floor rows."
);
assert.ok(
  appSource.includes("model === \"compiled-phrasebank-authored-placement-floor\""),
  "Sparse promoted placement rows must not be treated as emergency fallback content."
);
assert.ok(
  appSource.includes("contentKey.startsWith(\"fallback-hook/you.\")"),
  "Natal placement runtime must still allow fallback-hook/you.* rows as the emergency floor."
);

console.log(JSON.stringify({
  status: "PASS",
  checkedHooks: requiredNatalHooks.length,
  contract: "natal placement emergency floor is fallback hooks plus vocab, not promoted sparse content rows"
}, null, 2));
