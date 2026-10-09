-- Keep each dated ingress visit's corrections separate, retaining legacy keys.
create or replace function public.studio_article_memory_key(k text) returns text
language sql immutable security invoker set search_path = '' as $$
  select case
    when k ~ '^sky-article(-revision)?/[a-z_]+/[a-z]+/[0-9]{4}(/[0-9]{4}-[0-9]{2}-[0-9]{2})?$'
      then replace(k, 'sky-article-revision/', 'sky-article/')
    when k ~ '^fallback-hook/sky-sign-copy/[a-z_]+/[a-z]+$' then k
    else null end;
$$;
revoke all on function public.studio_article_memory_key(text) from public, anon, authenticated;
grant execute on function public.studio_article_memory_key(text) to service_role;
