-- Replace opaque share-link tokens with readable, single-use invitation codes.
-- The code remains a bearer secret: only its hash is used for redemption, while
-- the inviter-only contact_hint makes the code visible in invitation history.

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
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw_token text := '';
  token_index integer;
  resolved_invitation_id uuid;
  resolved_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  perform private.consume_social_rate_limit('share-invite-minute', 60, 10);
  perform private.consume_social_rate_limit('share-invite-day', 86400, 50);

  for token_index in 1..12 loop
    if token_index in (5, 9) then
      raw_token := raw_token || '-';
    end if;

    raw_token := raw_token || substr(
      alphabet,
      (get_byte(gen_random_bytes(1), 0) % length(alphabet)) + 1,
      1
    );
  end loop;

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
    raw_token,
    encode(digest(raw_token, 'sha256'), 'hex')
  )
  returning id, social_invitations.expires_at
    into resolved_invitation_id, resolved_expires_at;

  return query
  select resolved_invitation_id, raw_token, resolved_expires_at;
end;
$$;

revoke all on function public.create_social_share_invitation() from public;
grant execute on function public.create_social_share_invitation() to authenticated;

comment on function public.create_social_share_invitation() is
  'Creates a rate-limited, single-use invitation with a readable 12-character code.';

notify pgrst, 'reload schema';
