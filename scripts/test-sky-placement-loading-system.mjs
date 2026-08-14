#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  skyPlacementDescriptionState,
  shouldLoadSkyPlacementContent
} from "../apps/web/src/features/sky/skyPlacementContentState.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const app = read("apps/web/src/App.tsx");
const placementRows = read("apps/web/src/components/charts/PlacementRows.tsx");

assert.equal(
  shouldLoadSkyPlacementContent({ mode: "guest", hasSky: true, detailRoutePath: null }),
  true,
  "A cold guest Sky list must load approved placement content before a card is opened."
);
assert.equal(
  shouldLoadSkyPlacementContent({ mode: "member", hasSky: true, detailRoutePath: null }),
  true,
  "A cold member Sky list must load approved placement content before a card is opened."
);
assert.equal(
  shouldLoadSkyPlacementContent({ mode: "calendar", hasSky: true, detailRoutePath: null }),
  false,
  "Calendar must not download the long-form Sky placement partition without a placement detail route."
);
assert.equal(
  shouldLoadSkyPlacementContent({
    mode: "calendar",
    hasSky: true,
    detailRoutePath: "sky/placement/mercury/leo"
  }),
  true,
  "Placement details opened outside the Sky list must retain on-demand content loading."
);

assert.equal(skyPlacementDescriptionState("Approved copy", "loading"), "ready");
assert.equal(skyPlacementDescriptionState("", "loading"), "loading");
assert.equal(skyPlacementDescriptionState("", "ready"), "empty");
assert.equal(skyPlacementDescriptionState(null, "error"), "empty");

assert.match(
  app,
  /shouldLoadSkyPlacementContent\(\{[\s\S]*mode,[\s\S]*hasSky: Boolean\(sky\),[\s\S]*detailRoutePath: skyDetailRoutePath/,
  "The App loading effect must use the shared Sky placement route policy."
);
assert.match(
  app,
  /contentStatus=\{skyPlacementFallbackStatus\}/,
  "The Sky placement list must receive the placement-content loading state."
);
assert.match(
  placementRows,
  /descriptionLoading\s*\?[\s\S]*summary-skeleton/,
  "A placement with unresolved copy must render an in-card skeleton while content is loading."
);
assert.match(
  app,
  /className="feature-loading-fallback"[\s\S]*role="status"[\s\S]*summary-skeleton/,
  "Lazy page boundaries must expose an accessible, structured loading state."
);

console.log("Sky placement loading-system contract passed.");
