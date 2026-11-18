// Fictional local storage for actual-handler/browser tests. Never imported by the app.
import http from 'node:http';
import {defaultHoroscopeProfile} from '../../src/astro-writing/horoscopeWritingProfiles.mjs';

export function rulebookStorageRows() {
  return ['daily','weekly','monthly'].map((period,index)=>({
    id:`90000000-0000-4000-8000-00000000000${index}`,content_key:`studio-writing-profile/horoscope/${period}`,
    status:'DRAFT',lane:'reference',mode:'article',updated_at:'2026-11-18T12:00:00.000Z',
    source_snapshot:{writingProfileRevision:4},sections:{writingProfile:{...defaultHoroscopeProfile(period),
      voiceGuidance:`Synthetic ${period} voice.\nPreserve this second line exactly.`,structure:`Synthetic ${period} structure, complete final sentence.`,
      sourceGuidance:`Synthetic ${period} source guidance.`,prompt:'Draft {{period}}.\n{{voiceGuidance}}\n{{structure}}\n{{sourceGuidance}}'}},
  }));
}
export function rulebookFeedbackRows() {
  return [{id:'91000000-0000-4000-8000-000000000001',version:1,status:'active',kind:'rejection',
    target_keys:['writing/all'],owner_reason:'Synthetic global instruction: keep the image coherent.\nDo not replace these words.',
    rejected_text:'Synthetic rejected passage. This is never positive writing evidence.',source_uri:'thread:00000000-0000-4000-8000-000000000001',source_date:'2026-11-18T12:00:00.000Z'},
  {id:'91000000-0000-4000-8000-000000000002',version:2,status:'active',kind:'rejection',
    target_keys:['horoscope/daily','horoscope/weekly','horoscope/monthly','horoscope/seasonal'],owner_reason:'Synthetic horoscope-only instruction: a further paragraph is optional.',
    rejected_text:'Synthetic redundant conclusion.',source_uri:'thread:00000000-0000-4000-8000-000000000002',source_date:'2026-11-18T12:00:00.000Z'}];
}
export async function startRulebookStorage(options={}) {
  const requests=[];
  const state={profiles:rulebookStorageRows(),writingFeedback:rulebookFeedbackRows(),edits:[{
    id:'92000000-0000-4000-8000-000000000001',content_key:'sky-article/mercury/gemini/2026',family:'sky-article',scope:'passage',status:'active',version:3,
    before_text:'{"headline":"Synthetic unchanged heading","body":"Synthetic original passage."}',
    after_text:'{"headline":"Synthetic unchanged heading","body":"Synthetic corrected passage."}',
    reason:'Synthetic passage-specific correction. Preserve unchanged fields.',updated_at:'2026-11-18T12:00:00.000Z',
  }],failProfiles:false,failFeedback:false,...options};
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');requests.push({method:req.method,path:url.pathname});
    const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
    if(req.headers.apikey!=='synthetic-rulebook-service-key'||req.headers.authorization!=='Bearer synthetic-rulebook-service-key')return send(401,{error:'Synthetic key required'});
    if(req.method==='GET'&&url.pathname==='/rest/v1/generated_interpretations')return send(state.failProfiles?503:200,state.failProfiles?{error:'Synthetic unavailable'}:state.profiles);
    if(req.method==='POST'&&url.pathname==='/rest/v1/rpc/studio_memory_active_snapshot')return send(state.failFeedback?503:200,state.failFeedback?{error:'Synthetic unavailable'}:[{snapshot:{rows:state.edits,writingFeedback:state.writingFeedback}}]);
    send(405,{error:'Only read-only fixture requests are supported'});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,state,requests,close:()=>new Promise(resolve=>server.close(resolve))};
}
