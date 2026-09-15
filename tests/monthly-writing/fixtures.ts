import { createHash } from 'node:crypto';
import type { MonthlyFacts, MonthlyEvent } from '../../src/monthly-writing/model';
/** Synthetic editor fixture; never imported by runtime calculation or content. */
export function monthlyFixture(month='2026-09',timeZone='America/New_York'): MonthlyFacts {
  const event=(id:string,type:MonthlyEvent['type'],day:number,planet:string,sign:string):MonthlyEvent=>({id:`${month}-${id}`,type,date:`Fixture ${day}`,startsAt:`${month}-${String(day).padStart(2,'0')}T12:00:00.000Z`,planet,sign,clause:`Fixture ${planet} event in ${sign}`,planets:[planet],aspect:'',direction:'',sourceIds:[`sky-placement-${planet.toLowerCase()}-${sign.toLowerCase()}`],reason:'Synthetic editorial priority',score:day});
  const data={month,timeZone,monthName:month.endsWith('-09')?'September':'October',year:month.slice(0,4),openingSeasonSign:month.endsWith('-09')?'Virgo':'Libra',closingSeasonSign:month.endsWith('-09')?'Libra':'Scorpio',seasonChangeDate:'Fixture 22',seasonChangeAt:`${month}-22T12:00:00.000Z`,events:[event('lead','station',10,'Uranus','Gemini'),event('support','ingress',8,'Venus','Scorpio'),event('new','new-moon',9,'Moon','Virgo'),event('full','full-moon',25,'Moon','Aries')]};
  return {...data,fingerprint:createHash('sha256').update(JSON.stringify(data)).digest('hex'),calculatedAt:'2026-09-01T00:00:00.000Z',provenance:{source:'SYNTHETIC TEST FIXTURE ONLY',eclipseClassification:'SYNTHETIC TEST FIXTURE ONLY'}};
}
