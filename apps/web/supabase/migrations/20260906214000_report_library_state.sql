create table if not exists public.user_report_library_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  source_id uuid not null,
  archived_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, source_kind, source_id),
  constraint user_report_library_state_source_kind_check
    check (source_kind in ('generated_interpretation', 'premium_report'))
);

create index if not exists user_report_library_state_user_active_idx
  on public.user_report_library_state (user_id, archived_at, seen_at, updated_at desc);

alter table public.user_report_library_state enable row level security;

drop policy if exists "Users can view their report library state" on public.user_report_library_state;
create policy "Users can view their report library state"
  on public.user_report_library_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their report library state" on public.user_report_library_state;
create policy "Users can create their report library state"
  on public.user_report_library_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their report library state" on public.user_report_library_state;
create policy "Users can update their report library state"
  on public.user_report_library_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their report library state" on public.user_report_library_state;
create policy "Users can delete their report library state"
  on public.user_report_library_state
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_report_library_state to authenticated;
