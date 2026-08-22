import assert from "node:assert/strict";
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
  relatedHousePassages(rows, context).map(({ house, kind, row }) => [house, kind, row.id]),
  [
    [2, "Sky house horoscope", "h2"],
    [2, "House and sign passage", "sign-layer"],
    [2, "House introduction", "intro"],
    [10, "Sky house horoscope", "h10"]
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

console.log("Admin Sky write-up relationship checks passed.");
