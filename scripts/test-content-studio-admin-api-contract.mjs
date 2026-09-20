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

for (const value of [null, [], true, 12, "invalid"]) {
  await assert.rejects(() => readAdminJsonBody(requestFrom([JSON.stringify(value)])), error => error.statusCode === 400);
  await assert.rejects(() => readAdminJsonBody(Object.assign(requestFrom([]), { body: value })), error => error.statusCode === 400);
}
assert.deepEqual(await readAdminJsonBody(Object.assign(requestFrom([]), { body: { ok: true } })), { ok: true });
assert.deepEqual(await readAdminJsonBody(Object.assign(requestFrom([]), { body: '{"ok":true}' })), { ok: true });
await assert.rejects(() => readAdminJsonBody(Object.assign(requestFrom([]), { body: { text: "a".repeat(100) } }), 32), error => error.statusCode === 413);

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
  "api/admin/sky-article-facts.ts",
  "api/admin/personal-transit-writing.ts"
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
assert.doesNotMatch(prepopulate, /method: "PATCH"/u, "Prepopulation must preserve every saved row.");
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
const reviewRecordsFast = source("api/admin/review-records-fast.ts");
assert.match(reviewRecordsFast, /supplementalOnly: true/u, "Default Studio review-records must stay cheap.");
const adminVite = source("apps/admin/vite.config.ts");
assert.match(adminVite, /rewriteLocalApiPath/u, "Local Studio must apply Vercel API rewrites.");
assert.match(adminVite, /vercel\.json/u, "Local Studio API rewrites must come from vercel.json.");
assert.match(source("vercel.json"), /review-records-fast/u, "Production Studio must route default review-records through the cheap handler.");

const personalTransitWriter = source("api/admin/personal-transit-writing.ts");
assert.match(personalTransitWriter, /sendAdminMethodNotAllowed\(res, \["POST"\]\)/u);
assert.match(personalTransitWriter, /saved: false/u);
assert.match(personalTransitWriter, /published: false/u);
assert.match(personalTransitWriter, /action === "recheck"/u);
assert.doesNotMatch(personalTransitWriter, /saveDraft/u);

const contract = JSON.parse(source("apps/web/src/content/fallbackArchitectureV3/contracts/CONTENT-ROLE-CONTRACT.json"));
const taurusSteady = (contract.styleRules?.bannedWordAllowances ?? []).find((item) => item.words?.includes("steadier"));
assert.ok(taurusSteady?.contentKeyPattern, "Taurus steady family needs a Studio content-key allowance.");
const taurusSteadyKey = new RegExp(taurusSteady.contentKeyPattern, "u");
assert.equal(taurusSteadyKey.test("fallback-hook/zodiac-season/taurus"), true);
assert.equal(taurusSteadyKey.test("sky-placement/article/sun/taurus"), true);
assert.equal(taurusSteadyKey.test("sky-placement/article/sun/virgo"), false);
const generatedContent = source("api/admin/generated-content.ts");
assert.match(generatedContent, /isBannedWordAllowedForContentKey/u);
assert.match(generatedContent, /bannedWordAllowances/u);

console.log("Content Studio admin API contract passed.");
