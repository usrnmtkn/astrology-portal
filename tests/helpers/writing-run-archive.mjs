import {verifyArchivedRun} from '../../src/astro-writing/writingRunArchive.cjs';

export function writingRunArchiveFixture(){
  const rows=new Map();
  const store={
    async create(row){verifyArchivedRun(row);if(rows.has(row.id))throw Error('Duplicate archive');rows.set(row.id,{...structuredClone(row),created_at:'2026-11-18T00:00:00.000Z'});},
    async finish(id,patch){const row=rows.get(id);if(!row||row.state!=='dispatch_reserved')throw Error('Missing archive reservation');Object.assign(row,structuredClone(patch));},
    async list(params){
      const filter=(row)=>[...params].every(([k,v])=>{
        if(['select','order','limit'].includes(k))return true;
        if(k==='or'){
          const match=v.match(/^\(created_at.lt.(.+),and\(created_at.eq.(.+),id.lt.(.+)\)\)$/u);
          if(!match)throw Error('Unknown cursor');return row.created_at<match[1]||row.created_at===match[2]&&row.id<match[3];
        }
        const value=k.startsWith('context->>')?row.context[k.slice(10)]:row[k];
        if(v.startsWith('eq.'))return value===v.slice(3);
        if(v.startsWith('lte.'))return value<=v.slice(4);
        throw Error('Unknown archive filter');
      });
      const selected = [...rows.values()].filter(filter).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,Number(params.get('limit')??1000));
      const columns=params.get('select');
      return structuredClone(columns && columns!=='*' ? selected.map(row=>Object.fromEntries(columns.split(',').map(k=>[k,row[k]]))) : selected);
    }
  };
  async function handle(url,options={}){
    if(url.pathname!=='/rest/v1/writing_run_archives')return null;
    if(options.method==='POST'){const row=JSON.parse(options.body);await store.create(row);return Response.json([rows.get(row.id)]);}
    if(options.method==='PATCH'){const id=url.searchParams.get('id').slice(3);await store.finish(id,JSON.parse(options.body));return Response.json([rows.get(id)]);}
    return Response.json(await store.list(url.searchParams));
  }
  return {rows,store,handle};
}
