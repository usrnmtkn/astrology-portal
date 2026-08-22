import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  relatedAspectPassages,
  relatedHousePassages,
  skyWriteupContextForRow
} from "../apps/admin/src/skyWriteupRelations.ts";

const skyRow = {
  id: "sky-sun-leo",
  content_key: "sky.placement.base.sun.leo",
  headline: "The Sun in Leo",
  block_type: "sky_placement",
  facts: null,
  source_snapshot: null
};
const context = skyWriteupContextForRow(skyRow);
assert.deepEqual(context, { planet: "sun", sign: "leo" });

assert.deepEqual(
  skyWriteupContextForRow({
    id: "sky-north-node-aquarius",
    content_key: "sky.placement.base.north_node.aquarius",
    headline: "",
    block_type: "sky_placement",
    facts: null,
    source_snapshot: null
  }),
  { planet: "north-node", sign: "aquarius" },
  "Canonical underscore-delimited node keys must resolve without relying on facts or headline fallbacks."
);

const rows = [
  { id: "h10", content_key: "house-horoscope-core/sun/leo/house-10" },
  { id: "h2", content_key: "house-horoscope-core/sun/leo/house-2" },
  { id: "wrong-sign", content_key: "house-horoscope-core/sun/virgo/house-2" },
  { id: "sign-layer", content_key: "authored/transit-house-sign/sun/2/leo" },
  { id: "intro", content_key: "authored/transit-house-intro/sun/2" },
  { id: "aspect", content_key: "authored/transit-aspect/sun/saturn/hard" },
  { id: "aspect-variant", content_key: "authored/transit-aspect/sun/saturn/hard/variant-B" },
  { id: "wrong-planet", content_key: "authored/transit-aspect/venus/saturn/hard" }
];

assert.deepEqual(
  relatedHousePassages(rows, context).map(({ house, kind, availability, row }) => [house, kind, availability, row.id]),
  [
    [2, "Sky house horoscope", "Reader-ready", "h2"],
    [2, "House and sign passage", "Source candidate", "sign-layer"],
    [2, "House introduction", "Source candidate", "intro"],
    [10, "Sky house horoscope", "Reader-ready", "h10"]
  ]
);
assert.deepEqual(
  relatedAspectPassages(rows, context).map((row) => row.id),
  ["aspect", "aspect-variant"]
);

assert.deepEqual(
  skyWriteupContextForRow({
    id: "eclipse",
    content_key: "sky/article-edition/lunation/pisces-eclipse",
    headline: "Pisces Full Moon Eclipse",
    block_type: "sky_article"
  }),
  { planet: "moon", sign: "pisces" }
);

assert.equal(
  skyWriteupContextForRow({
    id: "not-sky",
    content_key: "authored/transit-aspect/sun/saturn/hard",
    headline: "Sun square Saturn",
    block_type: "transit_aspect"
  }),
  null
);

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const generatedContentApi = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");
const readerApp = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

assert.match(dashboard, /Create a complete edition/u, "Template rows must expose the edition compiler in Content Studio.");
assert.match(dashboard, /TL;DR · explicit edition copy/u, "Edition compilation must collect an explicit TL;DR in Content Studio.");
assert.match(dashboard, /summary: edition\.tldr/u, "The saved summary mirror must use the explicit compiled TL;DR.");
assert.match(dashboard, /All 12 approved house horoscopes are required/u, "Compilation must require complete house coverage.");
assert.match(dashboard, /Only an approved complete Sky house horoscope can serve/u, "Admin must distinguish reader-ready house horoscopes from source candidates.");
assert.match(dashboard, /passage\.availability === "Reader-ready"/u, "Edition compilation must not silently promote transit source candidates.");
assert.match(dashboard, /Approve & publish edition/u, "Compiled editions need a distinct owner approval action.");
assert.match(generatedContentApi, /ownerAction === "approve-sky-article-edition"/u, "The API must enforce the explicit owner approval action.");
assert.match(readerApp, /selectActiveSkyArticleEdition/u, "Sky reader articles must select active compiled editions.");
assert.match(readerApp, /tldr: selected\.edition\.tldr/u, "Reader placement previews must consume the explicit compiled TL;DR.");
assert.match(readerApp, /section\?\.tldr\s*\?\s*textPreview\(section\.tldr\)/u, "The Transits list must prefer explicit TL;DR copy over the full article body.");
assert.match(readerApp, /compiledHousePassage/u, "Reader personalization must use the compiled house passage.");
assert.match(readerApp, /compiledAspect/u, "Reader personalization must append the compiled natal-aspect passage.");

console.log("Admin Sky write-up relationship checks passed.");
