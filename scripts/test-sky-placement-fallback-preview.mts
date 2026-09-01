import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  composeSkyPlacementFallbackParagraphs,
  readSkyPlacementPreviewMode,
  shouldRenderCanonicalSkyV4Placement,
  skyPlacementPreviewModeQueryKey
} from "../apps/web/src/features/sky/skyPlacementPreviewMode.ts";

assert.equal(skyPlacementPreviewModeQueryKey, "skyPlacementPreview");
assert.equal(
  readSkyPlacementPreviewMode("https://tldrastro.vercel.app/?skyPlacementPreview=fallback#/sky/placement/sun/virgo"),
  "fallback-only"
);
assert.equal(
  shouldRenderCanonicalSkyV4Placement("https://tldrastro.vercel.app/?skyPlacementPreview=fallback#/sky/placement/sun/virgo"),
  false
);
assert.equal(
  shouldRenderCanonicalSkyV4Placement("https://tldrastro.vercel.app/#/sky/placement/sun/virgo"),
  true
);

const selectedHooks = [
  "The opening names the transit.",
  "The short takeaway follows.",
  "How it shows up adds the lived example without changing its words.",
  "The challenge develops the same argument.",
  "The response closes it."
];
const composedParagraphs = composeSkyPlacementFallbackParagraphs(selectedHooks);
assert.equal(composedParagraphs.length, 2, "More than two selected hooks must render as two paragraphs.");
assert.equal(
  composedParagraphs.join(" "),
  selectedHooks.join(" "),
  "Paragraph composition must preserve every selected hook in its original order."
);
assert.deepEqual(
  composeSkyPlacementFallbackParagraphs(selectedHooks.slice(0, 2)),
  selectedHooks.slice(0, 2),
  "One or two source paragraphs must remain unchanged."
);
assert.equal(
  shouldRenderCanonicalSkyV4Placement("https://tldrastro.vercel.app/?skyPlacementPreview=unknown#/sky/placement/sun/virgo"),
  true
);

const appSource = readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
assert.match(
  appSource,
  /if \(!shouldRenderCanonicalSkyV4Placement\(\)\) \{[\s\S]*?SKY_V4_NOT_SERVABLE[\s\S]*?skyV4ReaderRenderer\.renderRoute\(\{/u,
  "The fallback-only preview must bypass only the canonical SKY V4 placement override."
);
assert.match(
  appSource,
  /isCanonicalSkyV4Article[\s\S]*?isFallbackOnlyPreview[\s\S]*?isCanonicalSkyV4Article && !isFallbackOnlyPreview[\s\S]*?composeSkyPlacementFallbackParagraphs\(fallbackBody/u,
  "Explicit fallback previews and non-V4 fallback bodies must pass through the one-or-two paragraph composer."
);
assert.match(
  appSource,
  /displayArticleSections = isFallbackOnlyPreview \? \[\] : articleSections/u,
  "Fallback-only previews must not bypass the paragraph composer through structured article sections."
);
assert.match(
  appSource,
  /fallbackDateLine = body\.find[\s\S]*?fallbackBody = body\.filter[\s\S]*?paragraph\.trim\(\) !== fallbackDateLine/u,
  "The displayed transit window must not be merged into a fallback prose paragraph."
);
assert.match(
  appSource,
  /duration: isFallbackOnlyPreview[\s\S]*?fallbackDateLine \?\? effectiveTransitRangeLabel/u,
  "Fallback-only previews must keep the full calculated date line in the article header."
);
assert.match(
  appSource,
  /rendered = transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/u,
  "The governed fallback-hook composer must remain the preview source."
);

console.log("Sky Placement fallback-only preview: PASS");
