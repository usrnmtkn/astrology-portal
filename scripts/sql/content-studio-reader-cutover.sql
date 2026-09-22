-- Activation phase ONLY AFTER the compatible reader deployment is verified.
-- This script is separate from additive migrations to avoid breaking the old
-- browser while the new endpoint is being deployed. Never roll back these grants.
begin;
revoke all on public.generated_interpretations from public, anon, authenticated;
-- Column grants are independent of table grants; close those as well.
do $$
declare columns text;
begin
  select string_agg(quote_ident(attname),',') into columns from pg_attribute
    where attrelid='public.generated_interpretations'::regclass and attnum>0 and not attisdropped;
  execute format('revoke select (%s), insert (%s), update (%s), references (%s) on public.generated_interpretations from public, anon, authenticated',columns,columns,columns,columns);
  if has_table_privilege('anon','public.generated_interpretations','select')
    or has_table_privilege('authenticated','public.generated_interpretations','select')
    or has_any_column_privilege('anon','public.generated_interpretations','select')
    or has_any_column_privilege('authenticated','public.generated_interpretations','select') then
    raise exception 'Raw authoring access remains; reader cutover refused';
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
