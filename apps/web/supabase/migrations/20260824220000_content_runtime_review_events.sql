-- Privacy-limited runtime QA for horoscopes that remain live after a
-- conditional editorial section is omitted. This table intentionally stores
-- no user id, chart id, coordinates, location, timezone, prose, or birth data.

create table if not exists public.content_runtime_review_events (
  fingerprint text primary key,
  surface text not null,
  event_date date not null,
  event_kind text,
  sign text,
  rising_sign text,
  section_id text not null,
  omitted_content_key text not null,
  fallback_content_key text,
  reason text not null default 'missing-or-ineligible',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count bigint not null default 1,
  constraint content_runtime_review_events_surface_check
    check (surface in ('you-daily', 'weekly-horoscope')),
  constraint content_runtime_review_events_reason_check
    check (reason = 'missing-or-ineligible'),
  constraint content_runtime_review_events_fingerprint_check
    check (fingerprint ~ '^[a-f0-9]{64}$'),
  constraint content_runtime_review_events_occurrence_count_check
    check (occurrence_count > 0)
);

create index if not exists content_runtime_review_events_last_seen_idx
  on public.content_runtime_review_events (last_seen_at desc);

alter table public.content_runtime_review_events enable row level security;

revoke all on table public.content_runtime_review_events from anon, authenticated;

create or replace function public.record_content_runtime_review_event(
  p_fingerprint text,
  p_surface text,
  p_event_date date,
  p_event_kind text,
  p_sign text,
  p_rising_sign text,
  p_section_id text,
  p_omitted_content_key text,
  p_fallback_content_key text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.content_runtime_review_events (
    fingerprint,
    surface,
    event_date,
    event_kind,
    sign,
    rising_sign,
    section_id,
    omitted_content_key,
    fallback_content_key,
    reason
  ) values (
    p_fingerprint,
    p_surface,
    p_event_date,
    p_event_kind,
    p_sign,
    p_rising_sign,
    p_section_id,
    p_omitted_content_key,
    p_fallback_content_key,
    p_reason
  )
  on conflict (fingerprint) do update set
    last_seen_at = now(),
    occurrence_count = public.content_runtime_review_events.occurrence_count + 1,
    fallback_content_key = excluded.fallback_content_key,
    reason = excluded.reason;
end;
$$;

revoke all on function public.record_content_runtime_review_event(text, text, date, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_content_runtime_review_event(text, text, date, text, text, text, text, text, text, text)
  to service_role;

