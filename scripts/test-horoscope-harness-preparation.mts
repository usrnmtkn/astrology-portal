import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {prepareHoroscopeWriting} from '../src/astro-writing/horoscopeWriting.mjs';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {approveArgumentOutline} from '../src/astro-writing/argumentGate.mjs';
import {emptyHoroscopeEdition} from '../apps/web/src/content/horoscopeEditions.mjs';
import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';

// Synthetic factual fixture: verifies routing and preparation, not ephemeris or prose.
const window={period:'seasonal',audience:'rising',timeZone:'America/New_York',seasonSign:'libra',startsAt:'2026-09-23T00:05:13.999Z',endsAt:'2026-10-23T09:37:56.999Z'};
const brief={schema:'horoscope-brief/v1',window,referenceDate:'2026-10-05',calculatedAt:'2026-10-05T16:00:00.000Z',
  coverage:'Synthetic positions and one aspect event for routing tests only.',
  positions:[{planet:'Sun',sign:'Libra',degree:12,motion:'direct'},
    {planet:'Moon',sign:'Cancer',degree:10,motion:'direct'},
    {planet:'Venus',sign:'Scorpio',degree:5,motion:'retrograde'}],
  events:[{id:'synthetic-aspect',type:'aspect',title:'Sun square Moon',planets:['Sun','Moon'],aspect:'square',fromSign:'Libra',toSign:'Cancer',startsAt:'2026-10-05T16:00:00.000Z'}],signs:[]};
const profile=defaultHoroscopeProfile('seasonal');
const writingProfile={id:'synthetic-profile',updatedAt:'2026-10-05T00:00:00Z',revision:1,profile,
  sha256:createHash('sha256').update(JSON.stringify(profile)).digest('hex')};
const row={sections:{horoscopeEdition:emptyHoroscopeEdition(window)},facts:{horoscopeBrief:{brief}},source_snapshot:{studioWritingProfile:writingProfile}};
const prepared=prepareHoroscopeWriting(row);
const entry=prepared.entries.find((e:any)=>e.sign==='libra');
const approved=approveArgumentOutline(entry.argumentOutline,{exactOwnerRuling:'Synthetic test approval, never reader-copy approval.'});
const request={family:'horoscope',surface:'horoscopes',register:'second_person',
  target:{surface:'horoscopes',route:'horoscopes',renderer:'HoroscopeReader',contentKeyFamily:'horoscope',temporality:'current_sky',voiceMode:'second_person'},
  meaningInput:entry.meaningInput,argumentInput:{...entry.argumentOutline,scope_breadth:{broad_mechanism:entry.argumentOutline.scopeBreadth.broadMechanism,chosen_expression:entry.argumentOutline.scopeBreadth.chosenExpression,other_valid_expressions:entry.argumentOutline.scopeBreadth.otherValidExpressions}},
  approvedArgumentOutline:approved,argumentSource:{contentKey:'synthetic/horoscope-plan',sourcePath:'test-fixture',ownerApproved:true,authority:'owner-approved-horoscope-plan',opening:approved.thesis,tension:approved.complication,development:approved.recognition,close:approved.response},
  writingProfile,engineFacts:{...brief,risingSign:'libra',developments:{untrustedStaleMarker:'MUST_NOT_REACH_WRITER'},seasonalMeaning:{untrustedStaleMarker:'MUST_NOT_REACH_WRITER'}},
  horoscopeSourceRows:[],task:'Prepare one synthetic Libra forecast; no provider call.'};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horoscope-harness-preparation-'));
const requestPath=path.join(dir,'request.json'),outPath=path.join(dir,'out.json');
function run(value:any,flags=['--prepare-only']) {
  fs.writeFileSync(requestPath,JSON.stringify(value));
  if(fs.existsSync(outPath))fs.unlinkSync(outPath);
  return spawnSync(process.execPath,['scripts/run-astro-writing-harness.mjs','--request',requestPath,'--out',outPath,...flags],{
    cwd:process.cwd(),encoding:'utf8',timeout:30000,
    // A directory cannot be read as a key file; preparation must never try.
    env:{...process.env,LOCAL_PROVIDER_KEYS_FILE:dir,OPENAI_API_KEY:'',GEMINI_API_KEY:''}
  });
}
try {
  let result=run(request);assert.equal(result.status,0,result.stderr);
  const output=JSON.parse(fs.readFileSync(outPath,'utf8'));
  assert.equal(output.status,'prepared-not-dispatched',JSON.stringify(output.failure));assert.equal(output.dispatched,false);assert.equal(output.draft,null);
  assert.deepEqual(output.report,{drafted:0,writerCalls:0,billedCalls:0,proseModelGateCalls:0});
  assert.equal(output.ownerApproved,false);assert.equal(output.promotionAuthorized,false);
  assert.equal(output.approvedArgumentOutline.approvedOutlineHash,approved.approvedOutlineHash);
  assertHoroscopeRequestEvidence(output.request.input);
  for(const source of entry.contextOptions.examples.filter((e:any)=>e.seasonalArgumentPrimary))assert(output.request.input.includes(JSON.stringify(source.text).slice(1,-1)),source.id);
  assert(!output.request.input.includes('MUST_NOT_REACH_WRITER'));
  assert.equal(fs.statSync(outPath).mode&0o777,0o600);
  result=run(request,[]);assert.notEqual(result.status,0);assert(result.stderr.includes('No billed call was made'));
  result=run(request,['--prepare-only','--authorize-live']);assert.notEqual(result.status,0);assert(result.stderr.includes('Choose preparation only'));
  result=run({...request,horoscopeSourceRows:undefined});assert.notEqual(result.status,0);assert(result.stderr.includes('Export the current shared seasonal source rows'));
  result=run({...request,approvedArgumentOutline:{...approved,thesis:'Changed after approval'}});assert.notEqual(result.status,0);assert(result.stderr.includes('ARGUMENT_OUTLINE_DRIFT'));
  result=run({...request,approvedArgumentOutline:undefined});assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(outPath,'utf8')).status,'argument-review-pending');
  console.log('PASS: horoscope harness preserves complete evidence, recomputes meaning, validates exact approval, and prepares without credentials or dispatch.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
