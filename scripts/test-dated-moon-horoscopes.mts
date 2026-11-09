import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {invoke,store} from '../tests/helpers/moon-horoscope-api.mts';
import {MOON_HOROSCOPE_SIGNS,moonHoroscopeHouse,moonHoroscopeKey,moonHoroscopeBody,parseMoonHoroscopes} from '../src/shared/datedLunationHoroscopes.mjs';
import {isReaderServableGeneratedContentRow} from '../apps/web/src/content/generatedContentEligibility';
import {emptyMoonHoroscopes,moonWritingDraft,moonWritingDraftPayload} from '../apps/admin/src/moonHoroscopeDraft';

mkdirSync('test-results',{recursive:true});
const directory=mkdtempSync(join(process.cwd(),'test-results/dated-moon-test-'));
try{
  const bundle=join(directory,'reader.mjs');
  await build({stdin:{contents:`
    import {createElement} from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
    import {SkyDetailArticle} from './apps/web/src/features/sky/SkyDetailArticle';
    export {resolveLunationArticleHoroscopes,lunationArticleContentKeys} from './apps/web/src/content/lunationArticleHoroscopes';
    export {generatedContentMapFromRows} from './apps/web/src/services/generatedContent';
    export function renderMoon(cards){const previous=globalThis.window;globalThis.window={location:{href:'https://fixture.invalid/'}};
      try{return renderToStaticMarkup(createElement(SkyDetailArticle,{detail:{title:'Synthetic Moon',routePath:'sky/lunation/fixture',glyph:'●',meta:'Fixture',duration:'Fixture',body:[],risingHoroscopes:cards,suppressTldr:true},onClose(){}}));}finally{globalThis.window=previous;}}
  `,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',outfile:bundle,external:['react','react-dom/server'],banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"},loader:{'.css':'empty'},define:{'import.meta.env':'{}'},logLevel:'silent'});
  const reader=await import(pathToFileURL(bundle).href);
  for(const month of ['2026-11','2026-12']){
    const listed=await invoke('GET',undefined,`/api/admin/lunation-writing?month=${month}&timeZone=America%2FNew_York`);
    assert.equal(listed.status,200,JSON.stringify(listed.payload));assert.equal(listed.payload.events.length,2);
    for(const event of listed.payload.events){
      const phase=event.phase==='new-moon'?'New':'Full';
      const source=MOON_HOROSCOPE_SIGNS.map(sign=>`${sign[0].toUpperCase()+sign.slice(1)} / ${sign[0].toUpperCase()+sign.slice(1)} Rising\n${phase} Moon in Your ${moonHoroscopeHouse(event.sign,sign)}th House\n${sign} exact opening — punctuation stays.\n\n${sign} exact final sentence.`).join('\n\n');
      const section=parseMoonHoroscopes(source,event);
      if(month==='2026-11'&&event.phase==='new-moon'){
        const partial=emptyMoonHoroscopes(event);partial.passages[0].body='  Exact unfinished opening.\n\nExact unfinished ending.  ';
        const rawBody=moonWritingDraftPayload(event,partial,null,null,null);
        let rawResult=await invoke('POST',rawBody);assert.equal(rawResult.status,200,JSON.stringify(rawResult.payload));
        let raw=rawResult.payload.rows[0];assert.deepEqual(moonWritingDraft(raw)?.section,partial);
        const malformed=structuredClone(raw);malformed.sections.moonWritingDraft.section.passages[0]=null;assert.equal(moonWritingDraft(malformed),null,'Malformed drafts fail closed without crashing.');
        const independent=await invoke('POST',moonWritingDraftPayload(event,partial,null,null,null));assert.equal(independent.status,200);assert.notEqual(independent.payload.rows[0].content_key,raw.content_key);
        assert.equal(isReaderServableGeneratedContentRow({...raw,status:'LIVE',lane:'serving',review_state:null}),false,'Even forced-LIVE raw writing is excluded from readers.');
        for(const action of [{status:'LIVE'},{ownerAction:'publish-owner-content'},{ownerAction:'publish-sky-article-edition'},{ownerAction:'publish-horoscope-edition-revision'}]){
          assert.notEqual((await invoke('PATCH',{id:raw.id,expectedUpdatedAt:raw.updated_at,...action})).status,200,'Reference drafts cannot publish.');
        }
        partial.passages[0].body='';
        rawResult=await invoke('PATCH',{...moonWritingDraftPayload(event,partial,null,null,raw),id:raw.id,expectedUpdatedAt:raw.updated_at});assert.equal(rawResult.status,200,JSON.stringify(rawResult.payload));
        const cleared=rawResult.payload.rows[0];assert.deepEqual(moonWritingDraft(cleared)?.section,partial,'Explicit empty fields survive draft saving.');
        assert.equal((await invoke('PATCH',{...rawBody,id:raw.id,expectedUpdatedAt:raw.updated_at})).status,409,'A stale draft cannot overwrite its saved version.');
        const loaded=await invoke('GET',undefined,`/api/admin/generated-content?id=${cleared.id}&status=all&visibility=all`);assert.deepEqual(moonWritingDraft(loaded.payload.rows[0])?.section,partial);
        assert.equal((await invoke('reader',{keys:[cleared.content_key]})).payload.rows.length,0);
      }
      assert.equal(section.passages.length,12);assert.equal(section.passages[0].body.split('\n').at(-1),'aries exact final sentence.');
      for(const malformed of [source.replace('Pisces / Pisces Rising','Aries / Aries Rising'),source.slice(0,source.indexOf('Pisces / Pisces Rising')),`Editor notes: private\n${source}`,source.replace('aries exact final sentence.','Editorial notes: private')])assert.throws(()=>parseMoonHoroscopes(malformed,event));
      assert.throws(()=>parseMoonHoroscopes(source,{...event,phase:event.phase==='new-moon'?'full-moon':'new-moon'}),/heading/);
      const body={contentKey:moonHoroscopeKey(event),surface:'sky',mode:'article',eventType:'lunation-horoscopes',targetDate:null,status:'DRAFT',lane:'serving',reviewState:null,headline:`${event.title} horoscopes`,summary:'',body:moonHoroscopeBody(section),sections:{articleHoroscopes:section},facts:{lunationHoroscopes:{event}},sourceSnapshot:{editorialImport:{originalSource:source}}};
      let result=await invoke('POST',body);assert.equal(result.status,200,JSON.stringify(result.payload));let row=result.payload.rows[0];
      assert.equal(row.source_snapshot.editorialImport.originalSource,source);assert.match(row.source_snapshot.editorialImport.sha256,/^[a-f0-9]{64}$/u);
      assert.equal(isReaderServableGeneratedContentRow(row),false);
      const count=store.rows.size;
      const duplicate=await invoke('POST',body);assert.notEqual(duplicate.status,200);assert.equal(store.rows.size,count);
      result=await invoke('GET',undefined,`/api/admin/generated-content?contentKeys=${encodeURIComponent(row.content_key)}&status=all&visibility=all`);
      assert.deepEqual(result.payload.rows[0].sections.articleHoroscopes,section);
      if(month==='2026-11'&&event.phase==='new-moon'){
        const partial=emptyMoonHoroscopes(event);partial.passages[0].body='Exact private target draft.';
        const recovery=await invoke('POST',moonWritingDraftPayload(event,partial,null,row,null));assert.equal(recovery.status,200);
        const raw=recovery.payload.rows[0],openedVersion=row.updated_at;
        const advanced=await invoke('PATCH',{id:row.id,expectedUpdatedAt:openedVersion,reviewerNotes:'Synthetic concurrent metadata.'});assert.equal(advanced.status,200);row=advanced.payload.rows[0];
        assert.equal(moonWritingDraft(raw)?.target?.updatedAt,openedVersion,'Reopening keeps the original target version pin.');
        assert.equal((await invoke('PATCH',{id:row.id,expectedUpdatedAt:moonWritingDraft(raw)!.target!.updatedAt,body:row.body})).status,409,'A recovered draft cannot overwrite an advanced target.');
        assert.deepEqual(moonWritingDraft(store.rows.get(raw.id))?.section,partial);assert.equal(store.rows.get(row.id).reviewer_notes,'Synthetic concurrent metadata.');
      }
      const version=row.updated_at;
      const wrong=structuredClone(section);wrong.passages[0].house=wrong.passages[0].house%12+1;
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:version,sections:{articleHoroscopes:wrong}});assert.equal(result.status,422);
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:version,facts:{lunationHoroscopes:{event:{...event,startsAt:new Date(Date.parse(event.startsAt)+60000).toISOString()}}}});assert.equal(result.status,422);
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:version,status:'LIVE'});assert.equal(result.status,409,'Only the explicit saved-wording action publishes.');
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:version,ownerAction:'publish-owner-content'});assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];assert.equal(row.status,'LIVE');
      assert.equal(isReaderServableGeneratedContentRow(row),true);
      assert.equal(isReaderServableGeneratedContentRow({...row,sections:{}}),false,'Malformed dated sections never reach a reader.');
      const publicResult=await invoke('reader',{keys:[row.content_key]});assert.equal(publicResult.status,200,JSON.stringify(publicResult.payload));
      assert.equal(publicResult.payload.rows.length,1,JSON.stringify(publicResult.payload));
      const publicRow=publicResult.payload.rows[0];assert(!JSON.stringify(publicRow).includes('originalSource'),'Private original imports stay out of public responses.');
      const map=reader.generatedContentMapFromRows([publicRow]);
      assert(reader.lunationArticleContentKeys(event).includes(row.content_key));
      const resolved=reader.resolveLunationArticleHoroscopes(event,map);
      assert.deepEqual(resolved.map((p:any)=>[p.risingSign,p.house,p.body]),section.passages.map(p=>[p.risingSign,p.house,p.body]));
      const rendered=reader.renderMoon(resolved);
      assert.equal((rendered.match(/class="sky-rising-horoscope"/gu)??[]).length,12);
      for(const passage of section.passages){assert(rendered.includes(`${passage.risingSign} exact opening — punctuation stays.`));assert(rendered.includes(`${passage.risingSign} exact final sentence.`));}
      assert.equal(reader.resolveLunationArticleHoroscopes({...event,startsAt:new Date(Date.parse(event.startsAt)+86400000).toISOString()},map).some((p:any)=>p.contentKey===row.content_key),false,'Another Moon date cannot select these readings.');
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:version,body:row.body});assert.equal(result.status,409,'Stale saves preserve the published copy.');
      const revised=structuredClone(section);revised.passages[11].body+='\n\nExact revision ending.';
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:moonHoroscopeBody(revised),sections:{articleHoroscopes:revised}});
      assert.equal(result.status,200,JSON.stringify(result.payload));const revision=result.payload.rows[0];assert.equal(revision.mode,'studio-draft');assert.equal(store.rows.get(row.id).body,row.body,'Draft edits preserve the published reading.');
      result=await invoke('PATCH',{id:revision.id,expectedUpdatedAt:revision.updated_at,ownerAction:'publish-horoscope-edition-revision'});
      assert.equal(result.status,200,JSON.stringify(result.payload));assert.equal(result.payload.rows[0].id,row.id);assert.equal(result.payload.rows[0].sections.articleHoroscopes.passages[11].body,revised.passages[11].body);
      const published=structuredClone(result.payload.rows[0]);
      const copy=(value:any)=>Object.fromEntries(Object.entries(value).filter(([key])=>!['status','updated_at'].includes(key)));
      const lifecycle=(action:string,version=store.rows.get(row.id).updated_at,extra={})=>invoke('PATCH',{id:row.id,expectedUpdatedAt:version,sourceLifecycleAction:action,...extra});
      assert.equal((await lifecycle('archive',version)).status,409,'A stale archive cannot overwrite newer publication.');
      assert.equal((await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:published.updated_at,sourceLifecycleAction:'archive'},undefined,'wrong-secret')).status,401);
      assert.deepEqual(store.rows.get(row.id),published);
      result=await lifecycle('archive');assert.equal(result.status,200,'MOON_CANONICAL_ARCHIVE');
      const archived=structuredClone(result.payload.rows[0]);assert.equal(archived.status,'ARCHIVED');assert.deepEqual(copy(archived),copy(published));
      assert.equal((await invoke('PATCH',{id:revision.id,expectedUpdatedAt:store.rows.get(revision.id).updated_at,sourceLifecycleAction:'archive'})).status,409,'Canonical lifecycle cannot target a private revision.');
      assert.equal((await lifecycle('archive',archived.updated_at,{body:'Do not replace the writing.'})).status,400);
      assert.deepEqual(store.rows.get(row.id),archived);
      assert.equal((await invoke('reader',{keys:[row.content_key]})).payload.rows.length,0,'Archiving withdraws the exact public reader set.');
      const ledger=await fetch(`${process.env.SUPABASE_URL}/rest/v1/content_publications`).then(response=>response.json());
      assert.equal(ledger.find((record:any)=>record.content_key===row.content_key).state,'retired');
      assert.equal((await store.publication.publications()).find((record:any)=>record.content_key===row.content_key).state,'retired','The actual SQL trigger/ledger is retired.');
      assert.equal((await lifecycle('archive')).status,409);
      assert.equal((await invoke('PATCH',{id:row.id,expectedUpdatedAt:archived.updated_at,body:archived.body})).status,409);
      assert.equal((await invoke('PATCH',{id:row.id,expectedUpdatedAt:archived.updated_at,ownerAction:'publish-owner-content'})).status,409);
      result=await invoke('GET',undefined,`/api/admin/generated-content?contentKeys=${encodeURIComponent(row.content_key)}&status=all&visibility=all`);
      assert.equal(result.payload.rows.find((candidate:any)=>candidate.id===row.id).status,'ARCHIVED','The complete archived set remains discoverable.');
      result=await lifecycle('restore');assert.equal(result.status,200,JSON.stringify(result.payload));
      const restored=result.payload.rows[0];assert.equal(restored.status,'DRAFT');assert.deepEqual(copy(restored),copy(published));
      assert.equal((await lifecycle('restore')).status,409);
      assert.equal((await invoke('reader',{keys:[row.content_key]})).payload.rows.length,0,'Restore never republishes.');
      result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:restored.updated_at,ownerAction:'publish-owner-content'});
      assert.equal(result.status,200,JSON.stringify(result.payload));assert.equal(result.payload.rows[0].body,published.body);
      assert.equal((await store.publication.publications()).find((record:any)=>record.content_key===row.content_key).state,'live','Only the explicit owner publication reopens the actual SQL ledger.');
      if(month==='2026-11'&&event.phase==='new-moon'){
        const beforeFailure=structuredClone(store.rows.get(row.id)),fixtureFetch=globalThis.fetch;
        globalThis.fetch=async(input:any,options:any={})=>String(input).endsWith('/rpc/retire_content_everywhere')
          ?Response.json({message:'Synthetic retirement interruption.'},{status:503}):fixtureFetch(input,options);
        try{assert.equal((await lifecycle('archive')).status,503,'A failed second step must not acknowledge success.');}
        finally{globalThis.fetch=fixtureFetch;}
        const unconfirmed=structuredClone(store.rows.get(row.id));assert.equal(unconfirmed.status,'ARCHIVED');assert.deepEqual(copy(unconfirmed),copy(beforeFailure));
        assert.equal((await lifecycle('archive',beforeFailure.updated_at)).status,409,'A stale retry does not overwrite the saved transition.');
        assert.deepEqual(store.rows.get(row.id),unconfirmed);
        assert.equal((await invoke('reader',{keys:[row.content_key]})).payload.rows.length,0);
        assert.equal((await lifecycle('restore')).status,200,'Reloaded archived state can safely recover as a non-serving draft.');
        const beforeRace=structuredClone(store.rows.get(row.id));let raced=false;
        globalThis.fetch=async(input:any,options:any={})=>{
          if(!raced&&options.method==='PATCH'&&String(input).includes('/rest/v1/generated_interpretations?')){
            raced=true;store.rows.set(row.id,{...beforeRace,reviewer_notes:'Synthetic concurrent metadata.',updated_at:new Date(Date.now()+100000).toISOString()});
          }
          return fixtureFetch(input,options);
        };
        try{assert.equal((await lifecycle('archive')).status,409,'A between-read/write race refuses the conditional transition.');}
        finally{globalThis.fetch=fixtureFetch;}
        assert(raced);assert.equal(store.rows.get(row.id).reviewer_notes,'Synthetic concurrent metadata.');
        assert.equal(store.rows.get(row.id).status,'DRAFT');assert.equal(store.rows.get(row.id).body,beforeRace.body);
      }
      assert.equal((await lifecycle('archive')).status,200);
      assert.equal((await invoke('reader',{keys:[row.content_key]})).payload.rows.length,0);
    }
  }
  console.log('PASS dated Moon import: four calculated New/Full Moons, twelve exact signs/houses, draft/save/reload, isolated publication and reader delivery, private source boundary, date isolation, conflicts and atomic revisions.');
}finally{rmSync(directory,{recursive:true,force:true});}
