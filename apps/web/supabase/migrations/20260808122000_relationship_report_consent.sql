-- Consent gate for relationship-report composition and reads.
--
-- Subject references are explicit polymorphic identifiers:
--   friendship:<uuid>
--   manual_chart:<uuid>

create or replace function public.can_read_chart_for_report(
  viewer uuid,
  subject_ref text
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, auth, extensions
as $$
declare
  subject_kind text := split_part(coalesce(subject_ref, ''), ':', 1);
  subject_id_text text := split_part(coalesce(subject_ref, ''), ':', 2);
  subject_id uuid;
begin
  if viewer is null then
    return false;
  end if;

  -- Authenticated callers may ask only about themselves. The service role has
  -- no auth.uid() and supplies the already-verified viewer explicitly.
  if auth.uid() is not null and auth.uid() <> viewer then
    return false;
  end if;

  if subject_kind not in ('friendship', 'manual_chart')
    or subject_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  subject_id := subject_id_text::uuid;

  if subject_kind = 'friendship' then
    return exists (
      select 1
      from public.social_friendships friendship
      where friendship.id = subject_id
        and viewer in (friendship.user_low_id, friendship.user_high_id)
        and case
          when viewer = friendship.user_low_id then friendship.high_shares_chart
          else friendship.low_shares_chart
        end
        and not exists (
          select 1
          from public.social_blocks block
          where (
            block.blocker_user_id = friendship.user_low_id
            and block.blocked_user_id = friendship.user_high_id
          ) or (
            block.blocker_user_id = friendship.user_high_id
            and block.blocked_user_id = friendship.user_low_id
          )
        )
    );
  end if;

  return exists (
    select 1
    from public.manual_charts chart
    where chart.id = subject_id
      and chart.owner_user_id = viewer
      and (
        chart.claimed_by_user_id is null
        or exists (
          select 1
          from public.social_friendships friendship
          where viewer in (friendship.user_low_id, friendship.user_high_id)
            and chart.claimed_by_user_id in (friendship.user_low_id, friendship.user_high_id)
            and case
              when chart.claimed_by_user_id = friendship.user_low_id then friendship.low_shares_chart
              else friendship.high_shares_chart
            end
            and not exists (
              select 1
              from public.social_blocks block
              where (
                block.blocker_user_id = friendship.user_low_id
                and block.blocked_user_id = friendship.user_high_id
              ) or (
                block.blocker_user_id = friendship.user_high_id
                and block.blocked_user_id = friendship.user_low_id
              )
            )
        )
      )
  );
end;
$$;

revoke all on function public.can_read_chart_for_report(uuid, text) from public;
revoke all on function public.can_read_chart_for_report(uuid, text) from anon;
grant execute on function public.can_read_chart_for_report(uuid, text) to authenticated;
grant execute on function public.can_read_chart_for_report(uuid, text) to service_role;

drop policy if exists "Users can view their reports" on public.user_reports;
create policy "Users can view their reports"
  on public.user_reports
  for select
  using (
    auth.uid() = user_id
    and (
      report_type <> 'relationship'
      or public.can_read_chart_for_report(user_id, subject_id)
    )
  );

comment on function public.can_read_chart_for_report(uuid, text) is
  'Checks current friendship/manual-chart consent for relationship report composition and reads.';

notify pgrst, 'reload schema';
