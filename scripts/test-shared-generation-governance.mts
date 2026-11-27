import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sharedGenerationOwnerExamples } from '../api/_lib/shared-generation-owner-examples.js';
import { generateWithOpenAI, validateGeneratedContentQuality, sharedGenerationReviewSignals, evaluateEditorialCoherence, type GenerateContentInput } from '../api/_lib/content-generation.js';
import dailySkyHandler from '../api/cron/generate-sky.js';
import {withWritingRunStore} from '../src/astro-writing/writingRunArchive.cjs';
import {writingRunArchiveFixture} from '../tests/helpers/writing-run-archive.mjs';

const input: GenerateContentInput = { contentKey: 'fixture/mercury', surface: 'sky', eventType: 'current-aspect', mode: 'feed', facts: {} };
const copy = { headline: 'Synthetic fixture', summary: 'The form contains the date, time, place, and time zone.', body: 'The fixture can perform a second check—without changing the saved fields.', sections: [] };
assert.doesNotThrow(() => validateGeneratedContentQuality(copy, input), 'Lexical and list signals must reach contextual review rather than cause an automatic rejection.');
assert.ok(sharedGenerationReviewSignals(copy, input).some(signal => signal.includes('perform')));
assert.ok(sharedGenerationReviewSignals(copy, input).some(signal => signal.includes('em dash')));
assert.equal(evaluateEditorialCoherence(copy, input).passed, true, 'Advisory findings cannot accumulate into a failing score.');
const sceneReview = evaluateEditorialCoherence({ ...copy, summary: 'Synthetic.', body: 'Fixture.' }, { ...input, facts: { timeLord: 'Mars' } });
assert.equal(sceneReview.failures.find(failure => failure.code === 'TIME_LORD_NOT_USED_AS_SCENE_FILTER')?.severity, 'warning');
assert.equal(sceneReview.passed, true, 'An ordinary-scene preference is not evidence of a false astrology claim.');
assert.throws(() => validateGeneratedContentQuality({ ...copy, body: '' }, input), /body is missing/);
assert.throws(() => validateGeneratedContentQuality({ ...copy, body: 'This entry is currently in review.' }, input), /disallowed phrase/);
const natal: GenerateContentInput = { ...input, surface: 'natal', eventType: 'natal-aspect', facts: { type: 'natal-aspect' } };
assert.throws(() => validateGeneratedContentQuality({ ...copy, body: 'Today this transit changes the fixture.' }, natal), /transit\/current-weather/);

const longText = `Mercury fixture opening.\n\n${'Full synthetic evidence sentence. '.repeat(70)}\n\nFinal evidence sentence.`;
const entry = (sourceId: string, text: string, overrides = {}) => ({ sourceId, sourcePath: `fixture/${sourceId}.md`, sourceSha256: 'a'.repeat(64), surface: 'sky-article-longform', structuralFunction: 'article paragraph', text, authorityClass: 'owner_authored_final', ownerAuthored: true, ownerApproved: true, useAsPositiveVoiceEvidence: true, ...overrides });
const entries = [entry('one', longText), entry('two', 'Second whole fixture paragraph.'), entry('three', 'Third whole fixture paragraph.'),
  entry('serving', 'Mercury approved serving text.', { authorityClass: 'serving_approved', ownerAuthored: false }),
  entry('meaning', 'Mercury semantic matrix text.', { authorityClass: 'exact_owner_approved', ownerAuthored: false }),
  entry('rejected', 'Mercury rejected owner text.', { useAsNegativeEvidence: true }), entry('duplicate', longText)];
const selected = sharedGenerationOwnerExamples({ entries }, input);
assert.equal(selected.length, 3);
assert.ok(!selected.some(row => ['serving', 'meaning', 'rejected'].includes(row.contentKey)));
const complete = selected.find(row => row.body === longText)!;
assert.ok(complete, 'The full multi-paragraph passage must survive beyond 1400 characters.');
assert.equal(complete.evidence.textSha256, createHash('sha256').update(longText).digest('hex'));
assert.equal(complete.evidence.sourceSha256, 'a'.repeat(64));
assert.equal(complete.evidence.wordCount, longText.trim().split(/\s+/u).length);
assert.throws(() => sharedGenerationOwnerExamples({ entries: entries.slice(0, 2) }, input), /BELOW_FLOOR/);

