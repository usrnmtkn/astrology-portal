import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failHealth = false;
let failReportFulfillment = false;
const requests = [];
const server = http.createServer((req, res) => {
  requests.push({ url: req.url });
  res.setHeader("content-type", "application/json");
  if (req.url === "/api/health") {
    const reportFulfillmentOk = !failReportFulfillment;
    const ok = !failHealth && reportFulfillmentOk;
    res.statusCode = ok ? 200 : 503;
    res.end(JSON.stringify({
      ok,
      status: ok ? "ok" : "degraded",
      dependencies: {
        reportFulfillment: {
          ok: reportFulfillmentOk,
          detail: {
            controlRowAvailable: reportFulfillmentOk,
            billingMode: "free_test"
          }
        }
      }
    }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Not found." }));
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
  assert.deepEqual(requests.map((request) => request.url), ["/api/health"]);

  requests.length = 0;
  failReportFulfillment = true;
  const reportFailed = await runSmoke();
  assert.notEqual(reportFailed.status, 0);
  assert.match(reportFailed.stderr, /Health smoke failed|Report fulfillment health contract failed/u);
  assert.deepEqual(requests.map((request) => request.url), ["/api/health"]);

  requests.length = 0;
  failReportFulfillment = false;
  failHealth = true;
  const healthFailed = await runSmoke();
  assert.notEqual(healthFailed.status, 0);
  assert.match(healthFailed.stderr, /Health smoke failed/u);
  assert.deepEqual(requests.map((request) => request.url), ["/api/health"]);
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log("Production report smoke contract passed: public health must include a healthy report-fulfillment dependency, and non-200 fails closed.");
