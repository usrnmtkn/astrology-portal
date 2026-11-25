const words=text=>String(text??'').normalize('NFKC').toLowerCase().replace(/[’‘]/gu,"'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)??[];
const readerText=text=>String(text??'').replace(/&#(x[\da-f]+|\d+);?/giu,(_,value)=>{
  const code=value[0].toLowerCase()==='x'?parseInt(value.slice(1),16):Number(value);
  return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';
}).replace(/[\u200b-\u200d\ufeff]/gu,'');
const signs='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const moonSign=new RegExp(`\\b(?:Moon\\s+(?:(?:is|still|now|currently|sits|stays|remains|travels|moves|moving|traveling|enters|entering|leaves|leaving)\\s+)*(?:(?:in|into|through|from|to)\\s+)?(?:${signs})|(?:${signs})\\s+Moon)\\b`,'giu');
const special=/\b(?:New|Full|First\s+Quarter|Last\s+Quarter)\s+Moon\b|\b(?:solar|lunar)\s+eclipse\b/iu;

/** Explicit Daily output boundaries only, not a score for voice or insight.
 * Eighteen consecutive source words detect substantial transplantation while
 * leaving short shared expressions and exact source evidence untouched. */
export function dailyHoroscopeFindings(passage,{sourcePassages=[]}={}) {
  const violations=[];
  const sourceWindows=new Map();
  for(const source of sourcePassages){
    const tokens=words(source.text);
    for(let i=0;i<=tokens.length-18;i++)sourceWindows.set(tokens.slice(i,i+18).join(' '),source.id);
  }
  for(const field of ['headline','body']){
    const text=readerText(passage[field]);
    const fail=(category,detail,extra={})=>violations.push({category,field,detail,governanceTier:'blocking',...extra});
    const banned=text.match(/\b(?:whether|pleasure|bond|preferences?|labor)\b|\bout\s+loud\b/iu);
    if(banned)fail('daily_required_vocabulary',`Remove “${banned[0]}” from the ${field}. Reconsider the sentence in context.`);
    if(/--/u.test(text))fail('daily_required_punctuation',`Remove the double hyphen from the ${field}.`);
    const numberedHouses=[...text.matchAll(/\b(?:\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+(?:whole[ -]sign\s+)?houses?\b/giu)];
    if(numberedHouses.some(match=>!/^\s+(?:on the street|on your (?:left|right)|purchase)\b/iu.test(text.slice(match.index+match[0].length))))fail('daily_private_house','Translate the numbered house into its calculated area of life.');
    // A special phase licenses its own named Moon, not an ordinary Moon sign
    // elsewhere in the same sentence. Test the immediate matched noun phrase.
    for(const match of text.matchAll(moonSign)){
      const before=text.slice(Math.max(0,match.index-30),match.index);
      if(!special.test(match[0])&&!/(?:New|Full|First\s+Quarter|Last\s+Quarter)\s+$/iu.test(before)){
        fail('daily_private_moon','Keep an ordinary Moon sign or ingress in private interpretive context.');break;
      }
    }
    const tokens=words(text);
    for(let i=0;i<=tokens.length-18;i++){
      const sourceId=sourceWindows.get(tokens.slice(i,i+18).join(' '));
      if(sourceId){fail('daily_source_transplant','The new reading repeats at least 18 consecutive words from a writing source. Develop its own supported thought.',{sourceId});break;}
    }
  }
  return violations;
}
