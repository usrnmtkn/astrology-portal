-- Extend the existing private-revision transaction only for reusable Natal
-- editorial identities. Locks, receipts, versions and function grants stay intact.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  target_guard text := $guard$(coalesce(target.content_key,'') ~ '^article/(manual|guide)/' and coalesce(target.mode,'')='article')$guard$;
  editorial_keys text := '^cms/(natal-twelfth-ruler/(you|they)/(introduction|ruler-house/([1-9]|1[0-2]))|natal-chart-context/(you|they)/sect/(day|night)|natal-planet-sect/(you|they)/(jupiter|venus|mars|saturn)/(day|night))$';
  placement_keys text := '^cms/natal-planet-sect/(you|they)/(jupiter|venus|mars|saturn)/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)(/house-([1-9]|1[0-2]))?/(day|night)$';
  extended_guard text;
begin
  if length(definition)-length(replace(definition,target_guard,'')) <> length(target_guard) then
    raise exception 'Unexpected private revision target guard; review current schema';
  end if;
  extended_guard := target_guard || format($natal$
      or (target.surface is not distinct from 'natal' and target.mode is not distinct from 'in_depth'
        and target.block_type is not distinct from 'essay' and target.target_date is null
        and target.lane is not distinct from 'serving' and coalesce(target.review_state,'')=''
        and coalesce(target.provider,'')<>'tldrastro-fallback-architecture-v3'
        and coalesce(target.source_snapshot->>'sourcePackage','')<>'tldrastro-fallback-architecture-v3'
        and coalesce(target.facts->'fallbackArchitectureV3','null'::jsonb) in ('null'::jsonb,'false'::jsonb)
        and target.facts->>'scope'='editorial_library'
        and target.facts->>'audience'=split_part(target.content_key,'/',3)
        and target.source_snapshot->>'contentSystem'='editorial-library'
        and coalesce(target.sections->'packageRecord','null'::jsonb)='null'::jsonb
        and coalesce(target.sections->'packageDraft','null'::jsonb)='null'::jsonb
        and (coalesce(target.content_key,'') ~ %L
          or (coalesce(target.content_key,'') ~ %L
            and target.facts->>'planet'=split_part(target.content_key,'/',4)
            and target.facts->>'sign'=split_part(target.content_key,'/',5)
            and target.facts->>'sect'=substring(target.content_key from '(day|night)$')
            and target.facts->>'houseSystem'='whole-sign'
            and target.facts->'house' is not distinct from to_jsonb(substring(target.content_key from '/house-([1-9]|1[0-2])/')::integer)))
        and proposal.surface is not distinct from target.surface
        and proposal.block_type is not distinct from target.block_type
        and proposal.source_snapshot->'contentSystem' is not distinct from target.source_snapshot->'contentSystem'
        and proposal.source_snapshot->'contentType' is not distinct from target.source_snapshot->'contentType'
        and proposal.source_snapshot->'contextType' is not distinct from target.source_snapshot->'contextType'
        and coalesce(proposal.sections->'packageRecord','null'::jsonb)='null'::jsonb
        and coalesce(proposal.sections->'packageDraft','null'::jsonb)='null'::jsonb
        and proposal.facts->'scope' is not distinct from target.facts->'scope'
        and proposal.facts->'audience' is not distinct from target.facts->'audience'
        and proposal.facts->'planet' is not distinct from target.facts->'planet'
        and proposal.facts->'sign' is not distinct from target.facts->'sign'
        and proposal.facts->'house' is not distinct from target.facts->'house'
        and proposal.facts->'sect' is not distinct from target.facts->'sect'
        and proposal.facts->'natalHouse' is not distinct from target.facts->'natalHouse'
        and proposal.facts->'rulerHouse' is not distinct from target.facts->'rulerHouse'
        and proposal.facts->'houseSystem' is not distinct from target.facts->'houseSystem'
        and proposal.facts->'rulerSystem' is not distinct from target.facts->'rulerSystem')$natal$, editorial_keys, placement_keys);
  execute replace(definition,target_guard,extended_guard);
end
$migration$;
