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
