import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dailyHoroscopeEvidence,dailyHoroscopeWriterEvidence,dailyWriterValidationSources,renderDailyHoroscopeSources} from '../../src/astro-writing/dailyHoroscopeEvidence.mjs';

test('Daily source references preserve complete bytes, every identity and each role without mutating retrieval',()=>{
  const text='  Complete synthetic opening.\n\nThe full ending includes café and 🌙.\n';
  const hash=createHash('sha256').update(text).digest('hex');
  const primary={id:'owner-a',text,sourcePath:'fixture:owner',sourceRecordSha256:hash,ownerAuthored:true,ownerApproved:true};
  const alias={...primary,id:'owner-b',evidenceRole:'supporting',provenance:{version:2}};
  const meaning={id:'meaning-a',text,role:'meaning',ownerAuthored:false,ownerApproved:false,sourceKind:'meaning-only'};
  const scene={id:'scene-a',text:'A different complete synthetic scene.',role:'scene',house:4};
  const context={primaryRegisterPassages:[primary],sameFamilyExamples:[primary,alias],relevantOwnerPassages:[alias],
    registerGoldExamples:[],phraseExamples:[],corrections:[{id:'correction',reason:'Keep the source intact.'}],
    sharedEvidencePacket:{entries:[meaning,scene],roles:{meaning:[meaning],scene:[scene]},supportingArgumentCandidates:[{...scene,id:'candidate',role:'argument'}]}};
  const before=structuredClone(context),projected=dailyHoroscopeEvidence(context);
  assert.deepEqual(context,before);
  assert.equal(projected.completeSourcePassages.length,2);
  const sources=new Map(projected.completeSourcePassages.map(p=>[p.id,p]));
  const restore=value=>{
    if(Array.isArray(value))return value.map(restore);
    if(!value||typeof value!=='object')return value;
    const {completePassageRef,...metadata}=value;
    return {...Object.fromEntries(Object.entries(metadata).map(([key,child])=>[key,restore(child)])),
      ...(completePassageRef?{text:sources.get(completePassageRef).text}:{})};
  };
  const {completeSourcePassages,...transport}=projected;
  assert.deepEqual(restore(transport),before,'All source bytes, roles, authority restrictions, provenance and hashes round-trip');
  assert.equal(sources.get(projected.primaryRegisterPassages[0].completePassageRef).text,text);
  assert.equal(projected.sameFamilyExamples[1].id,'owner-b','An identical passage never loses its second source identity');
  assert.equal(projected.sharedEvidencePacket.roles.meaning[0].ownerAuthored,false,'Sharing text never upgrades meaning into owner voice');
  for(const p of completeSourcePassages)assert.equal(createHash('sha256').update(p.text).digest('hex'),p.sha256);
});

test('Daily shares exact text only; a changed ending remains a separate complete passage',()=>{
  const entries=[{id:'same-id',text:'Complete opening.\n\nFirst full ending.'},{id:'same-id',text:'Complete opening.\n\nSecond full ending.'}];
  const context={primaryRegisterPassages:entries,sameFamilyExamples:entries,relevantOwnerPassages:[],registerGoldExamples:[],phraseExamples:[],
    sharedEvidencePacket:{entries:[],roles:{},supportingArgumentCandidates:[]}};
  const projected=dailyHoroscopeEvidence(context);
  assert.equal(projected.completeSourcePassages.length,2);
  assert.notEqual(projected.primaryRegisterPassages[0].completePassageRef,projected.primaryRegisterPassages[1].completePassageRef);
});

test('Daily source bodies reach the writer with exact original paragraphs, without escaped JSON prose',()=>{
  const text='  Complete source opening with café.\r\n\r\nA complete ending with 🌙.\n';
  const sha256=createHash('sha256').update(text).digest('hex'),id=`daily-source:${sha256}`;
  const source={id,sha256,text},before=structuredClone(source),input=renderDailyHoroscopeSources([source]);
  assert(input.includes(`BEGIN COMPLETE DAILY SOURCE ${id}\n${text}\nEND COMPLETE DAILY SOURCE ${id}`));
  assert(!input.includes(JSON.stringify(text)),'Body paragraphs are prose, not an escaped JSON property');
  assert.deepEqual(source,before);
  assert.throws(()=>renderDailyHoroscopeSources([{...source,text:text+'Changed.'}]),/integrity/);
});

