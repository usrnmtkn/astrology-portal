import { ingressWriterFixture } from './fixtures/ingress-writer-context.mts';
import assert from "node:assert/strict";
import {
  generateSkyArticleTemplateSlots,
  generateWithOpenAI,
  generateWithClaude,
  type GenerateSkyArticleTemplateSlotsInput
} from "../api/_lib/content-generation.js";
import { prepareProductionPreCallGate } from "../src/astro-writing/productionPreCallGate.cjs";
import { buildPersonalTransitWriterContext } from "../api/_lib/personal-transit-writer-context.js";
import { syntheticTransitSources } from "./fixtures/personal-transit-writing.mjs";

// Exercise the real writer boundary with every network destination intercepted.
// These fixtures test source delivery, not the quality of model-written prose.
Object.assign(process.env, {
  NODE_ENV: "test", OPENAI_API_KEY: "synthetic", ANTHROPIC_API_KEY: "synthetic",
  STUDIO_MEMORY_FEEDBACK_ENABLED: "false", WRITING_KERNEL_GOVERNED_SURFACES: "",
  WRITING_KERNEL_SKY_GLOBAL_ENABLE: "0", WRITING_KERNEL_SKY_CANARY_PERCENT: "0"
});

const ingress = await ingressWriterFixture();
const fixtures: GenerateSkyArticleTemplateSlotsInput[] = [
  {
    templateKey: "authored/transit-aspect/neptune/jupiter/trine", templateBody: "",
    planet: "neptune", sign: "base", surface: "you", eventType: "transit-aspect",
    knowledgeIds: ["transit-aspect/neptune/jupiter/trine"],
    facts: { transiting: "neptune", natal: "jupiter", aspect: "trine", housesExcluded: true, signsExcluded: true },
    requestedSlots: [{ name: "youDraft" }, { name: "friendDraft" }]
  },
  {
    templateKey: "authored/transit-house/mars/11", templateBody: "",
    planet: "mars", sign: "base", surface: "you", eventType: "transit-house",
    knowledgeIds: ["transit-house/mars/11"], facts: { planet: "mars", house: "11" },
    requestedSlots: [{ name: "youDraft" }]
  },
  {
    templateKey: "authored/transit-return/saturn", templateBody: "",
    planet: "saturn", sign: "base", surface: "you", eventType: "transit-aspect",
    knowledgeIds: ["transit-aspect/saturn/saturn/conjunction"],
    facts: { transiting: "saturn", natal: "saturn", aspect: "conjunction" },
    requestedSlots: [{ name: "friendDraft" }]
  },
  {
    templateKey: "sky/article-template/sun/libra", templateBody: "{{articleBody}}",
    planet: "sun", sign: "libra", ...ingress, requestedSlots: [{ name: "articleBody" }]
  }
];

