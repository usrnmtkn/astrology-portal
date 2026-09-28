import {createHash} from 'node:crypto';

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
    outputCharacters:text.length,outputHash:createHash('sha256').update(text).digest('hex')};
}

export class HoroscopeProviderFailure extends Error {
  constructor(public code:string,message:string,public diagnostic:ReturnType<typeof horoscopeProviderDiagnostic>){super(message);}
}

export function readHoroscopeProviderResult(payload:any) {
  const diagnostic=horoscopeProviderDiagnostic(payload);
  const fail=(code:string,message:string):never=>{throw new HoroscopeProviderFailure(code,message+' Saved readings are kept. Review the writing plan before trying again.',diagnostic);};
  if(diagnostic.status==='incomplete'&&diagnostic.incompleteReason==='max_output_tokens')fail('output_limit','The writer reached its response limit before finishing this reading.');
  if(diagnostic.status==='cancelled')fail('cancelled','This writing request was cancelled before it finished.');
  if(diagnostic.incompleteReason==='content_filter'||Array.isArray(payload?.output)&&payload.output.some((item:any)=>item?.type==='message'&&Array.isArray(item.content)&&item.content.some((part:any)=>part?.type==='refusal')))fail('refused','The writer could not produce a reading from this request.');
  if(diagnostic.status!=='completed')fail('provider_failed','The writer stopped before finishing this reading.');
  try {
    const text=payload.output.filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[])
      .filter((item:any)=>item.type==='output_text').map((item:any)=>item.text).join('');
    const value=JSON.parse(text);
    if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['headline','body'].includes(k))
      ||typeof value.headline!=='string'||!value.headline.trim()||value.headline.length>200
      ||typeof value.body!=='string'||!value.body.trim()||value.body.length>20000)throw new Error();
    return value as {headline:string;body:string};
  }catch{fail('invalid_reading','The writer returned an incomplete or unreadable draft.');}
}
