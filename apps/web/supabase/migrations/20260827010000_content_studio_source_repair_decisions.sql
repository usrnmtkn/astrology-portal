-- Exact owner decisions for package source-repair holds. These records approve
-- one immutable replacement payload for implementation; they do not mutate or
-- serve copy by themselves. Reader eligibility changes only after the governed
-- source repair is deployed.

create table if not exists public.content_studio_source_decisions (
  decision_id text primary key,
  issue_id text not null,
  content_key text not null,
  decision_status text not null,
  action text not null,
  candidate_path text not null,
  candidate_sha256 text not null,
  candidate_payload jsonb not null,
  owner_statement text not null,
  approved_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint content_studio_source_decisions_decision_id_check
    check (decision_id ~ '^[a-f0-9]{64}$'),
  constraint content_studio_source_decisions_issue_id_check
    check (issue_id ~ '^[a-f0-9]{64}$'),
  constraint content_studio_source_decisions_status_check
    check (decision_status = 'approved-for-implementation'),
  constraint content_studio_source_decisions_action_check
    check (action = 'approve-replacement'),
  constraint content_studio_source_decisions_candidate_sha_check
    check (candidate_sha256 ~ '^[a-f0-9]{64}$'),
  constraint content_studio_source_decisions_owner_statement_check
    check (char_length(owner_statement) between 1 and 2000),
  constraint content_studio_source_decisions_unique_candidate
    unique (content_key, candidate_sha256, action)
);

create index if not exists content_studio_source_decisions_content_key_idx
  on public.content_studio_source_decisions (content_key, approved_at desc);

alter table public.content_studio_source_decisions enable row level security;

revoke all on table public.content_studio_source_decisions from public, anon, authenticated;
grant all on table public.content_studio_source_decisions to service_role;

comment on table public.content_studio_source_decisions is
  'Owner-only exact replacement approvals for source-repair holds. Decisions authorize a governed package implementation but cannot directly mutate or serve copy.';
