import { createHash } from "node:crypto";
import supplied from "../apps/admin/src/skySummaryImportedCopy.json";
import { importedSkySummary } from "../apps/admin/src/skySummaryImportedCopy.ts";
import assert from "node:assert/strict";
import { buildSkySummaryComposition } from "../apps/admin/src/skySummaryComposition.ts";
import { skyDailySummaryParts } from "../apps/web/src/content/skyDailySummary.ts";
import { skySummarySigns } from "../apps/web/src/content/skyDailySummaryCatalog.ts";
for (const sun of skySummarySigns) for (const moon of skySummarySigns) {
  const preview = buildSkySummaryComposition(sun, moon, [], false);
  assert.deepEqual(preview.parts, skyDailySummaryParts({ sun: { sign: sun }, moon: { sign: moon }, moonIsVoid: false }));
  assert.equal(preview.joined, sun === "Virgo" && moon === "Cancer");
  const working = buildSkySummaryComposition(sun, moon, [], true);
  assert.equal(working.joined, true);
  const text = working.parts.map(part => part.text).join("");
  for (const [planet, sign] of [["sun", sun], ["moon", moon]]) {
    assert.ok(text.includes(importedSkySummary(`cms/sky-daily-summary/${planet}/${sign.toLowerCase()}`)!));
  }
  assert.ok(!text.includes("..") && !text.includes(".,") && !text.includes("—"));
}
const key = "cms/sky-daily-summary/sun/virgo";
const row = { content_key: key, body: "Test draft", status: "DRAFT", lane: "serving", review_state: "EDITORIAL_REVIEW_REQUIRED" };
const rendered = (working: boolean, draft?: {contentKey:string;body:string}) => buildSkySummaryComposition("Virgo", "Cancer", [row], working, draft).parts.map(part => part.text).join("");
assert.ok(rendered(true).includes("Test draft"));
assert.ok(!rendered(false).includes("Test draft"));
assert.ok(rendered(true, { contentKey: key, body: "Test unsaved copy" }).includes("Test unsaved copy"));
assert.ok(!rendered(false, { contentKey: key, body: "Test unsaved copy" }).includes("Test unsaved copy"));
assert.ok(buildSkySummaryComposition("Virgo", "Cancer", [row], true, {contentKey:key,body:"Test—invalid"}).errors.length);
assert.ok(buildSkySummaryComposition("Virgo", "Cancer", [{...row, inventory_only:true}], true).errors.length);
assert.ok(!buildSkySummaryComposition("Virgo", "Cancer", [{...row,status:"ARCHIVED"}], true).parts.some(part => part.text.includes("Test draft")));
console.log("Sky composition: all 144 pairs match reader assembly; draft, reader, unsaved, invalid, loading, and archived states passed.");

assert.equal(supplied.rows.length, 24);
for (const row of supplied.rows) {
  assert.equal(createHash("sha256").update(row.body).digest("hex"), row.sha256);
  assert.equal(row.body.split(/\s+/u).length, row.wordCount);
}
assert.equal(supplied.provenance.promotionAuthorized, false);

const revised = supplied.rows.find(row => row.key === "cms/sky-daily-summary/sun/virgo")!.body;
const revisedPreview = buildSkySummaryComposition("Virgo", "Cancer", [], true);
assert.ok(revisedPreview.parts.some(part => part.text === `, ${revised},`));
assert.ok(revisedPreview.parts.map(part => part.text).join("").startsWith(`The Sun is in Virgo, ${revised}, while the Moon moves through Cancer,`));
