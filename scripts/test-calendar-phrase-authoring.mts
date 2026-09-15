import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { composeWriting, parseWritingPattern, validateWritingTemplate, validateGeneratedPhrases, validatePhraseValues, type WritingTemplate, type PhraseValues } from "../src/content-studio/phraseTemplates.js";
import { monthlyCompositionStarter, initialMonthlySelection, monthlyTemplateContext, monthlyEditionKey, validateMonthlySelection, type MonthlyFacts } from "../src/content-studio/monthlyComposition.js";
import { calculateMonthlyWritingFacts, calendarWritingHash, validateCalendarEdition } from "../api/_lib/calendar-writing-facts.js";
import { calendarWritingMemory } from "../api/_lib/calendar-writing-memory.js";
import { generateCalendarPhrases, calendarPhraseUses, calendarPhraseSourceSupport } from "../api/_lib/calendar-phrase-generation.js";
import { createCalendarPhraseHandler, authorizeCalendarWriting } from "../api/admin/calendar-phrase-writing.js";
import { signCalendarPhraseReceipt, checkedCalendarReceipts } from "../api/_lib/calendar-phrase-receipts.js";
import { readCalendarWritingDocument, saveCalendarWritingDocument } from "../api/_lib/calendar-writing-storage.js";
import { isReaderServableGeneratedContentRow } from "../apps/web/src/content/generatedContentEligibility.js";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const testTemplate: WritingTemplate = { version: 1, pattern: "{{overview}}", definitions: {
  overview: { kind: "template", pattern: "{{monthName}}: {{opportunity}}.{{#hasChange}} {{nested}}{{/hasChange}}{{^hasChange}} unchanged{{/hasChange}}" },
  opportunity: { kind: "template", pattern: "{{strength}} and {{correction}}" },
  nested: { kind: "template", pattern: "{{closingSign}}" },
  strength: { kind: "phrase", source: "opening-season", grammar: "verb-phrase", description: "fixture" },
  correction: { kind: "phrase", source: "opening-season", grammar: "verb-phrase", description: "fixture" }
} };
const values: PhraseValues = { "season/virgo/strength": { text: "fixture strength", origin: "owner-edit", locked: true }, "season/virgo/correction": { text: "fixture correction", origin: "owner-edit" } };
const context = { monthName: "September", openingSeasonSign: "Virgo", hasChange: true, closingSign: "Libra" };
let result = composeWriting(testTemplate, context, values);
assert.deepEqual(result.errors, []); assert.equal(result.text, "September: fixture strength and fixture correction. Libra");
assert.equal(composeWriting(testTemplate, { ...context, hasChange: false }, values).text, "September: fixture strength and fixture correction. unchanged");
assert.equal(composeWriting(testTemplate, { ...context, closingSign: "{{strength}}" }, values).text.endsWith("{{strength}}"), true, "literal facts do not execute");
const cyclic = structuredClone(testTemplate); cyclic.definitions.nested = { kind: "template", pattern: "{{overview}}" };
assert.match(composeWriting(cyclic, { ...context, hasChange: false }, values).errors[0], /Circular/);
for (const input of ["{{#a}}{{/b}}", "{{#a}}", "{{bad:name}}", "{{constructor}}", "{{__proto__.x}}", "{{a} missing", "{{#ok}}".repeat(26)]) assert.throws(() => parseWritingPattern(input));
assert.match(composeWriting({ ...testTemplate, pattern: "{{unknown}}" }, context, values).errors[0], /Unknown variable/);
assert.throws(() => validateWritingTemplate({ ...testTemplate, definitions: { __proto__: { kind: "template", pattern: "" } }, pattern: "{{__proto__}}" }));
assert.throws(() => validatePhraseValues({ test: { text: "{{hidden}}", origin: "owner-edit" } }));
assert.match(composeWriting(testTemplate, { ...context, opportunity: "forged" }, values).errors[0], /overwrite a calculated fact/);
assert.equal(composeWriting(testTemplate, { ...context, openingSeasonSign: "Libra" }, values).missing.length, 2);
const repeat: WritingTemplate = { version: 1, pattern: "{{#events}}{{entry}}\n{{/events}}", definitions: { entry: { kind: "template", pattern: "{{eventId}}: {{experience}}" }, experience: { kind: "phrase", source: "event", grammar: "clause", description: "fixture" } } };
const eventValues: PhraseValues = { "event/a/experience": { text: "alpha", origin: "owner-edit" }, "event/b/experience": { text: "beta", origin: "owner-edit" } };
assert.equal(composeWriting(repeat, { events: [{ eventId: "b" }, { eventId: "a" }] }, eventValues).text, "b: beta\na: alpha");
assert.deepEqual(composeWriting(repeat, { events: [] }, eventValues).phrases, []);
assert.equal(composeWriting(repeat, { events: [{ eventId: "c" }] }, eventValues).missing[0], "event/c/experience");
assert.match(composeWriting(repeat, {}, eventValues).errors[0], /Unknown condition/);
console.log("PASS nested templates, guarded conditions, literal values, source-bound reordering, missing values and cycles.");

