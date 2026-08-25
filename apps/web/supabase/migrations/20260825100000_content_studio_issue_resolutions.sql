-- Owner-only handoff records for unresolved Content Studio issues. These rows
-- store a structured diagnosis or implementation report, never serving copy.

create table if not exists public.content_studio_issue_resolutions (
  issue_id text primary key,
  content_key text not null,
  result_status text not null,
  diagnosis text not null,
  proposed_action text not null,
  files_involved text[] not null default '{}',
  pr_url text,
  owner_decision_required boolean not null default true,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_studio_issue_resolutions_issue_id_check
    check (issue_id ~ '^[a-f0-9]{64}$'),
  constraint content_studio_issue_resolutions_status_check
    check (result_status in ('diagnosis-only', 'implemented')),
  constraint content_studio_issue_resolutions_diagnosis_check
    check (char_length(diagnosis) between 1 and 4000),
  constraint content_studio_issue_resolutions_action_check
    check (char_length(proposed_action) between 1 and 4000),
  constraint content_studio_issue_resolutions_pr_url_check
    check (pr_url is null or pr_url ~ '^https://github.com/[^/]+/[^/]+/pull/[0-9]+$')
);

create index if not exists content_studio_issue_resolutions_content_key_idx
  on public.content_studio_issue_resolutions (content_key);

alter table public.content_studio_issue_resolutions enable row level security;

revoke all on table public.content_studio_issue_resolutions from public, anon, authenticated;
grant all on table public.content_studio_issue_resolutions to service_role;

comment on table public.content_studio_issue_resolutions is
  'Owner-only structured Codex handoff records. This table cannot change serving copy or editorial approval state.';