test('Daily does not send the legacy natal scenes or isolated advice as a second writing brief',()=>{
  const forecast={id:'forecast',role:'register',text:'Complete owner forecast opening.\n\nComplete owner forecast ending.',sourcePath:'fixture:forecast',ownerAuthored:true};
  const meaning={id:'meaning',role:'meaning',text:'Complete governed temporary meaning.',ownerAuthored:false};
  const natal={id:'authored/compat-deep/moon/gemini/pisces',role:'scene',text:'Complete synthetic natal compatibility opening.\n\nComplete synthetic natal ending.'};
  const phrase={id:'old-advice',role:'phrase',text:'Complete synthetic isolated advice.'};
  const argument={id:'argument',role:'argument',sourceKind:'current-approved-argument-and-close',text:'Synthetic generated recognition and advice.'};
  const context={primaryRegisterPassages:[forecast],sameFamilyExamples:[forecast],relevantOwnerPassages:[],registerGoldExamples:[],phraseExamples:[phrase],
    sharedEvidencePacket:{entries:[meaning,forecast,natal,phrase,argument],roles:{meaning:[meaning],register:[forecast],scene:[natal],argument:[argument],phrase:[phrase]},
      counts:{meaning:1,register:1,scene:1,argument:1,phrase:1},supportingArgumentCandidates:[natal]}};
  const before=structuredClone(context),writer=dailyHoroscopeWriterEvidence(context);
  assert.deepEqual(writer.completeSourcePassages.map(p=>p.text).sort(),[forecast.text,meaning.text].sort());
  assert.deepEqual(writer.sharedEvidencePacket.roles.scene,[]);
  assert.deepEqual(writer.sharedEvidencePacket.roles.phrase,[]);
  assert.equal(writer.sharedEvidencePacket.counts.scene,0);
  assert.equal(writer.sharedEvidencePacket.counts.phrase,0);
  assert.deepEqual(writer.sharedEvidencePacket.supportingArgumentCandidates,[]);
  assert.equal(writer.sharedEvidencePacket.roles.argument[0].eligibleForWriterRegister,false);
  assert(!writer.sharedEvidencePacket.roles.argument[0].text);
  assert.deepEqual(context,before,'The full legacy catalogue remains in internal provenance, without altered source text');
  const changed=structuredClone(context);changed.phraseExamples[0].text='Another unrelated advice line.';changed.sharedEvidencePacket.roles.scene[0].text='Another unrelated natal story.';
  assert.deepEqual(dailyHoroscopeWriterEvidence(changed),writer,'Changing excluded catalogue prose cannot change the Daily writing brief');
});

test('Daily automatic voice selection keeps one whole weekly unit per article without changing meaning roles or the archive',()=>{
  const make=(id,article)=>({id,text:`Complete ${id} opening.\n\nComplete ${id} ending.`,family:'weekly-astrology',structuralFunction:'complete weekly sign reading',sourceArticleSha256:article,ownerApproved:true,role:'register'});
  const first=make('first','article-a'),duplicate=make('duplicate','article-a'),different=make('different','article-b');
  const unknown={...make('unknown',null),sourcePath:'shared-collection'},otherUnknown={...make('another-unknown',null),sourcePath:'shared-collection'};
  const alias={...duplicate,id:'alias'},meaning={...duplicate,id:'licensed-meaning',role:'meaning',ownerAuthored:false};
  const context={primaryRegisterPassages:[first,duplicate,different],sameFamilyExamples:[first,duplicate,different,unknown,otherUnknown],relevantOwnerPassages:[alias],registerGoldExamples:[],phraseExamples:[],
    sharedEvidencePacket:{entries:[first,alias,meaning],roles:{register:[first,alias],meaning:[meaning]},counts:{register:2,meaning:1},supportingArgumentCandidates:[]}};
  const before=structuredClone(context),writer=dailyHoroscopeWriterEvidence(context);
  assert.deepEqual(writer.primaryRegisterPassages.map(p=>p.id),['first','different']);
  assert.deepEqual(writer.sameFamilyExamples.map(p=>p.id),['first','different','unknown','another-unknown']);
  assert.deepEqual(writer.relevantOwnerPassages,[]);
  assert.deepEqual(writer.sharedEvidencePacket.roles.register.map(p=>p.id),['first']);
  assert.equal(writer.sharedEvidencePacket.counts.register,1);
  assert.equal(writer.sharedEvidencePacket.roles.meaning[0].id,'licensed-meaning');
  const definition=writer.completeSourcePassages.find(p=>p.id===writer.sharedEvidencePacket.roles.meaning[0].completePassageRef);
  assert.equal(definition.text,meaning.text,'A separate licensed meaning role cannot be silently removed by matching voice text');
  assert.equal(writer.writerSourceSelection.omitted[0].sha256,createHash('sha256').update(duplicate.text).digest('hex'));
  assert.deepEqual(context,before);
  assert.equal(dailyHoroscopeWriterEvidence(context,{diversifyWeekly:false}).primaryRegisterPassages.length,3,'Legacy Weekly transport is period-isolated');
});

