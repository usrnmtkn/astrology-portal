#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Readable } from "node:stream";
import {
  AdminHttpError,
  readAdminJsonBody,
  sendAdminMethodNotAllowed
} from "../api/_lib/admin-http.ts";

function source(path) {
  return fs.readFileSync(path, "utf8");
}

function requestFrom(chunks, headers = {}) {
  const req = Readable.from(chunks);
  req.headers = headers;
  return req;
}

const valid = await readAdminJsonBody(requestFrom([Buffer.from('{"ok":true}')], { "content-length": "11" }));
assert.deepEqual(valid, { ok: true });

await assert.rejects(
  () => readAdminJsonBody(requestFrom([Buffer.from('{nope')]), 1024),
  (error) => error instanceof AdminHttpError && error.statusCode === 400
);
await assert.rejects(
  () => readAdminJsonBody(requestFrom([Buffer.alloc(33)]), 32),
  (error) => error instanceof AdminHttpError && error.statusCode === 413
);

const response = {
  statusCode: 0,
  headers: new Map(),
  body: "",
  setHeader(name, value) { this.headers.set(String(name).toLowerCase(), String(value)); },
  end(value) { this.body = String(value ?? ""); }
};
sendAdminMethodNotAllowed(response, ["GET", "PATCH"]);
assert.equal(response.statusCode, 405);
assert.equal(response.headers.get("allow"), "GET, PATCH");
assert.equal(response.headers.get("cache-control"), "no-store");

const helper = source("api/_lib/admin-http.ts");
assert.match(helper, /AbortController/u);
assert.match(helper, /AdminHttpError\(504/u);

const contentFacts = source("api/admin/content-facts.ts");
assert.match(contentFacts, /readAdminJsonBody/u);
assert.match(contentFacts, /sendAdminMethodNotAllowed\(res, \["POST"\]\)/u);
assert.match(contentFacts, /AdminHttpError\(400/u);
assert.doesNotMatch(contentFacts, /async function readJsonBody/u);

const personalized = source("api/admin/user-generated-content.ts");
assert.match(personalized, /expectedUpdatedAt/u);
assert.match(personalized, /updated_at: `eq\.\$\{body\.expectedUpdatedAt\}`/u);
assert.match(personalized, /AdminHttpError\(409/u);
assert.match(personalized, /AdminHttpError\(404/u);
assert.match(personalized, /order: startDate \|\| endDate \? "target_date\.asc\.nullslast,id\.asc" : "updated_at\.desc,id\.desc"/u);
assert.match(personalized, /adminFetch/u);
assert.doesNotMatch(personalized, /async function readJsonBody/u);

const reviewEvents = source("api/admin/content-review-events.ts");
assert.match(reviewEvents, /order: "last_seen_at\.desc,fingerprint\.asc"/u);
assert.match(reviewEvents, /adminFetch/u);
assert.match(reviewEvents, /sendAdminMethodNotAllowed/u);

const skyHorizon = source("api/admin/sky-review-horizon.ts");
assert.match(skyHorizon, /const pageSize = 500/u);
assert.match(skyHorizon, /order: "id\.asc"/u);
assert.match(skyHorizon, /params\.set\("id", `gt\.\$\{cursorId\}`\)/u);
assert.doesNotMatch(skyHorizon, /limit: "5000"/u);
assert.match(skyHorizon, /AdminHttpError\(400/u);
assert.match(skyHorizon, /adminFetch/u);

for (const path of [
  "api/admin/content-unresolved.ts",
  "api/admin/content-unresolved-resolutions.ts",
  "api/admin/content-source-repair-decisions.ts",
  "api/admin/sky-article-facts.ts"
]) {
  const text = source(path);
  assert.match(text, /sendAdminMethodNotAllowed/u, `${path} must advertise allowed methods.`);
  assert.match(text, /sendAdminJson/u, `${path} must use non-cacheable admin responses.`);
}

const unresolvedResolution = source("api/admin/content-unresolved-resolutions.ts");
assert.match(unresolvedResolution, /readAdminJsonBody<unknown>\(req, 32_000\)/u);
assert.match(unresolvedResolution, /adminErrorStatus/u);
const sourceDecision = source("api/admin/content-source-repair-decisions.ts");
assert.match(sourceDecision, /readAdminJsonBody<unknown>\(req, 32_000\)/u);
assert.match(sourceDecision, /AdminHttpError\(409/u);

for (const path of [
  "api/admin/prepopulate-content.ts",
  "api/admin/natal-placement-preview.ts",
  "api/admin/sky-v4-preview.ts",
  "api/admin/review-records.ts"
]) {
  const text = source(path);
  assert.match(text, /from "\.\.\/_lib\/admin-http\.js"/u, `${path} must use the shared admin HTTP contract.`);
  assert.match(text, /sendAdminMethodNotAllowed/u, `${path} must emit Allow on 405.`);
  assert.match(text, /sendAdminJson/u, `${path} must be no-store.`);
}

const prepopulate = source("api/admin/prepopulate-content.ts");
assert.match(prepopulate, /params\.set\("status", "neq\.LIVE"\)/u, "Prepopulation must retain the atomic LIVE guard.");
assert.match(prepopulate, /readAdminJsonBody/u);
assert.match(prepopulate, /adminFetch/u);
assert.doesNotMatch(prepopulate, /async function readJsonBody/u);

const natalPreview = source("api/admin/natal-placement-preview.ts");
assert.match(natalPreview, /readAdminJsonBody<unknown>\(req, 512_000\)/u);
assert.doesNotMatch(natalPreview, /async function readJsonBody/u);
const skyV4Preview = source("api/admin/sky-v4-preview.ts");
assert.match(skyV4Preview, /readAdminJsonBody<unknown>\(req, 1_000_000\)/u);
assert.doesNotMatch(skyV4Preview, /async function readJsonBody/u);

const reviewRecords = source("api/admin/review-records.ts");
assert.match(reviewRecords, /adminFetch/u);
assert.match(reviewRecords, /AdminHttpError\(400/u);
assert.match(reviewRecords, /sendAdminMethodNotAllowed\(res, \["GET"\]\)/u);

console.log("Content Studio admin API contract passed.");