assert.throws(() => validateCalendarEdition("2026-13", "UTC")); assert.throws(() => validateCalendarEdition("2026-09", "Fake/Zone"));
const september = await calculateMonthlyWritingFacts("2026-09", "America/New_York");
assert.equal(september.openingSeasonSign, "Virgo"); assert.equal(september.closingSeasonSign, "Libra");
assert.equal(september.events.every(e => e.dateKey.startsWith("2026-09")), true);
const selection = initialMonthlySelection(september); const starter = monthlyCompositionStarter();
assert.match(september.events.find(e => e.id === selection.leadEventId)!.title, /Neptune.*Pluto/);
assert.equal(selection.supportingEventIds.some(id => september.events.find(e => e.id === id)?.planet === "Uranus"), true);
assert.equal(selection.themeCount, 0);
const sepContext = monthlyTemplateContext(september, selection);
assert.equal((sepContext.newMoons as unknown[]).length, 1); assert.equal((sepContext.fullMoons as unknown[]).length, 1);
assert.deepEqual(sepContext.solarEclipses, []); assert.deepEqual(sepContext.lunarEclipses, []);
result = composeWriting(starter, sepContext, {}); assert.deepEqual(result.errors, []);
assert.equal(result.text.includes("Solar eclipse"), false); assert.equal(result.text.includes("Lunar eclipse"), false);
assert.equal(result.phrases.some(p => p.name === "primaryMonthlyThemeFocus"), false);
const twoThemes = composeWriting(starter, monthlyTemplateContext(september, { ...selection, themeCount: 2 }), {});
assert.equal(twoThemes.phrases.filter(p => /MonthlyThemeFocus/.test(p.name)).length, 2);
assert.throws(() => validateMonthlySelection({ ...selection, supportingEventIds: [selection.leadEventId] }, september));
assert.throws(() => validateMonthlySelection({ ...selection, leadEventId: "outside-month" }, september));
assert.notEqual(monthlyEditionKey("2026-09", "America/New_York"), monthlyEditionKey("2027-09", "America/New_York"));
assert.notEqual(monthlyEditionKey("2026-09", "UTC"), monthlyEditionKey("2026-09", "America/New_York"));
const august = await calculateMonthlyWritingFacts("2026-08", "America/New_York");
const augContext = monthlyTemplateContext(august, initialMonthlySelection(august));
assert.equal((augContext.solarEclipses as unknown[]).length, 1); assert.equal((augContext.lunarEclipses as unknown[]).length, 1);
assert.equal((augContext.newMoons as unknown[]).length, 0); assert.equal((augContext.fullMoons as unknown[]).length, 0);
assert.deepEqual(composeWriting(starter, augContext, {}).errors, []);
const augSupport = calendarPhraseSourceSupport({ template: starter, values: {}, facts: august, selection: initialMonthlySelection(august) });
assert.equal(Object.entries(augSupport).some(([key, support]) => /EclipseFocus/.test(key) && support.status === "needs-source"), true, "eclipse evidence gaps are explicit, not ordinary lunar substitutes");
console.log("PASS real Swiss September and eclipse-month August calculations; month boundaries, year/timezone identities and no lunar duplicates.");

