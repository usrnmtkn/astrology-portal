import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import revision from "../docs/content-review/sky-summary-owner-revision-2026-09-11.json";
import legacy from "../apps/web/src/content/skyDailySummaryLegacyAssembly.json";
import { skyDailySummaryParts, skySummaryParagraphs, type SkyDailySummaryFacts } from "../apps/web/src/content/skyDailySummary.ts";
import { skySummaryTemplateErrors, currentSkySummaryWording } from "../apps/web/src/content/skyDailySummaryCatalog.ts";
import { skySummaryEventFacts } from "../apps/web/src/content/skySummaryEvents.ts";
assert.equal(createHash("sha256").update(revision.body).digest("hex"), revision.sha256);
assert.equal(revision.body.split(/\s+/u).length, revision.wordCount);
const content = new Map([[revision.contentKey, { id: "owner-revision", body: revision.body, status: "LIVE", updatedAt: "" }]]);
const render = (facts: SkyDailySummaryFacts, rows: any = content) => skySummaryParagraphs(skyDailySummaryParts(facts, rows)).map(paragraph => paragraph.map(part => part.text).join(""));
const station = { id: "uranus-station", label: "Uranus stations retrograde in Gemini", direction: "retrograde" as const, planet: "Uranus", startsAt: "2026-09-10T12:00:00Z" };
const facts: SkyDailySummaryFacts = { sun: { sign: "Virgo", degree: 18 }, moon: { sign: "Virgo", degree: 18 }, moonIsVoid: false, asOf: "2026-09-10T18:00:00Z",
 event: { sun: { sign: "Virgo", degree: 18 }, sign: "Virgo", degree: 18, name: "New Moon", isToday: true, countdown: "today" },
 stations: [station], ingresses: [{ id: "venus", label: "Venus enters Scorpio" }, { id: "mercury", label: "Mercury enters Libra" }],
 exactAspects: [{ id: "a", label: "Moon squares Uranus" }, { id: "b", label: "Sun trines Lilith Rx" }, { id: "c", label: "Moon trines Lilith Rx" }],
 retrogradePlacements: [{ planet: "Saturn", sign: "Aries", degree: 13 }, { planet: "Uranus", sign: "Gemini", degree: 5 }, { planet: "Neptune", sign: "Aries", degree: 3 }, { planet: "Pluto", sign: "Aquarius", degree: 3 }, { planet: "Chiron", sign: "Taurus", degree: 0 }, { planet: "Lilith", sign: "Capricorn", degree: 17 }] };
const paragraphs = render(facts);
assert.equal(paragraphs.length, 3);
assert.equal(paragraphs[0], `The Sun in Virgo at 18° turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing. The New Moon in Virgo at 18° ${revision.body}.`);
assert.equal(paragraphs[1], "Two planets change signs today: Venus enters Scorpio and Mercury enters Libra. Uranus stations retrograde in Gemini today, bringing the number of retrograde planets to six: Saturn Rx in Aries at 13°, Uranus Rx in Gemini at 5°, Neptune Rx in Aries at 3°, Pluto Rx in Aquarius at 3°, Chiron Rx in Taurus at 0°, and Lilith Rx in Capricorn at 17°.");
assert.equal(paragraphs[2], "Three aspects are exact today: Moon squares Uranus, Sun trines Lilith Rx, and Moon trines Lilith Rx.");
for (const part of skyDailySummaryParts(facts, content).filter(part => part.sourceKey === revision.contentKey)) assert.equal(part.text, revision.body);
assert.equal(skyDailySummaryParts(facts, content).filter(part => part.action === "retrograde").length, 6);
for (const ingresses of [[], facts.ingresses!.slice(0, 1), facts.ingresses!, [...facts.ingresses!, { id: "sun", label: "Sun enters Libra" }]]) {
 const expected = ["", "Venus enters Scorpio today.", "Two planets change signs today: Venus enters Scorpio and Mercury enters Libra.", "Three planets change signs today: Venus enters Scorpio, Mercury enters Libra, and Sun enters Libra."][ingresses.length];
 assert.equal(render({ moonIsVoid: false, ingresses }).join(""), expected);
}
for (const changed of [
 { stations: [] }, { asOf: "2026-09-10T11:00:00Z" }, { asOf: undefined },
 { stations: [{ ...station, startsAt: "invalid" }] }, { stations: [{ ...station, direction: "direct" as const }] },
 { stations: [station, { ...station, id: "second" }] }, { retrogradePlacements: facts.retrogradePlacements!.filter(p => p.planet !== "Uranus") }
]) {
 const result = render({ ...facts, ...changed });
 assert.ok(!result.join(" ").includes("bringing the number"));
 assert.match(result.at(-1)!, /planets are retrograde right now:/u);
 assert.ok(result.findIndex(p => p.startsWith("Three aspects")) < result.length - 1);
}
for (const [name, body] of Object.entries(legacy)) {
 const key = `cms/sky-daily-summary/assembly/${name}`;
 assert.deepEqual(skySummaryTemplateErrors(key, body), [], key);
 assert.ok(!/Also today|There (?:are|is) also|Today brings/u.test(currentSkySummaryWording(key, body)));
}
const oldRows = new Map([...content, ...Object.entries(legacy).map(([name, body]) => [`cms/sky-daily-summary/assembly/${name}`, { id: name, body, status: "LIVE", updatedAt: "" }] as const)]);
assert.deepEqual(render(facts, oldRows), paragraphs, "Saved former defaults must not reintroduce old grammar after hydration");
assert.ok(skySummaryTemplateErrors("cms/sky-daily-summary/assembly/stationDirectAlso", "Also today, {stationList}.").length === 0, "Exact former default is migrated");
assert.ok(skySummaryTemplateErrors("cms/sky-daily-summary/assembly/stationDirectFirst", "There are also changes: {stationList}.").length > 0, "New inventory-style templates are rejected");
const hidden = new Map(content); hidden.set("cms/sky-daily-summary/assembly/layout", { id: "hidden", body: "{openingSentence}\n\n{currentRetrogradesSentence}", status: "LIVE", updatedAt: "" });
assert.equal(render(facts, hidden).length, 2);
assert.match(render(facts, hidden)[1], /^Six planets are retrograde/u);
const event = { id: station.id, type: "station", phase: "station-retrograde", direction: station.direction, planet: station.planet, sign: "Gemini", startsAt: station.startsAt } as any;
assert.deepEqual(skySummaryEventFacts([event, event], new Map()).stations, [station]);
console.log("Sky summary event grammar: exact owner example, 0/1/2/3 cardinality, station chronology, background Rx, source preservation, and saved-template migration passed.");
