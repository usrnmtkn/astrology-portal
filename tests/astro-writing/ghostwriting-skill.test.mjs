import assert from 'node:assert/strict';
import test from 'node:test';
import { GHOSTWRITING_SKILL_INSTRUCTIONS, withGhostwritingSkill } from '../../src/astro-writing/ghostwritingSkill.mjs';
import { callOpenAIResponses, governedInstructionsForRole, instructionsForRole,
  startStoredNativeWritingResponse } from '../../src/astro-writing/openAIResponses.cjs';
import { reviseDraft } from '../../src/astro-writing/reviseDraft.mjs';

test('new prose requests receive Ghostwriter once and preserve the canonical prefix', async () => {
  for (const [surface, family] of [['sky','sky-placement'], ['sky','sky-ingress-essay'], ['horoscopes','horoscope'],
    ['calendar-daily','calendar-daily'], ['calendar-lunation','lunations'], ['lunation-article','lunation-article']]) {
    let sent;
    await callOpenAIResponses({ apiKey:'synthetic', role:'WRITER', surface, family,
      request:{model:'synthetic',input:'Synthetic source material.'},
      fetchImpl:async (_url, init) => { sent=JSON.parse(init.body); return Response.json({id:'resp_fixture'}); } });
    assert(sent.instructions.startsWith(instructionsForRole('WRITER','',{surface,family})));
    assert.equal(sent.instructions.split(GHOSTWRITING_SKILL_INSTRUCTIONS).length-1,1);
    assert.equal(withGhostwritingSkill(sent.instructions),sent.instructions);
    assert.equal(sent.input,'Synthetic source material.');
  }
  for (const role of ['REVISER','CARD_WRITER_V3','CARD_REVISER_V3']) {
    assert(governedInstructionsForRole(role).includes(GHOSTWRITING_SKILL_INSTRUCTIONS));
  }
});

test('planning and review roles do not become ghostwriters', () => {
  for (const role of ['MEANING_PLANNER','REVIEWER','RHETORICAL_REVIEWER','COLD_REVIEWER','CARD_REVIEWER_V3']) {
    assert(!governedInstructionsForRole(role).includes(GHOSTWRITING_SKILL_INSTRUCTIONS),role);
  }
  assert(!governedInstructionsForRole('SEASONAL_PLANNER',{
    surface:'horoscopes',family:'horoscope'
  }).includes(GHOSTWRITING_SKILL_INSTRUCTIONS));
});

test('saved requests retain their exact instructions across OpenAI and native transports', async () => {
  const context={surface:'horoscopes',family:'horoscope'};
  const frozen=instructionsForRole('WRITER','',context)+'\n\nPreviously approved synthetic instructions.';
  let sent;
  await callOpenAIResponses({ apiKey:'synthetic', role:'WRITER', ...context,
    governedInstructions:frozen, request:{model:'synthetic',input:'Saved input.'},
    fetchImpl:async (_url,init) => { sent=JSON.parse(init.body); return Response.json({id:'resp_saved'}); } });
  assert.equal(sent.instructions,frozen);
  for (const provider of ['gemini','anthropic']) {
    for (const instructions of [frozen,governedInstructionsForRole('WRITER',context)]) {
      const request=provider==='gemini'
        ? {model:'synthetic',system_instruction:instructions,input:'Saved input.',store:true,background:true}
        : {model:'synthetic',system:instructions,messages:[{role:'user',content:'Saved input.'}],stream:true};
      let calls=0;
      await startStoredNativeWritingResponse({ provider,apiKey:'synthetic',role:'WRITER',...context,
        governedInstructions:instructions,request,
        fetchImpl:async (_url,init) => { calls++; assert.deepEqual(JSON.parse(init.body),request); return Response.json({}); } });
      assert.equal(calls,1);
    }
  }
});

test('the injected reviser receives the skill while retaining surgical revision boundaries', async () => {
  let calls=0;
  const result=await reviseDraft({ draft:{body:'Synthetic failed body.',headline:'Protected headline.'},
    review:{decision:'REVISE',violations:[{severity:'blocking',location:'body',category:'grammar'}]},
    plan:{},family:'natal',surface:'natal-placement',
    modelClient:async request => {
      calls++;
      assert(request.instructions.includes(GHOSTWRITING_SKILL_INSTRUCTIONS));
      assert.deepEqual(Object.keys(request.schema.properties),['body']);
      return {body:'Synthetic corrected body.'};
    } });
  assert.equal(calls,1);
  assert.equal(result.headline,'Protected headline.');
  assert.equal(result.body,'Synthetic corrected body.');
  assert.equal(result.ownerApproved,false);
});
