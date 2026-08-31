import assert from "node:assert/strict";
import {
  parseYouTab,
  youTabFromHref,
  youTabHref
} from "../apps/web/src/features/you/youRouting.ts";

assert.equal(parseYouTab("chart"), "chart");
assert.equal(parseYouTab("transits"), "transits");
assert.equal(parseYouTab("unknown"), "transits");

assert.equal(youTabFromHref("https://example.com/#you"), "transits");
assert.equal(youTabFromHref("https://example.com/#you?tab=chart"), "chart");
assert.equal(youTabFromHref("https://example.com/#you?tab=unknown"), "transits");
assert.equal(youTabFromHref("https://example.com/#sky"), "transits");
assert.equal(youTabFromHref("not a URL"), "transits");

const chartUrl = new URL(youTabHref("https://example.com/?date=2026-08-31#you", "chart"));
assert.equal(chartUrl.searchParams.get("date"), "2026-08-31");
assert.equal(chartUrl.hash, "#you?tab=chart");

const transitsUrl = new URL(youTabHref(chartUrl.toString(), "transits"));
assert.equal(transitsUrl.searchParams.get("date"), "2026-08-31");
assert.equal(transitsUrl.hash, "#you");

console.log("You routing tests passed.");
