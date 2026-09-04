import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const exactSkyApprovals = new Map([
  ["jupiter-trine-neptune", readJson("../packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-03/records/jupiter-trine-neptune-exact-approval.json")],
  ["neptune-sextile-pluto", readJson("../packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-03/records/neptune-sextile-pluto-exact-approval.json")],
  ["uranus-sextile-neptune", readJson("../packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-03/records/uranus-sextile-neptune-exact-approval.json")],
  ["uranus-trine-pluto", readJson("../packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-03/records/uranus-trine-pluto-exact-approval.json")]
]);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const ownerRewriteSource = readJson("../packages/astro-knowledge/review/sky-calendar-owner-rewrites-2026-08-20/sky-calendar-owner-rewrites-payloads.json");
const ownerAspectSource = readJson("../packages/astro-knowledge/sources/authored/sky-aspect-owner-refined-v101.json");
const skyAspectVoice = readJson("../packages/astro-knowledge/voice/tldr-astro/sky-aspect.json");
const transitDirectory = new URL("../packages/astro-knowledge/data/transits/", import.meta.url);
const exactTransitRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => readJson(`../packages/astro-knowledge/data/transits/${name}`));
const browserRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...sourceRows,
  hookRows: [...sourceRows.hookRows, ...phrasebook.hookRows]
});
const ownerApprovedSecondPersonKeys = new Set([
  "fallback-hook/sky-aspect-sign/lilith/sagittarius/sextile/north-node/aquarius"
]);

