import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import {
  SKY_V4_CANONICAL_JSON_SHA256,
  assertSkyV4ReaderCopyServingRelease,
  renderSkyV4ReaderRoute,
  skyV4ContentStudioRecords
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const canonicalUrl = new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url);
const corpusBytes = fs.readFileSync(canonicalUrl);
const corpus = JSON.parse(corpusBytes);
const bundled = JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json", import.meta.url)));
assert.equal(createHash("sha256").update(corpusBytes).digest("hex"), SKY_V4_CANONICAL_JSON_SHA256);
assert.equal(assertSkyV4ReaderCopyServingRelease(corpus).expected_serving_records, 280);

const records = skyV4ContentStudioRecords(corpus);
const serving = records.filter((row) => row.serving_enabled === true);
const configuration = records.filter((row) => ["template", "overlay-settings"].includes(row.studio_content_type));
assert.equal(serving.length, 280);
assert.equal(configuration.length, 25);
assert.ok(configuration.every((row) => row.serving_enabled === false && row.owner_approved === false));

const governedAspectRow = bundled.hookRows.find((row) => row.contentKey === "fallback-hook/sky-aspect-sign/venus/virgo/trine/saturn/capricorn");
assert.equal(governedAspectRow.review_status, "approved");
const governedAspect = {
  id: governedAspectRow.contentKey,
  approved: true,
  bodyA: "venus",
  bodyB: "saturn",
  exactDateTime: "2026-09-01T12:00:00Z",
  orb: 0.5,
  headline: "Venus trine Saturn",
  dateLine: "September 1, 2026",
  body: governedAspectRow.body_you
};

const venusAriesContext = {
  subjectFamily: "continuous", subjectBody: "Venus", subjectSign: "Aries", subjectCondition: "retrograde",
  contextKind: "co-present-motion", contextBodyOrEvent: "Mercury", contextSign: "Aries", contextCondition: "retrograde"
};

const routes = [
  ["continuous-sun", { route: "placement", planet: "sun", sign: "leo", aspects: [] }],
  ["continuous-mercury", { route: "placement", planet: "mercury", sign: "gemini", aspects: [] }],
  ["venus-overlay", { route: "placement", planet: "venus", sign: "aries", contexts: [venusAriesContext], aspects: [] }],
  ["placement-retrograde", { route: "placement", planet: "mercury", sign: "aries", isRetrograde: true, aspects: [] }],
  ["governed-aspect", { route: "placement", planet: "venus", sign: "virgo", aspects: [governedAspect] }],
  ["new-moon", { route: "new-moon", sign: "gemini", aspects: [] }],
  ["full-moon-axis", { route: "full-moon", sign: "taurus", aspects: [] }],
  ["exact-eclipse", { route: "eclipse", exactEventKey: "sky-lunation/solar-eclipse/2025-09-21-virgo", aspects: [] }],
  ["sign-aware-eclipse", { route: "eclipse", exactEventKey: "missing", eclipseType: "solar-eclipse", nodeRelation: "south-node", eclipseSign: "virgo", aspects: [] }],
  ["generic-eclipse", { route: "eclipse", exactEventKey: "missing", eclipseType: "solar-eclipse", nodeRelation: "south-node", eclipseSign: "virgo", signFallbackAvailable: false, aspects: [] }],
  ["node-axis", { route: "node-axis", northSign: "aries", southSign: "libra", aspects: [] }],
  ["north-node-module", { route: "placement", planet: "north-node", sign: "aries", aspects: [] }],
  ["south-node-module", { route: "placement", planet: "south-node", sign: "libra", aspects: [] }],
  ["lilith-article", { route: "placement", planet: "lilith", sign: "sagittarius", aspects: [] }],
  ["lilith-station", { route: "lilith-station", stationSupported: true, aspects: [] }],
  ["seasonal-context", { route: "seasonal", sign: "aries", hemisphere: "northern", aspects: [] }],
  ["zero-optional", { route: "placement", planet: "sun", sign: "taurus", contexts: [], motionConditions: [], aspects: [] }]
];

const evidence = [];
for (const [name, input] of routes) {
  const result = renderSkyV4ReaderRoute(corpus, input);
  assert.equal(result.servingEnabled, true, `${name}: serving disabled`);
  assert.equal(result.versionStatus, "approved-serving-baseline", `${name}: draft selected`);
  assert.ok(result.contentKey, `${name}: no canonical key`);
  assert.ok(result.page || result.readerParts.length, `${name}: blank output`);
  assert.doesNotMatch(`${result.contentKey}\n${result.page}`, /natal-placement|generated unapproved/iu, `${name}: forbidden substitution`);
  assert.equal(new Set(result.selectedOverlayKeys ?? []).size, (result.selectedOverlayKeys ?? []).length, `${name}: duplicate overlays`);
  assert.equal(new Set(result.selectedAspectIds ?? []).size, (result.selectedAspectIds ?? []).length, `${name}: duplicate aspects`);
  evidence.push({ name, contentKey: result.contentKey, resolution: result.resolution, overlays: result.selectedOverlayKeys ?? [], aspects: result.selectedAspectIds ?? [] });
}

