-- Private, append-only request snapshots. Never attach these bodies to reader rows.
create table public.writing_run_archives (
  id uuid primary key,
  version integer not null check (version = 1),
  created_at timestamptz not null default now(),
  provider text not null check (provider in ('openai','anthropic','gemini')),
  model text not null,
  role text not null,
  surface text not null,
  family text not null,
  context jsonb not null check (jsonb_typeof(context) = 'object'),
  request_body text not null check (octet_length(request_body) between 2 and 33554432),
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  state text not null check (state in ('dispatch_reserved','response_received','provider_rejected','outcome_unknown')),
  response_id text,
  provider_status text,
  http_status integer check (http_status between 100 and 599),
  recorded_at timestamptz
);
create index writing_run_archives_latest on public.writing_run_archives(created_at desc,id desc);
create index writing_run_archives_surface_role on public.writing_run_archives(surface,role,created_at desc,id desc);
create index writing_run_archives_operation on public.writing_run_archives((context->>'operationId'));
create index writing_run_archives_job on public.writing_run_archives((context->>'jobId'));
alter table public.writing_run_archives enable row level security;
revoke all on public.writing_run_archives from public,anon,authenticated,service_role;
grant select,insert on public.writing_run_archives to service_role;
grant update(state,response_id,provider_status,http_status,recorded_at) on public.writing_run_archives to service_role;
-- No client policies, foreign-key cascades, mutable prompt columns or delete grant.
comment on table public.writing_run_archives is 'Private exact dispatched request/evidence archive. Service access only; export through owner-authorized tooling. A transport receipt is not model/owner approval.';
