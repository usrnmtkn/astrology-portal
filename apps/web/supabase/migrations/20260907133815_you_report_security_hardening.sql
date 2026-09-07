-- Tighten the production You report lifecycle to explicit authenticated-only reads.

revoke select on public.you_report_entitlements from anon;
revoke select on public.you_report_jobs from anon;

drop policy if exists "Users can view their You report entitlements" on public.you_report_entitlements;
create policy "Users can view their You report entitlements"
  on public.you_report_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their You report jobs" on public.you_report_jobs;
create policy "Users can view their You report jobs"
  on public.you_report_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

alter function public.set_you_report_updated_at()
  set search_path = pg_catalog;
