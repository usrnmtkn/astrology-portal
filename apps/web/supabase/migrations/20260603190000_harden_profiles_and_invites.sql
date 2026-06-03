-- Harden profile persistence and social invite acceptance.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can manage their profile" on public.user_profiles;
create policy "Users can manage their profile"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop policy if exists "Users can manage invites they sent" on public.invites;
create policy "Users can manage invites they sent"
  on public.invites
  for all
  using (auth.uid() = inviter_user_id)
  with check (
    auth.uid() = inviter_user_id
    and (
      manual_chart_id is null
      or exists (
        select 1
        from public.manual_charts
        where manual_charts.id = invites.manual_chart_id
          and manual_charts.owner_user_id = auth.uid()
      )
    )
    and (
      connection_id is null
      or exists (
        select 1
        from public.connections
        where connections.id = invites.connection_id
          and connections.owner_user_id = auth.uid()
          and (
            invites.manual_chart_id is null
            or connections.manual_chart_id = invites.manual_chart_id
          )
      )
    )
  );

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

  if invite_row.manual_chart_id is not null then
    update public.manual_charts
    set claimed_by_user_id = auth.uid()
    where id = invite_row.manual_chart_id
      and owner_user_id = invite_row.inviter_user_id
      and claimed_by_user_id is null;

    if not found then
      raise exception 'This chart invite has already been claimed or is invalid.';
    end if;
  end if;

  if invite_row.connection_id is not null then
    update public.connections
    set
      connected_user_id = auth.uid(),
      status = 'active',
      accepted_at = coalesce(accepted_at, now()),
      created_from = 'accepted_invite'
    where id = invite_row.connection_id
      and owner_user_id = invite_row.inviter_user_id
      and connected_user_id is null
      and (
        invite_row.manual_chart_id is null
        or manual_chart_id = invite_row.manual_chart_id
      )
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
      and connected_user_id is null
    returning id into existing_connection_id;
  end if;

  if (invite_row.manual_chart_id is not null or invite_row.connection_id is not null) and existing_connection_id is null then
    raise exception 'This chart connection has already been claimed or is invalid.';
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

  update public.invites
  set
    status = 'accepted',
    accepted_by_user_id = auth.uid(),
    invited_user_id = auth.uid(),
    accepted_at = now()
  where id = invite_row.id;

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
