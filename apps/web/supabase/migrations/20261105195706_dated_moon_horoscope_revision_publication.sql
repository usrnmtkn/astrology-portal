-- Reuse the existing private horoscope revision transaction for dated lunar sets.
-- Locks, exact version checks, receipts, history and grants remain in that function.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  old_guard text := $$coalesce(target.content_key,'') not like 'horoscope/%'$$;
begin
  if position(old_guard in definition)=0 then
    raise exception 'Unexpected horoscope publication guard; review the current function before applying this migration';
  end if;
  definition := replace(definition, old_guard, $guard$(coalesce(target.content_key,'') not like 'horoscope/%'
    and not (coalesce(target.content_key,'') ~ '^cms/lunation-horoscopes/[0-9]{4}-[0-9]{2}-[0-9]{2}/(new-moon|full-moon)/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$'
      and target.event_type is not distinct from 'lunation-horoscopes'))$guard$);
  execute definition;
end
$migration$;
