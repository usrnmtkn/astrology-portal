// Bounded grammatical context for factual checks only. Never write the resolved
// text back to a saved reading, and never carry a subject across sentences.
export const horoscopeClaimBodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
export const horoscopeClaimSigns='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const weekdays='Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
const aspectVerbs='meets?|sextiles?|squares?|trines?|opposes?';
const timing=`(?:(?:on\\s+)?(?:${weekdays})|(?:by\\s+)?(?:that(?:\\s+same)?|the\\s+same)\\s+(?:day|night))`;
const ingress=`(?:enters?|entering|(?:moves?|moving)(?:\\s+(?:back|retrograde|direct))*\\s+into|backs?\\s+into|returns?\\s+to)`;

export function resolveHoroscopeClaimSubjects(text) {
 return text.replace(/[^.!?\n]+/gu,sentence=>sentence.replace(new RegExp(`\\band\\s+(?:${timing}\\s+)?(?:it\\s+)?(${aspectVerbs})\\b`,'giu'),(match,verb,index)=>{
  const before=sentence.slice(0,index),named=[...before.matchAll(new RegExp(`\\b(${horoscopeClaimBodies})\\b`,'giu'))];
  // With two planetary mentions the antecedent is ambiguous. Only inherit a
  // single explicit subject already making a placement or motion claim.
  if(named.length!==1)return match;
  const subject=named[0],predicate=before.slice(subject.index+subject[0].length);
  if(/;|\b(?:but|while|whereas|because|although|you|they|he|she|it)\b/iu.test(predicate))return match;
  if(!new RegExp(`^(?:,\\s*your\\s+(?:ruling\\s+planet|(?:traditional\\s+)?ruler)\\s*,)?\\s+(?:${ingress}|is\\s+(?:retrograde|direct))\\b`,'iu').test(predicate))return match;
  return match.replace(new RegExp(`(?:it\\s+)?${verb}$`,'iu'),`${subject[1]} ${verb}`);
 }));
}

export function horoscopePlacementClaims(clause,rising) {
 const pattern=new RegExp(`\\b(?<relation>${ingress}|in|through)\\s+(?<sign>${horoscopeClaimSigns}|your sign)\\b`,'giu');
 return [...clause.matchAll(pattern)].map(m=>({index:m.index,end:m.index+m[0].length,
  sign:m.groups.sign.toLowerCase()==='your sign'?rising:m.groups.sign.toLowerCase(),personal:m.groups.sign.toLowerCase()==='your sign',
  ingress:!['in','through'].includes(m.groups.relation.toLowerCase())}));
}

// A destination may name only its whole-sign house. Bind the ingress to that
// exact house token; it must not change checks of earlier houses in the clause.
export function horoscopeHouseIngressTargets(clause) {
 const ordinal='\\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth';
 const pattern=new RegExp(`\\b${ingress}\\s+(?:your|the)\\s+(?<house>${ordinal})\\s+(?:whole[ -]sign\\s+)?house\\b`,'giu');
 return new Set([...clause.matchAll(pattern)].map(m=>m.index+m[0].lastIndexOf(m.groups.house)));
}
