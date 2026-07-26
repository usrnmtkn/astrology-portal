-- Add single-use invitation links that are not bound to an email address or
-- phone number. Whoever receives the private token may preview and accept it
-- after signing in, subject to the existing block, expiry, and one-use rules.

alter table public.social_invitations
  drop constraint if exists social_invitations_contact_kind_valid;

alter table public.social_invitations
  add constraint social_invitations_contact_kind_valid
  check (contact_kind in ('email', 'phone', 'link'));

create or replace function public.create_social_share_invitation()
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
  raw_token text;
  resolved_invitation_id uuid;
  resolved_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  perform private.consume_social_rate_limit('share-invite-minute', 60, 10);
  perform private.consume_social_rate_limit('share-invite-day', 86400, 50);

  raw_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  insert into public.social_invitations (
    inviter_user_id,
    contact_kind,
    contact_hash,
    contact_hint,
    token_hash
  )
  values (
    auth.uid(),
    'link',
    encode(digest(raw_token || ':share-contact', 'sha256'), 'hex'),
    'Share link',
    encode(digest(raw_token, 'sha256'), 'hex')
  )
  returning id, social_invitations.expires_at
    into resolved_invitation_id, resolved_expires_at;

  return query
  select resolved_invitation_id, raw_token, resolved_expires_at;
end;
$$;

create or replace function private.social_invitation_matches_current_user(
  invitation public.social_invitations
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, private, auth, extensions
as $$
declare
  current_email text;
  current_phone text;
  current_contact_hash text;
begin
  if auth.uid() is null then
    return false;
  end if;

  if invitation.contact_kind = 'link' then
    return true;
  end if;

  select
    lower(btrim(coalesce(member.email, ''))),
    regexp_replace(coalesce(member.phone, ''), '[^0-9+]', '', 'g')
  into current_email, current_phone
  from auth.users member
  where member.id = auth.uid();

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

  return current_contact_hash = invitation.contact_hash;
end;
$$;

revoke all on function public.create_social_share_invitation() from public;
revoke all on function private.social_invitation_matches_current_user(
  public.social_invitations
) from public;

grant execute on function public.create_social_share_invitation() to authenticated;

do $realtime$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'social_invitations'
  ) then
    alter publication supabase_realtime add table public.social_invitations;
  end if;
end;
$realtime$;

comment on function public.create_social_share_invitation() is
  'Creates a rate-limited, single-use social invitation link for the signed-in member to share.';

notify pgrst, 'reload schema';
