import assert from "node:assert/strict";
import { Readable } from "node:stream";
import SwissEph from "swisseph-wasm";
import { compileSkyArticleEdition, assertCompiledSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields, skyArticleEditionContentKey } from "../apps/web/src/content/skyArticleTemplateCompiler.ts";
import { SKY_INGRESS_ESSAY_FORMAT, skyIngressEssayFields } from "../apps/web/src/content/skyIngressEssay.mjs";
import { skyIngressEssayPublicationKeys, skyIngressEssayReaderSection } from "../apps/web/src/content/skyIngressEssayReader.ts";
import { projectReaderRow } from "../apps/web/src/content/readerRowProjection.mjs";
import { isGeneratedContentReaderBoundaryAllowed } from "../apps/web/src/content/generatedContentEligibility.ts";
import { skyArticleEditionFactsFromSnapshot, ingressTimeLabel } from "../api/_lib/sky-article-facts.ts";
import { skyIngressNasaReceipt } from "../api/_lib/sky-ingress-nasa.ts";

const env = { NODE_ENV: "test", CONTENT_GENERATION_SECRET: "synthetic-ingress-secret",
  SUPABASE_URL: "https://ingress.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic", OPENAI_API_KEY: "synthetic",
  STUDIO_MEMORY_FEEDBACK_ENABLED: "false", STUDIO_WRITING_FEEDBACK_ENABLED: "false" };
Object.assign(process.env, env);
const { default: factsHandler } = await import("../api/admin/sky-article-facts.ts");
const { default: slotsHandler } = await import("../api/admin/sky-article-template-slots.ts");
Object.assign(process.env, env);
const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const template = { id, content_key: "sky/article-template/sun/libra", event_type: "sky-article-template",
  status: "REVIEWED", lane: "reference", review_state: null, source_snapshot: { review_status: "approved" },
  body: "# Immutable owner template\n\nSynthetic complete original writing. {{legacyField}}" };
