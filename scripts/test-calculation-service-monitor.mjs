import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const summaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tldrastro-calculation-monitor-"));

let mode = "healthy";
let requestCount = 0;
const server = http.createServer((req, res) => {
  if (req.url !== "/api/health?scope=ephemeris") {
    res.statusCode = 404;
    res.end("{}");
    return;
  }

  requestCount += 1;
  res.setHeader("content-type", "application/json");

  if (mode === "health_down") {
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, status: "degraded" }));
    return;
  }

  if (mode === "hang") return;
  const dependencies = { ephemeris: { ok: mode !== "runtime_down", elapsedMs: 10, code: "invalid_facts", detail: { actualEngine: "swiss" } } };
  if (mode === "healthy" || mode === "recovers_after_two" || mode === "stale" || mode === "runtime_down") {
    const failing = mode === "recovers_after_two" && requestCount < 3;
    dependencies.skyCalculationApi = failing
      ? { ok: false, elapsedMs: 12, error: "500 Internal Server Error from https://calculation.invalid/health: empty body" }
      : { ok: true, elapsedMs: 71, detail: { host: "calculation.invalid", actualEngine: "swiss" } };
  } else if (mode === "calculation_down") {
    dependencies.skyCalculationApi = {
      ok: false,
      elapsedMs: 413,
      code: "unready", error: "The calculation service is unready"
    };
  }

  res.statusCode = 200;
  const ok = Object.values(dependencies).every(dependency => dependency.ok);
  res.end(JSON.stringify({ schema: "ephemeris-health/v1", timestamp: new Date(Date.now() - (mode === "stale" ? 300_000 : 0)).toISOString(), ok, status: ok ? "ok" : "degraded", dependencies }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

function runMonitor(summaryName, { attempts = "1", delayMs = "0", timeoutMs = "1000" } = {}) {
  const summaryPath = path.join(summaryRoot, summaryName);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/monitor-calculation-service.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PRODUCTION_BASE_URL: baseUrl,
        CALCULATION_MONITOR_ATTEMPTS: attempts,
        CALCULATION_MONITOR_DELAY_MS: delayMs,
        CALCULATION_MONITOR_TIMEOUT_MS: timeoutMs,
        CALCULATION_MONITOR_REPORT_PATH: summaryPath + ".json",
        CALCULATION_MONITOR_SUMMARY_PATH: summaryPath
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({
      code,
      stdout,
      stderr,
      summary: fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, "utf8") : "",
      report: fs.existsSync(summaryPath + ".json") ? JSON.parse(fs.readFileSync(summaryPath + ".json", "utf8")) : null
    }));
  });
}

try {
  mode = "healthy";
  requestCount = 0;
  const healthy = await runMonitor("healthy.md");
  assert.equal(healthy.code, 0, `A reachable calculation service must pass:\n${healthy.stderr}`);
  assert.match(healthy.stdout, /calculation\.invalid answered in 71ms/u, "A passing run must name the host and its response time.");
  assert.match(healthy.summary, /The calculation service is answering/u);

  mode = "calculation_down";
  requestCount = 0;
  const down = await runMonitor("down.md", { attempts: "2" });
  assert.equal(down.code, 1, "An unreachable calculation service must fail the monitor.");
  assert.equal(requestCount, 2, "The monitor must use every configured attempt before reporting an outage.");
  assert.match(down.summary, /The calculation service is not answering/u);
  assert.match(down.summary, /unready/u, "The summary must carry the reason the service gave.");
  assert.match(down.summary, /gcloud logging read/u, "The summary must say where to look next.");
  assert.match(down.summary, /report fulfillment, Friends relationship facts/u, "The summary must name what else is failing.");

  // Production health stays ok:true during a calculation outage by design, so the
  // monitor must read the dependency rather than the overall status.
  mode = "health_down";
  requestCount = 0;
  const healthDown = await runMonitor("health-down.md");
  assert.equal(healthDown.code, 1, "A health endpoint that cannot be read must fail the monitor.");
  assert.match(healthDown.summary, /answered 503/u);

  mode = "missing_dependency";
  requestCount = 0;
  const missing = await runMonitor("missing.md");
  assert.equal(missing.code, 1, "A deployment without the calculation check must fail rather than report green.");
  assert.match(missing.summary, /missing, stale, or invalid/u);

  mode = "recovers_after_two";
  requestCount = 0;
  const recovering = await runMonitor("recovering.md", { attempts: "4" });
  assert.equal(recovering.code, 0, "A service that recovers within the retry window must not raise an outage.");
  assert.equal(requestCount, 3, "The monitor must stop retrying once the service answers.");
  for (const scenario of ["stale", "runtime_down", "hang"]) {
    mode = scenario; requestCount = 0;
    const result = await runMonitor(`${scenario}.md`, { timeoutMs: "100" });
    assert.equal(result.code, 1, `${scenario} must not report healthy`);
    assert.equal(result.report.ok, false);
    assert.equal(result.report.schema, "ephemeris-monitor/v1");
  }
  assert.equal(healthy.report.ok, true);
} finally {
  server.closeAllConnections();
  server.close();
  fs.rmSync(summaryRoot, { recursive: true, force: true });
}

console.log("Calculation service monitor passed: healthy pass, sustained outage, unreadable health, missing dependency, and recovery inside the retry window.");
