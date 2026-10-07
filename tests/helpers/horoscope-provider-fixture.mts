import assert from 'node:assert/strict';

/** Native provider-shaped transport fixtures. No external requests or billing.
 * Delegate content/review fixture construction to the existing isolated writer. */
export function installAlternativeHoroscopeProviders() {
  process.env.GEMINI_API_KEY='synthetic-gemini-test-only';
  process.env.ANTHROPIC_API_KEY='synthetic-anthropic-test-only';
  const base=globalThis.fetch;
  const requests:any[]=[],gemini=new Map<string,string>();
  const state={requests,claudeDelay:10,claudeError:false,geminiError:false};
  const converted=(request:any,provider:string)=>({model:request.model,
    instructions:provider==='gemini'?request.system_instruction:request.system,
    input:provider==='gemini'?request.input:request.messages[0].content,
    background:true,store:true,text:{format:{schema:provider==='gemini'?request.response_format.schema:request.output_config.format.schema}}});
  const text=(payload:any)=>payload.output?.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('')??'';
  globalThis.fetch=async(input:any,options:any={})=>{
    const url=String(input);
    if(url.startsWith('https://generativelanguage.googleapis.com/')){
      if(url.endsWith('/interactions')&&options.method==='POST'){
        const request=JSON.parse(options.body);requests.push({provider:'gemini',request});
        assert.equal(options.headers['x-goog-api-key'],'synthetic-gemini-test-only');
        assert.equal(options.headers['Api-Revision'],'2026-05-20');
        assert.equal(request.response_format.type,'text');assert.equal(request.response_format.mime_type,'application/json');
        assert.equal(request.generation_config.max_output_tokens,12000);assert.equal(request.background,true);assert.equal(request.store,true);
        if(state.geminiError)return Response.json({error:{status:'PERMISSION_DENIED'}},{status:403});
        const result=await base('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(converted(request,'gemini'))});
        const payload=await result.json();const id='v1_gemini_'+payload.id;gemini.set(id,payload.id);
        return Response.json({id,status:'in_progress',model:request.model});
      }
      const cancel=url.endsWith('/cancel'),id=url.split('/').at(cancel?-2:-1)!;
      const original=gemini.get(id);assert(original,'Unknown Gemini fixture request');
      const response=await base(`https://api.openai.com/v1/responses/${original}${cancel?'/cancel':''}`,options);
      const payload=await response.json();
      return Response.json({id,status:payload.status,steps:[{type:'thought',summary:[{type:'text',text:'Do not use private thought text.'}]},{type:'model_output',content:[{type:'text',text:text(payload)}]}],
        usage:{total_input_tokens:100,total_output_tokens:40,total_thought_tokens:30}});
    }
    if(url==='https://api.anthropic.com/v1/messages'){
      const request=JSON.parse(options.body);requests.push({provider:'anthropic',request});
      assert.equal(options.headers['x-api-key'],'synthetic-anthropic-test-only');assert.equal(request.stream,true);
      assert.equal(request.output_config.format.type,'json_schema');
      const response=await base('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(converted(request,'anthropic'))});
      const started=await response.json();
      await new Promise(resolve=>setTimeout(resolve,state.claudeDelay));
      if(state.claudeError)throw new Error('Synthetic lost Claude stream');
      const completed=await base(`https://api.openai.com/v1/responses/${started.id}`,{}),payload=await completed.json();
      const events=[{type:'message_start',message:{id:'msg_synthetic',model:request.model,usage:{input_tokens:100},content:[]}},
        {type:'content_block_start',index:0,content_block:{type:'thinking',thinking:''}},
        {type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'Private thinking is not reader text.'}},
        {type:'content_block_start',index:1,content_block:{type:'text',text:''}},
        {type:'content_block_delta',index:1,delta:{type:'text_delta',text:text(payload)}},
        {type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:40}},{type:'message_stop'}];
      const body=events.map(value=>`event: ${value.type}\ndata: ${JSON.stringify(value)}\n\n`).join('');
      return new Response(body,{headers:{'content-type':'text/event-stream'}});
    }
    return base(input,options);
  };
  return state;
}
