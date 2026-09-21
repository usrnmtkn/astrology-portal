import assert from "node:assert/strict";
import { skyDailySummaryParts, skySummaryParagraphs } from "../apps/web/src/content/skyDailySummary.ts";
import { skySummaryTemplateErrors, skyAssemblyFields } from "../apps/web/src/content/skyDailySummaryCatalog.ts";
import { skySummaryEventFacts } from "../apps/web/src/content/skySummaryEvents.ts";
import { buildSkySummaryComposition } from "../apps/admin/src/skySummaryComposition.ts";
const facts = { sun: { sign: "Virgo", degree: 15 }, moon: { sign: "Cancer", degree: 29 }, moonIsVoid: false,
 exactAspects: [{ id: "a", label: "Saturn squares Lilith" }],
 stations: [{ id: "s", label: "Mercury stations retrograde in Scorpio", direction: "retrograde" as const, planet: "Mercury", startsAt: "2026-09-10T10:00:00Z" }],
 ingresses: [{ id: "i", label: "Venus enters Scorpio", tldr: "Full supplied TLDR." }],
 event: { name: "New Moon", sign: "Virgo", countdown: "today", isToday: true }
};
const row = (name: string, body: string, status = "LIVE") => ({ id: name, contentKey: `cms/sky-daily-summary/assembly/${name}`, body, status, updatedAt: "" } as any);
const render = (f = facts, rows: any[] = []) => skySummaryParagraphs(skyDailySummaryParts(f, new Map(rows.map(r => [r.contentKey, r])))).map(p => p.map(x => x.text).join(""));
assert.equal(render()[1], "Venus enters Scorpio today. Full supplied TLDR. Mercury stations retrograde in Scorpio today.");
assert.equal(render().length, 3);
assert.ok(render()[0].includes("New Moon in Virgo calls us to clear the clutter"));
const reordered = row("layout", "{openingSentence}\n\n{stationsSentence} {ingressesSentence} {exactAspectsSentence}\n\n{lunationSentence}");
assert.equal(render(facts, [reordered])[1], "Mercury stations retrograde in Scorpio today. Venus enters Scorpio today. Full supplied TLDR. Saturn squares Lilith is exact today.");
const hidden = row("layout", "{openingSentence}\n\n{ingressesSentence}\n\n{lunationSentence}");
assert.equal(render(facts, [hidden])[1], "Venus enters Scorpio today. Full supplied TLDR.");
assert.ok(!render(facts, [hidden]).join(" ").includes("stations"));
assert.deepEqual(render(facts, [{ ...hidden, status: "DRAFT" }]), render());
assert.deepEqual(render(facts, [row("layout", "{bogus}")]), render());
assert.equal(render({ ...facts, exactAspects: [], stations: [], ingresses: [] }).length, 1);
assert.equal(render({ ...facts, stations: [facts.stations[0], { id: "s2", label: "Saturn stations direct in Aries", direction: "direct" as any }] })[1], "Venus enters Scorpio today. Full supplied TLDR. Two planets station today: Mercury stations retrograde in Scorpio and Saturn stations direct in Aries.");
for (const field of skyAssemblyFields) assert.deepEqual(skySummaryTemplateErrors(field.key, field.body), []);
assert.ok(skySummaryTemplateErrors(hidden.contentKey, "{openingSentence} {stationsSentence} {stationsSentence}").length);
assert.ok(skySummaryTemplateErrors(hidden.contentKey, "{stationsSentence}").length);
const customizedOpening = row("opening", "The {sunPlacementLink} {sunSummary}. The {moonPlacementLink} {moonSummary}.");
const composed = buildSkySummaryComposition("Virgo", "Cancer", [{ content_key: customizedOpening.contentKey, id: "o", body: customizedOpening.body, status: "LIVE", lane: "serving" }], false);
assert.ok(composed.parts.map(p => p.text).join("").includes("punishing. The Moon"));
assert.equal(composed.parts.map(p => p.text).join("").includes("punishing ."), false);
const trailingSpaceVirgo = {
  ...row("sun/virgo", "turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing ."),
  contentKey: "cms/sky-daily-summary/sun/virgo"
};
const trailingSpaceText = skyDailySummaryParts(
  facts,
  new Map([[trailingSpaceVirgo.contentKey, trailingSpaceVirgo]])
).map(part => part.text).join("");
assert.ok(trailingSpaceText.includes("punishing. The New Moon"));
assert.equal(trailingSpaceText.includes("punishing ."), false, "A stored Sun clause must not keep a space before the period.");
assert.equal(trailingSpaceText.includes("punishing.."), false, "A clause that already ends in a period must not gain a second one.");
assert.ok(skyDailySummaryParts(facts, new Map([[customizedOpening.contentKey, customizedOpening]])).some(p => p.action === "sun" && p.text === "Sun in Virgo at 15°"));
const station = { id: "s", type: "station", planet: "Mercury", sign: "Scorpio", direction: "retrograde", startsAt: "2026-09-10T10:00:00Z" } as any;
assert.deepEqual(skySummaryEventFacts([station, station], new Map()).stations, facts.stations);
assert.equal(skySummaryEventFacts([{ ...station, direction: undefined }], new Map()).stations.length, 0);
console.log("Assembly: reorder, omission, singular/plural, station fact links, today lunation, published parity, and draft/invalid gates passed.");

