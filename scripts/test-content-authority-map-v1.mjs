import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));
const nonblank = (value) => typeof value === "string" && value.trim().length > 0;

const map = readJson("config/content-authority-map-v1.json");
assert.equal(map.schema, "tldrastro-content-authority-map/v1");
assert.ok(Array.isArray(map.families) && map.families.length >= 8);
assert.deepEqual(map.readerEligibility.databaseOverlay.required, {
  status: "LIVE",
  lane: "serving",
  review_state: null
});

const ids = map.families.map((family) => family.id);
assert.equal(new Set(ids).size, ids.length, "Authority family IDs must be unique.");
for (const family of map.families) {
  assert.ok(nonblank(family.ownerAuthority), `${family.id}: ownerAuthority is required.`);
  assert.ok(nonblank(family.servingSource), `${family.id}: servingSource is required.`);
  assert.ok(nonblank(family.resolver), `${family.id}: resolver is required.`);
  assert.ok(Array.isArray(family.readerDestinations) && family.readerDestinations.length > 0, `${family.id}: readerDestinations are required.`);
  assert.ok(nonblank(family.failurePolicy), `${family.id}: failurePolicy is required.`);
  assert.doesNotMatch(String(family.ownerAuthority), /\/dist\/|bundled-/u, `${family.id}: generated/dist artifacts cannot be semantic owner authority.`);
}

for (const requiredId of [
  "personal-transit-you",
  "personal-transit-friends",
  "sky-exact-aspects",
  "sky-placement-continuous",
  "sky-placement-lunar-context",
  "sky-placement-house-horoscopes",
  "natal-aspect-patterns",
  "friends-pair-daily"
]) {
  assert.ok(ids.includes(requiredId), `Missing authority family: ${requiredId}`);
}

for (const requiredPath of [
  "apps/admin/src/writingSurfaceSourceMap.ts",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json",
  "apps/web/src/content/fallbackArchitectureV3Runtime.ts",
  "apps/web/src/services/generatedContent.ts",
  "apps/web/src/services/skyAspectRouting.ts",
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-house-templates-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/skyPlacementHouseSetGuard.mjs",
  "apps/web/src/content/fallbackArchitectureV3SkyPlacementBundle.ts",
  "apps/web/src/services/natalAspectPatterns.ts",
  "api/admin/aspect-pattern-writeups.ts",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-frames-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-clauses-v1.json"
]) {
  assert.ok(exists(requiredPath), `Authority contract path is missing: ${requiredPath}`);
}

const transitSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const transitBundle = readJson("apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json");
const transitRows = transitSource.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
const bundledTransitRows = transitBundle.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
assert.equal(transitRows.length, 378, "Canonical transit authority must contain 378 rows.");
assert.equal(new Set(transitRows.map((row) => row.contentKey)).size, 378, "Canonical transit keys must be unique.");
assert.equal(bundledTransitRows.length, 378, "Bundled transit serving projection must contain 378 rows.");
assert.equal(transitRows.filter((row) => nonblank(row.body_you)).length, 378, "You transit coverage must stay 378/378.");
assert.equal(transitRows.filter((row) => nonblank(row.body_they)).length, 377, "Friends transit explicit copy coverage must stay 377/378 until the intentional gap is resolved.");
const blankFriends = transitRows.filter((row) => !nonblank(row.body_they)).map((row) => row.contentKey);
assert.deepEqual(blankFriends, ["authored/transit-aspect/venus/moon/hard"], "Only the governed Venus/Moon Friends gap may be blank.");
const bundledTransitByKey = new Map(bundledTransitRows.map((row) => [row.contentKey, row]));
for (const row of transitRows) {
  const bundled = bundledTransitByKey.get(row.contentKey);
  assert.ok(bundled, `${row.contentKey}: missing from bundled transit serving projection.`);
  assert.equal(bundled.body_you, row.body_you, `${row.contentKey}: You source/bundle drift.`);
  assert.equal(bundled.body_they ?? "", row.body_they ?? "", `${row.contentKey}: Friends source/bundle drift.`);
}

