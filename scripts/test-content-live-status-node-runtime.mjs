import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build, transform } from "esbuild";
import ts from "typescript";

// Vercel emits separate JavaScript modules. A bundled test or tsx loader can
// hide extensionless imports that plain Node rejects before authorization.
const root = process.cwd();
const output = fs.mkdtempSync(path.join(os.tmpdir(), "studio-node-runtime-"));
const visited = new Set();
async function emit(relative) {
  if (visited.has(relative)) return;
  visited.add(relative);
  const input = path.join(root, relative);
  const text = fs.readFileSync(input, "utf8");
  const destination = path.join(output, relative.replace(/\.tsx?$/u, ".js"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const compiled = /\.tsx?$/u.test(relative)
    ? (await transform(text, { loader: relative.endsWith(".tsx") ? "tsx" : "ts", format: "esm", target: "node22" })).code
    : text;
  // Vercel resolves a sibling module named with its .ts extension; this copy is JavaScript, so a
  // relative .ts specifier is pointed at the module emitted from it rather than reported missing.
  fs.writeFileSync(destination, compiled.replace(/(\bfrom\s*["']\.[^"']*|\bimport\(\s*["']\.[^"']*)\.tsx?(["'])/gu, "$1.js$2"));
  if (relative.endsWith(".json")) return;
  const dependencies = [
    ...ts.preProcessFile(fs.readFileSync(destination, "utf8"), true, true).importedFiles.map((item) => item.fileName),
    ...[...text.matchAll(/\brequire\(["']([^"']+)["']\)/gu)].map((match) => match[1])
  ];
  for (const dependency of dependencies.filter((item) => item.startsWith("."))) {
    const resolved = path.resolve(path.dirname(input), dependency);
    const candidates = [resolved, resolved.replace(/\.js$/u, ".ts"), `${resolved}.ts`, `${resolved}.js`, `${resolved}.json`];
    const source = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert(source, `Missing dependency: ${relative} -> ${dependency}`);
    await emit(path.relative(root, source));
  }
}

try {
  fs.writeFileSync(path.join(output, "package.json"), '{"type":"module"}');
  await emit("api/admin/content-live-status.ts");
  await emit("api/admin/sky-article-facts.ts");
  await emit("apps/web/src/content/skyDailySummaryCatalog.ts");
  await emit("api/admin/content-publication.ts");
  await emit("api/admin/natal-placement-preview.ts");
  await emit("api/admin/transit-natal-preview.ts");
  // The library exports are re-exported from other handlers, and a .ts import specifier here fails
  // only once Node loads the emitted modules.
  await emit("api/admin/generated-content-libraries.ts");
  await emit("api/admin/generated-content.ts");
  // Export is loaded only after authentication, so entry-point authorization
  // checks do not exercise its emitted dependency graph.
  await emit("api/_lib/studio-variable-export.ts");
  await emit("src/shared/features/calendar/calendarOverviewResolve.ts");
  await emit("api/content-publications.ts");
  await emit("api/admin/review-records.ts");
  // Keep the shared chart module's emitted imports unchanged. Rewriting its
  // specifiers masks missing-source failures in the deployed review handler.
  await build({
    entryPoints: ["apps/web/src/services/chartMath.ts", "apps/web/src/astrologyConfig.ts"],
    outdir: output, outbase: root, bundle: false, platform: "node", format: "esm", target: "node22", logLevel: "silent"
  });
  const result = execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    const { skySummaryTemplateErrors } = await import("./apps/web/src/content/skyDailySummaryCatalog.js");
    assert.deepEqual(skySummaryTemplateErrors("cms/sky-daily-summary/lunation", "The next {name} arrives in {sign} {countdown}."), []);
    process.env.NODE_ENV = "production";
    process.env.CONTENT_GENERATION_SECRET = "node-runtime-test";
    const { default: handler } = await import("./api/admin/content-live-status.js");
    const response = { statusCode: 0, setHeader() {}, end(body) { this.body = body; } };
    await handler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(JSON.parse(response.body).error, "Unauthorized.");
    const { default: articleFactsHandler } = await import("./api/admin/sky-article-facts.js");
    await articleFactsHandler({ headers: {}, method: "GET" }, response);
    assert.equal(response.statusCode, 401);
    const { default: publicationHandler } = await import("./api/admin/content-publication.js");
    await publicationHandler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 401);
    const { default: previewHandler } = await import("./api/admin/natal-placement-preview.js");
    await previewHandler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 401);
    const { default: transitPreviewHandler } = await import("./api/admin/transit-natal-preview.js");
    await transitPreviewHandler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 401);
    const libraries = await import("./api/admin/generated-content-libraries.js");
    assert.equal(typeof libraries.astro101PublicationIssue, "function");
    const { default: generatedContentHandler } = await import("./api/admin/generated-content.js");
    await generatedContentHandler({ headers: {}, method: "GET", url: "/api/admin/generated-content?writingProfiles=true" }, response);
    assert.equal(response.statusCode, 401, "The generated-content entry must load in plain Node before rejecting anonymous profile access");
    process.env.SUPABASE_URL = "https://node-export.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "node-export-fixture";
    const sourceKey = "fallback-hook/house-meaning/4";
    const savedText = "Synthetic saved export opening.\\n\\nSynthetic saved export final sentence.";
    let storageReads = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://node-export.invalid");
      assert.equal(url.pathname, "/rest/v1/generated_interpretations");
      assert.equal(options.method ?? "GET", "GET", "Compiled export must remain read-only");
      assert.equal(url.searchParams.get("content_key"), "in.(" + sourceKey + ")");
      storageReads++;
      return Response.json([{content_key:sourceKey,status:"DRAFT",updated_at:"2026-11-14T00:00:00Z",body:savedText,sections:{}}]);
    };
    try {
      await generatedContentHandler({headers:{authorization:"Bearer node-runtime-test"},method:"GET",
        url:"/api/admin/generated-content?variables=export&sourceKey=" + encodeURIComponent(sourceKey)}, response);
      assert.equal(response.statusCode, 200, response.body);
      const page = JSON.parse(response.body);
      assert.equal(page.ok, true);
      assert.equal(page.schema, "studio-variable-export/v1");
      assert.equal(storageReads, 1);
      const {expandVariableExportRows, studioVariableExportCsv} = await import("./apps/admin/src/studioVariableExport.js");
      const rows = expandVariableExportRows(page);
      assert(rows.some(row => row.token === "{{houseMeaning}}" && row.version === "Saved draft" && row.field === "body" && row.content === savedText));
      assert(studioVariableExportCsv(rows).includes(savedText), "Compiled CSV helper preserves the complete saved passage");
    } finally { globalThis.fetch = originalFetch; }
    const { calendarTemplateSegments } = await import("./src/shared/features/calendar/calendarOverviewResolve.js");
    assert.equal(calendarTemplateSegments("Synthetic {{date}}.", { date: { text: "October 21", kind: "fact" } }).map(part => part.text).join(""), "Synthetic October 21.");
    const { default: ledgerHandler } = await import("./api/content-publications.js");
    await ledgerHandler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 405, "Public ledger must start in plain Node before handling requests");
    const { default: reviewHandler } = await import("./api/admin/review-records.js");
    await reviewHandler({ headers: {}, method: "GET" }, response);
    assert.equal(response.statusCode, 401, "Review records must load their emitted calculation dependencies before authorization");
    console.log("PASS: production-style Node ESM reaches authorization and exports complete saved writing through the authenticated handler");
  `], { cwd: output, encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30_000 });
  process.stdout.write(result);
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
