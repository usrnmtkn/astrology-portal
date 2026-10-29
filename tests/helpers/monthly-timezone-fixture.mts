import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,type HoroscopePeriod} from '../../apps/web/src/content/horoscopeEditions.mjs';

export function monthlyTimeZoneFixture(id:number,period:HoroscopePeriod,timeZone:string,startsAt:string,endsAt:string,label:string) {
 const edition=emptyHoroscopeEdition({period,audience:period==='monthly'?'collective':'rising',timeZone,startsAt,endsAt,...(period==='seasonal'?{seasonSign:'libra'}:{})});
 for(const passage of edition.passages){passage.headline=`${label} fixture`;passage.body=`The complete ${label} fixture opens here.\n\nThe complete ${label} fixture ends here.  `;}
 return {id:`00000000-0000-4000-8000-${String(id).padStart(12,'0')}`,content_key:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',event_type:'horoscope-edition',status:'LIVE',lane:'serving',review_state:null,target_date:null,provider:'manual-admin',headline:label,summary:'',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{},source_snapshot:{privateFixture:'PRIVATE MONTHLY SOURCE'},updated_at:'2026-10-01T12:00:00.000Z'};
}

export function monthlyTimeZoneFixtures() {
 return [
  monthlyTimeZoneFixture(1,'monthly','America/New_York','2026-09-01T04:00:00.000Z','2026-10-01T04:00:00.000Z','September New York'),
  monthlyTimeZoneFixture(2,'monthly','America/New_York','2026-10-01T04:00:00.000Z','2026-11-01T04:00:00.000Z','October New York'),
  monthlyTimeZoneFixture(3,'monthly','America/New_York','2026-11-01T04:00:00.000Z','2026-12-01T05:00:00.000Z','November New York')
 ];
}
