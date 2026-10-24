import { parentPort } from 'node:worker_threads';
import handler from '../api/sky';
let queue=Promise.resolve();
parentPort!.on('message',({id,url}:{id:number;url:string})=>{
  queue=queue.then(async()=>{
    try{
      let body='';const headers:Record<string,string>={};
      const response={statusCode:200,setHeader(name:string,value:string){headers[name]=value;},end(value?:string){body=value??'';}};
      await handler({method:'GET',url,headers:{}} as any,response as any);
      parentPort!.postMessage({id,result:{status:response.statusCode,headers,value:JSON.parse(body)}});
    }catch{parentPort!.postMessage({id,error:true});}
  });
});
