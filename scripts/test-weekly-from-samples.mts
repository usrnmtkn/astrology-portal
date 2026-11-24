import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {installHoroscopeWriterFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign} from '../src/astro-writing/horoscopeWriting.mjs';
import {usesWeeklyFromSamples,weeklyFromSamplesFacts,weeklyFromSamplesResearch,WEEKLY_FROM_SAMPLES_AUTHORITY} from '../src/astro-writing/weeklyFromSamples.mjs';
import {HOROSCOPE_ENDING_GUIDANCE} from '../src/astro-writing/horoscopeEndingGuidance.mjs';
import {PUBLIC_HOROSCOPE_EVIDENCE_BOUNDARY} from '../src/astro-writing/compactReferenceLearning.mjs';
import {HOROSCOPE_SOURCE_LED_COMPOSITION,HOROSCOPE_VOICE_REVIEW} from '../src/astro-writing/horoscopeVoiceStandard.mjs';
import {buildHoroscopeProviderRequest,horoscopeProviderRequestSnapshot} from '../api/_lib/horoscope-provider-codecs';
import {horoscopeWritingExport} from '../api/_lib/horoscope-writing-export';

installHoroscopeWriterFixture();
const source='Complete synthetic voice opening.\n\nComplete synthetic voice ending.';
const profile={...defaultHoroscopeProfile('weekly'),sourceGuidance:source,
 prompt:'WEEKLY PROMPT V3\n{{period}}\n{{voiceGuidance}}\n{{structure}}\n{{sourceGuidance}}\n{{ownerCorrections}}\nCALCULATED ASTROLOGY\n{{governedFacts}}'};
assert(usesWeeklyFromSamples(profile));
for(const period of ['daily','monthly','seasonal'])assert(!usesWeeklyFromSamples({...profile,period}));
assert(!usesWeeklyFromSamples({...profile,prompt:profile.prompt.replace('V3','V2')}));

const packet=await prepareHoroscopeBrief(new URL('http://localhost/?period=weekly&date=2026-11-09&timeZone=America/New_York'));
const calculated=structuredClone(packet);
const edition=emptyHoroscopeEdition(packet.brief.window);
const research={version:'weekly-meaning-research/v1',editionKey:'synthetic-weekly',bySign:{aries:{records:[{id:'synthetic-meaning',role:'meaning only',source:'synthetic attributed research'}],provenance:[]}}};
const row={id:'synthetic-weekly',content_key:'synthetic-weekly',sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition),
 facts:{horoscopeBrief:packet},source_snapshot:{studioWritingProfile:{id:'synthetic-profile',updatedAt:'2026-11-15T20:00:00Z',revision:1,
 sha256:createHash('sha256').update(JSON.stringify(profile)).digest('hex'),profile},horoscopeOutlines:{},weeklyMeaningResearch:research}};
const before=structuredClone(row);
const prepared=prepareHoroscopeWriting(row);
let captured:any;
class Intercepted extends Error{}
const client=Object.assign(async request=>{captured=request;throw new Intercepted();},{provider:'openai',model:'synthetic',billed:false});
await assert.rejects(()=>writeHoroscopeSign(prepared,'aries',{approvedPlanHash:prepared.planHash,approvalReference:'thread:synthetic-owner-requested-test',writerClient:client}),Intercepted);
assert.deepEqual(row,before,'Preparation and intercepted drafting do not modify saved source rows.');
assert.equal(captured.instructions,WEEKLY_FROM_SAMPLES_AUTHORITY);
assert.equal(captured.instructions.split(HOROSCOPE_SOURCE_LED_COMPOSITION).length-1,1);
assert.equal(captured.reviewEvidence.voiceReviewContract,HOROSCOPE_VOICE_REVIEW);
assert.equal(captured.instructions.split(HOROSCOPE_ENDING_GUIDANCE).length-1,1,'The V3 route receives the same current ending rule as the other horoscope writers');
assert.equal(captured.instructions.split(PUBLIC_HOROSCOPE_EVIDENCE_BOUNDARY).length-1,1,'The V3 writer receives the existing evidence boundary before composing; conditional wording cannot establish conduct.');
assert(captured.input.includes(source),'Complete source text reaches the writer.');
assert(!captured.input.includes('OWNER-APPROVED WRITING PLAN'));
assert(!captured.input.includes('NEUTRAL HELLENISTIC MEANING SUPPORT'));
assert(!captured.input.includes('OWNER-APPROVED STYLE REFERENCE'));
assert(!captured.instructions.includes('never invent motives'));
const delivered=JSON.parse(captured.input.split('CALCULATED ASTROLOGY\n')[1].split('\n\n')[0]);
assert.equal(delivered.attributedMeaningResearch.records[0].id,'synthetic-meaning');
assert.equal(delivered.facts.signs.length,1);
assert.equal(delivered.facts.signs[0].sign,'aries');
assert(!delivered.facts.meaningResearchBySign,'Research is not labeled calculated fact.');
assert(!delivered.developments.events.some(event=>event.planet==='moon'&&event.type==='ingress'));
assert.equal(delivered.developments.events.filter(event=>event.type==='station').length,2);
assert(delivered.developments.events.every(event=>!event.meaning),'Source prose is not mixed into the calculated event packet.');
assert.equal(delivered.developments.events.find(event=>event.type==='lunation').house,8);
const venusMars=delivered.developments.events.find(event=>event.title==='Venus sextile Mars');
assert(venusMars);
assert.deepEqual(delivered.facts.positions,calculated.brief.positions,'The complete original positions stay exact.');
const other=weeklyFromSamplesFacts({...captured.reviewEvidence.engineFacts,risingSign:'taurus'});
assert.equal(other.attributedMeaningResearch,null,'Aries research is not applied to Taurus.');
assert(other.meaningReferences.length,'Other signs retain their governed native meanings.');
assert.deepEqual(row.facts.horoscopeBrief,calculated,'Meaning metadata never changes calculated facts.');
assert.throws(()=>weeklyFromSamplesResearch({...row,content_key:'another-edition'}),/does not match/);
const changed=structuredClone(row);changed.source_snapshot.weeklyMeaningResearch.bySign.aries.records.push({id:'additional-meaning'});
assert.notEqual(prepareHoroscopeWriting(changed).planHash,prepared.planHash,'Changed research invalidates a previously prepared plan.');
const exported=horoscopeWritingExport(prepared,row);
assert(JSON.stringify(exported).includes('synthetic-meaning'),'Unsigned export retains the same edition-specific meaning as generation.');
for(const provider of ['openai','anthropic','gemini']){
 const config={provider,model:'synthetic',maxOutputTokens:12000,reasoningEffort:'medium',thinkingLevel:'medium'};
 const request=buildHoroscopeProviderRequest({...captured,config});
 const snapshot=horoscopeProviderRequestSnapshot({config,role:captured.role,request,instructions:captured.instructions});
 const actual=provider==='openai'?snapshot.instructions:provider==='anthropic'?snapshot.system:snapshot.system_instruction;
 assert.equal(actual,WEEKLY_FROM_SAMPLES_AUTHORITY,`${provider} keeps exactly one governed instruction layer.`);
}
console.log('Weekly from-samples request: complete evidence, scoped meaning, calculated event roles, unchanged source rows and all three provider codecs passed; zero paid calls.');