let prompts: string[] = [];
let requested: string[] = [];
const originalFetch = globalThis.fetch;
async function invoke(handler: any, method: string, url: string, body?: unknown, authorized = true) {
  const req = Object.assign(Readable.from(body ? [JSON.stringify(body)] : []), { method, url,
    headers: authorized ? { "x-content-generation-secret": env.CONTENT_GENERATION_SECRET } : {} });
  const res = { statusCode: 0, result: {} as any, setHeader() {}, end(value: string) { this.result = JSON.parse(value); } };
  await handler(req, res); return { status: res.statusCode, ...res.result };
}
try {
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith(env.SUPABASE_URL)) return Response.json([template]);
    // No network or paid calls. A failed independent check must remain visible,
    // while Swiss event facts remain available to the editor.
    if (String(url).startsWith("https://science.nasa.gov/")) return new Response("<p>Synthetic test: the length of day and night depends on latitude.</p>");
    if (String(url).startsWith("https://ssd.jpl.nasa.gov/")) return new Response("Synthetic outage", { status: 503 });
    if (String(url) === "https://api.openai.com/v1/responses") {
      const request = JSON.parse(String(init.body)); prompts.push(request.input);
      requested = request.text.format.schema.properties.slotValues.required;
      return Response.json({ id: "synthetic-ingress-response", output_text: JSON.stringify({ slotValues:
        Object.fromEntries(requested.map(name => [name, "Synthetic complete draft field."])) }) });
    }
    throw new Error(`Unexpected test network destination: ${new URL(String(url)).origin}`);
  };
  const baseUrl = "/api/admin/sky-article-facts?planet=sun&date=2026-10-09&format=ingress-essay-v2";
  assert.equal((await invoke(factsHandler, "GET", baseUrl, undefined, false)).status, 401);
  const factsResult = await invoke(factsHandler, "GET", baseUrl);
  assert.equal(factsResult.status, 200, JSON.stringify(factsResult));
  const facts = factsResult.facts;
  assert.equal(facts.slotValues.articleTitle, "Libra Season 2026");
  assert.match(facts.slotValues.when, /September 22, 2026 at 8:05 PM ET/);
  assert.match(facts.slotValues.when, /October 23, 2026 at 5:37 AM ET/);
  assert.equal(facts.calculationProvenance.actualEphemeris, "swiss");
  assert.equal(facts.nasa.status, "unavailable");
  assert.equal(facts.nasaExplanatoryText.status, "retrieved");
  assert.match(prompts.join(""), /^$/);
  assert.equal(facts.eventCoverage.complete, true);
  const opposition = facts.events.find((event: any) => event.aspect === "opposition" && event.planets.includes("Saturn"));
  assert(opposition);
  assert(Math.abs(opposition.participants[0].longitude - opposition.participants[1].longitude - 180) < 0.001);
  assert(opposition.participants.every((point: any) => point.dignity.dignities.includes("fall")));
  const lunation = facts.events.find((event: any) => event.type === "lunation");
  assert.deepEqual(lunation.participants.map((point: any) => point.planet), ["Sun", "Moon"]);
  // Independently call Swiss at two distinct event dates, rather than comparing
  // the adapter's formatted fields with each other.
  const swe = new SwissEph(); await swe.initSwissEph();
  for (const event of [opposition, lunation]) {
    const instant = new Date(event.startsAt);
    const jd = swe.julday(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
      instant.getUTCHours() + instant.getUTCMinutes() / 60 + (instant.getUTCSeconds() + instant.getUTCMilliseconds() / 1000) / 3600);
    for (const point of event.participants) {
      const id = { Sun: swe.SE_SUN, Moon: swe.SE_MOON, Saturn: swe.SE_SATURN }[point.planet as "Sun" | "Moon" | "Saturn"];
      const direct = swe.calc_ut(jd, id, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
      // Existing event roots and position helpers resolve to whole seconds.
      assert(Math.abs(direct[0] - point.longitude) < 1 / 3600, `${point.planet} at ${event.startsAt}`);
      assert.equal(point.motion, direct[3] < 0 ? "retrograde" : "direct");
    }
  }
  assert(facts.events.some((event: any) => event.type === "ingress" && event.planet === "Venus" && event.period === "after-ingress-window"));
  const result = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", {
    templateId: id, referenceDate: "2026-10-09", format: SKY_INGRESS_ESSAY_FORMAT, provider: "openai",
    existingSlotValues: { what: "Synthetic existing owner field." }
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(prompts.length, 1);
  assert(!requested.includes("what") && !requested.includes("when") && !requested.includes("articleTitle"));
  assert(requested.includes("majorTransitSections"));
  assert.deepEqual(result.blockedSlots.map((slot: any) => slot.name), ["priorOccurrenceSection"]);
  assert.match(prompts[0], /INGRESS ESSAY FORMAT/);
  assert.match(prompts[0], /astronomy-explanation-only/);
  assert.match(prompts[0], /never repeat a standard agency sentence/i);
  assert.match(prompts[0], /after-ingress-window/);
  assert.doesNotMatch(prompts[0], /legacyField/);
  const mismatch = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", {
    templateId: id, referenceDate: "2026-12-28", format: SKY_INGRESS_ESSAY_FORMAT
  });
  assert.equal(mismatch.status, 422);
  assert.equal(prompts.length, 1, "Mismatched templates never spend a writing call");

  const slots = Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic ${name} complete text.`]));
  Object.assign(slots, facts.slotValues, { majorTransitSections: "## Synthetic transit\n\nComplete first sentence.\n\nComplete final sentence.",
    priorOccurrenceSection: "", otherDatesSection: "" });
  const edition = await compileSkyArticleEdition({ format: SKY_INGRESS_ESSAY_FORMAT, templateKey: template.content_key,
    templateBody: template.body, planet: "sun", sign: "libra", ...facts, slotValues: slots,
    tldr: "Synthetic separate owner summary.", housePassages: [] });
  assertCompiledSkyArticleEdition(edition);
  assert.equal(edition.contentKey, "sky-article/sun/libra/2026/2026-09-22");
  assert.notEqual(skyArticleEditionContentKey({ ...edition, validFrom: "2026-10-25" }), edition.contentKey,
    "A return visit must not overwrite an earlier edition in the same year");
  assert.equal(edition.housePassages.length, 0);
  assert.doesNotMatch(edition.compiledMarkdown, /Horoscopes|Prior occurrence|Other dates|\{\{|legacyField/);
  const revised = await reviseSkyArticleEdition(edition, skyArticleEditableFields(edition));
  assert.doesNotMatch(revised.compiledMarkdown, /Horoscopes/);
  await assert.rejects(compileSkyArticleEdition({ format: SKY_INGRESS_ESSAY_FORMAT, templateKey: template.content_key,
    templateBody: "", planet: "sun", sign: "libra", ...facts, slotValues: { ...slots, overviewBody: "" },
    tldr: "Synthetic separate summary.", housePassages: [] }), /requires complete fields/);
  const approval = { approved: true, action: "approve-sky-article-edition", contentKey: edition.contentKey,
    templateKey: edition.templateKey, templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash };
  const projected = projectReaderRow({ id, content_key: edition.contentKey, status: "LIVE", lane: "serving", event_type: "sky-article-edition", updated_at: "2026-10-09T00:00:00Z",
    sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: approval, engineFacts: facts } });
  assert.equal(projected.sections.skyArticleEdition.format, SKY_INGRESS_ESSAY_FORMAT);
  assert.equal(isGeneratedContentReaderBoundaryAllowed(projected), true);
  assert.equal(isGeneratedContentReaderBoundaryAllowed({ ...projected, status: "DRAFT" }), false);
  assert.equal(isGeneratedContentReaderBoundaryAllowed({ ...projected, source_snapshot: {} }), false);
  assert(!JSON.stringify(projected).includes("requestUrl"), "Private fact receipts must not enter reader payloads");
  const candidate = { id, contentKey: edition.contentKey, status: "LIVE", sections: projected.sections, sourceSnapshot: projected.source_snapshot };
  const context = { activeInstant: "2026-10-09T12:00:00Z", planet: "sun", sign: "libra" };
  const publication = { content_key: edition.contentKey, state: "live" as const, row_id: id,
    row_updated_at: "2026-10-09T00:00:00Z", updated_at: "2026-10-09T00:00:00Z", revision: 1 };
  assert.deepEqual(skyIngressEssayPublicationKeys([
    publication, { ...publication, content_key: "sky-article/sun/libra/2025/2025-09-22" },
    { ...publication, content_key: "sky-article/sun/libra/2026" },
    { ...publication, content_key: "sky-article/venus/libra/2026/2026-10-25" },
    { ...publication, content_key: "sky-article/sun/scorpio/2026/2026-10-23" },
    { ...publication, content_key: "sky-article/sun/libra/2024/2024-09-22", state: "retired" },
    { ...publication, content_key: "sky-article/sun/libra/2023/2023-09-22", row_id: null }
  ], context), [edition.contentKey, "sky-article/sun/libra/2025/2025-09-22"]);
  const reading = skyIngressEssayReaderSection([candidate], context);
  assert.equal(reading?.body, edition.body);
  assert.equal(reading?.tldr, edition.tldr);
  assert(reading?.articleSections.some(section => section.body.endsWith("Complete final sentence.")));
  assert.equal(skyIngressEssayReaderSection([{ ...candidate, status: "DRAFT" }], context), null);
  assert.equal(skyIngressEssayReaderSection([{ ...candidate, sourceSnapshot: {} }], context), null);
  assert.equal(skyIngressEssayReaderSection([candidate], { ...context, activeInstant: edition.transitEndInstant }), null);
  assert.equal(ingressTimeLabel("2026-11-01T05:05:00Z"), "1:05 AM ET");
  assert.equal(ingressTimeLabel("2026-11-01T06:05:00Z"), "1:05 AM ET");
  const visit = skyArticleEditionFactsFromSnapshot({ generatedAt: "2026-11-01T12:00:00Z", location: { timeZone: "Pacific/Auckland" },
    positions: [{ planet: "Venus", sign: "Libra", transitStart: "2026-08-06T10:00:00Z", transitEnd: "2026-12-04T10:00:00Z",
      residencyPasses: [{ entryDate: "2026-10-25T10:00:00Z", exitDate: "2026-12-04T10:00:00Z" }] }] }, "venus", SKY_INGRESS_ESSAY_FORMAT);
  assert.equal(visit.validFrom, "2026-10-25");
  assert.equal(visit.referenceTimeZone, "America/New_York");
  globalThis.fetch = async () => Response.json({ signature: { source: "Synthetic NASA response" }, result: "$$SOE\n2026-Oct-09, , 191.5, 0.1,\n$$EOE" });
  assert.equal((await skyIngressNasaReceipt("sun", context.activeInstant, 191.5)).status, "matched");
  assert.equal((await skyIngressNasaReceipt("sun", context.activeInstant, 191)).status, "disagreement");
  assert.equal((await skyIngressNasaReceipt("north-node", context.activeInstant, 191)).status, "unsupported");
  console.log("PASS ingress Studio: actual authenticated facts/slot handlers, real Swiss roots, provider request, retained fields, isolated companion, exact approved reader payload, expiry, DST and scoped NASA receipts.");
} finally { globalThis.fetch = originalFetch; }
