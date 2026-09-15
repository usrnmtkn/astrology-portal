import assert from 'node:assert/strict';
import {calculateMonthlyTemplateFacts,monthlyFactsFromCalendar} from '../api/_lib/monthly-template-facts';
import {getLunarCalendarMonth} from '../apps/web/src/services/ephemeris';
import {zonedDateTimeToUtc} from '../apps/web/src/services/timezones';
import {monthlyTemplateStarter} from '../src/monthly-writing/starter';
import {createMonthlyEdition,renderMonthly} from '../src/monthly-writing/model';
for(const [month,zone] of [['2026-09','America/New_York'],['2027-09','UTC'],['2026-03','America/Los_Angeles']]) {
 const facts=await calculateMonthlyTemplateFacts(month,zone);
 const direct=await getLunarCalendarMonth({label:'Synthetic geocentric test',latitude:0,longitude:0,timeZone:zone},zonedDateTimeToUtc(`${month}-15`,'12:00 PM',zone),{detail:'full'});
 for(const event of facts.events){const expected=direct.events.find(item=>item.id===event.id)!;assert(expected);assert.equal(event.startsAt,expected.startsAt);assert.equal(event.date,new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'long',day:'numeric'}).format(new Date(expected.startsAt)));if(event.type.includes('eclipse')){assert.equal(event.type,`${expected.eclipseType}-eclipse`);assert.deepEqual(event.sourceIds,[],'Missing eclipse meaning must not be invented or mapped to an ordinary Moon source');}}
 const newMoon=facts.events.filter(event=>event.type==='new-moon'||event.type==='solar-eclipse');assert(newMoon.length>=1);
 assert.throws(()=>monthlyFactsFromCalendar({...direct,days:direct.days.slice(8)},month,zone),/full selected/);
 assert.throws(()=>monthlyFactsFromCalendar({...direct,timeZone:'invalid'},month,zone),/timezone/);
 const edition=createMonthlyEdition(facts,monthlyTemplateStarter());
 if(month==='2026-09'){
  assert.equal(facts.openingSeasonSign,'Virgo');assert.equal(facts.closingSeasonSign,'Libra');assert.equal(facts.seasonChangeDate,'September 22');assert(!renderMonthly(facts,edition).text.includes('eclipse'));assert(!facts.events.some(event=>event.type==='aspect'&&event.planets.includes('Moon')));
  assert(![edition.leadEventId,...edition.supportingEventIds].some(id=>facts.events.find(event=>event.id===id)?.planet==='Lilith'));
 }
}
console.log('PASS monthly facts: canonical Swiss calculation for two years, three timezones, local dates, lunar/eclipse separation, complete-month validation and distinct major-event selection. No ephemeris algorithms changed.');
