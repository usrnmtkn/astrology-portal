import { INGRESS_WRITER_CONTRACT, ingressWriterContractReceipt } from '../api/_lib/transit-ingress-editorial-authority.ts';
import assert from "node:assert/strict";
import fs from "node:fs";
import { ingressFixtureValues } from './fixtures/sky-ingress-writing.mjs';
import { GHOSTWRITING_SKILL_INSTRUCTIONS } from '../src/astro-writing/ghostwritingSkill.mjs';
import { RHETORICAL_WRITER_POLICY } from '../src/astro-writing/rhetoricalPatterns.mjs';
import { approvedVoiceStyleReference } from '../src/astro-writing/approvedVoiceStyle.mjs';
import { studioRequestTimeoutMs } from "../apps/admin/src/studioRequestPolicy.ts";
const deploymentConfig = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
assert.equal(deploymentConfig.functions["api/admin/sky-article-template-slots.ts"].maxDuration, 300);
assert.equal(studioRequestTimeoutMs("/api/admin/sky-article-template-slots", "POST"), 305_000);
assert.equal(studioRequestTimeoutMs("/api/admin/sky-article-facts?date=2026-10-09", "GET"), 45_000);
import { Readable } from "node:stream";
import SwissEph from "swisseph-wasm";
import { compileSkyArticleEdition, assertCompiledSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields, skyArticleEditionContentKey } from "../apps/web/src/content/skyArticleTemplateCompiler.ts";
import { SKY_INGRESS_ESSAY_FORMAT, SKY_INGRESS_ARTICLE_FORMAT, skyIngressEssayFields } from "../apps/web/src/content/skyIngressEssay.mjs";
import { ingressArticleFields } from '../api/_lib/transit-ingress-editorial-authority.ts';
const skyIngressArticleFields = ingressArticleFields();
import { skyIngressEssayPublicationKeys, skyIngressEssayReaderSection } from "../apps/web/src/content/skyIngressEssayReader.ts";
import { projectReaderRow } from "../apps/web/src/content/readerRowProjection.mjs";
import { isGeneratedContentReaderBoundaryAllowed } from "../apps/web/src/content/generatedContentEligibility.ts";
import { skyArticleEditionFactsFromSnapshot, ingressTimeLabel } from "../api/_lib/sky-article-facts.ts";
import { skyIngressNasaReceipt } from "../api/_lib/sky-ingress-nasa.ts";

