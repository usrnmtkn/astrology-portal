-- The browser may read its own Friends report lifecycle state, but all writes and
-- worker claims remain service-role only.

revoke insert, update, delete, truncate, references, trigger
  on public.friend_report_entitlements
  from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.friend_report_checkout_intents
  from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.friend_report_jobs
  from anon, authenticated;

revoke all on function public.claim_friend_report_jobs(text, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_friend_report_jobs(text, integer, uuid)
  to service_role;
