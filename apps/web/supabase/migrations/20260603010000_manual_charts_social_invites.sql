-- Manual natal charts, social invites, and account connections.
--
-- This migration assumes Supabase Auth is enabled and users are stored in
-- auth.users. It complements the app's existing user_profiles persistence.

create extension if not exists pgcrypto;

create table if not exists public.manual_charts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  first_name text,
  last_name text,
  relationship_type text not null default 'friend',
  birth_date date not null,
  birth_time time,
  birth_time_unknown boolean not null default false,
  birth_place text not null,
  birth_latitude double precision not null,
  birth_longitude double precision not null,
  birth_timezone text,
  natal_chart jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_charts_birth_time_required
    check (birth_time_unknown = true or birth_time is not null),
  constraint manual_charts_claimed_by_not_owner
    check (claimed_by_user_id is null or claimed_by_user_id <> owner_user_id)
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  connected_user_id uuid references auth.users(id) on delete cascade,
  manual_chart_id uuid references public.manual_charts(id) on delete cascade,
  status text not null default 'active',
  relationship_type text not null default 'friend',
  visibility text not null default 'connection',
  created_from text not null default 'manual_chart',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint connections_target_required
    check (connected_user_id is not null or manual_chart_id is not null),
  constraint connections_not_self
    check (connected_user_id is null or connected_user_id <> owner_user_id),
  constraint connections_status_valid
    check (status in ('active', 'pending', 'blocked', 'removed')),
  constraint connections_visibility_valid
    check (visibility in ('private', 'connection')),
  constraint connections_created_from_valid
    check (created_from in ('manual_chart', 'invite', 'search', 'accepted_invite'))
);

create unique index if not exists connections_unique_manual_chart
  on public.connections(owner_user_id, manual_chart_id)
  where manual_chart_id is not null;

create unique index if not exists connections_unique_connected_user
  on public.connections(owner_user_id, connected_user_id)
  where connected_user_id is not null;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete set null,
  manual_chart_id uuid references public.manual_charts(id) on delete set null,
  connection_id uuid references public.connections(id) on delete set null,
  invite_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  channel text not null,
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  status text not null default 'pending',
  message text,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invites_channel_valid
    check (channel in ('email', 'sms', 'social_link')),
  constraint invites_status_valid
    check (status in ('draft', 'pending', 'sent', 'accepted', 'expired', 'revoked')),
  constraint invites_recipient_required
    check (
      channel = 'social_link'
      or recipient_email is not null
      or recipient_phone is not null
    ),
  constraint invites_not_self
    check (accepted_by_user_id is null or accepted_by_user_id <> inviter_user_id)
);

create index if not exists manual_charts_owner_user_id_idx
  on public.manual_charts(owner_user_id);

create index if not exists manual_charts_claimed_by_user_id_idx
  on public.manual_charts(claimed_by_user_id);

create index if not exists connections_owner_user_id_idx
  on public.connections(owner_user_id);

create index if not exists connections_connected_user_id_idx
  on public.connections(connected_user_id);

create index if not exists invites_inviter_user_id_idx
  on public.invites(inviter_user_id);

create index if not exists invites_invite_token_idx
  on public.invites(invite_token);

create index if not exists invites_recipient_email_idx
  on public.invites(lower(recipient_email))
  where recipient_email is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists manual_charts_set_updated_at on public.manual_charts;
create trigger manual_charts_set_updated_at
  before update on public.manual_charts
  for each row execute function public.set_updated_at();

drop trigger if exists connections_set_updated_at on public.connections;
create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

drop trigger if exists invites_set_updated_at on public.invites;
create trigger invites_set_updated_at
  before update on public.invites
  for each row execute function public.set_updated_at();

alter table public.manual_charts enable row level security;
alter table public.connections enable row level security;
alter table public.invites enable row level security;

drop policy if exists "Users can manage their manual charts" on public.manual_charts;
create policy "Users can manage their manual charts"
  on public.manual_charts
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Claimed users can view their claimed manual chart" on public.manual_charts;
create policy "Claimed users can view their claimed manual chart"
  on public.manual_charts
  for select
  using (auth.uid() = claimed_by_user_id);

drop policy if exists "Users can view their own connections" on public.connections;
create policy "Users can view their own connections"
  on public.connections
  for select
  using (auth.uid() = owner_user_id or auth.uid() = connected_user_id);

drop policy if exists "Users can create their own connections" on public.connections;
create policy "Users can create their own connections"
  on public.connections
  for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "Users can update their own connections" on public.connections;
create policy "Users can update their own connections"
  on public.connections
  for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Users can delete their own connections" on public.connections;
create policy "Users can delete their own connections"
  on public.connections
  for delete
  using (auth.uid() = owner_user_id);

drop policy if exists "Users can manage invites they sent" on public.invites;
create policy "Users can manage invites they sent"
  on public.invites
  for all
  using (auth.uid() = inviter_user_id)
  with check (auth.uid() = inviter_user_id);

drop policy if exists "Accepted users can view their invite" on public.invites;
create policy "Accepted users can view their invite"
  on public.invites
  for select
  using (auth.uid() = accepted_by_user_id or auth.uid() = invited_user_id);

create or replace function public.accept_invite(invite_token_input text)
returns table (
  invite_id uuid,
  inviter_user_id uuid,
  connection_id uuid,
  manual_chart_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_row public.invites%rowtype;
  existing_connection_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invite.';
  end if;

  select *
    into invite_row
  from public.invites
  where invite_token = invite_token_input
    and status in ('pending', 'sent')
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invite is invalid, expired, or already accepted.';
  end if;

  if invite_row.inviter_user_id = auth.uid() then
    raise exception 'You cannot accept your own invite.';
  end if;

  update public.invites
  set
    status = 'accepted',
    accepted_by_user_id = auth.uid(),
    invited_user_id = auth.uid(),
    accepted_at = now()
  where id = invite_row.id;

  if invite_row.manual_chart_id is not null then
    update public.manual_charts
    set claimed_by_user_id = auth.uid()
    where id = invite_row.manual_chart_id
      and claimed_by_user_id is null;
  end if;

  if invite_row.connection_id is not null then
    update public.connections
    set
      connected_user_id = auth.uid(),
      status = 'active',
      accepted_at = coalesce(accepted_at, now()),
      created_from = 'accepted_invite'
    where id = invite_row.connection_id
    returning id into existing_connection_id;
  elsif invite_row.manual_chart_id is not null then
    update public.connections
    set
      connected_user_id = auth.uid(),
      status = 'active',
      accepted_at = coalesce(accepted_at, now()),
      created_from = 'accepted_invite'
    where owner_user_id = invite_row.inviter_user_id
      and manual_chart_id = invite_row.manual_chart_id
    returning id into existing_connection_id;
  end if;

  insert into public.connections (
    owner_user_id,
    connected_user_id,
    status,
    relationship_type,
    created_from,
    accepted_at
  )
  values (
    auth.uid(),
    invite_row.inviter_user_id,
    'active',
    'friend',
    'accepted_invite',
    now()
  )
  on conflict do nothing;

  return query
  select
    invite_row.id,
    invite_row.inviter_user_id,
    existing_connection_id,
    invite_row.manual_chart_id;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

comment on table public.manual_charts is
  'Birth details and cached natal chart data manually added by a user for another person.';

comment on table public.connections is
  'Relationship edges between a user and either another account or a manually added chart.';

comment on table public.invites is
  'Email, SMS, and social-link invitations that can convert a manual chart into a real account connection.';
