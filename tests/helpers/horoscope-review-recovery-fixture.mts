import {prepareHoroscopeBrief} from '../../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {HOROSCOPE_RHETORICAL_REVIEW,horoscopeReviewHash} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';

export const reviewCandidate={headline:'Synthetic monthly overview',body:'**TLDR**\n\nYour complete summary begins here.\n\nYour summary ends here.\n\n**The month ahead**\n\nYour complete overview begins here. The synthetic unsupported sentence belongs here.\n\nYour complete overview ends here.'};
export const reviewValue=(fail=true)=>({checks:['CORRECTIO','TRICOLON','PURPLE_PROSE'].map(label=>({label,outcome:fail&&label==='PURPLE_PROSE'?'fail':'pass',reason:'Synthetic contextual review.'})),findings:fail?[{label:'PURPLE_PROSE',field:'body',quote:'“The synthetic unsupported sentence belongs here.”',paragraph:'Your complete overview begins here. The synthetic unsupported sentence belongs here.',reason:'Synthetic explanation of the exact wording.',readerConsequence:'The synthetic sentence adds no useful detail.',meaningTest:'Removing it preserves the meaning of the complete fixture.'}]:[]});
export const reviewPayload=(value=reviewValue())=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});

// An already billed, completed result rejected by the old quote parser. All
// prose is synthetic. Recovery must GET this ID without any provider POST.
export async function seedCompletedReviewHold(store:any,writerFixture:any){
 const packet=await prepareHoroscopeBrief(new URL('http://localhost/?period=monthly&date=2026-10-12&timeZone=America/New_York'));
 const edition=emptyHoroscopeEdition(packet.brief.window);
 const operation={id:'synthetic-review-operation',workflow:HOROSCOPE_RHETORICAL_REVIEW,phase:'review',state:'running',sign:'overview',startedAt:'2026-10-12T10:00:00Z',responseId:'resp_saved_review_fixture',candidate:reviewCandidate,candidateHash:horoscopeReviewHash(reviewCandidate),evidenceHash:'synthetic-evidence',requestHash:'synthetic-request',receipt:{operationId:'synthetic-claude-draft',config:{provider:'anthropic',model:'claude-sonnet-5-5'}},config:{provider:'openai',model:'gpt-5.6-terra'}};
 const failure={code:'rhetorical_review_unavailable',message:'The prose check did not return a complete, usable review. The original draft is kept.',operation,candidate:reviewCandidate,receipt:operation.receipt,review:{diagnostic:{status:'completed',validationCode:null}},failedAt:'2026-10-12T10:01:00Z'};
 const result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic October overview',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{horoscopeGeneration:{active:null,lastError:failure,candidateHolds:{overview:failure},failures:[failure]}}});
 if(result.status!==200)throw new Error(JSON.stringify(result.payload));
 writerFixture.reviewRequests.set(operation.responseId,{sign:'overview',input:JSON.stringify({candidate:reviewCandidate})});
 return result.payload.rows[0];
}
