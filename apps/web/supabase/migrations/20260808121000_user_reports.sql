-- Frozen facts envelope for private premium reports. Browser clients may read
-- their own rows; creation, regeneration, and status changes remain server-side.

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null,
  subject_id text,
  period_start date not null,
  period_end date not null,
  facts jsonb not null,
  facts_engine text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reports_report_type_check
    check (report_type in ('year_ahead', 'relationship', 'saturn_return')),
  constraint user_reports_status_check
    check (status in ('draft', 'needs_review', 'approved', 'live')),
  constraint user_reports_period_check
    check (period_end >= period_start)
);

create unique index if not exists user_reports_unique_period_idx
  on public.user_reports (user_id, report_type, subject_id, period_start)
  nulls not distinct;

create index if not exists user_reports_owner_status_idx
  on public.user_reports (user_id, status, period_start desc);

create or replace function public.set_user_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_reports_updated_at on public.user_reports;
create trigger user_reports_updated_at
before update on public.user_reports
for each row execute function public.set_user_reports_updated_at();

alter table public.user_reports enable row level security;

drop policy if exists "Users can view their reports" on public.user_reports;
create policy "Users can view their reports"
  on public.user_reports
  for select
  using (auth.uid() = user_id);

-- No INSERT, UPDATE, or DELETE policy is intentional. The service role bypasses
-- RLS for server-side assembly while browser clients remain read-only.
