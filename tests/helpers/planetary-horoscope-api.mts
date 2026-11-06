import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {createApiStore} from './calendar-review-api.mjs';
import {planetaryHouse,HOROSCOPE_SIGNS} from '../../src/shared/planetaryHoroscopes';

export const store=await createApiStore([],{uuidIds:true,projectSelect:true});
process.env.OPENAI_API_KEY='synthetic-planetary-provider-key';
process.env.STUDIO_MEMORY_FEEDBACK_ENABLED='false';
const storageFetch=globalThis.fetch;
export const providerCalls:any[]=[];
export const feedbackCalls:string[]=[];
let mode='complete',polls=0,privateRecordFailure=false;
const results=new Map<string,any>();
export const syntheticReadings=(event:any)=>HOROSCOPE_SIGNS.map(sign=>({sign,house:planetaryHouse(event.sign,sign),headline:`Synthetic ${sign}`,
  body:`Your synthetic ${sign} opening remains complete.\n\nYou keep the complete synthetic final sentence for ${sign}.`}));
globalThis.fetch=async(input:any,options:any={})=>{
  const url=new URL(String(input));
  if(url.origin!=='https://api.openai.com'){
    if(url.origin==='https://calendar-api.invalid'&&url.pathname==='/rest/v1/rpc/studio_memory_active_snapshot'&&options.method==='POST'){
      feedbackCalls.push(url.pathname);
      return Response.json({error:'Synthetic owner feedback unavailable.'},{status:503});
    }
    if(privateRecordFailure&&options.method==='POST'&&url.pathname.endsWith('/generated_interpretations')
      &&JSON.parse(options.body).content_key?.startsWith('studio-planetary-writing/'))return Response.json({error:'Synthetic private record unavailable.'},{status:503});
    return storageFetch(input,options);
  }
  if(url.pathname==='/v1/responses'&&options.method==='POST'){
    const request=JSON.parse(options.body);providerCalls.push(request);
    if(mode==='timeout')throw new TypeError('Synthetic uncertain provider dispatch.');
    if(mode==='missing-id')return Response.json({status:'completed',output:[]});
    const id=`resp_planetary_fixture_${providerCalls.length}`,event=[...store.rows.values()].find((r:any)=>r.source_snapshot?.planetaryGeneration?.active?.state==='starting')!.facts.planetaryEvent.event;
    const readings=syntheticReadings(event);
    if(mode==='wrong-house')readings[0].house=readings[0].house%12+1;
    if(mode==='wrong-facts')readings[0].body='Mercury in Taurus moves through your first house. You keep this complete synthetic final sentence.';
    const payload=mode==='incomplete'?{id,status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]}
      :{id,status:'completed',output:[{type:'message',content:[{type:'output_text',text:mode==='malformed'?'SYNTHETIC_PRIVATE_INVALID_RESPONSE':JSON.stringify({readings})}]}],usage:{input_tokens:100,output_tokens:200}};
    results.set(id,payload);polls=0;
    return Response.json({id,status:'queued'});
  }
  const id=url.pathname.split('/').at(-1)!;
  if(options.method&&options.method!=='GET'||!results.has(id))throw new Error('Unexpected synthetic provider operation.');
  polls++;
  return Response.json(polls===1?{id,status:'in_progress'}:results.get(id));
};
const handler=(await import('../../api/admin/planetary-horoscope-writing')).default;
export async function invoke(method:string,body?:any,url='/api/admin/planetary-horoscope-writing',secret='calendar-api-fixture'){
  if(method==='rows')return structuredClone([...store.rows.values()]);
  if(method==='provider-mode'){mode=body;return {ok:true};}
  if(method==='feedback-enabled'){process.env.STUDIO_MEMORY_FEEDBACK_ENABLED=String(body);return {ok:true};}
  if(method==='private-record-failure'){privateRecordFailure=Boolean(body);return {ok:true};}
  if(method==='provider-calls')return providerCalls;
  if(!url.startsWith('/api/admin/planetary-horoscope-writing'))return store.invoke(method,body,url,secret);
  const req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{method,url,headers:{authorization:`Bearer ${secret}`}});
  const res={statusCode:200,result:{} as any,setHeader(){},end(text:string){this.result=JSON.parse(text);}};
  await handler(req as any,res as any);return {status:res.statusCode,payload:res.result};
}
if(process.argv.includes('--ipc')&&process.argv[1]===fileURLToPath(import.meta.url)){
  process.on('message',async({id,method,body,url}:any)=>{try{process.send?.({id,result:await invoke(method,body,url)});}catch(error){process.send?.({id,error:String(error)});}});
  process.send?.({ready:true});
}
