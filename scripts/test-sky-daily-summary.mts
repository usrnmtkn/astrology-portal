import { skySunSummaryExcerpt } from "../apps/web/src/content/skySunSummaryExcerpt.ts";
import { calendarSunSummary } from "../apps/web/src/features/calendar/calendarDaySummary.ts";
import { moonSummaryKey } from "../apps/web/src/content/skyMoonSummary.ts";
import { moonSummaryBody } from "../apps/web/src/content/skyMoonSummary.ts";
import { calendarDayDistance } from "../apps/web/src/services/calendarDayDistance.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { skyDailySummaryParts, skySummaryParagraphs } from "../apps/web/src/content/skyDailySummary.ts";

// Owner request 2026-09-24: short Sun overview in Sky, full copy in Calendar.
// This runs before the later publication-retirement fixtures.
{
  const shortClause = "shifts the spotlight entirely to the spaces between us. There is a sudden, collective sensitivity to friction in the air and a shared pull to bring things back to center.";
  const fullClause = `${shortClause} This season asks us all to discover what genuine symmetry actually feels like. The collective focus highlights exactly where things have grown lopsided across our schedules, our environments, and our connections, making it easier to smooth out the edges together. We are invited to prioritize beauty, collaboration, and fairness, remembering that true harmony requires everyone’s needs to carry the same weight.`;
  const sunKey = "cms/sky-daily-summary/sun/libra";
  const moonKey = moonSummaryKey("Aquarius", "regular");
  const moonClause = "brings a first thought. The second thought has space. The third thought stays in the Moon passage.";
  const content = new Map([
    [sunKey, { contentKey: sunKey, body: fullClause, status: "LIVE" }],
    [moonKey, { contentKey: moonKey, body: moonClause, status: "LIVE" }]
  ]) as Parameters<typeof skyDailySummaryParts>[1];
  const facts = {
    sun: { sign: "Libra", degree: 1 }, moon: { sign: "Aquarius", degree: 29 },
    moonIsVoid: true, voidRemainingLabel: "42 min", voidNextSign: "Pisces",
    ingresses: [{ id: "moon-pisces", label: "Moon enters Pisces" }]
  };
  const short = skyDailySummaryParts(facts, content, { sunSummaryLength: "short" });
  const full = skyDailySummaryParts(facts, content);
  const rendered = short.map(part => part.text).join("");
  assert.equal(skySunSummaryExcerpt(fullClause), shortClause);
  assert.equal(short.find(part => part.sourceKey === sunKey)?.text, shortClause);
  assert.equal(full.find(part => part.sourceKey === sunKey)?.text, fullClause);
  assert.equal(short.find(part => part.sourceKey === moonKey)?.text, moonClause);
  assert.equal(content?.get(sunKey)?.body, fullClause, "Excerpt must not mutate the saved source");
  assert.equal(short.find(part => part.action === "sun")?.text, "Sun in Libra at 1°");
  assert.ok(rendered.startsWith(`The Sun in Libra at 1° ${shortClause}`));
  assert.ok(!rendered.includes(".."), "Assembly must not add a second full stop");
  assert.ok(!rendered.includes("This season asks"));
  assert.ok(rendered.includes("The Moon is void of course for another 42 minutes, until it enters Pisces."));
  assert.ok(!rendered.includes("Moon enters Pisces today."));
  const sky = {
    generatedAt: "2026-09-23T12:00:00Z", location: { timeZone: "America/New_York" },
    positions: [{ planet: "Sun", sign: "Libra", degree: 1 }]
  } as Parameters<typeof calendarSunSummary>[0];
  const calendar = calendarSunSummary(sky, content, []);
  assert.equal(calendar.find(part => part.sourceKey === sunKey)?.text, fullClause, "Calendar must retain every sentence after Sky renders");
  assert.equal(skyDailySummaryParts(facts, content, { sunSummaryLength: "full" }).find(part => part.sourceKey === sunKey)?.text, fullClause);
  for (const body of ["", "One sentence.", "One sentence. Two sentences.", "No final full stop"]) {
    assert.equal(skySunSummaryExcerpt(body), body);
  }
  assert.equal(skySunSummaryExcerpt("Allow 3.5 hours. Start tomorrow. Keep this third sentence in Calendar."), "Allow 3.5 hours. Start tomorrow.");
  assert.equal(skySunSummaryExcerpt("Can this wait? Yes, it can! The third sentence stays in Calendar."), "Can this wait? Yes, it can!");
  assert.equal(skySunSummaryExcerpt("First sentence.\n\nSecond sentence.\n\nThird sentence."), "First sentence.\n\nSecond sentence.");
  assert.equal(skySunSummaryExcerpt("QA opening.\n\n- **First QA item**\n- *Final QA item*"), "QA opening.\n\n- **First QA item**\n- *Final QA item*");
  assert.equal(skySunSummaryExcerpt("First sentence.\n\n- One\n- Two\n\nThird sentence stays out."), "First sentence.\n\n- One\n- Two");
  assert.equal(skySunSummaryExcerpt("One sentence. Two sentences.\n\n- This list stays in Calendar."), "One sentence. Two sentences.");
  const readerSource = readFileSync(new URL("../apps/web/src/features/sky/PublishedSkySummary.tsx", import.meta.url), "utf8");
  assert.ok(readerSource.includes('state.content, { sunSummaryLength: "short" }'), "The live Sky reader must opt in to the excerpt");
  console.log("Sky Sun excerpt: supplied Libra copy, unchanged Calendar/source/Moon/link/void behavior, sentence boundaries, and live reader opt-in passed.");
}