test('Daily leaves automatic historical article excerpts in the audit, preserving explicit examples and independent meaning',()=>{
  const forecast={id:'forecast',text:'Complete synthetic forecast opening.\n\nComplete forecast ending.',structuralFunction:'complete weekly sign reading',family:'weekly-astrology'};
  const excerpt={id:'old-article',text:'An entire historical article paragraph.\n\nIts complete original ending stays intact.',structuralFunction:'article paragraph',family:'sky-article-longform'};
  const alias={...excerpt,id:'old-article-alias',role:'register'};
  const meaning={...excerpt,id:'independent-meaning',role:'meaning',ownerAuthored:false};
  const context={primaryRegisterPassages:[forecast],sameFamilyExamples:[forecast,excerpt],relevantOwnerPassages:[excerpt],registerGoldExamples:[],phraseExamples:[],
    sharedEvidencePacket:{entries:[alias,meaning],roles:{register:[alias],meaning:[meaning]},counts:{register:1,meaning:1},supportingArgumentCandidates:[]}};
  const before=structuredClone(context),daily=dailyHoroscopeWriterEvidence(context);
  assert.deepEqual(daily.sameFamilyExamples.map(p=>p.id),['forecast']);
  assert.deepEqual(daily.relevantOwnerPassages,[]);assert.deepEqual(daily.sharedEvidencePacket.roles.register,[]);
  assert.equal(daily.sharedEvidencePacket.roles.meaning[0].id,'independent-meaning');
  assert(daily.completeSourcePassages.some(p=>p.text===meaning.text),'An independent licensed meaning role keeps its complete text');
  assert.equal(daily.writerSourceSelection.omitted[0].selectionKind,'historical-article-fragment');
  assert.equal(daily.writerSourceSelection.omitted[0].sha256,createHash('sha256').update(excerpt.text).digest('hex'));
  assert.deepEqual(context,before,'The source, full text and source role remain available in retrieval');
  assert.equal(dailyHoroscopeWriterEvidence(context,{diversifyWeekly:false}).sameFamilyExamples.length,2,'No Weekly source change');
});

test('complete designated Daily examples replace automatic topical voice while meaning and the original audit stay intact',()=>{
  const text='Complete current designated opening.\n\nComplete current designated ending with its exact words.';
  const sha256=createHash('sha256').update(text).digest('hex');
  const writingProfile={profile:{period:'daily',sourceGuidance:`ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS\nComplete prose SHA-256: ${sha256}\nBEGIN COMPLETE PROSE current\n${text}\nEND COMPLETE PROSE current\n`}};
  const old={id:'old',role:'register',text:'Complete historical money opening.\n\nComplete historical advice ending.'};
  const meaning={id:'meaning',role:'meaning',text:'Complete independent governed interpretation.'};
  const context={primaryRegisterPassages:[old],sameFamilyExamples:[old],relevantOwnerPassages:[old],registerGoldExamples:[old],phraseExamples:[],
    sharedEvidencePacket:{entries:[old,meaning],roles:{register:[old],meaning:[meaning]},counts:{register:1,meaning:1},supportingArgumentCandidates:[]}};
  const before=structuredClone(context),writer=dailyHoroscopeWriterEvidence(context,{writingProfile});
  for(const field of ['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples'])assert.deepEqual(writer[field],[]);
  assert.deepEqual(writer.sharedEvidencePacket.roles.register,[]);
  assert.deepEqual(writer.completeSourcePassages.map(p=>p.text),[meaning.text]);
  assert.equal(writer.writerSourceSelection.designatedExamples[0].sha256,sha256);
  assert.deepEqual(dailyWriterValidationSources(context,writingProfile).map(p=>p.text).sort(),[meaning.text,text].sort(),'Existing source-copy checks protect the exact designated source too');
  assert.deepEqual(context,before);
  assert(dailyHoroscopeWriterEvidence(context).completeSourcePassages.some(p=>p.text===old.text),'A guide without complete designated units keeps its existing fallback');
  const alias={...old,id:'independent-licensed-meaning',role:'meaning'};
  const mixed=structuredClone(context);mixed.sharedEvidencePacket.entries.push(alias);mixed.sharedEvidencePacket.roles.meaning.push(alias);
  assert(dailyHoroscopeWriterEvidence(mixed,{writingProfile}).completeSourcePassages.some(p=>p.text===alias.text),'An independent meaning role cannot be deleted by a voice exclusion');
  const broken={profile:{...writingProfile.profile,sourceGuidance:writingProfile.profile.sourceGuidance.replace(sha256,'0'.repeat(64))}};
  assert.throws(()=>dailyHoroscopeWriterEvidence(context,{writingProfile:broken}),/could not be verified/);
});

