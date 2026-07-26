-- Search ranking and request-row identity for the unified Friends panel.
--
-- Discovery remains authenticated, rate-limited, block-aware, and completely
-- excludes private profiles. Pending requests expose only the same public Sun
-- sign as search; Moon, Rising, and natal-chart data remain friend-only.

create or replace function private.social_levenshtein(first_input text, second_input text)
returns integer
language plpgsql
immutable
strict
set search_path = private, public, extensions
as $$
declare
  first_value text := lower(first_input);
  second_value text := lower(second_input);
  first_length integer := char_length(first_value);
  second_length integer := char_length(second_value);
  previous_row integer[];
  current_row integer[];
  row_index integer;
  column_index integer;
  substitution_cost integer;
begin
  previous_row := array_fill(0, array[second_length + 1]);

  for column_index in 0..second_length loop
    previous_row[column_index + 1] := column_index;
  end loop;

  for row_index in 1..first_length loop
    current_row := array_fill(0, array[second_length + 1]);
    current_row[1] := row_index;

    for column_index in 1..second_length loop
      substitution_cost := case
        when substr(first_value, row_index, 1) = substr(second_value, column_index, 1) then 0
        else 1
      end;

      current_row[column_index + 1] := least(
        current_row[column_index] + 1,
        previous_row[column_index + 1] + 1,
        previous_row[column_index] + substitution_cost
      );
    end loop;

    previous_row := current_row;
  end loop;

  return previous_row[second_length + 1];
end;
$$;

revoke all on function private.social_levenshtein(text, text) from public;

create or replace function public.search_social_profiles(name_input text)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  relationship_status text,
  request_id uuid
)
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_query text := lower(
    regexp_replace(btrim(coalesce(name_input, '')), '\s+', ' ', 'g')
  );
  normalized_handle text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  normalized_handle := regexp_replace(normalized_query, '^@', '');

  if length(normalized_handle) < 2 then
    return;
  end if;

  perform private.consume_social_rate_limit('profile-search-minute', 60, 30);
  perform private.consume_social_rate_limit('profile-search-day', 86400, 250);

  return query
  with candidates as (
    select
      profile.user_id,
      profile.handle::text as handle,
      profile.display_name,
      profile.avatar_url,
      lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g')) as normalized_name,
      case
        when friendship.id is not null then 'friends'
        when pending_request.id is null then 'none'
        when pending_request.requester_user_id = current_user_id then 'request_sent'
        else 'request_received'
      end::text as relationship_status,
      pending_request.id as request_id
    from public.social_profiles profile
    left join public.social_friendships friendship
      on friendship.user_low_id = least(current_user_id, profile.user_id)
      and friendship.user_high_id = greatest(current_user_id, profile.user_id)
    left join lateral (
      select request.id, request.requester_user_id
      from public.social_friend_requests request
      where request.status = 'pending'
        and (
          (
            request.requester_user_id = current_user_id
            and request.recipient_user_id = profile.user_id
          )
          or
          (
            request.requester_user_id = profile.user_id
            and request.recipient_user_id = current_user_id
          )
        )
      order by request.created_at desc
      limit 1
    ) pending_request on true
    where profile.handle is not null
      and profile.user_id <> current_user_id
      and profile.discoverable
      and not exists (
        select 1
        from public.social_blocks block
        where (
          block.blocker_user_id = current_user_id
          and block.blocked_user_id = profile.user_id
        )
        or (
          block.blocker_user_id = profile.user_id
          and block.blocked_user_id = current_user_id
        )
      )
  ),
  ranked as (
    select
      candidate.*,
      (
        select max((
          select min(private.social_levenshtein(query_token, profile_token))
          from regexp_split_to_table(candidate.normalized_name, '\s+') profile_token
        ))
        from regexp_split_to_table(normalized_query, '\s+') query_token
      ) as farthest_token_distance,
      not exists (
        select 1
        from regexp_split_to_table(normalized_query, '\s+') query_token
        where not exists (
          select 1
          from regexp_split_to_table(candidate.normalized_name, '\s+') profile_token
          where profile_token like query_token || '%'
             or query_token like profile_token || '%'
        )
      ) as all_tokens_prefix_match
    from candidates candidate
  )
  select
    ranked.user_id,
    ranked.handle,
    ranked.display_name,
    ranked.avatar_url,
    ranked.relationship_status,
    ranked.request_id
  from ranked
  where lower(ranked.handle) = normalized_handle
     or lower(ranked.handle) like normalized_handle || '%'
     or ranked.normalized_name like normalized_query || '%'
     or ranked.all_tokens_prefix_match
     or ranked.farthest_token_distance <= 2
  order by
    case
      when lower(ranked.handle) = normalized_handle then 0
      when lower(ranked.handle) like normalized_handle || '%' then 1
      when ranked.normalized_name like normalized_query || '%' then 2
      when ranked.all_tokens_prefix_match then 3
      else 4
    end,
    ranked.farthest_token_distance,
    ranked.display_name,
    ranked.handle
  limit 20;
end;
$$;

drop function if exists public.list_social_friend_requests();

create function public.list_social_friend_requests()
returns table (
  request_id uuid,
  direction text,
  status text,
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  sun_sign text
)
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select
    request.id,
    case when request.recipient_user_id = auth.uid() then 'incoming' else 'outgoing' end,
    request.status,
    other_profile.user_id,
    other_profile.handle::text,
    other_profile.display_name,
    other_profile.avatar_url,
    request.created_at,
    (
      select nullif(position ->> 'sign', '')
      from jsonb_array_elements(
        coalesce(other_profile.natal_chart -> 'positions', '[]'::jsonb)
      ) position
      where lower(position ->> 'planet') = 'sun'
      limit 1
    )::text
  from public.social_friend_requests request
  join public.social_profiles other_profile
    on other_profile.user_id = case
      when request.recipient_user_id = auth.uid() then request.requester_user_id
      else request.recipient_user_id
    end
  where auth.uid() is not null
    and auth.uid() in (request.requester_user_id, request.recipient_user_id)
    and request.status = 'pending'
    and not exists (
      select 1
      from public.social_blocks block
      where (
        block.blocker_user_id = request.requester_user_id
        and block.blocked_user_id = request.recipient_user_id
      )
      or (
        block.blocker_user_id = request.recipient_user_id
        and block.blocked_user_id = request.requester_user_id
      )
    )
  order by request.created_at desc;
$$;

revoke all on function public.search_social_profiles(text) from public;
revoke all on function public.list_social_friend_requests() from public;

grant execute on function public.search_social_profiles(text) to authenticated;
grant execute on function public.list_social_friend_requests() to authenticated;

comment on function public.search_social_profiles(text) is
  'Private-safe ranked friend discovery: handle exact/prefix, name prefix, token prefix, then edit distance up to two.';

notify pgrst, 'reload schema';
