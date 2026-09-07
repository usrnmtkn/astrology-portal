create table if not exists public.report_share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  source_id uuid not null,
  share_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint report_share_links_source_kind_check
    check (source_kind in ('generated_interpretation', 'premium_report')),
  constraint report_share_links_owner_source_unique
    unique (user_id, source_kind, source_id),
  constraint report_share_links_share_key_unique
    unique (share_key)
);

create index if not exists report_share_links_active_key_idx
  on public.report_share_links (share_key)
  where revoked_at is null;

alter table public.report_share_links enable row level security;

drop policy if exists "Users can view their report share links" on public.report_share_links;
create policy "Users can view their report share links"
  on public.report_share_links
  for select
  using (auth.uid() = user_id);

-- Share creation and rotation are server-side only. The browser can inspect its
-- own share state, but cannot mint or modify bearer links directly.
grant select on public.report_share_links to authenticated;
