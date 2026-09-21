import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { previewCompressionPlugin } from "./preview-compression-plugin.mjs";

const directory = await mkdtemp(join(tmpdir(), "reader-preview-"));
try {
  await mkdir(join(directory, "dist"));
  await writeFile(join(directory, "dist/app.js"), "export const ready = true;");
  await writeFile(join(directory, "outside.js"), "must not serve");
  await symlink(join(directory, "outside.js"), join(directory, "dist/escape.js"));
  let middleware;
  await previewCompressionPlugin().configurePreviewServer({ config: { root: directory, build: { outDir: "dist" } }, middlewares: { use(value) { middleware = value; } } });
  const request = async (url, headers = { "accept-encoding": "gzip, br" }, method = "GET") => {
    const result = { next: false, headers: {} };
    await middleware({ url, method, headers }, { setHeader(key, value) { result.headers[key] = value; }, end(body) { result.body = body; } }, () => { result.next = true; });
    return result;
  };
  const compressed = await request("/app.js");
  assert.equal(compressed.headers["Content-Encoding"], "gzip");
  assert.equal(gunzipSync(compressed.body).toString(), "export const ready = true;");
  assert.equal(compressed.headers["Content-Type"], "application/javascript; charset=utf-8");
  assert.equal((await request("/app.js", { "accept-encoding": "gzip;q=0, br" })).next, true);
  assert.equal((await request("/app.js", {})).next, true);
  assert.equal((await request("/app.js", { "accept-encoding": "gzip", range: "bytes=0-2" })).next, true);
  assert.equal((await request("/app.js", { "accept-encoding": "gzip" }, "HEAD")).body, undefined);
  for (const path of ["/api/data", "/escape.js", "/..%2foutside.js", "/missing.js"]) assert.equal((await request(path)).next, true);
} finally { await rm(directory, { recursive: true, force: true }); }
console.log("Preview gzip preserves asset bytes, negotiation, HEAD/range handling, and build-directory boundaries.");
