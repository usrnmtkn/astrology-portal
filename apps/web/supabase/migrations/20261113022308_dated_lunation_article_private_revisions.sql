-- Keep the existing article marker and all prior guards intact so independent
-- source-family extensions compose without replacing locks, receipts or CAS.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  article_guard text := $guard$(coalesce(target.content_key,'') ~ '^article/(manual|guide)/' and coalesce(target.mode,'')='article')$guard$;
  dated_guard text := $guard$
      or (coalesce(target.content_key,'') ~ '^cms/lunation-article/[0-9]{4}-[0-9]{2}-[0-9]{2}/(new-moon|full-moon)/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$'
        and target.surface is not distinct from 'sky' and target.mode is not distinct from 'article'
        and target.event_type is not distinct from 'lunation-article'
        and target.lane is not distinct from 'serving' and coalesce(target.review_state,'')=''
        and coalesce(target.provider,'')<>'tldrastro-fallback-architecture-v3'
        and coalesce(target.source_snapshot->>'sourcePackage','')<>'tldrastro-fallback-architecture-v3'
        and coalesce(target.facts->'fallbackArchitectureV3','null'::jsonb) in ('null'::jsonb,'false'::jsonb)
        and proposal.surface is not distinct from target.surface and proposal.block_type is not distinct from target.block_type
        and proposal.target_date is not distinct from target.target_date
        and proposal.facts is not distinct from target.facts)$guard$;
begin
  if length(definition)-length(replace(definition,article_guard,''))<>length(article_guard)
    or position(dated_guard in definition)>0 then
    raise exception 'Unexpected dated article revision guard; review current schema';
  end if;
  execute replace(definition,article_guard,article_guard||dated_guard);
end
$migration$;
