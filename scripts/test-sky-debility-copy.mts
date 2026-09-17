import assert from "node:assert/strict";
import { skyDebilityDefaults, skyDebilityFields, skyDebilityTemplateErrors } from "../apps/web/src/content/skyDebilityCatalog.ts";
import { resolveSkyDebilityCopy } from "../apps/web/src/content/skyDebilityCopy.ts";
import { traditionalSkyDebilities } from "../apps/web/src/services/planetSignDignity.mjs";
for (const field of skyDebilityFields) {
  assert.equal(skyDebilityTemplateErrors(field.key, field.body).join(" | "), "");
}

assert.ok(skyDebilityTemplateErrors("cms/sky-debility/many", "Two planets.").some(error => error.includes("{count}")));
assert.ok(skyDebilityTemplateErrors("cms/sky-debility/countLabel", "{count} of {total} {planetWord}").some(error => error.includes("unsupported")));

const snapshot = traditionalSkyDebilities([
  { planet: "Mars", sign: "Cancer" },
  { planet: "Saturn", sign: "Aries" },
  { planet: "Sun", sign: "Virgo" },
  { planet: "Uranus", sign: "Gemini" }
]);
assert.equal(snapshot.count, 2);
const bundled = resolveSkyDebilityCopy(undefined, snapshot);
assert.equal(bundled.titleLead, skyDebilityDefaults.titleLead);
assert.equal(bundled.titleSoft, skyDebilityDefaults.titleSoft);
assert.equal(bundled.countLabel, "2 of 7");
assert.equal(bundled.countUnit, "planets");
assert.equal(bundled.body, "2 of 7 planets are in detriment or fall. They do not have access to their usual tools.");
assert.equal(bundled.accessibleName, "Without their tools");

function liveRow(contentKey: string, body: string, status: "LIVE" | "DRAFT" = "LIVE") {
  return { id: `live:${contentKey}`, contentKey, body, status, updatedAt: "2026-09-16T00:00:00.000Z" };
}

const override = resolveSkyDebilityCopy(new Map([
  ["cms/sky-debility/titleLead", liveRow("cms/sky-debility/titleLead", "Missing")],
  ["cms/sky-debility/titleSoft", liveRow("cms/sky-debility/titleSoft", "their tools")],
  ["cms/sky-debility/many", liveRow("cms/sky-debility/many", "{count} of the {total} planets are working without the usual kit.")]
]) as never, snapshot);
assert.equal(override.titleLead, "Missing");
assert.equal(override.body, "2 of the 7 planets are working without the usual kit.");

const draftIgnored = resolveSkyDebilityCopy(new Map([
  ["cms/sky-debility/many", liveRow("cms/sky-debility/many", "{count} DRAFT", "DRAFT")]
]) as never, snapshot);
assert.equal(draftIgnored.body, bundled.body);

const empty = resolveSkyDebilityCopy(undefined, traditionalSkyDebilities([]));
assert.equal(empty.body, "None of the 7 planets are in detriment or fall.");
assert.equal(empty.countUnit, "planets");
const one = resolveSkyDebilityCopy(undefined, traditionalSkyDebilities([{ planet: "Saturn", sign: "Aries" }]));
assert.equal(one.countUnit, "planet");
assert.match(one.body, /^1 of 7 planets is /);
