-- Canonical birth-time storage, report birth-data preflight support, and
-- job-specific immediate fulfillment pickup.

create or replace function public.canonical_birth_time_text(input_value text)
returns text
language plpgsql immutable strict set search_path = public as $$
declare
  value text := lower(btrim(input_value));
  pieces text[];
  hour_value integer;
  minute_value integer := 0;
  second_value integer := 0;
  meridiem text := null;
begin
  pieces := regexp_match(value, '^([0-9]{1,2})[[:space:]]*[:.][[:space:]]*([0-9]{1,2})[[:space:]]*([ap])[.]?[[:space:]]*m[.]?$');
  if pieces is not null then
    hour_value := pieces[1]::integer;
    minute_value := pieces[2]::integer;
    meridiem := pieces[3];
  else
    pieces := regexp_match(value, '^([0-9]{1,2})([0-9]{2})[[:space:]]*([ap])[.]?[[:space:]]*m[.]?$');
    if pieces is not null then
      hour_value := pieces[1]::integer;
      minute_value := pieces[2]::integer;
      meridiem := pieces[3];
    else
      pieces := regexp_match(value, '^([0-9]{1,2})[[:space:]]*([ap])[.]?[[:space:]]*m[.]?$');
      if pieces is not null then
        hour_value := pieces[1]::integer;
        meridiem := pieces[2];
      else
        pieces := regexp_match(value, '^([0-9]{1,2})[[:space:]]*:[[:space:]]*([0-9]{1,2})[[:space:]]*:[[:space:]]*([0-9]{1,2})(?:\.[0-9]+)?$');
        if pieces is not null then
          hour_value := pieces[1]::integer;
          minute_value := pieces[2]::integer;
          second_value := pieces[3]::integer;
        else
          pieces := regexp_match(value, '^([0-9]{1,2})[[:space:]]*[:.][[:space:]]*([0-9]{1,2})$');
          if pieces is not null then
            hour_value := pieces[1]::integer;
            minute_value := pieces[2]::integer;
          else
            pieces := regexp_match(value, '^([0-9]{1,2})([0-9]{2})$');
            if pieces is not null then
              hour_value := pieces[1]::integer;
              minute_value := pieces[2]::integer;
            else
              pieces := regexp_match(value, '^([0-9]{1,2})$');
              if pieces is not null then
                hour_value := pieces[1]::integer;
              else
                raise exception using errcode = '22007', message = 'Enter a valid birth time, such as 11:20 AM or 23:20.';
              end if;
            end if;
          end if;
        end if;
      end if;
    end if;
  end if;

  if minute_value < 0 or minute_value > 59 then
    raise exception using errcode = '22007', message = 'Enter a valid birth time, such as 11:20 AM or 23:20.';
  end if;
  if second_value < 0 or second_value > 59 then
    raise exception using errcode = '22007', message = 'Enter a valid birth time, such as 11:20 AM or 23:20.';
  end if;
  if meridiem is not null then
    if hour_value < 1 or hour_value > 12 then
      raise exception using errcode = '22007', message = 'Enter a valid birth time, such as 11:20 AM or 23:20.';
    end if;
    hour_value := case when meridiem = 'p' then (hour_value % 12) + 12 else hour_value % 12 end;
  elsif hour_value < 0 or hour_value > 23 then
    raise exception using errcode = '22007', message = 'Enter a valid birth time, such as 11:20 AM or 23:20.';
  end if;

  return lpad(hour_value::text, 2, '0') || ':' || lpad(minute_value::text, 2, '0');
end;
$$;

create or replace function public.normalize_user_profile_birth_times()
returns trigger
language plpgsql set search_path = public as $$
declare
  profile_value jsonb;
  normalized_charts jsonb;
begin
  profile_value := case when new.data ? 'profile' then new.data -> 'profile' else new.data end;
  if jsonb_typeof(profile_value -> 'charts') <> 'array' then return new; end if;

  select jsonb_agg(
    case
      when jsonb_typeof(chart.value) = 'object'
        and chart.value ? 'birthTime'
        and coalesce(btrim(chart.value ->> 'birthTime'), '') <> ''
        and lower(btrim(chart.value ->> 'birthTime')) not in ('time unknown', 'birth time needed')
      then jsonb_set(chart.value, '{birthTime}', to_jsonb(public.canonical_birth_time_text(chart.value ->> 'birthTime')), false)
      else chart.value
    end
    order by chart.ordinality
  ) into normalized_charts
  from jsonb_array_elements(profile_value -> 'charts') with ordinality as chart(value, ordinality);

  profile_value := jsonb_set(profile_value, '{charts}', coalesce(normalized_charts, '[]'::jsonb), false);
  new.data := case
    when new.data ? 'profile' then jsonb_set(new.data, '{profile}', profile_value, false)
    else profile_value
  end;
  return new;
end;
$$;

drop trigger if exists normalize_user_profile_birth_times on public.user_profiles;
create trigger normalize_user_profile_birth_times
before insert or update of data on public.user_profiles
for each row execute function public.normalize_user_profile_birth_times();

-- Repair legacy human-formatted values, including Marie's mixed-case AM value.
update public.user_profiles set data = data;

create or replace function public.claim_report_fulfillment_job(worker_id text, target_job_id uuid)
returns setof public.report_fulfillment_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidate as (
    select id
    from public.report_fulfillment_jobs
    where id = target_job_id
      and state in ('queued', 'retry')
      and run_after <= now()
    for update skip locked
  )
  update public.report_fulfillment_jobs jobs
  set state = 'running', locked_at = now(), locked_by = worker_id, attempt = jobs.attempt + 1
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

revoke all on function public.canonical_birth_time_text(text) from public, anon, authenticated;
revoke all on function public.claim_report_fulfillment_job(text, uuid) from public, anon, authenticated;
grant execute on function public.canonical_birth_time_text(text) to service_role;
grant execute on function public.claim_report_fulfillment_job(text, uuid) to service_role;

comment on function public.canonical_birth_time_text(text) is
  'Normalizes flexible human birth-time input to canonical HH:MM 24-hour storage or raises a user-facing validation error.';
comment on function public.claim_report_fulfillment_job(text, uuid) is
  'Claims one authorized job for immediate Authorize-button pickup; scheduled batch pickup remains the queue backbone.';
