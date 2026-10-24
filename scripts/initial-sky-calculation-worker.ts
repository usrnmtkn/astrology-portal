import { parentPort } from 'node:worker_threads';
import handler, {readSkyCalculationInputs} from '../api/sky';
import {getAstrodienstSky} from '../apps/web/src/services/ephemeris';
let queue=Promise.resolve();
parentPort!.on('message',({id,url,prefetch}:{id:number;url:string;prefetch?:boolean})=>{
  queue=queue.then(async()=>{
    try{
      if(prefetch){
        const {date,location}=readSkyCalculationInputs(url);
        // Select public source keys while the unchanged complete calculation
        // continues. This preliminary result is never returned to the browser.
        const selection=await getAstrodienstSky(location,date,{includeTransitWindows:false,includeAspectTiming:false,includeDailyEvents:false});
        parentPort!.postMessage({id,selection});
      }
      let body='';const headers:Record<string,string>={};
      const response={statusCode:200,setHeader(name:string,value:string){headers[name]=value;},end(value?:string){body=value??'';}};
      await handler({method:'GET',url,headers:{}} as any,response as any);
      parentPort!.postMessage({id,result:{status:response.statusCode,headers,value:JSON.parse(body)}});
    }catch{parentPort!.postMessage({id,error:true});}
  });
});
