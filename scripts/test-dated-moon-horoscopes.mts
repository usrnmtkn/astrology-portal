import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {invoke,store} from '../tests/helpers/moon-horoscope-api.mts';
import {MOON_HOROSCOPE_SIGNS,moonHoroscopeHouse,moonHoroscopeKey,moonHoroscopeBody,parseMoonHoroscopes} from '../src/shared/datedLunationHoroscopes.mjs';
import {isReaderServableGeneratedContentRow} from '../apps/web/src/content/generatedContentEligibility';

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
    }
  }
  console.log('PASS dated Moon import: four calculated New/Full Moons, twelve exact signs/houses, draft/save/reload, isolated publication and reader delivery, private source boundary, date isolation, conflicts and atomic revisions.');
}finally{rmSync(directory,{recursive:true,force:true});}
