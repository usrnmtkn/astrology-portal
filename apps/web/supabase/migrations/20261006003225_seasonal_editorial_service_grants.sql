-- Default privileges may grant more than the journal API needs.
revoke all on public.studio_editorial_runs from service_role;
grant select, insert, update on public.studio_editorial_runs to service_role;
