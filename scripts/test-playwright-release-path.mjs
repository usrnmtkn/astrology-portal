#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browserTestWebServer } from "../playwright.config.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientQaRunner = fs.readFileSync(path.join(repoRoot, "scripts/run-client-facing-qa-report.mjs"), "utf8");
const adminQaRunner = fs.readFileSync(path.join(repoRoot, "scripts/run-admin-content-qa-report.mjs"), "utf8");

const local = browserTestWebServer("http://127.0.0.1:4190");
assert.ok(local, "Local Playwright routes must manage their own preview server.");
assert.match(local.command, /npm run build:web/u, "Local browser tests must build the current web checkout.");
assert.match(local.command, /--port 4190/u, "The managed preview must use the requested local port.");
assert.equal(local.reuseExistingServer, false, "A pre-existing preview must never count as release evidence.");
assert.equal(local.url, "http://127.0.0.1:4190");

assert.equal(
  browserTestWebServer("https://tldrastro.vercel.app"),
  undefined,
  "Production verification must target production rather than starting a local substitute."
);

assert.match(clientQaRunner, /baseURL: "http:\/\/127\.0\.0\.1:4173"/u);
assert.match(clientQaRunner, /baseURL: "http:\/\/127\.0\.0\.1:4174"/u);
assert.match(adminQaRunner, /baseURL: "http:\/\/127\.0\.0\.1:4175"/u);
assert.match(
  clientQaRunner,
  /PLAYWRIGHT_BASE_URL: suite\.baseURL/u,
  "Each client QA subprocess must receive its dedicated preview URL."
);
assert.match(
  adminQaRunner,
  /PLAYWRIGHT_BASE_URL: suite\.baseURL/u,
  "The admin QA subprocess must receive its dedicated preview URL."
);

console.log("Playwright release-path freshness contract passed.");
