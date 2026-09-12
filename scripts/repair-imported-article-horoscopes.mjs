#!/usr/bin/env node
/** Prepare a reviewed, version-guarded repair. This script never calls a database. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { separateArticleHoroscopeRow, articleTemplateWithHoroscopes } from '../apps/web/src/content/skyArticleHoroscopes.mjs';
const [input,output]=process.argv.slice(2);
assert(input&&output,'Usage: node scripts/repair-imported-article-horoscopes.mjs /private/rows.json /private/plan.json');
const rows=JSON.parse(fs.readFileSync(input,'utf8'));
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const changes=rows.flatMap(row=>{
 const next=separateArticleHoroscopeRow(row);
 if(next===row)return [];
 assert(row.id&&row.updated_at,`${row.content_key}: saved identity/version required`);
 assert(row.status!=='LIVE',`${row.content_key}: published article requires a separate publication-aware repair`);
 const normalized=text=>text.replace(/\n{3,}/gu,'\n\n').trim();
 assert.equal(normalized(articleTemplateWithHoroscopes(next.body,next.sections)),normalized(row.body),`${row.content_key}: reader text changed`);
 assert.equal(next.status,row.status);
 next.source_snapshot.horoscopeSeparation.originalBodySha256=sha(row.body);
 return [{id:row.id,content_key:row.content_key,expected_updated_at:row.updated_at,original_body_sha256:sha(row.body),status:row.status,lane:row.lane,
  body:next.body,sections:next.sections,source_snapshot:next.source_snapshot,passageCount:next.sections.articleHoroscopes.passages.length}];
});
fs.writeFileSync(output,JSON.stringify({schema:'article-horoscope-repair-v1',changes},null,2),{mode:0o600});
const sqlString=value=>`'${value.replace(/'/gu,"''")}'`;
const payload=sqlString(JSON.stringify(changes));
const delimiter = '$repair_' + crypto.randomBytes(16).toString('hex') + '$';
assert(!payload.includes(delimiter));
const sql=`begin;
set local lock_timeout = '5s';
do ${delimiter}
declare item jsonb; oldrow public.generated_interpretations; repaired public.generated_interpretations; total integer := 0;
begin
 for item in select value from jsonb_array_elements(${payload}::jsonb) loop
  select * into oldrow from public.generated_interpretations where id=(item->>'id')::uuid for update;
  if oldrow.id is null or oldrow.content_key <> item->>'content_key'
    or oldrow.updated_at <> (item->>'expected_updated_at')::timestamptz
    or encode(sha256(convert_to(oldrow.body,'UTF8')),'hex') <> item->>'original_body_sha256'
    or oldrow.status = 'LIVE' then raise exception 'Article changed since repair preparation: %', item->>'content_key'; end if;
  update public.generated_interpretations set body=item->>'body', sections=item->'sections', source_snapshot=item->'source_snapshot'
    where id=oldrow.id and updated_at=oldrow.updated_at returning * into repaired;
  if repaired.id is null or repaired.status is distinct from oldrow.status or repaired.lane is distinct from oldrow.lane
    or repaired.review_state is distinct from oldrow.review_state or repaired.reviewed_at is distinct from oldrow.reviewed_at
    or repaired.published_at is distinct from oldrow.published_at or repaired.body <> item->>'body' or repaired.sections <> item->'sections'
    then raise exception 'Article repair verification failed: %', item->>'content_key'; end if;
  total := total + 1;
 end loop;
 if total <> ${changes.length} then raise exception 'Incomplete article repair'; end if;
end ${delimiter};
commit;
`;
fs.writeFileSync(output+'.sql',sql,{mode:0o600});
console.log(JSON.stringify({articles:changes.length,passages:changes.reduce((n,c)=>n+c.passageCount,0),plan:output,sql:output+'.sql',applied:false}));
