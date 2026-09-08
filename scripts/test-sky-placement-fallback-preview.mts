import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  composeSkyPlacementFallbackParagraphs,
  isFallbackOnlySkyPlacementPreview
} from "../apps/web/src/features/sky/skyPlacementPreviewMode.ts";

assert.equal(
  isFallbackOnlySkyPlacementPreview("https://tldrastro.vercel.app/?skyPlacementPreview=fallback#/sky/placement/sun/virgo"),
  true
);
assert.equal(
  isFallbackOnlySkyPlacementPreview("https://tldrastro.vercel.app/#/sky/placement/sun/virgo"),
  false
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
  isFallbackOnlySkyPlacementPreview("https://tldrastro.vercel.app/?skyPlacementPreview=unknown#/sky/placement/sun/virgo"),
  false
);

const appSource = readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
assert.match(
  appSource,
  /skyV4ReaderRenderer\.renderRoute\(\{\s*route: "placement",\s*articleAvailable: !isFallbackOnlySkyPlacementPreview\(\)/u,
  "The evergreen preview must select the same canonical hooks that Studio edits."
);
assert.match(
  appSource,
  /displayBody = isCanonicalSkyV4Article\s*\? body\s*: composeSkyPlacementFallbackParagraphs\(fallbackBody/u,
  "Canonical evergreen sections retain their order and paragraph boundaries. Only legacy fallback bodies use the older paragraph composer."
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
  /duration: isRetrograde \? transitRangeLabel \?\? undefined : isFallbackOnlyPreview[\s\S]*?fallbackDateLine \?\? effectiveTransitRangeLabel/u,
  "Rx headers must prioritize the computed retrograde window; direct fallback previews keep the residency date line."
);
assert.match(
  appSource,
  /rendered = transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/u,
  "The governed fallback-hook composer must remain the preview source."
);

console.log("Sky Placement fallback-only preview: PASS");
