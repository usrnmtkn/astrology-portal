import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({ root: "./apps/web", configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { natalInsightCombinationKey: keyFor, parseNatalInsightCombinationKey: parse, natalInsightCombinationFields: fields } = await server.ssrLoadModule("/src/content/natalInsightCombination.ts");
  const { natalInsightCompleteKey: chartKey, resolveNatalInsightReading: resolve } = await server.ssrLoadModule("/src/services/natalInsightCompleteReading.ts");
  const { natalInsightCompositionPlan: planFor } = await server.ssrLoadModule("/src/services/natalInsightComposition.ts");
  const { natalInsightSigns: signs, natalInsightTopics: topics, isNatalInsightContentKey: valid } = await server.ssrLoadModule("/src/content/natalInsightCatalog.ts");
  const home = { topic: "home-belonging", audience: "you", timed: true, sourceSign: "Libra", planets: { venus: "Leo" } };
  const key = "cms/natal-insight/complete/v1/you/home-belonging/house-4-libra/venus-leo/house-2";
  assert.equal(keyFor(home), key);
  assert.deepEqual(fields(home).chains, [{ house: 4, sign: "Libra", planet: "venus", rulerSign: "Leo", destinationHouse: 2 }]);
  assert.equal(keyFor(parse(key)), key);
  assert(valid(key));
  for (const invalid of [key + "/private-123", key.replace("house-2", "house-3"), key.replace("venus-leo", "mars-leo"),
    key.replace("you/", "friend/"), key.replace("v1/", "v2/"), key.replace("libra", "unknown"), key + "/sun-leo", key.replace("venus-leo", "venus-Leo")]) {
    assert.equal(parse(invalid), null, invalid); assert(!valid(invalid));
  }
  const sky = { birthTimeKnown: true, ascendant: "Cancer", positions: [{ planet: "Venus", sign: "Leo", degree: 4 }], aspects: [] };
  assert.equal(chartKey(home.topic, sky, true), key);
  assert.equal(chartKey(home.topic, { ...sky, birthTimeKnown: false }, true), null);
  assert.equal(chartKey(home.topic, { ...sky, positions: [] }, true), null);
  let checked = 0;
  for (const ascendant of signs) for (let offset = 0; offset < 12; offset++) for (const topic of topics) for (const audience of ["you", "friend"]) for (const known of [false, true]) {
    const chart = { birthTimeKnown: known, ascendant, midheavenLongitude: offset * 30 + 7,
      positions: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].map((planet, i) => ({ planet, sign: signs[(offset + i) % 12] })), aspects: [] };
    const plan = planFor(topic.id, chart, known, audience);
    const key = chartKey(topic.id, chart, known, audience);
    if (plan.unavailable) assert.equal(key, null); else {
      assert(key, `${topic.id}/${ascendant}`); assert.equal(keyFor(parse(key)), key); assert(valid(key));
      if (topic.id === "emotional-needs") assert.equal(chartKey(topic.id, chart, !known, audience), key);
      const other = chartKey(topic.id, chart, known, audience === "you" ? "friend" : "you");
      assert.notEqual(other, key);
    }
    checked++;
  }
  const leo = { topic: "approach", audience: "you", timed: true, sourceSign: "Leo", planets: { sun: "Gemini" } };
  assert.equal(keyFor(leo), "cms/natal-insight/complete/v1/you/approach/rising-leo/sun-gemini/house-11");
  assert.equal(fields({ ...home, topic: "creativity-pleasure", sourceSign: "Taurus" }).planets.length, 1);
  const fullBody = "### Libra on the 4th house\n\n**Complete fixture opening.** The entire saved paragraph remains here.\n\nComplete fixture ending.";
  const row = { id: "complete-fixture", contentKey: key, status: "LIVE", body: fullBody, headline: null, summary: null, sections: {}, updatedAt: "2026-10-10T00:00:00Z", sourceSnapshot: { contentType: "mustache-template", allowedSlots: [] } };
  const plan = planFor(home.topic, sky, true);
  assert.deepEqual(resolve(key, plan, new Map([[key, row]])), { body: fullBody, sourceKeys: [key], kind: "complete" });
  assert.equal(resolve(key, plan, new Map([[key, { ...row, status: "DRAFT" }]])), null);
  assert.equal(resolve(key, plan, new Map([[key, { ...row, body: "{{missing}}" }]])), null);
  assert.equal(resolve(key, plan, new Map()), null);
  assert.equal(resolve(key.replace("/you/", "/they/"), plan, new Map([[key, row]])), null);
  const friendKey = key.replace("/you/", "/they/");
  const named = { ...row, contentKey: friendKey, body: "**{{ownerName}} can state what they want.** The whole saved ending stays." };
  assert.equal(resolve(friendKey, plan, new Map([[friendKey, named]]), "Casey").body, "**Casey can state what they want.** The whole saved ending stays.");
  assert.equal(resolve(friendKey, plan, new Map([[friendKey, named]])).body, "**They can state what they want.** The whole saved ending stays.");
  console.log(`Complete natal reading identities: ${checked} chart/audience/time cases; strict key, exact full body and draft boundaries passed.`);
} finally { await server.close(); }
