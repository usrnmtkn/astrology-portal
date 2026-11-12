-- Preserve the existing transaction, permissions, locks, receipts and CAS checks.
-- Extend only its target guard to exact manual Calendar event write-ups.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  planets text := '(mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith)';
  signs text := '(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)';
  calendar_keys text;
  target_guard text := $guard$not (
      (coalesce(target.content_key,'') ~ '^article/(manual|guide)/' and coalesce(target.mode,'')='article')
      or (coalesce(target.content_key,'') like 'education/astro-101/%'
        and target.surface is not distinct from 'education' and coalesce(target.mode,'') in ('article','all'))
    )$guard$;
  extended_guard text;
begin
  if length(definition)-length(replace(definition,target_guard,'')) <> length(target_guard) then
    raise exception 'Unexpected article revision target guard; review current schema';
  end if;
  calendar_keys := '^(' ||
    'sky\.ingress\.' || planets || '\.' || signs || '(\.[0-9]{4}-[0-9]{2}-[0-9]{2})?' ||
    '|sky-ingress-' || planets || '-' || signs || '(-[0-9]{4}-[0-9]{2}-[0-9]{2})?' ||
    '|sky-' || planets || '-(enters|in)-' || signs ||
    '|sky\.station\.' || planets || '\.' || signs || '\.(direct|retrograde)' ||
    '|sky\.retrograde\.' || planets || '\.' || signs || '\.station_(direct|retrograde)' ||
    '|fallback-hook/sky\.retrograde/' || planets || '/' || signs || '/station-(direct|retrograde)' || ')$';
  extended_guard := replace(target_guard, E'\n    )', format($calendar$
      or (target.surface is not distinct from 'sky' and target.mode is not distinct from 'feed'
        and target.block_type is not distinct from 'calendar_event' and coalesce(target.content_key,'') ~ %L
        and proposal.surface is not distinct from target.surface and proposal.block_type is not distinct from target.block_type
        and proposal.sections->'slots' is not distinct from target.sections->'slots')
    )$calendar$, calendar_keys));
  execute replace(definition,target_guard,extended_guard);
end
$migration$;
