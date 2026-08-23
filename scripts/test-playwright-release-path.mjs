#!/usr/bin/env node

import assert from "node:assert/strict";
import { browserTestWebServer } from "../playwright.config.ts";

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

console.log("Playwright release-path freshness contract passed.");
