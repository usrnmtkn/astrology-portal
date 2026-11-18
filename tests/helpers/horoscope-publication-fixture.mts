import {createHash} from 'node:crypto';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';

// Synthetic language exercises the failed claim shapes without storing owner copy.
export const seasonalClaimBodies:Record<string,string>={
 cancer:'You can review your plans. On October 18, the Capricorn First Quarter Moon moves through your seventh house. Your fixture reading ends here.',
 leo:'You can review your plans. Mercury enters Scorpio and your fourth house on September 30, and Venus stations retrograde there on October 3. Your fixture reading ends here.',
 virgo:'You can review your plans. The Sun enters Libra on September 22 in your second house. Libra compares; your second house counts. Your fixture reading ends here.',
 scorpio:'You can review your plans. The Sun enters Libra on September 22 in your twelfth house. In the twelfth house, you can consider the details. Your fixture reading ends here.',
 sagittarius:'You can review your plans. Mercury enters Scorpio in your twelfth house on September 30, and Venus stations retrograde in Scorpio in that same house on October 3. Your fixture reading ends here.',
 capricorn:'You can review your plans. On October 18, the First Quarter Moon in Capricorn moves through your first house, following the New Moon. Your fixture reading ends here.',
 aquarius:'You can review your plans. Mercury enters Scorpio in your tenth house on September 30, followed by Venus stationing retrograde in Scorpio in that same tenth house on October 3. Your fixture reading ends here.'
};

export async function createSeasonalPublicationFixture(call:(message:any)=>Promise<any>){
 const packet=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=seasonal&date=2026-09-24&timeZone=America/New_York'});
 if(packet.status!==200)throw new Error('Fixture facts unavailable');
 const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 for(const passage of edition.passages){passage.headline=`${passage.sign} fixture`;passage.body=seasonalClaimBodies[passage.sign]??`You can read your ${passage.sign} fixture opening. Your fixture reading ends here.`;}
 const readings=Object.fromEntries(edition.passages.map(p=>[p.sign,{bodyHash:createHash('sha256').update(horoscopeCanonicalJson({headline:p.headline,body:p.body})).digest('hex'),lint:{version:'horoscope-facts/v3',violations:seasonalClaimBodies[p.sign]?[{category:'horoscope_fact_boundary',detail:'Synthetic obsolete claim warning.'}]:[]}}]));
 return call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic seasonal publication',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:packet.payload.brief,signature:packet.payload.signature}},sourceSnapshot:{horoscopeGeneration:{readings}}}});
}

export const monthlyAspectBody='You can read the complete monthly fixture opening. Venus squares Pluto on October 20. You can consider the same details. This square can help you review the fixture.\n\nMercury, now retrograde, squares Mars again on October 30. Your complete monthly fixture ends here.';
export async function createMonthlyAspectPublicationFixture(call:(message:any)=>Promise<any>){
 const packet=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=monthly&date=2026-10-01&timeZone=America/New_York'});
 if(packet.status!==200)throw new Error('Fixture facts unavailable');
 const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 const passage=edition.passages[0];passage.headline='Monthly aspect fixture';passage.body=monthlyAspectBody;
 const readings={overview:{bodyHash:createHash('sha256').update(horoscopeCanonicalJson({headline:passage.headline,body:passage.body})).digest('hex'),lint:{version:'horoscope-facts/v6',violations:[{category:'horoscope_fact_boundary',detail:'Name both planets with each aspect so it can be checked against the calculated events.'}]}}};
 return call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic monthly publication',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:packet.payload.brief,signature:packet.payload.signature}},sourceSnapshot:{horoscopeGeneration:{readings}}}});
}

