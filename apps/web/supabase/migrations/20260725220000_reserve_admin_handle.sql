-- Reserve official social handles for explicitly marked admin accounts.

create table if not exists public.reserved_social_handles (
  handle text primary key,
  allowed_app_role text not null,
  created_at timestamptz not null default now(),
  constraint reserved_social_handles_format
    check (handle ~ '^[a-z][a-z0-9_]{2,23}$')
);

insert into public.reserved_social_handles (handle, allowed_app_role)
values ('tldrastro', 'admin')
on conflict (handle) do update
set allowed_app_role = excluded.allowed_app_role;

alter table public.reserved_social_handles enable row level security;
revoke all on table public.reserved_social_handles from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from public.social_profiles profile
    left join auth.users account on account.id = profile.user_id
    where lower(profile.handle) = 'tldrastro'
      and coalesce(account.raw_app_meta_data ->> 'role', '') <> 'admin'
  ) then
    raise exception '@tldrastro is already assigned to a non-admin account.';
  end if;
end;
$$;

create or replace function public.enforce_reserved_social_handle()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  required_role text;
  current_app_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
begin
  if new.handle is null then
    return new;
  end if;

  select reserved.allowed_app_role
  into required_role
  from public.reserved_social_handles reserved
  where reserved.handle = lower(new.handle);

  if required_role is not null and current_app_role <> required_role then
    raise exception using
      errcode = '23505',
      message = 'That handle is reserved.';
  end if;

  return new;
end;
$$;

drop trigger if exists social_profiles_enforce_reserved_handle on public.social_profiles;
create trigger social_profiles_enforce_reserved_handle
  before insert or update of handle on public.social_profiles
  for each row execute function public.enforce_reserved_social_handle();

revoke all on function public.enforce_reserved_social_handle() from public;

comment on table public.reserved_social_handles is
  'Official handles that may only be claimed by accounts with the matching app_metadata role.';
