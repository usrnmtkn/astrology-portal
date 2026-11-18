import assert from "node:assert/strict";
import { calculateRelationshipForecastDay, connectForecastContacts, forecastAnnualTiming, forecastMainThemes, forecastMoodContact, rateRelationshipContacts, relationshipForecastDates, type ForecastContact, type NatalForecastInput } from "../apps/web/src/services/relationshipForecast.ts";
import { relationshipForecastDayFor } from "../apps/web/src/services/ephemeris.ts";

const contact=(id:string,channel:ForecastContact["channel"],units:number):ForecastContact=>({id,channel,units,planet:id,target:"Venus",aspect:"sextile",orb:0,exactAt:[],continuesFromPreviousDay:false,continuesIntoNextDay:false,
  owner:"reader",targetLongitude:0,transitLongitude:60,peakAt:"2026-10-25T12:00:00Z",activeIntervals:[["2026-10-25T10:00:00Z","2026-10-25T14:00:00Z"]],timeLord:false,retrograde:false,connections:[{id:"synthetic-link",readerPoint:"Venus",friendPoint:"Mars",aspect:"trine",orb:1,directContactId:"opposite"}]});
assert.equal(rateRelationshipContacts([]).rating,"quiet");
assert.equal(rateRelationshipContacts([contact("a","flow",100)]).rating,"easy");
assert.equal(rateRelationshipContacts([contact("a","friction",100)]).rating,"tense");
assert.equal(rateRelationshipContacts([contact("a","flow",100),contact("b","friction",49)]).rating,"easy");
assert.deepEqual(rateRelationshipContacts([contact("a","flow",100),contact("b","friction",50)]).drivers,["a","b"]);
assert.equal(rateRelationshipContacts([contact("a","flow",100),contact("b","friction",50)]).rating,"mixed");
assert.equal(rateRelationshipContacts([contact("a","unrated",125),contact("b","flow",100)]).rating,"active");
assert.equal(rateRelationshipContacts([contact("a","flow",29)]).rating,"active");
assert.equal(rateRelationshipContacts([{...contact("a","friction",200),connections:[]}]).rating,"active","Personal pressure alone never makes the pair Tense.");
assert.equal(rateRelationshipContacts([contact("a","flow",100),{...contact("a","flow",100),id:"same-sky-event"}]).flow,100,"Several synastry links cannot multiply the same moving planet's contribution.");
assert.deepEqual(relationshipForecastDates("2026-12-31T23:30:00Z","Pacific/Auckland"),["2027-01-01","2027-01-02","2027-01-03"]);

