import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  dailyGlanceContextSearchParams,
  dailyGlancePackageField,
  dailyGlancePairSearchText,
  dailyGlancePairs,
  dailyGlanceSelectorLabel
} from "../apps/admin/src/dailyGlanceAdmin.ts";
import {
  dailyGlanceFriendPreviewParts,
  dailyGlanceFriendPreviewSlots,
  dailyGlanceFriendVariableDefinition
} from "../apps/admin/src/dailyGlanceFriendPreview.ts";

const row = (contentKey: string, bodyYou: string, bodyThey: string) => ({
  id: contentKey,
  content_key: contentKey,
  headline: null,
  summary: "Owner-approved daily source",
  body: bodyYou,
  sections: {
    packageRecord: {
      body_you: bodyYou,
      body_they: bodyThey
    }
  }
});

const rows = [
  row("fallback-hook/daily-headline/soft/mars", "Take the useful opening.", "{{personPreferredName}} may take the useful opening."),
  row("fallback-hook/daily-body/soft/mars", "Act before the moment passes.", "{{personPreferredName}} may act before the moment passes."),
  row("fallback-hook/daily-headline/house/7", "Say what the agreement needs.", "{{personPreferredName}} may say what the agreement needs."),
  row("fallback-hook/daily-body/house/7", "Make the shared expectation explicit.", "{{personPreferredName}} may make the shared expectation explicit."),
  row("fallback-hook/daily-headline/square/sun", "Incomplete source", "Incomplete friend source")
];

const pairs = dailyGlancePairs(rows);
assert.equal(pairs.length, 2, "Only complete headline and passage pairs should appear in the combined editor.");
assert.equal(pairs[0]?.label, "7th House fallback");
assert.equal(dailyGlanceSelectorLabel("soft/mars"), "Moon Soft Contact natal Mars");

const mars = pairs.find((pair) => pair.selector === "soft/mars");
assert.ok(mars, "Expected the Moon soft-contact Mars pair.");
assert.equal(dailyGlancePackageField(mars.headlineRow, "body_you"), "Take the useful opening.");
assert.match(dailyGlancePairSearchText(mars), /act before the moment passes/u, "Combined search must include passage copy.");
assert.match(dailyGlancePairSearchText(mars), /personpreferredname/u, "Combined search must include Friend copy.");

const theySlots = dailyGlanceFriendPreviewSlots("Alisa P", "they");
assert.equal(theySlots.personPreferredName, "Alisa P");
assert.equal(theySlots.personObject, "them", "Object pronouns receive an action in the rendered Friend copy.");
assert.equal(theySlots.personReflexive, "themselves", "Reflexive pronouns describe the person acting on themself.");
assert.equal(theySlots.personBePresent, "are");
assert.equal(theySlots.personVerbSuffix, "");

const sheSlots = dailyGlanceFriendPreviewSlots("Alisa P", "she");
assert.equal(sheSlots.personObject, "her");
assert.equal(sheSlots.personReflexive, "herself");
assert.equal(sheSlots.personBePresent, "is");
assert.equal(sheSlots.personVerbSuffix, "s");

const friendParts = dailyGlanceFriendPreviewParts(
  "{{personPreferredName}} gives {{personObject}} time and trusts {{personReflexive}}.",
  theySlots
);
assert.equal(friendParts.map((part) => part.kind === "text" ? part.text : part.value).join(""), "Alisa P gives them time and trusts themselves.");
assert.deepEqual(
  friendParts.filter((part) => part.kind === "variable").map((part) => [part.variable, part.category]),
  [["personPreferredName", "name"], ["personObject", "object"], ["personReflexive", "reflexive"]],
  "Rendered values must keep their source-variable roles for color highlighting."
);
assert.match(dailyGlanceFriendVariableDefinition("personObject").meaning, /receives an action/u);
assert.match(dailyGlanceFriendVariableDefinition("personReflexive").meaning, /acts on themself/u);
const unsupportedName = dailyGlanceFriendPreviewParts("Hello {{Name}}.", theySlots);
assert.deepEqual(
  unsupportedName.filter((part) => part.kind === "variable").map((part) => [part.variable, part.category, part.value]),
  [["Name", "unknown", "{{Name}}"]],
  "Daily must expose unsupported generic Name tokens rather than pretending the runtime can resolve them."
);

const params = dailyGlanceContextSearchParams({
  date: "2026-09-01",
  person: "Alisa P",
  timeZone: "America/Los_Angeles"
});
assert.equal(params.get("surface"), "dailyGlance");
assert.equal(params.get("startDate"), "2026-09-01");
assert.equal(params.get("endDate"), "2026-09-01");
assert.equal(params.get("timeZone"), "America/Los_Angeles", "The browser-local day boundary must reach the calculation API.");

const repoRoot = path.resolve(import.meta.dirname, "..");
const apiSource = fs.readFileSync(path.join(repoRoot, "api/admin/review-records.ts"), "utf8");
assert.match(apiSource, /selectDailyGlanceCivilDayDriver\(/u, "Content Studio must reuse the app's Daily At-a-Glance selector.");
assert.match(apiSource, /skyForDate\(date, timeZone\)/u, "The current Moon must be calculated at the requested local day boundary.");
assert.match(apiSource, /localCalculationTime: "12:00"/u, "The local civil-day calculation time should remain explicit in provenance.");

console.log("Admin Daily At-a-Glance paired editor checks passed.");
