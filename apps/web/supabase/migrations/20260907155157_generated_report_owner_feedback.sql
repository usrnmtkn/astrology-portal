create table if not exists public.generated_report_owner_feedback (
  id uuid primary key default gen_random_uuid(),
  source_generated_interpretation_id uuid not null references public.user_generated_interpretations(id) on delete cascade,
  source_surface text not null check (source_surface in ('friends', 'you')),
  source_report_kind text not null check (source_report_kind in ('friend_transit_reading', 'you_day_reading', 'you_week_reading')),
  feedback_text text not null check (length(trim(feedback_text)) > 0),
  governed_evidence_text text,
  evidence_scope text not null default 'report_kind' check (evidence_scope in ('report_kind', 'surface', 'all_generated_reports')),
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_report_owner_feedback_approved_evidence check (
    status <> 'approved'
    or (governed_evidence_text is not null and length(trim(governed_evidence_text)) > 0)
  )
);

create index if not exists generated_report_owner_feedback_status_scope_idx
  on public.generated_report_owner_feedback (status, evidence_scope, source_surface, source_report_kind, approved_at desc);

create index if not exists generated_report_owner_feedback_source_idx
  on public.generated_report_owner_feedback (source_generated_interpretation_id, created_at desc);

alter table public.generated_report_owner_feedback enable row level security;

revoke all on table public.generated_report_owner_feedback from public, anon, authenticated;
grant select, insert, update, delete on table public.generated_report_owner_feedback to service_role;

comment on table public.generated_report_owner_feedback is
  'Owner Draft Review feedback for Friends and You generated reports. Candidate and rejected rows are never writer/judge evidence. Only explicitly approved governed_evidence_text may enter future generation calls.';
