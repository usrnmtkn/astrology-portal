import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import responses from '../../src/astro-writing/openAIResponses.cjs';

/** Provider transports receive the same complete governed instructions/input. */
export function buildHoroscopeProviderRequest({config,role='WRITER',stage='writing',input,schema,instructions}:any) {
  const system=responses.governedInstructionsForRole(role,{governedInstructions:instructions,surface:'horoscopes',family:'horoscope'});
  if(config.provider==='gemini')return {model:config.model,input,system_instruction:system,
    generation_config:{thinking_level:config.thinkingLevel,max_output_tokens:config.maxOutputTokens},
    response_format:{type:'text',mime_type:'application/json',schema},background:true,store:true};
  if(config.provider==='anthropic')return {model:config.model,system,messages:[{role:'user',content:input}],
    max_tokens:config.maxOutputTokens,thinking:{type:'adaptive'},
    output_config:{effort:config.reasoningEffort,format:{type:'json_schema',schema}},stream:true};
  return {...provider.buildProviderRequest({config,role:role==='WRITER'?'writer':'judge',stage,input,schema}),background:true,store:true};
}

const output=(text:string,refused=false)=>[{type:'message',content:[refused?{type:'refusal',refusal:''}:{type:'output_text',text}]}];
const errorCode=(payload:any)=>{
  const raw=payload?.error?.type??payload?.error?.status??payload?.error?.code;
  return typeof raw==='string'?raw.toLowerCase():'provider_error';
};

export function normalizeGeminiResult(payload:any) {
  // Only final model text is reader copy. Never pick a thought or tool step.
  const steps=payload?.steps??payload?.outputs??[];
  const text=steps.filter((step:any)=>step.type==='model_output'||step.type==='text')
    .flatMap((step:any)=>step.type==='text'?[step]:step.content??[])
    .filter((part:any)=>part.type==='text'&&!part.thought).map((part:any)=>part.text??'').join('');
  const usage=payload?.usage??{};
  return {id:payload?.id,status:payload?.status??'failed',model:payload?.model,output:output(text),
    ...(payload?.error?{error:{code:errorCode(payload)}}:{}),
    usage:{input_tokens:usage.total_input_tokens??usage.input_tokens??null,
      output_tokens:usage.total_output_tokens??usage.output_tokens??null,
      output_tokens_details:{reasoning_tokens:usage.total_thought_tokens??null},provider_usage:usage}};
}

export function normalizeClaudeResult(message:any,id:string) {
  const refused=message.stop_reason==='refusal'||message.stop_details?.type==='refusal';
  const text=(message.content??[]).filter((part:any)=>part.type==='text').map((part:any)=>part.text??'').join('');
  const limited=message.stop_reason==='max_tokens';
  return {id,provider_response_id:message.id??null,model:message.model,
    status:limited?'incomplete':!message.error&&message.stop_reason==='end_turn'?'completed':'failed',
    ...(limited?{incomplete_details:{reason:'max_output_tokens'}}:{}),
    ...(message.error?{error:{code:errorCode(message)}}:{}),output:output(text,refused),
    usage:message.usage??null};
}

/** A truncated/error stream is never accepted as a complete draft. */
export async function readClaudeStream(response:Response,id:string) {
  if(!response.ok)return normalizeClaudeResult(await response.json(),id);
  if(!response.body)throw new Error('missing_claude_stream');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer='',message:any={content:[],usage:{}},stopped=false,bytes=0;
  const event=(block:string)=>{
    const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n');
    if(!data)return;
    const value=JSON.parse(data);
    if(value.type==='error'){message.error=value.error;stopped=true;return;}
    if(value.type==='message_start')message={...value.message,content:[]};
    if(value.type==='content_block_start'&&value.content_block?.type==='text')message.content[value.index]={type:'text',text:value.content_block.text??''};
    if(value.type==='content_block_delta'&&value.delta?.type==='text_delta'){
      if(!message.content[value.index])throw new Error('invalid_claude_text_sequence');
      message.content[value.index].text+=value.delta.text;
    }
    if(value.type==='message_delta'){Object.assign(message,value.delta);message.usage={...message.usage,...value.usage};}
    if(value.type==='message_stop')stopped=true;
  };
  try{
    while(true){
      const next=await reader.read();if(next.done)break;
      bytes+=next.value.length;if(bytes>2_000_000)throw new Error('claude_stream_too_large');
      buffer+=decoder.decode(next.value,{stream:true});buffer=buffer.replace(/\r\n/gu,'\n');
      let boundary:number;while((boundary=buffer.indexOf('\n\n'))>=0){event(buffer.slice(0,boundary));buffer=buffer.slice(boundary+2);}
    }
    buffer+=decoder.decode();if(buffer.trim())event(buffer);
    if(!stopped)throw new Error('interrupted_claude_stream');
    message.content=message.content.filter(Boolean);
    return normalizeClaudeResult(message,id);
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
