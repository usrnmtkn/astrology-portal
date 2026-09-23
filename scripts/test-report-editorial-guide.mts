import assert from 'node:assert/strict';
import { selectDistinctFriendTransits } from '../api/_lib/friend-report-selection.ts';
import { prepareSourceCompletion, assertReusableSourceCompletion } from '../api/_lib/transit-reading-source-completion.ts';
import { friendReadingContexts } from '../api/_lib/friend-reading-context.ts';
import { friendTransitReadingApprovedReaderText, friendTransitReadingPrompt, type FriendTransitReadingBrief } from '../api/_lib/friend-transit-reading.ts';
const transit = { id:'saturn-trine-mercury',title:'Saturn trine Mercury',durationLabel:'2M',rangeLabel:'August 15, 2026 - October 30, 2026',timingLabel:'Current contact',summary:'Preview',orb:'1',detailAvailable:true,readerSections:[{body:'Complete protected source.\n\nDistinct final sentence.',sourceKeys:['synthetic-source']}],evidence:{transitPlanet:'Saturn',aspect:'trine',natalPoint:'Mercury',natalSign:'Libra',timingBonuses:[],contentKeys:['synthetic-source']}};
const brief: FriendTransitReadingBrief = { schema:'tldr.friend-transits-brief.v1',friendName:'Morgan',dateLabel:'September 23, 2026',primaryThemes:[transit],longerCycles:[structuredClone(transit)],houseContext:[],daily:null,activePatterns:[],relationshipActivations:[{id:'relationship',headline:'Connection',activationBody:'You and Morgan have a supplied connection.',effectBody:'You may find it easier to explain yourself.'}],hasAnyTransit:true,counts:{} };
const selected = selectDistinctFriendTransits(brief);
assert.equal(selected.primaryThemes.length,1); assert.equal(selected.longerCycles.length,0);
assert.deepEqual(selected.duplicates,[{path:'longerCycles.0',retainedPath:'primaryThemes.0'}]);
for (const edit of [
 (t:any)=>{t.id='return-contact';}, (t:any)=>{t.rangeLabel='January 3, 2027 - March 2, 2027';},
 (t:any)=>{t.evidence.natalHouse=9;}, (t:any)=>{t.evidence.transitSign='Aries';},
 (t:any)=>{t.evidence.direction='separating';}, (t:any)=>{t.readerSections[0].body+=' Additional source.';},
 (t:any)=>{t.readerSections[0].sourceKeys=['different-version'];}, (t:any)=>{delete t.readerSections;},
 (t:any)=>{t.rangeLabel='';}
]) { const variant=structuredClone(brief); edit(variant.longerCycles[0]); assert.equal(selectDistinctFriendTransits(variant).longerCycles.length,1); }
assert.equal(friendTransitReadingApprovedReaderText(brief).longerCycles.length,0);
const current=prepareSourceCompletion(brief,'Synthetic outlook');
assert.equal(current.draft.body.split(transit.readerSections[0].body).length-1,1);
assert(current.draft.body.includes('## Between you and Morgan\n\nYou and Morgan'));
assert.deepEqual(current.receipt.duplicateReadings,selected.duplicates);
for(const unit of current.receipt.units) { const source=unit.path.split('.').reduce((v:any,k)=>v[k],brief); assert.equal(current.draft[unit.field].slice(unit.start,unit.end),source); }
const saved=(x:any)=>({...x.draft,provider:'source',source_snapshot:{reportDelivery:{...x.receipt,reason:'Synthetic fallback'}}});
assert.doesNotThrow(()=>assertReusableSourceCompletion(saved(current),current));
const legacy=current.legacy!(); assert.equal(legacy.draft.body.split(transit.readerSections[0].body).length-1,2);
assert(!legacy.draft.body.includes('## Between'));
assert.doesNotThrow(()=>assertReusableSourceCompletion(saved(legacy),current));
const tampered=saved(current); tampered.source_snapshot.reportDelivery.duplicateReadings=[];
assert.throws(()=>assertReusableSourceCompletion(tampered,current));
const contexts=friendReadingContexts('Morgan has personal conditions.\n\n## Between you and Morgan\n\nYou can explain yourself.\n\nYour connection may feel easier.\n\nSeparately, Morgan has personal conditions. Your work is affected.', 'Morgan',true);
assert.deepEqual(contexts.map(c=>c.relationship),[false,true,true,false,false]);
assert(friendReadingContexts('## Between you and Morgan\n\nYou can explain yourself.','Morgan',false).every(c=>!c.relationship));
assert(friendReadingContexts('## Between you and Someone else\n\nYou can explain yourself.','Morgan',true).every(c=>!c.relationship));
const prompt=friendTransitReadingPrompt({brief,headline:'Synthetic outlook'});
assert(prompt.includes('CURRENT OWNER REPORT DIRECTION'));
assert(prompt.includes('It need not repeat a prewritten scene verbatim'));
assert(!prompt.includes('Aim for 120-220'));
console.log('Report editorial, identity, protected-source, legacy-receipt, and relationship-section tests passed.');
