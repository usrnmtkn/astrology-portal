import assert from 'node:assert/strict';
import {validateGeneratedReading as validateYou} from '../api/_lib/you-transit-reading-generation.ts';
import {validateGeneratedReading as validateFriend} from '../api/_lib/friend-transit-reading-generation.ts';
import {assertYouTransitReadingBrief} from '../api/_lib/you-transit-reading.ts';
import {assertFriendTransitReadingBrief} from '../api/_lib/friend-transit-reading.ts';
const you=assertYouTransitReadingBrief({schema:'tldr.you-transit-reading-brief.v1',window:'day',targetDate:'2026-09-24',periodEnd:'2026-09-24',dateLabel:'September 24, 2026',approvedReaderText:{dailySummary:{summary:'A conversation may clarify the next step.'}},technicalEvidence:{}});
const friend=assertFriendTransitReadingBrief({schema:'tldr.friend-transits-brief.v1',friendName:'Morgan',dateLabel:'September 24, 2026',primaryThemes:[],longerCycles:[],houseContext:[],daily:null,activePatterns:[],relationshipActivations:[],hasAnyTransit:false,counts:{}});
for(const [validate,brief] of [[validateYou,you],[validateFriend,friend]] as const){
 const result=validate({headline:'Synthetic report',summary:'A synthetic summary.',body:'On February 5, 2027, decide whether to continue.',model:'fixture'},brief as any,'Synthetic report');
 assert.equal(result.passed,false);
 assert.match(result.message!,/fact lock/);
 assert.match(result.message!,/writing validation/);
 assert.match(result.message!,/whether/);
 assert.match(result.message!,/February 5/);
}
console.log('Daily and Friends correction feedback includes simultaneous fact and writing defects without an additional provider call.');
