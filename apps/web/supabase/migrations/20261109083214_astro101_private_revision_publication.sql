-- Extend the existing locked, versioned publication transaction to Learn pages.
-- No data changes, new privileges, backfill, or publication-state changes.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  target_guard text := $$coalesce(target.content_key,'') !~ '^article/(manual|guide)/'
    or target.mode is distinct from 'article'$$;
begin
  if position(target_guard in definition)=0 then
    raise exception 'Unexpected article revision target guard; review current schema';
  end if;
  definition := replace(definition, target_guard, $guard$not (
      (coalesce(target.content_key,'') ~ '^article/(manual|guide)/' and coalesce(target.mode,'')='article')
      or (coalesce(target.content_key,'') like 'education/astro-101/%'
        and target.surface is not distinct from 'education' and coalesce(target.mode,'') in ('article','all'))
    )$guard$);
  execute definition;
end
$migration$;
