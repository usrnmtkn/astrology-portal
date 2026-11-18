import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { studioApiStore } from '../tests/helpers/studio-api-store';
import { createFallbackRenderer } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';

const key = 'fallback-hook/natal-aspect-lived/lilith/opposition/mercury';
const stamp = '2026-11-17T12:00:00.000Z';
const originalYou = 'Synthetic complete You opening.\n\nSynthetic complete You ending.';
const originalFriend = '{{Name}} keeps the complete Friend opening.\n\nThey keep the complete Friend ending.';
const record = { contentKey:key, content_role:'fallback_hook', grammar_frame:'complete_sentence', reader_only:true,
  render_policy:'reader-only-exact-lived-v1', review_status:'approved', body:originalYou, body_they:originalFriend, astroHint:'Synthetic original hint.' };
const store = await studioApiStore([{ id:'fixture-natal-aspect-fields',content_key:key,surface:'you',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,
  provider:'tldrastro-fallback-architecture-v3',headline:'Synthetic natal aspect',body:originalYou,summary:'',updated_at:stamp,
  facts:{fallbackArchitectureV3:true,review_status:'approved'},sections:{packageRecord:record},source_snapshot:{contentType:'fallback-system',review_status:'approved'} },
  {id:'fixture-native-sun-moon',content_key:'natal.aspect.sun.opposition.moon',surface:'you',mode:'feed',status:'DRAFT',lane:'reference',review_state:'needs-review',
    provider:'authored-natal-aspect-copy',headline:'Synthetic Sun Moon',body:originalYou,summary:'',updated_at:stamp,sections:{},facts:{},source_snapshot:{contentType:'authored-natal-aspect',canonicalKey:'natal.aspect.sun.opposition.moon'}}]);
try {
  const hint = 'Synthetic edited astrology hint, complete and exact.';
  const saved = await store.call({method:'PATCH',body:{id:'fixture-natal-aspect-fields',expectedUpdatedAt:stamp,
    sections:{packageDraft:{...record,astroHint:hint}}}});
  assert.equal(saved.status,200,JSON.stringify(saved.payload));
  const draft=saved.payload.rows[0];
  assert.equal(draft.sections.packageDraft.astroHint,hint);
  assert.equal(draft.sections.packageRecord.astroHint,record.astroHint,'A hint draft must preserve published wording.');
  const reopened=await store.call({method:'GET',url:`/api/admin/generated-content?id=${draft.id}`});
  assert.equal(reopened.payload.rows[0].sections.packageDraft.astroHint,hint);
  const stale=await store.call({method:'PATCH',body:{id:draft.id,expectedUpdatedAt:stamp,sections:{packageDraft:{...record,astroHint:'Stale'}}}});
  assert.equal(stale.status,409);
  const published=await store.call({method:'PATCH',body:{id:draft.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'}});
  assert.equal(published.status,200,JSON.stringify(published.payload));
  const live=published.payload.rows[0];
  assert.equal(live.sections.packageRecord.astroHint,hint);
  assert.equal(live.sections.packageRecord.body,originalYou);
  assert.equal(live.sections.packageRecord.body_they,originalFriend);
  const reader=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
  assert.equal(reader.status,200);
  const publicRecord=reader.payload.rows[0].sections.packageRecord;
  assert.equal(publicRecord.astroHint,hint);
  assert.equal(publicRecord.body,originalYou);
  assert.equal(publicRecord.body_they,originalFriend);
  const templates=JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json','utf8'));
  const renderer=createFallbackRenderer(templates,{vocabularyRows:[],hookRows:[publicRecord]});
  assert.equal(renderer.renderNatalAspect({planetA:'mercury',aspect:'opposition',planetB:'lilith',voice:'you'}).astroHint,hint);
  assert.equal(renderer.renderNatalAspect({planetA:'lilith',aspect:'opposition',planetB:'mercury',voice:'Sample'}).body,originalFriend.replaceAll('{{Name}}','Sample'));
  const you='Synthetic revised You opening.\n\nSynthetic revised You ending.';
  const next=await store.call({method:'PATCH',body:{id:live.id,expectedUpdatedAt:live.updated_at,sections:{packageDraft:{...live.sections.packageRecord,body_you:you,body:you}}}});
  assert.equal(next.status,200,JSON.stringify(next.payload));
  const nextDraft=next.payload.rows[0];
  const nextPublish=await store.call({method:'PATCH',body:{id:nextDraft.id,expectedUpdatedAt:nextDraft.updated_at,ownerAction:'approve-package-revision'}});
  assert.equal(nextPublish.status,200,JSON.stringify(nextPublish.payload));
  assert.equal(nextPublish.payload.rows[0].sections.packageRecord.body,you);
  assert.equal(nextPublish.payload.rows[0].sections.packageRecord.body_they,originalFriend);
  assert.equal(nextPublish.payload.rows[0].sections.packageRecord.astroHint,hint);
  const nativeDraft=await store.call({method:'PATCH',body:{id:'fixture-native-sun-moon',expectedUpdatedAt:stamp,status:'DRAFT',sections:{astroHint:hint}}});
  assert.equal(nativeDraft.status,200,JSON.stringify(nativeDraft.payload));
  const native=nativeDraft.payload.rows[0];
  for (const fields of [{facts:{sampleOnly:true}}, {sourceSnapshot:{contentType:'personal-report',canonicalKey:native.content_key}}]) {
    const refused=await store.call({method:'PATCH',body:{id:native.id,expectedUpdatedAt:native.updated_at,status:'LIVE',lane:'serving',reviewState:null,...fields}});
    assert.equal(refused.status,400,'Reusable Sun–Moon editing must retain the personal/sample content boundary.');
  }
  const nativePublish=await store.call({method:'PATCH',body:{id:native.id,expectedUpdatedAt:native.updated_at,status:'LIVE',lane:'serving',reviewState:null,ownerAuthoredWording:true}});
  assert.equal(nativePublish.status,200,JSON.stringify(nativePublish.payload));
  const nativeReader=await store.call({method:'POST',url:'/api/content-reader',body:{keys:['natal.aspect.sun.opposition.moon']}});
  assert.equal(nativeReader.payload.rows[0].sections.astroHint,hint);
  assert.equal(nativeReader.payload.rows[0].body,originalYou);
  const bundle=path.join(tmpdir(),`natal-aspect-editor-reader-${process.pid}.mjs`);
  try {
    await build({bundle:true,format:'esm',platform:'node',outfile:bundle,logLevel:'silent',define:{'import.meta.env':'{}'},loader:{'.css':'empty','.svg':'dataurl'},
      stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
        export { friendsViewModelDependencies } from './apps/web/src/App.tsx';
        export { generatedContentMapFromRows } from './apps/web/src/services/generatedContent.ts';
        export { installContentPublications } from './apps/web/src/content/contentPublicationState.ts';
      `}});
    const runtime=await import(pathToFileURL(bundle).href);
    runtime.installContentPublications(nativeReader.payload.publications);
    const content=runtime.generatedContentMapFromRows(nativeReader.payload.rows);
    const article=runtime.friendsViewModelDependencies.natalAspectDetailArticle({from:'Sun',to:'Moon',type:'opposition',orb:0},content);
    assert.equal(article.lensHint,hint,'The actual app article must forward the saved Sun–Moon hint.');
    assert.ok(article.body.join('\n\n').includes('Synthetic complete You ending.'));
  } finally { rmSync(bundle,{force:true}); }
} finally { store.close(); }
console.log('Natal aspect editor fields: hint save/reopen/publish, stale refusal, shipped reader delivery, and audience isolation passed.');
