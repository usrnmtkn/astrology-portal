import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";

const server = await createServer({ root: "./apps/web", configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { natalInsightTopics: topics, natalInsightSigns: signs, natalInsightPassageKey: passageKey, natalInsightTemplateKey: templateKey, isNatalInsightContentKey } = await server.ssrLoadModule("/src/content/natalInsightCatalog.ts");
  const { natalInsightCompositionPlan: planFor, natalInsightCompositionKeys: keysFor, composeNatalInsight: compose } = await server.ssrLoadModule("/src/services/natalInsightComposition.ts");
  const { natalInsightTitle } = await server.ssrLoadModule("/src/content/natalInsightTitle.ts");
  const { writingSurfaceAdminAccess } = await server.ssrLoadModule("../../apps/admin/src/writingSurfaceSourceMap.ts");
  const { interpolateTemplateString } = await server.ssrLoadModule("/src/services/templateInterpolation.ts");
  const { natalInsightSharedFixtureRows } = await server.ssrLoadModule("../../tests/helpers/natal-insight-shared-fixture.ts");
  let rows = natalInsightSharedFixtureRows();
  // Optional private editorial verification uses actual drafts without changing
  // their stored status. Only this isolated test map simulates approval.
  if (process.env.NATAL_INSIGHT_REVIEW_ROWS) rows = JSON.parse(fs.readFileSync(process.env.NATAL_INSIGHT_REVIEW_ROWS, "utf8"));
  assert.equal(rows.length, 472);
  for (const row of rows) assert(isNatalInsightContentKey(row.content_key), row.content_key);
  for (const key of ["cms/natal-insight/passage/ruler-house/13", "cms/natal-insight/passage/approach/unknown", "cms/natal-insight/you/money-resources/reading/untimed", "cms/natal-insight/you/approach/person"]) assert(!isNatalInsightContentKey(key), key);
  const { templateVariableSourceContract } = await server.ssrLoadModule("../../apps/admin/src/templateVariableSources.ts");
  const { compositionSurfaceFamilies } = await server.ssrLoadModule("../../apps/admin/src/compositionSurfaceSources.ts");
  const sourceContract = (name, topic, audience) => templateVariableSourceContract({ name, source: "Natal insight passage library", sourceKind: "saved-copy" }, templateKey(topic, audience));
  assert.deepEqual(sourceContract("insightRulerSign", "home-belonging", "friend").prefixes, ["cms/natal-insight/passage/ruler-placement/they/"]);
  assert.deepEqual(sourceContract("insightRulerHouse", "home-belonging", "you").prefixes, ["cms/natal-insight/passage/house-connection/you/4/"]);
  assert.deepEqual(sourceContract("insightDailyWorkConnection", "work-direction", "friend").prefixes, ["cms/natal-insight/passage/house-connection/they/6/"]);
  assert.deepEqual(sourceContract("insightResourcesConnection", "work-direction", "you").prefixes, ["cms/natal-insight/passage/house-connection/you/2/"]);
  const homeSources = compositionSurfaceFamilies["natal-insight-home-belonging"];
  assert(homeSources.test("cms/natal-insight/passage/house-connection/they/4/10"));
  assert(!homeSources.test("cms/natal-insight/passage/house-connection/they/10/4"), "Studio must link the correct direction of rulership");
  for (const audience of ["you", "they"]) for (const house of [2, 6, 10]) assert(compositionSurfaceFamilies["natal-insight-work-direction"].test(`cms/natal-insight/passage/house-connection/${audience}/${house}/4`));
  const content = new Map(rows.map((row, i) => [row.content_key, {
    id: `synthetic-${i}`, contentKey: row.content_key, body: row.body, headline: row.headline ?? null, summary: null, sections: {}, surface: "natal", mode: "article", status: "LIVE", targetDate: null, updatedAt: "2026-10-07T00:00:00Z", sourceSnapshot: row.source_snapshot
  }]));
  const guideKey = "cms/natal-insight/you/approach";
  const untimedGuideKey = `${guideKey}/untimed`;
  assert(isNatalInsightContentKey(untimedGuideKey));
  assert(!isNatalInsightContentKey("cms/natal-insight/you/home-belonging/untimed"));
  const guideContent = new Map(content);
  const guideRow = { ...content.values().next().value, contentKey: guideKey, headline: "Saved shared heading", body: "Saved guide." };
  guideContent.set(guideKey, guideRow);
  guideContent.set("cms/natal-insight/they/approach", { ...guideRow, headline: "Unused historical Friends title" });
  for (const audience of ["you", "friend"]) {
    assert.equal(natalInsightTitle("approach", audience, guideContent), "Saved shared heading");
    assert.equal(natalInsightTitle("approach", audience, guideContent, "", false), "Sun & Moon");
    const edited = new Map(guideContent).set(untimedGuideKey, { ...guideRow, contentKey: untimedGuideKey, headline: "Saved Sun and Moon heading" });
    assert.equal(natalInsightTitle("approach", audience, edited, "", false), "Saved Sun and Moon heading");
    edited.set(untimedGuideKey, { ...edited.get(untimedGuideKey), status: "DRAFT" });
    assert.equal(natalInsightTitle("approach", audience, edited, "", false), "Sun & Moon");
  }
  for (const topic of topics) {
    const starters = writingSurfaceAdminAccess[`natal-insight-${topic.id}`].cmsStarters;
    assert.equal(starters.filter(row => row.label === "Edit shared guide and title").length, 1);
    assert.equal(starters.find(row => row.label === "Edit shared guide and title").contentKey, `cms/natal-insight/you/${topic.id}`);
    assert(!starters.some(row => row.label === "Edit Friends title"));
  }
  assert(writingSurfaceAdminAccess["natal-insight-approach"].cmsStarters.some(row => row.contentKey === untimedGuideKey));
  const makeSky = (asc, offset) => ({ birthTimeKnown: true, ascendant: asc, ascendantLongitude: signs.indexOf(asc) * 30 + 10, midheavenLongitude: ((signs.indexOf(asc) + 8) % 12) * 30 + 5,
    positions: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Pluto"].map((planet, i) => ({ planet, sign: signs[(i + offset) % 12], degree: 10, house: 0, motion: "direct" })), aspects: [] });
  let combinations = 0;
  const selectedKeys = new Set();
  for (const asc of signs) for (let offset = 0; offset < 12; offset++) for (const topic of topics) for (const audience of ["you", "friend"]) {
    const plan = planFor(topic.id, makeSky(asc, offset), true, audience);
    keysFor(plan).forEach(key => selectedKeys.add(key));
    const reading = compose(plan, content);
    assert(reading?.body, `${asc}/${offset}/${topic.id}/${audience}`);
    assert.doesNotMatch(reading.body, /\{\{|undefined|null/);
    for (const passage of plan.passages) {
      const exact = interpolateTemplateString(content.get(passage.key).body, { ...plan.slots, ...passage.slots });
      assert(reading.body.includes(exact), `Preserve complete source ${passage.key}`);
    }
    if (topic.id === "emotional-needs") assert.equal(plan.passages[0].key, passageKey(topic.id, signs[(offset + 1) % 12]));
    if (topic.id === "work-direction") {
      assert.equal(plan.passages[0].key, passageKey(topic.id, signs[(signs.indexOf(asc) + 9) % 12]));
      assert(plan.passages.some(p => p.key === passageKey("midheaven", signs[(signs.indexOf(asc) + 8) % 12])), "Actual MC stays distinct from whole-sign tenth");
    }
    combinations++;
  }
  for (const row of rows.filter(row => /\/(ruler-placement|house-connection)\//.test(row.content_key))) {
    assert(selectedKeys.has(row.content_key), `Exercise every new passage: ${row.content_key}`);
  }
  for (const topic of topics) {
    const sky = makeSky("Scorpio", 2);
    sky.birthTimeKnown = false;
    const plan = planFor(topic.id, sky, true);
    if (["home-belonging", "creativity-pleasure", "money-resources", "work-direction"].includes(topic.id)) {
      assert.equal(plan.unavailable, "birth-time"); assert.deepEqual(keysFor(plan), []); assert.equal(compose(plan, content), null);
    } else {
      assert(compose(plan, content));
      assert(!keysFor(plan).some(key => /house-connection|ruler-placement|midheaven|creativity-pleasure/.test(key)), "Cached houses cannot leak into untimed composition");
    }
  }
  const plan = planFor("approach", makeSky("Scorpio", 0), true);
  // Audience selection must preserve each complete authored passage, including
  // contractions and paragraph boundaries, without doing pronoun substitution.
  const audiencePassage = "{{#insightIsYou}}You're reading your own chart.\n\nYour complete ending.{{/insightIsYou}}{{^insightIsYou}}They're reading their chart.\n\nTheir complete ending.{{/insightIsYou}}";
  for (const audience of ["you", "friend"]) {
    const audiencePlan = planFor("emotional-needs", makeSky("Scorpio", 0), true, audience);
    assert.equal(audiencePlan.slots.insightIsYou, audience === "you");
    const audienceContent = new Map(content);
    const selected = audiencePlan.passages[0].key;
    audienceContent.set(selected, { ...content.get(selected), body: audiencePassage });
    const body = compose(audiencePlan, audienceContent).body;
    assert(body.includes(audience === "you" ? "You're reading your own chart.\n\nYour complete ending." : "They're reading their chart.\n\nTheir complete ending."));
    assert(!body.includes(audience === "you" ? "They're reading their chart." : "You're reading your own chart."));
  }
  assert.equal(plan.passages.find(p => p.slot === "insightRulerSign").key, "cms/natal-insight/passage/ruler-placement/you/mars/leo");
  const paired = makeSky("Taurus", 0);
  paired.positions.find(p => p.planet === "Venus").sign = "Virgo";
  paired.positions.find(p => p.planet === "Mars").sign = "Virgo";
  const venus = planFor("approach", paired, true);
  const mars = planFor("approach", { ...paired, ascendant: "Scorpio" }, true);
  assert.equal(venus.slots.insightHouseSign, "Taurus");
  assert.equal(venus.slots.insightRulerName, "Venus");
  assert.equal(venus.slots.insightRulerSignName, "Virgo");
  assert.equal(venus.slots.insightRulerHouseName, "5th house");
  assert.equal(mars.slots.insightRulerName, "Mars");
  assert.equal(mars.slots.insightRulerHouseName, "11th house");
  const home = compose(planFor("home-belonging", makeSky("Gemini", 0), true), content).body;
  assert(home.includes("### Virgo on the 4th house"));
  assert(home.includes("### Mercury in Gemini · ruler of the 4th house"));
  assert(home.includes("### Mercury in the 1st house · ruler of the 4th house"));
  const untimed = planFor("style-expression", { ...paired, birthTimeKnown: false }, true);
  assert.equal(untimed.slots.insightHouseSign, undefined);
  assert.equal(untimed.slots.insightCreativitySign, undefined);
  assert(!compose(untimed, content).body.includes("5th house"), "Optional heading must disappear with its passage");
  assert.notEqual(venus.passages.find(p => p.slot === "insightRulerSign").key, mars.passages.find(p => p.slot === "insightRulerSign").key, "Same sign must not erase planet identity");
  assert.notEqual(compose(venus, content).body, compose(mars, content).body);
  // Retain all three work-house connections and distinct ruler identities.
  for (const asc of signs) {
    const work = planFor("work-direction", makeSky(asc, 0), true);
    for (const house of [2, 6, 10]) assert(work.passages.some(p => p.key.startsWith(`cms/natal-insight/passage/house-connection/you/${house}/`)));
    const rulers = work.passages.filter(p => p.key.includes("/ruler-placement/"));
    assert.equal(new Set(rulers.map(p => p.key)).size, rulers.length, "Each work house has a distinct traditional ruler");
  }
  // Independent expected ruler identities for all rising signs (10th, 6th, 2nd).
  const workSigns = { Aries: ["saturn", "mercury", "venus"], Taurus: ["saturn", "venus", "mercury"], Gemini: ["jupiter", "mars", "moon"], Cancer: ["mars", "jupiter", "sun"], Leo: ["venus", "saturn", "mercury"], Virgo: ["mercury", "saturn", "venus"], Libra: ["moon", "jupiter", "mars"], Scorpio: ["sun", "mars", "jupiter"], Sagittarius: ["mercury", "venus", "saturn"], Capricorn: ["venus", "mercury", "saturn"], Aquarius: ["mars", "moon", "jupiter"], Pisces: ["jupiter", "sun", "mars"] };
  for (const [asc, expected] of Object.entries(workSigns)) {
    const work = planFor("work-direction", makeSky(asc, 0), true, "friend");
    assert.deepEqual(work.passages.filter(p => p.key.includes("/ruler-placement/")).map(p => p.key.split("/").at(-2)), expected);
    assert(work.passages.filter(p => /ruler-placement|house-connection/.test(p.key)).every(p => p.key.includes("/they/")));
  }
  for (const key of ["cms/natal-insight/passage/ruler-placement/you/pluto/aries", "cms/natal-insight/passage/ruler-placement/friend/mars/aries", "cms/natal-insight/passage/house-connection/you/3/4", "cms/natal-insight/passage/house-connection/you/4/13"]) assert(!isNatalInsightContentKey(key));
  for (const key of [plan.templateKey, ...plan.passages.map(p => p.key)]) {
    const incomplete = new Map(content); incomplete.delete(key); assert.equal(compose(plan, incomplete), null);
    const draft = new Map(content); draft.set(key, { ...draft.get(key), status: "DRAFT" }); assert.equal(compose(plan, draft), null);
  }
  const missingWorkRuler = makeSky("Taurus", 0);
  missingWorkRuler.positions = missingWorkRuler.positions.filter(p => p.planet !== "Mercury");
  assert.equal(planFor("work-direction", missingWorkRuler, true).unavailable, "chart-facts");
  const workPlan = planFor("work-direction", makeSky("Taurus", 0), true);
  for (const key of [workPlan.templateKey, ...workPlan.passages.map(p => p.key)]) {
    const draft = new Map(content); draft.set(key, { ...draft.get(key), status: "DRAFT" });
    assert.equal(compose(workPlan, draft), null, `Every work dependency must be published: ${key}`);
  }
  const changedTemplate = new Map(content);
  changedTemplate.set(plan.templateKey, { ...content.get(plan.templateKey), body: "{{notProvided}}" });
  assert.equal(compose(plan, changedTemplate), null);
  const missing = makeSky("Scorpio", 0); missing.positions = [];
  assert.equal(planFor("approach", missing, true).unavailable, "chart-facts");
  // The same Venus placement needs separate money and home text. Drafts never
  // replace a published general passage; a malformed live replacement fails closed.
  const contextualPlan = planFor("money-resources", { ...paired, ascendant: "Aries" }, true);
  const selection = contextualPlan.passages.find(p => p.slot === "insightRulerSign");
  assert.equal(selection.contextualKey, "cms/natal-insight/passage/ruler-placement/you/2/venus/virgo");
  const contextualRows = new Map(content);
  const original = content.get(selection.key);
  const body = "**Complete contextual fixture opening.** Complete resources fixture ending.";
  contextualRows.set(selection.contextualKey, { ...original, contentKey: selection.contextualKey, body, status: "DRAFT" });
  assert.equal(compose(contextualPlan, contextualRows).body, compose(contextualPlan, content).body);
  contextualRows.set(selection.contextualKey, { ...contextualRows.get(selection.contextualKey), status: "LIVE" });
  const contextualReading = compose(contextualPlan, contextualRows);
  assert(contextualReading.body.includes(body));
  assert(!contextualReading.body.includes(original.body));
  assert(contextualReading.sourceKeys.includes(selection.contextualKey));
  assert(!contextualReading.sourceKeys.includes(selection.key));
  assert.equal(compose(planFor("home-belonging", { ...paired, ascendant: "Cancer" }, true), contextualRows).body,
    compose(planFor("home-belonging", { ...paired, ascendant: "Cancer" }, true), content).body);
  contextualRows.set(selection.contextualKey, { ...contextualRows.get(selection.contextualKey), body: "{{unavailableContext}}" });
  assert.equal(compose(contextualPlan, contextualRows), null);
  const contextualKeys = [...selectedKeys].filter(key => /ruler-placement\/(you|they)\/\d+\//.test(key));
  assert.equal(new Set(contextualKeys).size, 1008);
  for (const key of contextualKeys) assert(isNatalInsightContentKey(key), key);
  assert(!isNatalInsightContentKey("cms/natal-insight/passage/ruler-placement/you/3/venus/virgo"));
  assert(!isNatalInsightContentKey("cms/natal-insight/passage/ruler-placement/you/2/pluto/virgo"));
  console.log(`PASS ${combinations} topic/audience combinations, all 472 source keys, complete paragraph preservation, traditional rulers, MC separation, unknown time, missing sources and draft exclusion.`);
} finally { await server.close(); }