const use = result.phrases[0];
assert.equal(validateGeneratedPhrases({ phrase1: "fixture clause" }, [use])[use.key], "fixture clause");
for (const text of ["A paragraph. Another sentence", "September 15", "15 September", "2027", "12°", "You may notice repetition", "x\ny", "<script>alert(1)</script>", "{{monthName}}", "word ".repeat(66)]) assert.throws(() => validateGeneratedPhrases({ phrase1: text }, [use]));
assert.throws(() => validateGeneratedPhrases({ phrase1: "valid", phrase2: "unrequested" }, [use]));
assert.throws(() => calendarPhraseUses(starter, { [use.key]: { text: "protected", origin: "owner-edit", locked: true } }, september, selection, [use.key]));
const packaging = JSON.parse(fs.readFileSync("vercel.json", "utf8")).functions["api/admin/calendar-phrase-writing.ts"].includeFiles;
assert.equal(packaging.length <= 256, true);
const packagedFiles = new Set(fs.globSync(packaging));
const { buildMemoryIndex } = await import("../api/_lib/agent-memory.mjs");
assert.deepEqual(buildMemoryIndex({ root: process.cwd() }).sources.filter((source: any) => !packagedFiles.has(source.path)).map((source: any) => source.path), []);
const memory = await calendarWritingMemory(september, selection);
assert.equal(memory.receipt.references.filter(ref => ref.role === "owner-authored-register-only").length >= 3, true);
assert.equal(memory.receipt.references.every(ref => /^[a-f0-9]{64}$/.test(ref.sha256)), true);
assert.match(memory.prompt, /historical style examples|historical/i);
assert.equal(memory.receipt.privateFeedback, "not-enabled");
process.env.OPENAI_API_KEY = "synthetic-never-sent";
process.env.CONTENT_GENERATION_PROVIDER = "openai";
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-receipt-and-storage";
process.env.CONTENT_GENERATION_SECRET = "synthetic-owner";
let providerCalls = 0; let providerPrompt = "";
const input = { template: starter, values: {}, facts: september, selection, requested: [use.key] };
const generated = await generateCalendarPhrases(input, (async (_url, init) => {
  providerCalls++; const body = JSON.parse(String(init?.body)); providerPrompt = JSON.stringify(body);
  assert.equal(body.text.format.schema.additionalProperties, false);
  assert.match(providerPrompt, /Do not substitute a free-form essay/);
  return new Response(JSON.stringify({ id: "synthetic-response", output_text: JSON.stringify({ phrases: { phrase1: "fixture clause for review" } }) }), { status: 200 });
}) as typeof fetch);
assert.equal(providerCalls, 1); assert.equal(generated.proposals[use.key], "fixture clause for review");
assert.equal(generated.generation.ownerApproved, false); assert.equal(generated.generation.servingAuthorized, false);
assert.equal(JSON.stringify(starter), JSON.stringify(input.template));
assert.match(providerPrompt, /EXACT OWNER-PUBLISHED REGISTER EVIDENCE/);
assert.match(providerPrompt, /VERIFIED MEANING EVIDENCE/);
const receipt = signCalendarPhraseReceipt({ month: september.month, timeZone: september.timeZone, templateHash: calendarWritingHash(starter), factsHash: calendarWritingHash(september), ...generated });
const aiValues: PhraseValues = { [use.key]: { text: generated.proposals[use.key], origin: "ai-draft", sourceId: receipt.id } };
assert.equal(checkedCalendarReceipts([receipt], [], aiValues, september.month, september.timeZone).length, 1);
assert.throws(() => checkedCalendarReceipts([{ ...receipt, model: "forged" }], [], aiValues, september.month, september.timeZone));
assert.throws(() => checkedCalendarReceipts([receipt], [], aiValues, "2027-09", september.timeZone));
assert.throws(() => checkedCalendarReceipts([receipt], [], { [use.key]: { ...aiValues[use.key], text: "tampered" } }, september.month, september.timeZone));
const oldSecret = process.env.SUPABASE_SERVICE_ROLE_KEY; process.env.SUPABASE_SERVICE_ROLE_KEY = "rotated";
assert.equal(checkedCalendarReceipts([receipt], [receipt], aiValues, september.month, september.timeZone).length, 1);
process.env.SUPABASE_SERVICE_ROLE_KEY = oldSecret;
console.log("PASS canonical writer/provider mock, exact requested phrases, source receipts, tamper checks and signing-key rotation. No paid calls.");

