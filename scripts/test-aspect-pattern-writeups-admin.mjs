import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function invokeHandler(handler, method, url, body) {
  return new Promise((resolve) => {
    const chunks = [];
    const req = {
      method,
      url,
      headers: {},
      body,
      [Symbol.asyncIterator]: async function* iterator() {
        if (body) yield Buffer.from(JSON.stringify(body));
      }
    };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      }
    };
    handler(req, res);
  });
}

const dashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const component = read("apps/admin/src/AspectPatternWriteups.tsx");
const endpoint = read("api/admin/aspect-pattern-writeups.ts");
const styles = read("apps/admin/src/admin.css");

assert.match(dashboard, /aspectPatternCoverage:\s*"content\/aspect-patterns"/);
assert.match(dashboard, /aspectPatternActivationCoverage:\s*"content\/aspect-patterns\/activation"/);
assert.match(dashboard, /<AspectPatternWriteups initialKind="natal" secret=\{secret\} \/>/);
assert.match(dashboard, /<AspectPatternWriteups initialKind="activation" secret=\{secret\} \/>/);

assert.match(component, /Natal Write-ups/);
assert.match(component, /Active Now Write-ups/);
for (const field of ["eyebrow", "headline", "overview", "how_it_works", "planet_roles", "pressure_or_support", "derived_point", "watch_for", "confidence_note"]) {
  assert.match(component, new RegExp(field), `Natal field ${field} must be represented.`);
}
for (const field of ["current_emphasis", "transit_trigger", "pattern_role", "linked_patterns", "timing"]) {
  assert.match(component, new RegExp(field), `Activation field ${field} must be represented.`);
}
assert.match(component, /Approved slots/);
assert.match(component, /insertSlot/);
assert.match(component, /Production resolver preview/);
assert.match(component, /Authored result/);
assert.match(component, /Approved fallback/);
assert.match(component, /Publish approved/);
assert.match(component, /validation\.errors/);
assert.doesNotMatch(component, /detectPatterns|rankAspectPatterns|buildPatternActivations/, "Admin component must not rebuild astrology math.");

assert.match(endpoint, /generated_interpretations/);
assert.match(endpoint, /action === "preview"/);
assert.match(endpoint, /resolveAspectPatternCopy\(context, \{ authoredRecords/);
assert.match(endpoint, /resolveAspectPatternActivationCopy\(context, \{ authoredRecords/);
assert.match(endpoint, /validateAuthoredAspectPatternRecord/);
assert.match(endpoint, /validateAuthoredAspectPatternActivationRecord/);
assert.match(endpoint, /Cannot approve/);
assert.doesNotMatch(endpoint, /detectGrandSquares|detectGrandTrines|detectKites|detectMysticRectangles|detectTSquares|detectYods/, "Admin write-up endpoint must not change or call individual detectors.");
assert.match(styles, /aspect-writeups-page/);
assert.match(styles, /aspect-writeups-compare/);

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { default: handler } = await vite.ssrLoadModule("/api/admin/aspect-pattern-writeups.ts");
  const natalResponse = await invokeHandler(handler, "GET", "/api/admin/aspect-pattern-writeups?kind=natal");
  assert.equal(natalResponse.statusCode, 200);
  const natal = JSON.parse(natalResponse.body);
  assert.equal(natal.ok, true);
  assert.equal(natal.rows.length, 6);
  assert.equal(natal.summary.totalRoutes, 6);
  assert.ok(natal.rows.every((row) => row.contentLevels.some((level) => level.contentLevel === "source_grounded_template")));
  assert.ok(natal.rows.every((row) => row.contentLevels.some((level) => level.contentLevel === "madlib_fallback")));
  assert.ok(natal.rows.every((row) => row.contentLevels.some((level) => level.contentLevel === "emergency_fallback")));
  assert.ok(natal.rows.every((row) => row.previews.length > 0));
  assert.ok(natal.rows.every((row) => row.previews.every((preview) => preview.authored.source.recordId && preview.fallback.source.recordId)));
  assert.ok(natal.slots.includes("pattern_name"));
  assert.ok(natal.fieldOrder.includes("how_it_works"));

  const activationResponse = await invokeHandler(handler, "GET", "/api/admin/aspect-pattern-writeups?kind=activation");
  assert.equal(activationResponse.statusCode, 200);
  const activation = JSON.parse(activationResponse.body);
  assert.equal(activation.ok, true);
  assert.equal(activation.rows.length, 8);
  assert.equal(activation.summary.totalRoutes, 8);
  assert.ok(activation.rows.every((row) => row.targetRoleLabel));
  assert.ok(activation.slots.includes("primary_moving_body"));
  assert.ok(activation.fieldOrder.includes("current_emphasis"));
  assert.ok(activation.governedConditions.includes("shared natal planet"));

  const badRecord = JSON.parse(JSON.stringify(natal.rows.find((row) => row.patternType === "yod").record));
  badRecord.content.overview = "This is your fate and {{unknown_slot}}.";
  badRecord.status = "approved";
  const previewResponse = await invokeHandler(handler, "POST", "/api/admin/aspect-pattern-writeups", {
    kind: "natal",
    action: "preview",
    record: badRecord
  });
  assert.equal(previewResponse.statusCode, 200);
  const preview = JSON.parse(previewResponse.body);
  assert.equal(preview.ok, true);
  assert.ok(preview.previews.some((item) => item.validation.unknownSlots.includes("unknown_slot")));
  assert.ok(preview.previews.some((item) => item.validation.errors.some((error) => /prohibited|yod/i.test(error))));
} finally {
  await vite.close();
}

console.log("Aspect-pattern write-up admin tests passed.");
