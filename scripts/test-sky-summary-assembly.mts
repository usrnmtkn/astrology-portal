import assert from "node:assert/strict";
import { skyDailySummaryParts, skySummaryParagraphs } from "../apps/web/src/content/skyDailySummary.ts";
import { skySummaryTemplateErrors, skyAssemblyFields } from "../apps/web/src/content/skyDailySummaryCatalog.ts";
import { skySummaryEventFacts } from "../apps/web/src/content/skySummaryEvents.ts";
import { buildSkySummaryComposition } from "../apps/admin/src/skySummaryComposition.ts";
const facts = { sun: { sign: "Virgo", degree: 15 }, moon: { sign: "Cancer", degree: 29 }, moonIsVoid: false,
 exactAspects: [{ id: "a", label: "Saturn squares Lilith" }],
 stations: [{ id: "s", label: "Mercury stations retrograde in Scorpio", direction: "retrograde" as const }],
 ingresses: [{ id: "i", label: "Venus enters Scorpio", tldr: "Full supplied TLDR." }],
 event: { name: "New Moon", sign: "Virgo", countdown: "today", isToday: true }
};
const row = (name: string, body: string, status = "LIVE") => ({ id: name, contentKey: `cms/sky-daily-summary/assembly/${name}`, body, status, updatedAt: "" } as any);
const render = (f = facts, rows: any[] = []) => skySummaryParagraphs(skyDailySummaryParts(f, new Map(rows.map(r => [r.contentKey, r])))).map(p => p.map(x => x.text).join(""));
assert.equal(render()[1], "Today brings one exact aspect: Saturn squares Lilith. Also today, Mercury stations retrograde in Scorpio. There is also one ingress: Venus enters Scorpio. Full supplied TLDR.");
assert.equal(render()[2], "The New Moon in Virgo is also exact today.");
const reordered = row("layout", "{openingSentence}\n\n{stationsSentence} {ingressesSentence} {exactAspectsSentence}\n\n{lunationSentence}");
assert.equal(render(facts, [reordered])[1], "Mercury stations retrograde in Scorpio today. There is also one ingress: Venus enters Scorpio. Full supplied TLDR. One aspect is also exact today: Saturn squares Lilith.");
const hidden = row("layout", "{openingSentence}\n\n{ingressesSentence}\n\n{lunationSentence}");
assert.equal(render(facts, [hidden])[1], "One ingress happens today: Venus enters Scorpio. Full supplied TLDR.");
assert.ok(!render(facts, [hidden]).join(" ").includes("stations"));
assert.deepEqual(render(facts, [{ ...hidden, status: "DRAFT" }]), render());
assert.deepEqual(render(facts, [row("layout", "{bogus}")]), render());
assert.equal(render({ ...facts, exactAspects: [], stations: [], ingresses: [] })[1], "The New Moon in Virgo is exact today.");
assert.equal(render({ ...facts, stations: [facts.stations[0], { id: "s2", label: "Saturn stations direct in Aries", direction: "direct" as any }] })[1], "Today brings one exact aspect: Saturn squares Lilith. Two planets also station today: Mercury stations retrograde in Scorpio and Saturn stations direct in Aries. There is also one ingress: Venus enters Scorpio. Full supplied TLDR.");
for (const field of skyAssemblyFields) assert.deepEqual(skySummaryTemplateErrors(field.key, field.body), []);
assert.ok(skySummaryTemplateErrors(hidden.contentKey, "{openingSentence} {stationsSentence} {stationsSentence}").length);
assert.ok(skySummaryTemplateErrors(hidden.contentKey, "{stationsSentence}").length);
const customizedOpening = row("opening", "The {sunPlacementLink} {sunSummary}. The {moonPlacementLink} {moonSummary}.");
const composed = buildSkySummaryComposition("Virgo", "Cancer", [{ content_key: customizedOpening.contentKey, id: "o", body: customizedOpening.body, status: "LIVE", lane: "serving" }], false);
assert.ok(composed.parts.map(p => p.text).join("").includes("punishing. The Moon"));
assert.ok(skyDailySummaryParts(facts, new Map([[customizedOpening.contentKey, customizedOpening]])).some(p => p.action === "sun" && p.text === "Sun in Virgo at 15°"));
const station = { id: "s", type: "station", planet: "Mercury", sign: "Scorpio", direction: "retrograde" } as any;
assert.deepEqual(skySummaryEventFacts([station, station], new Map()).stations, facts.stations);
assert.equal(skySummaryEventFacts([{ ...station, direction: undefined }], new Map()).stations.length, 0);
console.log("Assembly: reorder, omission, singular/plural, station fact links, today lunation, published parity, and draft/invalid gates passed.");

assert.equal(skySummaryEventFacts([{ ...station, phase: "retrograde-passage" }], new Map()).stations.length, 0, "An ongoing retrograde is not a station today");
