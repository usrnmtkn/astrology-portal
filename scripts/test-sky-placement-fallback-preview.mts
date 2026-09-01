import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
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
  /rendered = transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/u,
  "The governed fallback-hook composer must remain the preview source."
);

console.log("Sky Placement fallback-only preview: PASS");