test('Daily meaning follows actual developments and their own houses instead of the legacy Moon anchor',()=>{
  const anchor={id:'legacy-moon',role:'meaning',text:'An entire historical Moon ingress paragraph.\n\nIts complete old ending.'};
  const voice={id:'voice',role:'register',text:'A complete synthetic voice example.\n\nIts original ending.'};
  const context={primaryRegisterPassages:[voice],sameFamilyExamples:[voice],relevantOwnerPassages:[],registerGoldExamples:[],phraseExamples:[],
    sharedEvidencePacket:{entries:[anchor,voice],roles:{meaning:[anchor],register:[voice]},counts:{meaning:1,register:1},supportingArgumentCandidates:[]}};
  const binding=(planet,sign,house,text)=>({planet,sign,house,domain:`Synthetic house ${house}`,meaning:{sourceId:`reviewed/${planet}/${sign}`,sourcePath:'fixture:reviewed',status:'REVIEWED_CLAUSE',temporaryMeaning:text}});
  const sun=binding('sun','scorpio',8,'  Complete reviewed Sun clause with café.\n');
  const moon=binding('moon','gemini',3,'Complete reviewed ordinary Moon clause.');
  const mars=binding('mars','leo',5,'Complete reviewed Mars clause.');
  const facts={window:{period:'daily'},positions:[sun,moon,mars],events:[],developments:{events:[{id:'exact-aspect',type:'aspect',placements:[sun,mars]}],
    background:[{id:'sun-ref',type:'reference-position',...sun},{id:'moon-ref',type:'reference-position',...moon}]}};
  const before=structuredClone({context,facts}),writer=dailyHoroscopeWriterEvidence(context,{engineFacts:facts});
  const texts=writer.completeSourcePassages.map(source=>source.text);
  assert.deepEqual(texts.sort(),[voice.text,sun.meaning.temporaryMeaning,mars.meaning.temporaryMeaning].sort());
  assert(!texts.includes(anchor.text));assert(!texts.includes(moon.meaning.temporaryMeaning));
  const meanings=writer.sharedEvidencePacket.roles.meaning;
  assert.equal(meanings.length,2);assert.equal(writer.sharedEvidencePacket.counts.meaning,2);
  assert.deepEqual(meanings[0].currentBindings,[{developmentId:'exact-aspect',planet:'sun',sign:'scorpio',house:8,domain:'Synthetic house 8'},
    {developmentId:'sun-ref',planet:'sun',sign:'scorpio',house:8,domain:'Synthetic house 8'}]);
  assert.equal(meanings[1].currentBindings[0].house,5,'Aspect participants retain their own houses');
  assert(meanings.every(meaning=>meaning.coverage==='day-event-meaning'),'An exact event keeps its own meaning even when the same placement is also background');
  for(const meaning of meanings){assert.equal(meaning.ownerAuthored,false);assert.equal(meaning.eligibleForWriterRegister,false);}
  assert.equal(writer.writerMeaningSelection.originalAnchorMeanings[0].sha256,createHash('sha256').update(anchor.text).digest('hex'));
  assert.deepEqual(dailyWriterValidationSources(context,null,facts),writer.completeSourcePassages,'Final source-copy validation protects the delivered exact clauses');
  assert.deepEqual({context,facts},before,'All full original retrieval and calculated evidence remain immutable');
  assert(dailyHoroscopeWriterEvidence(context,{engineFacts:{...facts,window:{period:'weekly'}},diversifyWeekly:false}).completeSourcePassages.some(source=>source.text===anchor.text),'Weekly keeps its existing meaning route');
  const special=structuredClone(facts);special.developments.events.push({id:'new-moon',type:'lunation',...moon});
  assert(dailyHoroscopeWriterEvidence(context,{engineFacts:special}).completeSourcePassages.some(source=>source.text===moon.meaning.temporaryMeaning),'Special lunar developments retain their licensed meaning');
  const quiet=structuredClone(facts);quiet.developments.events=[];
  const optional=dailyHoroscopeWriterEvidence(context,{engineFacts:quiet});
  assert.equal(optional.sharedEvidencePacket.roles.meaning.length,1);
  assert.equal(optional.sharedEvidencePacket.roles.meaning[0].coverage,'optional-ongoing-context');
  assert.equal(optional.writerMeaningSelection.currentMeanings[0].coverage,'optional-ongoing-context','Review and writer retain the same optional coverage identity');
  assert(optional.completeSourcePassages.some(source=>source.text===sun.meaning.temporaryMeaning),'Optional does not remove or shorten the complete source');
  delete quiet.developments.background[0].type;
  assert.equal(dailyHoroscopeWriterEvidence(context,{engineFacts:quiet}).sharedEvidencePacket.roles.meaning[0].coverage,'optional-ongoing-context','The background container, rather than a missing type label, determines optional use');
  const missing=structuredClone(facts);delete missing.developments.events[0].placements[0].meaning.temporaryMeaning;
  assert.throws(()=>dailyHoroscopeWriterEvidence(context,{engineFacts:missing}),/missing its reviewed meaning/,'A source gap cannot fall back to the detached anchor');
});