let requests = 0;
let captured = "";
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, init = {}) => {
    const request = JSON.parse(String(init.body));
    requests++;
    if (String(url) === "https://api.openai.com/v1/responses") {
      captured = request.input;
      const names = request.text.format.schema.properties.slotValues.required;
      return Response.json({ id: "synthetic", output_text: JSON.stringify({ slotValues:
        Object.fromEntries(names.map((name: string) => [name, "Synthetic draft field."])) }) });
    }
    if (String(url) === "https://api.anthropic.com/v1/messages") {
      captured = request.messages[0].content[0].text;
      const names = request.tools[0].input_schema.properties.slotValues.required;
      return Response.json({ id: "synthetic", content: [{ type: "tool_use", name: "tldr_astro_sky_article_template_slots",
        input: { slotValues: Object.fromEntries(names.map((name: string) => [name, "Synthetic draft field."])) } }] });
    }
    throw new Error("Unexpected network destination in isolated meaning-delivery test");
  };

  for (const fixture of fixtures) {
    const generationInput = {
      contentKey: fixture.templateKey, surface: fixture.surface ?? "sky", mode: "article",
      eventType: fixture.eventType ?? "sky-article-template-slots", facts: fixture.facts,
      knowledgeIds: fixture.knowledgeIds ?? [`sky-placement-${fixture.planet}-${fixture.sign}`],
      sourceSnapshot: { contentType: "sky-article-template-slots" }
    };
    const gate = prepareProductionPreCallGate(generationInput, {});
    assert.equal(gate.canary.selected, false);
    assert.equal(gate.governedPromptEnabled, true, `${fixture.templateKey}: slot writing must receive its validated meaning`);
    assert(gate.governedPrompt.length > 0);
    const personalTransitContext = fixture.eventType === "transit-aspect" ? buildPersonalTransitWriterContext({
      contentKey: fixture.templateKey, transiting: String(fixture.facts.transiting), natal: String(fixture.facts.natal), aspect: String(fixture.facts.aspect),
      requested: fixture.requestedSlots.map(slot => slot.name === "youDraft" ? "you" : "friend"),
      instruction: "", record: { contentKey: fixture.templateKey },
      youText: "", friendText: "", facts: {}
    }, syntheticTransitSources()) : undefined;
    for (const provider of ["openai", "claude"] as const) {
      captured = "";
      await generateSkyArticleTemplateSlots({ ...fixture, provider, writingMemory: null, personalTransitContext });
      if (personalTransitContext) {
        assert(!captured.includes('OWNER-APPROVED STYLE REFERENCE'),'Dedicated Personal Transit voice remains primary');
        assert(!captured.includes('NEUTRAL HELLENISTIC MEANING SUPPORT'), 'Keep mechanics outside Personal Transit reader-meaning projection');
        assert(captured.includes('"readerMeaning":"Synthetic complete contact meaning."'));
        assert(!captured.includes(gate.governedPrompt), "Mechanics are verified privately, not passed as draft language.");
        assert(captured.includes("CURRENT PERSONAL TRANSIT READER-COPY RULE BUNDLE"));
      } else {
        const style=JSON.parse(captured.match(/OWNER-APPROVED STYLE REFERENCE\n([^\n]+)/u)![1]);
        const ingressStyle = fixture.facts.articleFormat === 'ingress-essay-v3';
        assert.equal(style.reference.id, ingressStyle ? 'libra-ingress-voice-benchmark-20261021' : 'saturn-aries-voice-20261020');
        assert.equal(style.reference.textSha256, ingressStyle
          ? '2e25f72d7fddd6db112a4e8b3c8ff9fed8250844940a263742ab630d0a937fd8'
          : 'bd9e64d07024c4899150056265b4f7a22afd074a4c9eb94b1b126319d6994fca');
        assert.equal(style.reference.ownerAuthored,false);assert.equal(style.reference.factUseAuthorized,false);
        if (ingressStyle) {
          assert.equal(style.supportingReferences[0].reference.textSha256,'6799ba2f672c68281981a14ea53b1baee7cdd8874f0dc6e7d624402ec5d1980b');
          assert.equal(style.receipt.supportingReferences[0].id,'sun-scorpio-ingress-voice-20261020');
        } else assert.equal(style.supportingReferences,undefined);
        assert.equal(captured.split('OWNER-APPROVED STYLE REFERENCE\n').length-1,1);
        const neutral=JSON.parse(captured.match(/NEUTRAL HELLENISTIC MEANING SUPPORT\n([^\n]+)/u)![1]);
        assert.equal(neutral.role,'meaning-only');
        assert.equal(neutral.receipt.positiveVoiceEvidence,false);
        assert(neutral.records.some((r:any)=>r.id==='HB-01'));
        assert(!neutral.records.some((r:any)=>['HB-08','HB-28','HB-29'].includes(r.id)),'No natal sect or time-lord inference');
        assert.equal(captured.split('NEUTRAL HELLENISTIC MEANING SUPPORT\n').length-1,1);
        if(fixture.eventType==='transit-house')assert(neutral.records.some((r:any)=>r.id==='HB-24'));
        else assert(!neutral.records.some((r:any)=>r.id==='HB-24'),'A sign cannot supply a house');
        if (ingressStyle) {
          assert(!captured.includes('GOVERNED KNOWLEDGE EVIDENCE'), 'The dedicated ingress retains collective meaning instead of a natal packet.');
          assert(captured.includes('DATED INGRESS COVERAGE AND EVENT MEANING'));
          assert(captured.includes('WRITER CONTRACT ingress-article/v6-2026-10-22'));
          assert(captured.includes('ZODIAC SEASON MEANING SOURCES'));
        } else {
        assert(captured.includes(`GOVERNED KNOWLEDGE EVIDENCE\n${gate.governedPrompt}`),
          `${provider}/${fixture.templateKey}: include the complete validated meaning packet`);
        assert.equal(captured.split("GOVERNED KNOWLEDGE EVIDENCE\n").length - 1, 1);
        assert(captured.includes("meaning and mechanism evidence; not a prose template"));
        assert(captured.includes("TRANSIT AND INGRESS EDITORIAL AUTHORITY"));
        assert(captured.includes("Passing vocabulary checks alone does not establish voice"));
        assert(captured.includes("Develop emotional stakes and explain how a situation arose only when supported meaning"));
        assert(captured.includes("different factual and structural requirements"));
        }
      }
      assert.doesNotMatch(captured, /Write in this order: placement or event named plainly/);
      assert.doesNotMatch(captured, /This guide sits above the voice spec/);
      assert.doesNotMatch(captured, /Never use "you," "your," or "part of you\."/);
      assert.doesNotMatch(captured, /One idea per sentence|not clipped fragments/);
    }
    assert.equal(prepareProductionPreCallGate({ ...generationInput, sourceSnapshot: {} }, {}).governedPromptEnabled,
      false, "Other generation routes retain their existing rollout controls");
  }
  const legacySky = { contentKey: "sky/article-template/sun/libra", surface: "sky", mode: "article",
    eventType: "sky-article-template-slots", facts: { planet: "sun", sign: "libra" },
    knowledgeIds: ["sky-placement-sun-libra"], sourceSnapshot: { contentType: "sky-article-template-slots" } };
  assert.equal(prepareProductionPreCallGate(legacySky, {}).governedPromptEnabled, false,
    "Unrelated Sky templates keep their existing rollout controls");
  const beforeInvalid = requests;
  await assert.rejects(generateSkyArticleTemplateSlots({ ...fixtures[0], knowledgeIds: ["unknown-transit"],
    provider: "openai", writingMemory: null }), /PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED/);
  assert.equal(requests, beforeInvalid, "Unresolved meaning must stop before a model request");
  assert.equal(requests, 8);
  // Stop at the real planner/provider boundaries. An intentional error makes
  // it impossible for this check to generate prose or dispatch a review.
  const generic={contentKey:'sky/article-template/sun/libra',surface:'sky' as const,mode:'article' as const,
    eventType:'sky-article-template-slots',facts:{planet:'sun',sign:'libra'},
    knowledgeIds:['sky-placement-sun-libra']};
  globalThis.fetch=async(url,init={})=>{
    const request=JSON.parse(String(init.body));
    assert.equal(String(url),'https://api.openai.com/v1/responses');
    assert.equal(request.text.format.name,'tldr_astro_meaning_plan');
    const support=JSON.parse(request.input).neutralMeaningSupport;
    assert(support.records.some((r:any)=>r.id==='HB-04'));
    assert(!support.records.some((r:any)=>r.id==='HB-24'));
    return Response.json({error:{message:'synthetic planner boundary stop'}},{status:422});
  };
  await assert.rejects(generateWithOpenAI(generic),/synthetic planner boundary stop/u);
  globalThis.fetch=async(url,init={})=>{
    assert.equal(String(url),'https://api.anthropic.com/v1/messages');
    const request=JSON.parse(String(init.body));
    const prompt=request.messages[0].content[0].text;
    assert.equal(prompt.split('NEUTRAL HELLENISTIC MEANING SUPPORT\n').length-1,1);
    assert(prompt.includes('APPROVED TLDR ASTRO EXAMPLES'));
    const style=JSON.parse(prompt.match(/OWNER-APPROVED STYLE REFERENCE\n([^\n]+)/u)![1]);
    assert.equal(style.reference.textSha256,'bd9e64d07024c4899150056265b4f7a22afd074a4c9eb94b1b126319d6994fca');
    assert.equal(style.reference.ownerAuthored,false);
    return Response.json({error:{message:'synthetic writer boundary stop'}},{status:422});
  };
  await assert.rejects(generateWithClaude(generic),/synthetic writer boundary stop/u);
} finally { globalThis.fetch = originalFetch; }
console.log("Transit, house, return and ingress meaning reaches both providers; unrelated rollout controls and pre-call rejection are preserved. No network calls made.");