const friendsOwnerLive = readJson("packages/astro-knowledge/review/transit-aspect-friends-nonsun-350-owner-live-2026-09-03.json");
assert.equal(Number(friendsOwnerLive.count), 350, "Non-Sun Friends owner-live authority must remain 350 rows.");
const sunFriends = transitRows.filter((row) => String(row.contentKey).startsWith("authored/transit-aspect/sun/") && nonblank(row.body_they));
assert.equal(sunFriends.length, 27, "Sun Friends authority must remain 27 rows; 350 + 27 = 377 explicit Friends passages.");

const exactSky = readJson("packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json");
assert.equal(Number(exactSky.rowCount), 248, "Exact Sky authority must contain 248 payloads.");
assert.equal(exactSky.payloadSetSha256, "b3b2a90a00241dff84b271bb8d7d9ac5ed539ff8b7a1c1505ce34c7283233d60", "Exact Sky payload-set authority drifted.");
assert.equal(Object.keys(exactSky.payloads ?? {}).length, 248, "Exact Sky payload object count must match rowCount.");

const continuous = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json");
assert.equal(continuous.owner_approved, true, "Continuous Sky V4 package must remain owner-approved.");
assert.equal(continuous.serving_enabled, true, "Continuous Sky V4 package must remain serving-enabled.");
assert.equal(Number(continuous.expected_records), 120, "Continuous Sky V4 authority must remain 120 records.");

const lunar = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json");
assert.equal(lunar.owner_approved, true, "Sky V4 lunar context must remain owner-approved.");
assert.equal(lunar.serving_enabled, true, "Sky V4 lunar context must remain serving-enabled.");
assert.equal(Number(lunar.expected_records), 40, "Sky V4 lunar context authority must remain 40 records.");

const houseOwner = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json");
const houseRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-house-templates-v1.json");
const jupiterLeoOwner = houseOwner.rows
  .filter((row) => String(row.contentKey ?? "").startsWith("house-horoscope-core/jupiter/leo/house-"))
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey, undefined, { numeric: true }));
assert.equal(jupiterLeoOwner.length, 12, "Jupiter in Leo owner authority must remain complete at 12/12.");
assert.ok(jupiterLeoOwner.every((row) => row.review_status === "approved" && nonblank(row.body_you)), "All 12 Jupiter in Leo passages must remain approved and nonblank.");
const houseRowsByKey = new Map(houseRows.rows.map((row) => [row.contentKey, row]));
for (const ownerRow of jupiterLeoOwner) {
  const servingRow = houseRowsByKey.get(ownerRow.contentKey);
  assert.ok(servingRow, `${ownerRow.contentKey}: missing from house serving source.`);
  assert.equal(servingRow.body_you, ownerRow.body_you, `${ownerRow.contentKey}: owner/serving house passage drift.`);
}
const houseGuardSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/skyPlacementHouseSetGuard.mjs"), "utf8");
assert.match(houseGuardSource, /owner|approved|partial|drift|12/iu, "House-set guard must retain owner/completeness/drift enforcement semantics.");

const unresolved = readJson("packages/astro-knowledge/generated/content-unresolved-queue-v1.json");
assert.equal(Number(unresolved.count), unresolved.items.length, "Unresolved queue count must equal item count.");
assert.equal(Object.values(unresolved.reasonCounts ?? {}).reduce((sum, value) => sum + Number(value), 0), unresolved.items.length, "Unresolved reason counts must sum to item count.");

const generatedContentSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/generatedContent.ts"), "utf8");
assert.match(generatedContentSource, /\.eq\("status", "LIVE"\)[\s\S]{0,180}\.eq\("lane", "serving"\)[\s\S]{0,180}\.is\("review_state", null\)/u, "Reader database hydration must require LIVE + serving + null review_state.");

console.log(JSON.stringify({
  authorityFamilies: map.families.length,
  transit: { rows: 378, you: 378, friends: 377, intentionalFriendsBlank: blankFriends[0] },
  skyExact: { rows: 248, payloadSetSha256: exactSky.payloadSetSha256 },
  skyV4: { continuous: 120, lunarContext: 40 },
  jupiterLeo: { ownerApprovedHousePassages: 12 },
  unresolvedQueue: { count: unresolved.count, reasons: unresolved.reasonCounts },
  databaseEligibilityContract: "LIVE + serving + null review_state"
}, null, 2));
