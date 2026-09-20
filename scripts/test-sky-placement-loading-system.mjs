#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  skyPlacementCardsSettled,
  skyPlacementDescriptionState,
  shouldLoadSkyPlacementContent,
  skySnapshotHasTransitWindows
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
  shouldLoadSkyPlacementContent({ mode: "guest", hasSky: false, detailRoutePath: null }),
  true,
  "Guest Sky placement sources must start before the first sky snapshot exists."
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

assert.equal(
  skySnapshotHasTransitWindows({ positions: [{ transitStart: "2026-09-01T00:00:00.000Z", transitEnd: "2026-09-30T00:00:00.000Z" }] }),
  true
);
assert.equal(
  skySnapshotHasTransitWindows({ positions: [{ planet: "Sun", sign: "Virgo" }] }),
  false
);

assert.equal(skyPlacementDescriptionState("Approved copy", "loading"), "loading");
assert.equal(skyPlacementDescriptionState("", "loading"), "loading");
assert.equal(skyPlacementDescriptionState("", "ready"), "empty");
assert.equal(skyPlacementDescriptionState(null, "error"), "empty");

const windowed = { transitStart: "2026-09-01T00:00:00.000Z", transitEnd: "2026-09-30T00:00:00.000Z" };
assert.equal(skyPlacementCardsSettled([windowed, windowed], "ready", 2), true);
assert.equal(skyPlacementCardsSettled([windowed], "ready", 2), false);
assert.equal(skyPlacementCardsSettled([windowed, { planet: "Moon" }], "ready", 2), false);
assert.equal(skyPlacementCardsSettled([windowed, windowed], "loading", 2), false);
assert.equal(skyPlacementCardsSettled([], "error", 14), true);

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
  app,
  /useSkyCardsSettled\(skyPlacementCardsSettled\(/,
  "The Sky list must report card readiness to the shared first-paint gate."
);
const readingLayout = read("apps/web/src/features/sky/SkyReadingLayout.tsx");
assert.match(
  readingLayout,
  /!pending && summarySettled && cardsSettled/,
  "The first Sky reading must wait for the summary and the transit cards together."
);
assert.match(
  readingLayout,
  /!failed && !ready && !revealed/,
  "After the first ready reading, revalidation must keep the visible Sky page."
);
assert.match(
  placementRows,
  /descriptionLoading\s*\?[\s\S]*PageLoading compact/,
  "A placement with unresolved copy must render an in-card loader while content is loading."
);
assert.match(
  app,
  /className="feature-loading-fallback"[\s\S]*role="status"/,
  "Lazy page boundaries must expose an accessible, structured loading state."
);

const summary = read("apps/web/src/features/sky/PublishedSkySummary.tsx");
assert.match(
  summary,
  /await refreshContentPublications\(\);/,
  "The daily sky summary must reuse the shared publication cache on first load."
);
assert.match(
  summary,
  /void refreshContentPublications\(true\)\.finally/,
  "A summary retry may force a fresh publication lookup."
);
assert.match(
  app,
  /const placementSnapshotRequest = canLoadPlacementArticle[\s\S]*skyPlacementFallbackStatus !== "ready"\) return/u,
  "A Sky placement article must start its astronomy before published copy finishes resolving."
);
assert.doesNotMatch(
  app,
  /awaitPlacementTiming \? null : detail/,
  "Opening a Sky Placement card must keep the write-up on screen instead of a full-page loader."
);
assert.doesNotMatch(
  app,
  /renderPlacement\(baseContent, false\)/,
  "A Sky placement article must not paint bundled copy and then replace it with in-sign Studio keys."
);
assert.match(
  app,
  /skyPlacementInSignAspectContentKeys[\s\S]*renderPlacement\(mergeGeneratedContentMaps\(baseContent, await loadLiveGeneratedContentForKeys\(inSignKeys\)\)\)/,
  "In-sign Studio keys must join the first placement article commit."
);
assert.match(
  app,
  /preloadSkyDetailArticle\(\)/,
  "The Sky list must preload the placement article chunk before a card is opened."
);
assert.match(
  app,
  /onOpenDetail=\{openSkyDetail\}/,
  "Sky summary placement links must open the article through the same path as placement cards."
);
assert.match(
  app,
  /function requestSkyPlacementArticleSnapshot[\s\S]*skyPlacementArticleReferenceDate\(location, date\)/u,
  "Placement article astronomy must use the selected day, not a live generatedAt timestamp."
);
assert.match(
  read("apps/web/src/services/skyCalculationClient.ts"),
  /placementSnapshotCache.size > 24/,
  "Recently opened placement articles must remain cached across the current Sky list."
);

console.log("Sky placement loading-system contract passed.");
