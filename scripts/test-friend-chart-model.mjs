import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  root: "./apps/web",
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const {
    buildFriendChartListItems,
    buildRelationshipComparisonOptions,
    manualChartBigThree
  } = await server.ssrLoadModule("/src/features/friends/friendChartModel.ts");
  const {
    natalBigThreeFromSky,
    zodiacFromBirthDate
  } = await server.ssrLoadModule("/src/services/chartProfile.ts");

  assert.equal(zodiacFromBirthDate("1990-03-21"), "Aries");
  assert.equal(zodiacFromBirthDate("05/20/1990"), "Taurus");
  assert.equal(zodiacFromBirthDate("invalid"), "Gemini");

  const natalChart = {
    ascendant: "Virgo",
    positions: [
      { planet: "Sun", sign: "Aries" },
      { planet: "Moon", sign: "Cancer" }
    ],
    aspects: []
  };
  assert.deepEqual(natalBigThreeFromSky(natalChart, false), {
    sun: "Aries",
    moon: "Cancer",
    rising: "Virgo"
  });
  assert.equal(natalBigThreeFromSky(natalChart, true).rising, "Rising pending");

  const chart = {
    id: "chart-1",
    chartType: "person",
    displayName: "Alex Morgan",
    birthDate: "1990-03-21",
    birthTime: null,
    birthTimeUnknown: true,
    birthPlace: "New York, NY",
    birthLocation: null,
    natalChart: null,
    relationshipType: "friend",
    pronouns: "they"
  };
  assert.deepEqual(manualChartBigThree(chart), {
    sun: "Aries",
    moon: "Moon pending",
    rising: "Rising pending"
  });

  const listItems = buildFriendChartListItems([chart], "chart-1", false);
  assert.equal(listItems.length, 1);
  assert.equal(listItems[0].active, true);
  assert.equal(listItems[0].initials, "AM");
  assert.equal(listItems[0].needsBirthTime, true);
  assert.equal(listItems[0].patternSummary, null);

  const options = buildRelationshipComparisonOptions({
    allFriendCharts: [
      chart,
      { ...chart, id: "event-1", chartType: "event", displayName: "Launch" }
    ],
    profileEmail: "stargazer@example.com",
    profileName: "Stella Ray",
    profileNatalSky: natalChart,
    selectedChartId: null
  });
  assert.deepEqual(options.map((option) => option.id), ["self", "chart-1"]);
  assert.equal(options[0].displayName, "You");
  assert.equal(options[0].subtitle, "Your birth chart");
  assert.equal(options[1].displayName, "Alex Morgan");
} finally {
  await server.close();
}

console.log("Friend chart view-model tests passed.");
