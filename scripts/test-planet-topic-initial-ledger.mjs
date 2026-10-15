import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {READER_ROW_SCHEMA} from '../apps/web/src/content/readerRowSchema.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const ledgerGate=deferred();
let revision=1, readerCalls=0, rowGate=null, failures=0;
async function waitForReaderCalls(count) {
 const deadline=Date.now()+3000;
 while(readerCalls<count && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,0));
 assert.ok(readerCalls>=count,`Expected ${count} vocabulary HTTP calls before the scheduling deadline; saw ${readerCalls}.`);
}
const stamp=n=>`2026-10-15T00:00:0${n}.000Z`;
const key='fallback-vocab/planet-topic/sun';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const publication=n=>({content_key:key,state:'live',revision:n,row_id:id(n),row_updated_at:stamp(n),updated_at:stamp(n)});
const marker={content_key:'__content-publication-ledger/v1',state:'live',revision:1,row_id:null,row_updated_at:null,updated_at:stamp(1)};
const row=n=>({id:id(n),content_key:key,updated_at:stamp(n),surface:'modifier',mode:'article',status:'LIVE',lane:'serving',review_state:null,target_date:null,body:`Synthetic complete vocabulary ${n}.`,headline:null,summary:null,sections:{topic:{sky:`Synthetic Sky topic ${n}.`}},source_snapshot:{contentType:'manual'}});
const originalFetch=globalThis.fetch;
globalThis.__vocabularyLedgerClient={from(table){assert.equal(table,'content_publications');let lower,upper,after;const q={select(){return q},order(){return q},limit(){return q},retry(){return q},gte(k,v){lower=v;return q},lt(k,v){upper=v;return q},gt(k,v){after=v;return q},async abortSignal(){await ledgerGate.promise;return {data:[marker,publication(revision)].filter(r=>(!lower||r.content_key>=lower)&&(!upper||r.content_key<upper)&&(!after||r.content_key>after)),error:null}}};return q;}};
globalThis.fetch=async(input,init)=>{if(String(input)!=='/api/content-reader')throw new Error('Synthetic recovery unavailable');readerCalls++;const q=JSON.parse(String(init.body));assert.equal(q.vocabularyOnly,true);assert.deepEqual(q.surfaces,['modifier']);if(failures-->0)return new Response('Unavailable',{status:503});const n=revision;const held=rowGate;rowGate=null;if(held)await held.promise;return Response.json({schema:READER_ROW_SCHEMA,rows:[row(n)],publications:[marker,publication(n)],nextCursor:null});};
const built=await build({stdin:{contents:`export * from './apps/web/src/services/planetTopicVocabulary.ts';export {installContentPublications,subscribeToContentPublications} from './apps/web/src/content/contentPublicationState.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'isolated-auth',setup(b){b.onResolve({filter:/^\.\/auth$/},args=>args.importer.includes('/services/')?{path:'auth',namespace:'vocabulary-fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'vocabulary-fixture'},()=>({contents:'export async function getSupabaseClient(){return globalThis.__vocabularyLedgerClient}',loader:'js'}));}}]});
const modulePath=join(mkdtempSync(join(tmpdir(),'sky-vocabulary-ledger-')),'fixture.mjs');
writeFileSync(modulePath,built.outputFiles[0].text);
const api=await import(pathToFileURL(modulePath).href);
try{
 let second;
 const unsubscribe=api.subscribeToContentPublications(()=>{api.clearPlanetTopicVocabularyCache();second=api.loadPlanetTopicVocabulary();});
 const first=api.loadPlanetTopicVocabulary();
 await Promise.resolve();assert.equal(readerCalls,0,'No row read before complete initial ledger.');
 ledgerGate.resolve();
 const firstValue=await first;const secondValue=await second;unsubscribe();
 assert.equal(readerCalls,1,'Initial ledger installation must not duplicate vocabulary HTTP reads.');
 assert.equal(firstValue.get('sun')?.sky,'Synthetic Sky topic 1.');assert.equal(secondValue.get('sun')?.sky,'Synthetic Sky topic 1.');
 console.log('PASS one actual vocabulary request and nonempty override after held initial ledger installation.');

 api.clearPlanetTopicVocabularyCache();rowGate=deferred();const oldGate=rowGate;
 const old=api.loadPlanetTopicVocabulary();await waitForReaderCalls(2);
 revision=2;api.installContentPublications([publication(2)]);
 rowGate=deferred();const freshGate=rowGate;const freshRequest=api.loadPlanetTopicVocabulary();
 await waitForReaderCalls(3);
 oldGate.resolve();assert.equal((await old).size,0,'Old epoch must never install over a newer publication.');
 const coalesced=api.loadPlanetTopicVocabulary();await new Promise(r=>setTimeout(r,0));
 assert.equal(readerCalls,3,'An old completion must not clear the new epoch pending request.');
 freshGate.resolve();const [fresh,shared]=await Promise.all([freshRequest,coalesced]);
 assert.equal(fresh.get('sun')?.sky,'Synthetic Sky topic 2.');assert.equal(shared.get('sun')?.sky,'Synthetic Sky topic 2.');
 assert.equal(api.planetTopicPhrase('Sun','sky'),'Synthetic Sky topic 2.');assert.equal(readerCalls,3,'Distinct publication revisions require distinct requests.');
 console.log('PASS mid-row revision change discards stale completion and retains fresh wording.');

 api.installContentPublications([{...publication(3),state:'retired'}]);revision=3;
 assert.equal((await api.loadPlanetTopicVocabulary()).size,0);assert.equal(api.planetTopicPhrase('Sun','sky'),'','Retirement must not resurrect old vocabulary or fallback.');
 console.log('PASS retirement remains authoritative.');

 revision=4;api.installContentPublications([publication(4)]);failures=3;
 assert.equal((await api.loadPlanetTopicVocabulary()).size,0,'Failed transport retains the existing verified offline result, not an invented override.');
 assert.equal((await api.loadPlanetTopicVocabulary()).get('sun')?.sky,'Synthetic Sky topic 4.','A failed request must release its pending slot for retry.');
 console.log('PASS failed transport retains verified offline behavior, releases pending work, and explicit retry hydrates fresh override.');
}finally{globalThis.fetch=originalFetch;delete globalThis.__vocabularyLedgerClient;}
