import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTransitSynastryRenderer as browser} from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
import {createTransitSynastryRenderer as shipped} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import {transitNatalExactSourceDraft, renderTransitNatalPreview} from '../apps/admin/src/transitNatalSources.ts';
import {isDynamicTransitNatalExactKey} from '../apps/web/src/content/transitNatalIdentity.ts';
import {setNodeBlockedContentKeys} from '../apps/web/src/content/fallbackArchitectureV3/resolver/publicationGuard.mjs';
const key='authored/transit-aspect/mercury/mercury/conjunction';
const source={contentKey:key,content_role:'full_copy',headline:'Synthetic Mercury return',review_status:'approved',body:'Wrong legacy body.',body_you:'Until {{untilDate}}, you read the note.  You answer it.\n\nYou keep the answer.',body_they:'Until {{untilDate}}, they read the note.  They answer it.\n\nThey keep the answer.'};
const legacy={contentKey:'authored/transit-return/mercury',content_role:'full_copy',headline:'Legacy',review_status:'reviewed',body:'Synthetic existing Mercury return.'};
const sun={...legacy,contentKey:'authored/transit-return/sun',body:'Synthetic existing Sun return.'};
const lib={authoredCards:[legacy,sun,source]};
const templates={templates:[]}, rows={hookRows:[],vocabularyRows:[]};
// Inject the same synthetic source in the Node reference's read-only module load.
// No checked-in owner source is modified by this test.
const read=fs.readFileSync;
fs.readFileSync=((path:any,...args:any[])=>String(path).endsWith('/source-rows/transit-synastry-rows-v1.json')?JSON.stringify(lib):read(path,...args)) as typeof read;
let node:any;
try{node=await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs?mercury-fixture');}finally{fs.readFileSync=read;}
const renderers=[['Node',node],['browser',browser(lib,templates,rows)],['shipped',shipped(lib,templates,rows)]] as const;
for(const [label,renderer] of renderers){
 for(const voice of ['you','QA Friend'])for(const date of ['October 10','November 2']){
  const result=renderer.renderTransitReturn({planet:'mercury',voice,window:`until ${date}`});
  const field=voice==='you'?'body_you':'body_they';
  assert.equal(result.body,source[field].replaceAll('{{untilDate}}',date),`${label}: byte-preserving body`);
  assert.deepEqual(result.parts,[result.body]);
  assert.equal(result.contentKey,key);
  assert.deepEqual(result.sourceKeys,[key]);
  assert(result.paragraphSources.every((p:any)=>p.sources.every((s:any)=>s.field===field&&s.audience===(voice==='you'?'you':'they'))));
 }
 assert.throws(()=>renderer.renderTransitReturn({planet:'mercury',voice:'QA Friend'}),/missing calculated end date/);
 assert.throws(()=>renderer.renderTransitReturn({planet:'mercury',voice:'you',window:'until {{untilDate}}'}),/unresolved placeholder/);
 assert.equal(renderer.renderTransitReturn({planet:'mercury'}).body,legacy.body,'Existing planet-only caller stays unchanged');
 assert.equal(renderer.renderTransitReturn({planet:'sun',voice:'QA Friend',window:'until October 10'}).body,sun.body,'Other returns stay unchanged');
}
function assertIndependentExactPublication(renderer:any){
 for(const voice of ['you','QA Friend']){
  assert.equal(renderer.renderTransitReturn({planet:'mercury',voice,window:'until October 10'}).body,
   source[voice==='you'?'body_you':'body_they'].replaceAll('{{untilDate}}','October 10'),
   'Retiring the legacy return must not block an independently approved exact source');
 }
 assert.throws(()=>renderer.renderTransitReturn({planet:'mercury'}),/Publication unavailable/,
  'Planet-only callers must still respect legacy retirement');
}
setNodeBlockedContentKeys([legacy.contentKey]);
try{assertIndependentExactPublication(node);}finally{setNodeBlockedContentKeys([]);}
for(const factory of [browser,shipped]){
 assertIndependentExactPublication(factory(lib,templates,rows,{blockedContentKeys:new Set([legacy.contentKey])}));
 for(const bad of [{...source,body_they:undefined},{...source,review_status:'needs_review'},{...source,body_they:'They read {{unknown}}.'}]){
  assert.throws(()=>factory({...lib,authoredCards:[legacy,bad]},templates,rows).renderTransitReturn({planet:'mercury',voice:'QA Friend',window:'until October 10'}),/SOURCE_GAP/,'Invalid exact copy cannot fall back to the old return');
 }
 assert.throws(()=>factory(lib,templates,rows,{blockedContentKeys:new Set([key])}).renderTransitReturn({planet:'mercury',voice:'you',window:'until October 10'}),/SOURCE_GAP/);
 const fallback=factory({authoredCards:[legacy]},templates,rows);
 assert.equal(fallback.renderTransitReturn({planet:'mercury',voice:'you',window:'until October 10'}).body,legacy.body,'Absent new source preserves existing reader behavior');
 for(const voice of ['you','QA Friend']){
  const preview=renderTransitNatalPreview({planet:'mercury',natalPoint:'mercury',aspect:'conjunction',sign:'libra',window:'until October 10'},factory(lib,templates,rows),voice);
  assert.equal(preview.body,source[voice==='you'?'body_you':'body_they'].replaceAll('{{untilDate}}','October 10'));
 }
}
const draft=transitNatalExactSourceDraft({planet:'mercury',natalPoint:'mercury',aspect:'conjunction'},source);
assert.equal(draft.contentKey,key);assert.equal(draft.sections.packageRecord.body_they,source.body_they);
assert.deepEqual(draft.sections.packageRecord.requiredSlots,['untilDate']);assert.deepEqual(draft.sections.packageRecord.optionalSlots,[]);
assert(isDynamicTransitNatalExactKey(key));
assert(!isDynamicTransitNatalExactKey('authored/transit-aspect/sun/sun/conjunction'));
assert(!isDynamicTransitNatalExactKey(key+'/libra/1/1'));
console.log('PASS Mercury return: Node/browser/shipped parity, You/Friend date substitution, exact bytes/provenance, fail-closed invalid source, unchanged other return behavior.');
