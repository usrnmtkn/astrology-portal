alter table public.transit_report_model_checkpoints
  drop constraint if exists transit_report_model_checkpoints_step_check;

alter table public.transit_report_model_checkpoints
  add constraint transit_report_model_checkpoints_step_check
  check (step >= 0 and step <= 6);
