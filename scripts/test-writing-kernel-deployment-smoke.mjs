#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let valid = true;
const requests = [];
const server = http.createServer((req, res) => {
  requests.push({ url: req.url, authorization: req.headers.authorization });
  res.setHeader("content-type", "application/json");
  res.statusCode = valid ? 200 : 503;
  res.end(JSON.stringify(valid
    ? { ok: true, check: "writing-kernel-index-current", indexSha256: "a".repeat(64) }
    : { ok: false, check: "writing-kernel-index-current", error: "KNOWLEDGE_SOURCE_MISSING" }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

function runSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/smoke-writing-kernel-deployment.mjs"], {
      cwd: root,
      env: { ...process.env, PRODUCTION_BASE_URL: baseUrl, CONTENT_GENERATION_SECRET: "fixture-secret" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

try {
  const passed = await runSmoke();
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /Deployed writing-kernel smoke passed/u);
  assert.equal(requests[0]?.authorization, "Bearer fixture-secret");

  valid = false;
  const failed = await runSmoke();
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Deployed writing-kernel smoke failed/u);
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log("Writing-kernel deployment smoke contract passed: valid index succeeds and missing runtime evidence fails closed.");
