import assert from 'node:assert/strict';
import {createLogger, createServer} from 'vite';
const logger=createLogger('error'), original=logger.error;
logger.error=(m,o)=>{if(!String(m).includes('WebSocket server error'))original(m,o);};
const server=await createServer({root:process.cwd()+'/apps/web',customLogger:logger,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},appType:'custom',logLevel:'error'});
try {
 const e=await server.ssrLoadModule('/src/services/ephemeris.ts');
 const {preparePersonalReportTiming}=await server.ssrLoadModule('/src/services/personalReportTiming.ts');
 const ref=new Date('2026-09-24T16:00:00Z');
 const make=(id,transitPlanet,natalPoint,natalLongitude,aspect,aspectDegrees)=>({id,transitPlanet,natalPoint,natalLongitude,natalSign:'Pisces',aspect,aspectDegrees,orb:'0.2'});
 const contacts=[make('venus','Venus','Mercury',337,'trine',120),make('moon','Moon','Mercury',337,'conjunction',0),make('north','North Node','Sun',329.4,'conjunction',0),make('south','South Node','Sun',329.4,'opposition',180)];
 const result=await preparePersonalReportTiming(contacts,ref,'America/New_York',e.natalTransitTimingFor);
 const [v,m,n,s]=result.qualifyingTransits;
 assert(v.calculation.repeatContact);
 assert.equal(v.calculation.exactPasses.length,3);
 assert.match(v.window,/October 18, 2026/);
 assert(!v.window.includes('December'),'A return series end is not continuous current activity');
 assert.match(m.window,/September 24, 2026/);
 assert.equal(m.calculation.orbDegrees,2);
 assert.equal(n.calculation.repeatContact,false,'Retrograde node does not imply a repeated exact contact');
 assert.deepEqual(n.calculation.exactPasses,s.calculation.exactPasses,'Opposite nodes describe the same axis contact');
 assert.equal(n.window,s.window);
 const display=await preparePersonalReportTiming([contacts[2]],ref,'America/New_York',async()=>({
   ...result.transits[2].timing,
   exactPasses:[{exactAt:'2026-09-28T01:15:00.000Z',firstMotion:'retrograde',secondMotion:'fixed'}]
 }));
 assert.equal(display.qualifyingTransits[0].calculation.exactPasses[0].dateLabel,"September 27, 2026", "An exact UTC timestamp must carry its local reader date");
 assert.equal(display.qualifyingTransits[0].calculation.exactPasses[0].timeLabel,"9:15 PM EDT");
 assert(!n.window.includes('July'),'Station speed must not extrapolate a false deadline');
 // Actual Swiss case from the browser's synthetic 1990-01-01 noon NY chart:
 // Uranus stations short of the square to the natal Moon. The active window
 // is real even though this visit contains no exact contact.
 const nearMiss=make('uranus-moon','Uranus','Moon',336.0783,'square',90);
 const visits=[];
 for(const date of ['2026-08-01T16:00:00Z','2026-09-13T16:00:00Z']) {
   const visit=await preparePersonalReportTiming([nearMiss],new Date(date),'America/New_York',e.natalTransitTimingFor);
   const fact=visit.qualifyingTransits[0];
   assert.deepEqual(fact.calculation.exactPasses,[],'Entering the orb does not guarantee an exact contact');
   assert.equal(fact.calculation.repeatContact,false);
   assert.equal(visit.transits[0].timing.passIndex,0,'No exact pass exists to index');
   visits.push(fact.calculation);
 }
 for(const edge of ['currentStart','currentEnd']) {
   assert(Math.abs(Date.parse(visits[0][edge])-Date.parse(visits[1][edge]))<60_000,'Different reference dates must resolve the same orb window');
   const boundary=Date.parse(visits[0][edge]);
   const direction=edge==='currentStart'?-1:1;
   for(const offset of [-1,1]) {
     const sky=await e.getAstrodienstSky(undefined,new Date(boundary+direction*offset*3_600_000),{includeDailyEvents:false,includeTransitWindows:false});
     const longitude=sky.positions.find(position=>position.planet==='Uranus').longitude;
     const separation=Math.abs(((longitude-nearMiss.natalLongitude+540)%360)-180);
     const orb=Math.abs(separation-90);
     assert.equal(orb>visits[0].orbDegrees,offset===1,'Window edges must be real Swiss orb crossings');
   }
 }
 await assert.rejects(()=>preparePersonalReportTiming([nearMiss],new Date(Date.parse(visits[0].currentEnd)+86_400_000),'America/New_York',e.natalTransitTimingFor),/could not be verified/,
   'An inactive contact must not receive invented boundaries');
 await assert.rejects(()=>preparePersonalReportTiming([{...contacts[0],natalLongitude:undefined}],ref,'America/New_York',e.natalTransitTimingFor),/could not be verified/,
   'Missing timing must stop before paid submission, not become a false end date in source prose');
 await assert.rejects(()=>preparePersonalReportTiming(contacts,ref,'America/New_York',async()=>null),/has not been submitted/);
 console.log('Calculated report timing: actual orb, exact passes, continuous window, opposing nodes and missing-date handling passed.');
}finally{await server.close();}