const ingressInput = { ...input, eventType: 'sky-article-template-slots', contentKey: 'sky/article-template/mercury/virgo',
  facts: { articleFormat: 'ingress-essay-v2', planet: 'mercury', sign: 'virgo' } };
const ingressEntries = [
  entry('ingress-direct', 'You notice the Mercury in Virgo fixture.'),
  entry('ingress-collective', 'Mercury in Virgo describes this collective fixture.'),
  entry('ingress-direct-2', 'Your second Mercury in Virgo fixture has a complete ending.'),
  entry('unrelated', 'An unrelated Jupiter Neptune Saturn fixture.'),
  entry('unrelated-2', 'Another Jupiter Neptune Saturn fixture.')
].map(row => ({ ...row, surface: 'sky-season', structuralFunction: 'article paragraph',
  sourcePath: 'synthetic/libra-season-autumn-equinox.md' }));
const ingressSelected = sharedGenerationOwnerExamples({ entries: ingressEntries }, ingressInput);
assert.equal(ingressSelected.length, ingressEntries.length,
  'The designated complete article is retained instead of being cut to a four-passage ceiling.');
assert.throws(() => sharedGenerationOwnerExamples({ entries }, ingressInput), /no provider call/,
  'Missing designated author-article evidence stops dated writing before a paid call.');
assert(ingressSelected.some(row => row.contentKey === 'ingress-direct'), 'Ingress essays admit the owner’s direct reader address.');
assert(ingressSelected.some(row => row.contentKey === 'ingress-collective'), 'Collective observations remain eligible.');
assert.deepEqual(sharedGenerationOwnerExamples({ entries: ingressEntries }, { ...ingressInput,
  facts: { ...ingressInput.facts, requestedSlots: 'Jupiter Neptune Saturn', internalMetadata: 'Jupiter Neptune Saturn' },
  voiceNotes: 'Jupiter Neptune Saturn' } as typeof ingressInput), ingressSelected,
  'Unrelated instructions and metadata must not displace topic-matched complete ingress passages.');
assert.equal(ingressSelected.find(row => row.contentKey === 'ingress-direct')!.body, ingressEntries[0].text);

// Verify every shared-writer family against the actual packaged owner index,
// without printing passages or making a provider call.
const index = JSON.parse(readFileSync('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json', 'utf8'));
assert.throws(() => sharedGenerationOwnerExamples(index, { ...input, surface: 'you', eventType: 'transit-aspect' }), /PERSONAL_TRANSIT_WRITER_CONTEXT_REQUIRED/);
for (const [surface, eventType] of [['sky','placement'],['sky','lunation'],['sky','season'],['you','daily'],['natal','placement'],['natal','aspect'],['synastry','aspect'],['composite','placement'],['friends','bond-effect']] as const) {
  const result = sharedGenerationOwnerExamples(index, { ...input, surface, eventType });
  assert.ok(result.length >= 3, `${surface}/${eventType} must have complete eligible evidence.`);
  for (const row of result) {
    const source = index.entries.find((source: any) => source.sourceId === row.contentKey);
    assert.equal(row.body, source.text);
    assert.equal(row.evidence.sourcePath, source.sourcePath);
    assert.equal(row.evidence.sourceSha256, source.sourceSha256);
    assert.equal(source.ownerAuthored, true);
    assert.notEqual(source.useAsNegativeEvidence, true);
  }
}
console.log('PASS shared writer: advisory signals, retained fact/field boundaries, complete authored evidence, source hashes, register families and fail-closed evidence floor. No provider calls.');

