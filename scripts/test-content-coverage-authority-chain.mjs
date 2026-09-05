import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("api/admin/content-coverage.ts", "utf8");
const dashboard = fs.readFileSync("apps/admin/src/ContentCoverageDashboard.tsx", "utf8");

assert.match(api, /config\/content-authority-map-v1\.json/u, "Coverage API must load the normative promotion-authority registry.");
for (const authorityId of [
  "personal-transit-you",
  "personal-transit-friends",
  "sky-exact-aspects",
  "sky-placement-continuous",
  "sky-placement-lunar-context",
  "sky-placement-house-horoscopes"
]) {
  assert.ok(api.includes(`authorityFor("${authorityId}")`), `Coverage API must bind ${authorityId}.`);
}
assert.match(api, /readerEligibility:\s*authorityRegistry\.readerEligibility/u, "Coverage API must expose the database reader-eligibility contract from the authority registry.");
assert.match(dashboard, /Authority chain/u, "Coverage UI must expose the authority chain for each governed corpus.");
assert.match(dashboard, /Owner authority:/u);
assert.match(dashboard, /Studio overlay:/u);
assert.match(dashboard, /Serving source:/u);
assert.match(dashboard, /Resolver:/u);
assert.match(dashboard, /Reader:/u);
assert.match(dashboard, /Fail closed:/u);
assert.match(dashboard, /status = \{payload\.readerEligibility\.status\}/u, "Coverage UI must show the actual database eligibility rule.");
assert.match(dashboard, /Lane alone is not publication authority/u, "Coverage UI must distinguish serving lane from actual reader eligibility.");

console.log("Content coverage authority-chain wiring passed.");