const input=(longitude:number):NatalForecastInput=>({id:"synthetic",people:[{owner:"reader",birthDate:"1990-10-26",ascendant:"Aries",targets:[{planet:"Venus",longitude}]}],synastry:[]});
const pair=input(0);
assert.deepEqual(forecastAnnualTiming(pair.people[0],"2026-10-25"),{owner:"reader",house:12,sign:"Pisces",lordOfYear:"Jupiter"});
assert.deepEqual(forecastAnnualTiming(pair.people[0],"2026-10-26"),{owner:"reader",house:1,sign:"Aries",lordOfYear:"Mars"},"Profection changes on the birthday, not January 1.");
assert.equal(forecastAnnualTiming({...pair.people[0],birthDate:""},"2026-10-25"),null);
assert.equal(forecastAnnualTiming({...pair.people[0],ascendant:"Aquarius",birthDate:"2002-10-26"},"2026-10-26")?.lordOfYear,"Saturn","Traditional rulers remain canonical.");
const lord={...contact("lord","flow",60),planet:"Mercury",timeLord:true};
assert.deepEqual(forecastMainThemes([contact("slow","friction",200),lord]),["lord"],"The active annual ruler prioritizes the personal main theme.");
assert.equal(forecastMoodContact({...lord,planet:"Mars",target:"Moon",aspect:"square"}),true);
assert.equal(forecastMoodContact({...lord,planet:"Mars",target:"Moon",aspect:"trine"}),false);
const synastry=[{id:"link",readerPoint:"Venus",friendPoint:"Mars",aspect:"trine",orb:0}];
const reader={...contact("reader-event","friction",100),planet:"Mars"};
const friend={...reader,id:"friend-event",owner:"friend" as const,target:"Mars"};
assert.equal(connectForecastContacts([reader],synastry)[0].connections[0].directContactId,undefined,"Synastry alone does not imply a direct transit to the friend.");
assert.equal(connectForecastContacts([reader,friend],synastry)[0].connections[0].directContactId,friend.id);
assert.equal(connectForecastContacts([reader,{...friend,activeIntervals:[["2026-10-25T18:00:00Z","2026-10-25T20:00:00Z"]]}],synastry)[0].connections[0].directContactId,undefined,"Two contacts exact on one day need not overlap.");
for(const [date,hours] of [["2026-03-08",23],["2026-11-01",25]] as const) {
  const [{day}]=calculateRelationshipForecastDay([pair],date,"America/New_York",()=>17);
  assert.equal((Date.parse(day.end)-Date.parse(day.start))/3_600_000,hours);
  assert.equal(day.rating,"quiet");
}
// A fast Moon crosses exact just after local midnight then leaves the noon orb.
const start=Date.parse("2026-10-21T04:00:00Z");
const [{day:early}]=calculateRelationshipForecastDay([pair],"2026-10-21","America/New_York",(planet,t)=>planet==="Moon"?(60+(t-start-60_000)/86_400_000*14)%360:17);
const moon=early.contacts.find(c=>c.planet==="Moon"&&c.aspect==="sextile")!;
assert.equal(moon.units,35);assert.equal(moon.orb,0);
assert.ok(Math.abs(Date.parse(moon.exactAt[0])-(start+60_000))<=20);
assert.equal(moon.continuesFromPreviousDay,true);assert.equal(moon.continuesIntoNextDay,false);
const [{day:pointDay}]=calculateRelationshipForecastDay([{...pair,people:[{...pair.people[0],targets:[{planet:"Chiron",longitude:0},{planet:"Lilith",longitude:150},{planet:"North Node",longitude:120}]}]}],"2026-10-21","America/New_York",(planet,t)=>planet==="Moon"?60+(t-start-60_000)/86_400_000*14:17);
for(const target of ["Chiron","Lilith","North Node"]) assert(pointDay.contacts.some(c=>c.planet==="Moon"&&c.target===target&&c.exactAt.length),`Exact Moon contact to ${target} is retained.`);
for (const offset of [60,65]) {
  const both:NatalForecastInput={...pair,people:[pair.people[0],{...pair.people[0],owner:"friend",targets:[{planet:"Mars",longitude:offset}]}],
    synastry:[{id:"actual-endpoints",readerPoint:"Venus",friendPoint:"Mars",aspect:"sextile",orb:offset-60}]};
  const [{day}]=calculateRelationshipForecastDay([both],"2026-10-21","America/New_York",(planet,t)=>planet === "Moon" ? ((t-start-60_000)/86_400_000*14+360)%360 : 17);
  const endpoint=day.contacts.find(c=>c.owner === "reader" && c.planet === "Moon" && c.aspect === "conjunction")!;
  assert.equal(Boolean(endpoint.connections[0].directContactId),offset === 60,"Real searched orb intervals distinguish simultaneous activation from different peaks on the same date.");
}
// Orb 0.5 at a station minimum, no exact pass: don't invent an exact timestamp.
const [{day:station}]=calculateRelationshipForecastDay([pair],"2026-10-21","America/New_York",(planet,t)=>planet==="Saturn"?90.5+((t-start-43_200_000)/86_400_000)**2:17);
const saturn=station.contacts.find(c=>c.planet==="Saturn"&&c.aspect==="square")!;
assert.ok(Math.abs(saturn.orb-.5)<1e-8);assert.equal(saturn.units,125);assert.deepEqual(saturn.exactAt,[]);
assert.equal(saturn.continuesFromPreviousDay,true);assert.equal(saturn.continuesIntoNextDay,true);
// Boundary exact belongs to the following date only; circular 359→0 is handled.
for(const date of ["2026-10-21","2026-10-22"]) {
  const [{day}]=calculateRelationshipForecastDay([pair],date,"America/New_York",(planet,t)=>planet==="Moon"?((t-start-86_400_000)/86_400_000*14+360)%360:17);
  const c=day.contacts.find(c=>c.planet==="Moon"&&c.aspect==="conjunction")!;
  assert.equal(c.exactAt.length,date.endsWith("21")?0:1);
}
assert.throws(()=>calculateRelationshipForecastDay([pair],"2026-10-21","UTC",()=>NaN),/invalid position/);

// Independent handoff Swiss Ephemeris reference: fixed synthetic natal
// target, not a real person's birth data. Check continuing Uranus on all dates.
const fixed=[input(5.680329019223109)];
for(const [date,orb,units] of [["2026-10-21",.6394700035407368,104],["2026-10-22",.6705410529898472,99],["2026-10-23",.7021940219813132,95]] as const) {
  const [{day}]=await relationshipForecastDayFor(fixed,date,"America/New_York");
  const c=day.contacts.find(c=>c.planet==="Uranus"&&c.aspect==="sextile")!;
  assert.ok(c,`${date}: continuing Uranus retained`);assert.ok(Math.abs(c.orb-orb)<.00002,`${date}: Swiss orb matches independent reference`);
  assert.equal(c.units,units);assert.equal(c.continuesFromPreviousDay,true);assert.equal(c.continuesIntoNextDay,true);
}
console.log("Natal/synastry forecast: personal vs pair ratings, overlapping independently calculated contacts, no double-counting, birthday profections, traditional rulers, mood callouts, full-day Moon, station, midnight, DST and three independent Swiss reference days passed.");