const clauses = JSON.parse(readFileSync(new URL("../apps/web/src/content/skyDailySummaryClauses.json", import.meta.url), "utf8"));
const suppliedRevisions = JSON.parse(readFileSync(new URL("../docs/content-review/sky-summary-supplied-copy-2026-09-08.json", import.meta.url), "utf8")).revisions;
const virgoRevision = clauses.provenance.revisions.find((row: { key: string }) => row.key === "cms/sky-daily-summary/sun/virgo");
assert.equal(clauses.sun.virgo, virgoRevision.body);
assert.equal(createHash("sha256").update(clauses.sun.virgo).digest("hex"), virgoRevision.sha256);
assert.equal(clauses.sun.virgo.split(/\s+/u).length, virgoRevision.wordCount);
const text = (facts: Parameters<typeof skyDailySummaryParts>[0]) => skyDailySummaryParts(facts).map(p => p.text).join("");
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
for (const body of ["sun", "moon"]) {
  assert.equal(Object.keys(clauses[body]).length, 12);
  for (const sign of signs) {
    const clause = clauses[body][sign.toLowerCase()];
    assert.match(clause, /^(puts|slows|makes|brings|softens|turns) /);
    const revision = [...clauses.provenance.revisions, ...suppliedRevisions].find((row: { key: string }) => row.key === `cms/sky-daily-summary/${body}/${sign.toLowerCase()}`);
    assert.equal(createHash("sha256").update(clause).digest("hex"), revision.sha256);
  }
}
for (const sunSign of signs) {
  for (const moonSign of signs) {
    const result = text({ sun: { sign: sunSign, degree: 29.99 }, moon: { sign: moonSign, degree: 0 }, moonIsVoid: false });
    assert.ok(result.includes(clauses.sun[sunSign.toLowerCase()] ?? `The Sun is in ${sunSign} at 29°,`));
    assert.ok(result.includes(moonSummaryBody(moonSign) ?? `while the Moon moves through ${moonSign} at 0°.`));
    assert.ok(result.includes("29°") && result.includes("0°") && !result.includes("30°"));
    assert.ok(!/—|undefined|null|\{\{|void of course/u.test(result));
  }
}
const facts = { sun: { sign: "Gemini", degree: 9 }, moon: { sign: "Sagittarius", degree: 2 }, moonIsVoid: true, voidRemainingLabel: "49 min", event: { name: "Full Moon", sign: "Sagittarius", countdown: "in 3 days" } };
assert.ok(text(facts).startsWith("The Sun in Gemini at 9° makes questions"));
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
  "The Sun in Virgo at 15° turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing. The Moon in Cancer at 29° pulls us home to the places, people, and memories that nurture us.");
assert.ok(!text(facts).includes("care we give"), "Cancer meaning must never serve for another Moon sign");


const fullMoonMeaning = "Full Moons mark a culmination, when something that has been building becomes easier to see.";
assert.ok(!text(facts).includes(fullMoonMeaning));
for (const countdown of ["today", "tomorrow", "in 1 day", "in 3 days"]) {
  const newMoon = { ...facts, event: { name: "New Moon", sign: "Virgo", countdown } };
  assert.ok(text(newMoon).endsWith(`The next New Moon in Virgo is ${countdown}.`));
  assert.ok(!text(newMoon).includes(fullMoonMeaning));
}
const ordered = text({ ...facts, retrogradePlanets: ["Saturn", "Neptune", "Pluto", "Chiron"] });
assert.ok(ordered.indexOf("Four planets") > ordered.indexOf("The Moon is void"));
assert.ok(ordered.indexOf("The Moon is void") < ordered.indexOf("The next Full Moon"));
assert.ok(!/—|undefined|\{\{/u.test(ordered));
assert.ok(text({ ...facts, voidRemainingLabel: "1min" }).includes("for another 1 minute."));
assert.ok(text({ ...facts, voidRemainingLabel: undefined }).includes("The Moon is void of course."));
const sameDayVoid = {
  ...facts,
  voidRemainingLabel: "42 min",
  voidNextSign: "Pisces",
  ingresses: [{ id: "moon-pisces", label: "Moon enters Pisces" }]
};
assert.ok(text(sameDayVoid).includes("The Moon is void of course for another 42 minutes, until it enters Pisces."));
assert.equal(text(sameDayVoid).includes("Moon enters Pisces today."), false);
assert.equal(skyDailySummaryParts(sameDayVoid).find(part => part.eventId === "moon-pisces")?.text, "Pisces");
// The joined sentence must not swallow content or invent another day's ingress.
assert.ok(text({ ...sameDayVoid, voidRemainingLabel: undefined }).includes("The Moon is void of course until it enters Pisces."));
assert.ok(text({ ...sameDayVoid, moonIsVoid: false }).includes("Moon enters Pisces today."));
assert.ok(!text({ ...sameDayVoid, moonIsVoid: false }).includes("void of course"));
assert.ok(text({ ...sameDayVoid, moon: undefined }).includes("Moon enters Pisces today."));
assert.ok(!text({ ...sameDayVoid, ingresses: [] }).includes("until it enters"));
assert.ok(text({ ...sameDayVoid, voidNextSign: "Aries" }).includes("Moon enters Pisces today."));
const ingressDescription = "Return to the drawing you set aside.";
const preservedIngressCopy = text({ ...sameDayVoid, ingresses: [{ id: "moon-pisces", label: "Moon enters Pisces", tldr: ingressDescription }, { id: "venus-scorpio", label: "Venus enters Scorpio" }] });
assert.equal(preservedIngressCopy.split(ingressDescription).length - 1, 1);
assert.ok(preservedIngressCopy.includes("Venus enters Scorpio"));
assert.equal((skyDailySummaryParts(sameDayVoid).filter(part => part.eventId === "moon-pisces")).length, 1);
const { renderVoidOfCourse } = await import("../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs");
assert.equal(
  renderVoidOfCourse({ sign: "aquarius", nextSign: "pisces" }).body,
  "The Moon is void of course in Aquarius until it enters Pisces. Use this time to finish what is already underway, return to something you set aside, or take a break before beginning something new."
);


for (const [name, eclipseType, label] of [["New Moon", "solar", "Solar Eclipse"], ["Full Moon", "lunar", "Lunar Eclipse"]] as const) {
  const result = skyDailySummaryParts({ ...facts, event: { name, eclipseType, sign: "Virgo", countdown: "in 3 days" } });
  assert.equal(result.find(part => part.action === "lunation")?.text, `${label} in Virgo`);
  assert.ok(!result.map(part => part.text).join("").includes(`The next ${name}`));
}

const { installContentPublications } = await import("../apps/web/src/content/contentPublicationState.ts");
installContentPublications(["sun/libra", "moon/aries/regular"].map(key => ({ content_key: `cms/sky-daily-summary/${key}`, state: "retired", revision: 100, row_id: null, row_updated_at: null, updated_at: "2026-09-08T00:00:00Z" })));
const fallback = skyDailySummaryParts({ sun: { sign: "Libra", degree: 15 }, moon: { sign: "Aries", degree: 29 }, moonIsVoid: false });
assert.equal(fallback.map(part => part.text).join(""), "The Sun is in Libra at 15°. The Moon moves through Aries at 29°.");
assert.ok(fallback.filter(part => part.emphasis).every(part => part.action));
assert.ok(!text(facts).includes("Talk your way") && !text(facts).includes("Give the feeling"));
console.log("Sky summary: 144 sign pairs, full-clause and facts-only states, article links, timing, retrogrades, and eclipse labels passed.");

assert.equal(skyDailySummaryParts(facts).filter(part => part.highlight).length, 1);
assert.ok(skyDailySummaryParts(facts).some(part => part.highlight && part.text.includes("void of course")));
assert.deepEqual(skyDailySummaryParts({ ...facts, moonIsVoid: false, retrogradePlanets: ["Saturn", "Neptune", "Pluto", "Chiron"] }).filter(part => part.highlight).map(part => part.text), ["Four planets are retrograde"]);
assert.ok(skyDailySummaryParts(facts).filter(part => part.emphasis).every(part => part.action));

// Studio templates preserve required calculated slots and reader link segmentation.
const { skyDailySummaryFields, skySummaryTemplateErrors } = await import("../apps/web/src/content/skyDailySummaryCatalog.ts");
assert.equal(skyDailySummaryFields.filter(field => field.group !== "Assembly templates").length, 80);
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

assert.deepEqual(skyDailySummaryParts(facts).filter(part => part.action === "sun" || part.action === "moon").map(part => part.text), ["Sun in Gemini at 9°", "Moon in Sagittarius at 2°"]);

const example = skyDailySummaryParts({ sun: { sign: "Virgo", degree: 15 }, moon: { sign: "Cancer", degree: 29 }, moonIsVoid: true, voidRemainingLabel: "49 min",
  retrogradePlacements: [{ planet: "Saturn", sign: "Aries", degree: 13 }, { planet: "Neptune", sign: "Aries", degree: 1 }, { planet: "Pluto", sign: "Aquarius", degree: 3 }, { planet: "Chiron", sign: "Taurus", degree: 0 }],
  exactAspects: [{ id: "a", label: "Saturn squares Lilith" }, { id: "b", label: "Mercury opposes Neptune" }], event: { name: "New Moon", sign: "Virgo", countdown: "in 3 days" }
});
assert.deepEqual(example.filter(p => p.action).map(p => p.text), ["Sun in Virgo at 15°", "Moon in Cancer at 29°", "Saturn squares Lilith", "Mercury opposes Neptune", "Saturn Rx in Aries at 13°", "Neptune Rx in Aries at 1°", "Pluto Rx in Aquarius at 3°", "Chiron Rx in Taurus at 0°", "New Moon in Virgo"]);
assert.ok(example.map(p => p.text).join("").includes("Saturn squares Lilith and Mercury opposes Neptune are exact today."));
for (const count of [0, 1, 2, 3]) {
  const labels = ["Saturn squares Lilith", "Mercury opposes Neptune", "Venus trines Jupiter"].slice(0, count);
  const rendered = text({ moonIsVoid: false, exactAspects: labels.map((label, i) => ({ id: String(i), label })) });
  assert.equal(rendered, count === 0 ? "" : count === 1 ? `${labels[0]} is exact today.` : count === 2 ? `${labels[0]} and ${labels[1]} are exact today.` : `Three aspects are exact today: ${labels[0]}, ${labels[1]}, and ${labels[2]}.`);
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

const paragraphs = skySummaryParagraphs(example).map(parts => parts.map(p => p.text).join(""));
assert.equal(paragraphs.length, 4);
assert.ok(paragraphs[1].endsWith("are exact today."));
assert.ok(paragraphs[3].startsWith("The next New Moon"));
