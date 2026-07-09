alter table public.generated_interpretations
  add column if not exists provider text default 'claude';

update public.generated_interpretations
set provider = coalesce(source_snapshot->>'provider', 'claude')
where provider is null;
