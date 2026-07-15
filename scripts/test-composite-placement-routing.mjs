import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const keySource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/generatedContentKeys.ts"), "utf8");
const placementRowsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/PlacementRows.tsx"), "utf8");
const fallbackTemplateSource = fs.readFileSync(path.join(repoRoot, "scripts/content-source/tldrastro-fallback-templates-rows.json"), "utf8");
const emergencyCopy = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/emergencyCopy.json"), "utf8"));

assert(keySource.includes("function compositePointContentKey"), "Missing composite point content key builder");
assert(keySource.includes("function compositeSignContentKey"), "Missing composite sign content key builder");
assert(keySource.includes("function compositeHouseContentKey"), "Missing composite house content key builder");

const compositeHelperMatch = appSource.match(/function compositePlacementContentKeys[\s\S]+?return Array\.from\(keys\);\n}/);
assert(compositeHelperMatch, "Missing compositePlacementContentKeys helper");

const compositeHelper = compositeHelperMatch[0];
for (const required of [
  "compositeHouseContentKey(point, house)",
  "compositeSignContentKey(point, sign)",
  "compositePointContentKey(point)"
]) {
  assert(compositeHelper.includes(required), `Composite helper is missing ${required}`);
}

for (const forbidden of [
  "skyPlacementContentKey",
  "natalSignContentKey",
  "placementContentId(point, sign",
  "`relationship-${",
  "`sky-${",
  "`natal-${"
]) {
  assert(!compositeHelper.includes(forbidden), `Composite helper must not request broad/non-composite placement key: ${forbidden}`);
}

assert(
  appSource.includes("compositePlacementContentKeys(row.label, row.sign, row.house)"),
  "Composite placement rows must use compositePlacementContentKeys"
);
assert(
  !appSource.includes('relationshipPlacementContentKeys(row.label, row.sign, "composite", row.house)'),
  "Composite placement rows must not use relationshipPlacementContentKeys"
);
assert(
  placementRowsSource.includes('generatedContext === "composite" ? [] : dignitiesFor(row.label, row.sign)'),
  "Composite placement rows must suppress natal dignity badges"
);

const compositeFallback = emergencyCopy.templates?.["friends.composite-placement"] ?? "";
for (const required of ["composite chart", "{{planetTopic}}", "{{signStyle}}", "{{houseLifeArea}}"]) {
  assert(fallbackTemplateSource.includes(required), `Composite fallback source must include ${required}`);
  assert(compositeFallback.includes(required), `Generated composite fallback must include ${required}`);
}

for (const forbidden of ["Season begins", "New Moon asks", "Composite {{planet}} is in {{sign}}."]) {
  assert(!fallbackTemplateSource.includes(forbidden), `Composite fallback source contains forbidden copy: ${forbidden}`);
  assert(!compositeFallback.includes(forbidden), `Generated composite fallback contains forbidden copy: ${forbidden}`);
}

console.log("Composite placement routing ok: composite rows use only composite keys and suppress natal dignity badges.");
