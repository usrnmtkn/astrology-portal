import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const outFile=path.join(os.tmpdir(),`mercury-return-hydration-${process.pid}.mjs`);
await build({bundle:true,format:'esm',platform:'node',outfile:outFile,logLevel:'silent',define:{'import.meta.env':'{}'},loader:{'.css':'empty','.svg':'dataurl'},stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 export { friendsViewModelDependencies } from './apps/web/src/App.tsx';
 export { preparePersonalTransitSources } from './apps/web/src/services/personalTransitSources.ts';
 export { refreshContentPublications } from './apps/web/src/services/contentPublications.ts';
 export { installPersonalTransitFallbackArchitectureV3Bundle, loadDeferredFallbackArchitectureV3Bundle } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
 export { projectReaderRow, READER_ROW_SCHEMA } from './apps/web/src/content/readerRowProjection.mjs';
`}});
const original=globalThis.fetch;
try{
 const r=await import(pathToFileURL(outFile));
 const key='authored/transit-aspect/mercury/mercury/conjunction';
 const record={contentKey:key,content_role:'full_copy',grammar_frame:'complete_sentence',reader_only:true,render_policy:'personal-transit-exact-v1',surface:'transit-aspect',review_status:'approved',headline:'Synthetic Mercury return',body:'Until {{untilDate}}, you read the note.  You answer it.',body_you:'Until {{untilDate}}, you read the note.  You answer it.',body_they:'Until {{untilDate}}, they read the note.  They answer it.',requiredSlots:['untilDate'],optionalSlots:[],approval:{approvalLevel:'exact_owner_approved',recordPath:'synthetic-test',payloadSha256:'a'.repeat(64),approvedAt:'2026-10-08T00:00:00Z'}};
 const row={id:'00000000-0000-4000-8000-000000000001',content_key:key,surface:'you',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,provider:'tldrastro-fallback-architecture-v3',updated_at:'2026-10-08T00:00:00Z',body:record.body,sections:{packageRecord:record},facts:{content_role:'full_copy',review_status:'approved'}};
 let state='live',revision=1;
 const ledger=()=>[{content_key:key,state,revision,row_id:row.id,row_updated_at:row.updated_at,updated_at:row.updated_at}];
 globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/content-reader');assert.deepEqual(JSON.parse(init.body).keys,[key]);return Response.json({schema:r.READER_ROW_SCHEMA,rows:[r.projectReaderRow(row)],publications:ledger(),nextCursor:null});};
 await r.loadDeferredFallbackArchitectureV3Bundle();
 await r.refreshContentPublications(true,async()=>ledger());
 const transit={id:'synthetic-mercury-return',transitPlanet:'Mercury',natalPoint:'Mercury',aspect:'conjunction',transitMotion:'direct',transitSign:'Libra',natalSign:'Libra',natalHouse:3,house:3,term:'short',currentSpeed:1,glyph:'',orb:"0 30'",arc:[],note:'',timing:{engagementStart:'2026-10-08T00:00:00Z',engagementEnd:'2026-10-10T12:00:00Z',exactPasses:[],passIndex:1}};
 const personal=(voice,extra={})=>r.friendsViewModelDependencies.normalizePersonalTransitSurface({...transit,...extra},'2026-10-08',voice).sections.find(section=>section.slot==='meaning')?.body??null;
 assert.equal(personal('you'),null,'Published exact source cannot leak old return while loading');
 r.installPersonalTransitFallbackArchitectureV3Bundle((await r.preparePersonalTransitSources()).bundle);
 for(const voice of ['you','QA Friend']){
  const expected=record[voice==='you'?'body_you':'body_they'];
  assert.equal(personal(voice),expected.replaceAll('{{untilDate}}','October 10, 2026'),'Actual app computes date and forwards perspective');
  assert.equal(personal(voice,{reportWindowLabel:'until November 2'}),expected.replaceAll('{{untilDate}}','November 2'),'Report date override is forwarded');
 }
 state='retired';revision++;
 await r.refreshContentPublications(true,async()=>ledger());
 assert.equal(personal('you'),null);assert.equal(personal('QA Friend'),null);
 console.log('PASS actual App You/Friend payload through public reader hydration: exact paired text, calculated date, report window, pending-source and retirement gates.');
}finally{globalThis.fetch=original;fs.rmSync(outFile,{force:true});}
