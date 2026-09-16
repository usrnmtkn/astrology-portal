import assert from "node:assert/strict";
import { calendarSeasonPhraseVariables, calendarSeasonSourceName, calendarSeasonPhraseBindings, calendarSeasonPhraseSourceKeys, setCalendarSeasonPhraseBinding, resolveCalendarSeasonPhrases } from "../src/content-studio/calendarSeasonPhrases.ts";

const focus = { schema: "studio-variable/v1", name: "fixtureSeasonFocus", label: "Fixture focus", description: "Synthetic source", tags: [], value: "shared fixture focus", overrides: [
  { scope: "sign", planet: "", sign: "virgo", value: "Virgo fixture focus" },
  { scope: "sign", planet: "", sign: "libra", value: "Libra fixture focus" },
  { scope: "sign", planet: "", sign: "scorpio", value: "Scorpio fixture focus" }
] };
const sourceRow = definition => ({ id: "fixture-source", content_key: `studio-variable/${definition.name.toLowerCase()}`, mode: "article", status: "DRAFT", updated_at: "2026-09-16T00:00:00Z", sections: { variable: definition } });
const original = { calendarOverview: { monthlyOverview: "Owner opening remains intact.", seasonOverview: "{{openingSeasonFocus}} / {{closingSeasonFocus}}" }, packageDraft: { body: "Complete owner passage. Final sentence stays." }, editorNotes: "Private fixture guidance" };
const originalJSON = JSON.stringify(original);
let sections = setCalendarSeasonPhraseBinding(original, "openingSeasonFocus", "{{fixtureSeasonFocus}}");
sections = setCalendarSeasonPhraseBinding(sections, "closingSeasonFocus", focus.name);
const resolve = (rows = [sourceRow(focus)], context = { openingSign: "Virgo", closingSign: "Libra" }, saved = sections) => Object.fromEntries(resolveCalendarSeasonPhrases(saved, rows, context).map(item => [item.name, item]));
assert.equal(calendarSeasonPhraseVariables.length, 5);
assert.equal(JSON.stringify(original), originalJSON, "Binding must not mutate source sections.");
assert.strictEqual(sections.calendarOverview, original.calendarOverview);
assert.strictEqual(sections.packageDraft, original.packageDraft);
assert.equal(sections.editorNotes, original.editorNotes);
assert.deepEqual(calendarSeasonPhraseBindings(sections), { openingSeasonFocus: { variableName: "{{fixtureSeasonFocus}}" }, closingSeasonFocus: { variableName: focus.name } });
assert.deepEqual(calendarSeasonPhraseSourceKeys(sections), ["studio-variable/fixtureseasonfocus"], "Request exact keys once, not the entire variable library.");
assert.ok(!JSON.stringify(sections.calendarSeasonPhraseBindings).includes(focus.value), "Store references, not flattened prose.");
let result = resolve();
assert.equal(result.openingSeasonFocus.text, "Virgo fixture focus");
assert.equal(result.closingSeasonFocus.text, "Libra fixture focus");
assert.equal(result.openingSeasonFocus.sourceId, "fixture-source");
assert.equal(result.openingSeasonFocus.sourceUpdatedAt, sourceRow(focus).updated_at);
assert.equal(result.openingSeasonOpportunity.status, "unbound");
assert.match(result.closingSeasonFocus.sourceLabel, /libra · sign value/);
assert.deepEqual(resolve(), result, "Selection is deterministic.");
result = resolve([sourceRow(focus)], { openingSign: " Libra ", closingSign: "Scorpio" });
assert.equal(result.openingSeasonFocus.text, "Libra fixture focus");
assert.equal(result.closingSeasonFocus.text, "Scorpio fixture focus");
assert.equal(resolve([sourceRow(focus)], { openingSign: "Virgo" }).closingSeasonFocus.status, "no-season");
assert.equal(resolve([sourceRow(focus)], { openingSign: "invalid" }).openingSeasonFocus.status, "no-season");
assert.equal(resolve([]).openingSeasonFocus.status, "missing-variable");
assert.equal(resolve([sourceRow(focus), sourceRow(focus)]).openingSeasonFocus.status, "invalid-source");
assert.equal(resolve([sourceRow({ ...focus, name: "renamedFixtureFocus" })]).openingSeasonFocus.status, "missing-variable", "Renamed tokens require explicit rebinding, consistent with My variables.");
for (const patch of [{ inventory_only: true }, { status: "ARCHIVED" }, { mode: "card" }, { id: "" }, { sections: { variable: { ...focus, schema: "wrong" } } }, { sections: { variable: { ...focus, name: "other" } } }]) {
  assert.equal(resolve([{ ...sourceRow(focus), ...patch }]).openingSeasonFocus.status, "invalid-source");
}
const placement = { ...focus, overrides: [...focus.overrides,
  { scope: "placement", planet: "moon", sign: "virgo", value: "Wrong Moon fixture" },
  { scope: "placement", planet: "sun", sign: "virgo", value: "Sun-in-Virgo fixture" }
] };
assert.equal(resolve([sourceRow(placement)]).openingSeasonFocus.text, "Sun-in-Virgo fixture");
assert.equal(resolve([sourceRow({ ...focus, overrides: [...focus.overrides, { scope: "planet", planet: "sun", sign: "", value: "Sun fallback fixture" }] })]).openingSeasonFocus.text, "Sun fallback fixture");
const blank = { ...focus, overrides: focus.overrides.map(item => item.sign === "virgo" ? { ...item, value: "" } : item) };
assert.equal(resolve([sourceRow(blank)]).openingSeasonFocus.status, "needs-writing", "A blank exact override never falls through to a shared value.");
assert.equal(resolve([sourceRow({ ...focus, overrides: [], value: "{{monthlyOverview}}" })]).openingSeasonFocus.status, "invalid-source", "Literal library values cannot execute templates.");
assert.equal(resolve([sourceRow({ ...focus, overrides: [], value: "Exact punctuation; preserve whitespace.  " })]).openingSeasonFocus.text, "Exact punctuation; preserve whitespace.  ");
assert.equal(resolve([sourceRow(focus)], { openingSign: "Aries" }).openingSeasonFocus.text, focus.value);
assert.match(resolve([sourceRow(focus)], { openingSign: "Aries" }).openingSeasonFocus.sourceLabel, /shared value/);
const removed = setCalendarSeasonPhraseBinding(sections, "openingSeasonFocus", "");
assert.equal(resolve([sourceRow(focus)], { openingSign: "Virgo" }, removed).openingSeasonFocus.status, "unbound");
assert.deepEqual(removed.calendarSeasonPhraseBindings.closingSeasonFocus, sections.calendarSeasonPhraseBindings.closingSeasonFocus);
for (const invalid of ["{{partial", "../../private", "constructor", "Prototype", "a,b", "a".repeat(65)]) {
  assert.equal(calendarSeasonSourceName(invalid), undefined);
  const saved = setCalendarSeasonPhraseBinding({}, "openingSeasonFocus", invalid);
  assert.deepEqual(calendarSeasonPhraseSourceKeys(saved), []);
  assert.equal(resolve([], { openingSign: "Virgo" }, saved).openingSeasonFocus.status, "invalid-binding");
}
assert.equal(calendarSeasonSourceName(" {{ fixtureSeasonFocus }} "), focus.name);
assert.throws(() => setCalendarSeasonPhraseBinding(sections, "primaryMonthlyThemeFocus", focus.name), /registered seasonal phrase/);
assert.throws(() => setCalendarSeasonPhraseBinding(sections, "__proto__", focus.name), /registered seasonal phrase/);
assert.deepEqual(calendarSeasonPhraseBindings({ calendarSeasonPhraseBindings: { openingSeasonFocus: { variableName: 5 }, monthlyFocus: { variableName: focus.name } } }), {});
assert.equal(resolveCalendarSeasonPhrases(null, [], {}).every(item => item.status === "no-season"), true);
console.log("PASS: seasonal source bindings, scoped sign selection, override priority, exact-key validation, missing/invalid source handling, and unchanged owner sections");