// Every explicitly released record must cross the production reader boundary
// without relying on a draft, generated prose, or a second content store.
const directReachability = [];
for (const row of serving) {
  const result = renderSkyV4ReaderRoute(corpus, {
    contentKey: row.contentKey,
    facts: {
      entryDate: "August 31, 2026",
      exitDate: "September 30, 2026"
    },
    stationSupported: true,
    contexts: [],
    motionConditions: [],
    aspects: []
  });
  assert.equal(result.servingEnabled, true, `${row.contentKey}: direct release is dark`);
  assert.equal(result.versionStatus, "approved-serving-baseline", `${row.contentKey}: direct release selected a draft`);
  assert.ok(result.page || result.readerParts.length, `${row.contentKey}: direct release is blank`);
  directReachability.push(row.contentKey);
}
assert.equal(directReachability.length, 280);
assert.equal(new Set(directReachability).size, 280);

const productSurfaceFamilies = {
  directPageOrSection: new Set(["continuous-placement", "new-moon", "full-moon", "node-axis", "node-education", "node-module", "lilith"]),
  conditionalSection: new Set(["eclipse-event", "eclipse-fallback", "generic-eclipse-fallback", "lilith-station", "overlay", "retrograde", "seasonal"])
};
const directProductSurfaceRecords = serving.filter((row) => productSurfaceFamilies.directPageOrSection.has(row.studio_content_type));
const conditionalProductSurfaceRecords = serving.filter((row) => productSurfaceFamilies.conditionalSection.has(row.studio_content_type));
assert.equal(directProductSurfaceRecords.length, 193);
assert.equal(conditionalProductSurfaceRecords.length, 87);
assert.equal(directProductSurfaceRecords.length + conditionalProductSurfaceRecords.length, 280);

assert.deepEqual(evidence.find((row) => row.name === "venus-overlay").overlays, ["sky-context/venus/aries/retrograde/mercury-retrograde-aries"]);
assert.deepEqual(evidence.find((row) => row.name === "governed-aspect").aspects, [governedAspectRow.contentKey]);
assert.equal(evidence.find((row) => row.name === "exact-eclipse").resolution, "exact-event");
assert.equal(evidence.find((row) => row.name === "sign-aware-eclipse").resolution, "sign-aware-fallback");
assert.equal(evidence.find((row) => row.name === "generic-eclipse").resolution, "generic-type-node-fallback");

const venusOverlayPage = renderSkyV4ReaderRoute(corpus, routes.find(([name]) => name === "venus-overlay")[1]).page;
assert.ok(venusOverlayPage.indexOf("## TLDR") < venusOverlayPage.indexOf("Mercury retrograde"), "Contextual overlay must follow the base TLDR/article.");
const venusOverlayReader = renderSkyV4ReaderRoute(corpus, routes.find(([name]) => name === "venus-overlay")[1]);
assert.ok(venusOverlayReader.readerParts.some((part) => /Mercury retrograde/iu.test(part)), "Reader parts must include the selected contextual overlay.");
const nodeReader = renderSkyV4ReaderRoute(corpus, {
  route: "placement", planet: "north-node", sign: "aries", northSign: "aries", southSign: "libra", aspects: []
});
assert.ok(nodeReader.readerParts.length >= 3, "Node placement must compose education, current axis, and matching module.");
const governedAspectPage = renderSkyV4ReaderRoute(corpus, routes.find(([name]) => name === "governed-aspect")[1]).page;
assert.match(governedAspectPage, /## Aspects shaping this transit/u);
assert.doesNotMatch(governedAspectPage, /## Key aspects/u);
const lilithStationPlacement = renderSkyV4ReaderRoute(corpus, {
  route: "placement",
  planet: "lilith",
  sign: "sagittarius",
  stationSupported: true,
  aspects: []
});
assert.ok(
  lilithStationPlacement.readerParts.some((part) => /Black Moon Lilith stations/u.test(part)),
  "A calculated Lilith station must compose the released station record into its placement page."
);

assert.throws(() => renderSkyV4ReaderRoute(corpus, {
  route: "placement", planet: "sun", sign: "leo", draftFields: { placementArticle: "Draft" }
}), /drafts cannot render/u);
assert.throws(() => renderSkyV4ReaderRoute(corpus, {
  contentKey: "sky-v4/settings/contextual-overlays"
}), /SKY_V4_NOT_RELEASED/u);

console.log(JSON.stringify({
  servingCount: serving.length,
  configurationCount: configuration.length,
  countsByContentType: Object.fromEntries(Object.entries(serving.reduce((counts, row) => {
    counts[row.studio_content_type] = (counts[row.studio_content_type] ?? 0) + 1;
    return counts;
  }, {})).sort(([left], [right]) => left.localeCompare(right))),
  resolverReachableServingRecords: directReachability.length,
  productSurfaceReachability: {
    directPageOrSection: directProductSurfaceRecords.length,
    conditionalSection: conditionalProductSurfaceRecords.length,
    total: directProductSurfaceRecords.length + conditionalProductSurfaceRecords.length
  },
  routes: evidence
}, null, 2));
