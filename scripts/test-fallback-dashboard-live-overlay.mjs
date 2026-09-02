#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectLatestLiveServingDashboardRows } from "../apps/web/src/services/fallbackArchitectureV3DashboardOverlay.ts";

const manifest = JSON.parse(readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json", import.meta.url),
  "utf8"
));
const manifestContentKeys = new Set(manifest.keys.map((manifestKey) => {
  const separatorIndex = manifestKey.indexOf(":");
  return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;
}));
const venusKey = "authored/transit-aspect/venus/moon/hard";
const sunMarsKey = "authored/transit-aspect/sun/mars/hard";
const currentKeys = new Set([venusKey, sunMarsKey]);
assert.equal(
  manifestContentKeys.has(venusKey),
  true,
  "The current typed manifest must normalize to the raw Venus/Moon Content Studio key."
);
const row = ({
  id,
  contentKey,
  updatedAt,
  body,
  status = "LIVE",
  lane = "serving",
  approved = true,
  packageVersion = "v3-2026-08-27a"
}) => ({
  id,
  content_key: contentKey,
  updated_at: updatedAt,
  status,
  lane,
  approved,
  packageVersion,
  body
});

const rows = [
  row({ id: "venus-old", contentKey: venusKey, updatedAt: "2026-08-27T12:00:00Z", body: "OLD", packageVersion: "v3-2026-08-27a" }),
  row({ id: "sun-mars-old-package", contentKey: sunMarsKey, updatedAt: "2026-08-15T12:00:00Z", body: "SUN MARS", packageVersion: "v3-2026-08-15a" }),
  row({ id: "venus-live", contentKey: venusKey, updatedAt: "2026-09-02T02:56:36Z", body: "A partner may feel smothered instead of loved.", packageVersion: "v3-2026-08-27a" }),
  row({ id: "venus-draft", contentKey: venusKey, updatedAt: "2026-09-02T03:00:00Z", body: "DRAFT", status: "DRAFT" }),
  row({ id: "venus-reference", contentKey: venusKey, updatedAt: "2026-09-02T03:01:00Z", body: "REFERENCE", lane: "reference" }),
  row({ id: "venus-review", contentKey: venusKey, updatedAt: "2026-09-02T03:02:00Z", body: "NEEDS REVIEW", approved: false }),
  row({ id: "unknown", contentKey: "authored/transit-aspect/not-in-current-package", updatedAt: "2026-09-02T03:03:00Z", body: "UNKNOWN" })
];

const selected = selectLatestLiveServingDashboardRows(
  rows,
  currentKeys,
  (item) => item.approved,
  () => false
);

assert.deepEqual(selected.map((item) => item.content_key), [venusKey, sunMarsKey]);
assert.equal(selected[0].body, "A partner may feel smothered instead of loved.");
assert.equal(selected[1].packageVersion, "v3-2026-08-15a");
assert.equal(selected.some((item) => ["DRAFT", "REFERENCE", "NEEDS REVIEW", "UNKNOWN"].includes(item.body)), false);
console.log("Fallback dashboard live overlay selection passed.");
