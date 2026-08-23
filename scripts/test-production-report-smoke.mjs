import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failHealth = false;
const requests = [];
const server = http.createServer((req, res) => {
  requests.push({
    url: req.url,
    authorization: req.headers.authorization,
    contentGenerationSecret: req.headers["x-content-generation-secret"]
  });
  res.setHeader("content-type", "application/json");
  if (req.url === "/api/health") {
    res.statusCode = failHealth ? 503 : 200;
    res.end(JSON.stringify({ ok: !failHealth, status: failHealth ? "degraded" : "ok" }));
    return;
  }
  if (
    req.url === "/api/admin/report-fulfillment"
    && req.headers.authorization === "Bearer fixture-secret"
    && req.headers["x-content-generation-secret"] === "fixture-secret"
  ) {
    res.statusCode = 200;
    res.end(JSON.stringify({ billingMode: "free_test", reports: [], users: [] }));
    return;
  }
  res.statusCode = 401;
  res.end(JSON.stringify({ error: "Unauthorized." }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

function runSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/smoke-production-report-deployment.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        CONTENT_GENERATION_SECRET: "fixture-secret",
        PRODUCTION_BASE_URL: baseUrl,
        PRODUCTION_SMOKE_ATTEMPTS: "1",
        PRODUCTION_SMOKE_DELAY_MS: "0"
      },
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
  assert.match(passed.stdout, /Production report smoke passed/u);
  assert.deepEqual(requests.map((request) => request.url), ["/api/health", "/api/admin/report-fulfillment"]);
  assert.equal(requests[1].authorization, "Bearer fixture-secret");
  assert.equal(requests[1].contentGenerationSecret, "fixture-secret");

  requests.length = 0;
  failHealth = true;
  const failed = await runSmoke();
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Health smoke failed/u);
  assert.deepEqual(requests.map((request) => request.url), ["/api/health"]);
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log("Production report smoke contract passed: health and authenticated admin are mandatory, and non-200 fails closed.");
