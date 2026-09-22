-- Two scoped review rounds need four review calls plus at most five writer
-- calls. Apply before opting into scoped review; the default runtime stays at
-- seven steps. This changes no saved response, approval state, RLS or grants.
alter table public.transit_report_model_checkpoints
  drop constraint if exists transit_report_model_checkpoints_step_check;

alter table public.transit_report_model_checkpoints
  add constraint transit_report_model_checkpoints_step_check
  check (step >= 0 and step <= 8);
