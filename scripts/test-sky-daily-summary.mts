import { calendarDayDistance } from "../apps/web/src/services/calendarDayDistance.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { skyDailySummaryParts } from "../apps/web/src/content/skyDailySummary.ts";

const clauses = JSON.parse(readFileSync(new URL("../apps/web/src/content/skyDailySummaryClauses.json", import.meta.url), "utf8"));
const virgoRevision = clauses.provenance.revisions.find((row: { key: string }) => row.key === "cms/sky-daily-summary/sun/virgo");
assert.equal(clauses.sun.virgo, virgoRevision.body);
assert.equal(createHash("sha256").update(clauses.sun.virgo).digest("hex"), virgoRevision.sha256);
assert.equal(clauses.sun.virgo.split(/\s+/u).length, virgoRevision.wordCount);
const text = (facts: Parameters<typeof skyDailySummaryParts>[0]) => skyDailySummaryParts(facts).map(p => p.text).join("");
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
for (const sunSign of signs) {
  for (const moonSign of signs) {
    const result = text({ sun: { sign: sunSign, degree: 29.99 }, moon: { sign: moonSign, degree: 0 }, moonIsVoid: false });
    assert.ok(result.includes(clauses.sun[sunSign.toLowerCase()] ?? `The Sun is in ${sunSign} at 29°,`));
    assert.ok(result.includes(clauses.moon[moonSign.toLowerCase()] ?? `while the Moon moves through ${moonSign} at 0°.`));
    assert.ok(result.includes("29°") && result.includes("0°") && !result.includes("30°"));
    assert.ok(!/—|undefined|null|\{\{|void of course/u.test(result));
  }
}
const facts = { sun: { sign: "Gemini", degree: 9 }, moon: { sign: "Sagittarius", degree: 2 }, moonIsVoid: true, voidRemainingLabel: "49 min", event: { name: "Full Moon", sign: "Sagittarius", countdown: "in 3 days" } };
assert.ok(text(facts).startsWith("The Sun is in Gemini at 9°,"));
assert.ok(text(facts).includes("Sagittarius at 2°"));
assert.ok(text(facts).includes("The Moon is void of course for another 49 minutes."));
assert.ok(text(facts).includes("The next Full Moon in Sagittarius is in 3 days."));
assert.equal(skyDailySummaryParts(facts).filter(p => p.action === "lunation").length, 1);
assert.ok(!text({ moonIsVoid: true }).includes("void"));
assert.equal(text({ moonIsVoid: false }), "");
assert.ok(!text({ sun: { sign: "Virgo", degree: NaN }, moonIsVoid: false }).includes("NaN"));

assert.deepEqual(skyDailySummaryParts(facts).filter(p => p.action === "sun" || p.action === "moon").map(p => p.action), ["sun", "moon"]);
for (const [planets, expected] of [
  [[], ""],
  [["Saturn"], "One planet is retrograde right now: Saturn Rx."],
  [["Saturn", "Neptune"], "Two planets are retrograde right now: Saturn Rx and Neptune Rx."],
  [["Saturn", "Neptune", "Pluto", "Chiron"], "Four planets are retrograde right now: Saturn Rx, Neptune Rx, Pluto Rx, and Chiron Rx."]
] as const) {
  assert.ok(text({ ...facts, retrogradePlanets: [...planets] }).includes(expected));
}
assert.ok(text({ ...facts, retrogradePlanets: ["Saturn", "Saturn", ""] }).includes("One planet is retrograde right now: Saturn Rx."));
assert.equal(text({ sun: { sign: "Virgo", degree: 15 }, moon: { sign: "Cancer", degree: 29 }, moonIsVoid: false }),
  "The Sun in Virgo at 15° turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing, while the Moon in Cancer at 29° brings more attention to home, family, and whether the care we give is coming back to us.");
assert.ok(!text(facts).includes("care we give"), "Cancer meaning must never serve for another Moon sign");


const fullMoonMeaning = "Full Moons mark a culmination, when something that has been building becomes easier to see.";
assert.ok(!text(facts).includes(fullMoonMeaning));
for (const countdown of ["today", "tomorrow", "in 1 day", "in 3 days"]) {
  const newMoon = { ...facts, event: { name: "New Moon", sign: "Virgo", countdown } };
  assert.ok(text(newMoon).endsWith(`The next New Moon in Virgo is ${countdown}.`));
  assert.ok(!text(newMoon).includes(fullMoonMeaning));
}
const ordered = text({ ...facts, retrogradePlanets: ["Saturn", "Neptune", "Pluto", "Chiron"] });
assert.ok(ordered.indexOf("Four planets") < ordered.indexOf("The Moon is void"));
assert.ok(ordered.indexOf("The Moon is void") < ordered.indexOf("The next Full Moon"));
assert.ok(!/—|undefined|\{\{/u.test(ordered));
assert.ok(text({ ...facts, voidRemainingLabel: "1min" }).includes("for another 1 minute."));
assert.ok(text({ ...facts, voidRemainingLabel: undefined }).includes("The Moon is void of course."));


for (const [name, eclipseType, label] of [["New Moon", "solar", "Solar Eclipse"], ["Full Moon", "lunar", "Lunar Eclipse"]] as const) {
  const result = skyDailySummaryParts({ ...facts, event: { name, eclipseType, sign: "Virgo", countdown: "in 3 days" } });
  assert.equal(result.find(part => part.action === "lunation")?.text, `${label} in Virgo`);
  assert.ok(!result.map(part => part.text).join("").includes(`The next ${name}`));
}

const fallback = skyDailySummaryParts({ sun: { sign: "Libra", degree: 15 }, moon: { sign: "Aries", degree: 29 }, moonIsVoid: false });
assert.equal(fallback.map(part => part.text).join(""), "The Sun is in Libra at 15°, while the Moon moves through Aries at 29°.");
assert.ok(fallback.filter(part => part.emphasis).every(part => part.action));
assert.ok(!text(facts).includes("Talk your way") && !text(facts).includes("Give the feeling"));
console.log("Sky summary: 144 sign pairs, full-clause and facts-only states, article links, timing, retrogrades, and eclipse labels passed.");

assert.equal(skyDailySummaryParts(facts).filter(part => part.highlight).length, 1);
assert.ok(skyDailySummaryParts(facts).some(part => part.highlight && part.text.includes("void of course")));
assert.deepEqual(skyDailySummaryParts({ ...facts, moonIsVoid: false, retrogradePlanets: ["Saturn", "Neptune", "Pluto", "Chiron"] }).filter(part => part.highlight).map(part => part.text), ["Four planets are retrograde"]);
assert.ok(skyDailySummaryParts(facts).filter(part => part.emphasis).every(part => part.action));

// Studio templates preserve required calculated slots and reader link segmentation.
const { skyDailySummaryFields, skySummaryTemplateErrors } = await import("../apps/web/src/content/skyDailySummaryCatalog.ts");
assert.equal(skyDailySummaryFields.length, 31);
for (const field of skyDailySummaryFields) assert.deepEqual(skySummaryTemplateErrors(field.key, field.body), []);
assert.ok(skySummaryTemplateErrors("cms/sky-daily-summary/lunation", "The next {name} arrives.").length);
assert.ok(skySummaryTemplateErrors("cms/sky-daily-summary/lunation", "{name} {name} {sign} {countdown}").length);
assert.ok(skySummaryTemplateErrors("cms/sky-daily-summary/sun/virgo", "{sign}").length);
assert.ok(skySummaryTemplateErrors("cms/sky-daily-summary/sun/virgo", "one—two").length);
const studioFacts = { sun: { sign: "Virgo", degree: 15 }, moonIsVoid: false, event: { name: "New Moon", sign: "Virgo", countdown: "in 3 days" } };
const studioRow = (key: string, body: string, status?: string) => ({ contentKey: key, body, status } as any);
const studioKey = "cms/sky-daily-summary/lunation";
const studioTemplate = "The next {name} in {sign} happens {countdown}.";
const studioParts = skyDailySummaryParts(studioFacts, new Map([[studioKey, studioRow(studioKey, studioTemplate)]]));
assert.ok(studioParts.map(part => part.text).join("").includes("The next New Moon in Virgo happens in 3 days."));
assert.equal(studioParts.find(part => part.action === "lunation")?.text, "New Moon in Virgo");
for (const status of ["DRAFT", "REVIEWED", "ARCHIVED"]) {
  assert.ok(skyDailySummaryParts(studioFacts, new Map([[studioKey, studioRow(studioKey, studioTemplate, status)]])).map(part => part.text).join("").includes("The next New Moon in Virgo is in 3 days."));
}
assert.ok(skyDailySummaryParts(studioFacts, new Map([[studioKey, studioRow(studioKey, "Missing required fields", "LIVE")]])).map(part => part.text).join("").includes("The next New Moon in Virgo is in 3 days."));
console.log("Studio summary fields: catalog, slot validation, published overrides, link preservation, and draft/invalid fallback passed.");

const retrogradeLinkParts = skyDailySummaryParts({ moonIsVoid: false, retrogradePlanets: ["Saturn", "Neptune", "Pluto", "Chiron", "Saturn"] });
assert.deepEqual(retrogradeLinkParts.filter(part => part.action === "retrograde").map(part => [part.text, part.planet]), [["Saturn Rx", "Saturn"], ["Neptune Rx", "Neptune"], ["Pluto Rx", "Pluto"], ["Chiron Rx", "Chiron"]]);
assert.equal(retrogradeLinkParts.map(part => part.text).join(""), "Four planets are retrograde right now: Saturn Rx, Neptune Rx, Pluto Rx, and Chiron Rx.");

assert.equal(calendarDayDistance(new Date("2026-09-07T16:00:00Z"), new Date("2026-09-11T03:27:00Z"), "America/New_York"), 3);
assert.equal(calendarDayDistance(new Date("2026-09-07T16:00:00Z"), new Date("2026-09-11T03:27:00Z"), "UTC"), 4);
assert.equal(calendarDayDistance(new Date("2026-03-07T17:00:00Z"), new Date("2026-03-09T16:00:00Z"), "America/New_York"), 2);

assert.deepEqual(skyDailySummaryParts(facts).filter(part => part.action === "sun" || part.action === "moon").map(part => part.text), ["Sun is in Gemini at 9°", "Moon moves through Sagittarius at 2°"]);

const example = skyDailySummaryParts({ sun: { sign: "Virgo", degree: 15 }, moon: { sign: "Cancer", degree: 29 }, moonIsVoid: true, voidRemainingLabel: "49 min",
  retrogradePlacements: [{ planet: "Saturn", sign: "Aries", degree: 13 }, { planet: "Neptune", sign: "Aries", degree: 1 }, { planet: "Pluto", sign: "Aquarius", degree: 3 }, { planet: "Chiron", sign: "Taurus", degree: 0 }],
  exactAspects: [{ id: "a", label: "Saturn squares Lilith" }, { id: "b", label: "Mercury opposes Neptune" }], event: { name: "New Moon", sign: "Virgo", countdown: "in 3 days" }
});
assert.deepEqual(example.filter(p => p.action).map(p => p.text), ["Sun in Virgo at 15°", "Moon in Cancer at 29°", "Saturn Rx in Aries at 13°", "Neptune Rx in Aries at 1°", "Pluto Rx in Aquarius at 3°", "Chiron Rx in Taurus at 0°", "Saturn squares Lilith", "Mercury opposes Neptune", "New Moon in Virgo"]);
assert.ok(example.map(p => p.text).join("").includes("Saturn squares Lilith and Mercury opposes Neptune are exact today."));
for (const count of [0, 1, 2, 3]) {
  const labels = ["Saturn squares Lilith", "Mercury opposes Neptune", "Venus trines Jupiter"].slice(0, count);
  const rendered = text({ moonIsVoid: false, exactAspects: labels.map((label, i) => ({ id: String(i), label })) });
  assert.equal(rendered, count === 0 ? "" : count === 1 ? `${labels[0]} is exact today.` : count === 2 ? `${labels[0]} and ${labels[1]} are exact today.` : `${labels[0]}, ${labels[1]}, and ${labels[2]} are exact today.`);
}
assert.equal(text({ moonIsVoid: false, retrogradePlacements: [{ planet: "Saturn", sign: "Aries", degree: 13 }] }), "One planet is retrograde right now: Saturn Rx in Aries at 13°.");
const { skySummaryEventFacts, ingressSummaryKeys } = await import("../apps/web/src/content/skySummaryEvents.ts");
const ingressEvent = { id: "ingress", type: "ingress", planet: "Mercury", toSign: "Libra", dateKey: "2026-09-10", startsAt: "2026-09-10T10:00:00Z" } as any;
const ingressKeys = ingressSummaryKeys(ingressEvent);
const article = { body: "Full article remains separate.", summary: "Complete supplied TLDR.", status: "LIVE" } as any;
assert.equal(skySummaryEventFacts([ingressEvent], new Map([[ingressKeys[2], article]])).ingresses[0].tldr, article.summary);
assert.equal(skySummaryEventFacts([ingressEvent], new Map([[ingressKeys[2], { ...article, summary: null }]])).ingresses[0].tldr, undefined);
assert.equal(skySummaryEventFacts([ingressEvent], new Map([[ingressKeys[0], { ...article, body: "Saved short copy.", status: "DRAFT" }]])).ingresses[0].tldr, undefined);
assert.equal(text({ moonIsVoid: false, ...skySummaryEventFacts([ingressEvent], new Map([[ingressKeys[2], article]])) }), "Mercury enters Libra today. Complete supplied TLDR.");
console.log("Finite-verb template: full placement links, exact-aspect agreement, optional sections and ingress TLDR source selection passed.");
const currentFacts = { sun: { sign: "Virgo", degree: 15 }, moon: { sign: "Cancer", degree: 29 }, moonIsVoid: false };
const prior = new Map(Object.entries(clauses.provenance.previousClauses).map(([part, body]) => [`cms/sky-daily-summary/${part}`, { body, status: "LIVE" } as any]));
assert.deepEqual(skyDailySummaryParts(currentFacts, prior), skyDailySummaryParts(currentFacts));
