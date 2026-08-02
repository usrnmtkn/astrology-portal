import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  renderSkyAspectCard as renderNodeSkyAspectCard
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const phrasebook = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");
const sourceRows = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const transitRows = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templates = readJson("../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const canonicalMatrix = readJson("../docs/content-review/sky-aspects/2026-07-31/canonical-noon-matrix.json");
const approvedJupiterNeptune = readJson("../packages/astro-knowledge/data/transits/jupiter-trine-neptune.json");
const ownerAspectSource = readJson("../packages/astro-knowledge/sources/authored/sky-aspect-owner-refined-v101.json");
const transitDirectory = new URL("../packages/astro-knowledge/data/transits/", import.meta.url);
const exactTransitRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => readJson(`../packages/astro-knowledge/data/transits/${name}`));
const browserRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...sourceRows,
  hookRows: [...sourceRows.hookRows, ...phrasebook.hookRows]
});

assert.equal(phrasebook.hookRows.length, 148);
assert.ok(phrasebook.hookRows.every((row) => row.review_status === "reviewed"));
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-pair/")).length, 30);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-exact/")).length, 4);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-sign/")).length, 36);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-sign/")).length, 78);

assert.equal(approvedJupiterNeptune.status, "LIVE");
assert.match(approvedJupiterNeptune.readerCopy?.body ?? "", /^Hope has somewhere to go\./u);
assert.equal(Object.keys(ownerAspectSource).length, 225);
assert.equal(exactTransitRecords.length, 214);
assert.ok(exactTransitRecords.every((record) => record.status === "LIVE"));
assert.ok(exactTransitRecords.every((record) => record.readerCopy?.summary && record.readerCopy?.body));
assert.match(
  exactTransitRecords.find((record) => record.id === "neptune-sextile-pluto")?.readerCopy?.body ?? "",
  /^A compelling public story creates an opening/u
);
assert.match(
  exactTransitRecords.find((record) => record.id === "uranus-sextile-neptune")?.readerCopy?.body ?? "",
  /^A new platform gives a neglected need/u
);
assert.match(
  exactTransitRecords.find((record) => record.id === "uranus-trine-pluto")?.readerCopy?.body ?? "",
  /^A quiet overhaul of everyday infrastructure/u
);

const cases = [
  {
    facts: { a: "venus", b: "saturn", aspect: "square", aSign: "aries", bSign: "cancer" },
    contentKey: "fallback-hook/sky-aspect-sign/venus/aries/square/saturn/cancer"
  },
  {
    facts: { a: "saturn", b: "venus", aspect: "square", aSign: "cancer", bSign: "aries" },
    contentKey: "fallback-hook/sky-aspect-sign/venus/aries/square/saturn/cancer"
  },
  {
    facts: { a: "venus", b: "saturn", aspect: "square", aSign: "aries", bSign: "taurus" },
    contentKey: "fallback-hook/sky-aspect-exact/venus/square/saturn"
  },
  {
    facts: { a: "sun", b: "moon", aspect: "trine" },
    contentKey: "fallback-hook/sky-aspect-pair/sun/moon/soft"
  },
  {
    facts: { a: "jupiter", b: "neptune", aspect: "trine", aSign: "leo", bSign: "aries" },
    contentKey: "fallback-hook/sky-aspect-exact/jupiter/trine/neptune"
  },
  {
    facts: { a: "venus", b: "mars", aspect: "square", aSign: "virgo", bSign: "gemini" },
    contentKey: "fallback-hook/sky-aspect-sign/venus/virgo/square/mars/gemini"
  },
  {
    facts: { a: "chiron", b: "north-node", aspect: "sextile", aSign: "taurus", bSign: "aquarius" },
    contentKey: "fallback-hook/sky-aspect-sign/chiron/taurus/sextile/north-node/aquarius"
  },
  {
    facts: { a: "lilith", b: "north-node", aspect: "sextile", aSign: "sagittarius", bSign: "aquarius" },
    contentKey: "fallback-hook/sky-aspect-sign/lilith/sagittarius/sextile/north-node/aquarius"
  },
  {
    facts: { a: "venus", b: "lilith", aspect: "square", aSign: "virgo", bSign: "sagittarius" },
    contentKey: "fallback-hook/sky-aspect-sign/venus/virgo/square/lilith/sagittarius"
  },
  {
    facts: { a: "mars", b: "lilith", aspect: "opposition", aSign: "gemini", bSign: "sagittarius" },
    contentKey: "fallback-hook/sky-aspect-sign/mars/gemini/opposition/lilith/sagittarius"
  },
  {
    facts: { a: "pluto", b: "chiron", aspect: "square", aSign: "aquarius", bSign: "taurus" },
    contentKey: "fallback-hook/sky-aspect-sign/pluto/aquarius/square/chiron/taurus"
  }
];

