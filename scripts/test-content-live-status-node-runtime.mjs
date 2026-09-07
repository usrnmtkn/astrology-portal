import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { transform } from "esbuild";
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
  fs.writeFileSync(destination, /\.tsx?$/u.test(relative)
    ? (await transform(text, { loader: relative.endsWith(".tsx") ? "tsx" : "ts", format: "esm", target: "node22" })).code
    : text);
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
  await emit("apps/web/src/content/skyDailySummaryCatalog.ts");
  await emit("api/admin/content-publication.ts");
  await emit("api/admin/natal-placement-preview.ts");
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
    const { default: publicationHandler } = await import("./api/admin/content-publication.js");
    await publicationHandler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 401);
    const { default: previewHandler } = await import("./api/admin/natal-placement-preview.js");
    await previewHandler({ headers: {}, method: "POST" }, response);
    assert.equal(response.statusCode, 401);
    console.log("PASS: production-style Node ESM starts Content Live Status and reaches authorization");
  `], { cwd: output, encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30_000 });
  process.stdout.write(result);
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
