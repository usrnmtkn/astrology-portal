import {createHash} from 'node:crypto';
import {MONTHLY_HOROSCOPE_FORMAT,composeMonthlyHoroscopeDraft} from '../../src/astro-writing/monthlyHoroscopeFormat.mjs';
import {isMonthlySynthesisVersion,MonthlySynthesisValidationError,validateMonthlySynthesis} from '../../src/astro-writing/monthlyHoroscopeSynthesis.mjs';
import {SEASONAL_WORKFLOW,validateSeasonalDevelopmentPlan} from '../../src/astro-writing/seasonalDevelopmentPlan.mjs';
import {SEASONAL_REVIEW_FORMAT,validateSeasonalEditorialReview} from '../../src/astro-writing/seasonalEditorialReview.mjs';

// Keep provider diagnostics in the private edition receipt, without logging
// prompts, partial reader copy, refusal text or arbitrary provider messages.
export function horoscopeProviderDiagnostic(payload:any) {
  const code=(value:unknown)=>typeof value==='string'&&/^[a-z0-9_-]{1,80}$/iu.test(value)?value:null;
  const count=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0?value:null;
  const text=Array.isArray(payload?.output)?payload.output.filter((item:any)=>item?.type==='message')
    .flatMap((item:any)=>Array.isArray(item.content)?item.content:[]).filter((item:any)=>item?.type==='output_text')
    .map((item:any)=>typeof item.text==='string'?item.text:'').join(''):'';
  return {status:code(payload?.status),incompleteReason:code(payload?.incomplete_details?.reason),errorCode:code(payload?.error?.code),
    usage:{inputTokens:count(payload?.usage?.input_tokens),outputTokens:count(payload?.usage?.output_tokens),reasoningTokens:count(payload?.usage?.output_tokens_details?.reasoning_tokens)},
    outputCharacters:text.length,outputHash:createHash('sha256').update(text).digest('hex'),validationCode:null as string|null};
}

export class HoroscopeProviderFailure extends Error {
  constructor(public code:string,message:string,public diagnostic:ReturnType<typeof horoscopeProviderDiagnostic>){super(message);}
}

export function readHoroscopeProviderResult(payload:any,{format=null,facts=null}:{format?:string|null;facts?:any}={}) {
  const diagnostic=horoscopeProviderDiagnostic(payload);
  const fail=(code:string,message:string):never=>{throw new HoroscopeProviderFailure(code,message+' Saved readings are kept. Review the writing plan before trying again.',diagnostic);};
  if(['claude_connection_interrupted','claude_checkpoint_unavailable'].includes(diagnostic.errorCode??''))fail('provider_failed','Claude’s response could not be recovered. The request may have been billed; it was not automatically repeated.');
  if(diagnostic.errorCode==='credit_balance_exhausted')throw new HoroscopeProviderFailure('api_credits','The AI writer has run out of API credits. Replenish the connected OpenAI API balance, then retry this reading. Saved readings are kept.',diagnostic);
  if(['insufficient_quota','billing_hard_limit_reached','billing_not_active'].includes(diagnostic.errorCode??''))throw new HoroscopeProviderFailure('api_credits','The writing API has reached its billing or usage limit. Check the connected OpenAI API account and available credits, then retry this reading. Saved readings are kept.',diagnostic);
  if(['invalid_api_key','authentication_error'].includes(diagnostic.errorCode??''))throw new HoroscopeProviderFailure('api_credentials','The writing API could not authenticate. Restore its server API connection, then retry this reading. Saved readings are kept.',diagnostic);
  if(diagnostic.status==='incomplete'&&diagnostic.incompleteReason==='max_output_tokens')fail('output_limit','The writer reached its response limit before finishing this reading.');
  if(diagnostic.status==='cancelled')fail('cancelled','This writing request was cancelled before it finished.');
  if(diagnostic.incompleteReason==='content_filter'||Array.isArray(payload?.output)&&payload.output.some((item:any)=>item?.type==='message'&&Array.isArray(item.content)&&item.content.some((part:any)=>part?.type==='refusal')))fail('refused','The writer could not produce a reading from this request.');
  if(diagnostic.status!=='completed')fail('provider_failed','The writer stopped before finishing this reading.');
  try {
    const text=payload.output.filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[])
      .filter((item:any)=>item.type==='output_text').map((item:any)=>item.text).join('');
    const value=JSON.parse(text);
    if(format===SEASONAL_WORKFLOW)return validateSeasonalDevelopmentPlan(value,facts.catalog,facts.passages);
    if(format===SEASONAL_REVIEW_FORMAT)return validateSeasonalEditorialReview(value,facts.draft);
    if(isMonthlySynthesisVersion(format))return validateMonthlySynthesis(value,facts);
    const monthly=format===MONTHLY_HOROSCOPE_FORMAT;
    if(!value||Array.isArray(value)||Object.keys(value).some(k=>!(monthly?['headline','tldr','body']:['headline','body']).includes(k))
      ||typeof value.headline!=='string'||!value.headline.trim()||value.headline.length>200
      ||typeof value.body!=='string'||!value.body.trim()||value.body.length>20000)throw new Error();
    if(monthly)composeMonthlyHoroscopeDraft(value);
    return value as {headline:string;body:string;tldr?:string};
  }catch(error){
    if(format===SEASONAL_WORKFLOW||format===SEASONAL_REVIEW_FORMAT){
      diagnostic.validationCode=typeof (error as any)?.code==='string'?(error as any).code:'invalid_structured_result';
      fail(format===SEASONAL_WORKFLOW?'invalid_seasonal_plan':'invalid_seasonal_review',format===SEASONAL_WORKFLOW?'The Seasonal plan is incomplete or references unsupported evidence. No prose request was started.':'The editorial report did not reference the exact saved draft. The original writing is preserved.');
    }
    if(isMonthlySynthesisVersion(format))diagnostic.validationCode=error instanceof MonthlySynthesisValidationError?error.code:'invalid_json';
    fail(isMonthlySynthesisVersion(format)?'invalid_synthesis':'invalid_reading',isMonthlySynthesisVersion(format)?'The monthly plan was incomplete or contained an unsupported event. No prose request was started.':'The writer returned an incomplete or unreadable draft.');
  }
}
