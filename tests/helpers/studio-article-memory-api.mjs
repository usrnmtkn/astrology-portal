import { Readable } from 'node:stream';
import { store } from './studio-article-memory-store.mjs';
import handler from '../../api/admin/studio-memory-feedback.ts';
process.on('message',async ({id,method,body,url})=>{
 try{
   let result;
   if(method==='rows')result=[...store.rows.values()];
   else if(url.startsWith('/api/admin/studio-memory-feedback')){
     const req=Readable.from(body?[JSON.stringify(body)]:[]);
     Object.assign(req,{method,url,headers:{'x-content-generation-secret':'calendar-api-fixture'}});
     const res={statusCode:0,setHeader(){},end(text){this.payload=JSON.parse(text)}};
     await handler(req,res);result={status:res.statusCode,payload:res.payload};
   }else result=await store.invoke(method,body,url);
   process.send({id,result});
 }catch(error){process.send({id,error:String(error)});}
});
process.send({ready:true});
