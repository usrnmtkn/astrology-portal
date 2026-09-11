-- Library deletion is independent of archive, generation, and payment history.
-- Existing owner-scoped RLS applies to this column and all state writes.
alter table public.user_report_library_state
  add column if not exists deleted_at timestamptz;

comment on column public.user_report_library_state.deleted_at is
  'Removes the report from the library and disables reader/share access without deleting fulfillment or payment records.';
