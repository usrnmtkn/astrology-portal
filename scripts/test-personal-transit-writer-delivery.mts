import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syntheticTransitSources, syntheticMeaningRecord, syntheticStylePhrase, encodeTransitSources, digest } from "./fixtures/personal-transit-writing.mjs";
import { buildPersonalTransitWriterContext, readPersonalTransitSources, assertPersonalTransitWriterContext } from "../api/_lib/personal-transit-writer-context.js";
import { READER_RULES_JSON, READER_RULES_SHA256 } from "../src/astro-writing/personalTransitReaderRules.mjs";
import semantics from "../src/astro-writing/transitNatalSemantics.cjs";

const meaning = "Synthetic supplied meaning with an exact final sentence.";
const env = { NODE_ENV: "test", CONTENT_GENERATION_SECRET: "synthetic-transit-secret",
  SUPABASE_URL: "https://transit.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic",
  OPENAI_API_KEY: "synthetic", ANTHROPIC_API_KEY: "synthetic", STUDIO_MEMORY_FEEDBACK_ENABLED: "false",
  PRIVATE_PERSONAL_TRANSIT_SOURCES: encodeTransitSources(syntheticTransitSources({ meaningText: meaning })) };
Object.assign(process.env, env);
const { default: handler } = await import("../api/admin/personal-transit-writing.js");
Object.assign(process.env, env);
const target = "authored/transit-aspect/neptune/jupiter/trine";
const base = { contentKey: target, youText: "", friendText: "", audience: "both" };
let calls = 0, writes = 0, prompt = "", names: string[] = [], rows: any[] = [];
const originalFetch = globalThis.fetch;
async function invoke(body: any, authorized = true) {
  const req = Object.assign(Readable.from([JSON.stringify(body)]), { method: "POST",
    headers: authorized ? { "x-content-generation-secret": env.CONTENT_GENERATION_SECRET } : {} });
  const res = { statusCode: 0, result: {} as any, setHeader() {}, end(text: string) { this.result = JSON.parse(text); } };
  await handler(req as any, res as any); return { status: res.statusCode, ...res.result };
}
try {
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith(env.SUPABASE_URL)) {
      if (init.method && init.method !== "GET") { writes++; throw Error("Storage mutations are forbidden in generation"); }
      return Response.json(rows);
    }
    const request = JSON.parse(String(init.body));
    if (String(url) === "https://api.openai.com/v1/responses") {
      calls++; prompt = request.input; names = request.text.format.schema.properties.slotValues.required;
      return Response.json({ id: "synthetic-response", output_text: JSON.stringify({ slotValues:
        Object.fromEntries(names.map(name => [name, `${name === "youDraft" ? "You" : "They"} read the synthetic result until {{untilDate}}.`])) }) });
    }
    if (String(url) === "https://api.anthropic.com/v1/messages") {
      calls++; prompt = request.messages[0].content[0].text; names = request.tools[0].input_schema.properties.slotValues.required;
      return Response.json({ id: "synthetic-response", content: [{ type: "tool_use", name: "tldr_astro_sky_article_template_slots",
        input: { slotValues: Object.fromEntries(names.map(name => [name, `${name === "youDraft" ? "You" : "They"} read the synthetic result until {{untilDate}}.`])) } }] });
    }
    throw Error("Unexpected network destination");
  };
  assert.equal((await invoke(base, false)).status, 401);
  for (const provider of ["openai", "claude"]) {
    const result = await invoke({ ...base, provider });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.equal(result.saved, false); assert.equal(result.published, false); assert.equal(result.approved, false);
    assert.deepEqual(result.generatedAudiences, ["you", "friend"]);
    assert.equal(result.writingReceipt.meaningSha256, digest(meaning));
    assert.equal(result.writingReceipt.ruleBundleSha256, READER_RULES_SHA256);
    assert.equal(result.writingReceipt.promptSha256, digest(prompt));
    assert(prompt.includes(READER_RULES_JSON));
    assert(!prompt.includes("The current effective rules below qualify earlier editorial instructions"));
    const context = JSON.parse(prompt.slice(prompt.indexOf('{"transit":')).split("\n\n")[0]);
    assert.equal(context.readerMeaning, meaning);
    assert.equal(context.destinations.length, 2);
    for (const destination of context.destinations) {
      assert.equal(destination.stylePhrases.length, 1);
      assert.equal(destination.stylePhrases[0].text, syntheticStylePhrase().text);
      assert.equal(destination.stylePhrases[0].authority, 'style-only');
      assert.equal(destination.stylePhrases[0].factsMayTransfer, false);
      assert.equal(destination.stylePhrases[0].perspectiveMayTransfer, false);
      assert.equal(destination.stylePhrases[0].copyRequired, false);
      for (const example of destination.voiceExamples) {
        const source = syntheticTransitSources().passages.find(p => p.id === example.sourceId)!;
        assert.equal(example.text, source.text, "Keep the complete multi-paragraph source beyond 1400 characters");
        assert.equal(source.field, destination.perspective === "you" ? "body_you" : "body_they");
        assert.equal(example.factsMayTransfer, false);
      }
    }
    assert.doesNotMatch(prompt, /GOVERNED KNOWLEDGE EVIDENCE|direct concentration|lower resistance|dreaminess and fog|IMMUTABLE OWNER TEMPLATE|OWNER_POSITIVE_EVIDENCE_BELOW_FLOOR/i);
    assert(!JSON.stringify(result).includes(syntheticTransitSources().passages[0].text), "Only source hashes and IDs leave in receipts");
    assert(!JSON.stringify(result).includes(syntheticStylePhrase().text), 'Private phrase text cannot leave in a receipt');
    assert.deepEqual(result.writingReceipt.stylePhraseSources.map((p: any) => p.audience), ['you', 'friend']);
    assert(result.writingReceipt.stylePhraseSources.every((p: any) => p.textSha256 === syntheticStylePhrase().sha256));
  }
  const beforeFailures = calls;
  assert.equal((await invoke({ ...base, readerMeaning: "Unrecorded invented meaning." })).status, 409);
  const missing = syntheticTransitSources(); missing.meanings = [];
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(missing);
  assert.equal((await invoke(base)).status, 409);
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources({...syntheticTransitSources({ reviewed: false }),calibration:{required:true,id:"synthetic-review",source:"synthetic-owner-request",contentKeys:[target]}});
  const inspect = await invoke({ ...base, action: "meaning" });
  assert.equal(inspect.status, 200); assert.equal(inspect.meaning.status, "proposed-owner-review");
  assert.equal((await invoke({ ...base, action: "meaning" }, false)).status, 401);
  assert.equal((await invoke(base)).status, 409, "A proposed meaning does not dispatch a paid request");
  const legacy = syntheticTransitSources(); legacy.meanings = [{ contentKey: target, text: meaning, sha256: digest(meaning), status: "proposed-owner-review" }] as any;
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(legacy);
  assert.equal((await invoke(base)).status, 409);
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = "invalid";
  assert.equal((await invoke(base)).status, 409);
  const corrupted = syntheticTransitSources(); corrupted.passages[0].text += "tampered";
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(corrupted);
  assert.equal((await invoke(base)).status, 409);
  for (const patch of [{text: 'Tampered phrase'}, {roleSource: ''}, {ownerSupplied: false}, {wordCount: 999},
    {audiences: ['reader']}, {id: syntheticTransitSources().passages[0].id}, {role: 'instruction'}]) {
    const badPhrases = {...syntheticTransitSources(), stylePhrases: [syntheticStylePhrase(patch)]};
    process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(badPhrases);
    assert.equal((await invoke(base)).status, 409, 'Malformed or unassigned phrases stop before provider dispatch');
  }
  const retired = syntheticTransitSources(); retired.passages.forEach(p => { if (p.field === "body_they") p.status = "retired"; });
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(retired);
  assert.equal((await invoke(base)).status, 409, "Never fall back to You or article examples for Friend");
  assert.equal(calls, beforeFailures, "Missing meaning and bad sources stop before any provider call");
  Object.assign(process.env, env);
  rows = [{ content_key: target, body: "Saved owner You.", sections: { packageDraft: { body_you: "Saved owner You.", body_they: "" } } }];
  const partial = await invoke({ ...base, youText: "Saved owner You." });
  assert.equal(partial.status, 200);
  assert.deepEqual(names, ["friendDraft"]); assert.equal(partial.youDraft, null);
  assert.deepEqual(partial.preservedAudiences, ["you"]);
  assert(!prompt.includes("Saved owner You."), "Unrequested existing copy is not voice evidence");
  const recheckCalls = calls;
  const review = await invoke({ ...base, action: "recheck", youText: "You feel steadier and settled." });
  assert.equal(review.status, 200); assert(review.checks.some((x: any) => x.code === "BANNED_VOCABULARY" && x.detail === "steadier"));
  assert.equal(calls, recheckCalls); assert.equal(writes, 0);

  const sources = readPersonalTransitSources();
  const packet = semantics.resolveTransitNatalSemantics({ transiting: "neptune", natal: "jupiter", aspect: "trine" });
  const storedMeaning = syntheticMeaningRecord(target, meaning);
  const options = { contentKey: target, transiting: "neptune", natal: "jupiter", aspect: "trine", requested: ["you"] as ["you"],
    instruction: "", record: { contentKey: target, body_you: "{{untilDate}}" }, youText: "", friendText: "", facts: {} };
  const connected = buildPersonalTransitWriterContext(options, { ...sources, meanings: [storedMeaning] });
  assert(connected.prompt.includes(meaning)); assert(!connected.prompt.includes("synthetic-private-meaning"));
  const phrase = syntheticStylePhrase();
  const styleContext = (stylePhrases: any, extra = {}) => buildPersonalTransitWriterContext(
    {...options, requested: ['you', 'friend']}, {...sources, stylePhrases, ...extra});
  const withoutPhrases = styleContext(undefined);
  assert.deepEqual(withoutPhrases.receipt.stylePhraseSources, [], 'Phrases are optional, not a new evidence quota');
  assert.deepEqual(withoutPhrases.receipt.sources, connected.receipt.sources.concat(
    buildPersonalTransitWriterContext({...options, requested:['friend']}, sources).receipt.sources));
  assert.notEqual(withoutPhrases.receipt.promptSha256, styleContext([phrase]).receipt.promptSha256);
  for (const patch of [{status:'retired'}, {status:'rejected'}, {contentKeys:['authored/transit-aspect/moon/saturn/sextile']},
    {excludedContentKeys:[target]}]) assert.deepEqual(styleContext([{...phrase,...patch}]).receipt.stylePhraseSources, []);
  assert.deepEqual(styleContext([{...phrase,audiences:['you']}]).receipt.stylePhraseSources.map(p => p.audience), ['you']);
  assert.equal(styleContext([phrase,{...phrase,id:'duplicate-text'}]).receipt.stylePhraseSources.length, 2,
    'Deduplicate identical text per destination');
  const phraseRevocation = {source:'synthetic-current-rejection', corrections:[], exclusions:[
    {role:'voice',sha256:phrase.sha256,source:'synthetic-owner-rejection',contentKeys:[target]}]};
  assert.deepEqual(styleContext([phrase], {feedback:{...phraseRevocation,sha256:digest(JSON.stringify(phraseRevocation))}}).receipt.stylePhraseSources, []);
  assert.deepEqual(buildPersonalTransitWriterContext({...options,excludedVoiceTextHashes:[phrase.sha256]}, sources).receipt.stylePhraseSources, []);
  assert.throws(() => styleContext([{...phrase,text:'Tampered in direct batch preparation'}]), /failed verification/);
  assert.throws(() => styleContext(null), /failed verification/);
  assert.throws(() => buildPersonalTransitWriterContext(options, {...sources,passages:[]}), /No current approved You/,
    'A phrase bank cannot replace complete passage evidence');
  for (const invalid of [{ ...storedMeaning, status: "rejected" }, { ...storedMeaning, semanticPacketSha256: "stale" }, { ...storedMeaning, text: "changed" }]) {
    assert.throws(() => buildPersonalTransitWriterContext(options, { ...sources, meanings: [invalid] }), /rejected, stale, or unverifiable/);
  }
  const one = { ...sources, passages: sources.passages.filter(p => p.field === "body_you").slice(0, 1) };
  assert.equal(buildPersonalTransitWriterContext(options, one).receipt.sources.length, 1,
    "No three-example quota for Personal Transit");
  assert.throws(() => buildPersonalTransitWriterContext({ ...options, excludedVoiceTextHashes: one.passages.map(p => p.sha256) }, one), /No current approved You/,
    "Explicit revocation overrides positive source role");

  const preferred = { ...one.passages[0], id: "synthetic-preferred", contentKey: "owner-voice/synthetic",
    preferred: true, perspectiveUse: { audiences: ["you", "friend"] as Array<"you" | "friend">, source: "synthetic-explicit-role" },
    excludedContentKeys: ["authored/transit-aspect/moon/chiron/trine"] };
  const correction = { id: "synthetic-correction", source: "synthetic-owner-direction", contentKeys: [target],
    text: "Synthetic exact current direction.", sha256: digest("Synthetic exact current direction.") };
  const feedbackPayload = { source: "synthetic-current-registry", corrections: [correction], exclusions: [] };
  const preferredSources = { ...sources, passages: [...sources.passages, preferred],
    feedback: { ...feedbackPayload, sha256: digest(JSON.stringify(feedbackPayload)) } };
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(preferredSources);
  const parsedSources = readPersonalTransitSources();
  const preferredContext = buildPersonalTransitWriterContext({ ...options, requested: ["you", "friend"] }, parsedSources);
  assert.equal(preferredContext.receipt.sources.length, 2, "Do not fill a preferred selection with weaker historical examples");
  assert(preferredContext.receipt.sources.every(source => source.id === preferred.id));
  assert(preferredContext.prompt.includes(correction.text));
  assert.deepEqual(preferredContext.receipt.correctionIds, [correction.id]);
  const scoped = { ...preferred, id: 'synthetic-contact-preferred', contentKey: 'owner-voice/scoped',
    preferred: false, preferredContentKeys: [target] };
  const scopedSources = { ...parsedSources, passages: [...parsedSources.passages, scoped] };
  const scopedContext = buildPersonalTransitWriterContext({ ...options, requested: ['you', 'friend'] }, scopedSources);
  assert.deepEqual(scopedContext.receipt.sources.map(p => p.id), [scoped.id, scoped.id],
    'An eligible contact assignment replaces general benchmarks without filling a quota');
  assert.equal(scopedContext.receipt.ruleBundleSha256, preferredContext.receipt.ruleBundleSha256);
  assert.equal(scopedContext.receipt.meaningRecordSha256, preferredContext.receipt.meaningRecordSha256);
  assert.notEqual(scopedContext.receipt.promptSha256, preferredContext.receipt.promptSha256);
  const otherScope = { ...scoped, preferredContentKeys: ['authored/transit-aspect/mercury/venus/trine'] };
  assert.deepEqual(buildPersonalTransitWriterContext(options, { ...scopedSources,
    passages: [...parsedSources.passages, otherScope] }).receipt.sources.map(p => p.id), [preferred.id],
    'Contact preference does not become a global preference');
  for (const patch of [{status: 'rejected'}, {status: 'retired'}, {excludedContentKeys: [target]}]) {
    assert.deepEqual(buildPersonalTransitWriterContext(options, { ...scopedSources,
      passages: [...parsedSources.passages, {...scoped,...patch}] }).receipt.sources.map(p => p.id), [preferred.id],
      'A contact preference cannot bypass eligibility or exclusions');
  }
  const youOnly = { ...scoped, perspectiveUse: undefined };
  assert.deepEqual(buildPersonalTransitWriterContext({ ...options, requested: ['friend'] }, { ...scopedSources,
    passages: [...parsedSources.passages, youOnly] }).receipt.sources.map(p => p.id), [preferred.id],
    'A contact preference cannot authorize a new audience');
  const callsBeforeInvalidPreference = calls;
  for (const preferredContentKeys of ['all', [target, target], ['authored/transit-house/saturn/7'], [null]]) {
    const invalid = { ...scopedSources, passages: [...parsedSources.passages, {...scoped,preferredContentKeys}] };
    assert.throws(() => buildPersonalTransitWriterContext(options, invalid as any), /preferences failed verification/);
    process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(invalid as any);
    assert.equal((await invoke(base)).status, 409, 'Malformed scopes fail before provider dispatch');
  }
  assert.equal(calls, callsBeforeInvalidPreference);
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(scopedSources);
  const scopedResponse = await invoke(base);
  assert.equal(scopedResponse.status, 200);
  assert(scopedResponse.writingReceipt.sources.every((p: any) => p.id === scoped.id));
  assert(prompt.includes('A brief observation about affection, enjoyment or curiosity can be complete.'));
  assert(prompt.includes(READER_RULES_JSON), 'Conditional development does not soften the frozen output rules');
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(parsedSources);
  rows = [];
  const preferredResponse = await invoke(base);
  assert.equal(preferredResponse.status, 200);
  assert(preferredResponse.writingReceipt.sources.every((source: any) => source.id === preferred.id));
  assert(prompt.includes(correction.text));
  assert.equal(preferredResponse.writingReceipt.feedbackSha256, parsedSources.feedback?.sha256);
  const revokedPayload = { ...feedbackPayload, exclusions: [{ role: "voice" as const, sha256: preferred.sha256, source: "synthetic-revocation", contentKeys: [target] }] };
  const revoked = { ...parsedSources, feedback: { ...revokedPayload, sha256: digest(JSON.stringify(revokedPayload)) } };
  assert(!buildPersonalTransitWriterContext(options, revoked).receipt.sources.some(source => source.id === preferred.id));
  const retiredMeaning = { ...revokedPayload, exclusions: [{ role: "meaning" as const, sha256: storedMeaning.sha256, source: "synthetic-retirement", contentKeys: [target] }] };
  assert.throws(() => buildPersonalTransitWriterContext(options, { ...parsedSources,
    feedback: { ...retiredMeaning, sha256: digest(JSON.stringify(retiredMeaning)) } }), /retired by a later correction/);
  const proposedSources = { ...parsedSources, calibration:{required:true,id:"synthetic-review",source:"synthetic-owner-request",contentKeys:[target]}, meanings: [syntheticMeaningRecord(target, meaning, false)] };
  assert.throws(() => buildPersonalTransitWriterContext(options, proposedSources), /Review the saved/);
  const evaluationPermission = {actor:'owner',decision:'test-proposed-keep-unapproved',source:'synthetic-owner-request',ownerStatement:'Synthetic permission',calibrationId:'synthetic-review',ownerApproved:false,
    records:proposedSources.meanings.map(m=>({contentKey:m.contentKey,textSha256:m.sha256,recordSha256:m.recordSha256}))};
  assert(buildPersonalTransitWriterContext(options, proposedSources, { evaluationPermission }).prompt.includes(meaning));
  assert(buildPersonalTransitWriterContext(options, {...proposedSources,calibration:undefined}).prompt.includes(meaning),'Routine preparation adds no universal meaning approval');
  const outside = syntheticMeaningRecord('authored/transit-aspect/saturn/saturn/conjunction',meaning,false);
  assert(buildPersonalTransitWriterContext({...options,contentKey:outside.contentKey,transiting:'saturn',natal:'saturn',aspect:'conjunction'},
    {...proposedSources,meanings:[...proposedSources.meanings,outside]}).prompt.includes(meaning),'A scoped calibration cannot block an unrelated contact');
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(proposedSources);
  const beforeEvaluationBypass = calls;
  assert.equal((await invoke({ ...base, allowProposedForEvaluation: true })).status, 409, "HTTP callers cannot activate the private evaluation option");
  assert.equal(calls, beforeEvaluationBypass);
  const invalidFeedback = { ...preferredSources, feedback: { ...preferredSources.feedback, sha256: "stale" } };
  process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(invalidFeedback);
  assert.throws(() => readPersonalTransitSources(), /failed verification/);
  const registryDirectory = mkdtempSync(join(tmpdir(), 'transit-live-local-feedback-'));
  const runtime = {CI:process.env.CI,VERCEL:process.env.VERCEL};
  try {
    delete process.env.CI; delete process.env.VERCEL;
    const registryPath = join(registryDirectory,'feedback.json');
    const setCorrection = (text: string) => writeFileSync(registryPath,JSON.stringify({schema:'personal-transit-feedback-v1',rejectionSources:[],
      corrections:[{id:'synthetic-current',role:'owner-correction',contentKeys:[],source:'synthetic-owner-source',text,sha256:digest(text)}]}));
    setCorrection('Exact synthetic current direction.');
    const local = {...parsedSources,feedbackRegistryPath:registryPath};
    const original = buildPersonalTransitWriterContext(options,local);
    assert(original.prompt.includes('Exact synthetic current direction.'));
    assertPersonalTransitWriterContext(original,options.contentKey,['youDraft']);
    setCorrection('Exact synthetic later direction.');
    assert.throws(() => assertPersonalTransitWriterContext(original,options.contentKey,['youDraft']),/feedback changed/);
    const refreshed = buildPersonalTransitWriterContext(options,local);
    assert(refreshed.prompt.includes('Exact synthetic later direction.'));
    assert(!refreshed.prompt.includes('Exact synthetic current direction.'));
    process.env.CI = 'true';
    assert.throws(() => buildPersonalTransitWriterContext(options,local),/Local feedback registries/);
  } finally {
    for (const [name,value] of Object.entries(runtime)) { if(value === undefined) delete process.env[name]; else process.env[name]=value; }
    rmSync(registryDirectory,{recursive:true,force:true});
  }
} finally { globalThis.fetch = originalFetch; }
console.log(`PASS Personal Transit actual-handler delivery: ${calls} mocked calls, private whole passages, separate meaning, same rules, exact audiences, source failures before spend, no writes.`);