for (const { facts, contentKey } of cases) {
  const nodeResult = renderNodeSkyAspectCard(facts);
  const browserResult = browserRenderer.renderSkyAspectCard(facts);

  assert.equal(nodeResult.contentKey, contentKey);
  assert.equal(browserResult.contentKey, contentKey);
  assert.equal(browserResult.body, nodeResult.body);
  assert.ok(!/\b(?:you|your)\b/iu.test(nodeResult.body), `${contentKey} leaked second-person copy`);
  assert.ok(!/—/u.test(nodeResult.body), `${contentKey} leaked an em dash`);
}

assert.match(
  renderNodeSkyAspectCard({ a: "chiron", b: "north-node", aspect: "sextile", aSign: "taurus", bSign: "aquarius" }).body,
  /^Experience learned the hard way becomes useful to other people\./u
);
assert.match(
  renderNodeSkyAspectCard({ a: "venus", b: "lilith", aspect: "square", aSign: "virgo", bSign: "sagittarius" }).body,
  /^An evening that goes fine on paper still leaves something important unsatisfied\./u
);
assert.match(
  renderNodeSkyAspectCard({ a: "mars", b: "lilith", aspect: "opposition", aSign: "gemini", bSign: "sagittarius" }).body,
  /^A petty argument carries the weight of months of unspoken words\./u
);

const uncovered = renderNodeSkyAspectCard({ a: "mars", b: "jupiter", aspect: "square" });
assert.equal(uncovered.contentKey, undefined);
assert.equal(uncovered.templateKey, "fallback-template/sky.aspect-card");
assert.match(uncovered.body, /Mars/u);
assert.match(uncovered.body, /Jupiter/u);

for (const row of canonicalMatrix.aspects) {
  const [a, aspect, b, aSign, bSign] = row.key.split("|");
  const facts = { a, b, aspect, aSign, bSign };
  const nodeResult = renderNodeSkyAspectCard(facts);
  const browserResult = browserRenderer.renderSkyAspectCard(facts);

  assert.ok(nodeResult.body, `${row.key} must resolve through reviewed or template fallback copy`);
  assert.equal(browserResult.body, nodeResult.body, `${row.key} browser and Node fallback copy diverged`);
}

const appSource = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const adminSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const adminSurfaceMap = fs.readFileSync(new URL("../apps/admin/src/writingSurfaceSourceMap.ts", import.meta.url), "utf8");
assert.match(appSource, /function fallbackSkyAspectWritingSection\(/u);
assert.match(appSource, /function approvedExactSkyAspectWritingSection\(/u);
assert.match(appSource, /function reviewedSkyAspectWritingSection\(/u);
assert.match(appSource, /sourceKeys: \[rendered\.contentKey\]/u);
assert.match(appSource, /sourceKeys: \[rendered\.templateKey\]/u);
assert.match(appSource, /const signAwareSection = reviewedSkyAspectWritingSection\(aspect, positions, "sign-aware"\)/u);
assert.match(appSource, /const authoredSection = signAwareSection \? null : approvedExactSkyAspectWritingSection\(aspect, positions\)/u);
assert.match(appSource, /reviewedSkyAspectWritingSection\(aspect, positions, "generic"\)/u);
assert.match(appSource, /const generatedSection = signAwareSection \|\| authoredSection \|\| reviewedSection/u);
assert.match(appSource, /layer: "generated",[\s\S]*tier: "generated-sky-aspect-lint-v1"/u);
assert.doesNotMatch(appSource, /layer: "authored",[\s\S]{0,120}tier: "generated-sky-aspect-lint-v1"/u);
assert.doesNotMatch(appSource, /All calculated aspects/u);
assert.doesNotMatch(appSource, /Facts only/u);
assert.match(adminSource, /type AdminContentSystemFilter = "all" \| "authored" \| "generated" \| "fallback"/u);
assert.match(adminSource, /sourceContentType === "sky-aspect-card"/u);
assert.match(adminSource, /case "generated-content":[\s\S]*label: "Generated content"/u);
assert.match(adminSource, /if \(role === "generated-content" \|\| role === "legacy-generated"\) return "generated"/u);
assert.match(adminSource, /if \(status === "LIVE"\) return "Published"/u);
assert.match(adminSource, /Published maps to LIVE and means reader-eligible within this provenance system/u);
assert.match(adminSurfaceMap, /visibleLayerOrder: \["source-grounded", "generated", "madlib-fallback"\],[\s\S]*reviewed sign-specific copy first/u);

const runtimeSource = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3Runtime.ts", import.meta.url), "utf8");
assert.match(runtimeSource, /source-rows\/sky-aspect-phrasebook-v1\.json/u);

const materializerSource = fs.readFileSync(new URL("./materialize-fallback-architecture-v3-dashboard-rows.mjs", import.meta.url), "utf8");
assert.match(materializerSource, /source-rows\/sky-aspect-phrasebook-v1\.json/u);

console.log("Reviewed Sky aspect phrasebook tests passed.");
