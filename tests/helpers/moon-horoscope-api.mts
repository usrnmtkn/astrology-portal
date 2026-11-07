import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {createApiStore} from './calendar-review-api.mjs';
import {readerRouteResponse} from './content-reader-route.mjs';
export const store=await createApiStore([],{sqlMoonLifecycle:true});
export async function invoke(method:string,body?:any,url='/api/admin/generated-content'){
  if(method==='rows')return [...store.rows.values()];
  if(method==='reader'){const response=(await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify(body)}))!;return {status:response.status,payload:await response.json()};}
  if(!url.startsWith('/api/admin/lunation-writing'))return store.invoke(method,body,url);
  if(method!=='GET')throw new Error('This fixture must never generate lunar writing.');
  const handler=(await import('../../api/admin/lunation-writing')).default;
  const req=Object.assign(Readable.from([]),{method,url,headers:{'x-content-generation-secret':'calendar-api-fixture'}});
  const res={statusCode:200,result:{} as any,setHeader(){},end(text:string){this.result=JSON.parse(text);}};
  await handler(req as any,res as any);return {status:res.statusCode,payload:res.result};
}
if(process.argv.includes('--ipc')&&process.argv[1]===fileURLToPath(import.meta.url)){
  process.on('message',async({id,method,body,url}:any)=>{try{process.send?.({id,result:await invoke(method,body,url)});}catch(error){process.send?.({id,error:String(error)});}});
  process.send?.({ready:true});
}
