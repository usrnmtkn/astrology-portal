-- Capabilities are hashed; calendar applications receive only the read token.
create table public.calendar_subscriptions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  manage_token_hash text not null check (manage_token_hash ~ '^[a-f0-9]{64}$'),
  include text[] not null check (cardinality(include) between 1 and 8 and include <@ array['lunations','moon-signs','seasons','ingresses','retrogrades','key','weekly','aspects']::text[]),
  reminder text not null check (reminder in ('None','At the time','Day before')),
  time_zone text not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz
);

-- A draft edit never overwrites the last published event.
create table public.calendar_feed_events (
  id uuid primary key default gen_random_uuid(),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  published jsonb check (published is null or jsonb_typeof(published) = 'object'),
  cancelled boolean not null default false,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  published_at timestamptz
);

alter table public.calendar_subscriptions enable row level security;
alter table public.calendar_feed_events enable row level security;
revoke all on public.calendar_subscriptions, public.calendar_feed_events from public, anon, authenticated;
grant select, insert, update on public.calendar_subscriptions, public.calendar_feed_events to service_role;

create function public.calendar_touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  if tg_table_name = 'calendar_subscriptions' then
    new.revision = old.revision + 1;
  end if;
  return new;
end;
$$;
revoke all on function public.calendar_touch_updated_at() from public, anon, authenticated;
grant execute on function public.calendar_touch_updated_at() to service_role;
create trigger calendar_subscriptions_updated before update on public.calendar_subscriptions
for each row execute function public.calendar_touch_updated_at();
create trigger calendar_feed_events_updated before update on public.calendar_feed_events
for each row execute function public.calendar_touch_updated_at();
