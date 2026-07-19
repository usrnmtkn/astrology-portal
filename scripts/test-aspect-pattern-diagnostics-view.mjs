import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const component = read("apps/admin/src/AspectPatternDiagnostics.tsx");
const dashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const fixtureEndpoint = read("api/admin/aspect-pattern-fixtures.ts");
const styles = read("apps/admin/src/admin.css");

assert.match(component, /function canonicalAspectPatterns\(response: AspectPatternsResponse \| null\) {\n  return response\?\.sky\?\.aspectPatterns \?\? null;\n}/);
assert.match(component, /includeAspectPatterns=true/);
assert.match(component, /includeAspectPatternCopy=true/);
assert.match(component, /fetch\(url, \{ method: "GET" \}\)/);
assert.doesNotMatch(component, /\bmethod:\s*"(POST|PUT|PATCH|DELETE)"/);
assert.match(component, /No API request is made until you ask for it/);
assert.match(component, /payload\.ranking\?\.displayOrder/);
assert.match(component, /complete aspectPatterns response/);
assert.match(component, /Geometry warnings/);
assert.match(component, /Reasons/);
assert.match(component, /\["Apex", "none"\]/);
assert.match(component, /sourceAspectMap/);
assert.match(component, /deg separation/);
assert.match(component, /deg orb/);

assert.match(dashboard, /aspectDiagnostics: "diagnostics\/aspect-patterns"/);
assert.match(dashboard, /AspectPatternDiagnostics/);
assert.match(dashboard, /Aspect Diagnostics/);

assert.match(fixtureEndpoint, /req\.method !== "GET"/);
assert.match(fixtureEndpoint, /includeAspectPatternCopy/);
assert.match(fixtureEndpoint, /sky: {\n      aspects:/);
assert.match(fixtureEndpoint, /aspectPatterns/);

assert.match(styles, /aspect-diagnostics-page/);
assert.match(styles, /aspect-pattern-card-grid/);
assert.match(styles, /aspect-diagnostics-raw pre/);

console.log("Aspect-pattern diagnostics view contract tests passed.");
