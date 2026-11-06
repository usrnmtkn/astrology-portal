import assert from 'node:assert/strict';
import {invoke,store,providerCalls,syntheticReadings} from '../tests/helpers/planetary-horoscope-api.mts';
import {planetaryEventKey,planetaryEventMatches,planetaryEventFromPosition,planetaryHouse,PLANETARY_HOROSCOPE_PLANETS,PLANETARY_DISPATCH_RECOVERY_DELAY_MS,HOROSCOPE_SIGNS,planetaryReadingsBody,validatePlanetaryReadings} from '../src/shared/planetaryHoroscopes';
import {calculatePlanetaryEvent} from '../api/_lib/planetary-horoscope-facts';
import {planetaryHoroscopeBody} from '../apps/web/src/features/horoscopes/usePlanetaryHoroscopeSources';
import {preparePlanetaryHoroscopeWriting,planetaryWritingHash} from '../src/astro-writing/planetaryHoroscopeWriting.mjs';
import {validatePlanetaryReading} from '../src/astro-writing/planetaryHoroscopeValidation.mjs';

const action=(row:any,action:string,extra:any={})=>invoke('POST',{action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
const open=(date:string,planet='mercury')=>invoke('POST',{action:'open',planet,date,timeZone:'America/New_York'});
const patch=(row:any,body:any)=>invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,...body},'/api/admin/generated-content');
const reader=(row:any)=>invoke('POST',{keys:[row.content_key]},'/api/content-reader');
try{
  assert.equal((await invoke('GET',undefined,'/api/admin/planetary-horoscope-writing','wrong-secret')).status,401);
  assert.equal((await invoke('POST',{action:'generate',id:'missing',expectedUpdatedAt:'missing'})).status,404);
  assert.equal(providerCalls.length,0);
  for(const query of ['planet=mercury&date=2026-02-30&timeZone=UTC','planet=unknown&date=2026-11-05&timeZone=UTC','planet=mercury&date=2026-11-05&timeZone=Invalid'])assert.equal((await invoke('GET',undefined,`/api/admin/planetary-horoscope-writing?${query}`)).status,400);
  const calculated=await invoke('GET',undefined,'/api/admin/planetary-horoscope-writing?planet=mercury&date=2026-11-05&timeZone=America%2FNew_York');
  assert.equal(calculated.status,200,JSON.stringify(calculated));
  const event=calculated.payload.event;
  assert.equal(event.planet,'mercury');assert.equal(event.sign,'scorpio');
  assert(Date.parse(event.startsAt)<Date.parse(event.referenceInstant));assert(Date.parse(event.referenceInstant)<Date.parse(event.endsAt));
  assert.equal(planetaryHouse(event.sign,'aries'),8);
  for(const planet of PLANETARY_HOROSCOPE_PLANETS){
    const facts=await calculatePlanetaryEvent(planet,event.referenceInstant,'America/New_York');
    assert.equal(new Set(HOROSCOPE_SIGNS.map(sign=>planetaryHouse(facts.sign,sign))).size,12);
    const request=preparePlanetaryHoroscopeWriting(facts);
    assert.equal(request.preview.audiences.length,12);assert.equal(request.receipt.ownerApproved,false);
    for(const ref of request.preview.voiceSources){assert.equal(planetaryWritingHash(ref.text),ref.sha256);assert.equal(ref.text.split(/\s+/u).length,ref.wordCount);}
  }
  assert.equal(providerCalls.length,0,'Finding events and plans must be free.');
  const created=await open('2026-11-05');assert.equal(created.status,200,JSON.stringify(created));let row=created.payload.rows[0];
  assert.equal(row.status,'DRAFT');assert.equal((await reader(row)).payload.rows.length,0);
  assert.equal((await open('2026-11-05')).payload.rows[0].id,row.id);
  const inventory=await invoke('GET');assert.equal(inventory.payload.rows[0].inventory_only,true);
  assert(!JSON.stringify(inventory.payload).includes('planetaryGeneration'));
  assert.equal((await invoke('GET',undefined,'/api/admin/generated-content?horoscopeEditions=true&editionInventory=true')).payload.rows.length,0,'Period editions must exclude planetary sets.');
  const before=structuredClone(row);
  await invoke('feedback-enabled',true);assert.equal((await action(row,'prepare')).status,503);assert.equal(providerCalls.length,0);await invoke('feedback-enabled',false);
  assert.equal((await action(row,'generate',{approvedPlanHash:'unreviewed'})).status,409);assert.equal(providerCalls.length,0);
  let result=await action(row,'prepare',{direction:'Synthetic private direction.'});assert.equal(result.status,200,JSON.stringify(result));row=result.payload.rows[0];
  assert.equal((await action(before,'generate',{approvedPlanHash:row.source_snapshot.planetaryGeneration.plan.planHash})).status,409);
  const plan=row.source_snapshot.planetaryGeneration.plan;
  const generated=await action(row,'generate',{approvedPlanHash:plan.planHash});assert.equal(generated.status,202,JSON.stringify(generated));row=generated.payload.rows[0];
  assert.equal(providerCalls.length,1);assert.equal(providerCalls[0].text.format.schema.properties.readings.minItems,12);assert.equal(providerCalls[0].text.format.strict,true);
  assert(providerCalls[0].instructions.includes('PLANETARY EVENT HOROSCOPES'));assert(!providerCalls[0].instructions.includes('SEASONAL SCOPE'));assert(providerCalls[0].input.includes('Synthetic private direction.'));
  assert.equal((await action(row,'generate',{approvedPlanHash:plan.planHash})).status,409);assert.equal(providerCalls.length,1);
  assert.equal((await patch(row,{body:'A newer edit must not overwrite a running request.'})).status,409);
  assert.equal((await patch(row,{ownerAction:'publish-owner-content'})).status,409);
  result=await action(row,'poll');assert.equal(result.status,202);row=result.payload.rows[0];
  result=await action(row,'poll');assert.equal(result.status,200,JSON.stringify(result));row=result.payload.rows[0];
  assert.deepEqual(row.sections.planetaryHoroscopes.passages,syntheticReadings(event));
  const stored:any=store.rows.get(row.id);assert.equal(stored.source_snapshot.planetaryGeneration.history[0].providerResult.status,'completed');
  const receipt=await action(row,'inspect');assert.equal(receipt.status,200);assert.equal(receipt.payload.receipt.history[0].providerResult.status,'completed');
  assert(!JSON.stringify(row).includes('requestHash'),'The editor transport excludes provider requests and raw output.');
  assert.equal((await invoke('GET',undefined,`/api/admin/planetary-horoscope-writing?id=${row.id}`)).payload.rows[0].body,row.body);
  assert.equal((await reader(row)).payload.rows.length,0);
  await invoke('private-record-failure',true);
  const stoppedPublication=await patch(row,{ownerAction:'publish-owner-content'});assert.equal(stoppedPublication.status,503,JSON.stringify(stoppedPublication));
  assert.equal(store.rows.get(row.id)!.status,'DRAFT');assert.equal((await reader(row)).payload.rows.length,0);assert.equal(store.rows.get(row.id)!.body,row.body);
  await invoke('private-record-failure',false);
  const publish=await patch(row,{ownerAction:'publish-owner-content'});assert.equal(publish.status,200,JSON.stringify(publish));row=publish.payload.rows[0];
  const storedLive:any=store.rows.get(row.id);assert(!JSON.stringify(storedLive.source_snapshot).includes('Synthetic private direction.'));
  assert(!JSON.stringify(storedLive.source_snapshot).includes('providerResult'),'The LIVE row itself cannot expose raw writer responses.');
  const privateRecord:any=[...store.rows.values()].find((r:any)=>r.content_key===storedLive.source_snapshot.planetaryGeneration.privateRecordKey);
  assert(privateRecord);assert.equal(privateRecord.status,'ARCHIVED');assert.equal(privateRecord.lane,'reference');
  assert.equal(privateRecord.sections.planetaryWritingRecord.snapshot.planetaryGeneration.history[0].providerResult.status,'completed');
  const liveReceipt=await action(row,'inspect');assert.equal(liveReceipt.payload.receipt.history[0].providerResult.status,'completed');
  assert.equal((await patch(privateRecord,{ownerAction:'publish-owner-content'})).status,409);
  assert.equal((await invoke('POST',{rows:[{contentKey:privateRecord.content_key,surface:'sky',mode:'studio-draft',eventType:'planetary-writing-record',status:'DRAFT',headline:'An invalid overwrite',body:'An invalid overwrite'}]},'/api/admin/generated-content')).status,409);
  assert.equal(store.rows.get(privateRecord.id)!.sections.planetaryWritingRecord.sha256,privateRecord.sections.planetaryWritingRecord.sha256);
  assert.equal((await reader(privateRecord)).payload.rows.length,0);
  const publicResult=await reader(row);assert.equal(publicResult.status,200,JSON.stringify(publicResult));const publicRow=publicResult.payload.rows[0];
  assert.deepEqual(publicRow.sections.planetaryHoroscopes.passages,row.sections.planetaryHoroscopes.passages);
  assert(!JSON.stringify(publicResult).includes('Synthetic private direction'));assert(!JSON.stringify(publicResult).includes('planetaryGeneration'));assert(!JSON.stringify(publicResult).includes('signature'));
  assert.equal((await invoke('POST',{contentKey:row.content_key,surface:'sky',mode:'article',eventType:'planetary-horoscopes',status:'DRAFT',lane:'reference',headline:row.headline,body:row.body,sections:row.sections,facts:row.facts},'/api/admin/generated-content')).status,409,'A duplicate POST cannot overwrite a published set.');
  assert.equal(store.rows.get(row.id)!.body,row.body);
  const position={planet:'Mercury',sign:'Scorpio',transitStart:event.startsAt,transitEnd:event.endsAt};
  for(const sign of HOROSCOPE_SIGNS)assert.equal(planetaryHoroscopeBody(position as any,sign,[publicRow],event.referenceInstant,event.timeZone),syntheticReadings(event).find(p=>p.sign===sign)!.body);
  const revised=structuredClone(row.sections.planetaryHoroscopes);revised.passages[0].body+=' Your revised final sentence stays complete.';
  const fork=await patch(row,{status:'DRAFT',body:planetaryReadingsBody(revised),sections:{planetaryHoroscopes:revised}});assert.equal(fork.status,200,JSON.stringify(fork));
  const revision=fork.payload.rows[0];assert.notEqual(revision.id,row.id);assert.equal(revision.event_type,'horoscope-edition-revision');assert.equal((await reader(row)).payload.rows[0].body,row.body);
  const live=await patch(revision,{ownerAction:'publish-horoscope-edition-revision'});assert.equal(live.status,200,JSON.stringify(live));assert.equal(live.payload.rows[0].body,planetaryReadingsBody(revised));
  const revisedLive=live.payload.rows[0],revisedReceipt=await action(revisedLive,'inspect');
  assert.equal(revisedReceipt.status,200,JSON.stringify(revisedReceipt));
  assert.equal(revisedReceipt.payload.receipt.history[0].providerResult.status,'completed','Republishing a private revision retains the complete writing record.');
  assert.equal(revisedReceipt.payload.receipt.direction,'Synthetic private direction.');
  assert(!JSON.stringify(store.rows.get(revisedLive.id)!.source_snapshot).includes('Synthetic private direction.'),'Republishing still keeps the actual LIVE row private.');
  assert.equal((await patch(revision,{ownerAction:'publish-horoscope-edition-revision'})).status,409);
  const invalid=structuredClone(revised);invalid.passages[0].house=1;assert.throws(()=>validatePlanetaryReadings(invalid,event));
  assert(validatePlanetaryReading({...revised.passages[0],body:'Mercury in Taurus moves through your first house. You keep this sentence.'},event).violations.some((v:any)=>v.category==='horoscope_fact_boundary'));
  // Distinct return visits and years never share a dated reader identity.
  const venusDirect=await calculatePlanetaryEvent('venus','2026-09-20T16:00:00.000Z','America/New_York');
  const venusReturn=await calculatePlanetaryEvent('venus','2026-12-10T17:00:00.000Z','America/New_York');
  assert.equal(venusDirect.sign,'scorpio');assert.equal(venusReturn.sign,'scorpio');assert.notEqual(planetaryEventKey(venusDirect),planetaryEventKey(venusReturn));assert(!planetaryEventMatches(venusDirect,venusReturn));
  const returnPosition={planet:'Venus',sign:'Scorpio',transitStart:venusDirect.startsAt,transitEnd:venusReturn.endsAt,residencyPasses:[{entryDate:venusDirect.startsAt,exitDate:venusDirect.endsAt},{entryDate:venusReturn.startsAt,exitDate:venusReturn.endsAt}]};
  assert.equal(planetaryEventKey(planetaryEventFromPosition(returnPosition,venusReturn.referenceInstant,'Pacific/Auckland')!),planetaryEventKey(venusReturn));
  // A complete paid response with a factual finding remains editable, but cannot publish unchanged.
  await invoke('provider-mode','wrong-facts');
  let held=(await open('2032-11-05')).payload.rows[0];
  for(const step of ['prepare','generate','poll','poll']){
    result=await action(held,step,step==='generate'?{approvedPlanHash:held.source_snapshot.planetaryGeneration.plan.planHash}:{});assert(result.status<300,JSON.stringify(result));held=result.payload.rows[0];
  }
  assert.equal(held.sections.planetaryHoroscopes.passages.filter((p:any)=>p.body).length,12);
  assert.equal((await patch(held,{ownerAction:'publish-owner-content'})).status,422);
  const corrected={schema:'planetary-horoscopes/v1',passages:syntheticReadings(held.facts.planetaryEvent.event)} as const;
  const correctedResult=await patch(held,{body:planetaryReadingsBody(corrected as any),sections:{planetaryHoroscopes:corrected},status:'DRAFT'});assert.equal(correctedResult.status,200,JSON.stringify(correctedResult));
  assert.equal((await patch(correctedResult.payload.rows[0],{ownerAction:'publish-owner-content'})).status,200);
  for(const [index,mode] of ['malformed','wrong-house','incomplete','timeout','missing-id'].entries()){
    await invoke('provider-mode',mode);
    const opened=await open(`202${7+index}-11-05`);let draft=opened.payload.rows[0];
    result=await action(draft,'prepare');assert.equal(result.status,200);draft=result.payload.rows[0];
    result=await action(draft,'generate',{approvedPlanHash:draft.source_snapshot.planetaryGeneration.plan.planHash});
    if(mode==='timeout'||mode==='missing-id'){
      assert.equal(result.status,mode==='timeout'?502:202);const stored:any=store.rows.get(draft.id);assert.equal(stored.source_snapshot.planetaryGeneration.active.state,mode==='timeout'?'starting':'outcome-unknown');
      assert.equal((await action(stored,'generate',{approvedPlanHash:stored.source_snapshot.planetaryGeneration.plan.planHash})).status,409);
      assert.equal((await action(stored,'release',{acknowledgeUnknownOutcome:true})).status,409,'A still-starting request cannot be released.');
      stored.source_snapshot.planetaryGeneration.active.startedAt=new Date(Date.now()-60000).toISOString();
      assert.equal((await action(stored,'release',{acknowledgeUnknownOutcome:true})).status,409,'Response-ID confirmation must have time to finish before release.');
      stored.source_snapshot.planetaryGeneration.active.startedAt=new Date(Date.now()-PLANETARY_DISPATCH_RECOVERY_DELAY_MS-1000).toISOString();
      assert.equal((await action(stored,'release',{acknowledgeUnknownOutcome:false})).status,409);
      const released=await action(stored,'release',{acknowledgeUnknownOutcome:true});assert.equal(released.status,200);assert.equal(released.payload.rows[0].source_snapshot.planetaryGeneration.active,null);
    }else{
      assert.equal(result.status,202);draft=result.payload.rows[0];result=await action(draft,'poll');draft=result.payload.rows[0];result=await action(draft,'poll');draft=result.payload.rows[0];
      assert.equal(draft.sections.planetaryHoroscopes.passages.filter((p:any)=>p.body).length,0);assert(draft.source_snapshot.planetaryGeneration.lastError);
      assert(store.rows.get(draft.id)!.source_snapshot.planetaryGeneration.history[0].providerResult);assert.equal((await reader(draft)).payload.rows.length,0);
    }
  }
  assert.equal(providerCalls.length,7,'Polling and failures never start a replacement writing call.');
  console.log('Planetary horoscope API: calculated visits, governed twelve-reading request, durable response, conflicts, revision publication and private reader boundary passed.');
}finally{await store.close();}
