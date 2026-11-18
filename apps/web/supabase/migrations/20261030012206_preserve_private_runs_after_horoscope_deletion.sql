-- Removing an unpublished edition must not discard its private run journal.
-- The nullable link changes only when the parent is deleted. Complete state,
-- hashes, revisions, creation times, RLS and existing grants are preserved.
begin;

alter table public.studio_editorial_runs
  alter column target_row_id drop not null;

alter table public.studio_editorial_runs
  drop constraint studio_editorial_runs_target_row_id_fkey,
  add constraint studio_editorial_runs_target_row_id_fkey
    foreign key (target_row_id) references public.generated_interpretations(id)
    on delete set null;

comment on column public.studio_editorial_runs.target_row_id is
  'Edition link; NULL after the edition is deleted. The complete private journal remains unchanged and service-only.';

commit;
