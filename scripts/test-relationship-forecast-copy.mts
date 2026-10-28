import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { rateRelationshipContacts, type ForecastContact } from "../apps/web/src/services/relationshipForecast.ts";

const server = await createServer({ root: "./apps/web", appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
try {
  const copy = await server.ssrLoadModule("/src/content/relationshipForecastCopy.ts");
  const publications = await server.ssrLoadModule("/src/content/contentPublicationState.ts");
  const contact = (planet: string, aspect: string, units = 100): ForecastContact => ({ id: `${planet}:${aspect}:Sun`, planet, aspect, target: "Sun", units, orb: 0,
    channel: ["trine", "sextile"].includes(aspect) ? "flow" : ["square", "opposition"].includes(aspect) ? "friction" : "unrated", exactAt: [], continuesFromPreviousDay: false, continuesIntoNextDay: false,
    owner:"reader",targetLongitude:0,transitLongitude:60,peakAt:"2026-10-25T12:00:00Z",activeIntervals:[],timeLord:false,retrograde:false,connections:[{id:"link",readerPoint:"Sun",friendPoint:"Mars",aspect:"trine",orb:0,directContactId:"other"}] });
  for (const [aspect, degrees] of [["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180]] as const) {
    assert(copy.forecastContactContribution(contact("Moon", aspect)).includes(`${degrees}°`));
  }
  assert.match(copy.forecastContactContribution({...contact("Mars", "square"),connections:[]}), /personal influence.*does not establish friction/);
  const day = (contacts: ForecastContact[]) => ({ date: "2026-10-25", start: "2026-10-25T04:00:00Z", end: "2026-10-26T04:00:00Z", contacts, ...rateRelationshipContacts(contacts), mainThemes:[],annualTiming:[] });
  for (const [contacts, expected] of [
    [[contact("Venus", "trine", 100), contact("Jupiter", "opposition", 49)], /Flow leads.*synastry/],
    [[contact("Venus", "trine", 49), contact("Jupiter", "opposition", 100)], /Friction leads.*personal reaction/],
    [[contact("Venus", "trine", 100), contact("Jupiter", "opposition", 50)], /Both flow and friction/],
    [[contact("Moon", "conjunction", 35), contact("Venus", "trine", 100)], /Personal influences.*Active/],
    [[contact("Moon", "sextile", 29)], /Personal influences.*Active/],
    [[], /No natal contacts.*1°/]
  ] as const) assert.match(copy.forecastRatingExplanation(day([...contacts])), expected);
  const runtime = await server.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  const {friendsViewModelDependencies:model} = await server.ssrLoadModule("/src/App.tsx");
  const {forecastPersonalReading} = await server.ssrLoadModule("/src/features/friends/forecastPersonalReading.ts");
  const timing={currentStart:"2026-10-24T00:00:00Z",currentEnd:"2026-10-26T14:00:00Z",engagementStart:"2026-10-24T00:00:00Z",engagementEnd:"2026-10-26T14:00:00Z",group:"this-week",phase:"exact",passIndex:1,exactPasses:[]};
  for(const owner of ["reader","friend"] as const) {
    const readings=[];
    for(const [target,aspect] of [["Mars","sextile"],["Sun","sextile"],["Mars","square"],["Moon","square"]]) {
      const row={...contact("Moon",aspect),owner,target};
      const reading=forecastPersonalReading(row,timing,"Fixture Friend","America/New_York",model.normalizePersonalTransitSurface);
      assert(reading,`${owner}: existing Moon ${aspect} ${target} reading is selected`);
      assert.match(reading.contentKey,new RegExp(`^authored/transit-aspect/moon/${target.toLowerCase()}/`));
      const source=runtime.transitV3AuthoredCardForContentKey(reading.contentKey);
      const original=owner === "reader" ? source.body_you??source.body : source.body_they;
      const {fillConnectionVariables,connectionAspectWord}=await server.ssrLoadModule("/src/content/connectionTransit.ts");
      assert.equal(reading.body,fillConnectionVariables(original,{Name:owner==="reader"?"you":"Fixture Friend",aspectWord:connectionAspectWord(aspect),untilDate:"October 26, 2026"}),"Complete existing passage, including final sentence, is preserved with only declared date/voice slots filled.");
      readings.push(reading.body);
    }
    assert.equal(new Set(readings).size,readings.length,"Different ordered pairs/aspects keep distinct readings.");
  }
  const nodeSextile={...contact("Sun","sextile"),target:"North Node"};
  assert.equal(forecastPersonalReading(nodeSextile,timing,"Fixture Friend","America/New_York",()=>({sections:[{slot:"meaning",body:"Wrong-aspect fixture",sourceKeys:["authored/transit-aspect/sun/north-node/conjunction"]}]})),null,"An existing conjunction passage cannot explain a sextile to the same natal point.");
  const education = JSON.parse(readFileSync("data/astro-101/astro-101-rows.json", "utf8")).rows.find((row: { content_key: string }) => row.content_key === copy.forecastAspectGuideKey);
  const guideRow = { ...education, id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb", status: "LIVE", lane: "serving", review_state: null, updated_at: "2026-10-25T16:00:00Z" };
  const publication = { content_key: guideRow.content_key, state: "live", revision: 50000, row_id: guideRow.id, row_updated_at: guideRow.updated_at, updated_at: "2026-10-25T16:00:00Z" };
  publications.installContentPublications([publication]);
  const guide = copy.forecastAspectGuide([guideRow]);
  assert.equal(guide.body, education.sections.blocks.find((block: { heading: string }) => block.heading === "Ptolemy's five").body, "The complete published aspect block stays indivisible.");
  assert.equal(copy.forecastAspectGuide([{ ...guideRow, status: "DRAFT" }]), null);
  assert.equal(copy.forecastAspectGuide([{ ...guideRow, updated_at: "2026-10-24T16:00:00Z" }]), null);
  for (const key of ["fallback-hook/pair-daily/bond-clause/soft/moon", "authored/transit-aspect/moon/mars/sextile", "composite.aspect.moon.sextile.mars"]) {
    assert.equal(copy.forecastAspectGuide([{ ...guideRow, content_key: key }]), null, "Another technique cannot supply the published aspect guide.");
  }
  publications.installContentPublications([{ ...publication, state: "retired", revision: 50003 }]);
  assert.equal(copy.forecastAspectGuide([guideRow]), null, "Retired Learn copy must disappear too.");
  console.log("Forecast readings: distinct same-pair/aspect You and Friend passages remain complete; wrong-aspect substitutions, drafts, retired rows and other techniques are refused; status facts and published Learn blocks passed.");
} finally { await server.close(); }
