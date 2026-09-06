insert into public.user_report_library_state (
  user_id,
  source_kind,
  source_id,
  seen_at,
  created_at,
  updated_at
)
select
  user_id,
  'generated_interpretation',
  id,
  updated_at,
  now(),
  now()
from public.user_generated_interpretations
where subject_type = 'friend_transit_reading'
  and status in ('DRAFT', 'LIVE', 'ARCHIVED')
  and length(trim(body)) > 0
on conflict (user_id, source_kind, source_id) do nothing;