const savedDocuments = new Map<string, any>(); let generateCalls = 0; let memoryFails = false;
const handler = createCalendarPhraseHandler({ authorize: async () => true, calculate: async () => september,
  read: async key => savedDocuments.has(key) ? { id: "fixture", content_key: key, updated_at: "2026-09-15T00:00:00.000Z", lane: "reference", status: "DRAFT", sections: { calendarPhraseDocument: savedDocuments.get(key) } } : null,
  save: async (key, doc) => { savedDocuments.set(key, doc); return { id: "fixture", content_key: key, updated_at: "2026-09-15T00:00:00.000Z", lane: "reference", status: "DRAFT", sections: { calendarPhraseDocument: doc } }; },
  memory: async () => { if (memoryFails) throw new Error("storage offline"); return memory; },
  generate: async () => { generateCalls++; return generated; } });
async function call(body: any, headers: Record<string, string> = { "x-content-generation-secret": "fixture" }) {
  let payload: any; const response: any = { statusCode: 0, setHeader() {}, end(raw: string) { payload = JSON.parse(raw); } };
  await handler({ method: "POST", headers, body } as any, response);
  return { status: response.statusCode, payload };
}
assert.equal((await call({ action: "load", month: "2026-09", timeZone: "America/New_York" }, {})).status, 401);
const actualSecret = process.env.CONTENT_GENERATION_SECRET; delete process.env.CONTENT_GENERATION_SECRET;
assert.equal(await authorizeCalendarWriting({ headers: { authorization: "Bearer forged" } } as any), false); process.env.CONTENT_GENERATION_SECRET = actualSecret;
const loaded = await call({ action: "load", month: "2026-09", timeZone: "America/New_York" });
assert.equal(loaded.status, 200); assert.equal(savedDocuments.size, 0);
const payload = { action: "generate", month: september.month, timeZone: september.timeZone, factsHash: calendarWritingHash(september), template: starter, selection, values: {}, requested: [use.key] };
assert.equal((await call({ ...payload, factsHash: "spoofed" })).status, 409); assert.equal(generateCalls, 0);
assert.equal((await call({ ...payload, template: cyclic })).status, 400); assert.equal(generateCalls, 0);
assert.equal((await call(payload)).status, 200); assert.equal(generateCalls, 1);
const saved = await call({ ...payload, action: "saveEdition", values: aiValues, receipts: [receipt] });
assert.equal(saved.status, 200); assert.equal(saved.payload.published, false);
assert.equal(JSON.stringify(savedDocuments.get(monthlyEditionKey(september.month, september.timeZone)).template), JSON.stringify(starter));
memoryFails = true;
const offlineLoad = await call({ action: "load", month: september.month, timeZone: september.timeZone });
assert.equal(offlineLoad.status, 200); assert.equal(offlineLoad.payload.memory, null); assert.match(offlineLoad.payload.memoryError, /unavailable/);
assert.equal(offlineLoad.payload.values[use.key].text, aiValues[use.key].text);
assert.equal(isReaderServableGeneratedContentRow({ content_key: monthlyEditionKey(september.month, september.timeZone), status: "LIVE", lane: "serving", body: "fixture" } as any), false);
console.log("PASS actual handler authorization, fact-lock, bounded draft storage, memory outage preserving existing edits, and reader exclusion.");

// Real storage function with intercepted REST. No production account is accessed.
process.env.SUPABASE_URL = "https://calendar-storage.invalid";
process.env.VITE_SUPABASE_URL = "https://calendar-storage.invalid";
let row: any = null; let conflict = false; const fetchBefore = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /^https:\/\/calendar-storage.invalid\//);
  if (!init?.method || init.method === "GET") return Response.json(row ? [row] : []);
  if (conflict) return Response.json([]);
  row = { ...row, ...JSON.parse(String(init.body)) }; return Response.json([row]);
};
try {
  const key = monthlyEditionKey(september.month, september.timeZone);
  assert.equal(await readCalendarWritingDocument(key), null);
  const first = await saveCalendarWritingDocument(key, { schema: "fixture" }, null);
  assert.equal(first.status, "DRAFT"); assert.equal(first.lane, "reference");
  await assert.rejects(saveCalendarWritingDocument(key, {}, null), /changed/);
  conflict = true; await assert.rejects(saveCalendarWritingDocument(key, { schema: "fixture-new" }, first.updated_at), /not confirmed|changed|Reload/);
} finally { globalThis.fetch = fetchBefore; }
console.log("PASS storage compare-and-swap, create collision identity and non-serving drafts.");
console.log("Calendar phrase authoring tests passed.");
