import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "esbuild";

// Exercise the actual request builder and HTTP payload, without a provider or database.
const result = await build({
  stdin: { contents: `export * from './apps/web/src/features/you/youTransitReports.ts';
    export { compactYouTransitReadingBrief, youTransitReadingRequestLock, youTransitReadingPrompt } from './api/_lib/you-transit-reading.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "session-fixture", setup(b) {
    b.onResolve({ filter: /\/auth$/ }, () => ({ path: "auth", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents:
      'export const getSupabaseClient = async () => ({auth:{getSession:async()=>({data:{session:{access_token:"fixture",user:{id:"fixture"}}},error:null})}});' }));
  } }]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const wholeBody = "First complete paragraph.\n\n" + "All of this source must survive. ".repeat(180) + "Final sentence.";
const transit = { transitId: "calculated-transit", heading: "Fixture", body: wholeBody, sourceUnits: ["fixture/approved-source"] };
const day = api.buildYouDayReportBrief({
  dateLabel: "September 21",
  dailyAssembly: { specialSections: [], reportTransitReadings: [transit], reportSourceGaps: ["missing-source"],
    derivation: { targetDate: "2026-09-21", qualifyingTransits: [{id: transit.transitId}], moonDriver: null } }
});
let prepared = false;
const freshDay = await api.prepareYouDayReportBrief({ dateLabel: 'September 21', dailyAssembly: {
  specialSections: [], reportTransitReadings: [], reportSourceGaps: [transit.transitId],
  derivation: { targetDate: '2026-09-21', qualifyingTransits: [{ id: transit.transitId }] },
  prepareReportSources: async () => { await Promise.resolve(); prepared = true; return { reportTransitReadings: [transit], reportSourceGaps: [] }; }
} });
assert.ok(prepared);
assert.deepEqual(freshDay.approvedReaderText.transitReadings, [transit], 'Explicit report intent rebuilds the brief after source loading.');
assert.deepEqual(freshDay.technicalEvidence.sourceGaps, []);
await assert.rejects(() => api.prepareYouDayReportBrief({ dateLabel: '', dailyAssembly: {
  specialSections: [], derivation: {}, prepareReportSources: async () => { throw Error('source unavailable'); }
} }), /source unavailable/u, 'A loading failure must not silently submit the earlier thin brief.');
assert.ok(day, "A complete approved transit can support a report without a daily summary.");
assert.deepEqual(day.approvedReaderText.transitReadings, [transit]);
assert.deepEqual(day.technicalEvidence.sourceGaps, ["missing-source"]);
assert.equal(day.approvedReaderText.sourceGaps, undefined);
assert.equal(api.buildYouDayReportBrief({ dateLabel: "", dailyAssembly: {
  specialSections: [], reportSourceGaps: ["missing-source"],
  derivation: { targetDate: "2026-09-21", qualifyingTransits: [{id: "calculated-only"}] }
} }), null, "A technical fact or a source-gap marker cannot stand in for approved meaning.");

const locked = api.youTransitReadingRequestLock({ brief: day });
assert.deepEqual(locked.facts.youTransitReadingBrief.approvedReaderText.transitReadings, [transit]);
assert.deepEqual(api.compactYouTransitReadingBrief(locked.brief), day,
  "Daily recovery must retain complete approved sources.");
const prompt = api.youTransitReadingPrompt({ brief: locked.brief, headline: locked.headline });
const approved = JSON.parse(prompt.split("APPROVED READER TEXT\n")[1].split("\n\nTECHNICAL EVIDENCE")[0]);
assert.deepEqual(approved.transitReadings, [transit], "The writer receives each passage byte-for-byte.");
assert.equal(approved.sourceGaps, undefined);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_url, input) => {
    const payload = JSON.parse(input.body);
    assert.equal(payload.brief.approvedReaderText.transitReadings[0].body, wholeBody);
    return new Response(JSON.stringify({ status: "queued" }), {status: 202});
  };
  await api.requestYouTransitReport(freshDay, "fixture");
} finally { globalThis.fetch = originalFetch; }

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
assert.match(app, /dailyReportTransitSources = aspectRows\.map/u);
assert.match(app, /section: personalTransitPackageSection\(transit, targetDate\)/u);
assert.match(app, /body: section\.body,\s*sourceUnits: section\.sourceKeys/u);
console.log("Daily report handoff preserves complete approved transit passages through request, writer prompt and recovery; missing meaning stays explicit.");
