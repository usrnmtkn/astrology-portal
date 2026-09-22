// Bridge isolated API fixtures to the actual PostgreSQL publication functions.
// Synthetic fixture ids are mapped to UUIDs only in the database boundary.
import { createHash } from 'node:crypto';
import { createPublicationDb, seedPublicationRow, callPublicationRpc } from './studio-publication-db.mjs';
export function publicationRpcFixture(getRows, saveRows) {
  let db;
  const ids = new Map(), originals = new Map(), seeded = new Map();
  const uuid = id => {
    if (/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/iu.test(id)) return id;
    if (!ids.has(id)) { const hex = createHash('sha256').update(id).digest('hex').slice(0,32); const value = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`; ids.set(id,value); originals.set(value,id); }
    return ids.get(id);
  };
  const idFields = new Set(['id','targetRowId','rowId','row_id','targetId','proposalId','p_proposal_id','p_target_id']);
  function mapIds(value, reverse=false, key='') {
    if (typeof value === 'string' && idFields.has(key)) return reverse ? originals.get(value) ?? value : uuid(value);
    if (Array.isArray(value)) return value.map(item=>mapIds(item,reverse));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,mapIds(item,reverse,name)]));
    return value;
  }
  const fixture = async (input, init={}) => {
    const url = new URL(String(input), 'http://fixture.invalid');
    const name = url.pathname.split('/').at(-1);
    if (!['content_studio_publication_receipt','content_studio_publish_revision'].includes(name)) return null;
    const args = JSON.parse(String(init.body));
    if (!db && name === 'content_studio_publication_receipt') return Response.json(null);
    db ??= await createPublicationDb();
    try {
      if (name === 'content_studio_publish_revision') {
        const rows=getRows();
        const needed = new Set([args.p_proposal_id,args.p_target_id,...args.p_dependencies.map(item=>item.id)]);
        for (const row of rows.filter(row=>needed.has(row.id))) {
          const serialized=JSON.stringify(row); if (seeded.get(row.id)===serialized) continue;
          const mapped = mapIds(row);
          if (!seeded.has(row.id)) await seedPublicationRow(db,mapped);
          else {
            const columns=Object.keys(mapped).filter(key=>['content_key','updated_at','status','lane','review_state','headline','summary','body','sections','facts','source_snapshot','mode','event_type','target_date','surface','provider','prompt_version','model','block_type','reviewed_at','published_at','judge_score','judge_gate','judge_verdict','judge_why','reviewer_notes'].includes(key));
            await db.query(`update generated_interpretations set (${columns.join(',')})=(select ${columns.join(',')} from jsonb_populate_record(null::generated_interpretations,$1)) where id=$2`,[mapped,mapped.id]);
          }
          seeded.set(row.id,serialized);
        }
        const targetPublication=args.p_validation_context.targetPublication;
        if (!targetPublication) await db.query('delete from content_publications where content_key=$1',[getRows().find(row=>row.id===args.p_target_id).content_key]);
        if (targetPublication) {
          await db.query('delete from content_publications where content_key=$1',[targetPublication.content_key]);
          await db.query('insert into content_publications(revision,state,row_id,row_updated_at,content_key) overriding system value values($1,$2,$3,$4,$5)',[targetPublication.revision,targetPublication.state,uuid(targetPublication.row_id),targetPublication.row_updated_at,targetPublication.content_key]);
        }
        for (const dependency of args.p_dependencies) {
          if (dependency.publicationRevision != null) {
            const source = getRows().find(row => row.id === dependency.id);
            await db.query('delete from content_publications where row_id=$1',[uuid(dependency.id)]);
            await db.query("insert into content_publications(revision,state,row_id,row_updated_at,content_key) overriding system value values($1,'live',$2,$3,$4)",[dependency.publicationRevision,uuid(dependency.id),source.updated_at,source.content_key]);
          }
        }
      }
      const receipt=await callPublicationRpc(db,name,mapIds(args));
      if (name === 'content_studio_publish_revision') {
        const result=await db.query('select to_jsonb(g) as row from generated_interpretations g where id=any($1::uuid[])',[[uuid(args.p_proposal_id),uuid(args.p_target_id)]]);
        const saved=result.rows.map(item=>mapIds(item.row,true));
        saveRows(saved);
        for (const row of getRows()) if (saved.some(item=>item.id===row.id)) seeded.set(row.id,JSON.stringify(row));
      }
      return Response.json(mapIds(receipt,true));
    } catch(error) { if (process.env.DEBUG_PUBLICATION_FIXTURE) console.error(error.code, error.message); return Response.json({code:error.code,message:error.message},{status:error.code==='40001'?409:400}); }
  };
  fixture.close=async()=>{await db?.close();};
  return fixture;
}
