-- Adds first-class serving guards for imported/generated content.
-- Reference and review-pending rows must not become reader-facing even if
-- someone accidentally changes status to LIVE.

alter table public.generated_interpretations
  add column if not exists lane text not null default 'serving',
  add column if not exists review_state text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generated_interpretations_lane_check'
      and conrelid = 'public.generated_interpretations'::regclass
  ) then
    alter table public.generated_interpretations
      add constraint generated_interpretations_lane_check
      check (lane in ('serving', 'reference'));
  end if;
end;
$$;

update public.generated_interpretations
set
  lane = coalesce(nullif(facts #>> '{tldrStore,lane}', ''), lane, 'serving'),
  review_state = coalesce(nullif(facts #>> '{tldrStore,review}', ''), review_state)
where facts ? 'tldrStore';

create index if not exists generated_interpretations_reader_serving_idx
  on public.generated_interpretations (surface, status, lane, review_state, target_date desc);

drop policy if exists "Generated interpretations are public when live"
  on public.generated_interpretations;

create policy "Generated interpretations are public when live"
  on public.generated_interpretations
  for select
  using (
    status = 'LIVE'
    and lane = 'serving'
    and review_state is null
    and not coalesce(flags, array[]::text[]) && array[
      'REFERENCE_ONLY_NEVER_SERVE_VERBATIM',
      'PARAPHRASE_PENDING',
      'BLOCKLIST_MATCH'
    ]::text[]
  );
