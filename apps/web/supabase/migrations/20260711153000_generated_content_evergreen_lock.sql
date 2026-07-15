-- Adds an editorial lock signal independent of serving status.
-- Published controls whether a row can serve; evergreen means the row is
-- finished in final voice and should drop out of the working review queue.

alter table public.generated_interpretations
  add column if not exists evergreen boolean not null default false,
  add column if not exists evergreen_at timestamptz,
  add column if not exists evergreen_by text;

create index if not exists generated_interpretations_evergreen_idx
  on public.generated_interpretations (evergreen, status, surface);
