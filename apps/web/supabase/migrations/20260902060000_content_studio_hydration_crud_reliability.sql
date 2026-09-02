-- Content Studio and reader hydration both traverse generated_interpretations.
-- Keep the common live-provider and inventory scans index-backed, and expose a
-- tiny revision watermark that changes on publish, edit, demotion, or archive.

create index if not exists generated_interpretations_provider_updated_idx
  on public.generated_interpretations (provider, updated_at desc, id desc)
  where provider is not null;

create index if not exists generated_interpretations_updated_id_idx
  on public.generated_interpretations (updated_at desc, id desc);

create index if not exists generated_interpretations_active_serving_updated_idx
  on public.generated_interpretations (updated_at desc, id desc)
  where lane = 'serving' and status <> 'ARCHIVED';

-- Archived prose is never reader-serving. Normalize the one-way lifecycle so
-- old rows cannot look serving in Content Studio even though the reader hides them.
update public.generated_interpretations
set lane = 'reference'
where status = 'ARCHIVED' and lane = 'serving';

create or replace function public.content_runtime_revision(p_provider text)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(updated_at)
  from public.generated_interpretations
  where provider = p_provider;
$$;

revoke all on function public.content_runtime_revision(text) from public;
grant execute on function public.content_runtime_revision(text) to anon, authenticated;
