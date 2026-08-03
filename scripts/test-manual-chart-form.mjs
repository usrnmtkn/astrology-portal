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
    defaultManualChartForm,
    manualChartFormCopy,
    manualChartFormFromChart
  } = await server.ssrLoadModule("/src/features/friends/manualChartForm.ts");

  assert.equal(manualChartFormFromChart(null), defaultManualChartForm);
  assert.deepEqual(defaultManualChartForm, {
    chartType: "person",
    displayName: "",
    pronouns: "they",
    relationshipType: "friend",
    birthDate: "",
    birthTime: "12:00",
    birthTimeUnknown: false,
    birthPlace: "",
    birthLocation: null
  });
  assert.equal(manualChartFormCopy.person.title, "Add chart");
  assert.equal(manualChartFormCopy.person.editTitle, "Edit chart");
  assert.equal(manualChartFormCopy.event.title, "Add event chart");
  assert.equal(manualChartFormCopy.event.requiredMessage, "Add an event name, event date, and event place.");

  const birthLocation = {
    label: "New York, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  };
  const form = manualChartFormFromChart({
    chartType: "person",
    displayName: "Alex",
    pronouns: "he",
    relationshipType: "friend",
    birthDate: "1990-01-02",
    birthTime: "9:05 PM",
    birthTimeUnknown: false,
    birthPlace: "New York, NY",
    birthLocation
  });

  assert.deepEqual(form, {
    chartType: "person",
    displayName: "Alex",
    pronouns: "he",
    relationshipType: "friend",
    birthDate: "1990-01-02",
    birthTime: "21:05",
    birthTimeUnknown: false,
    birthPlace: "New York, NY",
    birthLocation
  });

  const legacyEventForm = manualChartFormFromChart({
    chartType: null,
    displayName: "Launch",
    pronouns: "unsupported",
    relationshipType: "event",
    birthDate: "2026-08-01",
    birthTime: null,
    birthTimeUnknown: true,
    birthPlace: "Remote",
    birthLocation
  });

  assert.equal(legacyEventForm.chartType, "event");
  assert.equal(legacyEventForm.pronouns, "they");
  assert.equal(legacyEventForm.birthTime, "12:00");
} finally {
  await server.close();
}

console.log("Manual chart form tests passed.");
