import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const resolver = read("apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs");
const bundle = read("apps/web/src/content/fallbackArchitectureV3SkyPlacementBundle.ts");
const surface = read("apps/web/src/features/sky/skyV4ProductSurface.ts");

assert.match(resolver, /applySkyV4ContinuousCorpusCorrection/u);
assert.match(resolver, /120,\s*\n\s*4,/u);
assert.match(resolver, /40,\s*\n\s*2,/u);
assert.match(resolver, /placement-lunar-event/u);
assert.match(resolver, /lunarFullPageBody/u);
assert.match(resolver, /lunarFallbackBody/u);
assert.match(resolver, /placementLunarContextKey/u);
assert.match(resolver, /drafts cannot render on reader routes/u);

assert.match(bundle, /sky-v4-continuous-corpus-correction-v1\.json\?url/u);
assert.match(bundle, /sky-v4-placement-lunar-context-v1\.json\?url/u);
assert.match(bundle, /applySkyV4ContinuousCorpusCorrection/u);
assert.match(bundle, /renderSkyV4ReaderRoute\(correctedCorpus, input, lunarSource\)/u);

assert.match(surface, /sameCalendarDayAtZone/u);
assert.match(surface, /placement-lunar-event/u);
assert.match(surface, /solar-eclipse/u);
assert.match(surface, /lunar-eclipse/u);
assert.match(surface, /timeZone \?\? position\.transitTimeZone \?\? "UTC"/u);

console.log("Current-main SKY V4 160-record reader integration contract passed.");
