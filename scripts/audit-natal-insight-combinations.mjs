/** Read-only inventory of discrete Deeper Insights selection states.
 * These are structural upper bounds, NOT an ephemeris reachability catalogue.
 * Optional saved metadata must stay outside the public repository.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
if (process.argv.includes("--help")) {
  console.log("node scripts/audit-natal-insight-combinations.mjs [--out=/private/path/report.json] [--saved-metadata=/private/path/metadata.json]");
  process.exit(0);
}
const privatePath = value => {
  if (!value) return null;
  const resolved = path.resolve(value);
  const relative = path.relative(root, resolved);
  assert(relative.startsWith(`..${path.sep}`) || relative === "..", "Inventory input/output belongs outside this public repository.");
  return resolved;
};
const out = privatePath(arg("out"));
const savedFile = privatePath(arg("saved-metadata"));
const savedSnapshot = savedFile ? JSON.parse(fs.readFileSync(savedFile, "utf8")) : null;
const saved = savedSnapshot ? new Map(savedSnapshot.rows.map(row => [row.content_key, row])) : null;
if (saved) assert.equal(saved.size, savedSnapshot.rows.length, "Duplicate saved keys require manual review.");
const server = await createServer({ root: path.join(root, "apps/web"), configFile: false,
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });

try {
  const { natalInsightSigns: signs, natalInsightTopics: topics } = await server.ssrLoadModule("/src/content/natalInsightCatalog.ts");
  const { natalInsightCompositionPlan: planFor } = await server.ssrLoadModule("/src/services/natalInsightComposition.ts");
  const { natalInsightCompleteKey: completeKey } = await server.ssrLoadModule("/src/services/natalInsightCompleteReading.ts");
  const { parseNatalInsightCombinationKey: parseCompleteKey, natalInsightCombinationKey: encodeCompleteKey } = await server.ssrLoadModule("/src/content/natalInsightCombination.ts");
  const completeKeys = new Set();
  const { traditionalSignRulers: rulers } = await server.ssrLoadModule("/src/content/skySunSeason.ts");
  const houseRuler = (ascendant, house) => rulers[signs[(signs.indexOf(ascendant) + house - 1) % 12].toLowerCase()];
  // Editorial dimensions mirror the current reader. Repeated planet identities
  // are deduplicated before enumeration (Sun for Leo rising; Venus for Taurus/Libra fifth).
  const definitions = [
    { topic: "approach", variant: "timed", known: true, ascendants: signs, expected: 1596,
      planets: asc => ["sun", houseRuler(asc, 1)], dimensions: "Rising sign + chart ruler sign/derived house + Sun sign" },
    { topic: "approach", variant: "untimed", known: false, ascendants: [null], expected: 144,
      planets: () => ["sun", "moon"], dimensions: "Sun sign + Moon sign; no houses or angles" },
    { topic: "emotional-needs", variant: "any-birth-time", known: false, ascendants: [null], expected: 144,
      planets: () => ["moon", "sun"], dimensions: "Moon sign + Sun sign" },
    { topic: "home-belonging", variant: "timed", known: true, ascendants: signs, expected: 144,
      planets: asc => [houseRuler(asc, 4)], dimensions: "Fourth-house sign + its ruler sign/derived house" },
    { topic: "creativity-pleasure", variant: "timed", known: true, ascendants: signs, expected: 1464,
      planets: asc => [houseRuler(asc, 5), "venus"], dimensions: "Fifth-house sign + its ruler sign/derived house + Venus sign" },
    { topic: "style-expression", variant: "timed", known: true, ascendants: signs, expected: 1728,
      planets: () => ["venus", "moon"], dimensions: "Venus sign + Moon sign + fifth-house sign" },
    { topic: "style-expression", variant: "untimed", known: false, ascendants: [null], expected: 144,
      planets: () => ["venus", "moon"], dimensions: "Venus sign + Moon sign; no fifth house" },
    { topic: "money-resources", variant: "timed", known: true, ascendants: signs, expected: 144,
      planets: asc => [houseRuler(asc, 2)], dimensions: "Second-house sign + its ruler sign/derived house" },
    { topic: "work-direction", variant: "timed-with-midheaven", known: true, ascendants: signs, mc: signs, expected: 248832,
      planets: asc => [10, 6, 2].map(house => houseRuler(asc, house)), dimensions: "Linked tenth/sixth/second-house signs + three rulers' signs/derived houses + Midheaven sign" },
    { topic: "work-direction", variant: "timed-without-midheaven", known: true, ascendants: signs, expected: 20736,
      planets: asc => [10, 6, 2].map(house => houseRuler(asc, house)), dimensions: "Same three work-house ruler chains; existing optional Midheaven unavailable" }
  ];
  function* assignments(planets, index = 0, values = {}) {
    if (index === planets.length) { yield values; return; }
    for (const sign of signs) yield* assignments(planets, index + 1, { ...values, [planets[index]]: sign });
  }
  const allKeys = new Set();
  const variants = [];
  const firstBatchInventory = [];
  const perTopicSignatures = new Map(topics.map(topic => [topic.id, new Set()]));
  for (const definition of definitions) {
    const dependencies = new Set();
    const requiredMissing = new Set();
    const optionalMissing = new Set();
    let count = 0;
    let first = null;
    for (const ascendant of definition.ascendants) {
      const planets = [...new Set(definition.planets(ascendant))];
      for (const positions of assignments(planets)) for (const mc of definition.mc ?? [null]) {
        const sky = { birthTimeKnown: definition.known, ascendant: ascendant ?? "", aspects: [],
          positions: Object.entries(positions).map(([planet, sign]) => ({ planet, sign, degree: 0, house: null, motion: "direct" })),
          ...(mc ? { midheavenLongitude: signs.indexOf(mc) * 30 } : {}) };
        const plan = planFor(definition.topic, sky, definition.known, "you");
        assert.equal(plan.unavailable, null, `${definition.topic}/${ascendant}/${JSON.stringify(positions)}`);
        const signature = JSON.stringify([plan.templateKey, plan.passages.map(p => [p.slot, p.contextualKey ?? p.key, p.slots ?? null])]);
        const digest = createHash("sha256").update(signature).digest("hex");
        const seen = perTopicSignatures.get(definition.topic);
        assert(!seen.has(digest), `Double-counted state: ${signature}`);
        seen.add(digest);
        const fullKey = completeKey(definition.topic, sky, definition.known, "you");
        assert(fullKey && !completeKeys.has(fullKey), "Every structural state needs a unique complete key");
        assert.equal(encodeCompleteKey(parseCompleteKey(fullKey)), fullKey);
        completeKeys.add(fullKey);
        count++;
        if (!first) first = { ascendant, positions, midheaven: mc };
        if (["emotional-needs", "home-belonging", "money-resources"].includes(definition.topic)) {
          const houses = { "home-belonging": 4, "money-resources": 2 };
          const house = houses[definition.topic];
          const matchingFacts = house ? {
            sourceHouse: house, sourceSign: plan.slots.insightHouseSign,
            ruler: plan.slots.insightRulerName, rulerSign: plan.slots.insightRulerSignName,
            destinationHouse: Number.parseInt(plan.slots.insightRulerHouseName, 10)
          } : { moonSign: plan.slots.insightMoonSign, sunSign: plan.slots.insightSunSign };
          for (const audience of ["you", "they"]) firstBatchInventory.push({ topic: definition.topic, audience,
            proposedContentKey: completeKey(definition.topic, sky, definition.known, audience === "they" ? "friend" : "you"),
            matchingFacts, state: "not-authored", body: null,
            legacySourceKeys: plan.passages.map(p => p.key.replace(/\/you\//u, `/${audience}/`)) });
        }
        const keys = [plan.templateKey, ...plan.passages.map(p => p.key)];
        const optional = plan.passages.flatMap(p => p.contextualKey ? [p.contextualKey] : []);
        // Shared group passages contain independently written audience branches;
        // ruler and house-connection records and reading templates have separate keys.
        for (const original of keys) for (const key of new Set([original, original.replace(/\/you\//u, "/they/")])) {
          dependencies.add(key); allKeys.add(key);
          if (saved && !saved.has(key)) requiredMissing.add(key);
        }
        for (const original of optional) for (const key of [original, original.replace(/\/you\//u, "/they/")]) {
          dependencies.add(key); allKeys.add(key);
          if (saved && !saved.has(key)) optionalMissing.add(key);
        }
      }
    }
    assert.equal(count, definition.expected, `${definition.topic}/${definition.variant} changed; review selection dimensions.`);
    variants.push({ topic: definition.topic, variant: definition.variant, dimensions: definition.dimensions,
      structuralStates: count, separateAudienceReadings: count * 2, sample: first,
      existingCompositionDependencies: dependencies.size,
      missingRequiredLegacySources: [...requiredMissing].sort(), missingOptionalContextualSources: [...optionalMissing].sort() });
  }
  // Neither dormant angles nor a cached ascendant can create house-based readings
  // when the birth time is unknown.
  for (const topic of ["home-belonging", "creativity-pleasure", "money-resources", "work-direction"]) {
    assert.equal(planFor(topic, { birthTimeKnown: false, ascendant: "Aries", positions: [], aspects: [], midheavenLongitude: 0 }, true).unavailable, "birth-time");
  }
  const totals = variants.reduce((sum, row) => ({ structuralStates: sum.structuralStates + row.structuralStates,
    separateAudienceReadings: sum.separateAudienceReadings + row.separateAudienceReadings }), { structuralStates: 0, separateAudienceReadings: 0 });
  assert.equal(totals.structuralStates, 275076);
  const inventory = saved ? { snapshotReadAt: savedSnapshot.readAt, metadataSha256: createHash("sha256").update(fs.readFileSync(savedFile)).digest("hex"),
    rowCount: saved.size, statusCounts: Object.fromEntries([...new Set([...saved.values()].map(row => row.status))].map(status => [status, [...saved.values()].filter(row => row.status === status).length])),
    selectedLegacySourceCount: [...allKeys].filter(key => saved.has(key)).length,
    unselectedSavedKeys: [...saved.keys()].filter(key => !allKeys.has(key)).sort() } : null;
  const report = { schema: "natal-insight-combination-inventory/v1", generatedAt: new Date().toISOString(),
    revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    model: "Existing traditional rulers / whole-sign topic selection, separate You and Friends prose",
    countMeaning: "Structural upper bounds accepted by selection logic; not counts of astronomically reachable birth charts or approved writing requests.",
    exclusions: ["No degrees, aspects, house occupants, retrograde state, sect or planetary condition in this shared combination identity.",
      "No ephemeris date/location reachability audit. Mercury/Venus proximity and Ascendant/Midheaven geometry can remove apparent permutations.",
      "No private account/chart-specific readings inspected. No prose fetched, modified, generated or published.",
      "Existing 2,016 synthetic composition fixtures exercise sources; they do not prove exhaustive authored combination coverage."],
    variants, totals, savedInventory: inventory,
    firstBatchInventoryNote: "864 proposed complete-reading records for the three smallest topics. Planning only: not saved Studio rows, approved outlines, generated drafts or a billed batch. Legacy source keys identify review material, not permission to combine or rewrite approved copy.",
    firstBatchInventory };
  assert.equal(firstBatchInventory.length, 864);
  assert.equal(new Set(firstBatchInventory.map(row => row.proposedContentKey)).size, 864);
  if (out) fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ variants: variants.map(({ topic, variant, structuralStates, separateAudienceReadings, missingRequiredLegacySources }) => ({ topic, variant, structuralStates, separateAudienceReadings, missingRequiredLegacySourceCount: missingRequiredLegacySources.length })), totals, savedRowCount: inventory?.rowCount ?? null, out }, null, 2));
} finally { await server.close(); }