const originalFetch = globalThis.fetch;
const environment = {...process.env};
const dailyDraft = {
  headline:'Synthetic daily sky', tldr:'An updated plan can change which detail needs attention.',
  summary:'An updated plan can change which detail needs attention.',
  body:'A conversation can return to a detail that seemed settled. The new information changes what can be agreed today, without settling the whole question.',
  action:'', timing:'Today.', sections:[],
  sceneLock:{sceneType:'conversation',sceneArena:'A possible conversation',currentPressure:'A revised plan',
    personalSensitivity:'An unresolved detail',chosenScene:'A possible exchange, not a known event.',excludedMeanings:['Personal houses and biography']},
  astrologyDrilldown:{title:'Why this?',summary:'Only the supplied daily facts support this fixture.',
    factors:[{label:'Sun',technicalFact:'Sun in Leo.',plainMeaning:'A supplied Sun position.'},
      {label:'Moon',technicalFact:'Moon in Aquarius.',plainMeaning:'A supplied Moon position.'}],
    whyThisScene:'A possible interpretation of the supplied sky, not a known personal event.',timingNote:''}
};
try {
  Object.assign(process.env,{NODE_ENV:'test',CRON_SECRET:'synthetic-daily-secret',ANTHROPIC_API_KEY:'synthetic',OPENAI_API_KEY:'synthetic',
    CONTENT_GENERATION_PROVIDER:'claude',SUPABASE_URL:'https://daily-writing.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic',
    TLDRASTRO_API_URL:'https://daily-facts.invalid',STUDIO_MEMORY_FEEDBACK_ENABLED:'true',
    WRITING_KERNEL_GOVERNED_SURFACES:'',WRITING_KERNEL_SKY_GLOBAL_ENABLE:'0',WRITING_KERNEL_SKY_CANARY_PERCENT:'0'});
  let candidate=dailyDraft, providerCalls=0, saves:any[]=[], existing=false, rejectStorage=false, rejectProvider=false;
  const checkDailyPrompt=(prompt:string)=>{
    assert.ok(/DAILY SKY WRITING CONTRACT/.test(prompt),'The actual provider request must use the Daily Sky contract.');
    assert.ok(/collective/.test(prompt),'The prompt must declare the validated register.');
    assert.ok(/Do not address the reader as you/.test(prompt),'The request must state the exact register boundary.');
    assert.ok(/technical astrology.*astrologyDrilldown/.test(prompt),'The request must keep technical explanation in its separate field.');
    assert.ok(!/- Second person\. Plain language|1\) What you may notice|ASTROLOGY SOURCE MATERIAL\nUse this repo-safe astrology material as the primary interpretive source layer for natal/.test(prompt),'The Daily Sky request must exclude the conflicting generic and natal instructions.');
  };
  const invoke = async (authorized=true) => {
    const result={statusCode:0,body:''};
    await dailySkyHandler({method:'GET',headers:authorized?{authorization:'Bearer synthetic-daily-secret'}:{}} as any,{
      setHeader(){},end(body:string){result.body=body;},
      get statusCode(){return result.statusCode;},set statusCode(value:number){result.statusCode=value;}
    } as any);
    return {...result,payload:JSON.parse(result.body)};
  };
  await withWritingRunStore(writingRunArchiveFixture().store,async()=>{
    globalThis.fetch=async(url,options={})=>{
      const target=new URL(String(url));
      if(target.origin==='https://daily-facts.invalid'&&target.pathname==='/sky/current')return Response.json({
        positions:[{planet:'Sun',longitude:132,sign:'Leo',house:5},{planet:'Moon',longitude:312,sign:'Aquarius',house:11}],moonPhase:'Full Moon'
      });
      if(target.origin==='https://daily-writing.invalid') {
        if(target.pathname==='/rest/v1/rpc/studio_memory_active_snapshot')return Response.json([{snapshot:{writingFeedback:[]}}]);
        if(target.pathname==='/rest/v1/generated_interpretations') {
          if(options.method==='POST') {
            const row=JSON.parse(String(options.body));saves.push(row);
            return rejectStorage?Response.json({},{status:503}):Response.json([{id:'00000000-0000-4000-8000-000000000001',...row}]);
          }
          return Response.json(existing?[{id:'00000000-0000-4000-8000-000000000001'}]:[]);
        }
      }
      if(String(url)==='https://api.openai.com/v1/responses') {
        const request=JSON.parse(String(options.body));
        if(request.text?.format?.name==='tldr_astro_meaning_plan')return Response.json({output_text:JSON.stringify({
          core_tension:'A synthetic shared condition.',what_changes:'',constructive_expression:'',overcorrection:'',observable_behaviors:[],possible_consequences:[]
        })});
        checkDailyPrompt(request.input);
        return Response.json({error:{message:'synthetic daily writer boundary stop'}},{status:422});
      }
      assert.equal(String(url),'https://api.anthropic.com/v1/messages','Unexpected network call is forbidden.');
      providerCalls++;
      const request=JSON.parse(String(options.body)),prompt=request.messages[0].content[0].text;
      checkDailyPrompt(prompt);
      assert.equal(request.max_tokens,5000,'The existing provider output limit is unchanged.');
      if(rejectProvider)return Response.json({error:{message:'synthetic provider rejection'}},{status:400});
      return Response.json({id:'msg_daily_fixture',content:[{type:'tool_use',name:'tldr_astro_generated_content',input:candidate}]});
    };
    let result=await invoke(false);
    assert.equal(result.statusCode,401);assert.equal(providerCalls,0);assert.equal(saves.length,0);
    result=await invoke();
    assert.equal(result.statusCode,200,result.payload.error);assert.equal(providerCalls,1);assert.equal(saves.length,1);
    assert.equal(saves[0].status,'DRAFT');assert.equal(saves[0].body,dailyDraft.body);
    assert.equal(saves[0].sections.ownerApproved,false);assert.equal(saves[0].sections.ownerLocked,false);
    assert.equal(saves[0].facts.sun.house,undefined);assert.equal(saves[0].facts.moon.house,undefined);
    for(const [body,error] of [['You can reopen the plan today.','register_consistency'],['A transit changes the plan today.','daily_engine_hidden']]) {
      candidate={...dailyDraft,body};providerCalls=0;saves=[];
      result=await invoke();
      assert.equal(result.statusCode,500);assert.match(result.payload.error,new RegExp(error));
      assert.equal(providerCalls,2,'The existing bounded validation retry is preserved.');assert.equal(saves.length,0);
    }
    candidate=dailyDraft;providerCalls=0;saves=[];rejectStorage=true;
    result=await invoke();
    assert.equal(result.statusCode,500);assert.match(result.payload.error,/Content storage rejected the save/);
    assert.equal(providerCalls,1,'A save failure must not cause another writer call.');
    rejectStorage=false;existing=true;providerCalls=0;saves=[];
    result=await invoke();
    assert.equal(result.statusCode,200);assert.equal(result.payload.skipped,true);
    assert.equal(providerCalls,0);assert.equal(saves.length,0);
    existing=false;rejectProvider=true;
    result=await invoke();
    assert.equal(result.statusCode,500);assert.match(result.payload.error,/synthetic provider rejection/);
    assert.equal(providerCalls,1,'A provider rejection must not be retried.');assert.equal(saves.length,0);
    await assert.rejects(generateWithOpenAI({contentKey:'sky-daily-2026-11-27',surface:'sky',mode:'feed',eventType:'daily-sky',
      facts:{sun:{planet:'Sun',sign:'Leo'},moon:{planet:'Moon',sign:'Aquarius'}}}),/synthetic daily writer boundary stop/);
  });
} finally {
  globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!(key in environment))delete process.env[key];
  Object.assign(process.env,environment);
}
console.log('PASS Daily Sky actual cron: scoped provider prompt, validated DRAFT save, rejected invalid copy, failed save and create-only protection. All network intercepted.');
