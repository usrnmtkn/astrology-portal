// Bridge isolated API fixtures to the actual PostgreSQL publication functions.
// Synthetic fixture ids are mapped to UUIDs only in the database boundary.
import { createHash } from 'node:crypto';
import { createPublicationDb, seedPublicationRow, callPublicationRpc } from './studio-publication-db.mjs';
import { calendarPlanetaryIdentity } from '../../apps/admin/src/calendarPlanetarySources.ts';
export function publicationRpcFixture(getRows, saveRows, getPublications = () => []) {
  let db, initializing;
  const ids = new Map(), originals = new Map(), seeded = new Map();
  const uuid = id => {
    if (/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/iu.test(id)) return id;
    if (!ids.has(id)) { const hex = createHash('sha256').update(id).digest('hex').slice(0,32); const value = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`; ids.set(id,value); originals.set(value,id); }
    return ids.get(id);
  };
  const idFields = new Set(['id','targetRowId','rowId','row_id','targetId','proposalId','p_proposal_id','p_target_id','p_row_id']);
  function mapIds(value, reverse=false, key='') {
    if (typeof value === 'string' && idFields.has(key)) return reverse ? originals.get(value) ?? value : uuid(value);
    if (Array.isArray(value)) return value.map(item=>mapIds(item,reverse));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,mapIds(item,reverse,name)]));
    return value;
  }
  const fixture = async (input, init={}) => {
    const url = new URL(String(input), 'http://fixture.invalid');
    const name = url.pathname.split('/').at(-1);
    if(name==='content_baseline_recoveries'&&(!init.method||init.method==='GET')){
      await fixture.prepare();
      return Response.json(mapIds((await db.query('select request,result from content_baseline_recoveries where operation_id=$1',[url.searchParams.get('operation_id')?.slice(3)])).rows,true));
    }
    if (!['content_studio_publication_receipt','content_studio_publish_revision','content_studio_row_history','retire_content_everywhere','publish_content_publication','restore_moon_reusable_readings','cancel_content_source_recovery'].includes(name)) return null;
    const args = JSON.parse(String(init.body));
    if (!db && name === 'content_studio_publication_receipt') return Response.json(null);
    await fixture.prepare();
    try {
      if (name !== 'content_studio_publication_receipt') {
        const rows=getRows();
        const needed = new Set(name === 'content_studio_publish_revision' ? [args.p_proposal_id,args.p_target_id,...args.p_dependencies.map(item=>item.id)] : [args.p_source?.id??args.p_row_id]);
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
        if (name === 'content_studio_publish_revision') {
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
        // Explicitly imported ledger revisions must advance the identity sequence,
        // just as the already-existing production sequence precedes a publication.
        await db.query("select setval(pg_get_serial_sequence('public.content_publications','revision'), greatest(coalesce((select max(revision) from content_publications),1), nextval(pg_get_serial_sequence('public.content_publications','revision'))), true)");
      }
        }
      if (name === 'retire_content_everywhere') {
        const revisions = getPublications().map(row => Number(row.revision));
        if (revisions.length) {
          // Direct fixture writes already exposed these ledger revisions. The
          // SQL retirement must advance the same sequence before its trigger runs.
          await db.query("select setval(pg_get_serial_sequence('public.content_publications','revision'), greatest($1::bigint, coalesce((select max(revision) from content_publications),1), nextval(pg_get_serial_sequence('public.content_publications','revision'))), true)", [Math.max(...revisions)]);
        }
      }
      const mappedArgs = mapIds(args);
      const receipt = name === 'content_studio_row_history'
        ? (await db.query('select public.content_studio_row_history($1,$2) as receipt',[mappedArgs.p_row_id,mappedArgs.p_before])).rows[0].receipt
        : name === 'restore_moon_reusable_readings'
        ? (await db.query('select public.restore_moon_reusable_readings($1,$2::jsonb) as receipt',[mappedArgs.p_operation_id,mappedArgs.p_source])).rows[0].receipt
        : name === 'cancel_content_source_recovery'
        ? (await db.query('select public.cancel_content_source_recovery($1) as receipt',[mappedArgs.p_operation_id])).rows[0].receipt
        : name === 'retire_content_everywhere'
        ? (await db.query('select to_jsonb(public.retire_content_everywhere($1,$2,$3)) as receipt',[mappedArgs.p_content_key,mappedArgs.p_row_id,mappedArgs.p_expected_updated_at])).rows[0].receipt
        : name === 'publish_content_publication'
        ? (await db.query('select to_jsonb(public.publish_content_publication($1,$2,$3)) as receipt',[mappedArgs.p_content_key,mappedArgs.p_row_id,mappedArgs.p_expected_updated_at])).rows[0].receipt
        : await callPublicationRpc(db,name,mappedArgs);
      if (name === 'content_studio_publish_revision') {
        const result=await db.query('select to_jsonb(g) as row from generated_interpretations g where id=any($1::uuid[])',[[uuid(args.p_proposal_id),uuid(args.p_target_id)]]);
        const saved=result.rows.map(item=>mapIds(item.row,true));
        saveRows(saved);
        for (const row of getRows()) if (saved.some(item=>item.id===row.id)) seeded.set(row.id,JSON.stringify(row));
      }
      return Response.json(mapIds(receipt,true));
    } catch(error) { if (process.env.DEBUG_PUBLICATION_FIXTURE) console.error(error.code, error.message); return Response.json({code:error.code,message:error.message},{status:error.code==='40001'?409:400}); }
  };
  fixture.prepare = () => initializing ??= createPublicationDb().then(database => { db = database; });
  fixture.publications = async () => db ? (await db.query('select to_jsonb(p) as row from content_publications p')).rows.map(item => mapIds(item.row,true)) : [];
  // Opt-in lifecycle fixtures must run ordinary row updates through the same real
  // publication trigger as RPC writes. A Map-only LIVE update cannot reopen a
  // retired SQL ledger and would falsely fail owner republication confirmation.
  const patchRows = async (rows, patch, headers, inScope) => {
    if (!rows.length) return [];
    if (!rows.every(inScope)) throw Error('SQL lifecycle fixture scope');
    await fixture.prepare();
    const columns = new Set(['content_key','updated_at','status','lane','review_state','headline','summary','body','sections','facts','source_snapshot','mode','event_type','target_date','surface','provider','prompt_version','model','block_type','reviewed_at','published_at','judge_score','judge_gate','judge_verdict','judge_why','reviewer_notes','flags','knowledge_ids','created_at','evergreen','evergreen_at','evergreen_by']);
    if (Object.keys(patch).some(key => !columns.has(key))) throw Error('Unmodeled SQL lifecycle patch');
    const previous = (await db.query("select current_setting('request.headers',true) as value")).rows[0].value;
    const requestHeaders = new Headers(headers);
    const updateHeaders = JSON.stringify({'x-content-publication-action':requestHeaders.get('x-content-publication-action') ?? ''});
    try {
      const updated = [];
      for (const row of rows) {
        // Synchronizing an already-stored fixture version is not the new owner
        // action. Only the actual conditional UPDATE gets its publish header.
        await db.query("select set_config('request.headers','{}',false)");
        const mapped = mapIds(row), serialized = JSON.stringify(row);
        if (!seeded.has(row.id)) await seedPublicationRow(db,mapped);
        else if (seeded.get(row.id) !== serialized) {
          const names = Object.keys(mapped).filter(key => columns.has(key));
          await db.query(`update generated_interpretations set (${names.join(',')})=(select ${names.join(',')} from jsonb_populate_record(null::generated_interpretations,$1)) where id=$2`, [mapped,mapped.id]);
        }
        const names = Object.keys(patch);
        await db.query("select set_config('request.headers',$1,false)",[updateHeaders]);
        const result = await db.query(`update generated_interpretations set (${names.join(',')})=(select ${names.join(',')} from jsonb_populate_record(null::generated_interpretations,$1)) where id=$2 and updated_at=$3 returning to_jsonb(generated_interpretations) as row`, [mapIds(patch),mapped.id,row.updated_at]);
        for (const value of result.rows) {
          const saved = mapIds(value.row,true);
          updated.push(saved);seeded.set(row.id,JSON.stringify(saved));
        }
      }
      return updated;
    } finally {
      await db.query("select set_config('request.headers',$1,false)",[previous ?? '{}']);
    }
  };
  fixture.patchMoonRows = (rows, patch, headers) => patchRows(rows, patch, headers,
    row => /^(?:cms\/lunation-(?:horoscopes|article)|authored\/sky-lunation-macro)\//u.test(row.content_key) && row.mode === 'article');
  fixture.patchArticleRows = (rows, patch, headers) => patchRows(rows, patch, headers,
    row => row.content_key.startsWith('education/astro-101/') && row.surface === 'education'
      && (['article','all'].includes(row.mode) || row.mode === 'studio-draft' && row.event_type === 'standalone-article-revision'));
  fixture.patchCalendarRows = (rows, patch, headers) => patchRows(rows, patch, headers,
    row => row.surface === 'sky' && (row.block_type == null || row.block_type === 'calendar_event') && Boolean(calendarPlanetaryIdentity(row.content_key)?.sign)
      && (row.mode === 'feed' || row.mode === 'studio-draft' && row.event_type === 'standalone-article-revision'));
  fixture.close=async()=>{await initializing;await db?.close();};
  return fixture;
}
