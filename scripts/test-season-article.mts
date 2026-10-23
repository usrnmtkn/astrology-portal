import assert from "node:assert/strict";
import { seasonArticleKey, seasonArticleIdentity, seasonArticleForIngress } from "../src/shared/seasonArticle";
import { isSkyWriteupContentRow, articleAppDestination } from "../apps/admin/src/articleWorkspace";
import { contentDestinations } from "../apps/admin/src/contentMotion";
import { skyWriteupContextForRow } from "../apps/admin/src/skyWriteupRelations";
import { skyPlacementBrowseIdentity } from "../apps/admin/src/skyPlacementBrowse";
import { STUDIO_SKY_WRITEUP_PREFIXES } from "../apps/admin/src/studioSectionInventory";

const key = "article/manual/scorpio-season-2026";
assert.equal(seasonArticleKey("Scorpio", 2026), key);
assert.deepEqual(seasonArticleIdentity(key), { sign: "scorpio", year: 2026 });
assert.equal(seasonArticleIdentity("article/manual/scorpio-season-2026-extra"), null);
assert.equal(seasonArticleKey("unknown", 2026), null);
assert.equal(seasonArticleKey("scorpio", NaN), null);
assert.equal(seasonArticleForIngress("scorpio", "invalid", "UTC"), null);
assert.equal(seasonArticleForIngress("Scorpio", "2026-10-23T09:37:57Z", "America/New_York")?.key, key);
assert.equal(seasonArticleForIngress("Scorpio", "2027-10-23T09:00:00Z", "America/New_York")?.key, "article/manual/scorpio-season-2027");
// A season that continues into January belongs to its calculated December ingress.
assert.equal(seasonArticleForIngress("Capricorn", "2026-12-21T20:50:00Z", "America/New_York")?.key, "article/manual/capricorn-season-2026");
// The editorial year follows the selected zone at a boundary, never the browser's zone.
assert.equal(seasonArticleForIngress("Capricorn", "2027-01-01T00:30:00Z", "America/New_York")?.year, 2026);
assert.equal(seasonArticleForIngress("Capricorn", "2027-01-01T00:30:00Z", "Asia/Tokyo")?.year, 2027);
const row = { id: "synthetic-season", content_key: key, headline: "Synthetic complete season article" };
assert.equal(isSkyWriteupContentRow(row), true);
assert.deepEqual([...contentDestinations(row)], ["sky", "calendar"]);
assert.equal(articleAppDestination({ ...row, status: "LIVE" }).label, "Sky & Calendar");
assert.equal(articleAppDestination({ ...row, status: "DRAFT" }).state, "draft");
assert(STUDIO_SKY_WRITEUP_PREFIXES.some(prefix => key.startsWith(prefix)), "Sky inventory must request saved season articles before classifying them.");
assert.deepEqual(skyWriteupContextForRow(row), { planet: "sun", sign: "scorpio" });
assert.deepEqual(skyPlacementBrowseIdentity(row, "Sun in Scorpio"), { title: row.headline, kind: "Season article · 2026" });
console.log("Season article identity, year isolation, and Studio discovery passed.");
