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
const browserRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...sourceRows,
  hookRows: [...sourceRows.hookRows, ...phrasebook.hookRows]
});

assert.equal(phrasebook.hookRows.length, 141);
assert.ok(phrasebook.hookRows.every((row) => row.review_status === "reviewed"));
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-pair/")).length, 30);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-exact/")).length, 3);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-sign/")).length, 36);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-sign/")).length, 72);

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
  }
];

for (const { facts, contentKey } of cases) {
  const nodeResult = renderNodeSkyAspectCard(facts);
  const browserResult = browserRenderer.renderSkyAspectCard(facts);

  assert.equal(nodeResult.contentKey, contentKey);
  assert.equal(browserResult.contentKey, contentKey);
  assert.equal(browserResult.body, nodeResult.body);
  assert.ok(!/\b(?:you|your)\b/iu.test(nodeResult.body), `${contentKey} leaked second-person copy`);
}

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

  assert.ok(nodeResult.body, `${row.key} must remain available to non-reader fallback tooling`);
  assert.equal(browserResult.body, nodeResult.body, `${row.key} browser and Node fallback tooling diverged`);
}

const appSource = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
assert.doesNotMatch(appSource, /function (?:fallback|reviewed)SkyAspectWritingSection\(/u);
assert.match(appSource, /const sections = generatedSection \? \[generatedSection\] : \[\]/u);
assert.match(appSource, /All calculated aspects/u);
assert.match(appSource, /Facts only/u);
assert.match(appSource, /calculatedOnlyAspects/u);

const runtimeSource = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3Runtime.ts", import.meta.url), "utf8");
assert.match(runtimeSource, /source-rows\/sky-aspect-phrasebook-v1\.json/u);

const materializerSource = fs.readFileSync(new URL("./materialize-fallback-architecture-v3-dashboard-rows.mjs", import.meta.url), "utf8");
assert.match(materializerSource, /source-rows\/sky-aspect-phrasebook-v1\.json/u);

console.log("Reviewed Sky aspect phrasebook tests passed.");