export const weeklyAspectBodies:Record<string,string>={
 cancer:'You can review the fixture. Mercury forms a conjunction with retrograde Venus in Scorpio on Tuesday. Your weekly fixture ends here.',
 sagittarius:'You can review the fixture. Venus in your 12th house of hidden things squares Mars in your 9th house of beliefs on Saturday. Your weekly fixture ends here.',
 capricorn:'You can review the fixture. Retrograde Venus in your 11th house of community squares Mars in your 8th house of shared resources on Saturday. Your weekly fixture ends here.'
};
// Exact owner-requested parser regressions; syntax examples, not voice evidence.
export const weeklyAspectParserCases=[
 {sign:'aries',body:'On Friday Mars, your ruling planet, trines Saturn in your sign.',planets:['mars','saturn'],aspect:'trine'},
 {sign:'leo',body:'The same day the Sun, your ruling planet, sextiles Jupiter in your sign.',planets:['sun','jupiter'],aspect:'sextile'},
 {sign:'gemini',body:'Mars in your 3rd house trines retrograde Saturn in your 11th house of friends and groups.',planets:['mars','saturn'],aspect:'trine'},
 {sign:'sagittarius',body:'The Sun in your 11th house of friends sextiles Jupiter, your ruling planet, in your 9th house of beliefs.',planets:['sun','jupiter'],aspect:'sextile'},
 {sign:'aquarius',body:'Mars in your 7th house of partners trines Saturn, your traditional ruler, in your 3rd house of conversations.',planets:['mars','saturn'],aspect:'trine'},
 {sign:'scorpio',body:'On Friday Mars, your ruling planet, trines Saturn from your 10th house of career to your 6th house of daily work.',planets:['mars','saturn'],aspect:'trine'},
 {sign:'taurus',body:'Venus, your ruling planet, is retrograde in your 7th house.',planets:[],aspect:null},
 {sign:'aries',body:'Sunday’s First Quarter Moon in Capricorn lands in your 10th house.',planets:[],aspect:null}
];
export const weeklyRulerBodies:Record<string,string>={
 ...Object.fromEntries([...new Set(weeklyAspectParserCases.map(c=>c.sign))].map(sign=>[sign,`You can review the fixture. ${weeklyAspectParserCases.filter(c=>c.sign===sign).map(c=>c.body).join(' ')} Your weekly fixture ends here.`])),
 pisces:'You can review the fixture. The Sun sextiles Jupiter, your traditional ruler, in your sixth house of daily work. Your weekly fixture ends here.'
};
export async function createWeeklyAspectPublicationFixture(call:(message:any)=>Promise<any>,rulerClaims=false){
 const packet=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=${rulerClaims?'2026-10-12':'2026-10-05'}&timeZone=America/New_York`});
 if(packet.status!==200)throw new Error('Fixture facts unavailable');
 const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 for(const passage of edition.passages){passage.headline=`${passage.sign} weekly fixture`;passage.body=(rulerClaims?weeklyRulerBodies:weeklyAspectBodies)[passage.sign]??`You can read your ${passage.sign} weekly fixture opening. Your weekly fixture ends here.`;}
 const readings=Object.fromEntries(edition.passages.map(p=>[p.sign,{bodyHash:createHash('sha256').update(horoscopeCanonicalJson({headline:p.headline,body:p.body})).digest('hex'),lint:{version:'horoscope-facts/v7',violations:weeklyAspectBodies[p.sign]?[{category:'horoscope_fact_boundary',detail:'Name both planets with each aspect so it can be checked against the calculated events.'}]:[]}}]));
 return call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic weekly publication',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:packet.payload.brief,signature:packet.payload.signature}},sourceSnapshot:{horoscopeGeneration:{readings}}}});
}

// Synthetic claims reproduce motion/placement asides, a shared grammatical
// subject, and the two different placements of one planet within a week.
export const weeklyContextBodies:Record<string,string>={
 aries:'On Tuesday Venus, retrograde in your 8th house of shared money, squares Pluto in your 11th house of groups. On Friday the Sun enters Scorpio in your 8th house, and that same night it meets Venus, which is still retrograde. On Sunday Venus backs into your 7th house of partners.',
 taurus:'Venus, retrograde in your 7th house of partners, squares Pluto in your 10th house. The Sun meets retrograde Venus there. On Sunday Venus, your ruling planet, moves retrograde into Libra and your 6th house.',
 gemini:'Venus, retrograde in your 6th house of routines, squares Pluto in your 9th house. On Sunday Venus, still retrograde, moves back into Libra in your 5th house.',
 cancer:'Venus, retrograde in your 5th house of creativity, squares Pluto in your 8th house. On Friday the Sun enters Scorpio in your 5th house too and meets retrograde Venus that night. On Sunday Venus, still retrograde, enters Libra in your 4th house.',
 leo:'Venus squares Pluto in your 7th house. The Sun meets retrograde Venus. On Sunday Venus, still retrograde, moves back into Libra in your 3rd house.',
 virgo:'Venus, retrograde in your 3rd house of conversations, squares Pluto in your 6th house. The Sun meets Venus, retrograde, in the same house. Venus, still retrograde, enters Libra and your 2nd house.',
 libra:'Venus, retrograde in Scorpio in your 2nd house of income, squares Pluto in your 5th house. The Sun enters Scorpio in your 2nd house, and it meets retrograde Venus later that night. Venus, your ruling planet, moves back into your sign while still retrograde, in your 1st house.',
 scorpio:'Venus, retrograde in your sign, squares Pluto in your 4th house. The Sun enters your sign, and by that night it meets Venus, still retrograde, in your 1st house. Venus, retrograde, backs into Libra in your 12th house.',
 sagittarius:'Venus is retrograde in your 12th house, and on Tuesday it squares Pluto in your 3rd house. The Sun enters Scorpio in your 12th house, and by that night it meets retrograde Venus there. Retrograde Venus enters Libra and your 11th house.',
 capricorn:'Venus, retrograde in your 11th house of groups, squares Pluto in your 2nd house. The Sun enters Scorpio in your 11th house too, and it meets retrograde Venus that night. Venus, still retrograde, enters Libra in your 10th house.',
 aquarius:'Venus, retrograde in your 10th house of career, squares Pluto in your sign, in your 1st house. The Sun enters Scorpio in your 10th house, and that night it meets retrograde Venus there. Venus, still retrograde, enters Libra in your 9th house.',
 pisces:'Venus, retrograde in your 9th house of study, squares Pluto in your 12th house. The Sun enters Scorpio in your 9th house and meets retrograde Venus that night. Venus, still retrograde, enters Libra in your 8th house.'
};
export async function createWeeklyContextPublicationFixture(call:(message:any)=>Promise<any>){
 const packet=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-10-19&timeZone=America/New_York'});
 if(packet.status!==200)throw new Error('Fixture facts unavailable');
 const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 for(const p of edition.passages){p.headline=`${p.sign} context fixture`;p.body=`You can review your complete context fixture. ${weeklyContextBodies[p.sign]} Your complete context fixture ends here.`;}
 return call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic weekly context publication',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:packet.payload.brief,signature:packet.payload.signature}},sourceSnapshot:{}}});
}

// Synthetic November grammar cases; no saved owner passage is reproduced.
export async function createWeeklyGrammarPublicationFixture(call:(message:any)=>Promise<any>){
 const packet=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-11-02&timeZone=America/New_York'});
 if(packet.status!==200)throw new Error('Fixture facts unavailable');
 const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 const sunHouses=[8,7,6,5,4,3,2,1,12,11,10,9],venusHouses=[7,6,5,4,3,2,1,12,11,10,9,8],jupiterHouses=[5,4,3,2,1,12,11,10,9,8,7,6];
 const ordinal=(n:number)=>`${n}${n<4?['','st','nd','rd'][n]:'th'}`;
 edition.passages.forEach((p,index)=>{
  const ruler=['gemini','virgo'].includes(p.sign)?'your ruling planet, ':'';
  p.headline=`${p.sign} grammar fixture`;
  p.body=`You can review the complete grammar fixture. The Sun meets ${ruler}retrograde Mercury in your ${ordinal(sunHouses[index])} house on Wednesday. Venus retrograde in your ${ordinal(venusHouses[index])} house also sextiles Jupiter in your ${ordinal(jupiterHouses[index])} house. Maybe you kept the task because you always did it before. Your complete grammar fixture ends here.`;
 });
 const readings=Object.fromEntries(edition.passages.map(p=>[p.sign,{bodyHash:createHash('sha256').update(horoscopeCanonicalJson({headline:p.headline,body:p.body})).digest('hex'),lint:{version:'horoscope-facts/v14',violations:['aries','gemini','leo','virgo','scorpio'].includes(p.sign)?[{category:'horoscope_fact_boundary',detail:'Synthetic obsolete grammar warning.'}]:[]}}]));
 return call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic weekly grammar publication',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:packet.payload.brief,signature:packet.payload.signature}},sourceSnapshot:{horoscopeGeneration:{readings}}}});
}

// External-editor regression uses synthetic prose with the owner's claim shapes.
export const monthlyManualBody='You can read the external monthly fixture opening. The Sun provides the monthly reference.\n\nVenus retrograde squares Mars on October 10. Venus retrograde squares Pluto on October 20.\n\nMercury turning retrograde on October 24 gives you a date to review, while the Taurus Full Moon on October 26 gives you another date to review. Your external monthly fixture ends here.';