const env = { NODE_ENV: "test", CONTENT_GENERATION_SECRET: "synthetic-ingress-secret",
  SUPABASE_URL: "https://ingress.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic", OPENAI_API_KEY: "synthetic",
  ANTHROPIC_API_KEY: "synthetic",
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
let rejectWriterCopy = false;
const summaryGuidanceProviders = new Set<string>();
const narrativeProviders = new Set<string>();
function assertSummaryGuidance(provider: string, prompt: string, schema: any) {
  const narrative = Boolean(schema.properties.slotValues.properties.articleBody);
  if (narrative) {
    matches(prompt, /Write one complete dated ingress article in articleBody/);
    doesNotMatch(prompt, /ingressTransitBody\d|100–180|120–180|60–100|INGRESS ESSAY FORMAT/);
    assert(Object.keys(schema.properties.slotValues.properties).every(name => ['what', 'takeaway', 'articleBody', 'priorOccurrenceSection'].includes(name)));
    matches(prompt, /WRITER CONTRACT ingress-article\/v4-2026-10-22/);
    assert.equal(schema.properties.slotValues.properties.articleBody.description,
      skyIngressArticleFields.find(field => field.name === 'articleBody')!.description);
    const meaningPosition = prompt.indexOf('DATED INGRESS COVERAGE AND EVENT MEANING');
    assert(meaningPosition < prompt.indexOf('OWNER-APPROVED STYLE REFERENCE'), 'Finish with complete prose references after the technical meaning packet.');
    narrativeProviders.add(provider);
  } else {
    matches(prompt, /Write one connected dated ingress article/);
    matches(prompt, /fields are output containers, not separate writing jobs/);
    matches(prompt, /primary ingress voice benchmark, alongside the complete original author season passages/);
    matches(prompt, /Read the requested fields together in article order/);
  }
  matches(prompt, /DATED ARTICLE OUTPUT LAYOUT/);
  doesNotMatch(prompt, /Fill only the requested unfinished fields in an owner-authored Sky article template|IMMUTABLE OWNER TEMPLATE CONTEXT/,
    'The dated writer authors an article within the layout, rather than filling independent knowledge boxes.');
  matches(prompt, /not another plan, judge or rewrite call/);
  const voiceIndex = JSON.parse(fs.readFileSync('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json', 'utf8'));
  let priorPassagePosition = -1;
  for (const id of Array.from({ length: 14 }, (_, i) => `p${String(i + 1).padStart(3, '0')}`)) {
    const passage = voiceIndex.entries.find((entry: any) => entry.sourceId === `owner-article:libra-season-autumn-equinox:${id}`);
    assert(prompt.includes(passage.text), `The complete eligible original Libra passage ${id} must reach the writer unchanged.`);
    const position = prompt.indexOf(passage.text);
    assert(position > priorPassagePosition, 'The complete author overview keeps its original paragraph order.');
    priorPassagePosition = position;
  }
  doesNotMatch(prompt, /owner-article:libra-season-autumn-equinox:p015/,
    'The separate horoscope companion is not part of the guide voice reference.');
  doesNotMatch(prompt, /GOVERNED KNOWLEDGE EVIDENCE|TEMPORALITY: lifelong-pattern|You are here to create harmony/,
    'The dated writer uses its collective event/season sources, not the generic natal placement packet.');
  doesNotMatch(prompt, /TRANSIT AND INGRESS EDITORIAL AUTHORITY/,
    'The scoped system authority is not repeated as multi-surface user guidance.');
  assert.equal(prompt.split(RHETORICAL_WRITER_POLICY).length - 1, 1,
    'Keep the complete contextual rhetorical policy exactly once.');
  assert(prompt.includes(JSON.stringify(template.body)), 'Keep the saved article reference complete instead of discarding its event-led structure.');
  matches(prompt, /COMPLETE SAVED INGRESS TEMPLATE REFERENCE/);
  const style = approvedVoiceStyleReference({ surface: 'sky', family: 'sky-ingress-essay' });
  for (const reference of [style.reference, ...style.supportingReferences.map(entry => entry.reference)]) {
    assert.equal(prompt.split(JSON.stringify(reference.text)).length - 1, 1,
      'The complete revised Libra benchmark and supporting Scorpio reach both providers once, without custom test voice notes.');
  }
  assert.equal(style.reference.id, 'libra-ingress-voice-benchmark-20261021');
  if (!narrative) matches(prompt, /primary ingress voice benchmark/);
  doesNotMatch(style.reference.text, /I need to develop the article|Here is that rewrite/);
  doesNotMatch(prompt, /saturn-aries-voice-20261020/);
  doesNotMatch(prompt, /names the ingress and a developed defining aspect|its defining calculated aspect/,
    'Do not force a technical aspect inventory into every What summary.');
  const what = schema.properties.slotValues.properties.what;
  const overview = schema.properties.slotValues.properties.overviewBody;
  if (overview) {
    assert.equal(overview.description, skyIngressEssayFields.find(field => field.name === 'overviewBody')!.description,
      'The actual provider schema receives the overview guidance shown by the editor.');
    matches(overview.description, /Begin with the actual season or planetary ingress, its calculated entry date and time/,
      'The article establishes the actual event rather than opening with a detached human-interest hook.');
    matches(overview.description, /revised Libra article is the primary voice benchmark/);
    matches(overview.description, /rather than stacking facts and adding an example afterward/);
    doesNotMatch(overview.description, /Explain sign mode, element, traditional ruler, territory/);
  }
  for (const [name, field] of Object.entries(schema.properties.slotValues.properties) as [string, any][]) {
    if (!/^ingressTransitBody/u.test(name)) continue;
    matches(field.description, /within the same article/);
    matches(field.description, /without a separate textbook preface or generic aspect maxim/);
  }
  const takeaway = schema.properties.slotValues.properties.takeaway;
  if (takeaway) {
    assert.equal(takeaway.description, (narrative ? skyIngressArticleFields : skyIngressEssayFields).find(field => field.name === 'takeaway')!.description);
    if (!narrative) {
    doesNotMatch(takeaway.description, /without giving the planet agency/);
    matches(takeaway.description, /contextual personification rule/);
    matches(takeaway.description, /advice is optional/);
    }
  }
  const closing = schema.properties.slotValues.properties.closingBody;
  if (closing) {
    assert.equal(closing.description, skyIngressEssayFields.find(field => field.name === 'closingBody')!.description);
    matches(closing.description, /Personal chart context is optional/);
    matches(closing.description, /Do not instruct the reader to count houses/);
    doesNotMatch(closing.description, /Include an earned practice or reflection and directions/);
  }
  if (what) {
    assert.equal(what.description, (narrative ? skyIngressArticleFields : skyIngressEssayFields).find(field => field.name === 'what')!.description,
      'The actual provider schema receives the same guidance as the editor.');
    matches(what.description, /supplied KB and Calendar meaning/);
    summaryGuidanceProviders.add(provider);
  }
}
// Keep complete private voice passages out of public CI assertion diagnostics.
function matches(value: string, pattern: RegExp, message?: string) { assert(pattern.test(value), message ?? `Missing contract: ${pattern}`); }
function doesNotMatch(value: string, pattern: RegExp, message?: string) { assert(!pattern.test(value), message ?? `Unexpected contract: ${pattern}`); }
const originalFetch = globalThis.fetch;
async function invoke(handler: any, method: string, url: string, body?: unknown, authorized = true) {
  const req = Object.assign(Readable.from(body ? [JSON.stringify(body)] : []), { method, url,
    headers: authorized ? { "x-content-generation-secret": env.CONTENT_GENERATION_SECRET } : {} });
  const res = { statusCode: 0, result: {} as any, setHeader() {}, end(value: string) { this.result = JSON.parse(value); } };
  await handler(req, res); return { status: res.statusCode, ...res.result };
}
try {
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith(env.SUPABASE_URL)) {
      assert.equal(init.method ?? 'GET', 'GET', 'Generation must not save a source or draft.');
      return Response.json(new URL(String(url)).searchParams.has('or') ? [] : [template]);
    }
    // No network or paid calls. A failed independent check must remain visible,
    // while Swiss event facts remain available to the editor.
    if (String(url).startsWith("https://science.nasa.gov/")) return new Response("<p>Synthetic test: the length of day and night depends on latitude.</p>");
    if (String(url).startsWith("https://ssd.jpl.nasa.gov/")) return new Response("Synthetic outage", { status: 503 });
    if (String(url) === "https://api.openai.com/v1/responses") {
      const request = JSON.parse(String(init.body)); prompts.push(request.input);
      assertSummaryGuidance('openai', request.input, request.text.format.schema);
      requested = request.text.format.schema.properties.slotValues.required;
      const slotValues = ingressFixtureValues(request.input, requested);
      const transitBody = requested.find(name => /^ingressTransitBody/u.test(name) || name === 'articleBody');
      if (rejectWriterCopy && transitBody) slotValues[transitBody] = 'Synthetic draft; punctuation needs correction.';
      matches(request.instructions, /DATED INGRESS EDITORIAL AUTHORITY/);
      assert.equal(request.instructions.split(INGRESS_WRITER_CONTRACT.authority).length - 1, 1);
      doesNotMatch(request.instructions, /TRANSIT AND INGRESS EDITORIAL AUTHORITY|Friend personal-transit fields/);
      matches(request.instructions, /not a default paragraph ending/);
      assert.equal(request.instructions.split(GHOSTWRITING_SKILL_INSTRUCTIONS).length - 1, 1,
        'The dated writer receives the complete current Ghostwriter policy once.');
      assert.equal(request.model, 'gpt-5.6-sol', 'The dated ingress route uses its documented scoped writer.');
      assert.equal(request.reasoning.effort, 'xhigh');
      doesNotMatch(request.instructions, /SKY PLACEMENT ARTICLE SPINE|cultural rule and beneficiary|Maintain register consistently\. These sign cores/);
      return Response.json({ id: "synthetic-ingress-response", output_text: JSON.stringify({ slotValues }) });
    }
    if (String(url) === 'https://api.anthropic.com/v1/messages') {
      const request = JSON.parse(String(init.body)); prompts.push(request.messages[0].content[0].text);
      assertSummaryGuidance('claude', request.messages[0].content[0].text, request.tools[0].input_schema);
      requested = request.tools[0].input_schema.properties.slotValues.required;
      matches(request.system, /DATED INGRESS EDITORIAL AUTHORITY/);
      assert.equal(request.system.split(INGRESS_WRITER_CONTRACT.authority).length - 1, 1);
      doesNotMatch(request.system, /TRANSIT AND INGRESS EDITORIAL AUTHORITY|Friend personal-transit fields/);
      matches(request.system, /not a default paragraph ending/);
      assert.equal(request.system.split(GHOSTWRITING_SKILL_INSTRUCTIONS).length - 1, 1,
        'The Claude dated writer receives the same complete Ghostwriter policy.');
      doesNotMatch(request.system, /SKY PLACEMENT ARTICLE SPINE/);
      return Response.json({ id: 'synthetic-claude-ingress', content: [{ type: 'tool_use', name: 'tldr_astro_sky_article_template_slots',
        input: { slotValues: ingressFixtureValues(request.messages[0].content[0].text, requested) } }] });
    }
    throw new Error(`Unexpected test network destination: ${new URL(String(url)).origin}`);
  };
  const baseUrl = "/api/admin/sky-article-facts?planet=sun&date=2026-10-09&format=ingress-essay-v3";
  assert.equal((await invoke(factsHandler, "GET", baseUrl, undefined, false)).status, 401);
  const factsResult = await invoke(factsHandler, "GET", baseUrl);
  assert.equal(factsResult.status, 200, JSON.stringify(factsResult));
  const facts = factsResult.facts;
  assert.deepEqual(facts.templateFields, skyIngressArticleFields, "Authenticated facts carry complete authoring guidance");
  assert.equal(facts.slotValues.articleTitle, "Libra Season 2026");
  matches(facts.slotValues.when, /September 22, 2026 at 8:05 PM ET/);
  matches(facts.slotValues.when, /October 23, 2026 at 5:37 AM ET/);
  assert.equal(facts.calculationProvenance.actualEphemeris, "swiss");
  assert.equal(facts.nasa.status, "unavailable");
  assert.equal(facts.nasaExplanatoryText.status, "retrieved");
  matches(prompts.join(""), /^$/);
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
  const guardedRequest = { templateId: id, referenceDate: '2026-10-09', format: SKY_INGRESS_ARTICLE_FORMAT, provider: 'openai', expectedModel: 'gpt-5.6-sol' };
  assert.equal((await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', { ...guardedRequest, expectedModel: 7 })).status, 400);
  assert.equal((await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', { ...guardedRequest, provider: 'claude' })).status, 400);
  process.env.OPENAI_INGRESS_MODEL = 'synthetic-other-model';
  assert.equal((await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', guardedRequest)).status, 409);
  delete process.env.OPENAI_INGRESS_MODEL;
  assert.equal(prompts.length, 0, 'A mismatched preview model stops before any paid request.');
  const retired = await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', { ...guardedRequest, format: SKY_INGRESS_ESSAY_FORMAT });
  assert.equal(retired.status, 409);
  assert.equal(prompts.length, 0, 'A saved legacy workspace cannot dispatch the old writer.');
  const result = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", {
    templateId: id, referenceDate: "2026-10-09", format: SKY_INGRESS_ARTICLE_FORMAT, provider: "openai",
    expectedModel: 'gpt-5.6-sol',
    existingSlotValues: { what: "Synthetic existing owner field." }
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.generation.ingressValidation.passed, true);
  matches(result.slotValues.otherDatesSection, /Full Moon in Aries: September 26, 2026 at 12:49 PM ET/);
  matches(result.slotValues.otherDatesSection, /New Moon in Libra: October 10, 2026 at 11:50 AM ET/);
  matches(result.slotValues.otherDatesSection, /Venus stations retrograde: October 3, 2026 at 3:15 AM ET/);
  matches(result.slotValues.otherDatesSection, /Sun opposition Saturn: October 4, 2026 at 8:29 AM ET/);
  matches(result.slotValues.otherDatesSection, /Sun sextile Jupiter: October 15, 2026 at 4:21 AM ET/);
  assert.equal(prompts.length, 1);
  assert(!requested.includes("what") && !requested.includes("when") && !requested.includes("articleTitle"));
  assert(requested.includes('articleBody') && !requested.some(name => /^ingressTransitBody/u.test(name)));
  assert(!requested.includes('otherDatesSection'), 'The app assembles required dates instead of delegating fact copying.');
  assert(result.generation.requestedSlots.includes('articleBody'), 'Public article fields remain unchanged.');
  assert.deepEqual(result.blockedSlots.map((slot: any) => slot.name), ["priorOccurrenceSection"]);
  matches(prompts[0], /WRITER CONTRACT ingress-article\/v4/);
  matches(prompts[0], /astronomy-explanation-only/);
  matches(prompts[0], /after-ingress-window/);
  matches(prompts[0], /ZODIAC SEASON MEANING SOURCES/);
  matches(prompts[0], /"role":"calendar-season"/);
  matches(prompts[0], /Current writer instructions, owner corrections and eligible complete voice examples determine voice/);
  assert.deepEqual(result.generation.generationMetadata.evidencePacket.seasonMeaning.sources.map((source: any) => source.role),
    ['zodiac-season', 'learning-axis', 'calendar-season']);
  assert(!requested.includes('legacyField'), 'A placeholder in the structural reference never becomes a new writer output key.');
  assert.equal(result.slotValues.legacyField, undefined);
  assert.equal(result.generation.generationMetadata.evidencePacket.ingressTemplateReference.role, 'structure-only');
  assert.equal(result.generation.generationMetadata.evidencePacket.approvedVoiceStyle.id, 'libra-ingress-voice-benchmark-20261021');
  assert.equal(result.generation.generationMetadata.evidencePacket.approvedVoiceStyle.supportingReferences[0].id, 'sun-scorpio-ingress-voice-20261020');
  const mismatch = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", {
    templateId: id, referenceDate: "2026-12-28", format: SKY_INGRESS_ARTICLE_FORMAT
  });
  assert.equal(mismatch.status, 422);
  assert.equal(prompts.length, 1, "Mismatched templates never spend a writing call");
  rejectWriterCopy = true;
  const rejected = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", {
    templateId: id, referenceDate: "2026-10-09", format: SKY_INGRESS_ARTICLE_FORMAT, provider: "openai",
    existingSlotValues: { what: "Synthetic existing owner field." }
  });
  assert.equal(rejected.status, 422);
  assert.equal(rejected.ok, false);
  matches(rejected.error, /en dash or semicolon in articleBody/);
  assert.equal(rejected.slotValues, undefined, "Rejected copy must not be admitted as article fields");
  matches(rejected.rejectedGeneration.slotValues.articleBody, /Synthetic draft; punctuation needs correction\./);
  assert.equal(rejected.rejectedGeneration.slotValues.what, undefined, "Existing owner fields are never returned for replacement");
  assert.equal(rejected.rejectedGeneration.responseId, "synthetic-ingress-response");
  assert.equal(rejected.rejectedGeneration.provider, "openai");
  assert(rejected.rejectedGeneration.generation_metadata);
  rejectWriterCopy = false;

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
  doesNotMatch(edition.compiledMarkdown, /Horoscopes|Prior occurrence|Other dates|\{\{|legacyField/);
  const revised = await reviseSkyArticleEdition(edition, skyArticleEditableFields(edition));
  doesNotMatch(revised.compiledMarkdown, /Horoscopes/);
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
  // The same server calculation is visible in the editor and rechecked before
  // writing. Client-supplied historical facts are never accepted as evidence.
  template.content_key = "sky/article-template/venus/scorpio";
  rejectWriterCopy = false;
  const venusResult = await invoke(factsHandler, "GET", "/api/admin/sky-article-facts?planet=venus&date=2026-10-10&format=ingress-essay-v2");
  assert.equal(venusResult.status, 200);
  assert.equal(venusResult.facts.slotValues.articleTitle, "Venus Rx in Scorpio 2026", "The authenticated facts handler must retain calculated retrograde motion in the article title.");
  assert.equal(venusResult.facts.retrogradeHistory.sameSign.retrograde.instant.slice(0, 10), "2018-10-05");
  assert.equal(venusResult.facts.retrogradeHistory.nextSameSign.retrograde.instant.slice(0, 10), "2034-09-30");
  assert.equal(venusResult.facts.retrogradeHistory.previousCrossing.instant.slice(0, 10), "2018-10-16");
  assert(venusResult.facts.retrogradeHistory.nextSameSign.durationDays > 41);
  const generationRequest = { templateId: id, referenceDate: "2026-10-10", format: SKY_INGRESS_ARTICLE_FORMAT, provider: "openai" };
  const withoutHistory = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", generationRequest);
  assert.equal(withoutHistory.status, 200, JSON.stringify(withoutHistory));
  assert(withoutHistory.blockedSlots.some((slot: any) => slot.name === "priorOccurrenceSection"));
  doesNotMatch(prompts.at(-1)!, /2018-10-05T19:04/);
  const withHistory = await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", { ...generationRequest, includeRetrogradeHistory: true });
  assert.equal(withHistory.status, 200, JSON.stringify(withHistory));
  assert(!withHistory.blockedSlots.some((slot: any) => slot.name === "priorOccurrenceSection"));
  assert(requested.includes("priorOccurrenceSection"));
  matches(prompts.at(-1)!, /2018-10-05T19:04/);
  matches(prompts.at(-1)!, /not proof of a prior ingress/);
  matches(prompts.at(-1)!, /2034-09-30T19:36/);
  matches(prompts.at(-1)!, /future calculation, not historical evidence/);
  assert.deepEqual(withHistory.facts.retrogradeHistory, venusResult.facts.retrogradeHistory);
  assert.deepEqual(withHistory.generation.retrogradeHistory, venusResult.facts.retrogradeHistory, "The generation keeps its exact receipt even if the editor later reloads different facts");
  assert.equal(withoutHistory.generation.retrogradeHistory, null);
  const beforeInvalid = prompts.length;
  assert.equal((await invoke(slotsHandler, "POST", "/api/admin/sky-article-template-slots", { ...generationRequest, includeRetrogradeHistory: "yes" })).status, 400);
  assert.equal(prompts.length, beforeInvalid);
  template.content_key = 'sky/article-template/sun/libra';
  const claude = await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', {
    templateId: id, referenceDate: '2026-10-09', format: SKY_INGRESS_ARTICLE_FORMAT, provider: 'claude',
    voiceNotes: 'Synthetic exact owner direction for this dated article.'
  });
  assert.equal(claude.status, 200, JSON.stringify(claude));
  assert.equal(claude.generation.provider, 'claude');
  assert.deepEqual([...summaryGuidanceProviders].sort(), ['claude', 'openai'],
    'Both provider requests deliver the revised What guidance without changing the article fields.');
  assert(prompts.at(-1)!.includes('Synthetic exact owner direction for this dated article.'));
  assert(prompts.at(-1)!.includes('ZODIAC SEASON MEANING SOURCES'));
  const sentFacts = JSON.parse(prompts.at(-1)!.split('ASTROLOGY FACTS\n')[1].split('\nNEUTRAL HELLENISTIC')[0]);
  assert.equal(sentFacts.slotValues.when, facts.slotValues.when);
  assert.equal(sentFacts.events, undefined, 'Do not duplicate the entire event packet in the writer prompt.');
  assert.deepEqual(result.facts.events, facts.events, 'The authenticated Studio response retains complete calculated event evidence.');
  const sentPlan = JSON.parse(prompts.at(-1)!.match(/DATED INGRESS COVERAGE AND EVENT MEANING\n\n([^\n]+)/u)![1]);
  assert.deepEqual(sentPlan.coverage, facts.eventCoverage);
  assert(sentPlan.requiredDates.some((event: any) => event.event.title === 'Full Moon in Aries'));
  assert.deepEqual(sentFacts.eventCoverage, facts.eventCoverage);
  const beforeInspect = prompts.length;
  const inspect = await invoke(slotsHandler, 'GET', '/api/admin/sky-article-template-slots?inspect=ingress-voice');
  assert.equal(inspect.status, 200, JSON.stringify(inspect));
  assert.deepEqual(inspect.writerContract, ingressWriterContractReceipt());
  assert.deepEqual(result.generation.generationMetadata.evidencePacket.ingressWriting.writerContract, inspect.writerContract);
  assert.equal(inspect.voiceBenchmark.id, 'libra-ingress-voice-benchmark-20261021');
  assert.equal(inspect.voiceBenchmark.textSha256, '2e25f72d7fddd6db112a4e8b3c8ff9fed8250844940a263742ab630d0a937fd8');
  assert.equal(inspect.voiceBenchmark.supportingReferences[0].id, 'sun-scorpio-ingress-voice-20261020');
  assert.equal(inspect.providerCalls, 0);assert.equal(inspect.saved, false);assert.equal(inspect.published, false);
  assert.equal(prompts.length, beforeInspect);
  doesNotMatch(JSON.stringify(inspect), /"text":|"reference":|"slotValues":/);
  assert.equal((await invoke(slotsHandler, 'GET', '/api/admin/sky-article-template-slots?inspect=ingress-voice', undefined, false)).status, 401);
  const privateState = { CI: process.env.CI, PRIVATE_INGRESS_STYLE_REFERENCES: process.env.PRIVATE_INGRESS_STYLE_REFERENCES };
  try {
    process.env.CI = 'true';delete process.env.PRIVATE_INGRESS_STYLE_REFERENCES;
    assert.equal((await invoke(slotsHandler, 'GET', '/api/admin/sky-article-template-slots?inspect=ingress-voice')).status, 500);
    assert.equal(prompts.length, beforeInspect);
  } finally {
    for (const [key, value] of Object.entries(privateState)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
  const narrativeFacts = await invoke(factsHandler, 'GET', baseUrl.replace('ingress-essay-v2', SKY_INGRESS_ARTICLE_FORMAT));
  assert.equal(narrativeFacts.status, 200);
  assert.deepEqual(narrativeFacts.facts.templateFields, skyIngressArticleFields);
  assert.deepEqual(narrativeFacts.facts.events, facts.events, 'Changing the article contract cannot change calculated event coverage.');
  const beforeNarrative = prompts.length;
  for (const provider of ['openai', 'claude']) {
    const narrative = await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', {
      templateId: id, referenceDate: '2026-10-09', format: SKY_INGRESS_ARTICLE_FORMAT, provider,
      ...(provider === 'openai' ? { expectedModel: 'gpt-5.6-sol' } : {})
    });
    assert.equal(narrative.status, 200, 'The actual narrative handler must accept its full-body provider schema.');
    assert.equal(narrative.generation.providerCalls, 1);
    assert.equal(narrative.generation.ingressValidation.passed, true);
    assert.equal(narrative.generation.ingressValidation.ownerApproved, false);
    assert.equal(narrative.slotValues.articleBody, 'Synthetic complete draft field.');
    matches(narrative.slotValues.otherDatesSection, /## Key dates/);
    for (const title of ['Sun opposition Neptune', 'Sun opposition Saturn', 'Sun sextile Jupiter', 'Full Moon in Aries', 'New Moon in Libra']) {
      assert.equal(narrative.slotValues.otherDatesSection.split(`${title}:`).length - 1, 1);
    }
    assert.deepEqual(narrative.generation.generationMetadata.evidencePacket.ingressWriting.meaningSources,
      result.generation.generationMetadata.evidencePacket.ingressWriting.meaningSources,
      'The whole-body adapter preserves every complete meaning source and its hash.');
    assert.deepEqual(narrative.generation.generationMetadata.evidencePacket.approvedVoiceStyle,
      result.generation.generationMetadata.evidencePacket.approvedVoiceStyle);
  }
  assert.equal(prompts.length, beforeNarrative + 2, 'One intercepted provider call per test, with no judge or retry.');
  assert.deepEqual([...narrativeProviders].sort(), ['claude', 'openai']);
  rejectWriterCopy = true;
  const rejectedNarrative = await invoke(slotsHandler, 'POST', '/api/admin/sky-article-template-slots', {
    templateId: id, referenceDate: '2026-10-09', format: SKY_INGRESS_ARTICLE_FORMAT, provider: 'openai'
  });
  assert.equal(rejectedNarrative.status, 422);
  assert.equal(rejectedNarrative.slotValues, undefined);
  matches(rejectedNarrative.rejectedGeneration.slotValues.articleBody, /Synthetic draft; punctuation needs correction/);
  assert.equal(prompts.length, beforeNarrative + 3, 'A rejected narrative candidate is returned once without a retry.');
  globalThis.fetch = async () => Response.json({ signature: { source: "Synthetic NASA response" }, result: "$$SOE\n2026-Oct-09, , 191.5, 0.1,\n$$EOE" });
  assert.equal((await skyIngressNasaReceipt("sun", context.activeInstant, 191.5)).status, "matched");
  assert.equal((await skyIngressNasaReceipt("sun", context.activeInstant, 191)).status, "disagreement");
  assert.equal((await skyIngressNasaReceipt("north-node", context.activeInstant, 191)).status, "unsupported");
  console.log("PASS ingress Studio: actual authenticated facts/slot handlers, real Swiss roots, provider request, retained fields, isolated companion, exact approved reader payload, expiry, DST and scoped NASA receipts.");
} finally { globalThis.fetch = originalFetch; }
