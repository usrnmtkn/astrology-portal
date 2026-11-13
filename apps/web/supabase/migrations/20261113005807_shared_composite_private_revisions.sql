-- Extend only the reusable target identities in the existing publication transaction.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  article_guard text := $guard$(coalesce(target.content_key,'') ~ '^article/(manual|guide)/' and coalesce(target.mode,'')='article')$guard$;
  point text := '(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|north_node|south_node|ascendant|descendant|midheaven|imum_coeli)';
  sign text := '(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)';
  house text := '([1-9]|1[0-2])';
  keys text;
begin
  if length(definition)-length(replace(definition,article_guard,'')) <> length(article_guard)
    or position('target.surface is not distinct from ''composite''' in definition)>0 then
    raise exception 'Unexpected shared-source publication guard; review current schema';
  end if;
  keys := '^(composite\.(' || point || '|house\.' || point || '\.house_' || house
    || '|aspect\.' || point || '\.(conjunction|sextile|square|trine|opposition)\.' || point || ')'
    || '|composite-' || replace(point,'_','-') || '-(in-' || sign || '|house-?' || house || '))$';
  execute replace(definition, article_guard, article_guard || format($composite$
      or (target.surface is not distinct from 'composite' and target.mode is not distinct from 'feed'
        and coalesce(target.content_key,'') ~ %L and target.target_date is null
        and target.lane is not distinct from 'serving' and coalesce(target.review_state,'')=''
        and coalesce(target.facts->'sampleOnly','false'::jsonb)='false'::jsonb
        and coalesce(target.source_snapshot->'sampleOnly','false'::jsonb)='false'::jsonb
        and coalesce(target.provider,'')<>'tldrastro-fallback-architecture-v3'
        and coalesce(target.source_snapshot->>'sourcePackage','')<>'tldrastro-fallback-architecture-v3'
        and coalesce(target.facts->'fallbackArchitectureV3','null'::jsonb) in ('null'::jsonb,'false'::jsonb)
        and proposal.surface is not distinct from target.surface and proposal.block_type is not distinct from target.block_type
        and proposal.target_date is null and coalesce(proposal.facts,'{}'::jsonb)=coalesce(target.facts,'{}'::jsonb)
        and coalesce(proposal.source_snapshot->'sampleOnly','false'::jsonb)='false'::jsonb)$composite$,keys));
end
$migration$;
