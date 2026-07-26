-- Provider-neutral email/phone invitations.
--
-- The database stores only a one-way contact hash, never the raw email or
-- phone number. The client can hand the one-time link to the member's own
-- mail/SMS composer until a transactional delivery provider is configured.

create table if not exists public.social_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  contact_kind text not null,
  contact_hash text not null,
  token_hash text not null unique,
  claimed_by_user_id uuid references auth.users(id) on delete cascade,
  claimed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  constraint social_invitations_contact_kind_valid
    check (contact_kind in ('email', 'phone')),
  constraint social_invitations_claim_not_inviter
    check (claimed_by_user_id is null or claimed_by_user_id <> inviter_user_id)
);

create index if not exists social_invitations_inviter_created_idx
  on public.social_invitations(inviter_user_id, created_at desc);

alter table public.social_invitations enable row level security;

drop policy if exists "Members can view invitations they created"
  on public.social_invitations;
create policy "Members can view invitations they created"
  on public.social_invitations
  for select
  using (auth.uid() = inviter_user_id);

revoke all on table public.social_invitations from public, anon;
grant select on table public.social_invitations to authenticated;

create or replace function public.create_social_invitation(
  contact_kind_input text,
  contact_input text
)
returns table (
  invitation_id uuid,
  invitation_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  normalized_kind text := lower(btrim(coalesce(contact_kind_input, '')));
  normalized_contact text;
  raw_token text;
  resolved_invitation_id uuid;
  resolved_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if normalized_kind = 'email' then
    normalized_contact := lower(btrim(coalesce(contact_input, '')));

    if normalized_contact !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Enter a valid email address.';
    end if;
  elsif normalized_kind = 'phone' then
    normalized_contact := regexp_replace(coalesce(contact_input, ''), '[^0-9+]', '', 'g');

    if normalized_contact !~ '^\+?[0-9]{8,15}$' then
      raise exception 'Enter a valid phone number with country code.';
    end if;
  else
    raise exception 'Choose email or phone.';
  end if;

  perform private.consume_social_rate_limit('contact-invite-minute', 60, 10);
  perform private.consume_social_rate_limit('contact-invite-day', 86400, 50);

  raw_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  insert into public.social_invitations (
    inviter_user_id,
    contact_kind,
    contact_hash,
    token_hash
  )
  values (
    auth.uid(),
    normalized_kind,
    encode(digest(normalized_contact, 'sha256'), 'hex'),
    encode(digest(raw_token, 'sha256'), 'hex')
  )
  returning id, social_invitations.expires_at
    into resolved_invitation_id, resolved_expires_at;

  return query
  select resolved_invitation_id, raw_token, resolved_expires_at;
end;
$$;

create or replace function public.claim_social_invitation(invitation_token_input text)
returns table (
  invitation_id uuid,
  request_id uuid,
  request_status text
)
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  invitation public.social_invitations%rowtype;
  current_email text;
  current_phone text;
  current_contact_hash text;
  resolved_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select *
    into invitation
  from public.social_invitations candidate
  where candidate.token_hash = encode(
    digest(btrim(coalesce(invitation_token_input, '')), 'sha256'),
    'hex'
  )
    and candidate.cancelled_at is null
    and candidate.expires_at > now()
  for update;

  if not found then
    raise exception 'This invitation is invalid or has expired.';
  end if;

  if invitation.inviter_user_id = current_user_id then
    raise exception 'You cannot accept your own invitation.';
  end if;

  select lower(btrim(coalesce(member.email, ''))), regexp_replace(
      coalesce(member.phone, ''),
      '[^0-9+]',
      '',
      'g'
    )
    into current_email, current_phone
  from auth.users member
  where member.id = current_user_id;

  current_contact_hash := encode(
    digest(
      case
        when invitation.contact_kind = 'email' then current_email
        else current_phone
      end,
      'sha256'
    ),
    'hex'
  );

  if current_contact_hash <> invitation.contact_hash then
    raise exception 'Sign in with the email address or phone number that received this invitation.';
  end if;

  if invitation.claimed_by_user_id is not null
    and invitation.claimed_by_user_id <> current_user_id then
    raise exception 'This invitation has already been used.';
  end if;

  if exists (
    select 1
    from public.social_friendships friendship
    where friendship.user_low_id = least(invitation.inviter_user_id, current_user_id)
      and friendship.user_high_id = greatest(invitation.inviter_user_id, current_user_id)
  ) then
    update public.social_invitations
    set
      claimed_by_user_id = current_user_id,
      claimed_at = coalesce(claimed_at, now())
    where id = invitation.id;

    return query select invitation.id, null::uuid, 'friends'::text;
    return;
  end if;

  select request.id
    into resolved_request_id
  from public.social_friend_requests request
  where request.status = 'pending'
    and (
      (
        request.requester_user_id = invitation.inviter_user_id
        and request.recipient_user_id = current_user_id
      )
      or
      (
        request.requester_user_id = current_user_id
        and request.recipient_user_id = invitation.inviter_user_id
      )
    )
  order by request.created_at desc
  limit 1;

  if resolved_request_id is null then
    insert into public.social_friend_requests (
      requester_user_id,
      recipient_user_id
    )
    values (
      invitation.inviter_user_id,
      current_user_id
    )
    returning id into resolved_request_id;
  end if;

  update public.social_invitations
  set
    claimed_by_user_id = current_user_id,
    claimed_at = coalesce(claimed_at, now())
  where id = invitation.id;

  return query select invitation.id, resolved_request_id, 'pending'::text;
end;
$$;

revoke all on function public.create_social_invitation(text, text) from public;
revoke all on function public.claim_social_invitation(text) from public;

grant execute on function public.create_social_invitation(text, text) to authenticated;
grant execute on function public.claim_social_invitation(text) to authenticated;

comment on table public.social_invitations is
  'One-time social invitation metadata with hashed contact and token values only.';

notify pgrst, 'reload schema';