assert.equal(skySummaryEventFacts([{ ...station, phase: "retrograde-passage" }], new Map()).stations.length, 0, "An ongoing retrograde is not a station today");

const inlineOpening = row("opening", "Today, the {sunName} moving through {sunSign}{sunDegree} {sunSummary}, while the {moonName} in {moonSign}{moonDegree} {moonSummary}.");
assert.deepEqual(skySummaryTemplateErrors(inlineOpening.contentKey, inlineOpening.body), []);
const inlineParts = skyDailySummaryParts(facts, new Map([[inlineOpening.contentKey, inlineOpening]]));
assert.ok(inlineParts.some(part => part.action === "sun" && part.text === "Sun moving through Virgo at 15°"));
assert.ok(inlineParts.some(part => part.action === "lunation" && part.text === "New Moon in Virgo"));
assert.ok(skySummaryTemplateErrors(inlineOpening.contentKey, inlineOpening.body.replace("{sunSign}", "Virgo")).length, "A calculated variable cannot be replaced by a fixed sign");

// Older published templates receive the exact owner correction in both preview and reader.
const priorSameSign = row("openingSameSign", "The {sunName} in {sunSign}{sunDegree} {sunSummary}, while the {moonName} there{moonDegree} {moonSummary}.");
assert.deepEqual(skySummaryTemplateErrors(priorSameSign.contentKey, priorSameSign.body), []);
assert.deepEqual(render(facts, [priorSameSign]), render(facts));
const priorComposition = buildSkySummaryComposition("Virgo", "Virgo", [{ content_key: priorSameSign.contentKey, id: "same", body: priorSameSign.body, status: "LIVE", lane: "serving" }], false);
assert.ok(priorComposition.parts.map(part => part.text).join("").includes("Moon in Virgo"));
assert.ok(skySummaryTemplateErrors(priorSameSign.contentKey, "The {sunName} in {sunSign}{sunDegree} {sunSummary}; the {moonName} there{moonDegree} {moonSummary}.").length, "New templates must include the Moon sign");

const seasonFacts = {
  ...facts,
  seasonName: "Virgo",
  nextSunSign: "Libra",
  seasonEndDate: "September 22",
  daysUntilSeasonEnd: 3
};
const seasonParagraphs = render(seasonFacts);
assert.ok(seasonParagraphs[0].includes("Sun in Virgo at 15°"));
assert.ok(seasonParagraphs[0].includes("turns our attention to the daily rituals"));
assert.equal(seasonParagraphs.slice(1, -1).some((paragraph) => /season/.test(paragraph)), false);
assert.match(
  seasonParagraphs.at(-1) ?? "",
  /Virgo season ends in 3 days, when the Sun enters Libra on September 22/
);
assert.doesNotMatch(seasonParagraphs.join("\n"), /You can have an organized schedule|Libra season begins|The Sun's time in Virgo|attention turns from the systems/);
assert.ok(skyDailySummaryParts(seasonFacts).some(part => part.action === "sun" && part.text === "Sun in Virgo at 15°"));
const openingOnlyText = skyDailySummaryParts(seasonFacts, undefined, { openingOnly: true }).map(part => part.text).join("");
assert.equal(
  openingOnlyText.includes("Libra season begins") || openingOnlyText.includes("Virgo season ends"),
  false,
  "Calendar Sun introduction stays the linked opening and does not take the season paragraph"
);
const upcomingSeason = {
  ...seasonFacts,
  daysUntilSeasonEnd: 2,
  event: { name: "Full Moon", sign: "Aries", countdown: "in 6 days", isToday: false }
};
assert.match(
  render(upcomingSeason).at(-1) ?? "",
  /Virgo season ends in 2 days, when the Sun enters Libra on September 22\. The next Full Moon in Aries is in 6 days/
);
const editedSeason = {
  id: "seasonTransition",
  contentKey: "cms/sky-daily-summary/seasonTransition",
  body: "{seasonName} season ends {countdown}. The Sun enters {nextSunSign} on {seasonEndDate}.",
  status: "LIVE",
  updatedAt: ""
};
assert.deepEqual(skySummaryTemplateErrors(editedSeason.contentKey, editedSeason.body), []);
assert.match(
  render(upcomingSeason, [editedSeason]).at(-1) ?? "",
  /Virgo season ends in 2 days\. The Sun enters Libra on September 22\. The next Full Moon in Aries is in 6 days/
);
const priorLayout = row("layout", "{openingSentence} {voidSentence}\n\n{ingressesSentence} {stationsSentence}\n\n{exactAspectsSentence}\n\n{currentRetrogradesSentence}\n\n{lunationSentence}");
assert.deepEqual(skySummaryTemplateErrors(priorLayout.contentKey, priorLayout.body), []);
assert.match(render(seasonFacts, [priorLayout]).at(-1) ?? "", /Virgo season ends in 3 days/);
const midSeasonLayout = row("layout", "{openingSentence} {voidSentence}\n\n{seasonTransitionSentence}\n\n{ingressesSentence} {stationsSentence}\n\n{exactAspectsSentence}\n\n{currentRetrogradesSentence}\n\n{lunationSentence}");
assert.match(render(seasonFacts, [midSeasonLayout]).at(-1) ?? "", /Virgo season ends in 3 days/);
assert.equal(render(seasonFacts, [midSeasonLayout]).slice(1, -1).some((paragraph) => /season/.test(paragraph)), false);
