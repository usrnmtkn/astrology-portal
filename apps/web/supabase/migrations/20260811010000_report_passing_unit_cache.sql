-- Durable handoff for a report unit that passed all gates but has not yet
-- persisted to user_generated_interpretations. This prevents infrastructure
-- retries from re-billing accepted writer and judge work.

alter table public.report_fulfillment_jobs
  add column if not exists passing_unit_cache jsonb not null default '{}'::jsonb;

alter table public.report_fulfillment_jobs
  drop constraint if exists report_fulfillment_jobs_passing_unit_cache_object_check;

alter table public.report_fulfillment_jobs
  add constraint report_fulfillment_jobs_passing_unit_cache_object_check
  check (jsonb_typeof(passing_unit_cache) = 'object');

comment on column public.report_fulfillment_jobs.passing_unit_cache is
  'Exact gated report-unit drafts, validator/fact-lock results, judge scores, prompt versions, and accepted-token accounting awaiting idempotent persistence. Cleared per unit only after its governed write and report accounting succeed.';