assert.equal(phrasebook.hookRows.length, 148);
assert.ok(phrasebook.hookRows.every((row) => ["reviewed", "approved"].includes(row.review_status)));
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-pair/")).length, 30);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-exact/")).length, 4);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-sign/")).length, 36);
assert.equal(phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-sign/")).length, 78);

assert.equal(approvedJupiterNeptune.status, "LIVE");

assert.equal(Object.keys(ownerAspectSource).length, 225);
assert.equal(exactTransitRecords.length, 215);
assert.ok(exactTransitRecords.every((record) => record.status === "LIVE"));
assert.ok(exactTransitRecords.every((record) => record.readerCopy?.summary && record.readerCopy?.body));
assert.equal(
  skyAspectVoice.lockedPrinciple,
  "The astrology should explain why the event unfolds the way it does, while the prose shows what that looks like in ordinary life. The best version does both."
);
for (const [id, approval] of exactSkyApprovals) {
  assert.equal(approval.authority, "owner", `${id}: exact approval authority`);
  assert.equal(approval.decision, "approve", `${id}: exact approval decision`);
  assert.equal(approval.approvalLevel, "exact_owner_approved", `${id}: exact approval level`);
  assert.ok(approval.capabilities.includes("serving"), `${id}: serving capability`);
  assert.equal(sha256(approval.body), approval.bodySha256, `${id}: approval body hash`);
  assert.equal(
    exactTransitRecords.find((record) => record.id === id)?.readerCopy?.body,
    approval.body,
    `${id}: live transit body must equal exact owner-approved body`
  );
}

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
  if (ownerApprovedSecondPersonKeys.has(contentKey)) {
    const approvedRow = phrasebook.hookRows.find((row) => row.contentKey === contentKey);
    assert.ok(approvedRow?.source_keys?.includes(
      "packages/astro-knowledge/review/lilith-sagittarius-owner-rewrite-v1/lilith-sagittarius-owner-package.md"
    ));
    assert.equal(approvedRow?.approved_via, "owner-authored replacement and rulings, 2026-08-09");
  } else {
    assert.ok(!/\b(?:you|your)\b/iu.test(nodeResult.body), `${contentKey} leaked second-person copy`);
  }
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

assert.throws(
  () => renderNodeSkyAspectCard({ a: "mars", b: "jupiter", aspect: "square" }),
  /SOURCE_GAP: no approved collective Sky aspect copy/u
);
assert.throws(
  () => browserRenderer.renderSkyAspectCard({ a: "mars", b: "jupiter", aspect: "square" }),
  /SOURCE_GAP: no approved collective Sky aspect copy/u
);

let canonicalPhrasebookCount = 0;
let canonicalExactCount = 0;
const canonicalSourceGaps = [];
for (const row of canonicalMatrix.aspects) {
  const [a, aspect, b, aSign, bSign] = row.key.split("|");
  const facts = { a, b, aspect, aSign, bSign };
  const exact = exactTransitRecords.find((record) => record.aspect === aspect && (
    (record.transiting === a && record.other === b) || (record.transiting === b && record.other === a)
  ));

  try {
    const nodeResult = renderNodeSkyAspectCard(facts);
    const browserResult = browserRenderer.renderSkyAspectCard(facts);
    assert.ok(nodeResult.contentKey?.startsWith("fallback-hook/sky-aspect-"), `${row.key} reached non-specific package copy`);
    assert.equal(browserResult.body, nodeResult.body, `${row.key} browser and Node phrasebook copy diverged`);
    canonicalPhrasebookCount += 1;
  } catch (error) {
    assert.match(String(error), /SOURCE_GAP: no approved collective Sky aspect copy/u, `${row.key} failed unexpectedly`);
    assert.throws(() => browserRenderer.renderSkyAspectCard(facts), /SOURCE_GAP: no approved collective Sky aspect copy/u);
    if (exact) canonicalExactCount += 1;
    else canonicalSourceGaps.push(row.key);
  }
}
assert.equal(canonicalPhrasebookCount, 11);
assert.equal(canonicalExactCount, 8);
assert.deepEqual(canonicalSourceGaps, [
  "moon|sextile|chiron|pisces|taurus",
  "moon|conjunction|north-node|pisces|aquarius"
]);

const appSource = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const adminSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const adminSurfaceMap = fs.readFileSync(new URL("../apps/admin/src/writingSurfaceSourceMap.ts", import.meta.url), "utf8");
assert.doesNotMatch(appSource, /function fallbackSkyAspectWritingSection\(/u);
assert.match(appSource, /function approvedExactSkyAspectWritingSection\(/u);
assert.match(appSource, /function reviewedSkyAspectWritingSection\(/u);
assert.match(appSource, /sourceKeys: \[rendered\.contentKey\]/u);
assert.doesNotMatch(appSource, /sourceKeys: \[rendered\.templateKey\]/u);
assert.match(appSource, /const signAwareSection = reviewedSkyAspectWritingSection\(aspect, positions, "sign-aware"\)/u);
assert.match(appSource, /const authoredSection = approvedExactSkyAspectWritingSection\(aspect, positions, generatedContent\)/u);
assert.match(appSource, /reviewedSkyAspectWritingSection\(aspect, positions, "generic"\)/u);
assert.match(appSource, /const selectedSection = selectSkyAspectCopyByPrecedence\(\{/u);
assert.match(appSource, /signSpecific: signAwareSection,[\s\S]*exact: authoredSection,[\s\S]*phrasebook: reviewedSection,[\s\S]*generated: generatedSection/u);
assert.doesNotMatch(appSource, /fallback: fallbackSection/u);
assert.match(appSource, /layer: "generated",[\s\S]*tier: "generated-sky-aspect-lint-v1"/u);
assert.doesNotMatch(appSource, /layer: "authored",[\s\S]{0,120}tier: "generated-sky-aspect-lint-v1"/u);
assert.doesNotMatch(appSource, /if \(!aspect \|\| normalizeSkyAspectSurface\(/u);
assert.doesNotMatch(appSource, /if \(mode === "sky" && !normalizedSkySurface\?\.sections\.length\)/u);
assert.doesNotMatch(appSource, /\.filter\(\(\{ normalized \}\) => normalized\.sections\.length > 0\)/u);
assert.match(appSource, /const sourceGapAspectRows = isRegistryArticle/u);
assert.match(appSource, /heading: "Aspects shaping this transit"/u);
assert.doesNotMatch(appSource, /All calculated aspects/u);
assert.doesNotMatch(appSource, /Facts only/u);
assert.match(adminSource, /type AdminContentSystemFilter = "all" \| "authored" \| "generated" \| "fallback"/u);
assert.match(adminSource, /sourceContentType === "sky-aspect-card"/u);
assert.match(adminSource, /case "generated-content":[\s\S]*label: "Generated content"/u);
assert.match(adminSource, /if \(role === "generated-content" \|\| role === "legacy-generated"\) return "generated"/u);
assert.match(adminSource, /if \(status === "LIVE"\) return "Published"/u);
assert.match(adminSource, /Published maps to LIVE and means reader-eligible within this provenance system/u);
assert.match(adminSurfaceMap, /visibleLayerOrder: \["source-grounded", "generated", "madlib-fallback"\],[\s\S]*reviewed sign-specific copy first/u);
assert.doesNotMatch(adminSurfaceMap, /finally the general fallback frame/u);

const runtimeSource = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3Runtime.ts", import.meta.url), "utf8");
assert.match(runtimeSource, /bundled-sky-core-rows-v3\.json/u);
assert.match(runtimeSource, /approved-serving-projection-v1\.json/u);
assert.match(runtimeSource, /function assertSkyAspectPhrasebookV1Import\(/u);
assert.doesNotMatch(runtimeSource, /source-rows\/sky-aspect-phrasebook-v1\.json/u);

const materializerSource = fs.readFileSync(new URL("./materialize-fallback-architecture-v3-dashboard-rows.mjs", import.meta.url), "utf8");
assert.match(materializerSource, /source-rows\/sky-aspect-phrasebook-v1\.json/u);

console.log("Reviewed Sky aspect phrasebook tests passed.");
