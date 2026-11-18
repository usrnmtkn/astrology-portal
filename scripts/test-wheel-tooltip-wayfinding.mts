import assert from 'node:assert/strict';
import {getAstrodienstSky} from '../apps/web/src/services/ephemeris';
import {zodiacWheelFacts} from '../apps/web/src/services/zodiacWheelFacts';
import {wheelHouseForSource,wheelPreviewRuler,wheelSourceForHouse} from '../apps/admin/src/wheelTooltipWayfinding';
import {WheelTooltipEditorSession} from '../apps/admin/src/wheelTooltipEditorSession';
import {wheelTooltipSourceDraft} from '../apps/admin/src/wheelTooltipSources';
import {wheelTooltipTemplates,wheelTooltipPreviewTemplates} from '../apps/web/src/content/wheelTooltipCopy';
import {studioApiStore} from '../tests/helpers/studio-api-store';

for(const hour of ['08','20']){
  const sky=await getAstrodienstSky({label:'Synthetic City',latitude:0,longitude:0,timeZone:'UTC'},new Date(`1990-01-01T${hour}:00:00Z`),{includeDailyEvents:false,includeTransitWindows:false,includeAspectTiming:false});
  const snapshot={...sky,birthTimeKnown:true},before=JSON.stringify(snapshot),facts=zodiacWheelFacts(snapshot,'natal');
  const ruler=wheelPreviewRuler(facts,2)!;
  assert.equal(ruler.name,hour==='08'?'Jupiter':'Mercury');assert.equal(ruler.house,6);
  assert.equal(wheelSourceForHouse('ruler/rising',facts,2),'ruler/house');
  assert.equal(wheelSourceForHouse('ruler/house',facts,1),'ruler/rising');
  assert.equal(wheelSourceForHouse('ruler/title-own',facts,2),'ruler/title');
  const own=wheelHouseForSource('ruler/title-own',facts,2);
  if(own!==null)assert.equal(wheelPreviewRuler(facts,own)!.house,own);
  assert.equal(wheelHouseForSource('ruler/rising',facts,2),1);
  assert.equal(wheelPreviewRuler(facts,0),undefined);
  assert.equal(wheelHouseForSource('ruler/title',zodiacWheelFacts(snapshot,'natal',true),2),null);
  assert.equal(JSON.stringify(snapshot),before);
}

const key='cms/wheel-tooltip/ruler/title',other='cms/wheel-tooltip/ruler/rising';
const store=await studioApiStore([],{uuidIds:true});
try{
  const {id:_id,...source}=wheelTooltipSourceDraft(key);
  const created=await store.call({method:'POST',body:{...source,eventType:'cms-surface-override'}});
  assert.equal(created.status,200);
  const saved=created.payload.rows[0];
  const draft={...wheelTooltipSourceDraft(key),id:saved.id,updatedAt:saved.updated_at,body:saved.body};
  const baseline=JSON.stringify(draft),session=new WheelTooltipEditorSession();
  let loads=0;
  const opened=await session.open(key,async()=>{loads++;return {draft,baseline,savedInput:baseline,row:saved};});
  const edited={...opened,draft:{...opened.draft,body:opened.draft.body+' Unsaved title ending.'}};
  session.remember(edited);
  const another=wheelTooltipSourceDraft(other),anotherBaseline=JSON.stringify(another);
  await session.open(other,async()=>({draft:another,baseline:anotherBaseline,savedInput:anotherBaseline,row:null}));
  const returned=await session.open(key,async()=>{throw new Error('Cached source must not discard the unsaved body');});
  assert.equal(loads,1);assert.equal(returned.draft.body,edited.draft.body);assert.equal(returned.baseline,baseline);
  assert.equal(session.hasUnsavedExcept(other),true);assert.equal(session.hasUnsavedExcept(key),false);
  const templates=wheelTooltipPreviewTemplates(wheelTooltipTemplates(),session.previewBodies());
  assert.equal(templates('ruler/title'),edited.draft.body);
  assert.equal(wheelTooltipTemplates()('ruler/title'),source.body);
  const invalid=wheelTooltipPreviewTemplates(templates,[{key,body:'{{unknown}}'}]);
  assert.equal(invalid('ruler/title'),null);
  assert.equal((await store.call({method:'rows'})).length,1,'Navigation never creates another source row');
  assert.equal((await store.call({method:'rows'}))[0].body,saved.body,'Navigation never saves pending copy');
  const newer=await store.call({method:'PATCH',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,body:saved.body+' Newer owner edit.'}});
  assert.equal(newer.status,200);
  const stale=await store.call({method:'PATCH',body:{id:returned.draft.id,expectedUpdatedAt:returned.draft.updatedAt,body:returned.draft.body}});
  assert.equal(stale.status,409,'Returning to a cached editor keeps its original CAS version');
  assert.equal((await store.call({method:'rows'}))[0].body,saved.body+' Newer owner edit.');
}finally{store.close();}
console.log('Wheel wayfinding: direct Swiss 2nd→6th facts at two instants, source-family matching, immutable inputs, retained unsaved drafts, isolated overlays and actual-handler CAS protection passed.');
